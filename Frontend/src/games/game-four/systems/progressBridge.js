const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const GAME_FOUR_ROUND_REWARDS = Object.freeze({ 1: 120, 2: 130, 3: 140, 4: 150, 5: 170 });

export const buildSubmissionPayload = (gameplay) => {
  const safeMistakes = clamp(Math.round(Number(gameplay?.mistakes || 0)), 0, 9999);
  const safeRoundsCleared = clamp(Math.round(Number(gameplay?.roundsCleared || 0)), 0, 9999);
  const safeTotalRounds = Math.max(
    safeRoundsCleared,
    clamp(Math.round(Number(gameplay?.totalRounds || 0)), 0, 9999),
  );
  const safeHintsUsed = 0;
  const safeBonusPoints = clamp(Math.round(Number(gameplay?.bonusPoints || 0)), 0, 9999);
  const safePoints = clamp(Math.round(Number(gameplay?.points || 0)), 0, 999999);
  const levelNumber = clamp(Math.round(Number(gameplay?.levelNumber || 1)), 1, 5);
  const completed = gameplay?.outcome === 'COMPLETED'
    || (safeTotalRounds > 0 && safeRoundsCleared >= safeTotalRounds);

  return {
    outcome: completed ? 'COMPLETED' : 'FAILED',
    mistakes: safeMistakes,
    hintsUsed: safeHintsUsed,
    levelNumber,
    roundsCleared: safeRoundsCleared,
    totalRounds: safeTotalRounds,
    bonusPoints: safeBonusPoints,
    baseScore: completed ? Math.max(0, (safePoints || (safeRoundsCleared * GAME_FOUR_ROUND_REWARDS[levelNumber])) + safeBonusPoints) : 0,
  };
};

export default buildSubmissionPayload;
