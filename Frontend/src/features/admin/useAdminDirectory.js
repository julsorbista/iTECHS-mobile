import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { handleAPIError, userAPI } from '../../utils/api';

const ADMIN_DIRECTORY_REFRESH_MS = 60000;

const splitUsersByRole = (users = []) => ({
  allUsers: users,
  teachers: users.filter((user) => user.role === 'TEACHER'),
  students: users.filter((user) => user.role === 'STUDENT'),
});

export const useAdminDirectory = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const applyUsers = useCallback((users = []) => {
    const nextState = splitUsersByRole(users);
    setAllUsers(nextState.allUsers);
    setTeachers(nextState.teachers);
    setStudents(nextState.students);
  }, []);

  const refreshAdminData = useCallback(async () => {
    let page = 1;
    let totalPages = 1;
    const users = [];

    do {
      const response = await userAPI.getUsers({
        page,
        limit: 100,
        includeProgress: true,
      });

      if (response.status !== 'success') {
        break;
      }

      users.push(...(response.data.users || []));
      totalPages = Number(response.data.totalPages || 1);
      page += 1;
    } while (page <= totalPages);

    applyUsers(users);
  }, [applyUsers]);

  useEffect(() => {
    let cancelled = false;

    const loadAdminData = async () => {
      try {
        await refreshAdminData();
      } catch (error) {
        if (!cancelled) {
          toast.error(handleAPIError(error).message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadAdminData();

    const refreshTimer = window.setInterval(() => {
      refreshAdminData().catch((error) => {
        if (!cancelled) {
          toast.error(handleAPIError(error).message);
        }
      });
    }, ADMIN_DIRECTORY_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [refreshAdminData]);

  return {
    allUsers,
    teachers,
    students,
    isLoading,
    refreshAdminData,
  };
};
