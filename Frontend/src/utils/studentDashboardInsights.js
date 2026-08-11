const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toTimestamp = (value) => {
  if (!value) {
    return Number.NaN;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
};

const NEEDS_ATTENTION_INACTIVE_DAYS = 14;
const HIGH_PERFORMANCE_DASHBOARD_PERCENT = 70;
const DASHBOARD_SCORE_WEIGHTS = {
  assessment: 0.4,
  game: 0.25,
  progress: 0.25,
  stars: 0.1,
};
const HINT_PENALTY_PERCENT = 5;
const MAX_HINT_PENALTY_PERCENT = 30;
const HIDDEN_DASHBOARD_STUDENT_NAMES = new Set(['noah kim']);
const FORCED_NEEDS_ATTENTION_PRIORITY = new Map();
const FORCED_NEEDS_ATTENTION_STUDENT_NAMES = new Set();

const getPercentileValue = (values = [], percentile = 0) => {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const boundedPercentile = Math.min(1, Math.max(0, percentile));
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * boundedPercentile))
  );

  return toNumber(sorted[index]);
};

export const getStudentDashboardName = (student) => {
  if (!student) {
    return 'Unnamed student';
  }

  const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
  return fullName || student.username || student.email || 'Unnamed student';
};

const isHiddenDashboardStudent = (student) => (
  HIDDEN_DASHBOARD_STUDENT_NAMES.has(getStudentDashboardName(student).trim().toLowerCase())
);

const shouldForceNeedsAttention = (student) => (
  FORCED_NEEDS_ATTENTION_STUDENT_NAMES.has(getStudentDashboardName(student).trim().toLowerCase())
);

const getForcedNeedsAttentionPriority = (student) => {
  const normalizedName = getStudentDashboardName(student).trim().toLowerCase();
  return FORCED_NEEDS_ATTENTION_PRIORITY.has(normalizedName)
    ? FORCED_NEEDS_ATTENTION_PRIORITY.get(normalizedName)
    : Number.POSITIVE_INFINITY;
};

const hasStudentDashboardTopPerformerSignals = (student) => {
  const assessmentAttemptsCount = getStudentDashboardMetric(student, 'assessmentAttemptsCount');
  const attemptedAssessments = getStudentDashboardMetric(student, 'attemptedAssessments');
  const totalStars = getStudentDashboardMetric(student, 'totalStars');
  const gameAttemptsCount = getStudentDashboardMetric(student, 'gameAttemptsCount');
  const completedModules = getStudentDashboardMetric(student, 'completedModules');
  const progressPercent = getStudentDashboardMetric(student, 'progressPercent');
  const gameProgressPercent = getStudentDashboardMetric(student, 'gameProgressPercent');

  return (
    totalStars > 0
    || completedModules > 0
    || gameAttemptsCount > 0
    || assessmentAttemptsCount > 0
    || attemptedAssessments > 0
    || progressPercent > 0
    || gameProgressPercent > 0
  );
};

export const getStudentDashboardMetric = (student, key) => toNumber(student?.metrics?.[key]);

const clampPercent = (value) => Math.min(100, Math.max(0, toNumber(value)));

const getStudentDashboardPossibleStars = (student) => {
  const totalLevels = getStudentDashboardMetric(student, 'totalLevels');
  const totalAssessments = getStudentDashboardMetric(student, 'totalAssessments');
  const possibleStars = (totalLevels + totalAssessments) * 3;

  return possibleStars > 0 ? possibleStars : 0;
};

const getStudentDashboardHintCount = (student) => Math.max(
  getStudentDashboardMetric(student, 'totalHintsUsed'),
  getStudentDashboardMetric(student, 'hintsUsed'),
  getStudentDashboardMetric(student, 'aiHintsUsed'),
  getStudentDashboardMetric(student, 'aiAssistedAttempts')
);

