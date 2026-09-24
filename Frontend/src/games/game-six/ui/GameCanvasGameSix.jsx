import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock3,
  Coins,
  Heart,
  Keyboard,
  Loader2,
  LogOut,
  RotateCcw,
  Star,
  Zap,
} from 'lucide-react';
import gameSixMusic from '../../../assets/game-arcade/audio/game6.mp3';
import sharedSfx from '../../../assets/game-arcade/audio/soundeffects.mp3';
import combo3Sound from '../../../assets/game-arcade/audio/combo_3_x2.mp3';
import combo5Sound from '../../../assets/game-arcade/audio/combo_5_x3.mp3';
import combo10Sound from '../../../assets/game-arcade/audio/combo_10_x5.mp3';
import gameOverSound from '../assets/game-over-sfx.mp3';
import levelOneBackground from '../assets/backgrounds/syntax bg 1.png';
import levelTwoBackground from '../assets/backgrounds/syntax bg 2.png';
import levelThreeBackground from '../assets/backgrounds/syntax bg 3.png';
import levelFourBackground from '../assets/backgrounds/syntax bg 4.png';
import levelFiveBackground from '../assets/backgrounds/syntax bg 5.png';
import './GameCanvasGameSix.css';
import GameSixAnnouncementBoard from './GameSixAnnouncementBoard';
import GameGuideOverlay from '../../shared/ui/GameGuideOverlay';
import GameSixInteractiveTutorial from './GameSixInteractiveTutorial';
import PlayableTutorialCoach from '../../shared/ui/PlayableTutorialCoach';
import { buildGameSixGuideContent } from '../../shared/ui/levelGuideBuilders';
import { getStudentMusicVolume, getStudentSfxVolume } from '../../../utils/studentMenuAudio';
import { addUserCoins } from '../../shared/gameSessionPersistence';
import { handleAPIError, levelAPI } from '../../../utils/api';

const GAME_SIX_TUTORIAL_STEPS = Object.freeze([
  { title: 'Practice Tutorial', body: 'This tutorial teaches falling syntax terms, typing accuracy, health, and combos before Level 1 starts.', buttonLabel: 'Start Practice' },
  { title: 'Read The Falling Term', body: 'Read the complete Java syntax word, then type that exact word before it reaches the bottom.', buttonLabel: 'Try A Word' },
  { title: 'Press Enter', body: 'Type the correct term into the input box, then press Enter to clear it and earn score.', buttonLabel: 'Clear A Puzzle' },
  { title: 'Try Again', body: 'A wrong answer leaves the puzzle falling, so correct your answer quickly. A missed card removes health.', buttonLabel: 'Continue' },
  { title: 'Build A Combo', body: 'Every reward streak gives coins and restores 1 health only if health is not full.', buttonLabel: 'Finish Tutorial' },
]);

const GAME_SIX_LEVEL_BACKGROUNDS = Object.freeze({
  1: levelOneBackground,
  2: levelTwoBackground,
  3: levelThreeBackground,
  4: levelFourBackground,
  5: levelFiveBackground,
});

const CORRECT_ANSWER_SOUND_SRC = new URL(
  '../../../../assets/Game/game_two/Game 2_ Hardware/Music & Sound Effects/correct answer sf.mp3',
  import.meta.url,
).href;
const INCORRECT_ANSWER_SOUND_SRC = new URL(
  '../../../../assets/Game/game_two/Game 2_ Hardware/Music & Sound Effects/incorrect answer sf.mp3',
  import.meta.url,
).href;

const getSettings = (levelData) => {
  const level = Math.max(1, Math.min(5, Number(levelData?.levelNumber || 1)));
  const fallbackTargets = [5, 10, 15, 20, 25];
  const fallbackSeconds = [120, 300, 360, 420, 480];
  return {
    level,
    targetWords: Number(levelData?.settings?.targetWords || fallbackTargets[level - 1]),
    seconds: Number(levelData?.settings?.seconds || fallbackSeconds[level - 1]),
    lives: Number(levelData?.settings?.lives || 5),
    rewardEvery: Number(levelData?.settings?.rewardEvery || 3),
  };
};

const DROP_LANES = Object.freeze([12, 31, 50, 69, 88]);
const LEVEL_ONE_SPAWN_GAP_MS = 2000;

const getLevelOneMultiplier = (combo) => {
  if (combo >= 10) return 5;
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
};

const getDropTuning = (level, cleared, rewardEvery) => {
  const progressBoost = Math.floor(cleared / Math.max(3, rewardEvery));
  const pressureLevel = Math.min(7, level + progressBoost);
  const spawnMsByLevel = [2000, 2250, 1900, 1600, 1350];
  const fallSpeedByLevel = [0.27, 0.22, 0.255, 0.22, 0.205];

  return {
    pressureLevel,
    maxDrops: level === 5 ? 4 : 1,
    spawnMs: level === 1
      ? LEVEL_ONE_SPAWN_GAP_MS
      : Math.max(1050, spawnMsByLevel[level - 1] - (progressBoost * 110)),
    fallSpeed: fallSpeedByLevel[level - 1] + (progressBoost * 0.016),
  };
};

