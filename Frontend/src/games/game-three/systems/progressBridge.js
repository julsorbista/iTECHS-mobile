const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const calculateGameThreeStars = (matchedPairs, totalPairs) => {
  const percentage = totalPairs > 0 ? Math.round((matchedPairs / totalPairs) * 100) : 0;
  if (percentage >= 90) return 3;
  if (percentage >= 75) return 2;
  if (percentage >= 50) return 1;
  return 0;
};

export const buildSubmissionPayload = (gameplay) => {
  const safeMatchedPairs = clamp(Math.round(Number(gameplay?.matchedPairs || 0)), 0, 9999);
  const safeHintsUsed = clamp(Math.round(Number(gameplay?.hintsUsed || 0)), 0, 9999);
  const safeMismatches = clamp(Math.round(Number(gameplay?.mismatches || 0)), 0, 9999);
  const safeTotalPairs = Math.max(
    safeMatchedPairs,
    clamp(Math.round(Number(gameplay?.totalPairs || 0)), 0, 9999),
  );
  const completed = gameplay?.outcome === 'COMPLETED'
    || (safeTotalPairs > 0 && safeMatchedPairs >= Math.ceil(safeTotalPairs * 0.75));
  const starsEarned = Number.isFinite(Number(gameplay?.starsEarned))
    ? clamp(Math.round(Number(gameplay.starsEarned)), 0, 3)
    : calculateGameThreeStars(safeMatchedPairs, safeTotalPairs);

  return {
    outcome: completed && starsEarned >= 2 ? 'COMPLETED' : 'FAILED',
    mistakes: safeMismatches,
    hintsUsed: safeHintsUsed,
    starsEarned,
    matchedPairs: safeMatchedPairs,
    totalPairs: safeTotalPairs,
    baseScore: completed && starsEarned >= 2 ? safeMatchedPairs * 100 : 0,
  };
};

export default buildSubmissionPayload;
