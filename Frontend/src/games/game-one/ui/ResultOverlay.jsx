import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getResultHeadline } from '../systems/progressBridge';
import resultsFrame from '../assets/ui/results-frame.png';
import completeLevelFrame from '../../../assets/game-arcade/complete-level.png';
import gameCompleteSound from '../../../assets/game-arcade/game-complete.mp3';
import failedSound from '../../game-six/assets/game-over-sfx.mp3';
import { getStudentSfxVolume } from '../../../utils/studentMenuAudio';
import './ResultOverlay.css';

const ResultOverlay = ({
  result,
  gameplay,
  isSubmitting,
  canAdvanceLevel,
  onRetry,
  onBack,
  onNextLevel,
  gameType = 'GAME_ONE',
  isGameComplete = false,
}) => {
  const isFailure = result?.result === 'FAILED';

  useEffect(() => {
    if (!isFailure || isSubmitting) return undefined;

    const audio = new Audio(failedSound);
    audio.volume = getStudentSfxVolume(1);
    audio.preload = 'auto';
    audio.load();
    let playbackStarted = false;
    let playbackPending = false;

    const playFailedSound = () => {
      if (playbackStarted || playbackPending || !audio.paused) return;
      audio.currentTime = 0;
      playbackPending = true;
      const playPromise = audio.play();
      if (playPromise?.then) {
        playPromise.then(() => {
          playbackPending = false;
          playbackStarted = true;
          window.removeEventListener('pointerdown', playFailedSound);
          window.removeEventListener('keydown', playFailedSound);
        }).catch(() => {
          playbackPending = false;
          window.addEventListener('pointerdown', playFailedSound, { once: true });
          window.addEventListener('keydown', playFailedSound, { once: true });
        });
      }
    };

    const retryTimers = [0, 300, 900].map((delay) => window.setTimeout(playFailedSound, delay));
    return () => {
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('pointerdown', playFailedSound);
      window.removeEventListener('keydown', playFailedSound);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [isFailure, isSubmitting]);

  useEffect(() => {
    if (!isGameComplete || isSubmitting) return undefined;

    const audio = new Audio(gameCompleteSound);
    audio.volume = getStudentSfxVolume(1);
    audio.preload = 'auto';
    audio.load();
    let playbackStarted = false;

    const playGameCompleteSound = () => {
      if (playbackStarted || !audio.paused) return;
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise?.then) {
        playPromise.then(() => {
          playbackStarted = true;
          window.removeEventListener('pointerdown', playGameCompleteSound);
          window.removeEventListener('keydown', playGameCompleteSound);
        }).catch(() => {
          window.addEventListener('pointerdown', playGameCompleteSound, { once: true });
          window.addEventListener('keydown', playGameCompleteSound, { once: true });
        });
      }
    };

    const soundTimer = window.setTimeout(playGameCompleteSound, 120);
    return () => {
      window.clearTimeout(soundTimer);
      window.removeEventListener('pointerdown', playGameCompleteSound);
      window.removeEventListener('keydown', playGameCompleteSound);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [isGameComplete, isSubmitting]);

  if (!result && !isSubmitting) {
    return null;
  }

  const headline = getResultHeadline(result);
  const stars = isFailure ? 0 : Number(result?.starsEarned || 0);
  const coinsCollected = Number(gameplay?.coinsCollected || 0);
  const scrollsCollected = Number(gameplay?.scrollsCollected || 0);
  const scrollGoal = Number(gameplay?.scrollGoal || 0);
  const scrollsLabel = scrollGoal > 0 ? `${scrollsCollected}/${scrollGoal}` : `${scrollsCollected}`;
  const elapsedSeconds = Math.max(0, Math.round(Number(gameplay?.elapsedMs || result?.elapsedMs || 0) / 1000));
  const elapsedLabel = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`;
  const score = isSubmitting ? '...' : (result?.finalScore ?? gameplay?.points ?? '--');
  const completedTasks = Number(gameplay?.completedTasks || 0);
  const totalTasks = Number(gameplay?.totalTasks || 0);
  const progressValue = totalTasks > 0 ? `${completedTasks}/${totalTasks}` : `${completedTasks}`;
  const normalizedGameType = String(gameType || 'GAME_ONE').toUpperCase();
  const gameMetrics = {
    GAME_ONE: [
      ['Stars', isSubmitting ? '...' : stars],
      ['Coins', coinsCollected],
      ['Scrolls', scrollsLabel],
      ['Time', elapsedLabel],
      ['Score', score],
    ],
    GAME_TWO: [
      ['Stars', isSubmitting ? '...' : stars],
      ['Outputs', progressValue],
      ['Mistakes', Number(gameplay?.mistakes || 0)],
      ['Time', elapsedLabel],
      ['Score', score],
    ],
    GAME_THREE: [
      ['Stars', isSubmitting ? '...' : stars],
      ['Pairs', `${Number(gameplay?.matchedPairs || 0)}/${Number(gameplay?.totalPairs || 0)}`],
      ['Moves', Number(gameplay?.moves || 0)],
      ['Time', elapsedLabel],
      ['Score', score],
    ],
    GAME_FOUR: [
      ['Stars', isSubmitting ? '...' : stars],
      ['Rounds', `${Number(gameplay?.roundsCleared || 0)}/${Number(gameplay?.totalRounds || 0)}`],
      ['Mistakes', Number(gameplay?.mistakes || 0)],
      ['Time', elapsedLabel],
      ['Score', score],
    ],
    GAME_FIVE: [
      ['Stars', isSubmitting ? '...' : stars],
      ['Words', progressValue],
      ['Mistakes', Number(gameplay?.mistakes || 0)],
      ['Time', elapsedLabel],
      ['Score', score],
    ],
    GAME_SIX: [
      ['Stars', isSubmitting ? '...' : stars],
      ['Terms', progressValue],
      ['Mistakes', Number(gameplay?.mistakes || 0)],
      ['Time', elapsedLabel],
      ['Score', score],
    ],
  };
  const metrics = gameMetrics[normalizedGameType] || gameMetrics.GAME_ONE;

  const overlay = (
    <div className={`game-one-results-overlay${['GAME_ONE', 'GAME_TWO', 'GAME_FOUR', 'GAME_FIVE', 'GAME_SIX'].includes(normalizedGameType) ? ' game-illustrated-results' : ''} absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4`}>
      <div
        className={`game-one-results-card${isGameComplete ? ' game-one-game-complete-card' : ''}`}
        style={{
          fontFamily: 'Manrope, Arial, sans-serif',
          backgroundImage: `url(${isGameComplete ? completeLevelFrame : resultsFrame})`,
        }}
      >
        <div className="game-one-results-heading">
          <h2>
            {isSubmitting
              ? 'Saving Result...'
              : isGameComplete
                ? null
                : headline}
          </h2>
          <p>
            {isSubmitting
              ? 'Updating your progress, stars, and score for this run.'
              : isGameComplete
                ? <>Great work!<br />You completed every level.</>
                : result?.result === 'COMPLETED'
                ? 'The stage is cleared. You can replay it or move on to the next challenge.'
                : 'The run ended before the stage was cleared. Retry the level to keep progressing.'}
          </p>
        </div>

        <div className="game-one-results-list">
          {metrics.map(([label, value]) => (
            <div key={label}>
              <p>{label}</p><strong>{value}</strong>
            </div>
          ))}
        </div>

        {!isSubmitting && (
          <div className="game-one-results-actions">
            {!isFailure && canAdvanceLevel ? (
              <button
                type="button"
                className="h-[58px] flex-1 rounded-[18px] border-[3px] border-[#14532d] bg-[#166534] px-[18px] text-[20px] font-bold text-white transition hover:bg-[#15803d]"
                onClick={onNextLevel}
              >
                Next Level
              </button>
            ) : null}
            <button
              type="button"
              className={`h-[58px] flex-1 rounded-[18px] border-[3px] px-[18px] text-[20px] font-bold text-white transition ${
                !isFailure && canAdvanceLevel
                  ? 'border-[#9a3412] bg-[#d97706] hover:bg-[#ea8a06]'
                  : 'border-[#14532d] bg-[#166534] hover:bg-[#15803d]'
              }`}
              onClick={onRetry}
            >
              {isFailure ? 'Retry Level' : 'Play Again'}
            </button>
            <button
              type="button"
              className="h-[58px] flex-1 rounded-[18px] border-[3px] border-[#334155] bg-[#475569] px-[18px] text-[20px] font-bold text-white transition hover:bg-[#53657e]"
              onClick={onBack}
            >
              Back To Levels
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay;
};

export default ResultOverlay;
