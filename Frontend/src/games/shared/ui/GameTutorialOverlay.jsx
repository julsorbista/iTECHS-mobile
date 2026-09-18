import React, { useEffect, useMemo, useState } from 'react';
import TutorialHandPointer, { inferTutorialHandAction } from './TutorialHandPointer';
import GameOneTutorialDemonstration from './GameOneTutorialDemonstration';
import { createPortal } from 'react-dom';

const GAME_TUTORIALS = {
  GAME_ONE: {
    kicker: 'Game 1',
    root: '.game-one-frame-shell',
    steps: [
      { title: 'Goal and Controls', body: 'Explore all five rooms, complete each room objective, and recover the Java treasure.', items: ['Move with A/D or Left/Right Arrow keys and jump with W, Up Arrow, or Space.', 'Collect the required items shown in the objective before entering a locked room portal.', 'In the final room, use all three scroll clues to solve the treasure riddle.'], target: '.game-one-frame-shell > div:first-child' },
      { title: 'Lives', items: ['The three hearts show your current health.', 'Most enemy attacks and hazards remove one heart.', 'Reaching 0 hearts ends the level attempt.'], fallback: [0.015, 0.025, 0.06, 0.055] },
      { title: 'Combat and Hazards', items: ['Press J to fire your Arc Bolt when attacks are enabled.', 'Avoid enemies, projectiles, spikes, fire, and dangerous falls.', 'Some enemies can be defeated; keep moving when fighting is optional.'], fallback: [0.052, 0.725, 0.068, 0.155] },
      { title: 'Damage and Restarts', items: ['Taking damage removes health and returns you to the current room start.', 'Use safe platforms and press Shift for an air dash when it is enabled.', 'The attempt ends only when your health reaches 0; these levels have no countdown timer.'], fallback: [0.015, 0.025, 0.06, 0.055] },
      { title: 'Coins & Scroll Clues', items: ['The coin number shows how many coins you can use for hints.', 'The scroll counter shows how many clue scrolls you have collected out of three.', 'Collect all three scroll clues before solving the final treasure riddle.'], fallback: [0.105, 0.02, 0.13, 0.065] },
      { title: 'Room Portals', items: ['Collect the objective items shown at the top of the room.', 'A sealed portal opens after that room\'s required items are collected.', 'Enter the blue portal to continue to the next room; the final treasure chest completes the level.'], fallback: [0.88, 0.755, 0.05, 0.155] },
    ],
  },
  GAME_TWO: {
    kicker: 'Game 2',
    root: '.game-two-fruit-shell',
    steps: [
      { title: 'Welcome to Syntax Slice', body: 'Build Java statements by slicing the correct syntax pieces in order.', items: [], target: '.game-two-fruit-shell' },
      { title: 'Read the Java Code Panel', items: ['The challenge title identifies the active task.', 'CORRECT CODE shows the complete target statement.', 'SLICED CODE shows the pieces you have selected.'], target: '.game-two-fruit-code' },
      { title: 'Avoid Hazards', items: ['Gold syntax pieces are valid answers.', 'Red decoys are incorrect and can break your streak.', 'Never slice a bomb: it removes one life.'], examples: [{ type: 'decoy', label: 'Red decoy', value: 'int score == 10;' }, { type: 'bomb', label: 'Bomb', value: 'Do not slice' }], target: '.game-two-fruit-canvas' },
      { title: 'Build Combo and Output', items: ['Correct slices increase your combo.', 'Finishing a statement advances the Output counter.', 'Higher combos award more points for accurate play.'], targets: ['.game-two-fruit-combo', '.game-two-fruit-output'] },
      { title: 'Watch Lives and Score', items: ['The score shows your points for this level.', 'Lives show how many mistakes you can still make.', 'Accurate slices protect your lives and grow your score.'], targets: ['.game-two-fruit-score', '.game-two-fruit-lives'] },
      { title: 'Start the Level', items: ['Read the Java Code panel before each challenge.', 'Slice every required piece before it leaves the playfield.', 'Complete the target number of outputs to clear the level.'], target: '.game-two-fruit-mission' },
    ],
  },
  GAME_THREE: {
    kicker: 'Game 3',
    root: '.game-three-shell',
    steps: [
      { title: 'Welcome to Memory Card Game', body: 'Match the Java concept cards before your flip attempts run out.', items: ['Flip two cards at a time.', 'Matching cards stay revealed.', 'Resolve every pair to finish the board.'], target: '.game-three-board' },
      { title: 'Mechanics', items: ['Select two face-down cards to compare them.', 'A matching pair stays revealed.', 'A mismatch flips back after the preview.'], targets: ['.game-three-board .game-three-card:nth-child(1)', '.game-three-board .game-three-card:nth-child(2)'] },
      { title: 'Attempts', items: ['Each two-card selection spends one flip attempt.', 'The counter shows the remaining attempts.', 'Resolve all pairs before attempts run out.'], target: '.game-three-side-metrics .game-three-metric:nth-child(3)' },
      { title: 'Score System', items: ['Each matched pair adds one Star.', 'Mismatched cards add no Star.', 'The result is calculated after all pairs are resolved.'], targets: ['.game-three-side-metrics .game-three-metric:nth-child(1)', '.game-three-side-metrics .game-three-metric:nth-child(2)'] },
      { title: 'How to Finish', items: ['Match every pair on the board.', 'Finish before flip attempts run out.', 'Use your memory to avoid unnecessary mismatches.'], target: '.game-three-side-card:last-child' },
    ],
  },
  GAME_FOUR: {
    kicker: 'Game 4',
    root: '.game-four-stage',
    steps: [
      { title: 'How to Play Game 4', body: 'Catch the required Java pieces, then arrange them in the correct syntax order.', items: ['Move the catcher beneath falling code.', 'Avoid bombs and do not miss required pieces.', 'Arrange the collected pieces to complete each round.'], target: '.game-four-play-card' },
      { title: 'Mechanics', items: ['Catch every required code piece.', 'Move the catcher beneath each falling piece.', 'The game switches to Arrange Phase after collection.'], target: '.game-four-catcher' },
      { title: 'Controls', items: ['Move with A/D or Left/Right Arrow keys.', 'Catch objects with the basket opening.', 'Select or drag pieces during Arrange Phase.'], target: '.game-four-sidebar-movement-card' },
      { title: 'Lives', items: ['Bombs remove one life.', 'Three gears restore one missing life.', 'Reaching 0 lives ends the attempt.'], targets: ['.game-four-lives-status', '.game-four-fruit-status'] },
      { title: 'Hints & Coins', items: ['Falling coins add to the shared balance.', 'Reveal Hint spends 1 coin.', 'Hints do not directly subtract points.'], target: '.game-four-coins-status' },
      { title: 'Score System', items: ['Correct statements award points.', 'Gear adds bonus points.', 'Complete every round for the final score.'], targets: ['.game-four-level-status', '.game-four-round-status'] },
      { title: 'How to Finish', items: ['Complete both the Catch and Arrange phases.', 'Finish every round in the level.', 'Keep at least 1 Star to pass and unlock the next level.'], target: '.game-four-objective-card' },
    ],
  },
  GAME_FIVE: {
    kicker: 'Game 5',
    root: '.game-five-shell',
    steps: [
      { title: 'Welcome to Code Robot', body: 'Guess each programming word before the robot shuts down.', items: ['Read the clue and answer length.', 'Choose letters using the keyboard.', 'Solve all required words before time runs out.'], target: '.game-five-shell > div:nth-child(2)' },
      { title: 'Mechanics', items: ['Use the clue and blanks to determine the word.', 'Correct letters reveal matching positions.', 'Wrong letters damage the robot.'], target: '.game-five-answer-panel' },
      { title: 'Lives', items: ['Lives and Power show remaining health.', 'Incorrect letters remove one life.', 'Losing all lives ends the attempt.'], target: '.game-five-lives-status' },
      { title: 'Controls', items: ['Click an on-screen letter or use the keyboard.', 'A selected letter cannot be used again.', 'Hint reveals additional help.'], target: '.game-five-keyboard' },
      { title: 'Score System', items: ['Solved words add points.', 'Remaining time can add a bonus.', 'Mistakes reduce the submitted result.'], target: '.game-five-score-status' },
      { title: 'How to Finish', items: ['Solve the required number of words shown in the mission panel.', 'Finish before time or lives run out.', 'Completing every required word passes the level.'], target: '.game-five-mission-panel' },
    ],
  },
  GAME_SIX: {
    kicker: 'Game 6',
    root: '.game-six-shell',
    steps: [
      { title: 'Welcome to Syntax Rain Typing', body: 'Type correctly spelled Java terms before they reach the bottom.', items: ['Read the complete falling Java term.', 'Type that same word accurately.', 'Build consecutive correct answers to increase your combo multiplier.'], target: '.game-six-playfield' },
      { title: 'Mechanics', items: ['Terms fall through the playfield.', 'Type a term exactly to clear it.', 'Falling speed increases as the level progresses.'], target: '.game-six-instruction' },
      { title: 'Lives', items: ['Wrong submissions remove health.', 'Missed terms also remove health.', 'Reaching 0 health ends the attempt.'], target: '.game-six-health-status' },
      { title: 'Controls', items: ['Type in the answer field.', 'Press Enter or select the Enter button.', 'Only exact visible terms are accepted.'], target: '.game-six-answer-form' },
      { title: 'Score System', items: ['Cleared terms award points.', 'Each correct answer gives exactly 100 points.', 'Reward streaks award coins.'], target: '.game-six-score-status' },
      { title: 'How to Finish', items: ['Clear the required number of terms shown in the goal panel.', 'Finish before time or health runs out.', 'Completing every required term passes the level.'], target: '.game-six-goal-status' },
    ],
  },
};

