import { describe, expect, it } from 'vitest';
import { isCodingAnswerCorrect, normalizeCodeAnswer } from './gameTwoValidation';

describe('normalizeCodeAnswer', () => {
  it('collapses whitespace for code comparisons', () => {
    expect(normalizeCodeAnswer('if   (score >= 10)   {')).toBe('if (score >= 10) {');
  });
});

describe('isCodingAnswerCorrect', () => {
  it('checks accepted typed answers', () => {
    expect(isCodingAnswerCorrect({
      type: 'typing',
      acceptedAnswers: ['add(2, 3)', 'add(2,3)'],
    }, 'add(2,3)')).toBe(true);
  });

  it('checks reorder answers', () => {
    expect(isCodingAnswerCorrect({
      type: 'reorder',
      correctOrder: ['a', 'b', 'c'],
    }, ['a', 'b', 'c'])).toBe(true);
  });
});
