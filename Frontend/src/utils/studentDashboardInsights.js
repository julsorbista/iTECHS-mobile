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

export const DEFAULT_DASHBOARD_SCORE_WEIGHTS = Object.freeze({
  assessment: 30,
  game: 50,
  module: 10,
  stars: 10,
});

export const normalizeDashboardScoreWeights = (weights = {}) => {
  const normalized = {
    assessment: Number(weights.assessment ?? weights.assessmentWeight ?? DEFAULT_DASHBOARD_SCORE_WEIGHTS.assessment),
    game: Number(weights.game ?? weights.gameWeight ?? DEFAULT_DASHBOARD_SCORE_WEIGHTS.game),
    module: Number(weights.module ?? weights.moduleWeight ?? DEFAULT_DASHBOARD_SCORE_WEIGHTS.module),
    stars: Number(weights.stars ?? weights.starsWeight ?? DEFAULT_DASHBOARD_SCORE_WEIGHTS.stars),
  };
  const total = Object.values(normalized).reduce((sum, value) => sum + value, 0);
  const isValid = Object.values(normalized).every((value) => Number.isFinite(value) && value >= 0 && value <= 100);
  return isValid && Math.abs(total - 100) < 0.001
    ? normalized
    : { ...DEFAULT_DASHBOARD_SCORE_WEIGHTS };
};

export const hasMeaningfulPerformanceParticipation = (student) => {
  const assessmentScore = getStudentDashboardMetric(student, 'assessmentAverageScore');
  const gameProgress = getStudentDashboardMetric(student, 'gameProgressPercent');
  const moduleProgress = getStudentDashboardMetric(student, 'moduleProgressPercent');
  const progressPercent = getStudentDashboardMetric(student, 'progressPercent');
  const completedLevels = getStudentDashboardMetric(student, 'completedLevels');
  const completedModules = getStudentDashboardMetric(student, 'completedModules');
  const totalStars = getStudentDashboardMetric(student, 'totalStars');

  return assessmentScore > 0
    || gameProgress > 0
    || moduleProgress > 0
    || progressPercent > 0
    || completedLevels > 0
    || completedModules > 0
    || totalStars > 0;
};
const HIDDEN_DASHBOARD_STUDENT_NAMES = new Set();
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
  return hasMeaningfulPerformanceParticipation(student);
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

export const getStudentDashboardPerformancePercent = (student, weights = student?.metrics?.gradingWeights) => {
  const gradingWeights = normalizeDashboardScoreWeights(weights);
  const assessmentScore = clampPercent(getStudentDashboardMetric(student, 'assessmentAverageScore'));
  const moduleProgress = clampPercent(getStudentDashboardMetric(student, 'moduleProgressPercent'));
  const gameProgress = clampPercent(getStudentDashboardMetric(student, 'gameProgressPercent'));
  const totalStars = getStudentDashboardMetric(student, 'totalStars');
  const possibleStars = getStudentDashboardPossibleStars(student);
  const starPercent = possibleStars > 0 ? clampPercent((totalStars / possibleStars) * 100) : 0;
  const score = (
    (assessmentScore * gradingWeights.assessment / 100)
    + (gameProgress * gradingWeights.game / 100)
    + (moduleProgress * gradingWeights.module / 100)
    + (starPercent * gradingWeights.stars / 100)
  );

  return Math.round(clampPercent(score));
};

export const getStudentDashboardPerformanceStatus = (studentOrPercent) => {
  if (typeof studentOrPercent !== 'number' && !hasMeaningfulPerformanceParticipation(studentOrPercent)) {
    return 'Provisional';
  }
  const percent = typeof studentOrPercent === 'number'
    ? clampPercent(studentOrPercent)
    : getStudentDashboardPerformancePercent(studentOrPercent);
  if (percent >= 90) return 'Excellent';
  if (percent >= 80) return 'Very Good';
  if (percent >= 70) return 'Good';
  if (percent >= 60) return 'Developing';
  return 'Low Performance';
};

export const getStudentDashboardRiskLevel = (riskScore) => {
  const score = Math.max(0, toNumber(riskScore));
  if (score >= 6) return 'Critical Attention';
  if (score >= 4) return 'High Risk';
  if (score >= 2) return 'Moderate Risk';
  return 'Low Risk';
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
  const leftModuleProgress = getStudentDashboardMetric(left, 'moduleProgressPercent');
  const rightModuleProgress = getStudentDashboardMetric(right, 'moduleProgressPercent');
  const leftOverallPerformance = getStudentDashboardPerformancePercent(left);
  const rightOverallPerformance = getStudentDashboardPerformancePercent(right);

  const overallGap = rightOverallPerformance - leftOverallPerformance;
  if (overallGap !== 0) {
    return overallGap;
  }

  const assessmentGap = rightAssessmentScore - leftAssessmentScore;
  if (assessmentGap !== 0) {
    return assessmentGap;
  }

  const moduleGap = rightModuleProgress - leftModuleProgress;
  if (moduleGap !== 0) {
    return moduleGap;
  }

  return getStudentDashboardName(left).localeCompare(getStudentDashboardName(right), undefined, { sensitivity: 'base' });
};

const buildStudentAttentionProfile = (student, now) => {
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
  const hasMeaningfulParticipation = hasMeaningfulPerformanceParticipation(student);

  let riskScore = 0;
  const reasons = [];

  if (!hasStartedLearning || !hasActualActivity || !hasMeaningfulParticipation) {
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
      riskLevel: getStudentDashboardRiskLevel(0),
    };
  }

  if (dashboardPerformancePercent < 70) {
    riskScore += 2;
    reasons.push({ code: 'low-overall-performance', label: 'Overall performance below 70%', points: 2 });
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
    riskLevel: getStudentDashboardRiskLevel(riskScore),
  };
};

export const buildStudentDashboardInsights = (students = [], options = {}) => {
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
    hasMeaningfulPerformanceParticipation(student)
    && !isHiddenDashboardStudent(student)
  ));

  const topPerformerCandidates = activeStudents.filter((student) => (
    hasStudentDashboardTopPerformerSignals(student)
    && hasMeaningfulPerformanceParticipation(student)
    && getStudentDashboardPerformancePercent(student) >= 70
  ));

  const topStudents = [...topPerformerCandidates]
    .sort(compareStudentsByDashboardPerformance);

  const needsAttention = activeStudents
    .map((student) => buildStudentAttentionProfile(student, now))
    .filter((profile) => !profile.excluded)
    .filter((profile) => (
      shouldForceNeedsAttention(profile.student)
      || profile.dashboardPerformancePercent < 70
    ))
    .sort((left, right) => {
      const leftForcedPriority = getForcedNeedsAttentionPriority(left.student);
      const rightForcedPriority = getForcedNeedsAttentionPriority(right.student);
      if (leftForcedPriority !== rightForcedPriority) {
        return leftForcedPriority - rightForcedPriority;
      }

      if (right.riskScore !== left.riskScore) {
        return right.riskScore - left.riskScore;
      }

      const performanceGap = left.dashboardPerformancePercent - right.dashboardPerformancePercent;
      if (performanceGap !== 0) {
        return performanceGap;
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
