import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import Phaser from 'phaser';
import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';
import BootScene from '../scenes/BootScene';
import PreloadScene from '../scenes/PreloadScene';
import LevelScene from '../scenes/LevelScene';
import TutorialScene from '../scenes/TutorialScene';
import { pauseForTutorial } from '../systems/tutorialSession';
import HudScene from '../scenes/HudScene';
import QuestionScene from '../scenes/QuestionScene';
import MenuScene from '../scenes/MenuScene';
import GameGuideOverlay from '../../shared/ui/GameGuideOverlay';
import GameOneInteractiveTutorial from './GameOneInteractiveTutorial';
import { buildGameOneGuideContent } from '../../shared/ui/gameGuideContent';
import ResultOverlay from './ResultOverlay';

const renderScreenModal = (content) => (
  typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : null
);

const shouldShowGameOneHitboxes = () => (
  import.meta.env.DEV
  && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('gameOneDebugHitboxes') === '1'
);

const GameCanvas = forwardRef(({
  levelData,
  runtimeAssets,
  onLevelComplete,
  onLevelFail,
  onExitRequest,
  resultData,
  gameplayData,
  isSubmitting,
  canAdvanceLevel,
  hideResultOverlay = false,
  onRetry,
  onBack,
  onNextLevel,
  onRuntimeBootReady,
  suppressPreloadUi = false,
  frameClassName = '',
  canvasHostClassName = '',
  hintStarCost = 1,
  hintCoinCost,
  initialShowTutorial = true,
  showLevelGuideline = false,
  gameTutorialRequested = false,
  gameGuidelinesRequested = false,
  continueToTutorialAfterGuide = false,
  showTutorialButton = false,
}, ref) => {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const mobileControlsRef = useRef({
    left: false,
    right: false,
    jumpQueued: false,
    dashQueued: false,
    attackQueued: false,
  });
  const [tutorialState, setTutorialState] = useState(null);
  const getTutorialScene = useCallback(() => gameRef.current?.scene?.keys?.GameOneTutorialScene, []);
  const callbackRef = useRef({
    onLevelComplete,
    onLevelFail,
    onExitRequest,
    onRuntimeBootReady,
  });
  const [isPaused, setIsPaused] = useState(false);
  const [isQuestionOpen, setIsQuestionOpen] = useState(false);
  const isFirstLevelGuide = Number(levelData?.levelNumber || 1) === 1;
  const shouldAllowTutorial = true;
  const [tutorialView, setTutorialView] = useState(
    showLevelGuideline ? 'guide' : null,
  );
  const [isAutomaticFirstPlayTutorial, setIsAutomaticFirstPlayTutorial] = useState(false);
  const [guideOpenedDuringGameplay, setGuideOpenedDuringGameplay] = useState(false);
  const showGuide = tutorialView === 'guide';
  const showTutorial = tutorialView === 'practice';
  const gameOneGuideContent = useMemo(
    () => buildGameOneGuideContent(levelData),
    [levelData],
  );
  const viewportAspectRatio = useMemo(() => {
    const width = Math.max(1, Number(levelData?.viewport?.width) || 1280);
    const height = Math.max(1, Number(levelData?.viewport?.height) || 720);
    return `${width} / ${height}`;
  }, [levelData]);

  useEffect(() => {
    callbackRef.current = {
      onLevelComplete,
      onLevelFail,
      onExitRequest,
      onRuntimeBootReady,
      onQuestionVisibilityChange: setIsQuestionOpen,
    };
  }, [onLevelComplete, onLevelFail, onExitRequest, onRuntimeBootReady]);

  useEffect(() => {
    setTutorialView(showLevelGuideline ? 'guide' : null);
    setGuideOpenedDuringGameplay(false);
  }, [levelData, showLevelGuideline]);

  useEffect(() => {
    if (Number(gameTutorialRequested) > 0) {
      setIsAutomaticFirstPlayTutorial(false);
      setTutorialView('practice');
    }
  }, [gameTutorialRequested]);

  useEffect(() => {
    if (Number(gameGuidelinesRequested) > 0) {
      setGuideOpenedDuringGameplay(true);
      setIsAutomaticFirstPlayTutorial(false);
      setTutorialView('guide');
    }
  }, [gameGuidelinesRequested]);

  useImperativeHandle(ref, () => ({
    openTutorial: () => {
      if (!shouldAllowTutorial) return;
      setIsAutomaticFirstPlayTutorial(false);
      setTutorialView('practice');
    },
    openGuidelines: () => {
      setGuideOpenedDuringGameplay(true);
      setIsAutomaticFirstPlayTutorial(false);
      setTutorialView('guide');
    },
  }), [shouldAllowTutorial]);

  const stopControlEvent = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const setMobileControl = useCallback((key, value, event) => {
    stopControlEvent(event);
    mobileControlsRef.current[key] = value;
  }, [stopControlEvent]);

  const queueMobileControl = useCallback((key, event) => {
    stopControlEvent(event);
    mobileControlsRef.current[key] = true;
  }, [stopControlEvent]);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const resolvedHintCoinCost = Number.isFinite(Number(hintCoinCost))
      ? Number(hintCoinCost)
      : Number(hintStarCost);

    const bootPayload = {
      levelData,
      runtimeAssets,
      suppressPreloadUi: Boolean(suppressPreloadUi),
      initialOverlayPaused: Boolean(showLevelGuideline),
      hintCoinCost: resolvedHintCoinCost,
      hintStarCost: resolvedHintCoinCost,
      callbacks: {
        onPauseChange: setIsPaused,
        onLevelComplete: (...args) => callbackRef.current.onLevelComplete?.(...args),
        onLevelFail: (...args) => callbackRef.current.onLevelFail?.(...args),
        onExitRequest: (...args) => callbackRef.current.onExitRequest?.(...args),
        onPreloadComplete: (...args) => callbackRef.current.onRuntimeBootReady?.(...args),
        onQuestionVisibilityChange: (...args) => callbackRef.current.onQuestionVisibilityChange?.(...args),
      },
    };

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: levelData.viewport.width,
      height: levelData.viewport.height,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      parent: containerRef.current,
      pixelArt: true,
      roundPixels: true,
      backgroundColor: '#020617',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 1500 },
          debug: shouldShowGameOneHitboxes(),
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: levelData.viewport.width,
        height: levelData.viewport.height,
      },
      dom: {
        createContainer: true,
      },
      render: {
        antialias: false,
        pixelArt: true,
        roundPixels: true,
      },
      plugins: {
        scene: [
          {
            key: 'rexUI',
            plugin: UIPlugin,
            mapping: 'rexUI',
          }
        ]
      },
      scene: [BootScene, PreloadScene, LevelScene, HudScene, QuestionScene, MenuScene, TutorialScene],
      callbacks: {
        preBoot: (instance) => {
          instance.__ITECHS_BOOT__ = bootPayload;
          instance.__ITECHS_GAME_ONE_MOBILE_CONTROLS__ = mobileControlsRef;
          instance.__ITECHS_GAME_ONE_OVERLAY_PAUSED__ = Boolean(showLevelGuideline);
        },
      },
    });

    gameRef.current = game;

    return () => {
      setIsPaused(false);
      setIsQuestionOpen(false);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [hintCoinCost, hintStarCost, levelData, runtimeAssets, showLevelGuideline, suppressPreloadUi]);

  const handleResume = useCallback(() => {
    const levelScene = gameRef.current?.scene?.keys?.LevelScene;
    if (levelScene) {
      levelScene.resumeFromOverlay();
    }
  }, []);

  const handleExit = useCallback(() => {
    const levelScene = gameRef.current?.scene?.keys?.LevelScene;
    if (levelScene) {
      levelScene.requestExitFromOverlay();
      return;
    }

    onExitRequest?.();
  }, [onExitRequest]);

  const handleRestart = useCallback(() => {
    const levelScene = gameRef.current?.scene?.keys?.LevelScene;
    levelScene?.togglePause?.(false);
    onRetry?.();
  }, [onRetry]);

  const handleHowToPlay = useCallback(() => {
    const levelScene = gameRef.current?.scene?.keys?.LevelScene;
    levelScene?.togglePause?.(false);
    setIsAutomaticFirstPlayTutorial(false);
    setTutorialView('practice');
  }, []);

  const closeGameplayGuidelines = useCallback(() => {
    setGuideOpenedDuringGameplay(false);
    setTutorialView(null);
  }, []);

  useEffect(() => {
    const menuScene = gameRef.current?.scene?.keys?.MenuScene;
    const levelScene = gameRef.current?.scene?.keys?.LevelScene;
    if (!menuScene || resultData || isSubmitting) {
      return;
    }

    if (isPaused) {
      const pauseSnapshot = levelScene?.getPauseMenuSnapshot?.() || {};
      menuScene.showPauseMenu({
        onResume: handleResume,
        onRestart: handleRestart,
        onHowToPlay: handleHowToPlay,
        onExit: handleExit,
        ...pauseSnapshot,
      });
      return;
    }

    menuScene.hideMenu('pause');
  }, [handleExit, handleHowToPlay, handleRestart, handleResume, isPaused, isSubmitting, resultData]);

  useEffect(() => {
    const menuScene = gameRef.current?.scene?.keys?.MenuScene;
    if (!menuScene) {
      return;
    }

    if ((!resultData && !isSubmitting) || hideResultOverlay) {
      menuScene.hideMenu('result');
      return;
    }

    menuScene.hideMenu('result');
  }, [canAdvanceLevel, gameplayData, hideResultOverlay, isSubmitting, onBack, onNextLevel, onRetry, resultData]);

  useEffect(() => {
    const sceneManager = gameRef.current?.scene;
    if (!sceneManager || resultData || isSubmitting) {
      return;
    }

    const game = gameRef.current;
    let restore;
    let applied = false;
    const synchronize = () => {
      const levelScene = sceneManager.keys?.LevelScene;
      if (applied || !levelScene?.player?.scene || levelScene.gameState === 'loading') return;
      applied = true;
      if (showTutorial) {
        setTutorialState(null);
        restore = pauseForTutorial(levelScene, sceneManager);
        sceneManager.keys?.MenuScene?.hideMenu?.('pause');
        sceneManager.start('GameOneTutorialScene', { source: levelScene, onUpdate: setTutorialState });
        return;
      }
      const guideOpen = showGuide && (!gameTutorialRequested || guideOpenedDuringGameplay);
      game.__ITECHS_GAME_ONE_OVERLAY_PAUSED__ = guideOpen;
      levelScene.setOverlayPaused(guideOpen);
      if (guideOpen) {
        sceneManager.pause('LevelScene');
        sceneManager.pause('HudScene');
        sceneManager.pause('QuestionScene');
        sceneManager.keys?.MenuScene?.hideMenu?.('pause');
      } else {
        sceneManager.resume('LevelScene');
        sceneManager.resume('HudScene');
      }
    };
    synchronize();
    game.events.on('poststep', synchronize);
    return () => {
      game.events.off('poststep', synchronize);
      if (restore) {
        sceneManager.stop('GameOneTutorialScene');
        restore();
      }
    };
  }, [gameTutorialRequested, guideOpenedDuringGameplay, isSubmitting, resultData, showGuide, showTutorial, hintCoinCost, hintStarCost, levelData, runtimeAssets, showLevelGuideline, suppressPreloadUi]);

  return (
    <div className={`game-one-frame-shell relative box-border w-full ${frameClassName}`}>
      <div
        className="game-one-canvas-viewport relative w-full overflow-hidden rounded-[16px] border-2 border-slate-600 bg-slate-950 shadow-[0_10px_24px_rgba(2,6,23,0.28)]"
        style={{ aspectRatio: viewportAspectRatio }}
      >
        <div
          ref={containerRef}
          className={`absolute inset-0 h-full w-full [&>canvas]:block! [&>canvas]:h-full! [&>canvas]:w-full! [&>canvas]:cursor-default ${canvasHostClassName}`}
        />
      </div>
      <div className="game-one-mobile-controls" aria-label="Game controls">
        <div className="game-one-mobile-direction-controls">
          <button
            type="button"
            className="game-one-mobile-control-button"
            aria-label="Move left"
            onPointerDown={(event) => setMobileControl('left', true, event)}
            onPointerUp={(event) => setMobileControl('left', false, event)}
            onPointerCancel={(event) => setMobileControl('left', false, event)}
            onPointerLeave={(event) => setMobileControl('left', false, event)}
            onTouchStart={(event) => setMobileControl('left', true, event)}
            onTouchEnd={(event) => setMobileControl('left', false, event)}
            onTouchCancel={(event) => setMobileControl('left', false, event)}
          >
            &lt;
          </button>
          <button
            type="button"
            className="game-one-mobile-control-button"
            aria-label="Move right"
            onPointerDown={(event) => setMobileControl('right', true, event)}
            onPointerUp={(event) => setMobileControl('right', false, event)}
            onPointerCancel={(event) => setMobileControl('right', false, event)}
            onPointerLeave={(event) => setMobileControl('right', false, event)}
            onTouchStart={(event) => setMobileControl('right', true, event)}
            onTouchEnd={(event) => setMobileControl('right', false, event)}
            onTouchCancel={(event) => setMobileControl('right', false, event)}
          >
            &gt;
          </button>
        </div>
        <div className="game-one-mobile-action-controls">
          <button
            type="button"
            className="game-one-mobile-control-button"
            aria-label="Dash"
            onPointerDown={(event) => queueMobileControl('dashQueued', event)}
            onTouchStart={(event) => queueMobileControl('dashQueued', event)}
          >
            Dash
          </button>
          <button
            type="button"
            className="game-one-mobile-control-button"
            aria-label="Attack"
            onPointerDown={(event) => queueMobileControl('attackQueued', event)}
            onTouchStart={(event) => queueMobileControl('attackQueued', event)}
          >
            Atk
          </button>
          <button
            type="button"
            className="game-one-mobile-control-button game-one-mobile-jump-button"
            aria-label="Jump"
            onPointerDown={(event) => queueMobileControl('jumpQueued', event)}
            onTouchStart={(event) => queueMobileControl('jumpQueued', event)}
          >
            Jump
          </button>
        </div>
      </div>
      {!hideResultOverlay ? (
        <ResultOverlay
          result={resultData}
          gameplay={gameplayData}
          isSubmitting={isSubmitting}
          canAdvanceLevel={canAdvanceLevel}
          onRetry={onRetry}
          onBack={onBack}
          onNextLevel={onNextLevel}
        />
      ) : null}
      {renderScreenModal(
        <AnimatePresence>
          {showGuide && !resultData && !isSubmitting && (
            <motion.div
              className="actual-game-tutorial-motion"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GameGuideOverlay
                kicker={gameOneGuideContent.kicker}
                title={gameOneGuideContent.title}
                lead={gameOneGuideContent.lead}
                summary={gameOneGuideContent.summary}
                sections={gameOneGuideContent.sections}
                onExit={guideOpenedDuringGameplay ? closeGameplayGuidelines : onExitRequest}
                onStart={() => {
                  if (guideOpenedDuringGameplay) {
                    closeGameplayGuidelines();
                    return;
                  }
                  if (continueToTutorialAfterGuide) {
                    setIsAutomaticFirstPlayTutorial(true);
                    setTutorialView('practice');
                    return;
                  }
                  setTutorialView(null);
                }}
                startLabel={guideOpenedDuringGameplay ? 'Continue' : 'Next'}
              />
            </motion.div>
          )}
          {showTutorial && !resultData && !isSubmitting && (
            <motion.div
              className="actual-game-tutorial-motion"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GameOneInteractiveTutorial
                state={tutorialState}
                canvasRef={containerRef}
                levelNumber={levelData?.levelNumber || 1}
                isReplay={!isAutomaticFirstPlayTutorial}
                onPageChange={(page) => getTutorialScene()?.goToPage(page)}
                onAcknowledge={() => getTutorialScene()?.acknowledge()}
                onExit={onExitRequest}
                onFinish={() => {
                  setIsAutomaticFirstPlayTutorial(false);
                  setTutorialView(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>,
      )}
    </div>
  );
});

export default GameCanvas;
