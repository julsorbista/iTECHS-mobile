import gameFiveLevelOne from './game-five/data/levels/level-01.json';
import gameFiveLevelTwo from './game-five/data/levels/level-02.json';
import gameFiveLevelThree from './game-five/data/levels/level-03.json';
import gameFiveLevelFour from './game-five/data/levels/level-04.json';
import gameFiveLevelFive from './game-five/data/levels/level-05.json';
import gameSixLevelOne from './game-six/data/levels/level-01.json';
import gameSixLevelTwo from './game-six/data/levels/level-02.json';
import gameSixLevelThree from './game-six/data/levels/level-03.json';
import gameSixLevelFour from './game-six/data/levels/level-04.json';
import gameSixLevelFive from './game-six/data/levels/level-05.json';
import { calculateGameRating, GAME_SCORE_RULES } from './shared/gameSessionPersistence';

const STORAGE_KEY = 'itechsLocalArcadeProgress';

export const LOCAL_ARCADE_GAME_TYPES = Object.freeze(['GAME_FIVE', 'GAME_SIX']);

const LOCAL_GAME_META = Object.freeze({
  GAME_FIVE: {
    gameType: 'GAME_FIVE',
    slug: 'game-five',
    label: 'Game 5',
    title: 'Code Snowman',
    shortTitle: 'Code Snowman',
    description: 'Guess programming terms from clues before the code snowman melts away.',
    isAvailable: true,
    plannedLevels: 5,
  },
  GAME_SIX: {
    gameType: 'GAME_SIX',
    slug: 'game-six',
    label: 'Game 6',
    title: 'Syntax Rain Typing',
    shortTitle: 'Syntax Rain',
    description: 'Type falling programming terms before they hit the ground and drain your health.',
    isAvailable: true,
    plannedLevels: 5,
  },
});

const LOCAL_LEVELS = Object.freeze({
  GAME_FIVE: Object.freeze([
    gameFiveLevelOne,
    gameFiveLevelTwo,
    gameFiveLevelThree,
    gameFiveLevelFour,
    gameFiveLevelFive,
  ]),
  GAME_SIX: Object.freeze([
    gameSixLevelOne,
    gameSixLevelTwo,
    gameSixLevelThree,
    gameSixLevelFour,
    gameSixLevelFive,
  ]),
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const readStorage = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
};

const writeStorage = (value) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    // Ignore local persistence failures.
  }
};

const getUserProgress = (userId) => {
  const allData = readStorage();
  const safeUserId = String(userId || 'guest');
  const nextData = allData[safeUserId];
  return nextData && typeof nextData === 'object' ? nextData : {};
};

const saveUserProgress = (userId, progress) => {
  const allData = readStorage();
  const safeUserId = String(userId || 'guest');
  allData[safeUserId] = progress;
  writeStorage(allData);
};

const getStoredLevelEntry = (userId, gameType, levelNumber) => {
  const progress = getUserProgress(userId);
  const gameProgress = progress[gameType];
  if (!gameProgress || typeof gameProgress !== 'object') {
    return null;
  }

  const levelEntry = gameProgress[String(levelNumber)];
  return levelEntry && typeof levelEntry === 'object' ? levelEntry : null;
};

const getDefaultStatus = (levelNumber) => (Number(levelNumber) === 1 ? 'UNLOCKED' : 'LOCKED');

const buildLevelState = (userId, gameType, levelData) => {
  const stored = getStoredLevelEntry(userId, gameType, levelData.levelNumber);

  return {
    id: levelData.id,
    gameType,
    levelNumber: levelData.levelNumber,
    gameLevelNumber: levelData.levelNumber,
    title: levelData.title,
    description: levelData.objective || levelData.subtitle || '',
    status: stored?.status || getDefaultStatus(levelData.levelNumber),
    attemptsCount: Number(stored?.attemptsCount || 0),
    bestStars: Number(stored?.bestStars || 0),
    bestScore: Number(stored?.bestScore || 0),
    unlockedAt: stored?.unlockedAt || null,
    completedAt: stored?.completedAt || null,
  };
};

const buildGameSummary = (gameType, levels) => {
  const gameMeta = LOCAL_GAME_META[gameType];
  const completedLevels = levels.filter((level) => level.status === 'COMPLETED').length;
  const unlockedLevels = levels.filter((level) => level.status !== 'LOCKED').length;
  const totalStars = levels.reduce((sum, level) => sum + Number(level.bestStars || 0), 0);
  const nextLevel = levels.find((level) => level.status !== 'COMPLETED') || null;

  return {
    ...gameMeta,
    authoredLevels: levels.length,
    completedLevels,
    unlockedLevels,
    totalStars,
    progressPercent: levels.length > 0
      ? Number(((completedLevels / levels.length) * 100).toFixed(2))
      : 0,
    nextLevelNumber: nextLevel?.levelNumber || null,
  };
};