const isVisible = (element) => {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
};

const GameTutorialOverlay = ({
  gameType,
  levelNumber = 1,
  isAutomaticFirstPlay = false,
  tutorialCapabilities = {},
  onExit,
  onStart,
}) => {
  const config = GAME_TUTORIALS[gameType] || GAME_TUTORIALS.GAME_ONE;
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlights, setSpotlights] = useState([]);
  const allowProjectile = tutorialCapabilities.allowProjectile !== false;
  const allowMidairDash = tutorialCapabilities.allowMidairDash !== false;
  const steps = useMemo(() => {
    if (gameType !== 'GAME_ONE') return config.steps;
    return config.steps.map((item, index) => {
      if (index === 2 && !allowProjectile) {
        return { ...item, items: item.items.filter((text) => !text.includes('Arc Bolt')) };
      }
      if (index === 3 && !allowMidairDash) {
        return {
          ...item,
          items: item.items.map((text) => (
            text.includes('Shift') ? 'Use safe platforms and controlled jumps to avoid taking damage.' : text
          )),
        };
      }
      return item;
    });
  }, [allowMidairDash, allowProjectile, config.steps, gameType]);
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    const position = () => {
      if (step.noSpotlight) {
        setSpotlights([]);
        return;
      }

      const roots = Array.from(document.querySelectorAll(config.root)).filter(isVisible);
      const root = roots.sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return (br.width * br.height) - (ar.width * ar.height);
      })[0] || document;
      const selectors = step.targets || (step.target ? [step.target] : []);
      const elements = selectors
        .flatMap((selector) => [
          ...(root.matches?.(selector) ? [root] : []),
          ...Array.from(root.querySelectorAll(selector)),
        ])
        .filter(isVisible);

      if (elements.length > 0) {
        const rects = elements.map((element) => element.getBoundingClientRect());
        const keepTargetsSeparate = (
          gameType === 'GAME_TWO'
          || (gameType === 'GAME_FOUR' && step.title === 'Lives')
        );
        const spotlightRects = keepTargetsSeparate
          ? rects.slice(0, 2)
          : [{
            left: Math.min(...rects.map((rect) => rect.left)),
            top: Math.min(...rects.map((rect) => rect.top)),
            right: Math.max(...rects.map((rect) => rect.right)),
            bottom: Math.max(...rects.map((rect) => rect.bottom)),
          }];

        setSpotlights(spotlightRects.map((rect) => {
          const isGameTwoScore = gameType === 'GAME_TWO' && step.title === 'Watch Lives and Score';
          const isGameFourMechanics = gameType === 'GAME_FOUR' && step.title === 'Mechanics';
          const pad = isGameTwoScore ? 7 : (gameType === 'GAME_TWO' ? 4 : 7);
          const padTop = isGameFourMechanics ? 28 : pad;
          const left = Math.max(10, rect.left - pad);
          const top = Math.max(10, rect.top - padTop);
          const right = Math.min(window.innerWidth - 10, rect.right + pad);
          const bottom = Math.min(window.innerHeight - 10, rect.bottom + pad);
          return { left, top, width: right - left, height: bottom - top };
        }));
        return;
      }

      const fallbackTarget = root.querySelector('canvas') || root;
      if (!isVisible(fallbackTarget)) {
        setSpotlights([]);
        return;
      }
      const rect = fallbackTarget.getBoundingClientRect();
      const fallback = gameType === 'GAME_ONE'
        && step.title === 'Combat and Hazards'
        && !isAutomaticFirstPlay
        ? [0.052, 0.78, 0.068, 0.16]
        : step.fallback;
      const [x, y, width, height] = fallback || [0.05, 0.08, 0.72, 0.72];
      setSpotlights([{
        left: rect.left + rect.width * x,
        top: rect.top + rect.height * y,
        width: rect.width * width,
        height: rect.height * height,
      }]);
    };

    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [config.root, gameType, isAutomaticFirstPlay, step]);

  const panelOnLeft = useMemo(() => (
    (gameType === 'GAME_ONE' && stepIndex === 5)
    || (gameType === 'GAME_THREE' && stepIndex >= 2)
    || (gameType === 'GAME_FOUR' && stepIndex >= 3 && stepIndex < 6)
    || (gameType === 'GAME_FIVE' && [1, 3].includes(stepIndex))
  ), [gameType, stepIndex]);

  const overlay = (
    <div className={`game-guide-backdrop game-guide-tour game-guide-tour-step-${stepIndex % 4} ${
      gameType === 'GAME_TWO' ? 'game-guide-tour-game-two ' : ''
    }${gameType === 'GAME_ONE' ? 'game-guide-tour-game-one ' : ''
    }${panelOnLeft ? 'game-guide-tour-panel-left' : ''}`}>
      {spotlights.map((style, index) => (
        <div
          key={`${stepIndex}-${index}`}
          className={`game-guide-spotlight ${index > 0 ? 'game-guide-spotlight-secondary' : ''}`}
          style={{
            display: 'block',
            left: `${Math.round(style.left)}px`,
            top: `${Math.round(style.top)}px`,
            width: `${Math.round(style.width)}px`,
            height: `${Math.round(style.height)}px`,
          }}
          aria-hidden="true"
        />
      ))}
      {gameType === 'GAME_ONE' ? (
        <GameOneTutorialDemonstration
          stepIndex={stepIndex}
          target={spotlights[0]}
          allowProjectile={allowProjectile}
          allowMidairDash={allowMidairDash}
        />
      ) : (
        <TutorialHandPointer
          target={spotlights[0]}
          secondaryTarget={spotlights[1]}
          action={inferTutorialHandAction(step, gameType)}
        />
      )}
      <section className="game-guide-card" role="dialog" aria-modal="true" aria-label={step.title}>
        <div className="game-guide-tour-meta">
          <span>{config.kicker} · Level {levelNumber}</span>
          <span>{stepIndex + 1} of {steps.length}</span>
        </div>
        <h3>{step.title}</h3>
        {gameType === 'GAME_ONE' ? (
          <p className="game-guide-game-one-action">{step.body || step.items[0]}</p>
        ) : (
          <>
            {step.body ? <p className="game-guide-lead">{step.body}</p> : null}
            <ul className="game-guide-summary">
              {step.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </>
        )}
        {step.examples ? (
          <div className="game-guide-game-two-examples" aria-label="Hazard examples">
            {step.examples.map((example) => (
              <div className={`game-guide-game-two-example game-guide-game-two-example-${example.type}`} key={example.type}>
                {example.type === 'bomb' ? (
                  <span className="game-guide-game-two-bomb" aria-hidden="true"><i /></span>
                ) : (
                  <span className="game-guide-game-two-decoy" aria-hidden="true">{example.value}</span>
                )}
                <span><strong>{example.label}</strong><small>{example.type === 'bomb' ? example.value : 'Wrong syntax'}</small></span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="game-guide-tour-dots" aria-hidden="true">
          {steps.map((item, index) => (
            <span key={item.title} className={index === stepIndex ? 'is-active' : ''} />
          ))}
        </div>
        <div className="game-guide-actions">
          <button type="button" className="game-guide-skip" onClick={onStart}>Skip</button>
          <div>
            {stepIndex > 0 ? (
              <button type="button" className="btn btn-secondary" onClick={() => setStepIndex((value) => value - 1)}>
                Back
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => (isLastStep ? onStart?.() : setStepIndex((value) => value + 1))}
            >
              {isLastStep ? 'Start Game' : 'Next'}
            </button>
          </div>
        </div>
        {onExit ? (
          <button type="button" className="game-guide-tour-exit" onClick={onExit}>Exit Level</button>
        ) : null}
      </section>
    </div>
  );

  return typeof document === 'undefined' ? overlay : createPortal(overlay, document.body);
};

export default GameTutorialOverlay;
