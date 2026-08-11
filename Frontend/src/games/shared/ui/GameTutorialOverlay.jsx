import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const GAME_TUTORIALS = {
  GAME_ONE: {
    kicker: 'Game 1',
    root: '.game-one-frame-shell',
    steps: [
      { title: 'How to Play the 2D Action Game', body: 'Complete the level objectives and reach the ending portal.', items: ['Move through the platform level and avoid hazards.', 'Collect required coins and clear Question Statues.', 'Enter the ending portal after the objectives are complete.'], target: '.game-one-frame-shell > div:first-child' },
      { title: 'Lives', items: ['The hearts show your current health.', 'Taking damage removes health.', 'Reaching 0 hearts ends the attempt.'], fallback: [0.015, 0.025, 0.06, 0.055] },
      { title: 'Question Rules', items: ['Touch an unanswered Question Statue to open its challenge.', 'A correct answer clears the challenge.', 'A wrong answer adds a mistake and restarts the room.'], fallback: [0.54, 0.66, 0.085, 0.27] },
      { title: 'Room Failure', items: ['Wrong answers restart the current room; there is no fixed three-question room limit in the game code.', "Each wrong answer increases the run's mistake count and activates the danger surge.", 'The attempt ends when health reaches 0 or another level-failure condition is triggered.'], fallback: [0.015, 0.025, 0.06, 0.055] },
      { title: 'Score & Rewards', items: ['Completion, coins, cleared questions, enemy hits, and accuracy contribute to the score.', 'Avoiding wrong answers provides a precision bonus.', 'Your final result records the score and earned Stars.'], fallback: [0.015, 0.08, 0.06, 0.06] },
      { title: 'Condition', items: ['Complete the required objectives.', 'Unlock the ending portal.', 'Reach the portal to complete the level.'], fallback: [0.91, 0.78, 0.08, 0.17] },
    ],
  },
  GAME_TWO: {
    kicker: 'Game 2',
    root: '.game-two-shell',
    steps: [
      { title: 'Welcome to Java Code Lab', body: 'Repair each Java program by placing the correct code snippets.', items: ['Read the task prompt and incomplete code.', 'Drag snippets into the required blanks.', 'Compile each task to continue.'], target: '.game-two-code-lab-terminal' },
      { title: 'Mechanics', items: ['Code Structure contains the incomplete Java answer.', 'Drag one snippet into each blank.', 'Ordered tasks require every slot in the correct order.'], targets: ['.game-two-guide-code-target', '.game-two-guide-snippets-target'] },
      { title: 'Compile Answers', items: ['Fill every required code slot.', 'Select Compile Answer to check the task.', 'Correct tasks remain marked as completed.'], targets: ['.game-two-code-drop-slot', '.game-two-guide-compile-target'] },
      { title: 'Hints & Coins', items: ['Hint reveals additional help for the active task.', 'Hints may spend coins.', 'Correct tasks can award coins.'], targets: ['.game-two-guide-hint-target', '.game-two-guide-coins-target'] },
      { title: 'Progress & Score', items: ['Solved and Correct track completed tasks.', 'Wrong compilations add mistakes.', 'Task points contribute to the level score.'], target: '.game-two-guide-progress-target' },
      { title: 'Condition', items: ['Finish every task in the list.', 'Completed tasks remain marked.', 'Completing all tasks finishes the level.'], target: '.game-two-guide-tasks-target' },
    ],
  },
  GAME_THREE: {
    kicker: 'Game 3',
    root: '.game-three-shell',
    steps: [
      { title: 'Welcome to Memory Card Game', body: 'Match Java concept cards and answer the question for each pair.', items: ['Flip two cards at a time.', 'Matching cards open a question.', 'Resolve every pair to finish the board.'], target: '.game-three-board' },
      { title: 'Mechanics', items: ['Select two face-down cards to compare them.', 'A matching pair stays revealed.', 'A mismatch flips back after the preview.'], targets: ['.game-three-board .game-three-card:nth-child(1)', '.game-three-board .game-three-card:nth-child(2)'] },
      { title: 'Question Rules', items: ['Each matched pair opens one question.', 'Arrange the answer tiles, then submit.', 'Correct answers add a point and coin.'], target: '.game-three-board-footer' },
      { title: 'Attempts', items: ['Each two-card selection spends one flip attempt.', 'The counter shows the remaining attempts.', 'Resolve all pairs before attempts run out.'], targets: ['.game-three-side-metrics .game-three-metric:nth-child(4)', '.game-three-side-metrics .game-three-metric:nth-child(5)'] },
      { title: 'Hints & Coins', items: ['Correct answers award coins.', 'Hints spend the configured coin cost.', 'Hints do not directly subtract points.'], target: '.game-three-side-metrics .game-three-metric:nth-child(3)' },
      { title: 'Score System', items: ['Correct questions increase the displayed score.', 'Wrong questions add no point.', 'The result is calculated after all pairs are resolved.'], targets: ['.game-three-side-metrics .game-three-metric:nth-child(1)', '.game-three-side-metrics .game-three-metric:nth-child(2)'] },
      { title: 'Condition', items: ['Match every pair and resolve its question.', 'Finish before flip attempts run out.', 'A passing result unlocks the next level.'], target: '.game-three-side-card:last-child' },
    ],
  },
  GAME_FOUR: {
    kicker: 'Game 4',
    root: '.game-four-stage',
    steps: [
      { title: 'How to Play Game 4', body: 'Catch the required Java pieces, then arrange them in the correct syntax order.', items: ['Move the catcher beneath falling code.', 'Avoid bombs and do not miss required pieces.', 'Arrange the collected pieces to complete each round.'], target: '.game-four-play-card' },
      { title: 'Mechanics', items: ['Catch every required code piece.', 'Missing a required piece ends a normal attempt.', 'The game switches to Arrange Phase after collection.'], target: '.game-four-catcher-target' },
      { title: 'Controls', items: ['Press and hold the left on-screen circle to move left.', 'Press and hold the right on-screen circle to move right.', 'Move the basket under a falling object to catch it automatically.'], target: '.game-four-mobile-controls' },
      { title: 'Lives', items: ['Bombs remove one life.', 'Three fruits restore one missing life.', 'Reaching 0 lives ends the attempt.'], targets: ['.game-four-lives-status', '.game-four-fruit-status'] },
      { title: 'Hints & Coins', items: ['Falling coins add hint currency.', 'Reveal Hint spends the configured cost.', 'Hints help with the current Java objective.'], target: '.game-four-coins-status' },
      { title: 'Score System', items: ['Correct statements award points.', 'Fruit adds bonus points.', 'Complete every round for the final score.'], targets: ['.game-four-level-status', '.game-four-round-status'] },
      { title: 'Condition', items: ['Complete the catch and arrange phases.', 'Finish every round in the level.', 'A passing result unlocks the next level.'], target: '.game-four-objective-card' },
    ],
  },
  GAME_FIVE: {
    kicker: 'Game 5',
    root: '.game-five-shell',
    steps: [
      { title: 'Welcome to Code Snowman', body: 'Guess each programming word before the snowman melts.', items: ['Read the clue and answer length.', 'Choose letters using the keyboard.', 'Solve all required words before time runs out.'], target: '.game-five-shell > div:nth-child(2)' },
      { title: 'Mechanics', items: ['Use the clue and blanks to determine the word.', 'Correct letters reveal matching positions.', 'Wrong letters melt the snowman.'], target: '.game-five-answer-panel' },
      { title: 'Lives', items: ['Lives and Snow Left show remaining health.', 'Incorrect letters remove one life.', 'Losing all lives ends the attempt.'], target: '.game-five-lives-status' },
      { title: 'Controls', items: ['Click an on-screen letter or use the keyboard.', 'A selected letter cannot be used again.', 'Hint reveals additional help.'], target: '.game-five-keyboard' },
      { title: 'Score System', items: ['Solved words add points.', 'Remaining time can add a bonus.', 'Mistakes reduce the submitted result.'], target: '.game-five-score-status' },
      { title: 'Condition', items: ['Solve the required number of words.', 'Finish before time or lives run out.', 'A passing result unlocks the next level.'], target: '.game-five-mission-panel' },
    ],
  },
  GAME_SIX: {
    kicker: 'Game 6',
    root: '.game-six-shell',
    steps: [
      { title: 'Welcome to Syntax Rain Typing', body: 'Type the falling programming terms before they reach the bottom.', items: ['Read a visible falling term.', 'Type the exact word.', 'Press Enter before it lands.'], target: '.game-six-playfield' },
      { title: 'Mechanics', items: ['Terms fall through the playfield.', 'Type a term exactly to clear it.', 'Falling speed increases as the level progresses.'], target: '.game-six-instruction' },
      { title: 'Lives', items: ['Wrong submissions remove health.', 'Missed terms also remove health.', 'Reaching 0 health ends the attempt.'], target: '.game-six-health-status' },
      { title: 'Controls', items: ['Type in the answer field.', 'Press Enter or select the Enter button.', 'Only exact visible terms are accepted.'], target: '.game-six-answer-form' },
      { title: 'Score System', items: ['Cleared terms award points.', 'Speed and position can add bonuses.', 'Reward streaks award coins.'], target: '.game-six-score-status' },
      { title: 'Condition', items: ['Clear the required number of terms.', 'Finish before time or health runs out.', 'A passing result unlocks the next level.'], target: '.game-six-goal-status' },
    ],
  },
};

