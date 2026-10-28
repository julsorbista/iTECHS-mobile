import React from 'react';
import './ActualGameTutorialOverlay.css';
import cursorImage from './tutorial-hand.png';
import platformImage from '../../game-one/assets/processed/platforms/platform-grass.png';
import playerImage from '../../game-one/assets/processed/player/frames/idle/idle-frame-00.png';
import portalImage from '../../game-one/assets/processed/sprites/portal-sheet.png';
import cpuImage from '../../game-two/assets/processed/game-two-cpu.png';
import motherboardImage from '../../game-two/assets/processed/game-two-motherboard.png';
import variableCardImage from '../../../assets/game-three/new-cards/Variable.png';
import booleanCardImage from '../../../assets/game-three/new-cards/Boolean.png';
import boxImage from '../../game-four/assets/processed/box.png';
import bombImage from '../../game-four/assets/processed/bomb.png';

const TUTORIAL_OVERLAY_CONFIG = Object.freeze({
  platform: {
    title: 'Tutorial level: move to the challenge',
    body: 'Watch the path first. Move the player, jump across platforms, avoid hazards, then reach the challenge marker.',
    controls: ['A / D or Arrow Keys: move', 'Space / Up: jump', 'Reach ?: answer'],
    cursorClass: 'actual-tutorial-cursor-platform',
    showArc: false,
    guidelines: [
      'Start by moving left and right until the player feels easy to control.',
      'Jump before gaps or raised platforms.',
      'Reach the question marker to open the level challenge.',
    ],
    highlights: [
      { className: 'actual-tutorial-highlight actual-tutorial-highlight-player', label: 'Player' },
      { className: 'actual-tutorial-highlight actual-tutorial-highlight-goal', label: 'Goal' },
    ],
  },
  drag: {
    title: 'Tutorial level: place each computer part',
    body: 'Watch the hand drag a part into its matching slot. New players should match the picture and name before dropping.',
    controls: ['Click + hold: pick up', 'Drag: move part', 'Release: drop'],
    cursorClass: 'actual-tutorial-cursor-drag',
    showArc: false,
    guidelines: [
      'Choose a part from the parts panel.',
      'Drag it over the matching target on the board.',
      'Drop it when the part and slot match.',
    ],
    highlights: [],
  },
  cards: {
    title: 'Tutorial level: match a pair, then answer',
    body: 'Watch two cards flip. Match the same concept, then answer the quiz that appears to earn the pair.',
    controls: ['Click card: flip', 'Click second card: check pair', 'Quiz answer: confirm'],
    cursorClass: 'actual-tutorial-cursor-cards',
    showArc: false,
    guidelines: [
      'Tap one card to flip it.',
      'Tap a second card to check for a match.',
      'Matched pairs open a quiz question.',
      'Answer correctly to earn the pair star.',
    ],
    highlights: [],
  },
  catch: {
    title: 'Tutorial level: catch code, avoid bombs',
    body: 'Watch the basket move under the Java token. Catch the needed code pieces, avoid bombs, and collect gears for extra lives.',
    controls: ['A / D or Arrows: move basket', 'Code tokens: catch', 'Bombs: lose 1 life', '3 gears: +1 life'],
    cursorClass: 'actual-tutorial-cursor-catch',
    showArc: false,
    guidelines: [
      'Move under the correct Java token before it falls past you.',
      'Avoid bombs; they remove one life.',
      'Collect three gears to restore one missing life.',
    ],
    highlights: [
      { className: 'actual-tutorial-highlight actual-tutorial-highlight-fall', label: 'Token' },
      { className: 'actual-tutorial-highlight actual-tutorial-highlight-basket', label: 'Basket' },
    ],
  },
  guess: {
    title: 'Tutorial level: solve the hidden word',
    body: 'Watch the demo choose a letter. Use the clue, reveal letters, and solve the programming word before lives run out.',
    controls: ['Keyboard: type letter', 'Mouse: click letter', 'Clue: reveal help'],
    cursorClass: 'actual-tutorial-cursor-guess',
    showCursor: false,
    showArc: false,
    guidelines: [
      'Read the clue before choosing a letter.',
      'Correct letters fill the word.',
      'Wrong letters cost a life, so use clues when stuck.',
    ],
    highlights: [],
  },
  type: {
    title: 'Tutorial level: type the falling term',
    body: 'Watch the word fall, then type it into the input. Submit before the term reaches the bottom.',
    controls: ['Keyboard: type answer', 'Enter: submit', 'Coins: rewards'],
    cursorClass: 'actual-tutorial-cursor-type',
    showCursor: false,
    showArc: false,
    guidelines: [
      'Read the falling term carefully.',
      'Type the exact word in the answer box.',
      'Press Enter before the word lands.',
    ],
    highlights: [],
  },
});

