import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath) => fs.readFileSync(
  path.resolve(process.cwd(), relativePath),
  'utf8',
);

describe('guideline and How to Play isolation', () => {
  it('keeps the guideline overlay informational and stateless', () => {
    const source = readSource('src/games/shared/ui/GameGuideOverlay.jsx');

    expect(source).not.toContain('SPOTLIGHT');
    expect(source).not.toContain("setPhase('tour')");
    expect(source).not.toContain('continueToTourAfterGuide');
    expect(source).not.toContain('initialPhase');
  });

  it('uses backend first-play status only for automatic How to Play', () => {
    const source = readSource('src/components/student/StudentGameOverlay.jsx');

    expect(source).toContain('numericLevelNumber === 1 && sessionResponse.data?.isFirstGamePlay');
    expect(source).toContain('setAutoShowGameTutorial(shouldShowFirstPlayTutorial)');
    expect(source).toContain('setContinueToTutorialAfterGuide(shouldShowFirstPlayTutorial)');
  });

  it('exposes the temporary Game Tutorial verification control', () => {
    const overlaySource = readSource('src/components/student/StudentGameOverlay.jsx');
    const tutorialSource = readSource('src/games/shared/ui/GameTutorialOverlay.jsx');

    expect(overlaySource).toContain('Game Tutorial');
    expect(overlaySource).toContain('setGameTutorialRequest((request) => request + 1)');
    ['GAME_ONE', 'GAME_TWO', 'GAME_THREE', 'GAME_FOUR', 'GAME_FIVE', 'GAME_SIX']
      .forEach((gameType) => expect(tutorialSource).toContain(gameType));
  });

  it('shows the Guideline independently on every student level run', () => {
    const source = readSource('src/components/student/StudentGameOverlay.jsx');

    expect(source.match(/showLevelGuideline/g)?.length).toBeGreaterThanOrEqual(6);
    expect(source).toContain('suppressIntroTutorial={!autoShowGameTutorial}');
  });

  it('uses the same Guideline action label in every game', () => {
    const gameTwoSource = readSource('src/games/game-two/ui/GameCanvasGameTwo.jsx');

    expect(gameTwoSource).not.toContain('startLabel="Start Lab"');
    expect(gameTwoSource.match(/startLabel="Next"/g)?.length).toBe(2);
  });

  it('does not reset Game 4 when the manual tutorial is requested', () => {
    const source = readSource('src/games/game-four/ui/GameCanvasGameFour.jsx');
    const resetEffectDependency = source.match(
      /\}, \[hasStoryline, isFirstLevelGuide, isTutorialLevel, levelData, showLevelGuideline, startingLives, suppressIntroTutorial, viewport\.width\]\);/,
    );

    expect(resetEffectDependency).not.toBeNull();
    expect(resetEffectDependency?.[0]).not.toContain('gameTutorialRequested');
  });
});
