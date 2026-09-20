import React from 'react';
import clsx from 'clsx';
import gameThreeCardBack from '../../../assets/game-three/new-cards/BackView2-clean.png';

// Same card faces for the real board and the isolated practice board.
export default function GameThreeCardFaces({ linkedCard, accentGlow, background }) {
  return (
    <div className="game-three-card-inner">
      <div className="game-three-card-face game-three-card-back game-three-card-back-new-art">
        <img
          src={gameThreeCardBack}
          alt="Hidden memory card"
          className="game-three-card-back-new-art-image"
          draggable={false}
        />
      </div>

      <div
        className={clsx(
          'game-three-card-face game-three-card-front',
          linkedCard.spriteUrl && 'game-three-card-front-new-art',
        )}
        style={{
          background,
          boxShadow: `0 20px 30px ${accentGlow}`,
        }}
      >
        {linkedCard.spriteUrl ? (
          <img
            src={linkedCard.spriteUrl}
            alt={`${linkedCard.label} concept card`}
            className="game-three-card-front-image game-three-card-front-new-art-image"
            draggable={false}
          />
        ) : (
          <div className="game-three-card-copy">
            {linkedCard.spriteUrl && (
            <span className="game-three-card-art">
              <img
                src={linkedCard.spriteUrl}
                alt={`${linkedCard.label} concept card`}
                className="game-three-card-art-image"
                draggable={false}
              />
            </span>
            )}
            <span className="game-three-card-title">{linkedCard.label}</span>
            <span className="game-three-card-caption">Pair matched</span>
          </div>
        )}
      </div>
    </div>
  );
}
