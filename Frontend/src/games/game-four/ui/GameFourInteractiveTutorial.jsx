import React, { useMemo, useState } from 'react';
import InGameTutorial from '../../shared/ui/InGameTutorial';

const clamp = (t) => Math.min(1, Math.max(0, t));
export default function GameFourInteractiveTutorial({ rootRef, onDemo, tokens, hintCost = 1, maxLives = 3, levelNumber = 1, isFirstPlay, onStart }) {
  const [pieces] = useState(() => [...tokens]);
  const steps = useMemo(() => {
    const display = (player = .5, item = null, assembled = null) => ({ player, item, mode: assembled ? 'assemble' : 'catch', assembled, remaining: assembled ? pieces.slice(assembled.length) : [] });
    return [
      { title: 'Move the robot', text: 'Hold ← Left or → Right to move the robot and basket. Watch the controls below.', duration: 3600,
        frame: (t) => ({ target: '.game-four-catcher', handOnKeys: true, keys: [t < 1900 ? '← Left' : '→ Right'], pressed: t >= 800 && t < 1500 || t >= 2100 && t < 2800, display: display(t < 1900 ? .5 - .25 * clamp((t - 800) / 700) : .25 + .5 * clamp((t - 2100) / 700)) }) },
      { title: 'Catch the required code', text: 'Move the basket under the code. Collect every required piece to unlock Arrange Phase.', duration: 3300,
        frame: (t) => ({ target: t < 2700 ? '[data-demo-falling]' : '.game-four-catcher', handOnKeys: true, keys: ['← Left'], pressed: t >= 700 && t < 1400, display: display(.5 - .25 * clamp((t - 700) / 700), t < 2700 ? { value: pieces[0] || '', kind: 'token', x: .25, y: .08 + .67 * clamp((t - 900) / 1800) } : null) }) },
      { title: 'Avoid bombs', text: 'Watch the robot move away. Bombs and missed required code cost a life in real play; this demo causes no damage.', duration: 3300,
        frame: (t) => ({ target: t < 2800 ? '[data-demo-falling]' : '.game-four-lives-status', gesture: 'warning', handOnKeys: true, keys: ['→ Right'], pressed: t >= 700 && t < 1400, display: display(.25 + .5 * clamp((t - 700) / 700), t < 2800 ? { value: 'bomb', kind: 'bomb', x: .25, y: .1 + .8 * clamp((t - 800) / 2000) } : null) }) },
      { title: 'Pickups & hints', text: `Three bonus pickups restore one missing life, up to ${maxLives}. Coins pay for hints: ${hintCost} coin(s) each.`, tip: 'These counters stay unchanged in the demo.', target: '.game-four-coins-status', frame: () => ({ display: display() }) },
      { title: 'Arrange, then check', text: 'Watch the collected pieces build the Java statement in order, then Check Answer.', tip: 'An incorrect full answer costs a life in real play. Drag pieces to reorder or click to return them.', duration: pieces.length * 700 + 2100,
        frame: (t) => { const count = Math.min(pieces.length, Math.max(0, Math.floor((t - 300) / 700))); return { target: count < pieces.length ? '.game-four-token-bank button' : '.game-four-check-answer-button', gesture: 'press', pressed: t > 300 && (t - 300) % 700 > 440, display: display(.5, null, pieces.slice(0, count)) }; } },
      { title: 'Complete every round', text: 'Catch required pieces, avoid hazards, and arrange the code correctly. Complete all rounds to finish.', tip: 'No score, coins, lives or progress were changed.', target: '.game-four-round-status', frame: () => ({ display: display() }) },
    ];
  }, [pieces, hintCost, maxLives]);
  return <InGameTutorial game={4} rootRef={rootRef} steps={steps} onDemo={onDemo} onStart={onStart} avoid=".game-four-catcher, .game-four-hud" finishLabel={isFirstPlay ? `Start Level ${levelNumber}` : 'Return to game'} />;
}
