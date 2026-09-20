import { describe, expect, it } from 'vitest';
import { applyPracticeSwipe, buildPracticeCards, crossesPracticeCard, getPracticeDecoy, makePractice } from './tutorialPractice';

const challenge = { targetCode: 'int score = 10;', pieces: ['int', 'score', '=', '10;'], decoys: ['int', 'intr', 'score'] };
const cut = (p, phase = 'slice', kind = 'correct') => applyPracticeSwipe(p, challenge, phase,
  [{ kind, text: challenge.pieces[p.pieceIndex], x: 100, y: 100, width: 80, height: 50 }], { x: 30, y: 100 }, { x: 150, y: 100 });

describe('isolated Game 2 practice', () => {
  it('uses the current challenge, never substitutes unrelated syntax', () => {
    expect(buildPracticeCards('slice', challenge, makePractice(), 400, 260)[0].text).toBe('int');
    expect(getPracticeDecoy(challenge)).toBe('intr');
    expect(getPracticeDecoy({ pieces: ['a'], targetCode: 'a', decoys: ['a'] })).toBeNull();
  });
  it('requires a real stroke that crosses a card, not a tap or a near miss', () => {
    const card = { x: 100, y: 100, width: 80, height: 50 };
    expect(crossesPracticeCard({ x: 0, y: 100 }, { x: 200, y: 100 }, card)).toBe(true);
    expect(crossesPracticeCard({ x: 0, y: 150 }, { x: 200, y: 150 }, card)).toBe(false);
    const p = makePractice();
    expect(applyPracticeSwipe(p, challenge, 'slice', [{ ...card, kind: 'correct', text: 'int' }], { x: 100, y: 100 }, { x: 101, y: 101 })).toBe(p);
  });
  it('advances one ordered practice piece without modifying the source', () => {
    const p = Object.freeze(makePractice());
    const next = cut(p);
    expect(next.pieceIndex).toBe(1);
    expect(p.pieceIndex).toBe(0);
    expect(Object.keys(next).sort()).toEqual(['feedback', 'hazardPassed', 'pieceIndex']);
    expect(buildPracticeCards('slice', challenge, next, 400, 260)[0].text).toBe('score');
  });
  it('rejects hazards without health, mistakes, score or progress fields', () => {
    const p = makePractice();
    const result = cut(p, 'hazards', 'bomb');
    expect(result.hazardPassed).toBe(false);
    expect(result.feedback).toContain('No life lost');
    expect(result.pieceIndex).toBe(0);
    expect(cut(p, 'hazards').hazardPassed).toBe(true);
  });
  it('rejects a stroke crossing a bomb and a correct card together', () => {
    const cards = [{ kind: 'correct', text: 'int', x: 60, y: 80, width: 50, height: 50 }, { kind: 'bomb', x: 140, y: 80, width: 50, height: 50 }];
    expect(applyPracticeSwipe(makePractice(), challenge, 'hazards', cards, { x: 0, y: 80 }, { x: 200, y: 80 }).hazardPassed).toBe(false);
  });
  it('does not create further targets once the statement is complete', () => {
    expect(buildPracticeCards('slice', challenge, { pieceIndex: 4 }, 400, 260)).toEqual([]);
    expect(buildPracticeCards('welcome', challenge, makePractice(), 400, 260)).toEqual([]);
  });
});