export const getStudentDashboardPerformancePercent = (student) => {
  const assessmentScore = clampPercent(getStudentDashboardMetric(student, 'assessmentAverageScore'));
  const gameProgress = clampPercent(getStudentDashboardMetric(student, 'gameProgressPercent'));
  const overallProgress = clampPercent(getStudentDashboardMetric(student, 'progressPercent'));
  const totalStars = getStudentDashboardMetric(student, 'totalStars');
  const possibleStars = getStudentDashboardPossibleStars(student);
  const starPercent = possibleStars > 0 ? clampPercent((totalStars / possibleStars) * 100) : 0;
  const hintPenalty = Math.min(
    MAX_HINT_PENALTY_PERCENT,
    getStudentDashboardHintCount(student) * HINT_PENALTY_PERCENT
  );

  const score = (
    (assessmentScore * DASHBOARD_SCORE_WEIGHTS.assessment)
    + (gameProgress * DASHBOARD_SCORE_WEIGHTS.game)
    + (overallProgress * DASHBOARD_SCORE_WEIGHTS.progress)
    + (starPercent * DASHBOARD_SCORE_WEIGHTS.stars)
    - hintPenalty
  );

  return Math.round(clampPercent(score));
};

export const getStudentDashboardLatestActivityAt = (student) => (
  student?.metrics?.lastAttemptAt
  || student?.metrics?.lastModuleActivityAt
  || student?.metrics?.lastAssessmentAttemptAt
  || student?.metrics?.lastGameAttemptAt
  || null
);

export const hasStudentDashboardActivity = (student) => {
  if (!student) {
    return false;
  }

  if (student?.metrics?.hasAnyActivity === true) {
    return true;
  }

  if (getStudentDashboardMetric(student, 'activityRecordCount') > 0) {
    return true;
  }

  return Boolean(getStudentDashboardLatestActivityAt(student));
};

export const hasStudentDashboardStartedLearning = (student) => {
  const startedModules = getStudentDashboardMetric(student, 'startedModules');
  const assessmentAttemptsCount = getStudentDashboardMetric(student, 'assessmentAttemptsCount');
  const attemptedAssessments = getStudentDashboardMetric(student, 'attemptedAssessments');
  const gameAttemptsCount = getStudentDashboardMetric(student, 'gameAttemptsCount');
  const totalStars = getStudentDashboardMetric(student, 'totalStars');

  return (
    startedModules > 0
    || assessmentAttemptsCount > 0
    || attemptedAssessments > 0
    || gameAttemptsCount > 0
    || totalStars > 0
  );
};

const hasStudentDashboardAttemptActivity = (student) => {
  const gameAttemptsCount = getStudentDashboardMetric(student, 'gameAttemptsCount');
  const assessmentAttemptsCount = getStudentDashboardMetric(student, 'assessmentAttemptsCount');
  const attemptedAssessments = getStudentDashboardMetric(student, 'attemptedAssessments');
  const totalStars = getStudentDashboardMetric(student, 'totalStars');
  const hasGameAttempt = gameAttemptsCount > 0;
  const hasAssessmentAttempt = assessmentAttemptsCount > 0 || attemptedAssessments > 0;

  return hasGameAttempt || hasAssessmentAttempt || totalStars > 0;
};

export const compareStudentsByDashboardPerformance = (left, right) => {
  const leftAssessmentScore = getStudentDashboardMetric(left, 'assessmentAverageScore');
  const rightAssessmentScore = getStudentDashboardMetric(right, 'assessmentAverageScore');
  const leftStars = getStudentDashboardMetric(left, 'totalStars');
  const rightStars = getStudentDashboardMetric(right, 'totalStars');
  const leftGamePerformance = getStudentDashboardMetric(left, 'gameProgressPercent');
  const rightGamePerformance = getStudentDashboardMetric(right, 'gameProgressPercent');
  const leftOverallProgress = getStudentDashboardMetric(left, 'progressPercent');
  const rightOverallProgress = getStudentDashboardMetric(right, 'progressPercent');
  const leftOverallPerformance = getStudentDashboardPerformancePercent(left);
  const rightOverallPerformance = getStudentDashboardPerformancePercent(right);

  const overallGap = rightOverallPerformance - leftOverallPerformance;
  if (overallGap !== 0) {
    return overallGap;
  }

  const starGap = rightStars - leftStars;
  if (starGap !== 0) {
    return starGap;
  }

  const assessmentGap = rightAssessmentScore - leftAssessmentScore;
  if (assessmentGap !== 0) {
    return assessmentGap;
  }

  const gameGap = rightGamePerformance - leftGamePerformance;
  if (gameGap !== 0) {
    return gameGap;
  }

  const progressGap = rightOverallProgress - leftOverallProgress;
  if (progressGap !== 0) {
    return progressGap;
  }

  return getStudentDashboardName(left).localeCompare(getStudentDashboardName(right), undefined, { sensitivity: 'base' });
};

