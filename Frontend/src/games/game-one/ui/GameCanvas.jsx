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
import HudScene from '../scenes/HudScene';
import QuestionScene from '../scenes/QuestionScene';
import MenuScene from '../scenes/MenuScene';
import GameGuideOverlay from '../../shared/ui/GameGuideOverlay';
import GameTutorialOverlay from '../../shared/ui/GameTutorialOverlay';
import { buildGameOneGuideContent } from '../../shared/ui/gameGuideContent';
import ResultOverlay from './ResultOverlay';

const renderScreenModal = (content) => (
  typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : null
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
  continueToTutorialAfterGuide = false,
  showTutorialButton = false,
}, ref) => {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const mobileControlsRef = useRef({ left: false, right: false, jumpQueued: false });
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
  const showGuide = tutorialView === 'guide';
  const showTutorial = tutorialView === 'practice';
  const showMobileControls = !showGuide
    && !showTutorial
    && !isPaused
    && !isQuestionOpen
    && !resultData
    && !isSubmitting;
  const gameOneGuideContent = useMemo(
    () => buildGameOneGuideContent(levelData),
    [levelData],
  );

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
  }, [levelData, showLevelGuideline]);

  useEffect(() => {
    if (Number(gameTutorialRequested) > 0) {
      setTutorialView('practice');
    }
  }, [gameTutorialRequested]);

  useEffect(() => {
    if (!showMobileControls) {
      mobileControlsRef.current.left = false;
      mobileControlsRef.current.right = false;
      mobileControlsRef.current.jumpQueued = false;
    }
  }, [showMobileControls]);

  useImperativeHandle(ref, () => ({
    openTutorial: () => {
      if (!shouldAllowTutorial) return;
      setTutorialView('practice');
    },
  }), [shouldAllowTutorial]);

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
      mobileControls: mobileControlsRef.current,
      suppressPreloadUi: Boolean(suppressPreloadUi),
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
      parent: containerRef.current,
      pixelArt: true,
      roundPixels: true,
      backgroundColor: '#020617',
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 1500 },
          debug: false,
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
      scene: [BootScene, PreloadScene, LevelScene, HudScene, QuestionScene, MenuScene],
      callbacks: {
        preBoot: (instance) => {
          instance.__ITECHS_BOOT__ = bootPayload;
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
  }, [hintCoinCost, hintStarCost, levelData, runtimeAssets, suppressPreloadUi]);

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
        onExit: handleExit,
        ...pauseSnapshot,
      });
      return;
    }

    menuScene.hideMenu('pause');
  }, [handleExit, handleResume, isPaused, isSubmitting, resultData]);

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

    if ((showGuide && !gameTutorialRequested) || showTutorial) {
      sceneManager.pause('LevelScene');
      sceneManager.pause('HudScene');
      sceneManager.pause('QuestionScene');
      sceneManager.keys?.MenuScene?.hideMenu?.('pause');
      return;
    }

    sceneManager.resume('LevelScene');
    sceneManager.resume('HudScene');
  }, [gameTutorialRequested, isSubmitting, resultData, showGuide, showTutorial]);

  return (
    <div className={`game-one-frame-shell relative box-border w-full ${isQuestionOpen ? 'game-one-question-open' : ''} ${frameClassName}`}>
      <div className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-slate-950 shadow-[0_28px_60px_rgba(15,23,42,0.24)]">
        <div ref={containerRef} className={`w-full [&>canvas]:w-full! [&>canvas]:h-auto! ${canvasHostClassName}`} />
      </div>
      {showMobileControls && <div className="game-one-mobile-controls" aria-label="Game controls">
        <div className="game-one-mobile-direction-controls">
          <button
            type="button"
            className="game-one-mobile-control-button"
            aria-label="Move left"
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture?.(event.pointerId);
              mobileControlsRef.current.left = true;
            }}
            onPointerUp={() => { mobileControlsRef.current.left = false; }}
            onPointerCancel={() => { mobileControlsRef.current.left = false; }}
            onLostPointerCapture={() => { mobileControlsRef.current.left = false; }}
          >
            &#9664;
          </button>
          <button
            type="button"
            className="game-one-mobile-control-button"
            aria-label="Move right"
            onPointerDown={(event) => {
              event.preventDefault();
              event.currentTarget.setPointerCapture?.(event.pointerId);
              mobileControlsRef.current.right = true;
            }}
            onPointerUp={() => { mobileControlsRef.current.right = false; }}
            onPointerCancel={() => { mobileControlsRef.current.right = false; }}
            onLostPointerCapture={() => { mobileControlsRef.current.right = false; }}
          >
            &#9654;
          </button>
        </div>
        <button
          type="button"
          className="game-one-mobile-control-button game-one-mobile-jump-button"
          aria-label="Jump"
          onPointerDown={(event) => {
            event.preventDefault();
            mobileControlsRef.current.jumpQueued = true;
          }}
        >
          Jump
        </button>
      </div>}
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
                onExit={onExitRequest}
                onStart={() => setTutorialView(continueToTutorialAfterGuide ? 'practice' : null)}
                startLabel="Next"
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
              <GameTutorialOverlay
                gameType="GAME_ONE"
                levelNumber={levelData?.levelNumber || 1}
                onExit={onExitRequest}
                onStart={() => setTutorialView(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>,
      )}
    </div>
  );
});

export default GameCanvas;
