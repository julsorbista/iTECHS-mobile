import { GAME_THREE_LEVEL_BLUEPRINTS } from './levelCatalog';

// Older hosted catalogs may still return the previous, larger card decks.
export const applyGameThreeLevelProgression = (levelData, levelNumber) => {
  const blueprint = GAME_THREE_LEVEL_BLUEPRINTS.find(
    (level) => level.levelNumber === Number(levelNumber),
  );
  if (!blueprint || !Array.isArray(levelData?.pairs)) return levelData;
  const pairs = levelData.pairs.slice(0, blueprint.pairCount);
  return {
    ...levelData,
    levelNumber: blueprint.levelNumber,
    subtitle: `${pairs.length * 2} cards | ${pairs.length} pairs`,
    objective: `Find ${pairs.length} matching pairs of programming concepts before the flip attempts run out.`,
    pairs,
    settings: {
      ...levelData.settings,
      columns: blueprint.columns,
      previewMs: blueprint.previewMs,
      flipBackMs: blueprint.flipBackMs,
    },
  };
};
