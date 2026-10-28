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
    expect(source).toContain('!automaticTutorialConsumedRef.current');
    expect(source).toContain('rememberAutomaticTutorial(user?.id, normalizedGameType)');
    expect(source).toContain('setAutoShowGameTutorial(false);');
  });

  it('exposes the temporary Game Tutorial verification control', () => {
    const overlaySource = readSource('src/components/student/StudentGameOverlay.jsx');
    const tutorialSource = readSource('src/games/shared/ui/GameTutorialOverlay.jsx');

    expect(overlaySource).toContain('Game Tutorial');
    expect(overlaySource).toContain('setGameTutorialRequest((request) => request + 1)');
    ['GAME_ONE', 'GAME_TWO', 'GAME_THREE', 'GAME_FOUR', 'GAME_FIVE', 'GAME_SIX']
      .forEach((gameType) => expect(tutorialSource).toContain(gameType));
  });

  it('loads Game One behind the initial guide but pauses it from its first frame', () => {
    const source = readSource('src/games/game-one/ui/GameCanvas.jsx');

    expect(source).toContain('initialOverlayPaused: Boolean(showLevelGuideline)');
    expect(source).toContain('levelScene.setOverlayPaused(guideOpen)');
    expect(source).toContain('showGuide && (!gameTutorialRequested || guideOpenedDuringGameplay)');
    expect(source).toContain('restore = pauseForTutorial(levelScene, sceneManager)');
    expect(source).not.toContain('hasGameStarted');
  });

  it('uses one frozen Game One tutorial frame aligned with its highlight', () => {
    const overlaySource = readSource('src/games/shared/ui/ActualGameTutorialOverlay.jsx');
    const overlayStyles = readSource('src/games/shared/ui/ActualGameTutorialOverlay.css');

    expect(overlaySource).toContain('<span className="actual-tutorial-player"');
    expect(overlaySource).toContain("frames/idle/idle-frame-00.png");
    expect(overlayStyles).toContain('.actual-tutorial-player img');
    expect(overlayStyles).toContain('left: var(--tutorial-player-left)');
    expect(overlayStyles).toContain('top: var(--tutorial-player-top)');
    expect(overlayStyles).not.toContain('animation: actualTutorialFloat 1.6s ease-in-out infinite');
  });

  it('preserves the current Game One safe demo when integrating manual Guidelines', () => {
    const tutorialSource = readSource('src/games/game-one/scenes/TutorialScene.js');
    const gameCanvasSource = readSource('src/games/game-one/ui/GameCanvas.jsx');

    expect(tutorialSource).toContain('automaticTutorialIntent(step');
    expect(tutorialSource).toContain('this.getTarget(step.target)');
    expect(gameCanvasSource).toContain('<GameOneInteractiveTutorial');
    expect(gameCanvasSource).toContain('isReplay={!isAutomaticFirstPlayTutorial}');
    expect(gameCanvasSource).toContain('setIsAutomaticFirstPlayTutorial(false)');
  });

  it('shows the level Guideline automatically only on Level 1 while limiting How to Play to first use', () => {
    const source = readSource('src/components/student/StudentGameOverlay.jsx');

    expect(source.match(/showLevelGuideline/g)?.length).toBeGreaterThanOrEqual(6);
    expect(source.match(/showLevelGuideline=\{autoShowGameTutorial\}/g) || []).toHaveLength(0);
    expect(source).toContain('const shouldShowLevelGuideline = numericLevelNumber === 1;');
    expect(source.match(/showLevelGuideline=\{shouldShowLevelGuideline\}/g)?.length).toBeGreaterThanOrEqual(6);
    expect(source).toContain('suppressIntroTutorial={!autoShowGameTutorial}');
    expect(source).toContain('initialShowTutorial={autoShowGameTutorial}');
  });

  it('uses the same Guideline action label in every game', () => {
    const gameTwoSource = readSource('src/games/game-two/ui/GameCanvasGameTwo.jsx');
    const guideOverlaySource = readSource('src/games/shared/ui/GameGuideOverlay.jsx');

    expect(gameTwoSource).not.toContain('startLabel="Start Lab"');
    expect(guideOverlaySource).toContain("{isLastPage ? 'Start' : 'NEXT →'}");
  });

  it('does not reset Game 4 when the manual tutorial is requested', () => {
    const source = readSource('src/games/game-four/ui/GameCanvasGameFour.jsx');
    const resetEffectDependency = source.match(
      /\}, \[hasStoryline, isFirstLevelGuide, isTutorialLevel, levelData, showLevelGuideline, startingLives, suppressIntroTutorial, viewport\.width\]\);/,
    );

    expect(resetEffectDependency).not.toBeNull();
    expect(resetEffectDependency?.[0]).not.toContain('gameTutorialRequested');
    expect(source).toContain('}, [activeRound, concurrentFallingCount, fallSpeed, isTutorialLevel, roundIndex]);');
    expect(source).not.toContain('[activeRound, canInitializeGameplay,');
  });

  it('starts Game 6 once and shows Game 2 announcements before every challenge', () => {
    const gameTwoSource = readSource('src/games/game-two/ui/GameCanvasGameTwo.jsx');
    const gameSixSource = readSource('src/games/game-six/ui/GameCanvasGameSix.jsx');

    expect(gameTwoSource).toContain("useState(showLevelGuideline ? 'guide' : 'announcement')");
    expect(gameTwoSource).toContain("setTutorialView(showLevelGuideline ? 'guide' : 'announcement')");
    expect(gameSixSource).toContain("showLevelGuideline ? 'guide' : 'announcement'");
    expect(gameTwoSource).toContain('hasStartedRef.current = true');
    expect(gameSixSource).toContain('<GameSixAnnouncementBoard');

    const completedChallengeFlow = gameTwoSource.slice(
      gameTwoSource.indexOf('const completeChallenge'),
      gameTwoSource.indexOf('const cutItem'),
    );
    expect(completedChallengeFlow).toContain("setTutorialView('announcement')");
    expect(completedChallengeFlow).toContain('state.running = false');
    expect(gameTwoSource).toContain('challengeNumber={Math.min(outputs + 1, config.target)}');
  });

  it('preserves the updated gameplay Back buttons in Games 2, 3 and 4', () => {
    ['two', 'three', 'four'].forEach((number) => {
      const name = number[0].toUpperCase() + number.slice(1);
      const source = readSource(`src/games/game-${number}/ui/GameCanvasGame${name}.jsx`);
      expect(source).toMatch(/onClick=\{onExitRequest\}>?\s*>?\s*<LogOut[^>]+\/>\s*<span>Back<\/span>/);
    });
  });
});
