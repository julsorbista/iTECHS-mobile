const fs = require('fs/promises');
const path = require('path');
const prisma = require('../src/lib/prisma');

const DEFAULT_EXPORT_FILE = path.resolve(__dirname, '../data/level-content-export.json');

const ensureDirectory = async (filePath) => {
  const targetDirectory = path.dirname(filePath);
  await fs.mkdir(targetDirectory, { recursive: true });
};

const parseFileFlag = () => {
  const fileFlag = process.argv.find((arg) => arg.startsWith('--file='));
  if (!fileFlag) {
    return DEFAULT_EXPORT_FILE;
  }

  const rawPath = fileFlag.slice('--file='.length).trim();
  if (!rawPath) {
    return DEFAULT_EXPORT_FILE;
  }

  return path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(process.cwd(), rawPath);
};

const main = async () => {
  const outputFilePath = parseFileFlag();

  const levelDefinitions = await prisma.levelDefinition.findMany({
    orderBy: [
      { gameType: 'asc' },
      { gameLevelNumber: 'asc' },
    ],
    include: {
      content: {
        select: {
          draftJson: true,
          publishedJson: true,
          publishedAt: true,
          updatedAt: true,
        },
      },
    },
  });

  const payload = {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    source: 'itechs-level-content',
    levels: levelDefinitions.map((level) => ({
      gameType: level.gameType,
      gameLevelNumber: level.gameLevelNumber,
      levelNumber: level.levelNumber,
      title: level.title,
      description: level.description,
      isActive: level.isActive,
      content: level.content
        ? {
          draftJson: level.content.draftJson,
          publishedJson: level.content.publishedJson,
          publishedAt: level.content.publishedAt ? level.content.publishedAt.toISOString() : null,
          updatedAt: level.content.updatedAt ? level.content.updatedAt.toISOString() : null,
        }
        : null,
    })),
  };

  await ensureDirectory(outputFilePath);
  await fs.writeFile(outputFilePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`Exported ${payload.levels.length} level records to: ${outputFilePath}`);
};

main()
  .catch((error) => {
    console.error('Failed to export level content:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
