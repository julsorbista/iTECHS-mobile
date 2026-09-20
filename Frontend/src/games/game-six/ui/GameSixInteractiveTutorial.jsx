import React, { useMemo, useState } from 'react';
import InGameTutorial from '../../shared/ui/InGameTutorial';

export function buildGameSixPractice(level, activeTerms = []) {
  const visible = (term) => String(term?.display || term?.scrambled || '').trim();
  const simple = activeTerms.find((term) => /^[a-z]+$/i.test(visible(term)));
  if (level === 2) return { answers: ['print'], displays: ['pr_nt'], rule: 'Fill in the missing letter: type the FULL term, print. This is a practice example.' };
  if (level === 3) return { answers: ['int'], displays: ['int'], distractor: 'class', rule: 'Practice target: Data Types. Type int. Ignore class. The target category can change in real play.' };
  if (level === 4) return { answers: ['int'], displays: ['int'], distractor: 'textVar', rule: 'Type real Java syntax: int. Ignore the fake syntax textVar.' };
  if (level === 5) {
    const first = activeTerms.find((term) => term.required !== false && term.pairId && /^[a-z]+$/i.test(visible(term)));
    const pair = first && activeTerms.filter((term) => term.required !== false && term.pairId === first.pairId && /^[a-z]+$/i.test(visible(term)));
    const answers = pair?.length === 2 ? pair.map(visible) : ['int', 'double'];
    return { answers, displays: answers, rule: 'Find two related Java terms. Submit one, then the other; either order works. A round completes only after both are cleared.' };
  }
  const word = simple ? visible(simple) : 'int';
  return { answers: [word], displays: [word], rule: 'Read the complete Java term. Type its spelling before it reaches the bottom in real play.' };
}


export default function GameSixInteractiveTutorial({ rootRef, onDemo, activeTerms, settings, levelNumber = 1, isFirstPlay, onStart }) {
  const [sample] = useState(() => buildGameSixPractice(levelNumber, activeTerms));
  const steps = useMemo(() => {
    const baseDrops = sample.displays.map((scrambled, i) => ({ id: 'tutorial-' + i, scrambled, x: 30 + i * 30, y: 25 }));
    if (sample.distractor) baseDrops.push({ id: 'tutorial-distractor', scrambled: sample.distractor, x: 65, y: 48 });
    const model = (typed = '', cleared = 0, message = '', type = '') => ({ typed, drops: baseDrops.filter((_, i) => i >= cleared), message, type });
    const answer = sample.answers[0];
    const wrongCase = answer === answer.toUpperCase() ? answer.toLowerCase() : answer.toUpperCase();
    return [
      { title: 'Read the falling term', text: sample.rule, tip: 'Demo examples use the same playfield. No real terms are submitted.', target: '[data-demo-term="0"]', frame: () => ({ display: model() }) },
      { title: 'Type, then press Enter', text: 'Match the spelling AND capitalization, then press Enter. Watch the answer appear in the real input.', duration: sample.answers.length * 3200,
        frame: (t) => { const index = Math.min(sample.answers.length - 1, Math.floor(t / 3200)), phase = t - index * 3200, word = sample.answers[index], cleared = index + (phase >= 2700 ? 1 : 0);
          return { target: phase < 2100 ? '.game-six-answer-input' : '.game-six-enter-button', keys: phase >= 2100 ? ['Enter'] : undefined, pressed: phase >= 2300 && phase < 2650, display: model(phase >= 2700 ? '' : word.slice(0, Math.max(0, Math.floor((phase - 300) / (1500 / word.length)))), cleared, phase >= 2700 ? 'Demo clear - real score unchanged' : '', 'correct') }; } },
      { title: 'Capitalization matters', text: '"' + wrongCase + '" does not match "' + answer + '". A wrong answer costs health in real play. This demo does not.', duration: 2800,
        frame: (t) => ({ target: t < 1600 ? '.game-six-answer-input' : '.game-six-health-status', gesture: t < 1600 ? 'press' : 'warning', pressed: t >= 1200 && t < 1550, display: model(t >= 700 ? wrongCase : '', 0, t >= 1600 ? 'Wrong case example - no health lost' : '', 'incorrect') }) },
      { title: 'Protect health and time', text: 'Start with ' + settings.lives + ' health and ' + Math.floor(settings.seconds / 60) + ':' + String(settings.seconds % 60).padStart(2, '0') + '. Wrong answers and missed required terms cost health. Ignore distractors when instructed.', duration: 3200,
        frame: (t) => ({ target: t < 1600 ? '.game-six-health-status' : '.game-six-timer-status', gesture: 'warning', display: model() }) },
      { title: 'Build a reward streak', text: 'Correct clears earn points and combo multipliers. Every ' + settings.rewardEvery + ' consecutive ' + (levelNumber === 5 ? 'completed pairs' : 'correct terms') + ' awards coins and restores one missing health.', target: '.game-six-score-status', frame: () => ({ display: model() }) },
      { title: 'Ready for Syntax Rain?', text: 'Complete ' + settings.targetWords + ' ' + (levelNumber === 5 ? 'pairs' : 'required terms') + ' before health or time runs out. You can replay Game Tutorial anytime.', target: '.game-six-answer-input', frame: () => ({ display: model() }) },
    ];
  }, [sample, settings.lives, settings.seconds, settings.rewardEvery, settings.targetWords, levelNumber]);
  return <InGameTutorial rootRef={rootRef} game={6} steps={steps} onDemo={onDemo} onStart={onStart} anchor=".game-six-sidebar" avoid=".game-six-header, .game-six-instruction" finishLabel={isFirstPlay ? 'Continue to countdown' : 'Return to game'} />;
}
