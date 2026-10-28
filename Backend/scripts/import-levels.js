const fs = require('fs/promises');
const path = require('path');
const prisma = require('../src/lib/prisma');

const DEFAULT_IMPORT_FILE = path.resolve(__dirname, '../data/level-content-export.json');

const parseFileFlag = () => {
  const fileFlag = process.argv.find((arg) => arg.startsWith('--file='));
  if (!fileFlag) {
    return DEFAULT_IMPORT_FILE;
  }

  const rawPath = fileFlag.slice('--file='.length).trim();
  if (!rawPath) {
    return DEFAULT_IMPORT_FILE;
  }

  return path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), rawPath);
};

const readImportFile = async (filePath) => {
  const fileContents = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(fileContents);

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.levels)) {
    throw new Error('Import file is invalid: expected a JSON object with a levels array.');
  }

  return parsed;
};

const normalizeDate = (value) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const validateLevelEntry = (entry, index) => {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`Invalid level at index ${index}: expected an object.`);
  }

  const gameType = String(entry.gameType || '').trim();
  const gameLevelNumber = Number(entry.gameLevelNumber);
  const levelNumber = Number(entry.levelNumber);

  if (!['GAME_ONE', 'GAME_TWO', 'GAME_THREE'].includes(gameType)) {
    throw new Error(`Invalid level at index ${index}: unsupported gameType \"${entry.gameType}\".`);
  }

  if (!Number.isInteger(gameLevelNumber) || gameLevelNumber <= 0) {
    throw new Error(`Invalid level at index ${index}: gameLevelNumber must be a positive integer.`);
  }

  if (!Number.isInteger(levelNumber) || levelNumber <= 0) {
    throw new Error(`Invalid level at index ${index}: levelNumber must be a positive integer.`);
  }

  return {
    gameType,
    gameLevelNumber,
    levelNumber,
    title: String(entry.title || `Level ${gameLevelNumber}`),
    description: entry.description == null ? null : String(entry.description),
    isActive: entry.isActive !== false,
    content: entry.content && typeof entry.content === 'object'
      ? {
        draftJson: entry.content.draftJson,
        publishedJson: entry.content.publishedJson,
        publishedAt: normalizeDate(entry.content.publishedAt),
      }
      : null,
  };
};

const importLevels = async (levels) => prisma.$transaction(async (tx) => {
  for (const [index, rawEntry] of levels.entries()) {
    const levelEntry = validateLevelEntry(rawEntry, index);

    const levelDefinition = await tx.levelDefinition.upsert({
      where: {
        gameType_gameLevelNumber: {
          gameType: levelEntry.gameType,
          gameLevelNumber: levelEntry.gameLevelNumber,
        },
      },
      update: {
        levelNumber: levelEntry.levelNumber,
        title: levelEntry.title,
        description: levelEntry.description,
        isActive: levelEntry.isActive,
      },
      create: {
        gameType: levelEntry.gameType,
        gameLevelNumber: levelEntry.gameLevelNumber,
        levelNumber: levelEntry.levelNumber,
        title: levelEntry.title,
        description: levelEntry.description,
        isActive: levelEntry.isActive,
      },
    });

    if (!levelEntry.content) {
      continue;
    }

    await tx.levelContent.upsert({
      where: { levelId: levelDefinition.id },
      update: {
        draftJson: levelEntry.content.draftJson,
        publishedJson: levelEntry.content.publishedJson,
        publishedAt: levelEntry.content.publishedAt,
        updatedByUserId: null,
      },
      create: {
        levelId: levelDefinition.id,
        draftJson: levelEntry.content.draftJson,
        publishedJson: levelEntry.content.publishedJson,
        publishedAt: levelEntry.content.publishedAt,
        updatedByUserId: null,
      },
    });
  }
});

const main = async () => {
  const importFilePath = parseFileFlag();
  const payload = await readImportFile(importFilePath);

  await importLevels(payload.levels);

  console.log(`Imported ${payload.levels.length} level records from: ${importFilePath}`);
};

main()
  .catch((error) => {
    console.error('Failed to import level content:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
