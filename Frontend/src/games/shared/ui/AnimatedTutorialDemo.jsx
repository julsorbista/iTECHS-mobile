import React from 'react';
import cursorImage from './cursor.png';

const DEMO_COPY = Object.freeze({
  platform: {
    title: 'Move, jump, and reach the challenge',
    hint: 'The hand shows the basic path from movement to the question point.',
  },
  drag: {
    title: 'Drag the block to the matching slot',
    hint: 'Follow the moving hand from the code piece into the target area.',
  },
  cards: {
    title: 'Flip two cards and find a pair',
    hint: 'The hand taps two cards, then the matched pair opens the quiz.',
  },
  catch: {
    title: 'Move under the correct falling token',
    hint: 'The hand slides the basket while the right code piece drops.',
  },
  guess: {
    title: 'Choose letters to solve the word',
    hint: 'The hand taps a letter, then the answer board updates.',
  },
  type: {
    title: 'Type the falling term and submit',
    hint: 'The hand points from the word to the input before Enter.',
  },
});

const AnimatedTutorialDemo = ({ variant = 'drag' }) => {
  const demo = DEMO_COPY[variant] || DEMO_COPY.drag;

  return (
    <section className={`animated-tutorial-demo animated-tutorial-demo-${variant}`} aria-label={demo.title}>
      <div className="animated-tutorial-stage" aria-hidden="true">
        <div className="animated-tutorial-glow" />
        <div className="animated-tutorial-path" />

        {variant === 'platform' && (
          <>
            <span className="tutorial-tile tutorial-tile-ground tile-a" />
            <span className="tutorial-tile tutorial-tile-ground tile-b" />
            <span className="tutorial-tile tutorial-tile-ground tile-c" />
            <span className="tutorial-avatar" />
            <span className="tutorial-goal">?</span>
          </>
        )}

        {variant === 'drag' && (
          <>
            <span className="tutorial-code-block">int</span>
            <span className="tutorial-drop-slot">type</span>
          </>
        )}

        {variant === 'cards' && (
          <>
            <span className="tutorial-card card-a">?</span>
            <span className="tutorial-card card-b">?</span>
            <span className="tutorial-card card-c">A</span>
          </>
        )}

        {variant === 'catch' && (
          <>
            <span className="tutorial-falling-token">;</span>
            <span className="tutorial-bomb-token">!</span>
            <span className="tutorial-basket" />
          </>
        )}

        {variant === 'guess' && (
          <>
            <span className="tutorial-word-board">_ O O P</span>
            <span className="tutorial-key key-a">L</span>
            <span className="tutorial-key key-b">A</span>
            <span className="tutorial-key key-c">S</span>
          </>
        )}

        {variant === 'type' && (
          <>
            <span className="tutorial-rain-word">syntax</span>
            <span className="tutorial-input-box">syntax</span>
            <span className="tutorial-enter-key">Enter</span>
          </>
        )}

        <img className="animated-tutorial-cursor" src={cursorImage} alt="" />
      </div>
      <div className="animated-tutorial-copy">
        <h4>{demo.title}</h4>
        <p>{demo.hint}</p>
      </div>
    </section>
  );
};

export default AnimatedTutorialDemo;
