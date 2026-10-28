import React, { useMemo, useState } from 'react';
import InGameTutorial from '../../shared/ui/InGameTutorial';
import './GameFiveInteractiveTutorial.css';

export default function GameFiveInteractiveTutorial({ rootRef, onPracticeChange, entry, targetWords = 5, levelNumber = 1, isFirstPlay, onStart }) {
  const [sample] = useState(() => ({ ...entry, word: String(entry.word).toUpperCase() }));
  const steps = useMemo(() => {
    const letters = [...new Set([...sample.word].filter((c) => /[A-Z]/.test(c)))];
    const first = letters[0], wrong = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find((c) => !letters.includes(c));
    const hintIndex = [...sample.word].findIndex((c) => c !== first);
    const display = (guessed = [], hint = null, wrongLetter = null) => ({ sample, guessed, hintIndex: hint, wrongLetter, canChoose: false, canHint: false, choose: () => {}, hint: () => {} });
    return [
      { title: 'Read the clue', text: 'Read the clue and count the blanks. Each blank is one letter.', target: '[data-g5-target="clue"]', frame: () => ({ display: display() }) },
      { title: 'Reveal a letter', text: 'Watch the hand press a letter. Every matching position is revealed.', duration: 2000,
        frame: (t) => ({ target: `[data-g5-target="letter-${first}"]`, gesture: 'press', pressed: t >= 800 && t < 1100, display: display(t >= 950 ? [first] : []) }) },
      { title: 'Protect your robot', text: 'A wrong letter costs one life in real play. This demonstration does not damage your robot.', duration: 2200,
        frame: (t) => ({ target: t < 1200 && wrong ? `[data-g5-target="letter-${wrong}"]` : '[data-g5-target="lives"]', gesture: t < 1200 ? 'press' : 'warning', pressed: t >= 800 && t < 1100, display: display([first], null, t >= 950 ? wrong : null) }) },
      { title: 'Hints reveal a position', text: 'Watch a hint reveal one hidden position. In real play, each hint costs 1 coin, with up to 3 hints per word.', target: '[data-g5-target="hint"]', duration: 2000,
        frame: (t) => ({ gesture: 'press', pressed: t >= 800 && t < 1100, display: display([first], t >= 950 ? hintIndex : null) }) },
      { title: 'Time, points & rewards', text: `Solve ${targetWords} words before time or lives run out. Solved words earn points and coins; remaining time adds bonus points.`, tip: 'Correct words build combo multipliers. The real clock stays paused in this tutorial.', target: '[data-g5-target="time"]', frame: () => ({ display: display([first], hintIndex) }) },
      { title: 'Complete the word', text: 'Watch the letters fill the word. No real reward is added. You are ready to play!', duration: Math.max(2200, letters.length * 700 + 1000),
        frame: (t) => { const count = Math.max(0, Math.floor((t - 300) / 700)); return { target: count >= letters.length ? '.game-five-answer-panel' : `[data-g5-target="letter-${letters[count]}"]`, gesture: 'press', pressed: t > 300 && (t - 300) % 700 > 480, display: display(letters.slice(0, count)) }; } },
    ].map((step) => ({ ...step, panelPlacement: 'bottom-left' }));
  }, [sample, targetWords]);
  return <InGameTutorial game={5} rootRef={rootRef} steps={steps} onDemo={onPracticeChange} onStart={onStart} anchor=".game-five-sidebar" avoid=".game-five-robot-room, .game-five-hud" panelWidth={700} panelMinHeight={440} finishLabel={isFirstPlay ? `Start Level ${levelNumber}` : 'Return to game'} />;
}
