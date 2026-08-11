const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const calculateStars = (answered, total, mistakes) => {
  const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;
  if (percentage >= 90 && mistakes <= 3) return 3;
  if (percentage >= 75 && percentage <= 89 && mistakes === 4) return 2;
  if (percentage >= 50 && percentage <= 74 && mistakes === 5) return 1;
  return 0;
};

export const buildSubmissionPayload = (gameplay, sessionInfo = {}) => {
  const safePoints = clamp(Math.round(Number(gameplay?.points || 0)), 0, 9999);
  const safeAnsweredQuestions = clamp(Math.round(Number(gameplay?.answeredQuestions || 0)), 0, 9999);
  const safeHintsUsed = clamp(Math.round(Number(gameplay?.hintsUsed || 0)), 0, 9999);
  const safeWrongAnswers = clamp(Math.round(Number(gameplay?.wrongAnswers || 0)), 0, 9999);
  const safeTotalQuestions = Math.max(
    safeAnsweredQuestions,
    clamp(Math.round(Number(gameplay?.totalQuestions || 0)), 0, 9999),
  );
  const safeRetryMultiplier = clamp(Number(sessionInfo?.retryMultiplier || 1), 0.5, 1);
  const completed = gameplay?.outcome === 'COMPLETED'
    || (safeTotalQuestions > 0 && safeAnsweredQuestions >= safeTotalQuestions);
  const starsEarned = Number.isFinite(Number(gameplay?.starsEarned))
    ? clamp(Math.round(Number(gameplay.starsEarned)), 0, 3)
    : calculateStars(safeAnsweredQuestions, safeTotalQuestions, safeWrongAnswers);

  return {
    outcome: completed && starsEarned > 0 ? 'COMPLETED' : 'FAILED',
    mistakes: safeWrongAnswers,
    hintsUsed: safeHintsUsed,
    starsEarned: completed ? starsEarned : 0,
    baseScore: completed && starsEarned > 0 ? Math.max(0, Math.round(safePoints / safeRetryMultiplier)) : 0,
  };
};

export default buildSubmissionPayload;
