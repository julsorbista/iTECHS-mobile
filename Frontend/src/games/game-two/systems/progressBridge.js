const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const calculateCodingStars = (completedTasks, totalTasks, mistakes = 0) => {
  const safeCompleted = clamp(Math.round(Number(completedTasks || 0)), 0, 9999);
  const safeTotal = clamp(Math.round(Number(totalTasks || 0)), 0, 9999);
  const safeMistakes = clamp(Math.round(Number(mistakes || 0)), 0, 9999);
  const percentage = safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;

  if (percentage >= 90 && safeMistakes <= 3) return 3;
  if (percentage >= 80 && safeMistakes <= 4) return 2;
  if (percentage >= 50 && safeMistakes <= 5) return 1;
  return 0;
};

export const calculateQuestionStars = (correctAnswers, totalQuestions, mistakes = 0) => (
  calculateCodingStars(correctAnswers, totalQuestions, mistakes)
);

export const buildSubmissionPayload = (gameplay) => {
  const safeMistakes = clamp(Math.round(Number(gameplay?.mistakes || 0)), 0, 9999);
  const safeHintsUsed = clamp(Math.round(Number(gameplay?.hintsUsed || 0)), 0, 9999);
  const safePoints = clamp(Math.round(Number(gameplay?.points || 0)), 0, 999999);
  const safeCompletedTasks = clamp(Math.round(Number(gameplay?.completedTasks || 0)), 0, 9999);
  const safeTotalTasks = Math.max(
    safeCompletedTasks,
    clamp(Math.round(Number(gameplay?.totalTasks || 0)), 0, 9999),
  );
  const starsEarned = Number.isFinite(Number(gameplay?.starsEarned))
    ? clamp(Math.round(Number(gameplay.starsEarned)), 0, 3)
    : calculateCodingStars(safeCompletedTasks, safeTotalTasks, safeMistakes);
  const completed = (gameplay?.outcome === 'COMPLETED'
    || (safeTotalTasks > 0 && safeCompletedTasks >= Math.ceil(safeTotalTasks * 0.8))
  ) && starsEarned >= 2;

  return {
    outcome: completed ? 'COMPLETED' : 'FAILED',
    mistakes: completed ? safeMistakes : Math.max(6, safeMistakes + 4),
    hintsUsed: safeHintsUsed,
    completedTasks: safeCompletedTasks,
    totalTasks: safeTotalTasks,
    starsEarned: completed ? starsEarned : 0,
    baseScore: completed
      ? safePoints
      : 0,
  };
};