const chooseDropLane = (items) => {
  const blockedLanes = new Set(
    items
      .filter((item) => item.y < 24)
      .map((item) => item.lane)
      .filter((lane) => Number.isInteger(lane)),
  );
  const availableLanes = DROP_LANES
    .map((x, lane) => ({ x, lane }))
    .filter(({ lane }) => !blockedLanes.has(lane));

  if (!availableLanes.length) return null;
  return availableLanes[Math.floor(Math.random() * availableLanes.length)];
};

const makeDrop = (level, serverTerm, cleared = 0, rewardEvery = 3) => {
  const tuning = getDropTuning(level, cleared, rewardEvery);
  return {
    ...serverTerm,
    id: serverTerm.id,
    scrambled: serverTerm.display || serverTerm.scrambled,
    x: Number(serverTerm.lane),
    lane: DROP_LANES.indexOf(Number(serverTerm.lane)),
    y: -12,
    speed: tuning.fallSpeed + (level === 3 ? 0.012 : Math.random() * 0.025),
  };
};

const getStaggeredSpawnGap = (drop, gapMs = 1000) => drop.speed * (gapMs / 28);

let persistentGameSixMusic = null;
let persistentGameSixMusicSrc = '';
let persistentGameSixSfx = null;
let persistentGameSixSfxSrc = '';

const useArcadeAudio = (musicSrc, sfxSrc, active) => {
  const musicRef = useRef(null);
  const sfxRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.Audio === 'undefined') return undefined;
    const music = persistentGameSixMusic && persistentGameSixMusicSrc === musicSrc
      ? persistentGameSixMusic
      : new Audio(musicSrc);
    music.loop = true;
    music.volume = getStudentMusicVolume(0.28);
    music.preload = 'auto';
    persistentGameSixMusic = music;
    persistentGameSixMusicSrc = musicSrc;
    musicRef.current = music;

    const sfx = persistentGameSixSfx && persistentGameSixSfxSrc === sfxSrc
      ? persistentGameSixSfx
      : new Audio(sfxSrc);
    sfx.volume = getStudentSfxVolume(0.52);
    sfx.preload = 'auto';
    persistentGameSixSfx = sfx;
    persistentGameSixSfxSrc = sfxSrc;
    sfxRef.current = sfx;

    return () => {
      music.pause();
      sfx.pause();
      sfx.currentTime = 0;
      musicRef.current = null;
      sfxRef.current = null;
    };
  }, [musicSrc, sfxSrc]);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;
    if (!active) {
      music.pause();
      const sfx = sfxRef.current;
      if (sfx) {
        sfx.pause();
        sfx.currentTime = 0;
      }
      return;
    }
    const resumeAudio = () => {
      const playPromise = music.play();
      if (playPromise?.catch) playPromise.catch(() => {});
    };

    resumeAudio();
    window.addEventListener('pointerdown', resumeAudio);
    window.addEventListener('keydown', resumeAudio);
    return () => {
      window.removeEventListener('pointerdown', resumeAudio);
      window.removeEventListener('keydown', resumeAudio);
    };
  }, [active]);

  return useCallback(() => {
    const sfx = sfxRef.current;
    if (!sfx) return;
    try {
      sfx.currentTime = 0;
      const playPromise = sfx.play();
      if (playPromise?.catch) playPromise.catch(() => {});
    } catch (error) {
      // Ignore browser audio restrictions.
    }
  }, []);
};

const useAnswerSounds = (active = true) => {
  const correctRef = useRef(null);
  const incorrectRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.Audio === 'undefined') return undefined;

    const correct = new Audio(CORRECT_ANSWER_SOUND_SRC);
    correct.preload = 'auto';
    correct.volume = getStudentSfxVolume(0.7);
    correct.load();
    correctRef.current = correct;

    const incorrect = new Audio(INCORRECT_ANSWER_SOUND_SRC);
    incorrect.preload = 'auto';
    incorrect.volume = getStudentSfxVolume(0.7);
    incorrect.load();
    incorrectRef.current = incorrect;

    return () => {
      correct.pause();
      incorrect.pause();
      correctRef.current = null;
      incorrectRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (active) return;
    [correctRef.current, incorrectRef.current].forEach((audio) => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
    });
  }, [active]);

  const play = useCallback((audioRef) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise?.catch) playPromise.catch(() => {});
  }, []);

  const prime = useCallback(() => {
    [correctRef, incorrectRef].forEach((audioRef) => {
      const audio = audioRef.current;
      if (!audio || ['pending', 'true'].includes(audio.dataset.gameSixPrimed)) return;
      const originalVolume = audio.volume;
      audio.dataset.gameSixPrimed = 'pending';
      audio.volume = 0;
      const playPromise = audio.play();
      if (playPromise?.then) {
        playPromise.then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = originalVolume;
          audio.dataset.gameSixPrimed = 'true';
        }).catch(() => {
          audio.volume = originalVolume;
          delete audio.dataset.gameSixPrimed;
        });
      }
    });
  }, []);

  return {
    playCorrectAnswer: useCallback(() => play(correctRef), [play]),
    playIncorrectAnswer: useCallback(() => play(incorrectRef), [play]),
    primeAnswerSounds: prime,
  };
};

