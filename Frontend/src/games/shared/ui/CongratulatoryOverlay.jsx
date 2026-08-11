import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { FALLBACK_CONGRATS_MESSAGE } from './completionText';

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
}) => (
  <div className="game-three-result-overlay">
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

    <div className="game-three-result-card game-congrats-card">
      <div className="game-congrats-content">
        <p className="student-mini-kicker">{kicker}</p>

        <div className="game-three-result-title">
          <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          <span>{title}</span>
        </div>

        <p className="text-center text-base font-semibold leading-7 text-slate-700">
          {message}
        </p>

        <div className="game-three-result-actions">
          <button type="button" className="btn btn-primary" onClick={onNext}>
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default CongratulatoryOverlay;
