import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Download,
  FileText,
  Gamepad2,
  LogOut,
  Settings2,
  Trophy,
  User,
  Video,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import StudentShell from '../components/student/StudentShell';
import StudentActionButton from '../components/student/StudentActionButton';
import { useAuth } from '../context/AuthContext';
import api, { handleAPIError, userAPI, examAPI, resolveApiAssetUrl } from '../utils/api';
import {
  DEFAULT_STUDENT_AVATAR_KEY,
  getStudentAvatarByKey,
} from '../assets/student-avatars/avatarCatalog';
import studentMenuBackground from '../../assets/Game/game_one/Background/background_menu.avif';
import {
  getStudentAudioVolumePreference,
  getStudentSfxVolumePreference,
  playStudentClickSound,
  setStudentMenuVolume,
  startStudentMenuLoop,
  stopStudentMenuLoop,
} from '../utils/studentMenuAudio';

const RESULT_STORAGE_PREFIX = 'student-material-result:';
const QUIZ_DRAFT_STORAGE_PREFIX = 'student-material-quiz-draft:';

const formatFileSize = (value) => {
  const size = Number(value || 0);
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${size} B`;
};

const formatDuration = (seconds) => {
  const totalSeconds = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const formatClock = (seconds) => {
  const totalSeconds = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const splitPreviewBlocks = (value) => {
  const text = String(value || '').replace(/\r/g, '\n');
  const lineBlocks = text
    .split(/\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (lineBlocks.length > 0) {
    return lineBlocks;
  }

  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const buildSlideBullets = (value, fallbackTitle = '') => {
  const bulletCandidates = splitPreviewBlocks(value)
    .flatMap((entry) => entry.split(/\s*[•\-]\s+/))
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (bulletCandidates.length > 0) {
    return bulletCandidates.slice(0, 5);
  }

  if (fallbackTitle) {
    return [`Review the key ideas for ${fallbackTitle}.`];
  }

  return ['Review the uploaded lesson content for this slide.'];
};

const chunkArray = (items, size) => {
  const normalizedSize = Math.max(1, Number(size || 1));
  const normalizedItems = Array.isArray(items) ? items : [];
  const chunks = [];

  for (let index = 0; index < normalizedItems.length; index += normalizedSize) {
    chunks.push(normalizedItems.slice(index, index + normalizedSize));
  }

  return chunks;
};

const LessonMediaImage = ({ source, alt, className, onOpen }) => {
  const [displaySource, setDisplaySource] = useState('');

  useEffect(() => {
    let disposed = false;
    let objectUrl = '';
    const rawSource = String(source || '').trim();

    if (!rawSource) {
      setDisplaySource('');
      return undefined;
    }

    if (/^(?:data:|blob:)/i.test(rawSource)) {
      setDisplaySource(rawSource);
      return undefined;
    }

    const loadImage = async () => {
      try {
        const requestUrl = rawSource.startsWith('/api/')
          ? rawSource.slice('/api'.length)
          : resolveApiAssetUrl(rawSource);
        const response = await api.get(requestUrl, { responseType: 'blob' });
        if (disposed) return;
        objectUrl = URL.createObjectURL(response.data);
        setDisplaySource(objectUrl);
      } catch {
        if (!disposed) setDisplaySource(resolveApiAssetUrl(rawSource));
      }
    };

    loadImage();
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source]);

  return (
    <button
      type="button"
      onClick={() => displaySource && onOpen?.(displaySource)}
      className="block w-full cursor-zoom-in"
      aria-label={`Open ${alt} in fullscreen`}
      disabled={!displaySource}
    >
      {displaySource ? (
        <img src={displaySource} alt={alt} className={className} />
      ) : (
        <span className="block h-24 w-full animate-pulse bg-slate-100" aria-label="Loading image" />
      )}
    </button>
  );
};

const LessonMediaVideo = ({ video }) => {
  const [displaySource, setDisplaySource] = useState('');

  useEffect(() => {
    let disposed = false;
    let objectUrl = '';
    const rawSource = String(video?.src || video?.url || '').trim();

    if (!rawSource) {
      setDisplaySource('');
      return undefined;
    }

    const loadVideo = async () => {
      try {
        const requestUrl = rawSource.startsWith('/api/')
          ? rawSource.slice('/api'.length)
          : resolveApiAssetUrl(rawSource);
        const response = await api.get(requestUrl, { responseType: 'blob', timeout: 30000 });
        if (disposed) return;
        objectUrl = URL.createObjectURL(response.data);
        setDisplaySource(objectUrl);
      } catch {
        if (!disposed) setDisplaySource(resolveApiAssetUrl(rawSource));
      }
    };

    loadVideo();
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [video?.src, video?.url]);

  if (!displaySource) {
    return <div className="mb-8 h-44 w-full animate-pulse rounded-[24px] bg-slate-100" aria-label="Loading lesson video" />;
  }

  return (
    <figure className="mx-auto mb-8 overflow-hidden rounded-[24px] border border-slate-200 bg-black shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
      <video className="max-h-[520px] w-full bg-black" controls controlsList="nodownload" preload="metadata" playsInline>
        <source src={displaySource} type={video?.mimeType || 'video/mp4'} />
        Your device does not support this lesson video.
      </video>
      {video?.caption ? (
        <figcaption className="bg-white px-4 py-3 text-sm text-slate-600" style={{ fontFamily: NORMAL_LESSON_FONT }}>
          {video.caption}
        </figcaption>
      ) : null}
    </figure>
  );
};


const NORMAL_LESSON_FONT = 'Manrope, "Segoe UI", system-ui, sans-serif';
const getStatusChipClass = (status) => {
  if (status === 'COMPLETED') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  }

  if (status === 'IN_PROGRESS') {
    return 'border-amber-300 bg-amber-50 text-amber-700';
  }

  if (status === 'LOCKED') {
    return 'border-slate-300 bg-slate-100 text-slate-500';
  }

  return 'border-slate-300 bg-white text-slate-700';
};

const getStarsFromScore = (score) => {
  const numericScore = Number(score || 0);
  if (numericScore >= 85) {
    return 3;
  }
  if (numericScore >= 70) {
    return 2;
  }
  if (numericScore >= 50) {
    return 1;
  }
  return 0;
};

const readStoredQuizDraft = (materialId) => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(`${QUIZ_DRAFT_STORAGE_PREFIX}${materialId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveStoredQuizDraft = (materialId, value) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(`${QUIZ_DRAFT_STORAGE_PREFIX}${materialId}`, JSON.stringify(value));
};

const clearStoredQuizDraft = (materialId) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(`${QUIZ_DRAFT_STORAGE_PREFIX}${materialId}`);
};

const normalizeQuizOptions = (value) => {
  if (Array.isArray(value)) {
    return value.map((option) => String(option || '').trim()).filter(Boolean);
  }

  const storedValue = String(value || '').trim();
  if (!storedValue) return [];

  try {
    const parsed = JSON.parse(storedValue);
    if (Array.isArray(parsed)) {
      return parsed.map((option) => String(option || '').trim()).filter(Boolean);
    }
  } catch {
    // Support older API responses that use delimited option text.
  }

  return storedValue.split(/\r?\n|\s*\|\s*|\s*,\s*/).map((option) => option.trim()).filter(Boolean);
};

const saveStoredResult = (attemptId, value) => {
  if (typeof window === 'undefined' || !attemptId) {
    return;
  }

  window.localStorage.setItem(`${RESULT_STORAGE_PREFIX}${attemptId}`, JSON.stringify(value));
};

