import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { restoreNativePortrait } from '../utils/nativeOrientation';
import { StatusBar } from '@capacitor/status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Info,
  Lock,
  Play,
  Star,
} from 'lucide-react';
import { handleAPIError, levelAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { normalizeGameType } from '../utils/gameTracks';
import StudentActionButton from '../components/student/StudentActionButton';
import StudentGameOverlay from '../components/student/StudentGameOverlay';
import StudentMenuTopbar from '../components/student/StudentMenuTopbar';
import StudentShell from '../components/student/StudentShell';
import StudentStoryFrame from '../components/student/StudentStoryFrame';
import { getStudentGameTheme } from '../components/student/studentGameTheme';
import { getLevelStoryBriefing } from '../utils/storyline';
import { getDashboardGuideContent } from '../games/shared/ui/gameGuideContent';
import iconCards from '../assets/guidelines-icons/icon-cards.png';
import iconCheck from '../assets/guidelines-icons/icon-check.png';
import iconClock from '../assets/guidelines-icons/icon-clock.png';
import iconCode from '../assets/guidelines-icons/icon-code.png';
import iconCoin from '../assets/guidelines-icons/icon-coin.png';
import iconDot from '../assets/guidelines-icons/icon-dot.png';
import iconFruit from '../assets/guidelines-icons/icon-fruit.png';
import iconGrid from '../assets/guidelines-icons/icon-grid.png';
import iconHazard from '../assets/guidelines-icons/icon-hazard.png';
import iconHeart from '../assets/guidelines-icons/icon-heart.png';
import iconHint from '../assets/guidelines-icons/icon-hint.png';
import iconLock from '../assets/guidelines-icons/icon-lock.png';
import iconMove from '../assets/guidelines-icons/icon-move.png';
import iconQuestion from '../assets/guidelines-icons/icon-question.png';
import iconRetry from '../assets/guidelines-icons/icon-retry.png';
import iconScore from '../assets/guidelines-icons/icon-score.png';
import iconStar from '../assets/guidelines-icons/icon-star.png';
import iconTrophy from '../assets/guidelines-icons/icon-trophy.png';
import iconWrong from '../assets/guidelines-icons/icon-wrong.png';
import studentMenuBackground from '../../assets/Game/game_one/Background/background_menu.avif';
import { startStudentMenuLoop, stopStudentMenuLoop, playStudentClickSound } from '../utils/studentMenuAudio';

const PANEL_TRANSITION = {
  initial: { opacity: 0, y: 18, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.99 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
};

const formatPercent = (value) => `${Math.round(Number(value || 0))}%`;
const GAME_ONE_NEXT_LEVEL_MIN_STARS = 2;

const DASHBOARD_GUIDE_ICON_IMAGES = {
  cards: iconCards,
  check: iconCheck,
  clock: iconClock,
  code: iconCode,
  coin: iconCoin,
  dot: iconDot,
  fruit: iconFruit,
  grid: iconGrid,
  hazard: iconHazard,
  heart: iconHeart,
  hint: iconHint,
  lock: iconLock,
  move: iconMove,
  question: iconQuestion,
  retry: iconRetry,
  score: iconScore,
  star: iconStar,
  trophy: iconTrophy,
  wrong: iconWrong,
};

const getDashboardGuideIconType = (item = '') => {
  const text = String(item).toLowerCase();
  if (text.includes('time') || text.includes('timer') || text.includes('ms') || text.includes('second') || text.includes('spawn') || text.includes('speed')) return 'clock';
  if (text.includes('gear') || text.includes('gears') || text.includes('carrot') || text.includes('orange') || text.includes('restore')) return 'fruit';
  if (text.includes('bomb') || text.includes('hazard') || text.includes('trap') || text.includes('enemy')) return 'hazard';
  if (text.includes('lock')) return 'lock';
  if (text.includes('coin')) return 'coin';
  if (text.includes('hint')) return 'hint';
  if (text.includes('question')) return 'question';
  if (text.includes('star')) return 'star';
  if (text.includes('life') || text.includes('lives') || text.includes('heart') || text.includes('health')) return 'heart';
  if (text.includes('score') || text.includes('point') || text.includes('reward')) return 'score';
  if (text.includes('wrong') || text.includes('mistake') || text.includes('fail') || text.includes('incorrect')) return 'wrong';
  if (text.includes('pass') || text.includes('unlock') || text.includes('clear') || text.includes('complete') || text.includes('finish') || text.includes('objective') || text.includes('goal')) return 'trophy';
  if (text.includes('card') || text.includes('pair') || text.includes('match')) return 'cards';
  if (text.includes('board') || text.includes('grid') || text.includes('column')) return 'grid';
  if (text.includes('code') || text.includes('syntax') || text.includes('java') || text.includes('token') || text.includes('output')) return 'code';
  if (text.includes('move') || text.includes('drag') || text.includes('swipe') || text.includes('slice') || text.includes('key') || text.includes('control') || text.includes('arrow')) return 'move';
  if (text.includes('retry') || text.includes('reset') || text.includes('restart') || text.includes('attempt')) return 'retry';
  if (text.includes('answer') || text.includes('correct')) return 'check';
  return 'dot';
};

const getDashboardGuideDisplay = (content) => {
  const sectionItems = (content?.sections || []).flatMap((section) => (
    section?.items || []
  ));
  const sourceItems = sectionItems.length
    ? sectionItems
    : content?.summary || [];
  const seen = new Set();
  const items = sourceItems.filter((item) => {
    const key = String(item).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    title: content?.sections?.[0]?.title || content?.title || 'Guidelines',
    items,
  };
};

const getLevelStateLabel = (status) => {
  if (status === 'NOT_READY') {
    return 'Not Ready';
  }

  if (status === 'COMPLETED') {
    return 'Cleared';
  }

  if (status === 'LOCKED') {
    return 'Locked';
  }

  return 'Ready';
};

const GAME_TWO_DISPLAY_META = Object.freeze({
  title: 'Code Ninja Syntax',
  label: 'Game 2',
});

const GAME_TWO_LEVEL_LABELS = Object.freeze({
  1: {
    title: 'Syntax Slice Basics',
    description: 'Slice beginner Java syntax cards in the correct order while avoiding bombs and decoys.',
  },
  2: {
    title: 'Code Slice Rush',
    description: 'Complete more Java outputs with faster syntax cards, more decoys, and higher pressure.',
  },
  3: {
    title: 'Combo Syntax Challenge',
    description: 'Build correct Java code sequences while keeping your combo alive and avoiding hazards.',
  },
  4: {
    title: 'Bombproof Code Flow',
    description: 'Handle harder Java syntax patterns while bombs and decoys compete for your attention.',
  },
  5: {
    title: 'Ninja Compiler Trial',
    description: 'Clear the hardest syntax-slicing run by completing every required output with precision.',
  },
});

const getGameTwoDisplayLevel = (level) => {
  if (!level) return level;
  const display = GAME_TWO_LEVEL_LABELS[Number(level.levelNumber)];
  return display ? { ...level, ...display } : level;
};

const isGameOneLevelPlayable = (levels, selectedLevel) => {
  if (!selectedLevel) {
    return false;
  }

  if (selectedLevel.isReadyToPlay === false) {
    return false;
  }

  if (selectedLevel.status === 'LOCKED') {
    return false;
  }

  if (selectedLevel.levelNumber <= 1) {
    return true;
  }

  const previousLevel = levels.find((level) => level.levelNumber === selectedLevel.levelNumber - 1);
  if (!previousLevel) {
    return false;
  }

  return previousLevel.status === 'COMPLETED' && Number(previousLevel.bestStars || 0) >= GAME_ONE_NEXT_LEVEL_MIN_STARS;
};

const StudentGameLevelsPage = () => {
  const navigate = useNavigate();
  const { gameType: routeGameType } = useParams();
  const { user, logout } = useAuth();
  const gameType = normalizeGameType(routeGameType);

  const [gameState, setGameState] = useState(null);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevelNumber, setSelectedLevelNumber] = useState(null);
  const [activeLevelNumber, setActiveLevelNumber] = useState(null);
  const [pendingStoryLevelNumber, setPendingStoryLevelNumber] = useState(null);
  const [pendingStoryPageIndex, setPendingStoryPageIndex] = useState(0);
  const [isDashboardGuideOpen, setIsDashboardGuideOpen] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !['GAME_ONE', 'GAME_TWO', 'GAME_FOUR'].includes(gameType)) {
      return undefined;
    }

    ScreenOrientation.lock({
      orientation: activeLevelNumber && gameType !== 'GAME_FOUR' ? 'landscape-primary' : 'portrait-primary',
    }).catch(() => undefined);
    if (activeLevelNumber) {
      StatusBar.hide().catch(() => undefined);
    } else {
      StatusBar.show().catch(() => undefined);
    }

    return () => {
      if (activeLevelNumber) {
        ScreenOrientation.lock({ orientation: 'portrait-primary' }).catch(() => undefined);
        StatusBar.show().catch(() => undefined);
      }
    };
  }, [activeLevelNumber, gameType]);

  const closeActiveGame = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      await restoreNativePortrait();
      StatusBar.show().catch(() => undefined);
    }
    setActiveLevelNumber(null);
  }, []);

  const loadLevels = useCallback(async () => {
    setLoading(true);

    try {
      setLoading(true);
      const levelsResponse = await levelAPI.getMyLevels(gameType);

      if (levelsResponse.status === 'success') {
        const nextGameState = levelsResponse.data.game || null;
        const nextLevels = levelsResponse.data.levels || [];
        setGameState(nextGameState);
        setLevels(nextLevels);
        setSelectedLevelNumber((current) => {
          if (nextLevels.some((level) => level.levelNumber === current)) {
            return current;
          }

          const firstUnlocked = nextLevels.find((level) => level.status !== 'LOCKED');
          return firstUnlocked?.levelNumber || nextLevels[0]?.levelNumber || null;
        });
      }
    } catch (error) {
      toast.error(handleAPIError(error).message);
    } finally {
      setLoading(false);
    }
  }, [gameType]);

  useEffect(() => {
    if (!gameType) {
      navigate('/student', { replace: true });
      return undefined;
    }

    if (routeGameType !== gameType) {
      navigate(`/student/games/${gameType}`, { replace: true });
      return undefined;
    }

    loadLevels();
  }, [gameType, loadLevels, navigate, routeGameType]);

  useEffect(() => {
    setActiveLevelNumber(null);
    setPendingStoryLevelNumber(null);
    setPendingStoryPageIndex(0);
    setIsDashboardGuideOpen(false);
  }, [gameType, user?.id]);

  useEffect(() => {
    startStudentMenuLoop();
  }, []);

  useEffect(() => {
    if (activeLevelNumber) {
      stopStudentMenuLoop({ rewind: false });
      return;
    }

    startStudentMenuLoop();
  }, [activeLevelNumber]);

  useEffect(() => {
    const handleClick = () => {
      playStudentClickSound();
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const displayGameState = useMemo(() => (
    gameType === 'GAME_TWO' && gameState
      ? { ...gameState, ...GAME_TWO_DISPLAY_META }
      : gameState
  ), [gameState, gameType]);

  const displayLevels = useMemo(
    () => [...levels]
      .sort((left, right) => left.levelNumber - right.levelNumber)
      .map((level) => (gameType === 'GAME_TWO' ? getGameTwoDisplayLevel(level) : level)),
    [gameType, levels],
  );

  useEffect(() => {
    if (!displayLevels.length) {
      setSelectedLevelNumber(null);
      return;
    }

    if (displayLevels.some((level) => level.levelNumber === selectedLevelNumber)) {
      return;
    }

    const firstUnlocked = displayLevels.find((level) => level.status !== 'LOCKED');
    setSelectedLevelNumber(firstUnlocked?.levelNumber || displayLevels[0].levelNumber);
  }, [displayLevels, selectedLevelNumber]);

  const selectedLevel = useMemo(() => (
    displayLevels.find((level) => level.levelNumber === selectedLevelNumber)
    || displayLevels[0]
    || null
  ), [displayLevels, selectedLevelNumber]);

  const canPlaySelectedLevel = Boolean(
    selectedLevel
    && Boolean(displayGameState?.isAvailable)
    && (
      gameType !== 'GAME_ONE'
      ? selectedLevel.status !== 'LOCKED'
      : isGameOneLevelPlayable(displayLevels, selectedLevel)
    )
  );

  const launchSelectedLevel = () => {
    if (!selectedLevel || !canPlaySelectedLevel) {
      return;
    }

    const storyBriefing = getLevelStoryBriefing(displayGameState?.gameType || gameType, selectedLevel.levelNumber, selectedLevel);
    if (!storyBriefing) {
      setActiveLevelNumber(selectedLevel.levelNumber);
      return;
    }

    setPendingStoryLevelNumber(selectedLevel.levelNumber);
    setPendingStoryPageIndex(0);
  };

  const handleLogout = () => {
    stopStudentMenuLoop({ rewind: true });
    logout();
  };

  const theme = getStudentGameTheme(displayGameState?.gameType || gameType);
  const pendingStoryLevel = useMemo(() => (
    displayLevels.find((level) => level.levelNumber === pendingStoryLevelNumber) || selectedLevel
  ), [displayLevels, pendingStoryLevelNumber, selectedLevel]);
  const activeLevel = useMemo(() => (
    displayLevels.find((level) => Number(level.levelNumber) === Number(activeLevelNumber)) || null
  ), [activeLevelNumber, displayLevels]);
  const shouldShowPlayableTutorial = Boolean(
    gameType === 'GAME_THREE'
    && activeLevel
    && Number(activeLevel.levelNumber) === 1
    && activeLevel.status !== 'COMPLETED'
    && Number(activeLevel.attemptsCount || 0) === 0
    && Number(activeLevel.bestStars || 0) === 0
    && Number(displayGameState?.completedLevels || 0) === 0
  );
  const pendingStoryBriefing = useMemo(
    () => getLevelStoryBriefing(displayGameState?.gameType || gameType, pendingStoryLevel?.levelNumber, pendingStoryLevel),
    [displayGameState?.gameType, gameType, pendingStoryLevel],
  );
  const trackProgress = useMemo(() => {
    const totalLevels = displayLevels.length;
    const completedLevels = displayLevels.filter((level) => level.status === 'COMPLETED').length;
    const totalStars = displayLevels.reduce((sum, level) => sum + Number(level.bestStars || 0), 0);

    return {
      totalLevels,
      completedLevels,
      totalStars,
      percent: totalLevels > 0 ? Math.round((completedLevels / totalLevels) * 100) : 0,
    };
  }, [displayLevels]);
  const dashboardGuideContent = useMemo(
    () => getDashboardGuideContent(displayGameState?.gameType || gameType),
    [displayGameState?.gameType, gameType],
  );
  const dashboardGuideDisplay = useMemo(
    () => getDashboardGuideDisplay(dashboardGuideContent),
    [dashboardGuideContent],
  );

  return (
    <StudentShell backgroundImage={studentMenuBackground} className="student-shell-warm">
      <StudentMenuTopbar
        user={user}
        kicker="Student"
        title={displayGameState?.title || 'Levels'}
        onBack={() => navigate('/student')}
        backLabel="Menu"
        onLogout={handleLogout}
      />

      <main className="student-shell-main">
        {loading ? (
          <section className="student-levels-page-stack student-levels-skeleton-layout mx-auto flex w-full h-full min-h-0 flex-col gap-4" aria-label="Loading levels">
            <section className="student-panel student-skeleton-panel text-left flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="student-skeleton-copy">
                <span className="student-skeleton-line student-skeleton-line-kicker" />
                <span className="student-skeleton-line student-skeleton-line-heading" />
              </div>
              <div className="student-levels-skeleton-summary">
                {[0, 1, 2].map((item) => (
                  <span key={item} className="student-skeleton-pill" />
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] flex-1 min-h-0 overflow-hidden">
              <div className="student-panel student-skeleton-panel text-left flex flex-col flex-1 min-h-0 overflow-hidden">
                <span className="student-skeleton-line student-skeleton-line-kicker" />
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 overflow-hidden pr-3 pb-4 flex-1 content-start">
                  {[0, 1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="student-level-card student-skeleton-card">
                      <div className="student-level-card-head">
                        <span className="student-skeleton-line student-skeleton-line-kicker" />
                        <span className="student-skeleton-pill" />
                      </div>
                      <span className="student-skeleton-line student-skeleton-line-heading" />
                      <span className="student-skeleton-line student-skeleton-line-title" />
                      <span className="student-skeleton-line" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="student-panel student-skeleton-panel text-left">
                <span className="student-skeleton-line student-skeleton-line-kicker" />
                <span className="student-skeleton-line student-skeleton-line-heading" />
                <span className="student-skeleton-line student-skeleton-line-wide" />
                <div className="mt-4 flex flex-col gap-2">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="student-insight-row student-skeleton-stat">
                      <span className="student-skeleton-line student-skeleton-line-title" />
                      <span className="student-skeleton-line" />
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <span className="student-skeleton-button" />
                </div>
              </div>
            </section>
          </section>
        ) : displayLevels.length === 0 ? (
          <section className="student-panel student-empty-panel student-panel-full">
            <span className="student-card-icon student-icon-slate">
              <Lock className="h-6 w-6" />
            </span>
            <h2 className="student-section-title">No Levels Yet</h2>
            <p className="student-body-copy">This track is not available right now.</p>
          </section>
        ) : (
          <motion.section className="student-levels-page-stack mx-auto flex w-full h-full min-h-0 flex-col gap-4" {...PANEL_TRANSITION}>
            <section className={clsx('student-panel text-left flex flex-col sm:flex-row items-center justify-between gap-4', `student-surface-${theme.tone}`)}>
              <div>
                <p className="student-eyebrow">{displayGameState?.label || 'Track'}</p>
                <h2 className="student-section-title">{displayGameState?.title || 'Levels'}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="student-inline-summary-card flex-row items-center gap-3 py-2 px-4 bg-white/40 border-white/50 border-2 rounded-2xl shadow-sm">
                  <span className="student-inline-summary-value text-xl font-black text-slate-800">{formatPercent(trackProgress.percent)}</span>
                  <span className="student-inline-summary-label text-[10px] font-bold uppercase tracking-widest text-slate-500">progress</span>
                </div>
                <div className="student-inline-summary-card flex-row items-center gap-3 py-2 px-4 bg-white/40 border-white/50 border-2 rounded-2xl shadow-sm">
                  <span className="student-inline-summary-value text-xl font-black text-slate-800">{trackProgress.completedLevels}</span>
                  <span className="student-inline-summary-label text-[10px] font-bold uppercase tracking-widest text-slate-500">cleared</span>
                </div>
                <div className="student-inline-summary-card flex-row items-center gap-3 py-2 px-4 bg-white/40 border-white/50 border-2 rounded-2xl shadow-sm">
                  <span className="student-inline-summary-value text-xl font-black text-slate-800">{trackProgress.totalStars}</span>
                  <span className="student-inline-summary-label text-[10px] font-bold uppercase tracking-widest text-slate-500">stars</span>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] flex-1 min-h-0 overflow-hidden">
              <div className="student-panel text-left flex flex-col flex-1 min-h-0 overflow-hidden">
                <p className="student-eyebrow shrink-0">Level Select</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 overflow-y-auto pr-3 pb-4 flex-1 content-start">
                  {displayLevels.map((level) => {
                    const isLocked = level.status === 'LOCKED';
                    const displayStatus = level.isReadyToPlay === false ? 'NOT_READY' : level.status;
                    const isSelected = selectedLevel?.levelNumber === level.levelNumber;

                    return (
                      <button
                        key={level.id}
                        type="button"
                        className={clsx(
                          'student-level-card text-left',
                          isSelected && 'student-level-card-active',
                          isLocked && 'student-level-card-locked',
                        )}
                        onClick={() => setSelectedLevelNumber(level.levelNumber)}
                      >
                        <div className="student-level-card-head">
                          <span className="student-eyebrow">Level</span>
                          <span className={clsx('student-pill', isLocked || displayStatus === 'NOT_READY' ? 'student-pill-muted' : `student-pill-${theme.tone}`)}>
                            {getLevelStateLabel(displayStatus)}
                          </span>
                        </div>

                        <div className="student-level-card-number">
                          {String(level.levelNumber).padStart(2, '0')}
                        </div>
                        <div className="student-level-card-title">{level.title}</div>

                        <div className="student-level-card-stars">
                          {[0, 1, 2].map((starIndex) => (
                            <Star
                              key={starIndex}
                              className={clsx('h-4 w-4', starIndex < level.bestStars && 'fill-current')}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={clsx('student-panel text-left', `student-surface-${theme.tone}`)}>
                <p className="student-eyebrow">Selected Level</p>
                <h3 className="student-section-title">
                  {selectedLevel ? `Level ${String(selectedLevel.levelNumber).padStart(2, '0')}` : 'Choose a level'}
                </h3>
                <p className="student-body-copy">{selectedLevel?.title || 'Select any level from the menu.'}</p>
                <p className="student-body-copy student-body-copy-tight">
                  {selectedLevel?.description || 'The selected mission description will appear here.'}
                </p>

                <div className="mt-4">
                  <StudentActionButton
                    variant="slate"
                    size="compact"
                    className="student-button-inline student-dashboard-guidelines-toggle w-full"
                    contentClassName="justify-between"
                    onClick={() => setIsDashboardGuideOpen((current) => !current)}
                    disabled={!selectedLevel}
                    aria-expanded={isDashboardGuideOpen}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Level Guidelines
                    </span>
                    {isDashboardGuideOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </StudentActionButton>
                </div>

                <AnimatePresence initial={false}>
                  {isDashboardGuideOpen && selectedLevel && (
                    <motion.section
                      className="student-dashboard-guidelines-card"
                      initial={{ opacity: 0, height: 0, y: -6 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -6 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      aria-label="Dashboard level guidelines"
                    >
                      <div className="student-dashboard-guidelines-scroll">
                        <h4>{dashboardGuideDisplay.title}</h4>
                        <ul>
                          {dashboardGuideDisplay.items.map((item, index) => {
                            const iconType = getDashboardGuideIconType(item);
                            const iconSrc = DASHBOARD_GUIDE_ICON_IMAGES[iconType] || DASHBOARD_GUIDE_ICON_IMAGES.dot;

                            return (
                              <li key={`${item}-${index}`}>
                                <span className={`student-dashboard-guidelines-icon student-dashboard-guidelines-icon-${iconType}`} aria-hidden="true">
                                  <img src={iconSrc} alt="" draggable="false" />
                                </span>
                                <span>{item}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </motion.section>
                  )}
                </AnimatePresence>

                <div className="mt-4 flex flex-col gap-2">
                  <div className="student-insight-row">
                    <span className="student-insight-label">Status</span>
                    <strong className="student-insight-value">
                      {getLevelStateLabel(selectedLevel?.isReadyToPlay === false ? 'NOT_READY' : selectedLevel?.status)}
                    </strong>
                  </div>
                  <div className="student-insight-row">
                    <span className="student-insight-label">Attempts</span>
                    <strong className="student-insight-value">{selectedLevel?.attemptsCount || 0}</strong>
                  </div>
                  <div className="student-insight-row">
                    <span className="student-insight-label">Best Stars</span>
                    <strong className="student-insight-value">{selectedLevel?.bestStars || 0}</strong>
                  </div>
                </div>

                <div className="mt-4">
                  <StudentActionButton
                    variant={canPlaySelectedLevel ? 'forest' : 'slate'}
                    className="student-button-inline"
                    onClick={launchSelectedLevel}
                    disabled={!canPlaySelectedLevel}
                  >
                    Start Level
                    {canPlaySelectedLevel && <Play className="h-4 w-4" />}
                    {canPlaySelectedLevel && <ChevronRight className="h-4 w-4" />}
                  </StudentActionButton>
                </div>
              </div>
            </section>
          </motion.section>
        )}
      </main>

      <AnimatePresence>
        {pendingStoryLevelNumber && !activeLevelNumber && (
          <motion.div
            className="student-story-intro-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="story-intro-title"
          >
            <motion.section
              className="student-story-motion-frame"
              initial={{ y: 18, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 12, scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <StudentStoryFrame
                frame={pendingStoryBriefing}
                page={pendingStoryBriefing?.pages?.[pendingStoryPageIndex]}
                pages={pendingStoryBriefing?.pages || []}
                currentPage={pendingStoryPageIndex}
                totalPages={pendingStoryBriefing?.pages?.length || pendingStoryBriefing?.totalPages}
                levelDescription={pendingStoryLevel?.description}
                onBack={() => {
                  if (pendingStoryPageIndex > 0) {
                    setPendingStoryPageIndex((current) => Math.max(0, current - 1));
                    return;
                  }
                  setPendingStoryLevelNumber(null);
                  setPendingStoryPageIndex(0);
                }}
                onPrevious={() => setPendingStoryPageIndex((current) => Math.max(0, current - 1))}
                onNext={() => setPendingStoryPageIndex((current) => Math.min((pendingStoryBriefing?.pages?.length || 1) - 1, current + 1))}
                onSkip={() => {
                  setActiveLevelNumber(pendingStoryLevelNumber);
                  setPendingStoryLevelNumber(null);
                  setPendingStoryPageIndex(0);
                }}
                onPrimary={() => {
                  setActiveLevelNumber(pendingStoryLevelNumber);
                  setPendingStoryLevelNumber(null);
                  setPendingStoryPageIndex(0);
                }}
              />
            </motion.section>
          </motion.div>
        )}

        {activeLevelNumber && (
          <StudentGameOverlay
            key={`${gameType}-${activeLevelNumber}`}
            gameType={gameType}
            levelNumber={activeLevelNumber}
            forceFullReloadOnAdvance={gameType === 'GAME_ONE'}
            showPlayableTutorial={shouldShowPlayableTutorial}
            onClose={closeActiveGame}
            onAdvanceToLevel={(nextLevelNumber) => {
              setActiveLevelNumber(nextLevelNumber);
            }}
            onProgressSync={() => {
              loadLevels();
            }}
            onContinueToGame={(nextGameType) => {
              setActiveLevelNumber(null);
              navigate(`/student/games/${nextGameType}`);
            }}
          />
        )}
      </AnimatePresence>
    </StudentShell>
  );
};

export default StudentGameLevelsPage;
