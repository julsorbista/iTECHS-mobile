import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Gamepad2,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Settings2,
  Sparkles,
  Trophy,
  User,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authAPI, handleAPIError, userAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import StudentActionButton from '../components/student/StudentActionButton';
import StudentShell from '../components/student/StudentShell';
import { getStudentGameTheme } from '../components/student/studentGameTheme';
import { useStudentGameCatalog } from '../features/student/useStudentGameCatalog';
import {
  DEFAULT_STUDENT_AVATAR_KEY,
  getStudentAvatarByKey,
  getStudentAvatarCategory,
  STUDENT_AVATAR_GROUPS,
} from '../assets/student-avatars/avatarCatalog';
import studentMenuBackground from '../../assets/Game/game_one/Background/background_menu.avif';
import {
  consumeStudentMenuAudioPrimed,
  setStudentMenuVolume,
  startStudentMenuLoop,
  stopStudentMenuLoop,
  playStudentClickSound,
} from '../utils/studentMenuAudio';

const PANEL_TRANSITION = {
  initial: { opacity: 0, y: 18, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.99 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
};

const DEFAULT_PREFERENCES = Object.freeze({
  musicVolume: 55,
  sfxVolume: 55,
});

const clampPreferenceVolume = (value) => {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_PREFERENCES.volume;
  }

  return Math.max(0, Math.min(100, Math.round(parsedValue)));
};

const MENU_ITEMS = Object.freeze([
  { id: 'play', label: 'Play', Icon: Gamepad2, activeVariant: 'forest' },
  { id: 'materials', label: 'My Class', Icon: BookOpen, activeVariant: 'sand' },
  { id: 'progress', label: 'My Progress', Icon: BarChart3, activeVariant: 'sky' },
  { id: 'leaderboard', label: 'Leaderboard', Icon: Trophy, activeVariant: 'gold' },
  { id: 'profileEditor', label: 'Profile Editor', Icon: User, activeVariant: 'violet' },
  { id: 'settings', label: 'Settings', Icon: Settings2, activeVariant: 'slate' },
]);

const SETTINGS_TABS = Object.freeze([
  { id: 'account', label: 'Account' },
  { id: 'audio', label: 'Audio' },
]);

const STUDENT_AVATAR_STORAGE_KEY = 'studentAvatarSelections';

const PROFILE_EDITOR_TABS = Object.freeze([
  { id: 'girl', label: 'Girl' },
  { id: 'boy', label: 'Boy' },
]);

const formatPercent = (value) => `${Math.round(Number(value || 0))}%`;

const getTeacherDisplayName = (teacher) => {
  if (!teacher) {
    return '';
  }

  const fullName = `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim();
  return fullName || teacher.username || 'Teacher';
};

const getProgressStatus = (game) => {
  const authoredLevels = Number(game?.authoredLevels || 0);
  const completedLevels = Number(game?.completedLevels || 0);

  if (!authoredLevels) {
    return 'Locked';
  }

  if (completedLevels >= authoredLevels) {
    return 'Completed';
  }

  if (completedLevels > 0) {
    return 'In Progress';
  }

  return 'Ready';
};

const getLevelDisplay = (game) => {
  const authoredLevels = Number(game?.authoredLevels || 0);
  const completedLevels = Number(game?.completedLevels || 0);

  if (!authoredLevels) {
    return '--';
  }

  if (completedLevels >= authoredLevels) {
    return `${authoredLevels}/${authoredLevels}`;
  }

  return `${Math.min(completedLevels + 1, authoredLevels)}/${authoredLevels}`;
};

const normalizeCourseCodeInput = (value) => (
  typeof value === 'string'
    ? value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32)
    : ''
);

const formatMaterialFileSize = (value) => {
  const size = Number(value || 0);
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${size} B`;
};

const formatLearningDuration = (seconds) => {
  const totalSeconds = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

const getMaterialDownloadName = (material) => material?.originalFileName || `${material?.title || 'learning-material'}`;
const canOpenMaterial = (material) => Boolean(material?.hasSourceFile) && ['PDF', 'VIDEO'].includes(String(material?.materialType || '').toUpperCase());

const readStoredAvatarSelections = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(STUDENT_AVATAR_STORAGE_KEY);
    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
};

const getStoredAvatarForUser = (userId) => {
  if (!userId) {
    return '';
  }

  const selections = readStoredAvatarSelections();
  return typeof selections[userId] === 'string' ? selections[userId] : '';
};

const setStoredAvatarForUser = (userId, avatarKey) => {
  if (typeof window === 'undefined' || !userId || !avatarKey) {
    return;
  }

  try {
    const currentSelections = readStoredAvatarSelections();
    currentSelections[userId] = avatarKey;
    window.localStorage.setItem(STUDENT_AVATAR_STORAGE_KEY, JSON.stringify(currentSelections));
  } catch (error) {
    // Ignore local fallback persistence failures.
  }
};

const StudentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUser } = useAuth();
  const [activePanel, setActivePanel] = useState('play');
  const [isMobileMenuVisible, setIsMobileMenuVisible] = useState(true);
  const [isMobileGameDetailVisible, setIsMobileGameDetailVisible] = useState(false);
  const [courseEnrollment, setCourseEnrollment] = useState({
    isLoading: true,
    teacher: null,
    courseCode: null,
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [materialsTeacher, setMaterialsTeacher] = useState(null);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialsProgressSummary, setMaterialsProgressSummary] = useState({
    overallProgressPercent: 0,
    completedModules: 0,
    inProgressModules: 0,
    notStartedModules: 0,
    lockedModules: 0,
    averageQuizScore: 0,
    totalTimeSpentSeconds: 0,
    totalXp: 0,
    totalCoins: 0,
  });
  const [materialActionId, setMaterialActionId] = useState('');
  const [courseCodeForm, setCourseCodeForm] = useState('');
  const [courseConfirmCode, setCourseConfirmCode] = useState('');
  const [isUpdatingCourse, setIsUpdatingCourse] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('account');
  const [storedAvatarKey, setStoredAvatarKey] = useState(() => getStoredAvatarForUser(user?.id));
  const [activeAvatarCategory, setActiveAvatarCategory] = useState(() => getStudentAvatarCategory(user?.avatarKey || getStoredAvatarForUser(user?.id)));
  const [selectedAvatarKey, setSelectedAvatarKey] = useState(() => user?.avatarKey || getStoredAvatarForUser(user?.id) || DEFAULT_STUDENT_AVATAR_KEY);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [preferences, setPreferences] = useState(() => {
    try {
      const stored = localStorage.getItem('studentMenuPreferences');
      if (!stored) {
        return DEFAULT_PREFERENCES;
      }

      const parsed = JSON.parse(stored);
      if (typeof parsed?.musicVolume === 'number' || typeof parsed?.sfxVolume === 'number') {
        return {
          ...DEFAULT_PREFERENCES,
          musicVolume: clampPreferenceVolume(parsed.musicVolume),
          sfxVolume: clampPreferenceVolume(parsed.sfxVolume),
        };
      }

      if (typeof parsed?.volume === 'number') {
        const migratedVolume = clampPreferenceVolume(parsed.volume);
        return {
          ...DEFAULT_PREFERENCES,
          musicVolume: migratedVolume,
          sfxVolume: migratedVolume,
        };
      }

      const legacyMusicEnabled = parsed?.music !== false;
      const legacySfxEnabled = parsed?.sfx !== false;
      return {
        ...DEFAULT_PREFERENCES,
        musicVolume: legacyMusicEnabled ? DEFAULT_PREFERENCES.musicVolume : 0,
        sfxVolume: legacySfxEnabled ? DEFAULT_PREFERENCES.sfxVolume : 0,
      };
    } catch (error) {
      return DEFAULT_PREFERENCES;
    }
  });

  const {
    orderedGames,
    selectedGame,
    loading,
    focusedGameType,
    setFocusedGameType,
  } = useStudentGameCatalog();

  const playerName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Player';
  const selectedTrack = selectedGame || orderedGames[0] || null;
  const selectedTheme = getStudentGameTheme(selectedTrack?.gameType);
  const quickTeacherName = courseEnrollment.teacher
    ? getTeacherDisplayName(courseEnrollment.teacher)
    : 'No teacher linked';
  const currentAvatarKey = user?.avatarKey || storedAvatarKey || DEFAULT_STUDENT_AVATAR_KEY;
  const savedAvatar = getStudentAvatarByKey(currentAvatarKey);
  const selectedAvatar = getStudentAvatarByKey(selectedAvatarKey) || getStudentAvatarByKey(DEFAULT_STUDENT_AVATAR_KEY);
  const avatarOptions = STUDENT_AVATAR_GROUPS[activeAvatarCategory] || STUDENT_AVATAR_GROUPS.girl;

  const summary = useMemo(() => {
    const authoredLevels = orderedGames.reduce((sum, game) => sum + Number(game.authoredLevels || 0), 0);
    const completedLevels = orderedGames.reduce((sum, game) => sum + Number(game.completedLevels || 0), 0);
    const totalStars = orderedGames.reduce((sum, game) => sum + Number(game.totalStars || 0), 0);
    const overallProgress = authoredLevels > 0
      ? Math.round((completedLevels / authoredLevels) * 100)
      : 0;

    return {
      authoredLevels,
      completedLevels,
      totalStars,
      overallProgress,
    };
  }, [orderedGames]);

  useEffect(() => {
    const requestedPanel = location.state?.activePanel;
    if (typeof requestedPanel === 'string' && requestedPanel.trim()) {
      setActivePanel(requestedPanel);
      setIsMobileMenuVisible(false);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    try {
      localStorage.setItem('studentMenuPreferences', JSON.stringify(preferences));
    } catch (error) {
      // Ignore local preference persistence failures.
    }
  }, [preferences]);

  useEffect(() => {
    const nextStoredAvatar = getStoredAvatarForUser(user?.id);
    setStoredAvatarKey(nextStoredAvatar);
    const nextAvatarKey = user?.avatarKey || nextStoredAvatar || DEFAULT_STUDENT_AVATAR_KEY;
    setSelectedAvatarKey(nextAvatarKey);
    setActiveAvatarCategory(getStudentAvatarCategory(nextAvatarKey));
  }, [user?.avatarKey, user?.id]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflowY = 'auto';
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowY = 'auto';
    document.documentElement.style.overflowX = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    const cleanups = [];

    const clearUnlockHandlers = () => {
      cleanups.splice(0).forEach((cleanup) => cleanup());
    };

    const attachUnlockHandlers = () => {
      if (typeof window === 'undefined') {
        return;
      }

      const retryPlayback = async () => {
        const result = await startStudentMenuLoop();
        if (result.started) {
          clearUnlockHandlers();
        }
      };

      ['pointerdown', 'keydown', 'touchstart'].forEach((eventName) => {
        window.addEventListener(eventName, retryPlayback, { passive: true });
        cleanups.push(() => window.removeEventListener(eventName, retryPlayback));
      });
    };

    const initializeAudio = async () => {
      consumeStudentMenuAudioPrimed();
      const result = await startStudentMenuLoop();
      if (!disposed && result.blocked) {
        attachUnlockHandlers();
      }
    };

    initializeAudio();

    return () => {
      disposed = true;
      clearUnlockHandlers();
    };
  }, []);

  useEffect(() => {
    setStudentMenuVolume(preferences.musicVolume);

    if (preferences.musicVolume > 0) {
      startStudentMenuLoop();
      return;
    }

    stopStudentMenuLoop({ rewind: false });
  }, [preferences.musicVolume]);

  useEffect(() => {
    const handleClick = () => {
      playStudentClickSound();
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCourseEnrollment = async () => {
      try {
        const response = await userAPI.getMyCourseEnrollment();
        if (cancelled || response.status !== 'success') {
          return;
        }

        setCourseEnrollment({
          isLoading: false,
          teacher: response.data.teacher || null,
          courseCode: response.data.courseCode || null,
        });
        setCourseCodeForm(response.data.courseCode || '');
      } catch (error) {
        if (!cancelled) {
          setCourseEnrollment((current) => ({
            ...current,
            isLoading: false,
          }));
        }
      }
    };

    loadCourseEnrollment();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLeaderboard = async () => {
      if (activePanel !== 'leaderboard') {
        return;
      }

      try {
        setLeaderboardLoading(true);
        const response = await userAPI.getMyLeaderboard();
        if (cancelled || response.status !== 'success') {
          return;
        }

        setLeaderboard(Array.isArray(response.data?.leaderboard) ? response.data.leaderboard : []);
      } catch (error) {
        if (!cancelled) {
          setLeaderboard([]);
        }
      } finally {
        if (!cancelled) {
          setLeaderboardLoading(false);
        }
      }
    };

    loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [activePanel]);

  useEffect(() => {
    let cancelled = false;

    const loadMaterials = async () => {
      try {
        setMaterialsLoading(true);
        const [materialsResponse, summaryResponse] = await Promise.all([
          userAPI.getAssignedLearningMaterials(),
          userAPI.getStudentMaterialsProgressSummary(),
        ]);

        if (cancelled || materialsResponse.status !== 'success') {
          return;
        }

        const assignedMaterials = Array.isArray(materialsResponse.data?.materials) ? materialsResponse.data.materials : [];
        const summaryMaterials = Array.isArray(summaryResponse?.data?.materials) ? summaryResponse.data.materials : [];

        setMaterials(summaryMaterials.length > 0 ? summaryMaterials : assignedMaterials);
        setMaterialsTeacher(materialsResponse.data?.teacher || null);
        setMaterialsProgressSummary(summaryResponse?.data?.summary || {
          overallProgressPercent: 0,
          completedModules: 0,
          inProgressModules: 0,
          notStartedModules: 0,
          lockedModules: 0,
          averageQuizScore: 0,
          totalTimeSpentSeconds: 0,
          totalXp: 0,
          totalCoins: 0,
        });
      } catch (error) {
        if (!cancelled) {
          setMaterials([]);
          setMaterialsTeacher(null);
          setMaterialsProgressSummary({
            overallProgressPercent: 0,
            completedModules: 0,
            inProgressModules: 0,
            notStartedModules: 0,
            lockedModules: 0,
            averageQuizScore: 0,
            totalTimeSpentSeconds: 0,
            totalXp: 0,
            totalCoins: 0,
          });
        }
      } finally {
        if (!cancelled) {
          setMaterialsLoading(false);
        }
      }
    };

    loadMaterials();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    stopStudentMenuLoop({ rewind: true });
    logout();
  };

  const openSelectedGame = () => {
    if (!selectedTrack) {
      return;
    }

    const isPlayable = selectedTrack.isAvailable && Number(selectedTrack.authoredLevels || 0) > 0;
    if (!isPlayable) {
      return;
    }

    navigate(`/student/games/${selectedTrack.gameType}`);
  };

  const handleVolumeChange = (key) => (event) => {
    setPreferences((current) => ({
      ...current,
      [key]: clampPreferenceVolume(event.target.value),
    }));
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Complete both password fields first.');
      return;
    }

    try {
      setIsChangingPassword(true);
      const response = await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.newPassword,
      });

      if (response.status === 'success') {
        setPasswordForm({ currentPassword: '', newPassword: '' });
        toast.success(response.message || 'Password changed successfully.');
      }
    } catch (error) {
      toast.error(handleAPIError(error).message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const submitCourseCodeUpdate = async (rawCourseCode, confirmProgressReset = false) => {
    const nextCourseCode = normalizeCourseCodeInput(rawCourseCode);

    if (!nextCourseCode) {
      toast.error('Enter a teacher course code first.');
      return;
    }

    try {
      setIsUpdatingCourse(true);
      const response = await userAPI.enrollWithCourseCode({
        courseCode: nextCourseCode,
        confirmProgressReset,
      });

      if (response.status === 'success') {
        const nextCode = response.data?.courseCode || nextCourseCode;
        setCourseEnrollment({
          isLoading: false,
          teacher: response.data?.teacher || null,
          courseCode: nextCode,
        });
        setCourseCodeForm(nextCode);
        setCourseConfirmCode('');
        toast.success(response.message || 'Course code updated.');
      }
    } catch (error) {
      const errorInfo = handleAPIError(error);
      if (errorInfo.status === 409 || errorInfo.data?.requiresConfirmation) {
        setCourseConfirmCode(nextCourseCode);
        return;
      }
      toast.error(errorInfo.message);
    } finally {
      setIsUpdatingCourse(false);
    }
  };

  const handleCourseCodeSubmit = (event) => {
    event.preventDefault();

    const nextCourseCode = normalizeCourseCodeInput(courseCodeForm);
    const currentCourseCode = normalizeCourseCodeInput(courseEnrollment.courseCode || '');

    if (currentCourseCode && nextCourseCode && nextCourseCode !== currentCourseCode) {
      setCourseConfirmCode(nextCourseCode);
      return;
    }

    submitCourseCodeUpdate(nextCourseCode, false);
  };

  const confirmCourseCodeReplacement = () => {
    submitCourseCodeUpdate(courseConfirmCode, true);
  };

  const handleSaveAvatar = async () => {
    if (!selectedAvatarKey) {
      toast.error('Choose an avatar first.');
      return;
    }

    try {
      setIsSavingAvatar(true);
      const response = await authAPI.updateProfile({ avatarKey: selectedAvatarKey });

      if (response.status === 'success') {
        const nextUser = response.data || { avatarKey: selectedAvatarKey };
        setStoredAvatarForUser(user?.id, selectedAvatarKey);
        setStoredAvatarKey(selectedAvatarKey);
        updateUser(nextUser);
        toast.success(response.message || 'Avatar updated successfully.');
      }
    } catch (error) {
      const errorInfo = handleAPIError(error);
      setStoredAvatarForUser(user?.id, selectedAvatarKey);
      setStoredAvatarKey(selectedAvatarKey);
      updateUser({ avatarKey: selectedAvatarKey });
      toast.success(
        errorInfo.message === 'Invalid data format'
          ? 'Avatar saved locally for now. Database sync still needs the backend avatar column fix.'
          : 'Avatar saved locally for now.',
      );
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const openMaterialFile = async (material, shouldDownload = false) => {
    try {
      setMaterialActionId(material.id);
      const response = await userAPI.downloadLearningMaterialFile(material.id, { download: shouldDownload });
      const mimeType = response.headers?.['content-type'] || material.mimeType || 'application/octet-stream';
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);

      if (shouldDownload) {
        const link = document.createElement('a');
        link.href = url;
        link.download = getMaterialDownloadName(material);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      }
    } catch (error) {
      toast.error(handleAPIError(error).message);
    } finally {
      setMaterialActionId('');
    }
  };

  const renderPlay = () => (
    <motion.section key="play" className="student-content-stack" {...PANEL_TRANSITION}>
      {loading ? (
        <section className="student-play-layout student-play-skeleton-layout" aria-label="Loading games">
          <div className="student-panel student-play-games-panel student-skeleton-panel">
            <div className="student-panel-head">
              <div className="student-skeleton-copy">
                <span className="student-skeleton-line student-skeleton-line-kicker" />
                <span className="student-skeleton-line student-skeleton-line-title" />
              </div>
              <span className="student-skeleton-pill" />
            </div>
            <div className="student-play-track-grid">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="student-track-button student-play-track-card student-skeleton-card">
                  <span className="student-skeleton-line student-skeleton-line-title" />
                  <span className="student-skeleton-line" />
                  <span className="student-skeleton-pill" />
                </div>
              ))}
            </div>
          </div>

          <div className="student-panel student-play-stage student-skeleton-panel">
            <div className="student-play-stage-header">
              <div className="student-skeleton-copy">
                <span className="student-skeleton-line student-skeleton-line-kicker" />
                <span className="student-skeleton-line student-skeleton-line-heading" />
                <span className="student-skeleton-line student-skeleton-line-wide" />
              </div>
              <span className="student-skeleton-pill" />
            </div>
            <div className="student-play-stage-bottom">
              <div className="student-play-stat-grid student-play-stat-grid-expanded">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="student-inline-summary-card student-skeleton-stat">
                    <span className="student-skeleton-line student-skeleton-line-title" />
                    <span className="student-skeleton-line" />
                  </div>
                ))}
              </div>
              <div className="student-play-actions-panel">
                <span className="student-skeleton-line student-skeleton-line-wide" />
                <span className="student-skeleton-button" />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className={clsx('student-play-layout', isMobileGameDetailVisible && 'student-play-mobile-detail-open')}>
          <div className="student-panel student-play-games-panel">
            <div className="student-panel-head">
              <div>
                <p className="student-eyebrow">Game Menu</p>
                <h2 className="student-section-title">Play</h2>
              </div>
              <span className="student-pill student-pill-muted">{orderedGames.length} games</span>
            </div>

            <div className="student-play-track-grid">
              {orderedGames.map((game) => {
                const isActive = focusedGameType === game.gameType;

                return (
                  <button
                    key={game.gameType}
                    type="button"
                    className={clsx('student-track-button student-play-track-card', isActive && 'student-track-button-active')}
                    onClick={() => {
                      setFocusedGameType(game.gameType);
                      setIsMobileGameDetailVisible(true);
                      window.scrollTo({ top: 0, behavior: 'instant' });
                    }}
                  >
                    <div className="student-play-track-copy">
                      <p className="student-compact-title">{game.shortTitle}</p>
                      <p className="student-compact-helper">{game.title}</p>
                    </div>
                    <div className="student-play-track-meta">
                      <span className="student-pill student-pill-muted">{getProgressStatus(game)}</span>
                      <span className="student-track-progress">{formatPercent(game.progressPercent)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={clsx('student-panel student-play-stage', `student-surface-${selectedTheme.tone}`)}>
            <StudentActionButton
              variant="slate"
              size="compact"
              className="student-play-mobile-back"
              onClick={() => {
                setIsMobileGameDetailVisible(false);
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Games
            </StudentActionButton>
            <div className="student-play-stage-header">
              <div>
                <p className="student-eyebrow">{selectedTrack?.label || 'Game'}</p>
                <h2 className="student-section-title">{selectedTrack?.title || 'Choose a game'}</h2>
                <p className="student-body-copy">
                  {selectedTrack?.description || 'Select one of the available games to start playing.'}
                </p>
              </div>
              <span className="student-pill student-pill-muted">{getProgressStatus(selectedTrack || {})}</span>
            </div>

            <div className="student-play-stage-bottom">
              <div className="student-play-stat-grid student-play-stat-grid-expanded">
                <div className="student-inline-summary-card">
                  <span className="student-inline-summary-value">{formatPercent(selectedTrack?.progressPercent)}</span>
                  <span className="student-inline-summary-label">progress</span>
                </div>
                <div className="student-inline-summary-card">
                  <span className="student-inline-summary-value">{selectedTrack?.completedLevels || 0}</span>
                  <span className="student-inline-summary-label">completed</span>
                </div>
                <div className="student-inline-summary-card">
                  <span className="student-inline-summary-value">{selectedTrack?.totalStars || 0}</span>
                  <span className="student-inline-summary-label">stars</span>
                </div>
                <div className="student-inline-summary-card">
                  <span className="student-inline-summary-value">{selectedTrack?.authoredLevels || 0}</span>
                  <span className="student-inline-summary-label">levels</span>
                </div>
              </div>

              <div className="student-play-actions-panel">
                <div className="student-play-meta">
                  <div>
                    <span className="student-play-meta-label">Next level</span>
                    <strong>{selectedTrack?.nextLevelNumber || '--'}</strong>
                  </div>
                  <div>
                    <span className="student-play-meta-label">Teacher</span>
                    <strong>{quickTeacherName}</strong>
                  </div>
                </div>

                <StudentActionButton
                  variant={selectedTrack?.isAvailable && Number(selectedTrack?.authoredLevels || 0) > 0 ? 'forest' : 'slate'}
                  className="student-button-inline student-play-cta"
                  onClick={openSelectedGame}
                  disabled={!selectedTrack || !selectedTrack.isAvailable || Number(selectedTrack.authoredLevels || 0) <= 0}
                >
                  Open Levels
                  <ChevronRight className="h-4 w-4" />
                </StudentActionButton>
              </div>
            </div>
          </div>
        </section>
      )}
    </motion.section>
  );

  const renderProgress = () => (
    <motion.section key="progress" className="student-content-stack" {...PANEL_TRANSITION}>
      <section className="student-panel student-progress-table-panel student-materials-panel">
        <div className="student-progress-table-header">
          <div>
            <p className="student-eyebrow">Tracker</p>
            <h2 className="student-section-title">My Progress</h2>
          </div>
        </div>

        <div className="space-y-4" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>Overall Progress</p>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <div className="text-4xl font-extrabold text-emerald-700" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>{materialsProgressSummary.overallProgressPercent || 0}%</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-700" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>
                        You've completed {materialsProgressSummary.completedModules || 0} of {materials.length || 0} modules.
                      </p>
                      <div className="mt-3 h-4 overflow-hidden rounded-full border border-slate-200 bg-white">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${materialsProgressSummary.overallProgressPercent || 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>Time Spent Learning</p>
                    <p className="mt-3 text-3xl font-extrabold text-sky-700" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>{formatLearningDuration(materialsProgressSummary.totalTimeSpentSeconds || 0)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>Quiz Performance</p>
                    <p className="mt-3 text-3xl font-extrabold text-violet-700" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>{materialsProgressSummary.averageQuizScore || 0}%</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>XP Earned</p>
                    <p className="mt-3 text-2xl font-extrabold text-amber-700" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>{materialsProgressSummary.totalXp || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>Coins Earned</p>
                    <p className="mt-3 text-2xl font-extrabold text-amber-700" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>{materialsProgressSummary.totalCoins || 0}</p>
                  </div>
                </div>
              </div>
            </article>

            <div className="student-progress-table-wrap" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>
              <table className="student-progress-table student-module-progress-table" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>
                <thead>
                  <tr>
                    <th style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>Module</th>
                    <th style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>Status</th>
                    <th style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>Progress</th>
                    <th style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((material) => (
                      <tr key={material.id} style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>
                        <td data-label="Module">
                          <div className="font-bold text-white" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>{material.title}</div>
                          <div className="text-xs uppercase tracking-[0.14em] text-white/70" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>{material.materialTypeLabel} · {material.section}</div>
                        </td>
                        <td data-label="Status">{material.progress?.statusLabel || 'Not Started'}</td>
                        <td data-label="Progress">
                          <div className="flex items-center gap-3">
                            <div className="h-3 w-40 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                              <div
                                className={clsx(
                                  'h-full rounded-full',
                                  material.progress?.status === 'COMPLETED'
                                    ? 'bg-emerald-500'
                                    : material.progress?.status === 'IN_PROGRESS'
                                      ? 'bg-amber-400'
                                      : material.progress?.status === 'LOCKED'
                                        ? 'bg-slate-300'
                                        : 'bg-slate-200',
                                )}
                                style={{ width: `${material.progress?.percent || 0}%` }}
                              />
                            </div>
                            <span>{material.progress?.percent || 0}%</span>
                          </div>
                        </td>
                        <td data-label="Score">{material.progress?.latestQuizScore ?? '--'}</td>
                      </tr>
                  ))}
                  {!materials.length && (
                    <tr className="student-progress-empty-row">
                      <td colSpan={4}>No module progress available yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>
      </section>
    </motion.section>
  );

  const renderLeaderboard = () => (
    <motion.section key="leaderboard" className="student-content-stack" {...PANEL_TRANSITION}>
      <section className="student-panel student-progress-table-panel">
        <div className="student-progress-table-header">
          <div>
            <p className="student-eyebrow">Class Standing</p>
            <h2 className="student-section-title">Leaderboards</h2>
          </div>
          <div className="student-progress-summary-chips">
            <span>{leaderboard.length} students ranked</span>
          </div>
        </div>

        <div className="student-progress-table-wrap">
          <table className="student-progress-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student Name</th>
                <th>Total Stars</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardLoading && (
                <tr>
                  <td colSpan={3}>Loading leaderboard...</td>
                </tr>
              )}
              {!leaderboardLoading && leaderboard.map((row) => (
                <tr key={row.studentId}>
                  <td>#{row.rank}</td>
                  <td>{row.studentName}</td>
                  <td>{row.totalStars || 0}</td>
                </tr>
              ))}
              {!leaderboardLoading && !leaderboard.length && (
                <tr>
                  <td colSpan={3}>No leaderboard data available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </motion.section>
  );

  const renderCourseContent = () => (
    <div className="student-settings-tab-content">
      <p className="student-eyebrow">Course Code</p>
      <h2 className="student-section-title">{quickTeacherName}</h2>
      <p className="student-body-copy student-body-copy-tight">
        {courseEnrollment.isLoading
          ? 'Checking your current course link...'
          : courseEnrollment.courseCode
            ? `Current code: ${courseEnrollment.courseCode}`
            : 'No active course code.'}
      </p>

      <div className="student-settings-form">
        <form className="student-course-code-form" onSubmit={handleCourseCodeSubmit}>
          <label className="student-field">
            <span className="student-field-label">Teacher code</span>
            <input
              type="text"
              value={courseCodeForm}
              onChange={(event) => setCourseCodeForm(normalizeCourseCodeInput(event.target.value))}
              className="student-field-input"
              placeholder="Enter teacher code"
              autoComplete="off"
              disabled={courseEnrollment.isLoading || isUpdatingCourse}
            />
          </label>

          <div className="student-course-warning">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Replacing your teacher code resets your level progress, attempts, stars, and policies for a fresh course start.
            </span>
          </div>

          <StudentActionButton
            type="submit"
            variant="gold"
            className="student-button-inline student-settings-submit"
            disabled={courseEnrollment.isLoading || isUpdatingCourse}
          >
            {isUpdatingCourse ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Update Course
              </>
            )}
          </StudentActionButton>
        </form>
      </div>
    </div>
  );

  const renderMaterials = () => (
    <motion.section key="materials" className="student-content-stack" {...PANEL_TRANSITION}>
      <section className="student-settings-workspace">
        <div className="student-panel student-settings-card student-settings-stage">
          {renderCourseContent()}
        </div>
      </section>

      <section className="student-panel student-progress-table-panel">
        <div className="student-progress-table-header">
          <div>
            <p className="student-eyebrow">Class Resources</p>
            <h2 className="student-section-title">Learning Materials</h2>
          </div>
          <div className="student-progress-summary-chips">
            <span>{materials.length} material{materials.length === 1 ? '' : 's'}</span>
            <span>{materialsTeacher?.displayName || quickTeacherName}</span>
          </div>
        </div>

        <div className="space-y-4">
          {materialsLoading && (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
              Loading learning materials...
            </div>
          )}

          {!materialsLoading && !courseEnrollment.teacher && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              Connect to a teacher course first to see class learning materials.
            </div>
          )}

          {!materialsLoading && courseEnrollment.teacher && materials.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              No learning materials have been posted for your section yet.
            </div>
          )}

          {!materialsLoading && materials.map((material) => {
            const MaterialIcon = material.hasSourceFile ? (material.materialType === 'VIDEO' ? Video : FileText) : BookOpen;
            const isLocked = material.isLocked;
            const statusLabel = material.progress?.statusLabel || 'Not Started';
            const statusClassName = material.progress?.status === 'COMPLETED'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : material.progress?.status === 'IN_PROGRESS'
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : material.progress?.status === 'LOCKED'
                  ? 'border-slate-300 bg-slate-100 text-slate-500'
                  : 'border-slate-300 bg-white text-slate-700';

            return (
              <article
                key={material.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="student-card-icon student-icon-gold">
                        <MaterialIcon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>{material.title}</h3>
                        <p
                          className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                          style={{ fontFamily: 'Manrope, sans-serif' }}
                        >
                          {material.materialTypeLabel} - {material.section}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {material.subject && (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700" style={{ fontFamily: 'Manrope, sans-serif' }}>{material.subject}</span>
                      )}
                      <span className={clsx('rounded-full border px-3 py-1', statusClassName)} style={{ fontFamily: 'Manrope, sans-serif' }}>{statusLabel}</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700" style={{ fontFamily: 'Manrope, sans-serif' }}>{formatMaterialFileSize(material.fileSize)}</span>
                    </div>

                    {material.description && (
                      <p className="mt-3 text-sm text-slate-600" style={{ fontFamily: 'Manrope, sans-serif' }}>{material.description}</p>
                    )}

                    <p className="mt-3 text-xs text-slate-500" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {material.hasSourceFile
                        ? <>Supporting file: <span className="font-semibold text-slate-700" style={{ fontFamily: 'Manrope, sans-serif' }}>{material.originalFileName}</span></>
                        : 'This lesson is fully built inside the module and does not require a file download.'}
                    </p>

                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-3 flex-1 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                        <div
                          className={clsx(
                            'h-full rounded-full',
                            material.progress?.status === 'COMPLETED'
                              ? 'bg-emerald-500'
                              : material.progress?.status === 'IN_PROGRESS'
                                ? 'bg-amber-400'
                                : material.progress?.status === 'LOCKED'
                                  ? 'bg-slate-300'
                                  : 'bg-slate-200',
                          )}
                          style={{ width: `${material.progress?.percent || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-black text-slate-700">{material.progress?.percent || 0}%</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <StudentActionButton
                      variant={isLocked ? 'slate' : 'forest'}
                      className="student-button-inline"
                      onClick={() => navigate(`/student/materials/${material.id}`)}
                      disabled={isLocked}
                    >
                      {isLocked ? <Lock className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                      {isLocked ? 'Locked' : 'Start Module'}
                    </StudentActionButton>
                    {material.hasSourceFile ? (
                      <StudentActionButton
                        variant="slate"
                        className="student-button-inline"
                        onClick={() => openMaterialFile(material, true)}
                        disabled={materialActionId === material.id}
                      >
                        <Download className="h-4 w-4" />
                        {materialActionId === material.id ? 'Downloading...' : 'Download'}
                      </StudentActionButton>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </motion.section>
  );

  const renderSettingsContent = () => {
    if (activeSettingsTab === 'account') {
      return (
        <div className="student-settings-tab-content">
          <p className="student-eyebrow">Account</p>
          <h2 className="student-section-title">Account Settings</h2>

          <div className="student-settings-form">
            <label className="student-field">
              <span className="student-field-label">Old password</span>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                className="student-field-input"
                placeholder="Enter current password"
              />
            </label>

            <label className="student-field">
              <span className="student-field-label">New password</span>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                className="student-field-input"
                placeholder="Enter new password"
              />
            </label>

            <StudentActionButton
              variant="gold"
              className="student-button-inline student-settings-submit"
              onClick={handleChangePassword}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? 'Updating...' : 'Change Password'}
            </StudentActionButton>
          </div>
        </div>
      );
    }

    return (
      <div className="student-settings-tab-content">
        <p className="student-eyebrow">Audio</p>
        <h2 className="student-section-title">Menu Sound</h2>

        <div className="student-settings-audio-stack">
          <div className="student-setting-card">
            <div className="student-setting-copy">
              <span className={clsx('student-card-icon', preferences.musicVolume > 0 ? 'student-icon-emerald' : 'student-icon-slate')}>
                {preferences.musicVolume > 0 ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </span>
              <div>
                <h3 className="student-setting-title">Music</h3>
                <p className="student-body-copy student-body-copy-tight">
                  Control the volume for menu background music.
                </p>
              </div>
            </div>
            <div className="student-volume-control">
              <div className="student-volume-slider-wrap">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={preferences.musicVolume}
                  onChange={handleVolumeChange('musicVolume')}
                  className="student-volume-slider"
                  aria-label="Music volume"
                />
                <div className="student-volume-slider-scale">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
              <div className="student-volume-value">
                <Sparkles className="h-4 w-4" />
                <span>{preferences.musicVolume}%</span>
              </div>
            </div>
          </div>

          <div className="student-setting-card">
            <div className="student-setting-copy">
              <span className={clsx('student-card-icon', preferences.sfxVolume > 0 ? 'student-icon-sky' : 'student-icon-slate')}>
                {preferences.sfxVolume > 0 ? <Sparkles className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </span>
              <div>
                <h3 className="student-setting-title">Sound FX</h3>
                <p className="student-body-copy student-body-copy-tight">
                  Control the volume for button and interface sounds.
                </p>
              </div>
            </div>
            <div className="student-volume-control">
              <div className="student-volume-slider-wrap">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={preferences.sfxVolume}
                  onChange={handleVolumeChange('sfxVolume')}
                  className="student-volume-slider"
                  aria-label="Sound effects volume"
                />
                <div className="student-volume-slider-scale">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
              <div className="student-volume-value">
                <Sparkles className="h-4 w-4" />
                <span>{preferences.sfxVolume}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <motion.section key="settings" className="student-content-stack" {...PANEL_TRANSITION}>
      <section className="student-settings-workspace">
        <div className="student-panel student-settings-card student-settings-tabs-panel">
          <div>
            <p className="student-eyebrow">Settings</p>
            <h2 className="student-section-title">Preferences</h2>
          </div>

          <div className="student-settings-tabs">
            {SETTINGS_TABS.map((tab) => (
              <StudentActionButton
                key={tab.id}
                variant={activeSettingsTab === tab.id ? 'gold' : 'slate'}
                className="student-settings-tab-button"
                contentClassName="justify-center"
                onClick={() => setActiveSettingsTab(tab.id)}
              >
                {tab.label}
              </StudentActionButton>
            ))}
          </div>
        </div>

        <div className="student-panel student-settings-card student-settings-stage">
          {renderSettingsContent()}
        </div>
      </section>
    </motion.section>
  );

  const renderProfileEditor = () => (
    <motion.section key="profileEditor" className="student-content-stack" {...PANEL_TRANSITION}>
      <section className="student-profile-editor-layout">
        <div className="student-panel student-profile-editor-preview-panel">
          <div>
            <p className="student-eyebrow">Character Menu</p>
            <h2 className="student-section-title">Profile Editor</h2>
            <p className="student-body-copy student-body-copy-tight">
              Choose a pixel avatar for your account. Your preview updates instantly, and the saved choice appears in the sidebar.
            </p>
          </div>

          <div className="student-profile-editor-preview-frame">
            {selectedAvatar ? (
              <img
                src={selectedAvatar.image}
                alt={selectedAvatar.label}
                className="student-profile-editor-preview-image"
              />
            ) : (
              <div className="student-profile-editor-preview-empty">Pick an avatar</div>
            )}
          </div>

          <div className="student-profile-editor-preview-meta">
            <span className="student-pill student-pill-muted">
              {savedAvatar?.id === selectedAvatarKey ? 'Saved Avatar' : 'Preview'}
            </span>
            <strong>{selectedAvatar?.label || 'No avatar selected'}</strong>
          </div>

          <StudentActionButton
            variant="forest"
            className="student-profile-editor-save-button"
            contentClassName="justify-center"
            onClick={handleSaveAvatar}
            disabled={isSavingAvatar}
          >
            {isSavingAvatar ? 'Saving...' : 'Customize'}
          </StudentActionButton>
        </div>

        <div className="student-panel student-profile-editor-selection-panel">
          <div className="student-profile-editor-selection-head">
            <div>
              <p className="student-eyebrow">Category Tabs</p>
              <h2 className="student-section-title">Choose a Character</h2>
              <p className="student-body-copy student-body-copy-tight">
                Switch between the girl and boy tabs, then pick the avatar you want to preview and save.
              </p>
            </div>

            <div className="student-profile-editor-tabs" role="tablist" aria-label="Avatar categories">
              {PROFILE_EDITOR_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeAvatarCategory === tab.id}
                  className={clsx(
                    'student-profile-editor-tab-button',
                    activeAvatarCategory === tab.id && 'student-profile-editor-tab-button-active',
                  )}
                  onClick={() => setActiveAvatarCategory(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="student-profile-editor-grid">
            {avatarOptions.map((avatar) => {
              const isActive = avatar.id === selectedAvatarKey;

              return (
                <button
                  key={avatar.id}
                  type="button"
                  className={clsx('student-profile-editor-option', isActive && 'student-profile-editor-option-active')}
                  onClick={() => {
                    setSelectedAvatarKey(avatar.id);
                    setActiveAvatarCategory(avatar.category);
                  }}
                >
                  <img
                    src={avatar.image}
                    alt={avatar.label}
                    className="student-profile-editor-option-image"
                  />
                  <span className="student-profile-editor-option-label">{avatar.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </motion.section>
  );

  const renderActivePanel = () => {
    switch (activePanel) {
      case 'progress':
        return renderProgress();
      case 'leaderboard':
        return renderLeaderboard();
      case 'materials':
        return renderMaterials();
      case 'profileEditor':
        return renderProfileEditor();
      case 'settings':
        return renderSettings();
      case 'play':
      default:
        return renderPlay();
    }
  };

  return (
    <StudentShell backgroundImage={studentMenuBackground} className="student-shell-warm student-shell-scroll">
      <main className="student-shell-main student-shell-main-compact">
        <section className={clsx(
          'student-shell-layout',
          isMobileMenuVisible ? 'student-mobile-menu-open' : 'student-mobile-panel-open',
        )}>
          <aside className="student-menu-rail">
            <div className="student-menu-rail-head">
              <p className="student-eyebrow">Menu</p>
              <h1 className="student-hero-title">iTECHS</h1>
            </div>

            <div className="student-menu-rail-buttons">
              {MENU_ITEMS.map(({ id, label, Icon, activeVariant }) => {
                const isActive = activePanel === id;

                return (
                  <StudentActionButton
                    key={id}
                    variant={isActive ? activeVariant : 'slate'}
                    className="student-menu-rail-action"
                    contentClassName="justify-center"
                    onClick={() => {
                      setActivePanel(id);
                      setIsMobileMenuVisible(false);
                      setIsMobileGameDetailVisible(false);
                      window.scrollTo({ top: 0, behavior: 'instant' });
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </StudentActionButton>
                );
              })}
            </div>

            <div className="student-menu-rail-footer">
              <div className="student-menu-avatar-card">
                <span className="student-menu-avatar-label">Avatar</span>
                <div className="student-menu-avatar-frame">
                  {savedAvatar ? (
                    <img
                      src={savedAvatar.image}
                      alt={savedAvatar.label}
                      className="student-menu-avatar-image"
                    />
                  ) : (
                    <div className="student-menu-avatar-placeholder">
                      <span>Select an avatar in Profile Editor</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="student-menu-account-card">
                <span className="student-menu-account-label">Student</span>
                <strong className="student-menu-account-name">{playerName}</strong>
              </div>

              <StudentActionButton
                variant="slate"
                size="compact"
                className="student-menu-logout-button"
                onClick={handleLogout}
                aria-label="Logout"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </StudentActionButton>
            </div>
          </aside>

          <div className="student-shell-content">
            <StudentActionButton
              variant="slate"
              size="compact"
              className="student-mobile-panel-back"
              onClick={() => {
                setIsMobileMenuVisible(true);
                setIsMobileGameDetailVisible(false);
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Menu
            </StudentActionButton>
            <AnimatePresence mode="wait">
              {renderActivePanel()}
            </AnimatePresence>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {courseConfirmCode && (
          <motion.div
            className="student-modal-backdrop student-course-confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <motion.div
              className="student-modal-card student-course-confirm-card"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="student-card-icon student-course-confirm-icon">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <p className="student-eyebrow">Confirm Course Change</p>
              <h2 className="student-section-title">Reset progress?</h2>
              <p className="student-body-copy">
                Replacing your teacher code with <strong>{courseConfirmCode}</strong> will reset your game progress for the new course.
              </p>
              <div className="student-course-confirm-actions">
                <StudentActionButton
                  variant="slate"
                  className="student-button-inline"
                  onClick={() => setCourseConfirmCode('')}
                  disabled={isUpdatingCourse}
                >
                  Cancel
                </StudentActionButton>
                <StudentActionButton
                  variant="gold"
                  className="student-button-inline"
                  onClick={confirmCourseCodeReplacement}
                  disabled={isUpdatingCourse}
                >
                  {isUpdatingCourse ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Replacing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Replace & Reset
                    </>
                  )}
                </StudentActionButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </StudentShell>
  );
};

export default StudentPage;
