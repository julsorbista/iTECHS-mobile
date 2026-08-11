const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
  GAME_THREE_LEVEL_TEMPLATES,
} = loadGameThreeLevelCatalog();

const PLANNED_LEVELS_PER_GAME = 20;

const GAME_CATALOG = Object.freeze([
  {
    gameType: 'GAME_ONE',
    slug: 'game-one',
    label: 'Game 1',
    title: '2D Phaser Adventure',
    shortTitle: '2D Adventure',
    description: 'A room-based platformer that teaches movement, hazard awareness, and question gates.',
    isAvailable: true,
    plannedLevels: PLANNED_LEVELS_PER_GAME,
  },
  {
    gameType: 'GAME_TWO',
    slug: 'game-two',
    label: 'Game 2',
    title: 'Java Code Lab',
    shortTitle: 'Code Lab',
    description: 'Drag Java code blocks into the correct program slots and answer quick concept questions.',
    isAvailable: true,
    plannedLevels: PLANNED_LEVELS_PER_GAME,
  },
  {
    gameType: 'GAME_THREE',
    slug: 'game-three',
    label: 'Game 3',
    title: 'Memory Link Quiz',
    shortTitle: 'Memory Quiz',
    description: 'Match card pairs, unlock a question for each pair, and earn points for every correct answer.',
    isAvailable: true,
    plannedLevels: PLANNED_LEVELS_PER_GAME,
  },
  {
    gameType: 'GAME_FOUR',
    slug: 'game-four',
    label: 'Game 4',
    title: 'Catch The Code',
    shortTitle: 'Catch Code',
    description: 'Catch Java variable tokens, spend coins for AI hints, and assemble the correct declaration.',
    isAvailable: true,
    plannedLevels: PLANNED_LEVELS_PER_GAME,
  },
  {
    gameType: 'GAME_FIVE',
    slug: 'game-five',
    label: 'Game 5',
    title: 'Code Snowman',
    shortTitle: 'Code Snowman',
    description: 'Guess Java and programming terms from clues before the snowman melts.',
    isAvailable: true,
    plannedLevels: 5,
  },
  {
    gameType: 'GAME_SIX',
    slug: 'game-six',
    label: 'Game 6',
    title: 'Syntax Rain Typing',
    shortTitle: 'Syntax Rain',
    description: 'Type falling programming terms accurately before they reach the ground.',
    isAvailable: true,
    plannedLevels: 5,
  },
]);

const GAME_TYPE_VALUES = GAME_CATALOG.map((game) => game.gameType);

const GAME_ORDER_INDEX = GAME_CATALOG.reduce((accumulator, game, index) => {
  accumulator[game.gameType] = index;
  return accumulator;
}, {});

const GAME_ONE_LEVEL_TEMPLATES = Object.freeze({
  1: {
    title: 'Tutorial Grove',
    description: 'Learn movement, coins, monsters, and the villain question portal.',
  },
  2: {
    title: 'Canopy Crossfire',
    description: 'Answer questions to reveal paths while dodging the first ranged enemy attacks.',
  },
  3: {
    title: 'Skyforge Siege',
    description: 'Face hunter drones and the first sentinel encounter while solving route locks.',
  },
  4: {
    title: 'Apex Sentinel',
    description: 'A boss-focused mission where portal completion now requires sentinel defeat.',
  },
  5: {
    title: 'Level 05',
    description: 'Complete teacher-authored objectives and unlock the next level.',
  },
});

const GAME_TWO_LEVEL_TEMPLATES = Object.freeze({
  1: {
    title: 'Java Code Basics',
    description: 'Drag beginner Java code blocks into the correct program slots.',
  },
  2: {
    title: 'Variables and Values',
    description: 'Match Java variable statements to the right purpose.',
  },
  3: {
    title: 'Conditions and Loops',
    description: 'Place Java decision and repetition blocks where they belong.',
  },
  4: {
    title: 'Methods and Output',
    description: 'Sort Java method and output blocks into the right slots.',
  },
  5: {
    title: 'Code Debug Challenge',
    description: 'Repair broken Java snippets by matching each block to its role.',
  },
});

