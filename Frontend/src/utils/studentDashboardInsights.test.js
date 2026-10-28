import { describe, expect, it } from 'vitest';

import {
  buildStudentDashboardInsights,
  getStudentDashboardPerformancePercent,
} from './studentDashboardInsights';

const makeStudent = (id, metrics) => ({
  id,
  firstName: `Student ${id}`,
  lastName: 'Test',
  metrics: {
    hasAnyActivity: true,
    gameAttemptsCount: 1,
    assessmentAttemptsCount: 1,
    attemptedAssessments: 1,
    scoredAssessmentsCount: 1,
    startedModules: 1,
    totalLevels: 1,
    totalAssessments: 1,
    ...metrics,
  },
});

describe('Academic Needs Attention', () => {
  it('does not flag a student whose overall performance is at least 70%', () => {
    const student = makeStudent('game', {
      assessmentAverageScore: 100,
      gameProgressPercent: 50,
      moduleProgressPercent: 100,
      totalStars: 6,
    });

    const result = buildStudentDashboardInsights([student]);

    expect(result.needsAttention).toHaveLength(0);
    expect(result.topStudents).toHaveLength(1);
  });

  it('flags an overall score below 70%', () => {
    const student = makeStudent('overall', {
      assessmentAverageScore: 60,
      gameProgressPercent: 60,
      moduleProgressPercent: 0,
      totalStars: 0,
    });

    const result = buildStudentDashboardInsights([student]);

    expect(result.needsAttention).toHaveLength(1);
    expect(result.needsAttention[0].attentionProfile.reasons).toContainEqual({
      code: 'low-overall-performance',
      label: 'Overall performance below 70%',
      points: 2,
    });
  });

  it('does not use low module progress as an independent attention trigger', () => {
    const student = makeStudent('module', {
      assessmentAverageScore: 100,
      gameProgressPercent: 100,
      moduleProgressPercent: 0,
      totalStars: 6,
    });

    const result = buildStudentDashboardInsights([student]);

    expect(result.needsAttention).toHaveLength(0);
  });

  it('places an exact 70% score only in Top Performers', () => {
    const student = makeStudent('boundary', {
      assessmentAverageScore: 100,
      gameProgressPercent: 80,
      moduleProgressPercent: 0,
      totalStars: 0,
    });

    const result = buildStudentDashboardInsights([student]);

    expect(result.topStudents.map((item) => item.id)).toEqual(['boundary']);
    expect(result.needsAttention).toHaveLength(0);
  });
});

describe('Top Performers', () => {
  it('excludes a student whose attempts and all recorded results are still zero', () => {
    const student = makeStudent('zero-only', {
      assessmentAverageScore: 0,
      gameProgressPercent: 0,
      moduleProgressPercent: 0,
      progressPercent: 0,
      completedLevels: 0,
      completedModules: 0,
      totalStars: 0,
    });

    const result = buildStudentDashboardInsights([student]);

    expect(result.topStudents).toHaveLength(0);
    expect(result.needsAttention).toHaveLength(0);
  });

  it('keeps students with any real activity in dashboard evaluation', () => {
    const student = makeStudent('assessment-only', {
      assessmentAverageScore: 100,
      gameAttemptsCount: 0,
      completedLevels: 0,
      gameProgressPercent: 0,
      totalStars: 0,
      moduleProgressPercent: 100,
    });

    expect(buildStudentDashboardInsights([student]).needsAttention).toHaveLength(1);
  });

  it('shows every qualifying student without a five-student limit', () => {
    const students = Array.from({ length: 7 }, (_, index) => makeStudent(`top-${index}`, {
      assessmentAverageScore: 90 - index,
      gameProgressPercent: 100,
      moduleProgressPercent: 100,
      totalStars: 6,
    }));

    const result = buildStudentDashboardInsights(students);

    expect(result.topStudents).toHaveLength(7);
    expect(result.topStudents.map((student) => student.id)).toEqual([
      'top-0',
      'top-1',
      'top-2',
      'top-3',
      'top-4',
      'top-5',
      'top-6',
    ]);
  });
});

describe('Teacher grading weights', () => {
  it('uses valid teacher weights embedded in roster metrics', () => {
    const student = makeStudent('weighted', {
      assessmentAverageScore: 100,
      gameProgressPercent: 0,
      moduleProgressPercent: 0,
      totalStars: 0,
      gradingWeights: { assessment: 80, game: 10, module: 5, stars: 5 },
    });

    expect(getStudentDashboardPerformancePercent(student)).toBe(80);
  });

  it('falls back to 30/50/10/10 when supplied weights do not total 100', () => {
    const student = makeStudent('invalid-weights', {
      assessmentAverageScore: 100,
      gameProgressPercent: 0,
      moduleProgressPercent: 0,
      totalStars: 0,
      gradingWeights: { assessment: 80, game: 80, module: 0, stars: 0 },
    });

    expect(getStudentDashboardPerformancePercent(student)).toBe(30);
  });
});
