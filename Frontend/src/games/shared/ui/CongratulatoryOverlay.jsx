import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ChevronRight, Star } from 'lucide-react';
import { FALLBACK_CONGRATS_MESSAGE } from './completionText';
import celebrationSound from '../../../assets/game-arcade/audio/YAY Kids (Celebration) Sound Effect [Free Download].mp3';
import congratulationsFrame from '../../game-one/assets/ui/congratulations-frame.png';
import { getStudentSfxVolume } from '../../../utils/studentMenuAudio';

const CONFETTI_COLORS = ['#facc15', '#fb7185', '#38bdf8', '#34d399', '#a78bfa', '#fb923c'];
const CONFETTI_PIECES = Array.from({ length: 52 }, (_, index) => ({
  left: `${(index * 37 + 3) % 100}%`,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  width: 6 + ((index * 5) % 8),
  height: index % 4 === 0 ? 6 + ((index * 3) % 7) : 11 + ((index * 7) % 10),
  delay: `-${((index * 29) % 70) / 10}s`,
  duration: `${4.6 + ((index * 13) % 30) / 10}s`,
  drift: `${-70 + ((index * 47) % 140)}px`,
  driftEnd: `${Math.round((70 - ((index * 47) % 140)) * 0.45)}px`,
  rotation: `${180 + ((index * 83) % 540)}deg`,
  rotationEnd: `${Math.round((180 + ((index * 83) % 540)) * 1.8)}deg`,
  round: index % 5 === 0,
}));

const CongratulatoryOverlay = ({
  kicker = 'Level Complete',
  title = 'Congratulations',
  message = FALLBACK_CONGRATS_MESSAGE,
  onNext,
  nextLabel = 'Next',
  variant = '',
  renderInPortal = true,
  soundDelayMs = 0,
}) => {
  const completionMessage = String(message || '').replace(/\s*Great job!\s*$/i, '').trim();

  useEffect(() => {
    const audio = new Audio(celebrationSound);
    audio.volume = getStudentSfxVolume(1);
    audio.preload = 'auto';
    audio.muted = false;
    audio.load();

    let playbackStarted = false;
    let playbackAttemptPending = false;

    const playCelebration = () => {
      if (playbackStarted || playbackAttemptPending || !audio.paused) return;

      audio.volume = getStudentSfxVolume(1);
      audio.muted = false;
      audio.currentTime = 0;
      playbackAttemptPending = true;
      const playPromise = audio.play();
      if (playPromise?.then) {
        playPromise
          .then(() => {
            playbackAttemptPending = false;
            playbackStarted = true;
            window.removeEventListener('pointerdown', playCelebration);
            window.removeEventListener('keydown', playCelebration);
          })
          .catch(() => {
            playbackAttemptPending = false;
            window.addEventListener('pointerdown', playCelebration, { once: true });
            window.addEventListener('keydown', playCelebration, { once: true });
          });
      } else {
        playbackAttemptPending = false;
        playbackStarted = true;
      }
    };

    const timerIds = [0, 300, 900].map((retryDelay) =>
      window.setTimeout(playCelebration, soundDelayMs + retryDelay),
    );

    return () => {
      timerIds.forEach((timerId) => window.clearTimeout(timerId));
      window.removeEventListener('pointerdown', playCelebration);
      window.removeEventListener('keydown', playCelebration);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [soundDelayMs]);

  const overlay = (
  <div className={`game-three-result-overlay game-congrats-overlay ${variant}`.trim()}>
    <div className="game-congrats-confetti" aria-hidden="true">
      {CONFETTI_PIECES.map((piece, index) => (
        <span
          key={index}
          className={piece.round ? 'game-congrats-confetti-dot' : ''}
          style={{
            left: piece.left,
            background: piece.color,
            width: `${piece.width}px`,
            height: `${piece.height}px`,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            '--confetti-drift': piece.drift,
            '--confetti-drift-end': piece.driftEnd,
            '--confetti-rotation': piece.rotation,
            '--confetti-rotation-end': piece.rotationEnd,
          }}
        />
      ))}
    </div>

    <div
      className="game-three-result-card game-congrats-card game-congrats-reference-card"
      style={{ backgroundImage: `url(${congratulationsFrame})` }}
    >
      <div className="game-congrats-content">
        <p className="student-mini-kicker">{kicker}</p>

        <div className="game-three-result-title">
          <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          <span>{title}</span>
        </div>

        <div className="game-congrats-stars" aria-label="3 stars">
          <Star aria-hidden="true" />
          <Star aria-hidden="true" />
          <Star aria-hidden="true" />
        </div>

        <div className="game-congrats-copy">
          <p className="game-congrats-message">{completionMessage}</p>
          <p className="game-congrats-great-job">Great job!</p>
        </div>

        <div className="game-three-result-actions">
          <button type="button" className="btn btn-primary" onClick={onNext}>
            <span>{nextLabel}</span>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </div>
  );

  return renderInPortal && typeof document !== 'undefined'
    ? createPortal(overlay, document.body)
    : overlay;
};

export default CongratulatoryOverlay;
