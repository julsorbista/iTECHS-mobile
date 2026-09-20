import React from 'react';
import { createPortal } from 'react-dom';
import loadingFrame from '../../game-one/assets/ui/loading-frame.png';
import './GameLoadingOverlay.css';

export default function GameLoadingOverlay({ levelLabel, title, description, progress }) {
  const percent = Math.max(0, Math.min(100, Math.round(progress)));
  return createPortal(
    <div className="game-loading-screen" role="status" aria-label={`${title}: ${levelLabel}`}>
      <section className="game-loading-board" style={{ backgroundImage: `url(${loadingFrame})` }}>
        <div className="game-loading-copy">
          <p className="game-loading-kicker">{levelLabel}</p>
          <h2>{title}</h2>
          <p className="game-loading-description">{description}</p>
          <div className="game-loading-track" role="progressbar" aria-label="Level preparation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <span style={{ width: `${percent}%` }} />
          </div>
          <strong className="game-loading-percent">{percent}%</strong>
        </div>
      </section>
    </div>,
    document.body,
  );
}