const isVisible = (element) => {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
};

const GameTutorialOverlay = ({ gameType, levelNumber = 1, onExit, onStart }) => {
  const config = GAME_TUTORIALS[gameType] || GAME_TUTORIALS.GAME_ONE;
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlights, setSpotlights] = useState([]);
  const cardRef = useRef(null);
  const [mobilePanelPosition, setMobilePanelPosition] = useState(null);
  const step = config.steps[stepIndex];
  const isLastStep = stepIndex === config.steps.length - 1;

  useEffect(() => {
    const shouldRevealMobileTarget = (
      (gameType === 'GAME_TWO' && stepIndex >= 4)
      || ['GAME_THREE', 'GAME_FOUR', 'GAME_FIVE', 'GAME_SIX'].includes(gameType)
    );
    const targetSelector = step.target || step.targets?.[0];
    if (!shouldRevealMobileTarget || !targetSelector || window.innerWidth > 720) return;
    const target = document.querySelector(`${config.root} ${targetSelector}`);
    target?.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
  }, [config.root, gameType, step.target, step.targets, stepIndex]);

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
        .flatMap((selector) => Array.from(root.querySelectorAll(selector)))
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
          const pad = gameType === 'GAME_TWO' ? 4 : 7;
          const left = Math.max(10, rect.left - pad);
          const top = Math.max(10, rect.top - pad);
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
      const [x, y, width, height] = step.fallback || [0.05, 0.08, 0.72, 0.72];
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
  }, [config.root, gameType, step]);

  const panelOnLeft = useMemo(() => (
    (gameType === 'GAME_THREE' && stepIndex >= 3)
    || (gameType === 'GAME_TWO' && stepIndex >= 3)
    || (gameType === 'GAME_FOUR' && stepIndex >= 3)
    || (gameType === 'GAME_FIVE' && [1, 3].includes(stepIndex))
  ), [gameType, stepIndex]);

  useLayoutEffect(() => {
    const positionPanel = () => {
      const useCompactLandscapePanel = gameType === 'GAME_FOUR' && window.innerHeight <= 600;
      if ((window.innerWidth > 720 && !useCompactLandscapePanel) || !cardRef.current) {
        setMobilePanelPosition(null);
        return;
      }
      const visualViewport = window.visualViewport;
      const viewportWidth = visualViewport?.width || window.innerWidth;
      const viewportTop = visualViewport?.offsetTop || 0;
      const viewportHeight = visualViewport?.height || window.innerHeight;
      const viewportBottom = viewportTop + viewportHeight;
      const width = Math.min(320, viewportWidth - 32);
      const measuredHeight = cardRef.current.getBoundingClientRect().height || cardRef.current.scrollHeight;
      const cardHeight = Math.min(measuredHeight, viewportHeight * 0.48, 390);
      const margin = 12;
      const left = Math.round((viewportWidth - width) / 2);
      let top = viewportBottom - cardHeight - margin;
      const visibleSpotlights = spotlights.filter((item) => (
        item.top + item.height > viewportTop + margin
        && item.top < viewportBottom - margin
      ));
      if (visibleSpotlights.length) {
        const targetTop = Math.max(viewportTop, Math.min(...visibleSpotlights.map((item) => item.top)));
        const targetBottom = Math.min(viewportBottom, Math.max(...visibleSpotlights.map((item) => item.top + item.height)));
        const below = targetBottom + margin;
        const above = targetTop - cardHeight - margin;
        if (below + cardHeight <= viewportBottom - margin) top = below;
        else if (above >= viewportTop + margin) top = above;
        else {
          const roomAbove = targetTop - viewportTop;
          const roomBelow = viewportBottom - targetBottom;
          top = roomAbove >= roomBelow ? above : below;
        }
      }
      top = Math.max(viewportTop + margin, Math.min(top, viewportBottom - cardHeight - margin));
      setMobilePanelPosition({ left, top, width });
    };
    const frame = window.requestAnimationFrame(positionPanel);
    window.addEventListener('resize', positionPanel);
    window.visualViewport?.addEventListener('resize', positionPanel);
    window.visualViewport?.addEventListener('scroll', positionPanel);
    const observer = new ResizeObserver(positionPanel);
    observer.observe(cardRef.current);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', positionPanel);
      window.visualViewport?.removeEventListener('resize', positionPanel);
      window.visualViewport?.removeEventListener('scroll', positionPanel);
      observer.disconnect();
    };
  }, [gameType, spotlights, stepIndex]);

  const overlay = (
    <div
      className={`game-guide-backdrop game-guide-tour game-guide-tour-step-${stepIndex % 4} game-guide-tour-page-${stepIndex + 1} ${
      gameType === 'GAME_TWO' ? 'game-guide-tour-game-two ' : gameType === 'GAME_FOUR' ? 'game-guide-tour-game-four ' : ''
    }${step.noSpotlight ? 'game-guide-tour-no-spotlight ' : ''}${panelOnLeft ? 'game-guide-tour-panel-left' : ''}`}
      style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
    >
      {spotlights.map((style, index) => (
        <div
          key={`${stepIndex}-${index}`}
          className={`game-guide-spotlight ${stepIndex === 0 ? 'game-guide-spotlight-borderless' : ''} ${index > 0 ? 'game-guide-spotlight-secondary' : ''}`}
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
      <section
        ref={cardRef}
        className="game-guide-card"
        role="dialog"
        aria-modal="true"
        aria-label={step.title}
        style={mobilePanelPosition ? {
          '--game-tour-mobile-left': `${mobilePanelPosition.left}px`,
          '--game-tour-mobile-top': `${mobilePanelPosition.top}px`,
          '--game-tour-mobile-width': `${mobilePanelPosition.width}px`,
        } : undefined}
      >
        <div className="game-guide-tour-meta">
          <span>{config.kicker} · Level {levelNumber}</span>
          <span>{stepIndex + 1} of {config.steps.length}</span>
        </div>
        <h3>{step.title}</h3>
        {step.body ? <p className="game-guide-lead">{step.body}</p> : null}
        <ul className="game-guide-summary">
          {step.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <div className="game-guide-tour-dots" aria-hidden="true">
          {config.steps.map((item, index) => (
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