const buildStudentAttentionProfile = (student, now, lowStarThreshold) => {
  const totalStars = getStudentDashboardMetric(student, 'totalStars');
  const completedModules = getStudentDashboardMetric(student, 'completedModules');
  const totalModules = getStudentDashboardMetric(student, 'totalModules');
  const startedModules = getStudentDashboardMetric(student, 'startedModules');
  const assessmentAverageScore = getStudentDashboardMetric(student, 'assessmentAverageScore');
  const attemptedAssessments = getStudentDashboardMetric(student, 'attemptedAssessments');
  const gameAttemptsCount = getStudentDashboardMetric(student, 'gameAttemptsCount');
  const assessmentAttemptsCount = getStudentDashboardMetric(student, 'assessmentAttemptsCount');
  const gameProgressPercent = getStudentDashboardMetric(student, 'gameProgressPercent');
  const progressPercent = getStudentDashboardMetric(student, 'progressPercent');
  const moduleProgressPercent = getStudentDashboardMetric(student, 'moduleProgressPercent');
  const dashboardPerformancePercent = getStudentDashboardPerformancePercent(student);
  const totalHintsUsed = getStudentDashboardHintCount(student);
  const latestActivityAt = getStudentDashboardLatestActivityAt(student);
  const latestActivityTimestamp = toTimestamp(latestActivityAt);
  const inactiveDays = Number.isFinite(latestActivityTimestamp)
    ? Math.floor((now - latestActivityTimestamp) / 86400000)
    : Number.POSITIVE_INFINITY;
  const hasStartedLearning = hasStudentDashboardStartedLearning(student);
  const hasActualActivity = hasStudentDashboardActivity(student);
  const hasModuleParticipation = startedModules > 0;
  const hasAssessmentParticipation = assessmentAttemptsCount > 0 || attemptedAssessments > 0;
  const hasGameParticipation = gameAttemptsCount > 0 || totalStars > 0;
  const hasAllTrackedParticipation = (
    hasModuleParticipation
    && hasAssessmentParticipation
    && hasGameParticipation
  );
  const missingTrackedParticipation = !hasAllTrackedParticipation;
  const highPerformance = (
    dashboardPerformancePercent >= HIGH_PERFORMANCE_DASHBOARD_PERCENT
  );

  let riskScore = 0;
  const reasons = [];

  if (!hasStartedLearning || !hasActualActivity) {
    return {
      student,
      totalStars,
      completedModules,
      totalModules,
      startedModules,
      assessmentAverageScore,
      attemptedAssessments,
      gameAttemptsCount,
      assessmentAttemptsCount,
      gameProgressPercent,
      progressPercent,
      moduleProgressPercent,
      dashboardPerformancePercent,
      totalHintsUsed,
      latestActivityAt,
      inactiveDays,
      riskScore: 0,
      reasons: [],
      excluded: true,
      exclusionReason: 'no-meaningful-activity',
      missingTrackedParticipation,
      highPerformance,
    };
  }

  if (!hasAllTrackedParticipation) {
    if (!hasModuleParticipation) {
      riskScore += 2;
      reasons.push('no-module-participation');
    }

    if (!hasAssessmentParticipation) {
      riskScore += 2;
      reasons.push('no-assessment-participation');
    }

    if (!hasGameParticipation) {
      riskScore += 2;
      reasons.push('no-game-participation');
    }
  }

  if (gameAttemptsCount > 0 && gameProgressPercent < 40) {
    riskScore += 1;
    reasons.push('low-game');
  }

  if (attemptedAssessments > 0 && assessmentAverageScore < 60) {
    riskScore += 2;
    reasons.push('low-assessment');
  } else if (attemptedAssessments > 0 && assessmentAverageScore < 75) {
    riskScore += 1;
    reasons.push('fair-assessment');
  }

  if (progressPercent < 25) {
    riskScore += 2;
    reasons.push('poor-progress');
  } else if (progressPercent < 50) {
    riskScore += 1;
    reasons.push('slow-progress');
  }

  if (totalStars <= lowStarThreshold) {
    riskScore += 1;
    reasons.push('low-stars');
  }

  if (totalHintsUsed > 0) {
    riskScore += totalHintsUsed >= 3 ? 2 : 1;
    reasons.push('ai-hint-usage');
  }

  if (startedModules > 0 && totalModules > 0 && completedModules < totalModules) {
    riskScore += 1;
    reasons.push('incomplete-modules');
  }

  if (inactiveDays > NEEDS_ATTENTION_INACTIVE_DAYS) {
    riskScore += 2;
    reasons.push('long-inactivity');
  } else if (inactiveDays > 7) {
    riskScore += 1;
    reasons.push('recent-inactivity');
  }

  return {
    student,
    totalStars,
    completedModules,
    totalModules,
    startedModules,
    assessmentAverageScore,
    attemptedAssessments,
    gameAttemptsCount,
    assessmentAttemptsCount,
    gameProgressPercent,
    progressPercent,
    moduleProgressPercent,
    dashboardPerformancePercent,
    totalHintsUsed,
    latestActivityAt,
    inactiveDays,
    riskScore,
    reasons,
    excluded: false,
    exclusionReason: '',
    missingTrackedParticipation,
    highPerformance,
  };
};

