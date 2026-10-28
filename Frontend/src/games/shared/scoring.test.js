import { describe, expect, it } from 'vitest';
import { buildSubmissionPayload as buildGameThree } from '../game-three/systems/progressBridge';
import { buildSubmissionPayload as buildGameFour, GAME_FOUR_ROUND_REWARDS } from '../game-four/systems/progressBridge';
import { buildProgrammingSubmissionPayload } from './programmingProgressBridge';

describe('corrected game score bridges', () => {
  it.each([[8, 8, 800, 3, 'COMPLETED'], [7, 8, 700, 2, 'COMPLETED'], [6, 8, 600, 2, 'COMPLETED'], [5, 8, 0, 1, 'FAILED']])(
    'Game 3 scores %i/%i matched pairs', (matchedPairs, totalPairs, score, stars, outcome) => {
      const result = buildGameThree({ matchedPairs, totalPairs });
      expect(result.baseScore).toBe(score);
      expect(result.starsEarned).toBe(stars);
      expect(result.outcome).toBe(outcome);
    },
  );

  it('Game 4 uses configured level rewards instead of 160', () => {
    expect(GAME_FOUR_ROUND_REWARDS).toEqual({ 1: 120, 2: 130, 3: 140, 4: 150, 5: 170 });
    expect(buildGameFour({ outcome: 'COMPLETED', levelNumber: 5, roundsCleared: 3, totalRounds: 3 }).baseScore).toBe(510);
  });

  it('Games 5/6 do not double-count completed tasks or mistakes', () => {
    expect(buildProgrammingSubmissionPayload({ outcome: 'COMPLETED', points: 725, completedTasks: 5, totalTasks: 5, mistakes: 2 }).baseScore).toBe(725);
  });
});
