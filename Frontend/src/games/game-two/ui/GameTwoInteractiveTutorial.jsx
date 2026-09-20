import React, { useMemo, useState } from 'react';
import InGameTutorial from '../../shared/ui/InGameTutorial';
import tutorialPanel from './tutorial4.png';
import { drawSyntaxCard, drawBomb } from './sliceDrawing';

const clamp = (n) => Math.max(0, Math.min(1, n));
export function gameTwoDemoRect(root) {
  const r = root.querySelector('canvas')?.getBoundingClientRect();
  if (!r) return null;
  const width = Math.min(220, r.width * .32), height = 96;
  const left = r.left + r.width * .55 - width / 2, top = r.top + r.height * .57 - height / 2;
  return { left, top, width, height, right: left + width, bottom: top + height };
}
// Reuse the real game's drawing functions, on the real canvas; no physics/input.
export function drawGameTwoDemo(ctx, model, width, height) {
  if (!model.item) return;
  const item = { text: model.item.text, x: width * .55, y: height * .57, width: Math.min(220, width * .32), height: 96, phase: 0, spin: 0 };
  if (model.item.kind === 'bomb') drawBomb(ctx, item);
  else drawSyntaxCard(ctx, item, model.item.kind === 'wrong' ? '#ff334f' : '#74ff8a');
  if (model.swipe != null) {
    ctx.save(); ctx.strokeStyle = '#fff0a5'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(item.x - item.width / 2, item.y); ctx.lineTo(item.x - item.width / 2 + item.width * model.swipe, item.y); ctx.stroke(); ctx.restore();
  }
}
export default function GameTwoInteractiveTutorial({ rootRef, onDemo, challenge, isFirstPlay, onStart }) {
  const [sample] = useState(() => ({ ...challenge, pieces: [...(challenge?.pieces || [])] }));
  const steps = useMemo(() => {
    const pieces = sample.pieces.length ? sample.pieces : ['System.out.println("Hello");'];
    const model = (item = null, sliced = '', swipe = null) => ({ item, sliced, swipe });
    return [
      { title: 'Build the Java code', text: 'Read Correct Code. Slice the green pieces in that order to build the matching Sliced Code.', target: '.game-two-fruit-code', frame: () => ({ display: model({ text: pieces[0] }) }) },
      { title: 'Swipe through the piece', text: 'Hold the mouse button and drag across the green code piece. On a touch screen, swipe with your finger.', duration: 3000,
        frame: (t) => { const swipe = clamp((t - 900) / 1100), done = t >= 2100; return { target: done ? '.game-two-fruit-code' : gameTwoDemoRect, gesture: 'swipe', swipe: done ? undefined : swipe, display: model(done ? null : { text: pieces[0] }, done ? pieces[0] : '', done ? null : swipe) }; } },
      { title: 'Avoid red code and bombs', text: 'Do not slice red decoys or bombs. They cost lives and break your combo in real play.', duration: 3600,
        frame: (t) => ({ target: gameTwoDemoRect, gesture: 'warning', display: model(t < 1800 ? { text: sample.decoys?.[0] || 'wrong code', kind: 'wrong' } : { kind: 'bomb' }) }) },
      { title: 'Follow the correct order', text: 'Watch each correct piece join the code. Only the next required piece should be sliced.', duration: pieces.length * 1800 + 300,
        frame: (t) => { const index = Math.min(pieces.length, Math.floor(t / 1800)), phase = t % 1800, swipe = clamp((phase - 400) / 950), cut = phase >= 1400;
          return { target: index >= pieces.length || cut ? '.game-two-fruit-code' : gameTwoDemoRect, gesture: 'swipe', swipe: cut ? undefined : swipe, display: model(index >= pieces.length || cut ? null : { text: pieces[index] }, pieces.slice(0, index + (cut ? 1 : 0)).join(' '), cut ? null : swipe) }; } },
      { title: 'Watch lives and combo', text: 'Correct slices build your combo. Avoid mistakes and keep slicing: a long idle period ends the real run.', target: '.game-two-fruit-lives', gesture: 'warning', frame: () => ({ display: model() }) },
      { title: 'Complete the outputs', text: 'Finish the code to produce its output. Complete this level’s output goal to win.', target: '.game-two-fruit-output', frame: () => ({ display: model(null, pieces.join(' ')) }) },
    ];
  }, [sample]);
  return <InGameTutorial rootRef={rootRef} game={2} panelImage={tutorialPanel} steps={steps} onDemo={onDemo} onStart={onStart} avoid=".game-two-fruit-actions, .game-two-fruit-score" finishLabel={isFirstPlay ? 'Continue' : 'Return to game'} />;
}