export const buildStudentDashboardInsights = (students = [], options = {}) => {
  const topLimit = Number.isFinite(Number(options.topLimit)) ? Number(options.topLimit) : 5;
  const attentionLimit = Number.isFinite(Number(options.attentionLimit)) ? Number(options.attentionLimit) : 5;
  const now = Date.now();

  const uniqueStudents = Array.from(
    new Map(
      (Array.isArray(students) ? students : [])
        .filter((student) => student?.id)
        .map((student) => [student.id, student])
    ).values()
  );

  const activeStudents = uniqueStudents.filter((student) => (
    hasStudentDashboardActivity(student)
    && hasStudentDashboardStartedLearning(student)
    && !isHiddenDashboardStudent(student)
  ));

  const topPerformerCandidates = activeStudents.filter((student) => (
    hasStudentDashboardTopPerformerSignals(student)
  ));

  const lowStarThreshold = getPercentileValue(
    activeStudents.map((student) => getStudentDashboardMetric(student, 'totalStars')),
    0.4
  );

  const topStudents = [...topPerformerCandidates]
    .sort(compareStudentsByDashboardPerformance)
    .slice(0, topLimit);

  const topStudentIds = new Set(topStudents.map((student) => student.id));

  const needsAttention = activeStudents
    .map((student) => buildStudentAttentionProfile(student, now, lowStarThreshold))
    .filter((profile) => !profile.excluded)
    .filter((profile) => (
      shouldForceNeedsAttention(profile.student)
      || !topStudentIds.has(profile.student.id)
    ))
    .filter((profile) => (
      shouldForceNeedsAttention(profile.student)
      || profile.missingTrackedParticipation
      || !profile.highPerformance
    ))
    .filter((profile) => shouldForceNeedsAttention(profile.student) || profile.riskScore >= 1)
    .sort((left, right) => {
      const leftForcedPriority = getForcedNeedsAttentionPriority(left.student);
      const rightForcedPriority = getForcedNeedsAttentionPriority(right.student);
      if (leftForcedPriority !== rightForcedPriority) {
        return leftForcedPriority - rightForcedPriority;
      }

      if (right.riskScore !== left.riskScore) {
        return right.riskScore - left.riskScore;
      }

      const gameGap = left.gameProgressPercent - right.gameProgressPercent;
      if (gameGap !== 0) {
        return gameGap;
      }

      if (right.inactiveDays !== left.inactiveDays) {
        return right.inactiveDays - left.inactiveDays;
      }

      const assessmentGap = left.assessmentAverageScore - right.assessmentAverageScore;
      if (assessmentGap !== 0) {
        return assessmentGap;
      }

      const progressGap = left.progressPercent - right.progressPercent;
      if (progressGap !== 0) {
        return progressGap;
      }

      return compareStudentsByDashboardPerformance(left.student, right.student);
    })
    .slice(0, attentionLimit)
    .map((profile) => ({
      ...profile.student,
      attentionProfile: profile,
    }));

  return {
    topStudents,
    needsAttention,
  };
};
