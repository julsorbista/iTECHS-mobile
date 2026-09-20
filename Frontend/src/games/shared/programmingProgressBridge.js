const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const buildProgrammingSubmissionPayload = (gameplay) => {
  const safeMistakes = clamp(Math.round(Number(gameplay?.mistakes || 0)), 0, 9999);
  const safePoints = clamp(Math.round(Number(gameplay?.points || 0)), 0, 999999);
  const safeHintsUsed = clamp(Math.round(Number(gameplay?.hintsUsed || gameplay?.rating?.hintsUsed || 0)), 0, 9999);
  const safeCompletedTasks = clamp(Math.round(Number(gameplay?.completedTasks || 0)), 0, 9999);
  const safeTotalTasks = Math.max(
    safeCompletedTasks,
    clamp(Math.round(Number(gameplay?.totalTasks || 0)), 0, 9999),
  );
  const completed = gameplay?.outcome === 'COMPLETED'
    || (safeTotalTasks > 0 && safeCompletedTasks >= safeTotalTasks);
  const completionPercent = safeTotalTasks > 0 ? Math.round((safeCompletedTasks / safeTotalTasks) * 100) : 0;
  const fallbackStars = completionPercent >= 90 ? 3 : completionPercent >= 75 ? 2 : completionPercent >= 50 ? 1 : 0;
  const safeStars = clamp(
    Math.round(Number(gameplay?.starsEarned ?? gameplay?.rating?.stars ?? fallbackStars)),
    0,
    3,
  );

  return {
    outcome: completed ? 'COMPLETED' : 'FAILED',
    mistakes: completed ? safeMistakes : Math.max(6, safeMistakes + 4),
    hintsUsed: safeHintsUsed,
    starsEarned: completed ? safeStars : 0,
    starsRemaining: completed ? safeStars : 0,
    completedTasks: safeCompletedTasks,
    totalTasks: safeTotalTasks,
    baseScore: completed ? safePoints : 0,
  };
};

export default buildProgrammingSubmissionPayload;
