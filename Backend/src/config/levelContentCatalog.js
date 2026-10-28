const fs = require('fs');
const path = require('path');
const vm = require('vm');

const level01 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-one/data/levels/level-01.json',
));
const level02 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-one/data/levels/level-02.json',
));
const level03 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-one/data/levels/level-03.json',
));
const level04 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-one/data/levels/level-04.json',
));
const level05 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-one/data/levels/level-05.json',
));
const gameTwoLevel01 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-two/data/levels/level-01.json',
));
const gameTwoLevel02 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-two/data/levels/level-02.json',
));
const gameTwoLevel03 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-two/data/levels/level-03.json',
));
const gameTwoLevel04 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-two/data/levels/level-04.json',
));
const gameTwoLevel05 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-two/data/levels/level-05.json',
));
const gameFourLevel01 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-four/data/levels/level-01.json',
));
const gameFourLevel02 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-four/data/levels/level-02.json',
));
const gameFourLevel03 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-four/data/levels/level-03.json',
));
const gameFourLevel04 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-four/data/levels/level-04.json',
));
const gameFourLevel05 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-four/data/levels/level-05.json',
));
const gameFiveLevel01 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-five/data/levels/level-01.json',
));
const gameFiveLevel02 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-five/data/levels/level-02.json',
));
const gameFiveLevel03 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-five/data/levels/level-03.json',
));
const gameFiveLevel04 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-five/data/levels/level-04.json',
));
const gameFiveLevel05 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-five/data/levels/level-05.json',
));
const gameSixLevel01 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-six/data/levels/level-01.json',
));
const gameSixLevel02 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-six/data/levels/level-02.json',
));
const gameSixLevel03 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-six/data/levels/level-03.json',
));
const gameSixLevel04 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-six/data/levels/level-04.json',
));
const gameSixLevel05 = require(path.resolve(
  __dirname,
  '../../../Frontend/src/games/game-six/data/levels/level-05.json',
));
const loadGameThreeLevelCatalog = () => {
  const catalogPath = path.resolve(
    __dirname,
    '../../../Frontend/src/games/game-three/data/levelCatalog.cjs',
  );
  const source = fs.readFileSync(catalogPath, 'utf8');
  const sandbox = {
    module: { exports: {} },
    exports: {},
    Object,
  };
  vm.runInNewContext(source, sandbox, { filename: catalogPath });
  return sandbox.module.exports;
};

const {
  GAME_THREE_LEVEL_SEEDS,
} = loadGameThreeLevelCatalog();

const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const LEVEL_CONTENT_SEEDS = Object.freeze({
  GAME_ONE: Object.freeze({
    1: level01,
    2: level02,
    3: level03,
    4: level04,
    5: level05,
  }),
  GAME_TWO: Object.freeze({
    1: gameTwoLevel01,
    2: gameTwoLevel02,
    3: gameTwoLevel03,
    4: gameTwoLevel04,
    5: gameTwoLevel05,
  }),
  GAME_THREE: Object.freeze({
    ...GAME_THREE_LEVEL_SEEDS,
  }),
  GAME_FOUR: Object.freeze({
    1: gameFourLevel01,
    2: gameFourLevel02,
    3: gameFourLevel03,
    4: gameFourLevel04,
    5: gameFourLevel05,
  }),
  GAME_FIVE: Object.freeze({
    1: gameFiveLevel01,
    2: gameFiveLevel02,
    3: gameFiveLevel03,
    4: gameFiveLevel04,
    5: gameFiveLevel05,
  }),
  GAME_SIX: Object.freeze({
    1: gameSixLevel01,
    2: gameSixLevel02,
    3: gameSixLevel03,
    4: gameSixLevel04,
    5: gameSixLevel05,
  }),
});

const createFallbackLevelContent = (gameType, gameLevelNumber, title = `Level ${gameLevelNumber}`) => ({
  id: `${String(gameType || 'game').toLowerCase()}-level-${String(gameLevelNumber).padStart(2, '0')}`,
  gameType,
  levelNumber: gameLevelNumber,
  title,
  subtitle: '',
  viewport: {
    width: 1280,
    height: 720,
  },
  ...(gameType === 'GAME_THREE'
    ? {
      objective: 'Configure this memory quiz level in the admin editor.',
      settings: {
        columns: 4,
        previewMs: 0,
        flipBackMs: 900,
      },
      pairs: [],
    }
    : gameType === 'GAME_FOUR'
      ? {
        objective: 'Configure this catch-and-build level in the admin editor.',
        settings: {
          spawnIntervalMs: 900,
          fallSpeed: 220,
          moveSpeed: 420,
          maxMistakes: 3,
          lives: 3,
          coinRewardPerRound: 1,
          statementReward: 120,
        },
        rounds: [],
      }
    : gameType === 'GAME_FIVE'
      ? {
        objective: 'Configure this Code Snowman level in the admin editor.',
        settings: {
          targetWords: 5,
          seconds: 180,
          lives: 5,
        },
      }
    : gameType === 'GAME_SIX'
      ? {
        objective: 'Configure this Syntax Rain Typing level in the admin editor.',
        settings: {
          targetWords: 5,
          seconds: 120,
          lives: 5,
          rewardEvery: 3,
        },
      }
    : {
      questions: [],
      rooms: [
        {
          id: 'room-1',
          backgroundKey: 'tutorialGrove',
          objective: 'Configure this level in the admin editor.',
          postUnlockObjective: '',
          spawn: { x: 160, y: 560 },
          platforms: [
            {
              id: 'floor',
              x: 640,
              y: 684,
              width: 1280,
              bodyHeight: 72,
              textureKey: 'grass',
            },
          ],
          unlockPlatforms: [],
          barriers: [],
          coins: [],
          ghosts: [],
          projectileEnemies: [],
          villain: null,
          portal: {
            x: 1135,
            y: 556,
            locked: false,
            targetRoomId: null,
            endsLevel: true,
          },
        },
      ],
    }),
});

const getSeedLevelContent = (gameType, gameLevelNumber, fallbackTitle) => {
  const seededLevel = LEVEL_CONTENT_SEEDS[gameType]?.[Number(gameLevelNumber)];

  if (seededLevel) {
    return cloneJson(seededLevel);
  }

  return createFallbackLevelContent(gameType, Number(gameLevelNumber), fallbackTitle);
};

module.exports = {
  LEVEL_CONTENT_SEEDS,
  createFallbackLevelContent,
  getSeedLevelContent,
};