export const isLocalArcadeGameType = (gameType) => (
  LOCAL_ARCADE_GAME_TYPES.includes(String(gameType || '').toUpperCase())
);

export const getLocalArcadeLevelData = (gameType, levelNumber) => (
  LOCAL_LEVELS[String(gameType || '').toUpperCase()]?.find((level) => Number(level.levelNumber) === Number(levelNumber)) || null
);

export const getLocalArcadeLevels = (userId, gameType) => {
  const normalizedGameType = String(gameType || '').toUpperCase();
  const levels = LOCAL_LEVELS[normalizedGameType] || [];
  return levels.map((level) => buildLevelState(userId, normalizedGameType, level));
};

export const getLocalArcadeGameSummary = (userId, gameType) => (
  buildGameSummary(gameType, getLocalArcadeLevels(userId, gameType))
);

export const getLocalArcadeCatalog = (userId) => (
  LOCAL_ARCADE_GAME_TYPES.map((gameType) => getLocalArcadeGameSummary(userId, gameType))
);

export const recordLocalArcadeResult = (userId, gameType, levelNumber, gameplay) => {
  const normalizedGameType = String(gameType || '').toUpperCase();
  const safeLevelNumber = Number(levelNumber);
  const safeBaseScore = clamp(Math.round(Number(gameplay?.points || 0)), 0, 999999);
  const rating = gameplay?.rating || calculateGameRating({
    completed: Number(gameplay?.completedTasks || 0),
    total: Number(gameplay?.totalTasks || 0),
    score: safeBaseScore,
    hintsUsed: Number(gameplay?.hintsUsed || 0),
  });
  const starsRemaining = clamp(Math.round(Number(rating?.stars || 0)), 0, 3);
  const completed = gameplay?.outcome === 'COMPLETED';
  const allProgress = getUserProgress(userId);
  const gameProgress = { ...(allProgress[normalizedGameType] || {}) };
  const previous = gameProgress[String(safeLevelNumber)] || {};
  const attemptsCount = Number(previous.attemptsCount || 0) + 1;
  const completedAt = completed ? new Date().toISOString() : previous.completedAt || null;
  const unlockedAt = previous.unlockedAt || new Date().toISOString();

  gameProgress[String(safeLevelNumber)] = {
    status: completed ? 'COMPLETED' : (previous.status || 'UNLOCKED'),
    attemptsCount,
    bestStars: Math.max(Number(previous.bestStars || 0), completed ? starsRemaining : 0),
    bestScore: Math.max(Number(previous.bestScore || 0), completed ? safeBaseScore : 0),
    unlockedAt,
    completedAt,
  };

  if (completed && rating.canUnlockNextLevel) {
    const nextLevelNumber = safeLevelNumber + 1;
    const hasNextLevel = Boolean(getLocalArcadeLevelData(normalizedGameType, nextLevelNumber));
    if (hasNextLevel) {
      const nextEntry = gameProgress[String(nextLevelNumber)] || {};
      if (!nextEntry.status || nextEntry.status === 'LOCKED') {
        gameProgress[String(nextLevelNumber)] = {
          ...nextEntry,
          status: 'UNLOCKED',
          attemptsCount: Number(nextEntry.attemptsCount || 0),
          bestStars: Number(nextEntry.bestStars || 0),
          bestScore: Number(nextEntry.bestScore || 0),
          unlockedAt: nextEntry.unlockedAt || new Date().toISOString(),
          completedAt: nextEntry.completedAt || null,
        };
      }
    }
  }

  allProgress[normalizedGameType] = gameProgress;
  saveUserProgress(userId, allProgress);

  return {
    sessionId: `local-${normalizedGameType}-${safeLevelNumber}`,
    gameType: normalizedGameType,
    levelNumber: safeLevelNumber,
    result: completed ? 'COMPLETED' : 'FAILED',
    starsRemaining: completed ? starsRemaining : 0,
    starsEarned: completed ? starsRemaining : 0,
    policy: {
      difficultyPreset: 'STANDARD',
      freeMistakes: 3,
      hintStarCost: GAME_SCORE_RULES.HINT_COIN_COST,
    },
    retryMultiplier: 1,
    finalScore: completed ? safeBaseScore : 0,
    unlockedNextLevel: completed
      && rating.canUnlockNextLevel
      && Boolean(getLocalArcadeLevelData(normalizedGameType, safeLevelNumber + 1)),
  };
};
