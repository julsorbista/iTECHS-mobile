import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { handleAPIError, userAPI } from '../../utils/api';

const TEACHER_DASHBOARD_REFRESH_MS = 60000;

const getStudentDisplayName = (student) => {
  const fullName = `${student?.firstName || ''} ${student?.lastName || ''}`.trim();
  return fullName || student?.username || student?.email || 'Unnamed student';
};

const getCompletedActivities = (student) => Number(student?.metrics?.completedActivities ?? student?.metrics?.completedLevels ?? 0);
const getTotalActivities = (student) => Number(student?.metrics?.totalActivities ?? student?.metrics?.totalLevels ?? 0);

const compareStudentsForCombinedRanking = (left, right) => {
  const progressGap = Number(right?.metrics?.progressPercent || 0) - Number(left?.metrics?.progressPercent || 0);
  if (progressGap !== 0) {
    return progressGap;
  }

  const starsGap = Number(right?.metrics?.totalStars || 0) - Number(left?.metrics?.totalStars || 0);
  if (starsGap !== 0) {
    return starsGap;
  }

  const completedGap = getCompletedActivities(right) - getCompletedActivities(left);
  if (completedGap !== 0) {
    return completedGap;
  }

  const assessmentGap = Number(right?.metrics?.assessmentAverageScore || 0) - Number(left?.metrics?.assessmentAverageScore || 0);
  if (assessmentGap !== 0) {
    return assessmentGap;
  }

  return getStudentDisplayName(left).localeCompare(getStudentDisplayName(right));
};

const buildCombinedLeaderboard = (students = []) => (
  [...students]
    .sort(compareStudentsForCombinedRanking)
    .map((student, index) => ({
      rank: index + 1,
      studentId: student.id,
      studentName: getStudentDisplayName(student),
      section: student.section || '',
      completedActivities: getCompletedActivities(student),
      totalActivities: getTotalActivities(student),
      completedLevels: Number(student?.metrics?.completedLevels || 0),
      totalLevels: Number(student?.metrics?.totalLevels || 0),
      completedAssessments: Number(student?.metrics?.completedAssessments || 0),
      totalAssessments: Number(student?.metrics?.totalAssessments || 0),
      totalStars: Number(student?.metrics?.totalStars || 0),
      totalScore: Number(student?.metrics?.totalScore || 0),
      progressPercent: Number(student?.metrics?.progressPercent || 0),
      assessmentAverageScore: Number(student?.metrics?.assessmentAverageScore || 0),
    }))
);

export const useTeacherDashboardData = (selectedStudentId, onStudentSelectionChange) => {
  const [isLoading, setIsLoading] = useState(true);
  const [roster, setRoster] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [flags, setFlags] = useState([]);
  const selectedStudentIdRef = useRef(selectedStudentId);
  const onStudentSelectionChangeRef = useRef(onStudentSelectionChange);

  useEffect(() => {
    selectedStudentIdRef.current = selectedStudentId;
  }, [selectedStudentId]);

  useEffect(() => {
    onStudentSelectionChangeRef.current = onStudentSelectionChange;
  }, [onStudentSelectionChange]);

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const [rosterRes, flagsRes] = await Promise.all([
        userAPI.getMyStudentsRoster({ isArchived: 'false', limit: 100 }),
        userAPI.getMyContentFlags(),
      ]);

      if (rosterRes.status === 'success') {
        const students = rosterRes.data.students || [];
        setRoster(students);
        setLeaderboard(buildCombinedLeaderboard(students));

        if (typeof onStudentSelectionChangeRef.current === 'function') {
          const nextSelectedStudent = students.find((student) => student.id === selectedStudentIdRef.current) || students[0] || null;
          onStudentSelectionChangeRef.current(nextSelectedStudent?.id || null);
        }
      }

      if (flagsRes.status === 'success') {
        setFlags(flagsRes.data.flags || []);
      }
    } catch (error) {
      toast.error(handleAPIError(error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadDashboard();

    const refreshTimer = window.setInterval(() => {
      loadDashboard().catch((error) => {
        if (!cancelled) {
          toast.error(handleAPIError(error).message);
        }
      });
    }, TEACHER_DASHBOARD_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [loadDashboard]);

  return {
    isLoading,
    roster,
    leaderboard,
    flags,
    loadDashboard,
  };
};
