import { describe, expect, it } from 'vitest';
import { buildSubmissionPayload, calculateCodingStars } from './progressBridge';

describe('calculateCodingStars', () => {
  it('awards three stars for full completion with low mistakes', () => {
    expect(calculateCodingStars(5, 5, 1)).toBe(3);
  });

  it('keeps three stars for a perfect run with up to three mistakes', () => {
    expect(calculateCodingStars(5, 5, 3)).toBe(3);
  });

  it('awards two stars at the 80 percent passing threshold', () => {
    expect(calculateCodingStars(4, 5, 4)).toBe(2);
    expect(calculateCodingStars(3, 5, 5)).toBe(1);
  });

  it('accepts an 80 percent task-success outcome', () => {
    expect(buildSubmissionPayload({
      outcome: 'COMPLETED',
      points: 700,
      mistakes: 4,
      completedTasks: 4,
      totalTasks: 5,
    })).toMatchObject({
      outcome: 'COMPLETED',
      completedTasks: 4,
      totalTasks: 5,
      starsEarned: 2,
    });
  });
});

describe('buildSubmissionPayload', () => {
  it('builds a completed coding-game submission', () => {
    expect(buildSubmissionPayload({
      outcome: 'COMPLETED',
      points: 900,
      mistakes: 1,
      hintsUsed: 2,
      completedTasks: 5,
      totalTasks: 5,
      timeRemaining: 30,
    })).toMatchObject({
      outcome: 'COMPLETED',
      mistakes: 1,
      hintsUsed: 2,
      completedTasks: 5,
      totalTasks: 5,
      starsEarned: 3,
    });
  });
});
