const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const buildSubmissionPayload = (gameplay) => {
  const safeMistakes = clamp(Math.round(Number(gameplay?.mistakes || 0)), 0, 9999);
  const safeRoundsCleared = clamp(Math.round(Number(gameplay?.roundsCleared || 0)), 0, 9999);
  const safeTotalRounds = Math.max(
    safeRoundsCleared,
    clamp(Math.round(Number(gameplay?.totalRounds || 0)), 0, 9999),
  );
  const safeHintsUsed = 0;
  const safeBonusPoints = clamp(Math.round(Number(gameplay?.bonusPoints || 0)), 0, 9999);
  const completed = gameplay?.outcome === 'COMPLETED'
    || (safeTotalRounds > 0 && safeRoundsCleared >= safeTotalRounds);

  return {
    outcome: completed ? 'COMPLETED' : 'FAILED',
    mistakes: safeMistakes,
    hintsUsed: safeHintsUsed,
    baseScore: completed
      ? Math.max(120, 120 + (safeRoundsCleared * 160) + safeBonusPoints - (safeMistakes * 18))
      : 0,
  };
};

export default buildSubmissionPayload;