const GAME_FOUR_LEVEL_TEMPLATES = Object.freeze({
  1: {
    title: 'Variable Catch Basics',
    description: 'Catch the correct tokens and build simple Java variable declarations.',
  },
  2: {
    title: 'Strings and Booleans',
    description: 'Practice Java variable declarations with text and true/false values.',
  },
  3: {
    title: 'Numbers In Motion',
    description: 'Assemble numeric Java variables while avoiding wrong falling tokens.',
  },
  4: {
    title: 'Constants and Types',
    description: 'Catch stronger distractors and build declarations with final and mixed data types.',
  },
  5: {
    title: 'Java Variable Rush',
    description: 'Finish a full sequence of Java Variables rounds with limited mistakes.',
  },
});

const GAME_FIVE_LEVEL_TEMPLATES = Object.freeze({
  1: {
    title: 'Code Snowman: Variables',
    description: 'Guess five basic programming words before the snowman melts.',
  },
  2: {
    title: 'Code Snowman: Logic Trail',
    description: 'Guess six programming terms with less time.',
  },
  3: {
    title: 'Code Snowman: Loop Peak',
    description: 'Guess seven terms while mistakes matter more.',
  },
  4: {
    title: 'Code Snowman: Array Blizzard',
    description: 'Guess eight mixed programming terms under pressure.',
  },
  5: {
    title: 'Code Snowman: Compiler Freeze',
    description: 'Guess ten harder programming terms before the final melt.',
  },
});

const GAME_SIX_LEVEL_TEMPLATES = Object.freeze({
  1: {
    title: 'Syntax Rain Typing: Warmup',
    description: 'Type five falling programming terms in two minutes.',
  },
  2: {
    title: 'Syntax Rain Typing: Drizzle',
    description: 'Type ten falling terms in five minutes.',
  },
  3: {
    title: 'Syntax Rain Typing: Shower',
    description: 'Type fifteen falling terms as speed rises.',
  },
  4: {
    title: 'Syntax Rain Typing: Storm',
    description: 'Type twenty falling terms with faster drops.',
  },
  5: {
    title: 'Syntax Rain Typing: Compiler Tempest',
    description: 'Type twenty-five falling terms in the hardest storm.',
  },
});

const buildInitialLevels = (
  gameType,
  templates,
  activeLevelCount,
  plannedLevelCount = PLANNED_LEVELS_PER_GAME,
) => (
  Array.from({ length: plannedLevelCount }, (_, index) => {
    const gameLevelNumber = index + 1;
    const template = templates[gameLevelNumber];

    return {
      levelNumber: gameLevelNumber,
      gameType,
      gameLevelNumber,
      title: template?.title || `Level ${String(gameLevelNumber).padStart(2, '0')}`,
      description: template?.description || 'Complete teacher-authored objectives and unlock the next level.',
      isActive: gameLevelNumber <= activeLevelCount,
    };
  })
);

const INITIAL_LEVEL_DEFINITIONS = Object.freeze(
  [
    ...buildInitialLevels('GAME_ONE', GAME_ONE_LEVEL_TEMPLATES, PLANNED_LEVELS_PER_GAME),
    ...buildInitialLevels('GAME_TWO', GAME_TWO_LEVEL_TEMPLATES, 5),
    ...buildInitialLevels('GAME_THREE', GAME_THREE_LEVEL_TEMPLATES, 10),
    ...buildInitialLevels('GAME_FOUR', GAME_FOUR_LEVEL_TEMPLATES, 5),
    ...buildInitialLevels('GAME_FIVE', GAME_FIVE_LEVEL_TEMPLATES, 5, 5),
    ...buildInitialLevels('GAME_SIX', GAME_SIX_LEVEL_TEMPLATES, 5, 5),
  ],
);

const getGameMeta = (gameType) => GAME_CATALOG.find((game) => game.gameType === gameType) || null;

module.exports = {
  GAME_CATALOG,
  GAME_ORDER_INDEX,
  GAME_TYPE_VALUES,
  INITIAL_LEVEL_DEFINITIONS,
  PLANNED_LEVELS_PER_GAME,
  getGameMeta,
};