const useComboMilestoneSounds = (active = true) => {
  const soundsRef = useRef(new Map());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.Audio === 'undefined') return undefined;
    const sounds = new Map([
      [3, new Audio(combo3Sound)],
      [5, new Audio(combo5Sound)],
      [10, new Audio(combo10Sound)],
    ]);
    sounds.forEach((audio) => {
      audio.preload = 'auto';
      audio.volume = getStudentSfxVolume(1);
      audio.load();
    });
    soundsRef.current = sounds;

    return () => {
      sounds.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      soundsRef.current = new Map();
    };
  }, []);

  useEffect(() => {
    if (active) return;
    soundsRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, [active]);

  return useCallback((comboCount) => {
    const audio = soundsRef.current.get(comboCount);
    if (!audio) return;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise?.catch) playPromise.catch(() => {});
  }, []);
};

const PixelPanel = ({ children, className = '' }) => (
  <div className={`game-six-card ${className}`}>
    {children}
  </div>
);

const GameCanvasGameSix = ({
  levelData,
  sessionInfo,
  onLevelComplete,
  onLevelFail,
  onExitRequest,
  resultData,
  gameplayData,
  isSubmitting,
  canAdvanceLevel,
  hideResultOverlay,
  onRetry,
  onBack,
  onNextLevel,
  suppressIntroTutorial = false,
  showLevelGuideline = false,
  gameTutorialRequested = false,
  continueToTutorialAfterGuide = false,
  onGameTutorial,
  playerId = 'guest',
  initialCoins = 0,
  onCoinBalanceChange,
}) => {
  const settings = useMemo(() => getSettings(levelData), [levelData]);
  const isFinalLevel = settings.level >= 5;
  const guideContent = useMemo(
    () => buildGameSixGuideContent(levelData),
    [levelData],
  );
  const isTutorialLevel = Boolean(levelData?.isTutorialLevel);
  const [timeLeft, setTimeLeft] = useState(settings.seconds);
  const [drops, setDrops] = useState(() => (sessionInfo?.gameSix?.activeTerms || [])
    .map((term, index) => {
      const drop = makeDrop(settings.level, term, 0, settings.rewardEvery);
      if (settings.level === 3 || settings.level === 4) {
        return { ...drop, y: -12 - (index * getStaggeredSpawnGap(drop)) };
      }
      return settings.level === 5
        ? { ...drop, y: -12 - (index * getStaggeredSpawnGap(drop)) }
        : drop;
    }));
  const [typed, setTyped] = useState('');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(() => Math.max(0, Math.round(Number(initialCoins) || 0)));
  const [cleared, setCleared] = useState(0);
  const [health, setHealth] = useState(settings.lives);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [comboFeedback, setComboFeedback] = useState(null);
  const [targetFeedback, setTargetFeedback] = useState('');
  const previousTargetRef = useRef(null);
  const [answerState, setAnswerState] = useState({ pending: false, message: '', type: '' });
  const [finished, setFinished] = useState(false);
  const isFirstLevelGuide = settings.level === 1;
  const [showTutorial, setShowTutorial] = useState(true);
  const [tutorialView, setTutorialView] = useState(
    showLevelGuideline ? 'guide' : 'announcement',
  );
  const [guideOpenedDuringGameplay, setGuideOpenedDuringGameplay] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialCoachOpen, setTutorialCoachOpen] = useState(isTutorialLevel);
  const shouldPauseForTutorialCoach = Boolean(isTutorialLevel && tutorialCoachOpen);
  const showGuide = showTutorial && tutorialView === 'guide';
  const [tutorialDemo, setTutorialDemo] = useState(null);
  const activeDemo = showTutorial && ['tutorial', 'first-play-tutorial'].includes(tutorialView) ? tutorialDemo : null;
  const displayAnswerState = activeDemo || answerState;

  useEffect(() => {
    if (Number(gameTutorialRequested) > 0 && !isTutorialLevel) {
      setGuideOpenedDuringGameplay(false);
      setTutorialView('tutorial');
      setShowTutorial(true);
    }
  }, [gameTutorialRequested, isTutorialLevel]);
  const gameplayAudioActive = !showTutorial && !shouldPauseForTutorialCoach && !finished && !resultData;
  const playSfx = useArcadeAudio(gameSixMusic, sharedSfx, gameplayAudioActive);
  const { playCorrectAnswer, playIncorrectAnswer, primeAnswerSounds } = useAnswerSounds(gameplayAudioActive);
  const playComboMilestone = useComboMilestoneSounds(gameplayAudioActive);
  useEffect(() => {
    if (hideResultOverlay || !resultData || resultData.result === 'COMPLETED') return undefined;

    const audio = new Audio(gameOverSound);
    audio.preload = 'auto';
    audio.volume = getStudentSfxVolume(1);
    const playPromise = audio.play();
    if (playPromise?.catch) playPromise.catch(() => {});

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [hideResultOverlay, resultData]);
  const inputRef = useRef(null);
  const tutorialRootRef = useRef(null);
  const resolvingMissesRef = useRef(new Set());
  const answerPendingRef = useRef(false);
  const healthRef = useRef(settings.lives);
  const leadingDrop = drops.reduce((leading, drop) => (!leading || drop.y > leading.y ? drop : leading), null);
  const instructionDrop = settings.level === 5
    ? drops
      .filter((drop) => drop.required !== false)
      .reduce((leading, drop) => (!leading || drop.y > leading.y ? drop : leading), null)
    : leadingDrop;
  const speedWave = settings.level === 5 && leadingDrop?.challengeType === 'speed-wave';
  const comboEnabled = settings.level >= 1 && settings.level <= 5;
  const comboMultiplier = comboEnabled ? getLevelOneMultiplier(streak) : 1;
  const targetCategory = instructionDrop?.targetCategory
    || drops.find((drop) => drop.targetCategory)?.targetCategory
    || sessionInfo?.gameSix?.category
    || 'Data Types';
  const targetIsChanging = settings.level === 3
    && Boolean(previousTargetRef.current)
    && previousTargetRef.current !== targetCategory;
  const challengeMode = sessionInfo?.gameSix?.challengeMode || 'speed-wave';
  const levelBackground = GAME_SIX_LEVEL_BACKGROUNDS[settings.level] || levelOneBackground;
  const targetChallengeActive = challengeMode === 'target'
    || leadingDrop?.challengeType === 'target';

  const applyActiveTerms = useCallback((activeTerms, resetPositions = false) => {
    setDrops((current) => {
      const incomingTerms = activeTerms || [];
      let staggeredSpawnIndex = 0;
      let nextSpawnY = -12;
      return incomingTerms.map((term) => {
        const existing = current.find((item) => item.id === term.id);
        if (!resetPositions && existing) {
          return {
            ...existing,
            ...term,
            scrambled: term.display || term.scrambled,
            y: existing.y,
            speed: existing.speed,
          };
        }
        const drop = makeDrop(settings.level, term, cleared, settings.rewardEvery);
        if (settings.level === 1) {
          return {
            ...drop,
            y: -12 - getStaggeredSpawnGap(drop, LEVEL_ONE_SPAWN_GAP_MS),
          };
        }
        if (settings.level === 3 || settings.level === 4) {
          const staggeredDrop = {
            ...drop,
            y: -12 - (staggeredSpawnIndex * getStaggeredSpawnGap(drop)),
          };
          staggeredSpawnIndex += 1;
          return staggeredDrop;
        }
        if (settings.level !== 5) return drop;
        const staggeredDrop = { ...drop, y: nextSpawnY };
        nextSpawnY -= getStaggeredSpawnGap(drop);
        return staggeredDrop;
      });
    });
  }, [cleared, settings.level, settings.rewardEvery]);

  const resolveMissedItems = useCallback(async (items, onResolved) => {
    let latestActiveTerms = null;
    const unresolvedItems = [];
    let latestResolution = null;
    for (const item of items) {
      if (resolvingMissesRef.current.has(item.id)) continue;
      resolvingMissesRef.current.add(item.id);
      try {
        const response = await levelAPI.resolveGameSixTerm(settings.level, sessionInfo.sessionId, { type: 'MISS', termId: item.id });
        latestResolution = response?.data || null;
        latestActiveTerms = latestResolution?.activeTerms || [];
      } catch {
        try {
          const retryResponse = await levelAPI.resolveGameSixTerm(settings.level, sessionInfo.sessionId, { type: 'MISS', termId: item.id });
          latestResolution = retryResponse?.data || null;
          latestActiveTerms = latestResolution?.activeTerms || [];
        } catch {
          unresolvedItems.push(item);
        }
      } finally {
        resolvingMissesRef.current.delete(item.id);
      }
    }
    if (latestActiveTerms) applyActiveTerms(latestActiveTerms, settings.level !== 5);
    if (latestResolution) {
      const nextMistakes = Number(latestResolution.mistakes || 0);
      const nextHealth = Math.max(0, settings.lives - nextMistakes);
      healthRef.current = nextHealth;
      setMistakes(nextMistakes);
      setHealth(nextHealth);
      if (latestResolution.penalty) {
        setStreak(0);
      }
    }
    if (unresolvedItems.length > 0) {
      setDrops((current) => {
        const currentIds = new Set(current.map((item) => item.id));
        return [
          ...current,
          ...unresolvedItems
            .filter((item) => !currentIds.has(item.id))
            .map((item) => ({ ...item, y: -12 })),
        ];
      });
      return;
    }
    onResolved?.(latestResolution);
  }, [applyActiveTerms, sessionInfo.sessionId, settings.level, settings.lives]);

  const dropTuning = useMemo(() => (
    getDropTuning(settings.level, cleared, settings.rewardEvery)
  ), [cleared, settings.level, settings.rewardEvery]);
  const speedLevel = dropTuning.pressureLevel;
  const spawnMs = dropTuning.spawnMs;

  useEffect(() => {
    if (!comboFeedback) return undefined;
    const id = window.setTimeout(() => setComboFeedback(null), 1400);
    return () => window.clearTimeout(id);
  }, [comboFeedback]);

  useEffect(() => {
    if (settings.level !== 3) return undefined;
    if (previousTargetRef.current && previousTargetRef.current !== targetCategory) {
      setComboFeedback(null);
      setTargetFeedback(`NEW TARGET! ${targetCategory.toUpperCase()}`);
    }
    previousTargetRef.current = targetCategory;
    const id = window.setTimeout(() => setTargetFeedback(''), 1800);
    return () => window.clearTimeout(id);
  }, [settings.level, targetCategory]);

  const handleContinueTutorialStep = () => {
    if (tutorialStepIndex === 0) {
      setTutorialStepIndex(1);
    }
    setTutorialCoachOpen(false);
    if (!window.matchMedia?.('(pointer: coarse)').matches) inputRef.current?.focus({ preventScroll: true });
  };

  const finish = useCallback((outcome, finalCleared = cleared, finalScore = score, finalMistakes = mistakes) => {
    if (finished) return;
    setFinished(true);
    const payload = {
      outcome,
      points: finalScore,
      mistakes: finalMistakes,
      completedTasks: finalCleared,
      totalTasks: settings.targetWords,
    };
    if (outcome === 'COMPLETED') onLevelComplete?.(payload);
    else onLevelFail?.(payload);
  }, [cleared, finished, mistakes, onLevelComplete, onLevelFail, score, settings.targetWords]);

  useEffect(() => {
    if (showTutorial || shouldPauseForTutorialCoach || finished || resultData) return undefined;
    // Mobile players control the keyboard; drops must not reopen it after dismissal.
    if (window.matchMedia?.('(pointer: coarse)').matches) return undefined;
    const focusInput = () => inputRef.current?.focus({ preventScroll: true });
    const frameId = window.requestAnimationFrame(focusInput);
    return () => window.cancelAnimationFrame(frameId);
  }, [answerState.pending, cleared, drops.length, finished, health, resultData, shouldPauseForTutorialCoach, showTutorial]);

  useEffect(() => {
    if (showTutorial || shouldPauseForTutorialCoach || finished || resultData) return undefined;
    const id = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          finish(cleared >= settings.targetWords ? 'COMPLETED' : 'FAILED');
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [cleared, finish, finished, resultData, settings.targetWords, shouldPauseForTutorialCoach, showTutorial]);

  useEffect(() => {
    if (showTutorial || shouldPauseForTutorialCoach || finished || resultData) return undefined;
    const id = window.setInterval(() => {
      setDrops((items) => {
        if (resolvingMissesRef.current.size > 0) return items;

        const speedWaveMultiplier = settings.level === 5 ? 1.55 : 1.4;
        const moved = items.map((item) => ({ ...item, y: item.y + (item.speed * (speedWave ? speedWaveMultiplier : 1)) }));
        const missedItem = moved
          .filter((item) => item.y >= 94)
          .sort((left, right) => right.y - left.y)[0];
        const next = missedItem
          ? moved.filter((item) => item.id !== missedItem.id)
          : moved;
        if (missedItem) {
          resolveMissedItems(
            [missedItem],
            (resolution) => {
              const nextMistakes = Number(resolution?.mistakes || mistakes);
              if (resolution?.penalty && settings.lives - nextMistakes <= 0) {
                finish('FAILED', cleared, score, nextMistakes);
              }
            },
          );
        }
        return next;
      });
    }, 28);
    return () => window.clearInterval(id);
  }, [cleared, finish, finished, mistakes, resolveMissedItems, resultData, score, settings.lives, shouldPauseForTutorialCoach, showTutorial, speedWave]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    const answer = typed.trim();
    if (!answer || answerPendingRef.current || showTutorial || shouldPauseForTutorialCoach || finished || resultData) return;
    answerPendingRef.current = true;
    setAnswerState({ pending: true, message: 'Checking answer...', type: 'pending' });
    let resolution;
    try {
      const response = await levelAPI.resolveGameSixTerm(settings.level, sessionInfo.sessionId, { type: 'ANSWER', answer, streak: streak + 1 });
      resolution = response?.data;
    } catch (error) {
      answerPendingRef.current = false;
      setAnswerState({
        pending: false,
        message: handleAPIError(error).message || 'The answer could not be checked. Please try again.',
        type: 'error',
      });
      return;
    }
    answerPendingRef.current = false;
    if (!resolution?.correct) {
      const nextMistakes = Number.isFinite(Number(resolution?.mistakes))
        ? Number(resolution.mistakes)
        : mistakes + 1;
      const nextHealth = Math.max(0, settings.lives - nextMistakes);
      healthRef.current = nextHealth;
      setMistakes(nextMistakes);
      setHealth(nextHealth);
      setStreak(0);
      applyActiveTerms(resolution?.activeTerms || []);
      setAnswerState({
        pending: false,
        message: resolution?.interaction === 'answered-ignored-word'
          ? `${settings.level === 4 ? 'FAKE SYNTAX! ' : ''}That word should be ignored. You lost 1 health (${nextHealth}/${settings.lives}).`
          : `Incorrect term. You lost 1 health (${nextHealth}/${settings.lives}).`,
        type: 'incorrect',
      });
      playIncorrectAnswer();
      if (nextHealth > 0 && isTutorialLevel && tutorialStepIndex < 3) {
        setTutorialStepIndex(3);
        setTutorialCoachOpen(true);
      }
      setTyped('');
      if (nextHealth <= 0) finish('FAILED', cleared, score, nextMistakes);
      return;
    }

    if (settings.level === 5 && !resolution.pairCompleted) {
      playCorrectAnswer();
      applyActiveTerms(resolution.activeTerms || []);
      setAnswerState({ pending: false, message: `✓ ${answer} — 1/2 FOUND`, type: 'correct' });
      setTyped('');
      return;
    }

    const nextCleared = cleared + 1;
    const nextStreak = streak + 1;
    const awardNow = comboEnabled
      ? nextStreak % settings.rewardEvery === 0
      : nextStreak >= settings.rewardEvery;
    const coinReward = awardNow ? 15 + (settings.level * 5) : 0;
    const nextCoins = coinReward > 0 ? addUserCoins(playerId, coinReward).balance : coins;
    const nextMultiplier = comboEnabled ? getLevelOneMultiplier(nextStreak) : 1;
    const pointsEarned = Math.max(0, Number(resolution?.pointsEarned || 0));
    const nextScore = score + pointsEarned;

    const isFinalClear = nextCleared >= settings.targetWords;
    if (!isFinalClear) {
      playCorrectAnswer();
      playSfx();
    }
    setAnswerState({ pending: false, message: settings.level === 5
      ? `PAIR COMPLETE! +${pointsEarned} points. Pair ${nextCleared}/${settings.targetWords}.`
      : `Correct! +${pointsEarned} points. Round ${nextCleared}/${settings.targetWords}.`, type: 'correct' });
    if (isTutorialLevel && tutorialStepIndex < 2) {
      setTutorialStepIndex(2);
      setTutorialCoachOpen(true);
    } else if (isTutorialLevel && awardNow && tutorialStepIndex < 4) {
      setTutorialStepIndex(4);
      setTutorialCoachOpen(true);
    }
    applyActiveTerms(resolution.activeTerms);
    setCleared(nextCleared);
    setCoins(nextCoins);
    if (coinReward > 0) onCoinBalanceChange?.(nextCoins);
    setScore(nextScore);
    setStreak(comboEnabled ? nextStreak : (awardNow ? 0 : nextStreak));
    const comboMilestones = settings.level === 1 ? [3] : [3, 5, 10];
    const reachedMilestone = comboMilestones.includes(nextStreak);
    if (!isFinalClear && comboEnabled && reachedMilestone) {
      playComboMilestone(nextStreak);
      setComboFeedback({
        id: Date.now(),
        type: 'milestone',
        count: nextStreak,
        label: `${nextStreak} COMBO!`,
        multiplier: nextMultiplier,
      });
    } else if (settings.level === 1) {
      setComboFeedback(null);
    }
    if (awardNow) {
      setHealth((value) => {
        const restored = value < settings.lives ? value + 1 : value;
        healthRef.current = restored;
        return restored;
      });
    }
    setTyped('');
    if (nextCleared >= settings.targetWords) {
      if (settings.level === 1) setComboFeedback(null);
      finish('COMPLETED', nextCleared, nextScore, mistakes);
    }
  }, [applyActiveTerms, cleared, coins, comboEnabled, finish, finished, isTutorialLevel, mistakes, playComboMilestone, playCorrectAnswer, playIncorrectAnswer, playSfx, resultData, score, sessionInfo.sessionId, settings.level, settings.lives, settings.rewardEvery, settings.targetWords, shouldPauseForTutorialCoach, showTutorial, speedWave, streak, tutorialStepIndex, typed]);

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  return (
    <div ref={tutorialRootRef} className={`game-six-shell game-six-emerald game-six-level-${settings.level} w-full overflow-hidden p-4 text-[#172033]`}>
      <div className="game-six-header mb-3 flex flex-wrap items-center justify-between gap-3 px-4 py-2">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[#16876d]">Game 6</p>
          <h2 className="text-2xl font-black text-[#172033]">{levelData?.title || 'Syntax Rain Typing'}</h2>
        </div>
        <div className="flex flex-wrap gap-3 text-lg font-semibold">
          <PixelPanel className="game-six-top-stat px-3 py-2">Level: {settings.level} <Star className="inline h-5 w-5 fill-amber-300 text-amber-500" /></PixelPanel>
          <PixelPanel className="game-six-top-stat game-six-coins-status px-3 py-2"><Coins className="inline h-5 w-5 text-amber-500" /> Coins: {coins}</PixelPanel>
          <button
            type="button"
            className="game-six-card game-six-top-stat cursor-pointer px-3 py-2 font-semibold transition hover:brightness-95"
            onClick={() => {
              setGuideOpenedDuringGameplay(true);
              setTutorialView('guide');
              setShowTutorial(true);
            }}
          >
            Guidelines
          </button>
          <button type="button" className="game-six-card game-six-top-stat cursor-pointer px-3 py-2 font-semibold transition hover:brightness-95" onClick={onGameTutorial}>Game Tutorial</button>
          <PixelPanel className="game-six-top-stat px-3 py-2">Round: {cleared}/{settings.targetWords}</PixelPanel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[290px_1fr]">
        <aside className="game-six-sidebar space-y-4">
          <PixelPanel className="game-six-mission-panel overflow-hidden p-4">
            <h3 className="game-six-section-title -mx-4 -mt-4 mb-4 px-4 py-3 text-lg font-black uppercase">Mission</h3>
            <p className="game-six-mission-copy font-medium leading-snug">
              {settings.level === 1 && 'Type each correctly spelled Java term before it reaches the bottom.'}
              {settings.level === 2 && 'Identify each incomplete programming term and type its full correct spelling.'}
              {settings.level === 3 && `Type only words that belong to the ${targetCategory} category.`}
              {settings.level === 4 && 'Type the real Java syntax and ignore the believable fake syntax.'}
              {settings.level === 5 && 'Discover the hidden relationship and type both matching Java terms. The category is not shown.'}
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              <PixelPanel className="game-six-mini-stat game-six-timer-status p-2 text-center"><Clock3 className="mx-auto h-5 w-5 text-emerald-600" /><strong className="block text-lg font-semibold">{minutes}:{seconds}</strong><span className="text-xs font-semibold">Timer</span></PixelPanel>
              <PixelPanel className="game-six-mini-stat p-2 text-center"><Zap className="mx-auto h-5 w-5 text-amber-500" /><strong className="block text-lg font-semibold">{speedLevel}</strong><span className="text-xs font-semibold">Speed</span></PixelPanel>
              <PixelPanel className="game-six-score-status p-2 text-center"><Star className="mx-auto h-5 w-5 fill-yellow-300 text-yellow-500" /><strong className="block text-lg font-semibold">{score}</strong><span className="text-xs font-semibold">Score</span></PixelPanel>
              <PixelPanel className="game-six-health-status p-2 text-center"><Heart className="mx-auto h-5 w-5 fill-red-500 text-red-600" /><strong className="block text-lg font-semibold">{health}</strong><span className="text-xs font-semibold">Health</span></PixelPanel>
              {comboEnabled && <PixelPanel className="game-six-combo-status p-2 text-center"><strong className="block text-lg font-semibold">{streak}</strong><span className="text-xs font-semibold">Combo</span></PixelPanel>}
              {comboEnabled && <PixelPanel className="game-six-multiplier-status p-2 text-center"><strong className="block text-lg font-semibold">×{comboMultiplier}</strong><span className="text-xs font-semibold">Multiplier</span></PixelPanel>}
            </div>
            <PixelPanel className="game-six-goal-status mt-4 p-3">
              <div className="flex items-center justify-between text-sm font-semibold"><span><Heart className="inline h-4 w-4 fill-red-500 text-red-600" /> Goal</span><span>{cleared}/{settings.targetWords}</span></div>
              <div className="game-six-progress-track mt-2 h-3 overflow-hidden rounded-full">
                <div className="h-full rounded-full bg-gradient-to-r from-[#16876d] to-[#14b8a6]" style={{ width: `${Math.min(100, (cleared / settings.targetWords) * 100)}%` }} />
              </div>
            </PixelPanel>
            <PixelPanel className="game-six-streak-status mt-3 p-3 text-center">
              <strong>🔥 {streak}/{settings.rewardEvery} STREAK</strong>
            </PixelPanel>
          </PixelPanel>
          <PixelPanel className="game-six-guide-panel p-4">
            <h3 className="mb-2 text-lg font-black uppercase text-[#16876d]">Guide</h3>
            <p className="font-medium">{settings.level === 1 ? 'Type each correctly spelled Java term before it reaches the bottom. Correct answers build combo multipliers; mistakes reset the combo.' : settings.level === 2 ? 'Use the visible letters to identify each incomplete syntax word, then type its full correct spelling. Correct answers build combo multipliers; mistakes reset the combo.' : settings.level === 3 ? 'Type only words that belong to the visible target category. Let programming distractors fall without typing them; correctly ignored distractors cause no penalty.' : settings.level === 5 ? 'Find two terms with a hidden Java relationship. Either member may be typed first. Ignore distractors; later rounds contain two independent pairs.' : `Type required programming terms and press Enter. Ignore distractors when instructed. Wrong entries and missed required terms cost 1 health. Every ${settings.rewardEvery} consecutive correct terms awards coins and restores 1 missing health.`}</p>
          </PixelPanel>
          <button type="button" className="game-six-back-button w-full px-5 py-3 text-xl font-bold transition" onClick={onExitRequest}>
            <LogOut className="inline h-5 w-5" /> Back
          </button>
        </aside>

        <main className="game-six-playfield relative overflow-hidden" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,.03), rgba(4,77,70,.12)), url(${levelBackground})` }}>
          <PixelPanel className="game-six-instruction absolute left-1/2 top-3 z-20 -translate-x-1/2 px-8 py-2 text-center text-lg font-semibold">
            <Keyboard className="inline h-5 w-5" />{' '}
            {settings.level === 5
              ? 'FIND THE HIDDEN JAVA PAIR'
              : targetChallengeActive
                ? `🎯 TARGET: ${targetCategory.toUpperCase()}`
                : 'FALLING SYNTAX CHALLENGE'}
          </PixelPanel>
          {comboFeedback && !targetIsChanging && !targetFeedback && (
            <div
              key={comboFeedback.id}
              className={`game-six-combo-feedback game-six-combo-feedback--${comboFeedback.type}`}
              role="status"
              aria-label={comboFeedback.multiplier
                ? `${comboFeedback.label}, multiplier times ${comboFeedback.multiplier}`
                : comboFeedback.label}
            >
              {comboFeedback.type === 'reset' ? (
                <span className="game-six-combo-reset-label">{comboFeedback.label}</span>
              ) : (
                <>
                  <span className="game-six-combo-burst" aria-hidden="true" />
                  <span className="game-six-combo-line" aria-hidden="true">
                    <strong className="game-six-combo-number">{comboFeedback.count}</strong>
                    <span className="game-six-combo-word">COMBO</span>
                  </span>
                  {comboFeedback.multiplier && (
                    <strong className="game-six-combo-multiplier" aria-hidden="true">×{comboFeedback.multiplier}</strong>
                  )}
                </>
              )}
            </div>
          )}
          {targetFeedback && <div className="game-six-target-feedback" role="status">{targetFeedback}</div>}
          {(activeDemo?.drops || drops).map((drop, index) => (
            <div key={drop.id} data-demo-term={index} data-demo-motion={activeDemo ? '': undefined} className="game-six-falling-word absolute z-10 px-4 py-3 text-center text-xl font-black" style={{ left: `${drop.x}%`, '--word-x': `${drop.x}%`, top: `${drop.y}%` }}>
              <span className="game-six-variable-declaration"><span>{settings.level === 4 ? drop.scrambled : drop.scrambled.replaceAll(' ', '')}</span></span>
            </div>
          ))}
          <form onSubmit={handleSubmit} className="game-six-answer-form absolute bottom-5 left-1/2 z-20 flex w-[min(540px,82%)] -translate-x-1/2 items-stretch gap-2">
            <span className="game-six-variable-prefix" aria-hidden="true">&gt;_</span>
            <input ref={inputRef} className="game-six-answer-input min-w-0 flex-1 px-3 py-3 text-lg font-semibold outline-none" value={activeDemo ? activeDemo.typed : typed} autoCapitalize="none" autoCorrect="off" spellCheck={false} onKeyDown={primeAnswerSounds} onChange={(event) => { setTyped(event.target.value); if (answerState.type === 'incorrect') setAnswerState({ pending: false, message: '', type: '' }); }} placeholder={settings.level === 5 ? 'type a related Java term...' : 'type a Java term (case-sensitive)...'} disabled={Boolean(resultData)} readOnly={Boolean(activeDemo) || answerState.pending} />
            <button type="submit" className="game-six-enter-button px-6 py-3 text-lg font-bold text-white transition hover:brightness-105 disabled:cursor-wait disabled:opacity-70" disabled={answerState.pending}>{answerState.pending ? 'Checking...' : 'Enter'}</button>
            {displayAnswerState.message && (
              <p role="status" className={`game-six-answer-feedback game-six-answer-feedback--${displayAnswerState.type}`}>{displayAnswerState.message}</p>
            )}
          </form>
        </main>
      </div>

      {showTutorial && !shouldPauseForTutorialCoach && !resultData && !isSubmitting && (
        showGuide ? createPortal(
          <GameGuideOverlay
            kicker={guideContent.kicker}
            title={guideContent.title}
            lead={guideContent.lead}
            summary={guideContent.summary}
            sections={guideContent.sections}
            renderInPortal
            onExit={guideOpenedDuringGameplay ? () => {
              setGuideOpenedDuringGameplay(false);
              setTutorialView(null);
              setShowTutorial(false);
            } : onExitRequest}
            onStart={() => {
              if (guideOpenedDuringGameplay) {
                setGuideOpenedDuringGameplay(false);
                setTutorialView(null);
                setShowTutorial(false);
                return;
              }
              setTutorialView(continueToTutorialAfterGuide ? 'first-play-tutorial' : 'announcement');
            }}
            startLabel={guideOpenedDuringGameplay ? 'Continue' : 'Next'}
          />,
          document.body,
        ) : tutorialView === 'announcement' ? (
          <GameSixAnnouncementBoard
            levelNumber={levelData?.levelNumber || settings.level}
            onStart={() => {
              setTutorialView(null);
              setShowTutorial(false);
            }}
          />
        ) : (
          <GameSixInteractiveTutorial
            onDemo={setTutorialDemo}
            rootRef={tutorialRootRef}
            activeTerms={drops}
            background={levelBackground}
            settings={settings}
            isFirstPlay={tutorialView === 'first-play-tutorial'}
            levelNumber={levelData?.levelNumber || 1}
            onExit={onExitRequest}
            onStart={() => {
              if (tutorialView === 'first-play-tutorial') {
                setTutorialView('announcement');
              } else {
                setTutorialView(null);
                setShowTutorial(false);
              }
            }}
          />
        )
      )}

      {isTutorialLevel && shouldPauseForTutorialCoach && (
        <PlayableTutorialCoach
          steps={GAME_SIX_TUTORIAL_STEPS}
          stepIndex={tutorialStepIndex}
          stats={[
            { label: 'Terms', value: `${cleared}/${settings.targetWords}` },
            { label: 'Health', value: `${health}/${settings.lives}` },
          ]}
          onContinue={handleContinueTutorialStep}
        />
      )}

      {!hideResultOverlay && (resultData || isSubmitting) && (
        <div className="game-two-result-overlay">
          <div className="game-two-result-card">
            {isSubmitting ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : <h3 className="game-two-result-title">{resultData?.result === 'COMPLETED' ? 'Rain Cleared' : 'System Failed'}</h3>}
            <p className="student-body-copy student-body-copy-tight">Final score: {Number(resultData?.finalScore ?? gameplayData?.points ?? 0)} | Terms: {Number(gameplayData?.completedTasks || 0)}/{settings.targetWords}</p>
            <div className="game-two-result-actions">
              <button type="button" className="btn btn-secondary" onClick={onBack}>Back</button>
              <button type="button" className="btn btn-primary" onClick={onRetry}><RotateCcw className="h-4 w-4" /> Retry</button>
              {canAdvanceLevel && !isFinalLevel && <button type="button" className="btn btn-primary" onClick={onNextLevel}>Next Level</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvasGameSix;
