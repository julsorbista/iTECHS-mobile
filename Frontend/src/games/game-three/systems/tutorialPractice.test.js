import { describe, expect, it } from 'vitest';
import { buildTutorialDeck, createPractice, getPracticeTarget, selectPracticeCard, resolvePractice } from './tutorialPractice';

const deck = Object.freeze(['a1', 'b1', 'a2', 'b2', 'c1', 'c2'].map((id) => Object.freeze({ cardId: id, pairId: id[0], label: id[0], spriteUrl: `${id[0]}.png` })));
const practiceDeck = buildTutorialDeck(deck);
const selectTarget = (state, mode = 'match') => selectPracticeCard(practiceDeck, state, mode, getPracticeTarget(practiceDeck, state, mode)?.cardId);

describe('Game 3 isolated matching practice', () => {
  it('uses only complete pairs from the current deck, preserving their artwork and order', () => {
    expect(practiceDeck.map((card) => card.cardId)).toEqual(['a1', 'b1', 'a2', 'b2']);
    expect(practiceDeck[0].spriteUrl).toBe(deck[0].spriteUrl);
    expect(practiceDeck[0]).not.toBe(deck[0]);
    expect(deck.map((card) => card.cardId)).toEqual(['a1', 'b1', 'a2', 'b2', 'c1', 'c2']);
  });
  it('does not invent a missing partner', () => expect(buildTutorialDeck([deck[0]])).toEqual([]));
  it('supports one-pair and empty levels', () => {
    expect(buildTutorialDeck([deck[0], deck[2]])).toHaveLength(2);
    expect(buildTutorialDeck()).toEqual([]);
    expect(getPracticeTarget([], createPractice(), 'match')).toBeNull();
  });
  it('first flip spends no practice attempt', () => {
    const state = selectTarget(createPractice());
    expect(state.selected).toEqual(['a1']);
    expect(state.attempts).toBe(0);
    expect(state.points).toBe(0);
  });
  it('hand guides the actual matching partner, not the next adjacent card', () => {
    expect(getPracticeTarget(practiceDeck, selectTarget(createPractice()), 'match').cardId).toBe('a2');
  });
  it('unrelated clicks give guidance with no penalty', () => {
    const state = selectPracticeCard(practiceDeck, createPractice(), 'match', 'b1');
    expect(state.selected).toEqual([]);
    expect(state.attempts).toBe(0);
    expect(state.feedback).toContain('no penalty');
  });
  it('ignores the same card and unknown cards', () => {
    const state = selectTarget(createPractice());
    expect(selectPracticeCard(practiceDeck, state, 'match', 'a1')).toBe(state);
    expect(selectPracticeCard(practiceDeck, state, 'match', 'unknown')).toBe(state);
  });
  it('locks further clicks while comparing and only uses one practice attempt', () => {
    const state = selectTarget(selectTarget(createPractice()));
    expect(state.phase).toBe('checking');
    expect(state.attempts).toBe(1);
    expect(state.points).toBe(0);
    expect(selectPracticeCard(practiceDeck, state, 'match', 'b1')).toBe(state);
    expect(getPracticeTarget(practiceDeck, state, 'match')).toBeNull();
  });
  it('keeps matching cards revealed and demonstrates the actual 100-point reward', () => {
    const state = resolvePractice(selectTarget(selectTarget(createPractice())), 'match');
    expect(state.selected).toEqual(['a1', 'a2']);
    expect(state.points).toBe(100);
    expect(state.phase).toBe('complete');
    expect(resolvePractice(state, 'match')).toBe(state);
  });
  it('guides a different concept for the mismatch demonstration', () => {
    const state = selectTarget(createPractice(), 'mismatch');
    expect(getPracticeTarget(practiceDeck, state, 'mismatch').cardId).toBe('b1');
  });
  it('turns mismatched cards back without awarding points', () => {
    const state = resolvePractice(selectTarget(selectTarget(createPractice(), 'mismatch'), 'mismatch'), 'mismatch');
    expect(state.selected).toEqual([]);
    expect(state.points).toBe(0);
    expect(state.attempts).toBe(1);
    expect(state.phase).toBe('complete');
  });
  it('does not accept card actions on informational steps', () => {
    for (const mode of ['welcome', 'attempts', 'rewards', 'ready']) {
      const state = createPractice();
      expect(selectPracticeCard(practiceDeck, state, mode, 'a1')).toBe(state);
    }
  });
  it('restart makes fresh, independent state', () => {
    const initial = createPractice();
    const played = selectTarget(initial);
    expect(initial.selected).toEqual([]);
    expect(played.selected).not.toBe(initial.selected);
    expect(createPractice()).toEqual(initial);
    expect(resolvePractice(initial, 'match')).toBe(initial);
  });
});