const ActualGameTutorialOverlay = ({
  variant = 'drag',
  kicker = 'Tutorial',
  title,
  body,
  onExit,
  onStart,
  startLabel = 'Start Tutorial Level',
}) => {
  const config = TUTORIAL_OVERLAY_CONFIG[variant] || TUTORIAL_OVERLAY_CONFIG.drag;

  return (
    <div className={`actual-game-tutorial-overlay actual-game-tutorial-overlay-${variant}`}>
      <div className="actual-game-tutorial-scrim" />
      <div className={`actual-game-tutorial-visuals actual-game-tutorial-visuals-${variant}`} aria-hidden="true">
        {variant === 'platform' && (
          <>
            <img className="actual-tutorial-platform platform-a" src={platformImage} alt="" />
            <img className="actual-tutorial-platform platform-b" src={platformImage} alt="" />
            <span className="actual-tutorial-player" aria-hidden="true">
              <img src={playerImage} alt="" />
            </span>
            <img className="actual-tutorial-portal" src={portalImage} alt="" />
          </>
        )}

        {variant === 'drag' && (
          <>
            <div className="actual-tutorial-part-card">
              <img src={cpuImage} alt="" />
              <strong>CPU</strong>
            </div>
            <div className="actual-tutorial-board-slot">
              <img src={motherboardImage} alt="" />
              <span>Drop here</span>
            </div>
          </>
        )}

        {variant === 'cards' && (
          <>
            <div className="actual-tutorial-card card-match-a">
              <div className="actual-tutorial-card-inner">
                <div className="actual-tutorial-card-face actual-tutorial-card-back">
                  <span>?</span>
                </div>
                <div className="actual-tutorial-card-face actual-tutorial-card-front">
                  <img src={variableCardImage} alt="" />
                  <strong>Variable</strong>
                </div>
              </div>
            </div>
            <div className="actual-tutorial-card card-match-b">
              <div className="actual-tutorial-card-inner">
                <div className="actual-tutorial-card-face actual-tutorial-card-back">
                  <span>?</span>
                </div>
                <div className="actual-tutorial-card-face actual-tutorial-card-front">
                  <img src={variableCardImage} alt="" />
                  <strong>Variable</strong>
                </div>
              </div>
            </div>
            <div className="actual-tutorial-card card-decoy">
              <div className="actual-tutorial-card-inner">
                <div className="actual-tutorial-card-face actual-tutorial-card-front">
                  <img src={booleanCardImage} alt="" />
                  <strong>Boolean</strong>
                </div>
              </div>
            </div>
          </>
        )}

        {variant === 'catch' && (
          <>
            <div className="actual-tutorial-code-token">int</div>
            <img className="actual-tutorial-bomb" src={bombImage} alt="" />
            <img className="actual-tutorial-basket-img" src={boxImage} alt="" />
          </>
        )}

        {variant === 'guess' && (
          <>
            <div className="actual-tutorial-word-preview actual-tutorial-word-preview-guess">
              <span className="actual-tutorial-input-letter">L</span>
              <span>O</span>
              <span>O</span>
              <span>P</span>
            </div>
            <div className="actual-tutorial-keyboard actual-tutorial-keyboard-guess">
              <div>
                <span>Q</span>
                <span>W</span>
                <span>E</span>
                <span>R</span>
                <span>T</span>
                <span>Y</span>
                <span>U</span>
                <span>I</span>
                <span>O</span>
                <span>P</span>
              </div>
              <div>
                <span>A</span>
                <span>S</span>
                <span>D</span>
                <span>F</span>
                <span>G</span>
                <span>H</span>
                <span>J</span>
                <span>K</span>
                <span className="key-click-one">L</span>
              </div>
              <div>
                <span>Z</span>
                <span>X</span>
                <span>C</span>
                <span>V</span>
                <span>B</span>
                <span>N</span>
                <span>M</span>
              </div>
              <div>
                <span className="actual-tutorial-space-key">SPACE</span>
                <span>ENTER</span>
              </div>
            </div>
            <div className="actual-tutorial-guess-progress">
              <span>L</span>
              <span>O</span>
              <span>O</span>
              <span>P</span>
            </div>
          </>
        )}

        {variant === 'type' && (
          <>
            <div className="actual-tutorial-falling-word">syntax</div>
            <div className="actual-tutorial-type-input actual-tutorial-type-input-demo">
              <span>S</span>
              <span>Y</span>
              <span>N</span>
              <span>T</span>
              <span>A</span>
              <span>X</span>
            </div>
            <div className="actual-tutorial-keyboard actual-tutorial-keyboard-type">
              <div>
                <span>Q</span>
                <span>W</span>
                <span>E</span>
                <span>R</span>
                <span>T</span>
                <span className="key-click-three">Y</span>
                <span>U</span>
                <span>I</span>
                <span>O</span>
                <span>P</span>
              </div>
              <div>
                <span>A</span>
                <span className="key-click-one">S</span>
                <span>D</span>
                <span>F</span>
                <span>G</span>
                <span>H</span>
                <span>J</span>
                <span>K</span>
                <span>L</span>
              </div>
              <div>
                <span>Z</span>
                <span>X</span>
                <span className="key-click-two">N</span>
                <span>C</span>
                <span>V</span>
                <span>B</span>
                <span>M</span>
              </div>
              <div>
                <span className="actual-tutorial-space-key">SPACE</span>
              </div>
            </div>
            <div className="actual-tutorial-enter-button">Enter</div>
          </>
        )}
      </div>
      {config.highlights.map((highlight) => (
        <div key={highlight.className} className={highlight.className}>
          <span>{highlight.label}</span>
        </div>
      ))}
      {config.showArc !== false && (
        <svg className="actual-tutorial-arc" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M22 64 C38 28 62 28 78 54" />
          <path className="actual-tutorial-arrow-head" d="M78 54 l-8 -1 l5 7 z" />
        </svg>
      )}
      {config.showCursor !== false && (
        <img
          className={`actual-game-tutorial-cursor ${config.cursorClass}`}
          src={cursorImage}
          alt=""
        />
      )}
      <section className="actual-game-tutorial-callout" role="dialog" aria-modal="true" aria-label={title || config.title}>
        <p>{kicker}</p>
        <h3>{title || config.title}</h3>
        <span>{body || config.body}</span>
        {config.controls?.length > 0 && (
          <div className="actual-game-tutorial-controls" aria-label="Controls">
            {config.controls.map((control) => {
              const [label, detail] = control.split(':');
              return (
                <strong key={control}>
                  <kbd>{label}</kbd>
                  {detail ? <em>{detail.trim()}</em> : null}
                </strong>
              );
            })}
          </div>
        )}
        {config.guidelines?.length > 0 && (
          <ul className="actual-game-tutorial-guidelines">
            {config.guidelines.map((guideline) => (
              <li key={guideline}>{guideline}</li>
            ))}
          </ul>
        )}
        <div className="actual-game-tutorial-actions">
          {onExit && (
            <button type="button" className="btn btn-secondary" onClick={onExit}>
              Exit Level
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onStart}>
            {startLabel}
          </button>
        </div>
      </section>
    </div>
  );
};

export default ActualGameTutorialOverlay;