const readStoredResult = (attemptId) => {
  if (typeof window === 'undefined' || !attemptId) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(`${RESULT_STORAGE_PREFIX}${attemptId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const PixelHeaderActionButton = ({
  children,
  onClick,
  disabled = false,
  className = '',
  ...rest
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    {...rest}
    className={clsx(
      'inline-flex min-w-[176px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border-[3px] border-[#8b5e3c] bg-[#f7e5b9] px-5 py-3 text-base font-extrabold tracking-[0.01em] text-[#2f2016] shadow-[4px_4px_0_#5c412b] transition',
      disabled ? 'cursor-not-allowed opacity-60' : 'hover:translate-y-[1px] hover:shadow-[3px_3px_0_#5c412b]',
      className,
    )}
    style={{ fontFamily: NORMAL_LESSON_FONT }}
  >
    {children}
  </button>
);

const PixelFooterNavButton = ({
  children,
  onClick,
  disabled = false,
  align = 'left',
  Icon,
  iconSide = 'left',
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={clsx(
      'inline-flex min-w-[118px] items-center gap-2 rounded-[10px] border-[3px] border-[#8b5e3c] bg-[#f7e5b9] px-5 py-3 text-base font-extrabold tracking-[0.01em] text-[#2f2016] shadow-[4px_4px_0_#5c412b] transition',
      align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start',
      disabled ? 'cursor-not-allowed opacity-60' : 'hover:translate-y-[1px] hover:shadow-[3px_3px_0_#5c412b]',
    )}
    style={{ fontFamily: NORMAL_LESSON_FONT }}
  >
    {Icon && iconSide === 'left' ? <Icon className="h-4 w-4" /> : null}
    <span>{children}</span>
    {Icon && iconSide === 'right' ? <Icon className="h-4 w-4" /> : null}
  </button>
);

const MATERIAL_PAGE_MENU_ITEMS = Object.freeze([
  { id: 'play', label: 'Play', Icon: Gamepad2, activeVariant: 'forest' },
  { id: 'progress', label: 'My Progress', Icon: BarChart3, activeVariant: 'sky' },
  { id: 'leaderboard', label: 'Leaderboard', Icon: Trophy, activeVariant: 'gold' },
  { id: 'materials', label: 'Materials', Icon: BookOpen, activeVariant: 'sand' },
  { id: 'profileEditor', label: 'Profile Editor', Icon: User, activeVariant: 'violet' },
  { id: 'settings', label: 'Settings', Icon: Settings2, activeVariant: 'slate' },
]);

const StudentMaterialPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { materialId, attemptId } = useParams();
  const { user, logout } = useAuth();
  const mode = location.pathname.includes('/quiz')
    ? 'quiz'
    : location.pathname.includes('/result/')
      ? 'result'
      : 'viewer';

  const [detailLoading, setDetailLoading] = useState(mode !== 'result');
  const [materialDetail, setMaterialDetail] = useState(null);
  const [activeOutlineIndex, setActiveOutlineIndex] = useState(0);
  const [activeLessonPageIndex, setActiveLessonPageIndex] = useState(0);
  const [outlineTab, setOutlineTab] = useState('outline');
  const [isMobileOutlineVisible, setIsMobileOutlineVisible] = useState(false);
  const [outlineSearch, setOutlineSearch] = useState('');
  const [expandedSectionIds, setExpandedSectionIds] = useState([]);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [quizLoading, setQuizLoading] = useState(mode === 'quiz');
  const [quizData, setQuizData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [resultLoading, setResultLoading] = useState(mode === 'result');
  const [resultData, setResultData] = useState(null);
  const [showReviewAnswers, setShowReviewAnswers] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [maxViewedOutlineIndex, setMaxViewedOutlineIndex] = useState(0);
  const [showAudioControls, setShowAudioControls] = useState(false);
  const [audioPreferences, setAudioPreferences] = useState(() => ({
    musicVolume: getStudentAudioVolumePreference(),
    sfxVolume: getStudentSfxVolumePreference(),
  }));
  const hasStartedRef = useRef(false);
  const initialProgressLoadedRef = useRef(false);
  const lastSavedProgressKeyRef = useRef('');
  const progressTickStartedAtRef = useRef(Date.now());
  const previewTopRef = useRef(null);
  const audioControlsRef = useRef(null);

  useEffect(() => {
    setStudentMenuVolume(audioPreferences.musicVolume);
    if (audioPreferences.musicVolume > 0) {
      startStudentMenuLoop();
    } else {
      stopStudentMenuLoop({ rewind: false });
    }

    try {
      window.localStorage.setItem('studentMenuPreferences', JSON.stringify(audioPreferences));
    } catch (error) {
      // Ignore storage failures in restricted browser contexts.
    }
  }, [audioPreferences]);

  useEffect(() => {
    const playModuleClickSound = (event) => {
      if (event.target.closest('button, a')) {
        playStudentClickSound();
      }
    };
    document.addEventListener('click', playModuleClickSound);
    return () => document.removeEventListener('click', playModuleClickSound);
  }, []);

  useEffect(() => {
    const retryMusicAfterInteraction = () => {
      if (getStudentAudioVolumePreference() > 0) {
        startStudentMenuLoop();
      }
    };
    window.addEventListener('pointerdown', retryMusicAfterInteraction, { once: true });
    window.addEventListener('keydown', retryMusicAfterInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', retryMusicAfterInteraction);
      window.removeEventListener('keydown', retryMusicAfterInteraction);
    };
  }, []);

  useEffect(() => {
    const closeAudioControls = (event) => {
      if (!audioControlsRef.current?.contains(event.target)) {
        setShowAudioControls(false);
      }
    };
    window.addEventListener('pointerdown', closeAudioControls);
    return () => window.removeEventListener('pointerdown', closeAudioControls);
  }, []);

  const updateAudioPreference = (key) => (event) => {
    const nextVolume = Math.max(0, Math.min(100, Number(event.target.value) || 0));
    setAudioPreferences((current) => {
      const nextPreferences = { ...current, [key]: nextVolume };
      try {
        window.localStorage.setItem('studentMenuPreferences', JSON.stringify(nextPreferences));
      } catch (error) {
        // Ignore storage failures in restricted browser contexts.
      }

      if (key === 'musicVolume') {
        setStudentMenuVolume(nextVolume);
        if (nextVolume > 0) {
          startStudentMenuLoop();
        } else {
          stopStudentMenuLoop({ rewind: false });
        }
      }

      return nextPreferences;
    });
  };

  const previewSoundEffect = () => {
    if (getStudentSfxVolumePreference() > 0) {
      playStudentClickSound();
    }
  };

  const avatar = getStudentAvatarByKey(user?.avatarKey || DEFAULT_STUDENT_AVATAR_KEY);

  const outlineItems = useMemo(() => (
    materialDetail?.outlineItems
      || materialDetail?.outline?.flatMap((section) => section.items.map((item) => ({
        ...item,
        sectionTitle: section.title,
      })))
      || []
  ), [materialDetail]);
  const outlineSections = useMemo(() => (
    Array.isArray(materialDetail?.outline) && materialDetail.outline.length > 0
      ? materialDetail.outline
      : []
  ), [materialDetail?.outline]);

  const viewerItems = outlineItems;
  const effectivePageCount = viewerItems.length;
  const activeOutlineItem = viewerItems[activeOutlineIndex] || null;
  const activeSubtopics = useMemo(() => (
    Array.isArray(activeOutlineItem?.subtopics) ? activeOutlineItem.subtopics : []
  ), [activeOutlineItem?.subtopics]);
  const activeLessonPages = useMemo(() => (
    [
      {
        id: `${activeOutlineItem?.id || 'lesson'}-main`,
        type: 'main',
        title: activeOutlineItem?.title || materialDetail?.title || 'Lesson',
      },
      ...activeSubtopics.map((subtopic, index) => ({
        id: subtopic.id || `${activeOutlineItem?.id || 'lesson'}-subtopic-${index + 1}`,
        type: 'subtopic',
        title: subtopic.title || `Submodule ${index + 1}`,
        subtopic,
      })),
    ]
  ), [activeOutlineItem?.id, activeOutlineItem?.title, activeSubtopics, materialDetail?.title]);
  const currentLessonPage = activeLessonPages[activeLessonPageIndex] || activeLessonPages[0] || null;
  const isCurrentOutlineItemFullyViewed = activeLessonPages.length > 0 && activeLessonPageIndex >= activeLessonPages.length - 1;
  const completedOutlineCount = useMemo(() => {
    const outlineCount = Number(materialDetail?.progress?.outlineCount || effectivePageCount || viewerItems.length || 0);
    if (outlineCount <= 0) {
      return 0;
    }

    const savedCompletedCount = Math.max(
      0,
      Math.min(
        outlineCount,
        Math.round((Math.max(0, Number(materialDetail?.progress?.percent || 0)) / 100) * outlineCount),
      ),
    );

    let normalizedCompletedCount = savedCompletedCount;
    if (
      materialDetail?.progress?.status !== 'COMPLETED'
      && !isCurrentOutlineItemFullyViewed
      && savedCompletedCount === activeOutlineIndex + 1
    ) {
      normalizedCompletedCount = Math.max(0, savedCompletedCount - 1);
    }

    if (isCurrentOutlineItemFullyViewed) {
      normalizedCompletedCount = Math.max(normalizedCompletedCount, activeOutlineIndex + 1);
    }

    return Math.max(0, Math.min(outlineCount, normalizedCompletedCount));
  }, [
    activeLessonPageIndex,
    activeLessonPages.length,
    activeOutlineIndex,
    effectivePageCount,
    isCurrentOutlineItemFullyViewed,
    materialDetail?.progress?.outlineCount,
    materialDetail?.progress?.percent,
    materialDetail?.progress?.status,
    viewerItems.length,
  ]);
  const displayProgressPercent = useMemo(() => {
    const outlineCount = Number(materialDetail?.progress?.outlineCount || effectivePageCount || viewerItems.length || 0);
    if (outlineCount <= 0) {
      return Math.max(0, Math.min(100, Number(materialDetail?.progress?.percent || 0)));
    }

    return Math.round((completedOutlineCount / outlineCount) * 100);
  }, [completedOutlineCount, effectivePageCount, materialDetail?.progress?.outlineCount, materialDetail?.progress?.percent, viewerItems.length]);
  const canAccessQuiz = useMemo(() => {
    if (viewerItems.length === 0) {
      return true;
    }

    return (
      materialDetail?.progress?.status === 'COMPLETED'
      || displayProgressPercent >= 100
      || completedOutlineCount >= viewerItems.length
    );
  }, [completedOutlineCount, displayProgressPercent, materialDetail?.progress?.status, viewerItems.length]);
  const lessonSourceBlocks = useMemo(() => {
    const extractedBlocks = splitPreviewBlocks(materialDetail?.previewText);
    const descriptionBlocks = splitPreviewBlocks(materialDetail?.description);
    return extractedBlocks.length > 0 ? extractedBlocks : descriptionBlocks;
  }, [materialDetail?.description, materialDetail?.previewText]);
  const lessonNarrativeChunks = useMemo(() => {
    const blockGroupSize = viewerItems.length > 0
      ? Math.max(1, Math.ceil(Math.max(lessonSourceBlocks.length, 1) / viewerItems.length))
      : Math.max(1, Math.ceil(Math.max(lessonSourceBlocks.length, 1) / 3));

    return chunkArray(lessonSourceBlocks, blockGroupSize);
  }, [lessonSourceBlocks, viewerItems.length]);
  const lessonObjectives = useMemo(() => {
    const outlineObjectives = viewerItems
      .map((item) => item?.title)
      .filter(Boolean)
      .slice(0, 4);

    if (outlineObjectives.length > 0) {
      return outlineObjectives;
    }

    return lessonSourceBlocks.slice(0, 3);
  }, [lessonSourceBlocks, viewerItems]);
  const lessonOverview = useMemo(() => (
    materialDetail?.description
      || lessonSourceBlocks[0]
      || `Study the lesson content for ${materialDetail?.title || 'this module'} and complete the connected quiz at the end.`
  ), [lessonSourceBlocks, materialDetail?.description, materialDetail?.title]);
  const lessonSummary = useMemo(() => (
    lessonSourceBlocks.at(-1)
      || `Review the lesson points for ${materialDetail?.title || 'this module'} before moving to the quiz.`
  ), [lessonSourceBlocks, materialDetail?.title]);
  const activeLessonNarrative = useMemo(() => {
    const authoredContentBlocks = splitPreviewBlocks(activeOutlineItem?.content);
    if (authoredContentBlocks.length > 0) {
      return authoredContentBlocks;
    }

    const narrativeChunks = lessonNarrativeChunks[activeOutlineIndex] || [];

    if (narrativeChunks.length > 0) {
      return narrativeChunks;
    }

    if (activeOutlineItem?.title) {
      return [
        `${activeOutlineItem.title} is one of the key parts of ${materialDetail?.title || 'this lesson'}.`,
        lessonOverview,
      ];
    }

    return [lessonOverview];
  }, [activeOutlineIndex, activeOutlineItem?.content, activeOutlineItem?.title, lessonNarrativeChunks, lessonOverview, materialDetail?.title]);
  const activeLessonBullets = useMemo(() => {
    const supportingBullets = buildSlideBullets(
      activeLessonNarrative.join('\n'),
      activeOutlineItem?.title || materialDetail?.title,
    );

    return supportingBullets.slice(0, 4);
  }, [activeLessonNarrative, activeOutlineItem?.title, materialDetail?.title]);
  const estimatedLessonMinutes = useMemo(() => (
    Math.max(
      5,
      (viewerItems.length > 0 ? viewerItems.length * 3 : 0) + Math.max(0, Math.round(lessonSourceBlocks.length / 2)),
    )
  ), [lessonSourceBlocks.length, viewerItems.length]);
  const activeSectionId = activeOutlineItem?.sectionId || null;
  const quizLocked = !canAccessQuiz;
  const filteredOutlineSections = useMemo(() => {
    const query = outlineSearch.trim().toLowerCase();
    if (!query) {
      return outlineSections;
    }

    return outlineSections
      .map((section) => ({
        ...section,
        items: (Array.isArray(section.items) ? section.items : []).filter((item) => {
          const title = String(item?.title || '').toLowerCase();
          const content = String(item?.content || '').toLowerCase();
          return title.includes(query) || content.includes(query) || String(section?.title || '').toLowerCase().includes(query);
        }),
      }))
      .filter((section) => String(section?.title || '').toLowerCase().includes(query) || section.items.length > 0);
  }, [outlineSearch, outlineSections]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const openFullscreenImage = (image) => {
    if (!image?.src) {
      return;
    }

    setFullscreenImage({
      src: image.src,
      alt: image.alt || materialDetail?.title || 'Image preview',
      caption: image.caption || '',
    });
  };

  const closeFullscreenImage = () => {
    setFullscreenImage(null);
  };

  const navigateBackToMaterials = () => {
    navigate('/student', { state: { activePanel: 'materials' } });
  };

  const navigateBackToModule = () => {
    navigate(`/student/materials/${materialId}`);
  };

  const navigateBackToProgress = () => {
    navigate('/student', { state: { activePanel: 'progress' } });
  };

  const openQuizFromViewer = () => {
    if (quizLocked) {
      toast('Finish all slides first to unlock the quiz.');
      return;
    }

    navigate(`/student/materials/${materialId}/quiz`);
  };

  const openMaterialFile = async (shouldDownload = false) => {
    if (!materialDetail) {
      return;
    }

    try {
      const response = await userAPI.downloadLearningMaterialFile(materialDetail.id, { download: shouldDownload });
      const mimeType = response.headers?.['content-type'] || materialDetail.mimeType || 'application/octet-stream';
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);

      if (shouldDownload) {
        const link = document.createElement('a');
        link.href = url;
        link.download = materialDetail.originalFileName || `${materialDetail.title || 'learning-material'}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        return;
      }

      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast.error(handleAPIError(error).message);
    }
  };

  useEffect(() => {
    if (effectivePageCount <= 0) {
      return;
    }

    setActiveOutlineIndex((current) => Math.max(0, Math.min(effectivePageCount - 1, current)));
  }, [effectivePageCount]);

  useEffect(() => {
    setActiveLessonPageIndex(0);
  }, [activeOutlineIndex]);

  useEffect(() => {
    setActiveLessonPageIndex((current) => Math.max(0, Math.min(activeLessonPages.length - 1, current)));
  }, [activeLessonPages.length]);

  useEffect(() => {
    if (!materialDetail) {
      setMaxViewedOutlineIndex(0);
      return;
    }

    const outlineCount = Number(materialDetail?.progress?.outlineCount || effectivePageCount || 0);
    const currentIndex = Math.max(0, Number(materialDetail?.progress?.currentOutlineIndex || 0));
    const inferredViewedCount = outlineCount > 0
      ? Math.max(
        currentIndex + 1,
        Math.round((Math.max(0, Number(materialDetail?.progress?.percent || 0)) / 100) * outlineCount),
      )
      : currentIndex + 1;

    setMaxViewedOutlineIndex(Math.max(0, Math.min(outlineCount > 0 ? outlineCount - 1 : 0, inferredViewedCount - 1)));
  }, [effectivePageCount, materialDetail]);

  useEffect(() => {
    setMaxViewedOutlineIndex((current) => Math.max(current, activeOutlineIndex));
  }, [activeOutlineIndex]);

  useEffect(() => {
    if (!outlineSections.length) {
      setExpandedSectionIds([]);
      return;
    }

    setExpandedSectionIds((current) => {
      const nextIds = new Set(current);
      outlineSections.forEach((section, index) => {
        if (index === 0 || section.id === activeSectionId) {
          nextIds.add(section.id);
        }
      });
      return Array.from(nextIds);
    });
  }, [activeSectionId, outlineSections]);

  useEffect(() => {
    if (mode === 'result') {
      return undefined;
    }

    let cancelled = false;

    const loadMaterialDetail = async () => {
      try {
        setDetailLoading(true);
        const response = await userAPI.getAssignedLearningMaterialDetail(materialId);
        if (cancelled || response.status !== 'success') {
          return;
        }

        const nextMaterial = response.data?.material || null;
        setMaterialDetail(nextMaterial);
        setActiveOutlineIndex(Math.max(0, Number(nextMaterial?.progress?.currentOutlineIndex || 0)));

        if (mode === 'viewer' && !hasStartedRef.current) {
          await userAPI.startAssignedLearningMaterial(materialId);
          hasStartedRef.current = true;
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(handleAPIError(error).message);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
          initialProgressLoadedRef.current = true;
          progressTickStartedAtRef.current = Date.now();
        }
      }
    };

    loadMaterialDetail();

    return () => {
      cancelled = true;
    };
  }, [materialId, mode]);

  useEffect(() => {
    if (mode !== 'viewer' || !materialDetail || !initialProgressLoadedRef.current) {
      return undefined;
    }

    const progressKey = `${activeOutlineIndex}:${completedOutlineCount}`;
    if (lastSavedProgressKeyRef.current === progressKey) {
      return undefined;
    }

    const saveProgress = async () => {
      try {
        setIsSavingProgress(true);
        const elapsedSeconds = Math.max(5, Math.round((Date.now() - progressTickStartedAtRef.current) / 1000));
        const response = await userAPI.saveAssignedLearningMaterialProgress(materialId, {
          currentOutlineIndex: activeOutlineIndex,
          viewedItems: completedOutlineCount,
          timeSpentSeconds: elapsedSeconds,
        });

        if (response.status === 'success') {
          setMaterialDetail((current) => current ? ({
            ...current,
            progress: {
              ...current.progress,
              ...response.data?.progress,
              statusLabel: response.data?.progress?.statusLabel || current.progress.statusLabel,
            },
          }) : current);
          lastSavedProgressKeyRef.current = progressKey;
          progressTickStartedAtRef.current = Date.now();
        }
      } catch (error) {
        toast.error(handleAPIError(error).message);
      } finally {
        setIsSavingProgress(false);
      }
    };

    saveProgress();
    return undefined;
  }, [activeOutlineIndex, completedOutlineCount, materialDetail, materialId, mode]);

  useEffect(() => {
    if (mode !== 'viewer' || !previewTopRef.current) {
      return undefined;
    }

    previewTopRef.current.scrollTo({
      top: 0,
      behavior: 'auto',
    });

    return undefined;
  }, [activeLessonPageIndex, activeOutlineIndex, mode]);

  useEffect(() => {
    if (mode !== 'quiz') {
      return undefined;
    }

    let cancelled = false;

    const loadQuiz = async () => {
      try {
        setQuizLoading(true);
        const response = await examAPI.getStudentQuizByMaterial(materialId);
        if (cancelled || response.status !== 'success') {
          return;
        }

        const quiz = response.data?.quiz || null;
        const storedDraft = readStoredQuizDraft(materialId);
        setQuizData(quiz);
        setAnswers(storedDraft?.answers && typeof storedDraft.answers === 'object' ? storedDraft.answers : {});
        setCurrentQuestionIndex(Math.max(0, Number(storedDraft?.currentQuestionIndex || 0)));
        setRemainingSeconds(
          Number(storedDraft?.remainingSeconds || 0) > 0
            ? Number(storedDraft.remainingSeconds)
            : Number(quiz?.timeLimit || 30) * 60
        );
      } catch (error) {
        if (!cancelled) {
          toast.error(handleAPIError(error).message);
        }
      } finally {
        if (!cancelled) {
          setQuizLoading(false);
        }
      }
    };

    loadQuiz();

    return () => {
      cancelled = true;
    };
  }, [materialId, mode]);

  useEffect(() => {
    if (mode !== 'quiz' || !quizData) {
      return undefined;
    }

    saveStoredQuizDraft(materialId, {
      answers,
      currentQuestionIndex,
      remainingSeconds,
    });

    return undefined;
  }, [answers, currentQuestionIndex, materialId, mode, quizData, remainingSeconds]);

  useEffect(() => {
    if (mode !== 'quiz' || !quizData || isSubmittingQuiz) {
      return undefined;
    }

    if (remainingSeconds <= 0) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isSubmittingQuiz, mode, quizData, remainingSeconds]);

  useEffect(() => {
    if (mode !== 'quiz' || remainingSeconds > 0 || !quizData || isSubmittingQuiz) {
      return undefined;
    }

    const submitOnTimeout = async () => {
      await handleSubmitQuiz({ allowIncomplete: true });
    };

    submitOnTimeout();
    return undefined;
  }, [isSubmittingQuiz, mode, quizData, remainingSeconds]);

  useEffect(() => {
    if (mode !== 'result') {
      return undefined;
    }

    let cancelled = false;

    const loadResult = async () => {
      const storedResult = readStoredResult(attemptId);
      if (storedResult) {
        setResultData(storedResult);
        setResultLoading(false);
        return;
      }

      try {
        setResultLoading(true);
        const response = await examAPI.getStudentQuizAttemptResult(materialId, attemptId);
        if (cancelled || response.status !== 'success') {
          return;
        }

        const result = response.data?.result || null;
        setResultData(result);
        saveStoredResult(attemptId, result);
      } catch (error) {
        if (!cancelled) {
          toast.error(handleAPIError(error).message);
        }
      } finally {
        if (!cancelled) {
          setResultLoading(false);
        }
      }
    };

    loadResult();

    return () => {
      cancelled = true;
    };
  }, [attemptId, materialId, mode]);

  useEffect(() => {
    if (!fullscreenImage) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeFullscreenImage();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [fullscreenImage]);

  const resetQuizSession = () => {
    clearStoredQuizDraft(materialId);
    setAnswers({});
    setCurrentQuestionIndex(0);
    setRemainingSeconds(Number(quizData?.timeLimit || 30) * 60);
    setIsSubmittingQuiz(false);
    setResultData(null);
    setShowReviewAnswers(false);
  };

  const handleRetakeQuiz = () => {
    resetQuizSession();
    navigate(`/student/materials/${materialId}/quiz`, { replace: true });
  };

  const handleSubmitQuiz = async ({ allowIncomplete = false } = {}) => {
    if (!quizData || isSubmittingQuiz) {
      return;
    }

    if (!allowIncomplete) {
      const firstUnansweredIndex = quizData.questions.findIndex((question) => (
        !String(answers[question.id] || '').trim()
      ));

      if (firstUnansweredIndex >= 0) {
        const unansweredCount = quizData.questions.filter((question) => (
          !String(answers[question.id] || '').trim()
        )).length;
        setCurrentQuestionIndex(firstUnansweredIndex);
        toast.error(`Answer all questions before submitting. ${unansweredCount} remaining.`);
        return;
      }
    }

    try {
      setIsSubmittingQuiz(true);
      const response = await examAPI.submitStudentQuizByMaterial(materialId, {
        answers,
        timeTakenSeconds: Math.max(0, (Number(quizData.timeLimit || 30) * 60) - remainingSeconds),
      });

      if (response.status === 'success') {
        const result = response.data?.result || null;
        saveStoredResult(result?.attemptId, result);
        clearStoredQuizDraft(materialId);
        navigate(`/student/materials/${materialId}/result/${result.attemptId}`, {
          replace: true,
          state: { result },
        });
      }
    } catch (error) {
      toast.error(handleAPIError(error).message);
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const renderMenuRail = () => (
    <aside className="student-menu-rail">
      <div className="student-menu-rail-head">
        <p className="student-eyebrow">Menu</p>
        <h1 className="student-hero-title">iTECHS</h1>
      </div>

      <div className="student-menu-rail-buttons">
        {MATERIAL_PAGE_MENU_ITEMS.map(({ id, label, Icon }) => {
          const isActive = id === 'materials';
          return (
            <StudentActionButton
              key={id}
              variant={isActive ? 'sand' : 'slate'}
              className="student-menu-rail-action"
              contentClassName="justify-center"
              onClick={() => {
                if (isActive) {
                  return;
                }
                navigate('/student', { state: { activePanel: id } });
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
            {avatar ? (
              <button
                type="button"
                onClick={() => openFullscreenImage({ src: avatar.image, alt: avatar.label })}
                className="block w-full cursor-zoom-in"
                aria-label={`Open ${avatar.label} in fullscreen`}
              >
                <img
                  src={avatar.image}
                  alt={avatar.label}
                  className="student-menu-avatar-image"
                />
              </button>
            ) : (
              <div className="student-menu-avatar-placeholder">
                <span>Select an avatar in Profile Editor</span>
              </div>
            )}
          </div>
        </div>

        <div className="student-menu-account-card">
          <span className="student-menu-account-label">Student</span>
          <strong className="student-menu-account-name">
            {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Student'}
          </strong>
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
  );

  const renderPreview = () => {
    if (!materialDetail) {
      return null;
    }

    const slideParagraphs = activeLessonNarrative.length > 0
      ? activeLessonNarrative
      : [lessonOverview];
    const lessonMedia = activeOutlineItem?.media && activeOutlineItem.media.src ? activeOutlineItem.media : null;
    const lessonVideo = activeOutlineItem?.video && activeOutlineItem.video.src ? activeOutlineItem.video : null;
    const renderInlineImage = (media, fallbackTitle) => {
      if (!media?.src) {
        return null;
      }

      return (
        <div
          className="mx-auto mb-8 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
          style={{ width: `${Math.min(70, Math.max(18, Number(media?.width || 34)))}%` }}
        >
          <LessonMediaImage source={media.src} alt={media.alt || fallbackTitle || materialDetail.title}
  className="max-h-[280px] w-full object-contain bg-slate-50"
  onOpen={(src) => openFullscreenImage({ src, alt: media.alt || fallbackTitle || materialDetail.title, caption: media.caption })} />
          {media.caption ? (
            <p
              className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600"
              style={{ fontFamily: NORMAL_LESSON_FONT }}
            >
              {media.caption}
            </p>
          ) : null}
        </div>
      );
    };
    const renderedLessonContent = currentLessonPage?.type === 'subtopic'
      ? (
        <div className="min-h-[280px] overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50/80 p-6">
          {renderInlineImage(currentLessonPage?.subtopic?.media, currentLessonPage?.title)}
          <h5
            className="text-xl font-extrabold text-slate-900"
            style={{ fontFamily: NORMAL_LESSON_FONT }}
          >
            {currentLessonPage?.title}
          </h5>
          {String(currentLessonPage?.subtopic?.content || '').trim() ? (
            <p
              className="mt-3 text-lg leading-9 text-slate-700"
              style={{ fontFamily: NORMAL_LESSON_FONT }}
            >
              {currentLessonPage.subtopic.content}
            </p>
          ) : null}
        </div>
      )
      : (
        <>
          {renderInlineImage(lessonMedia, activeOutlineItem?.title)}
          {lessonVideo ? (
            <LessonMediaVideo video={lessonVideo} />
          ) : null}
          <div className="min-w-0 space-y-6 px-3 pb-4 sm:px-5">
            {slideParagraphs.map((paragraph, index) => (
              <p
                key={`${activeOutlineItem?.id || 'slide'}-paragraph-${index}`}
                className="max-w-full break-words text-[1.2rem] leading-10 text-slate-700"
                style={{ fontFamily: NORMAL_LESSON_FONT }}
              >
                {paragraph}
              </p>
            ))}
          </div>
          {activeSubtopics.length > 0 ? (
            <div className="mt-10 border-t border-slate-200 pt-8">
              <span
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-700"
                style={{ fontFamily: NORMAL_LESSON_FONT }}
              >
                Submodules
              </span>
              <p
                className="mt-4 text-base leading-8 text-slate-600"
                style={{ fontFamily: NORMAL_LESSON_FONT }}
              >
                Continue to the next page to view this lesson&apos;s submodules one by one.
              </p>
            </div>
          ) : null}
        </>
      );
    const mainTextContent = (
      <div className="min-w-0 overflow-hidden rounded-[24px] bg-white">
        {renderedLessonContent}
      </div>
    );

    return (
      <div className="mx-auto w-full max-w-6xl rounded-[28px] border border-slate-200 bg-white px-8 py-10 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p
              className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500"
              style={{ fontFamily: NORMAL_LESSON_FONT }}
            >
              {activeOutlineItem?.sectionTitle || 'Slide'}
            </p>
            <h4
              className="mt-3 text-[2.4rem] font-extrabold leading-tight text-slate-900"
              style={{ fontFamily: NORMAL_LESSON_FONT }}
            >
              {currentLessonPage?.title || activeOutlineItem?.title || materialDetail.title}
            </h4>
          </div>
          <div
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-base font-bold text-slate-700"
            style={{ fontFamily: NORMAL_LESSON_FONT, fontVariantNumeric: 'tabular-nums' }}
          >
            {activeLessonPages.length > 0 ? `${activeLessonPageIndex + 1} / ${activeLessonPages.length}` : '1 / 1'}
          </div>
        </div>

        <div className="mt-10">
          {mainTextContent}
        </div>
      </div>
    );
  };

  const toggleOutlineSection = (sectionId) => {
    setExpandedSectionIds((current) => (
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId]
    ));
  };

  const renderOutlinePanel = () => (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
      <div className="grid shrink-0 grid-cols-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setOutlineTab('outline')}
          className={clsx(
            'px-4 py-4 text-sm font-black transition',
            outlineTab === 'outline'
              ? 'border-b-2 border-emerald-500 bg-emerald-50 text-emerald-800'
              : 'text-slate-600 hover:bg-slate-50',
          )}
          style={{ fontFamily: NORMAL_LESSON_FONT }}
        >
          Course Outline
        </button>
        <button
          type="button"
          onClick={() => setOutlineTab('resources')}
          className={clsx(
            'px-4 py-4 text-sm font-black transition',
            outlineTab === 'resources'
              ? 'border-b-2 border-emerald-500 bg-emerald-50 text-emerald-800'
              : 'text-slate-600 hover:bg-slate-50',
          )}
          style={{ fontFamily: NORMAL_LESSON_FONT }}
        >
          Resources
        </button>
      </div>

      {outlineTab === 'outline' ? (
        <>
          <div className="shrink-0 border-b border-slate-200 p-4">
            <input
              type="search"
              value={outlineSearch}
              onChange={(event) => setOutlineSearch(event.target.value)}
              placeholder="Search course outline"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white"
              style={{ fontFamily: NORMAL_LESSON_FONT }}
            />
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {filteredOutlineSections.map((section) => {
              const isExpanded = expandedSectionIds.includes(section.id);
              const sectionItems = Array.isArray(section.items) ? section.items : [];
              const completedCount = sectionItems.filter((item) => {
                const index = viewerItems.findIndex((entry) => entry.id === item.id);
                return index >= 0 && index < completedOutlineCount;
              }).length;
              const sectionPercent = sectionItems.length > 0 ? Math.round((completedCount / sectionItems.length) * 100) : 0;

              return (
                <div key={section.id} className="rounded-2xl border border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => toggleOutlineSection(section.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-4 text-left"
                    style={{ fontFamily: NORMAL_LESSON_FONT }}
                  >
                    <div className="min-w-0">
                      <p className="text-base font-black text-slate-900">{section.title}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {completedCount}/{sectionItems.length} completed
                      </p>
                    </div>
                    <ChevronRight className={clsx('h-5 w-5 text-slate-400 transition', isExpanded && 'rotate-90')} />
                  </button>

                  <div className="px-4 pb-4">
                    <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${sectionPercent}%` }} />
                    </div>

                    {isExpanded ? (
                      <div className="space-y-2">
                        {sectionItems.map((item) => {
                          const itemIndex = viewerItems.findIndex((entry) => entry.id === item.id);
                          const isActive = itemIndex === activeOutlineIndex;
                          const isCompleted = itemIndex >= 0 && itemIndex < completedOutlineCount;
                          const itemSubtopics = Array.isArray(item?.subtopics) ? item.subtopics : [];
                          return (
                            <div key={item.id} className="space-y-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (itemIndex >= 0) {
                                    setActiveOutlineIndex(itemIndex);
                                    setIsMobileOutlineVisible(false);
                                    setActiveLessonPageIndex(0);
                                  }
                                }}
                                className={clsx(
                                  'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition',
                                  isActive
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                                )}
                                style={{ fontFamily: NORMAL_LESSON_FONT }}
                              >
                                <span className={clsx(
                                  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black',
                                  isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-slate-500',
                                )}>
                                  {itemIndex + 1}
                                </span>
                                <span className="min-w-0 flex-1 font-semibold">{item.title}</span>
                                {isActive && itemSubtopics.length > 0 ? (
                                  <ChevronRight className="h-4 w-4 rotate-90 text-emerald-500" />
                                ) : null}
                              </button>

                              {isActive && itemSubtopics.length > 0 ? (
                                <div className="ml-4 space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
                                  {itemSubtopics.map((subtopic, subtopicIndex) => {
                                    const subtopicId = subtopic.id || `${item.id}-subtopic-${subtopicIndex}`;
                                    return (
                                      <button
                                        key={subtopicId}
                                        type="button"
                                        onClick={() => {
                                          if (itemIndex >= 0) {
                                            setActiveOutlineIndex(itemIndex);
                                    setIsMobileOutlineVisible(false);
                                            setActiveLessonPageIndex(subtopicIndex + 1);
                                          }
                                        }}
                                        className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/70"
                                        style={{ fontFamily: NORMAL_LESSON_FONT }}
                                      >
                                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white">
                                          {subtopicIndex + 1}
                                        </span>
                                        <span className="min-w-0 flex-1 text-sm font-semibold text-slate-700">
                                          {subtopic.title || `Submodule ${subtopicIndex + 1}`}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-4 p-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500" style={{ fontFamily: NORMAL_LESSON_FONT }}>
              Module Status
            </p>
            <p className="mt-2 text-lg font-black text-slate-900" style={{ fontFamily: NORMAL_LESSON_FONT }}>
              {materialDetail?.progress?.statusLabel}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${displayProgressPercent}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-600" style={{ fontFamily: NORMAL_LESSON_FONT }}>
              {displayProgressPercent}% completed
            </p>
          </div>

          {materialDetail?.hasSourceFile ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500" style={{ fontFamily: NORMAL_LESSON_FONT }}>
                Supporting Resource
              </p>
              <p className="mt-2 text-base font-black text-slate-900" style={{ fontFamily: NORMAL_LESSON_FONT }}>
                {materialDetail.originalFileName}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StudentActionButton variant="sky" className="student-button-inline" onClick={() => openMaterialFile(false)}>
                  <BookOpen className="h-4 w-4" />
                  Open
                </StudentActionButton>
                <StudentActionButton variant="slate" className="student-button-inline" onClick={() => openMaterialFile(true)}>
                  <Download className="h-4 w-4" />
                  Download
                </StudentActionButton>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-900" style={{ fontFamily: NORMAL_LESSON_FONT }}>
                This course uses built-in module content only.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderViewer = () => {
    if (detailLoading || !materialDetail) {
      return (
        <div className="student-panel rounded-[28px] p-10 text-center text-[#5c412b]">Loading module...</div>
      );
    }

    return (
      <div className="student-content-stack">
        <section className={clsx(
          'student-material-viewer flex h-[calc(100vh-120px)] min-h-[780px] flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.10)]',
          isMobileOutlineVisible ? 'student-material-viewer-outline-open' : 'student-material-viewer-lesson-open',
        )}>
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <button
                  type="button"
                  onClick={navigateBackToMaterials}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500" style={{ fontFamily: NORMAL_LESSON_FONT }}>Course Module</p>
                  <h2
                    className="truncate text-3xl font-black text-slate-900"
                    style={{ fontFamily: NORMAL_LESSON_FONT }}
                    title={materialDetail.title}
                  >
                    {materialDetail.title}
                  </h2>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" className="student-material-mobile-outline-toggle"
                  aria-expanded={isMobileOutlineVisible}
                  onClick={() => setIsMobileOutlineVisible(current => !current)}>
                  <BookOpen className="h-4 w-4" />
                  {isMobileOutlineVisible ? 'View Lesson' : 'Course Outline'}
                </button>
                {renderAudioControls()}
                <span
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800"
                  style={{ fontFamily: NORMAL_LESSON_FONT }}
                >
                  {displayProgressPercent}% complete
                </span>
              </div>
            </div>
          </div>

          <div className="student-material-viewer-grid grid min-h-0 flex-1 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="student-material-outline-pane min-h-0 border-r border-slate-200 bg-slate-50/70 p-4">
              {renderOutlinePanel()}
            </div>

            <div ref={previewTopRef} className="student-material-lesson-pane min-h-0 overflow-y-auto bg-white p-5 pb-8 pr-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div>
                  <p
                    className="text-sm font-black uppercase tracking-[0.12em] text-slate-500"
                    style={{ fontFamily: NORMAL_LESSON_FONT }}
                  >
                    {activeOutlineItem?.sectionTitle || 'Lesson Section'}
                  </p>
                  <h3
                    className="text-2xl font-black text-slate-900"
                    style={{ fontFamily: NORMAL_LESSON_FONT }}
                  >
                    {activeOutlineItem?.title || materialDetail.title}
                  </h3>
                </div>
                <div
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
                  style={{ fontFamily: NORMAL_LESSON_FONT, fontVariantNumeric: 'tabular-nums' }}
                >
                  {viewerItems.length > 0 ? `${activeOutlineIndex + 1} / ${viewerItems.length}` : '0 / 0'}
                </div>
              </div>

              <div className="mb-4 flex justify-end">
                <PixelHeaderActionButton
                  onClick={openQuizFromViewer}
                  title={quizLocked ? 'Finish all slides first to unlock the quiz' : 'Open quiz'}
                  aria-label={quizLocked ? 'Finish module first to unlock quiz' : 'Take a Quiz'}
                  className={clsx(
                    'min-w-[182px] flex-none',
                    quizLocked && 'opacity-80',
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="inline-block">Take a Quiz</span>
                </PixelHeaderActionButton>
              </div>

              <div className="student-material-lesson-preview min-h-[760px]">{renderPreview()}</div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                <PixelFooterNavButton
                  onClick={() => {
                    if (activeLessonPageIndex > 0) {
                      setActiveLessonPageIndex((current) => Math.max(0, current - 1));
                      return;
                    }

                    if (activeOutlineIndex <= 0) {
                      return;
                    }

                    const previousLesson = viewerItems[activeOutlineIndex - 1] || null;
                    const previousSubtopics = Array.isArray(previousLesson?.subtopics) ? previousLesson.subtopics : [];
                    setActiveOutlineIndex((current) => Math.max(0, current - 1));
                    setActiveLessonPageIndex(previousSubtopics.length);
                  }}
                  disabled={activeOutlineIndex <= 0 && activeLessonPageIndex <= 0}
                  Icon={ChevronLeft}
                  iconSide="left"
                >
                  {activeLessonPageIndex > 0 ? 'Previous Page' : 'Previous Step'}
                </PixelFooterNavButton>
                <PixelFooterNavButton
                  onClick={() => {
                    if (activeLessonPageIndex < activeLessonPages.length - 1) {
                      setActiveLessonPageIndex((current) => Math.min(activeLessonPages.length - 1, current + 1));
                      return;
                    }

                    if (activeOutlineIndex >= viewerItems.length - 1) {
                      navigate(`/student/materials/${materialId}/quiz`);
                      return;
                    }
                    setActiveOutlineIndex((current) => Math.min(viewerItems.length - 1, current + 1));
                    setActiveLessonPageIndex(0);
                  }}
                  disabled={viewerItems.length === 0}
                  Icon={activeOutlineIndex >= viewerItems.length - 1 && activeLessonPageIndex >= activeLessonPages.length - 1 ? CheckCircle2 : ChevronRight}
                  iconSide="right"
                  align="right"
                >
                  {activeLessonPageIndex < activeLessonPages.length - 1
                    ? 'Next Page'
                    : activeOutlineIndex >= viewerItems.length - 1
                      ? 'Go To Quiz'
                      : 'Next Step'}
                </PixelFooterNavButton>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderQuiz = () => {
    if (quizLoading || !quizData) {
      return <div className="student-panel rounded-[28px] p-10 text-center text-[#5c412b]">Loading quiz...</div>;
    }

    const currentQuestion = quizData.questions[currentQuestionIndex];
    const selectedAnswer = answers[currentQuestion?.id] || '';
    const currentQuestionType = String(currentQuestion?.type || 'multiple_choice').trim().toLowerCase();
    const currentOptions = normalizeQuizOptions(currentQuestion?.options);
    const unansweredCount = quizData.questions.filter((question) => (
      !String(answers[question.id] || '').trim()
    )).length;
    const progressPercent = quizData.questions.length > 0
      ? Math.round(((currentQuestionIndex + 1) / quizData.questions.length) * 100)
      : 0;

    return (
      <div className="student-content-stack student-material-quiz">
        <section className="student-material-quiz-shell rounded-[32px] border border-slate-200 bg-white/95 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.10)]">
          <div className="student-material-quiz-header mb-4 flex flex-wrap items-center justify-between gap-3">
            <PixelHeaderActionButton onClick={() => navigate(`/student/materials/${materialId}`)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </PixelHeaderActionButton>
            <div className="student-material-quiz-heading text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>Knowledge Check</p>
              <h2 className="text-3xl font-black text-slate-900" style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}>{quizData.moduleTitle}</h2>
            </div>
            <div className="flex gap-2">
              <div
                className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700"
                style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' }}
              >
                <Clock3 className="mr-2 inline h-4 w-4" />
                {formatClock(remainingSeconds)}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="student-material-quiz-card rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
              <p
                className="text-sm font-black uppercase tracking-[0.12em] text-slate-500"
                style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}
              >
                {quizData.title}
              </p>
              <h3
                className="student-material-quiz-question mt-2 text-3xl font-black text-slate-900"
                style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}
              >
                {currentQuestion?.prompt}
              </h3>

              <div className="student-material-quiz-options mt-6 space-y-3">
                {currentQuestionType === 'identification' || currentQuestionType === 'essay' ? (
                  <label className="block">
                    {currentQuestionType === 'identification' ? (
                      <span className="student-material-identification-rule mb-3 block rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                        <strong className="block font-black">Identification answer rule</strong>
                        <span className="mt-1 block">
                          Enter one exact expected answer. Capitalization and spaces at the beginning or end are ignored, but the wording and punctuation must otherwise match. Alternate answers are not supported.
                        </span>
                      </span>
                    ) : null}
                    <span className="mb-2 block text-sm font-black text-slate-600">Your answer</span>
                    <input
                      type="text"
                      value={selectedAnswer}
                      onChange={(event) => setAnswers((current) => ({
                        ...current,
                        [currentQuestion.id]: event.target.value,
                      }))}
                      className="w-full rounded-[18px] border border-slate-300 bg-white px-4 py-4 text-base font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      placeholder="Type your answer"
                      autoComplete="off"
                    />
                  </label>
                ) : currentOptions.map((option, optionIndex) => {
                  const optionLabel = String.fromCharCode(65 + optionIndex);
                  const isSelected = selectedAnswer === option;
                  return (
                    <button
                      key={`${currentQuestion.id}-${option}`}
                      type="button"
                      className={clsx(
                        'flex w-full items-center gap-4 rounded-[18px] border px-5 py-4 text-left text-lg font-semibold transition',
                        isSelected
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50',
                      )}
                      style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif' }}
                      onClick={() => setAnswers((current) => ({ ...current, [currentQuestion.id]: option }))}
                    >
                      {isSelected ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                      <span>{optionLabel}. {option}</span>
                    </button>
                  );
                })}
              </div>

              <div className="student-material-quiz-navigation mt-6 flex flex-wrap items-center justify-between gap-3">
                <PixelFooterNavButton
                  onClick={() => setCurrentQuestionIndex((current) => Math.max(0, current - 1))}
                  disabled={currentQuestionIndex <= 0}
                  Icon={ChevronLeft}
                  iconSide="left"
                >
                  Previous
                </PixelFooterNavButton>
                <PixelFooterNavButton
                  onClick={() => {
                    if (currentQuestionIndex >= quizData.questions.length - 1) {
                      handleSubmitQuiz();
                      return;
                    }
                    setCurrentQuestionIndex((current) => Math.min(quizData.questions.length - 1, current + 1));
                  }}
                  disabled={isSubmittingQuiz}
                  Icon={ChevronRight}
                  iconSide="right"
                  align="right"
                >
                  {currentQuestionIndex >= quizData.questions.length - 1 ? 'Submit' : 'Next'}
                </PixelFooterNavButton>
              </div>

              {currentQuestionIndex >= quizData.questions.length - 1 && unansweredCount > 0 ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm font-semibold text-amber-800">
                  Answer all questions before submitting. {unansweredCount} remaining.
                </p>
              ) : null}

              <div className="student-material-quiz-pagination mt-6 flex flex-wrap gap-2">
                {quizData.questions.map((question, index) => (
                  <button
                    key={question.id}
                    type="button"
                    className={clsx(
                      'h-11 w-11 rounded-[12px] border text-sm font-black',
                      index === currentQuestionIndex
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : answers[question.id]
                          ? 'border-amber-300 bg-amber-100 text-amber-900'
                          : 'border-slate-200 bg-white text-slate-600',
                    )}
                    style={{ fontFamily: 'Manrope, "Space Grotesk", system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' }}
                    onClick={() => setCurrentQuestionIndex(index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderResult = () => {
    const result = location.state?.result || resultData;

    if (resultLoading || !result) {
      return <div className="student-panel rounded-[28px] p-10 text-center text-[#5c412b]">Loading result...</div>;
    }

    const stars = getStarsFromScore(result.percentage);

    return (
      <div className="student-content-stack">
        <section className="rounded-[32px] border border-slate-200 bg-white/95 p-5 shadow-[0_20px_50px_rgba(15,23,42,0.10)]">
          {/* <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500" style={{ fontFamily: 'Manrope, "Segoe UI", sans-serif' }}>Assessment Result</p>
              <h2 className="text-3xl font-black text-slate-900" style={{ fontFamily: 'Manrope, "Segoe UI", sans-serif' }}>{result.moduleTitle}</h2>
            </div>
            <PixelHeaderActionButton onClick={() => setShowReviewAnswers((current) => !current)}>
              Review Answers
            </PixelHeaderActionButton>
          </div> */}

          <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 inline-flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#d7a12f] bg-[#fff2bf]">
                {result.passed ? <Trophy className="h-12 w-12 text-[#d18a09]" /> : <XCircle className="h-12 w-12 text-[#c64a3d]" />}
              </div>
              <h3
                className={clsx('text-5xl font-black', result.passed ? 'text-[#1f9d61]' : 'text-[#c64a3d]')}
                style={{ fontFamily: 'Manrope, "Segoe UI", sans-serif' }}
              >
                {result.passed ? 'PASSED' : 'FAILED'}
              </h3>
              <p className="mt-2 text-2xl font-bold text-[#2f2016]" style={{ fontFamily: 'Manrope, "Segoe UI", sans-serif' }}>
                {result.passed ? 'Great job! You passed the quiz.' : 'Keep going. You can retake the quiz.'}
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-white p-4 text-[#2f2016]">
                <div className="space-y-3 text-lg font-semibold" style={{ fontFamily: 'Manrope, "Segoe UI", sans-serif' }}>
                  <div className="flex items-center justify-between"><span>Final Score</span><span>{result.finalScore} / {result.totalMarks}</span></div>
                  <div className="flex items-center justify-between"><span>Percentage</span><span>{Math.round(result.percentage)}%</span></div>
                  <div className="flex items-center justify-between"><span>Passing Score</span><span>{result.passingScore}%</span></div>
                  <div className="flex items-center justify-between"><span>Time Taken</span><span>{formatDuration(result.timeTakenSeconds)}</span></div>
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-white p-4 text-[#2f2016]">
                <div className="space-y-3 text-lg font-semibold" style={{ fontFamily: 'Manrope, "Segoe UI", sans-serif' }}>
                  <div className="flex items-center justify-between"><span>Quiz Score</span><span>{result.correctCount} / {result.totalQuestions}</span></div>
                  <div className="flex items-center justify-between"><span>Stars</span><span>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span></div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {result.passed && result.nextMaterialId ? (
                <PixelHeaderActionButton onClick={() => navigate(`/student/materials/${result.nextMaterialId}`)}>
                  Continue to Next Module
                  <ChevronRight className="h-4 w-4" />
                </PixelHeaderActionButton>
              ) : null}
              <PixelHeaderActionButton onClick={result.passed ? navigateBackToMaterials : navigateBackToModule}>
                {result.passed ? 'Back to Materials' : 'Back to Module'}
              </PixelHeaderActionButton>
              {!result.passed ? (
                <PixelHeaderActionButton onClick={handleRetakeQuiz}>
                  Retake Quiz
                </PixelHeaderActionButton>
              ) : null}
            </div>

            {showReviewAnswers ? (
              <div className="mt-6 rounded-[22px] border border-slate-200 bg-white p-4">
                <h4 className="text-xl font-black text-[#2f2016]" style={{ fontFamily: 'Manrope, "Segoe UI", sans-serif' }}>Review Answers</h4>
                <div className="mt-4 space-y-3">
                  {(result.review || []).map((item, index) => (
                    <div
                      key={`${item.questionId}-${index}`}
                      className={clsx(
                        'rounded-[18px] border p-4',
                        item.correct ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50',
                      )}
                    >
                      <p className="font-black text-[#2f2016]" style={{ fontFamily: 'Manrope, "Segoe UI", sans-serif' }}>{index + 1}. {item.prompt}</p>
                      <p className="mt-2 text-sm text-[#4f3826]" style={{ fontFamily: 'Manrope, "Segoe UI", sans-serif' }}>Your answer: <strong>{item.selectedAnswer || 'No answer selected'}</strong></p>
                      <p className="mt-1 text-sm text-[#4f3826]" style={{ fontFamily: 'Manrope, "Segoe UI", sans-serif' }}>Correct answer: <strong>{item.correctAnswer}</strong></p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    );
  };

  const renderAudioControls = () => {
    const allMuted = audioPreferences.musicVolume === 0 && audioPreferences.sfxVolume === 0;

    return (
      <div
        ref={audioControlsRef}
        className="relative z-[60]"
        style={{ fontFamily: NORMAL_LESSON_FONT }}
      >
        {showAudioControls ? (
          <div className="student-module-audio-popover absolute right-0 top-[calc(100%+10px)] w-[min(320px,calc(100vw-32px))] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,50,70,0.18)]">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Module Audio</p>
                <h3 className="text-base font-black text-slate-900">Sound settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAudioControls(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close volume controls"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            {[
              { key: 'musicVolume', label: 'Music', value: audioPreferences.musicVolume },
              { key: 'sfxVolume', label: 'Sound FX', value: audioPreferences.sfxVolume },
            ].map((control) => (
              <label key={control.key} className="mb-3 block rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 last:mb-0">
                <span className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>{control.label}</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 tabular-nums font-black text-emerald-700">{control.value}%</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={control.value}
                  onChange={updateAudioPreference(control.key)}
                  onPointerUp={control.key === 'sfxVolume' ? previewSoundEffect : undefined}
                  onKeyUp={control.key === 'sfxVolume' ? previewSoundEffect : undefined}
                  className="h-2 w-full cursor-pointer accent-emerald-500"
                  aria-label={`${control.label} volume`}
                />
              </label>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setShowAudioControls((current) => !current)}
          className={clsx(
            'inline-flex h-10 items-center gap-2 rounded-full border px-3 text-xs font-bold transition',
            showAudioControls
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
          )}
          aria-expanded={showAudioControls}
          aria-label="Open module volume controls"
        >
          {allMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          <span>Audio</span>
        </button>
      </div>
    );
  };

  return (
    <StudentShell backgroundImage={studentMenuBackground} className="student-shell-warm student-shell-scroll">
      <main className="student-shell-main student-shell-main-compact">
        <section className="student-shell-layout student-material-page-layout">
          {renderMenuRail()}
          <div className="student-shell-content">
            {mode === 'quiz' ? renderQuiz() : mode === 'result' ? renderResult() : renderViewer()}
          </div>
        </section>
      </main>
      {fullscreenImage ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 px-4 py-6 md:px-8 md:py-8"
          onClick={closeFullscreenImage}
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen image viewer"
        >
          <div
            className="relative flex h-full max-h-[92vh] w-full max-w-[1400px] flex-col items-center gap-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex w-full justify-start gap-3">
              <PixelHeaderActionButton onClick={closeFullscreenImage} className="min-w-[148px]">
                <ArrowLeft className="h-4 w-4" />
                Back
              </PixelHeaderActionButton>
            </div>
            <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-[28px] border border-slate-700 bg-white">
              <img
                src={fullscreenImage.src}
                alt={fullscreenImage.alt}
                className="h-full w-full object-contain"
              />
            </div>
            {fullscreenImage.caption ? (
              <p
                className="max-w-3xl text-center text-sm text-slate-200"
                style={{ fontFamily: NORMAL_LESSON_FONT }}
              >
                {fullscreenImage.caption}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </StudentShell>
  );
};

export default StudentMaterialPage;
