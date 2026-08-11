import React, { useEffect, useMemo, useRef, useState } from 'react';
import '../gameTwoCodeLab.css';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CheckCircle2,
  Coins,
  Grip,
  HelpCircle,
  Info,
  Lock,
  Loader2,
  LogOut,
  RotateCcw,
} from 'lucide-react';
import { getGameTwoSprite } from '../systems/com1Slices';
import { getStudentMusicPreference } from '../../../utils/studentMenuAudio';
import { levelAPI } from '../../../utils/api';
import GameTutorialOverlay from '../../shared/ui/GameTutorialOverlay';
import GameGuideOverlay from '../../shared/ui/GameGuideOverlay';
import PlayableTutorialCoach from '../../shared/ui/PlayableTutorialCoach';
import CongratulatoryOverlay from '../../shared/ui/CongratulatoryOverlay';
import { buildGameTwoGuideContent } from '../../shared/ui/levelGuideBuilders';
import {
  applyCorrectDrop,
  createInitialPlacementMap,
  getPlacedCount,
  isCodingAnswerCorrect,
  isCorrectDrop,
  isLevelCompleted,
} from '../systems/gameTwoValidation';
import { calculateQuestionStars } from '../systems/progressBridge';

const GAME_TWO_BACKGROUND_MUSIC_SRC = '/videos/game2-bg.mp4';
const GAME_TWO_CORRECT_SOUND_SRC = new URL(
  '../../../../assets/Game/game_two/Game 2_ Hardware/Music & Sound Effects/correct answer sf.mp3',
  import.meta.url,
).href;
const GAME_TWO_INCORRECT_SOUND_SRC = new URL(
  '../../../../assets/Game/game_two/Game 2_ Hardware/Music & Sound Effects/incorrect answer sf.mp3',
  import.meta.url,
).href;
const GAME_TWO_HINT_SOUND_SRC = new URL(
  '../../../../assets/Game/game_two/Game 2_ Hardware/Music & Sound Effects/hint sf.mp3',
  import.meta.url,
).href;
const GAME_TWO_LOCK_SOUND_SRC = new URL(
  '../../../../assets/Game/game_two/Game 2_ Hardware/Music & Sound Effects/lock.mp3',
  import.meta.url,
).href;
const GAME_TWO_LOCK_SOUND_OFFSET_SECONDS = 0.18;



const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const soundEffectPools = new Map();

const getGameTwoSoundEffectPool = (src, volume = 0.72) => {
  if (typeof window === 'undefined' || typeof window.Audio === 'undefined') {
    return [];
  }

  if (!soundEffectPools.has(src)) {
    const pool = Array.from({ length: 4 }, () => {
      const soundEffect = new Audio(src);
      soundEffect.preload = 'auto';
      soundEffect.volume = volume;
      soundEffect.load();
      return soundEffect;
    });

    soundEffectPools.set(src, pool);
  }

  const pool = soundEffectPools.get(src) || [];
  pool.forEach((soundEffect) => {
    soundEffect.volume = volume;
  });

  return pool;
};

const playGameTwoSoundEffect = (src, volume = 0.72) => {
  const pool = getGameTwoSoundEffectPool(src, volume);
  if (pool.length === 0) {
    return;
  }

  const soundEffect = pool.find((candidate) => candidate.paused) || pool[0];
  soundEffect.currentTime = 0;

  const playPromise = soundEffect.play();
  if (playPromise?.catch) {
    playPromise.catch(() => {
      // The browser may block sound until the next direct user gesture.
    });
  }
};

const renderScreenModal = (content) => (
  typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : null
);

const GAME_TWO_TUTORIAL_STEPS = Object.freeze([
  { title: 'Practice Tutorial', body: 'This tutorial teaches dragging code snippets into broken Java code. You can take your time before the real Level 1 starts.', buttonLabel: 'Start Practice' },
  { title: 'Drag A Code Snippet', body: 'Pick up a snippet from the choices panel and drop it into the empty code slot.', buttonLabel: 'Try Dragging' },
  { title: 'Answer The Check', body: 'Some blocks ask a quick question after they lock in. Read the prompt, choose an answer, then continue.', buttonLabel: 'Answer Check' },
  { title: 'Complete The Board', body: 'When all required blocks are placed and checks are answered, the tutorial ends and you can start Level 1.', buttonLabel: 'Finish Tutorial' },
]);

const normalizeCodeAnswer = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const getTaskInitialOrder = (task) => {
  if (!Array.isArray(task?.blocks)) {
    return [];
  }

  const validIds = new Set(task.blocks.map((block) => block.id));
  const orderedIds = Array.isArray(task.initialOrder)
    ? task.initialOrder.filter((id) => validIds.has(id))
    : [];
  const missingIds = task.blocks.map((block) => block.id).filter((id) => !orderedIds.includes(id));
  return [...orderedIds, ...missingIds];
};

const getTaskAcceptedAnswers = (task) => {
  if (Array.isArray(task?.acceptedAnswers) && task.acceptedAnswers.length > 0) {
    return task.acceptedAnswers;
  }

  return task?.answer ? [task.answer] : [];
};

const createSnippetId = (task, suffix) => `${task.id}-${suffix}`;

const createCodeChoiceSnippets = (task) => {
  if (Array.isArray(task?.options) && task.options.length > 0) {
    return task.options.map((option) => ({
      id: option.id,
      code: option.label,
      label: `Option ${String(option.id || '').toUpperCase()}`,
    }));
  }

  const acceptedAnswers = getTaskAcceptedAnswers(task);
  const snippets = acceptedAnswers.map((answer, index) => ({
    id: createSnippetId(task, `answer-${index}`),
    code: answer,
    label: index === 0 ? 'Correct snippet' : 'Accepted snippet',
  }));
  const answer = String(task?.answer || acceptedAnswers[0] || '').trim();
  const brokenSnippet = String(task?.snippet || '').trim();
  const distractors = [
    task?.type === 'complete' && answer && `"${answer}"`,
    task?.type === 'complete' && answer && `${answer};`,
    task?.type === 'debug' && brokenSnippet,
    task?.type === 'typing' && answer && `${answer};`,
    task?.type === 'typing' && answer && answer.replace(/\s*&&\s*/g, ' || '),
  ]
    .filter(Boolean)
    .filter((value) => !acceptedAnswers.some((accepted) => normalizeCodeAnswer(accepted) === normalizeCodeAnswer(value)));

  distractors.slice(0, 3).forEach((code, index) => {
    if (!snippets.some((snippet) => normalizeCodeAnswer(snippet.code) === normalizeCodeAnswer(code))) {
      snippets.push({
        id: createSnippetId(task, `distractor-${index}`),
        code,
        label: 'Extra snippet',
      });
    }
  });

  return snippets;
};

const createTaskDragModel = (task) => {
  if (!task) {
    return { snippets: [], slots: [], isReorder: false, beforeBlank: '', afterBlank: '' };
  }

  if (task.type === 'reorder') {
    const blocks = Array.isArray(task.blocks) ? task.blocks : [];
    const correctOrder = Array.isArray(task.correctOrder) ? task.correctOrder : blocks.map((block) => block.id);

    return {
      isReorder: true,
      snippets: blocks.map((block) => ({
        id: block.id,
        code: block.code,
        label: 'Code block',
      })),
      slots: correctOrder.map((blockId, index) => ({
        id: `${task.id}-slot-${index}`,
        label: `Line ${index + 1}`,
        correctBlockId: blockId,
      })),
      beforeBlank: '',
      afterBlank: '',
    };
  }

  const [beforeBlank, afterBlank] = String(task.snippet || '').split('____');

  return {
    isReorder: false,
    snippets: createCodeChoiceSnippets(task),
    slots: [{
      id: `${task.id}-slot-0`,
      label: task.type === 'choice' ? 'Best snippet' : 'Place your answer here',
      correctBlockId: task.type === 'choice' ? task.correctOptionId : '',
    }],
    beforeBlank: beforeBlank || '',
    afterBlank: afterBlank || '',
  };
};

const GameTwoHardwareDragCanvas = ({
  levelData,
  onLevelComplete,
  onExitRequest,
  resultData,
  isSubmitting,
  canAdvanceLevel,
  hideResultOverlay = false,
  onRetry,
  onBack,
  onNextLevel,
  hintCoinCost = 1,
  freeMistakes = 3,
  hintStarCost = 1,
  initialCoins,
  suppressIntroTutorial = false,
  showLevelGuideline = false,
  gameTutorialRequested = false,
  continueToTutorialAfterGuide = false,
}) => {
  const slots = useMemo(() => (Array.isArray(levelData?.slots) ? levelData.slots : []), [levelData]);
  const parts = useMemo(() => (Array.isArray(levelData?.parts) ? levelData.parts : []), [levelData]);
  const shouldScrollPartsPanel = Number(levelData?.levelNumber || 0) >= 2 && Number(levelData?.levelNumber || 0) <= 5;
  const isTutorialLevel = Boolean(levelData?.isTutorialLevel);
  const isFirstLevelGuide = Number(levelData?.levelNumber || 1) === 1;
  const guideContent = useMemo(
    () => buildGameTwoGuideContent(levelData, { freeMistakes, hintCoinCost, hintStarCost }),
    [freeMistakes, hintCoinCost, hintStarCost, levelData],
  );

  const initialPlacements = useMemo(() => createInitialPlacementMap(slots), [slots]);

  const [placements, setPlacements] = useState(initialPlacements);
  const [mistakes, setMistakes] = useState(0);
  const [draggingPartId, setDraggingPartId] = useState(null);
  const [shakePartId, setShakePartId] = useState('');
  const [shakeSlotId, setShakeSlotId] = useState('');
  const [infoCard, setInfoCard] = useState(null);
  const [activeQuestionPartId, setActiveQuestionPartId] = useState('');
  const [questionFeedback, setQuestionFeedback] = useState(null);
  const [answeredQuestionMap, setAnsweredQuestionMap] = useState({});
  const [points, setPoints] = useState(0);
  const [coins, setCoins] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showGuide, setShowGuide] = useState(showLevelGuideline && !isTutorialLevel);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialCoachOpen, setTutorialCoachOpen] = useState(isTutorialLevel);
  const [revealedHintCount, setRevealedHintCount] = useState(0);
  const [hintNotice, setHintNotice] = useState('');

  const infoTimerRef = useRef(null);
  const shakeTimerRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const backgroundMusicBlockedRef = useRef(false);
  const lockAudioContextRef = useRef(null);
  const lockAudioBufferRef = useRef(null);
  const submittedRef = useRef(false);
  const shouldPauseForTutorialCoach = Boolean(isTutorialLevel && tutorialCoachOpen);
  const shouldPauseForIntroGuide = Boolean(showGuide && !isTutorialLevel);

  useEffect(() => {
    if (Number(gameTutorialRequested) > 0 && !isTutorialLevel) {
      setShowGuide(false);
      setShowTutorial(true);
    }
  }, [gameTutorialRequested, isTutorialLevel]);

  const handleContinueTutorialStep = () => {
    if (tutorialStepIndex === 0) {
      setTutorialStepIndex(1);
    }
    setTutorialCoachOpen(false);
  };

  useEffect(() => () => {
    if (infoTimerRef.current) {
      clearTimeout(infoTimerRef.current);
    }
    if (shakeTimerRef.current) {
      clearTimeout(shakeTimerRef.current);
    }
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current.currentTime = 0;
    }
    if (lockAudioContextRef.current) {
      lockAudioContextRef.current.close?.();
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.Audio === 'undefined') {
      return undefined;
    }

    if (!getStudentMusicPreference()) {
      return undefined;
    }

    const backgroundMusic = new Audio(GAME_TWO_BACKGROUND_MUSIC_SRC);
    backgroundMusic.loop = true;
    backgroundMusic.preload = 'auto';
    backgroundMusic.volume = 0.55;
    backgroundMusicRef.current = backgroundMusic;

    const playPromise = backgroundMusic.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        backgroundMusicBlockedRef.current = true;
      });
    }

    const resumeBackgroundMusic = () => {
      if (!backgroundMusicBlockedRef.current || !getStudentMusicPreference()) {
        return;
      }

      const resumePromise = backgroundMusic.play();
      if (resumePromise?.then) {
        resumePromise
          .then(() => {
            backgroundMusicBlockedRef.current = false;
          })
          .catch(() => {
            backgroundMusicBlockedRef.current = true;
          });
      }
    };

    window.addEventListener('pointerdown', resumeBackgroundMusic);
    window.addEventListener('keydown', resumeBackgroundMusic);
    window.addEventListener('dragstart', resumeBackgroundMusic);

    return () => {
      window.removeEventListener('pointerdown', resumeBackgroundMusic);
      window.removeEventListener('keydown', resumeBackgroundMusic);
      window.removeEventListener('dragstart', resumeBackgroundMusic);
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
      backgroundMusicBlockedRef.current = false;
      if (backgroundMusicRef.current === backgroundMusic) {
        backgroundMusicRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    getGameTwoSoundEffectPool(GAME_TWO_LOCK_SOUND_SRC, 0.9);
    getGameTwoSoundEffectPool(GAME_TWO_CORRECT_SOUND_SRC, 0.72);
    getGameTwoSoundEffectPool(GAME_TWO_INCORRECT_SOUND_SRC, 0.72);
    getGameTwoSoundEffectPool(GAME_TWO_HINT_SOUND_SRC, 0.65);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return undefined;
    }

    let disposed = false;
    const audioContext = new AudioContextClass();
    lockAudioContextRef.current = audioContext;

    fetch(GAME_TWO_LOCK_SOUND_SRC)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
      .then((audioBuffer) => {
        if (!disposed) {
          lockAudioBufferRef.current = audioBuffer;
        }
      })
      .catch(() => {
        lockAudioBufferRef.current = null;
      });

    return () => {
      disposed = true;
      lockAudioBufferRef.current = null;
      if (lockAudioContextRef.current === audioContext) {
        lockAudioContextRef.current = null;
      }
      audioContext.close?.();
    };
  }, []);

  const partMap = useMemo(
    () => new Map(parts.map((part) => [part.id, part])),
    [parts],
  );
  const spriteMap = useMemo(
    () => new Map(parts.map((part) => [part.id, getGameTwoSprite(part.sliceKey)])),
    [parts],
  );

  const board = levelData?.board || {};
  const boardWidth = Number(board.renderWidth) || 560;
  const boardHeight = Number(board.renderHeight) || 560;
  const boardSprite = getGameTwoSprite(board.sliceKey || 'motherboard');
  const isCodeLab = board.theme === 'code-lab';

  const placedPartIds = useMemo(
    () => new Set(Object.values(placements).filter(Boolean)),
    [placements],
  );

  const availableParts = useMemo(
    () => parts.filter((part) => !placedPartIds.has(part.id)),
    [parts, placedPartIds],
  );
  const activeQuestionPart = activeQuestionPartId ? partMap.get(activeQuestionPartId) : null;
  const activeHints = useMemo(
    () => (Array.isArray(activeQuestionPart?.question?.hints)
      ? activeQuestionPart.question.hints
        .map((hint) => String(hint || '').trim())
        .filter(Boolean)
      : []),
    [activeQuestionPart],
  );
  const questionParts = useMemo(
    () => parts.filter((part) => Array.isArray(part?.question?.options) && part.question.options.length > 0),
    [parts],
  );
  const totalSlots = slots.length;
  const totalQuestions = questionParts.length;
  const earnedStars = calculateQuestionStars(points, totalQuestions, mistakes);
  const resolvedHintCoinCost = clamp(Math.round(Number(hintCoinCost) || 0), 0, 9);
  const resolvedStartingCoins = useMemo(() => {
    const explicitStart = Number(initialCoins);
    if (Number.isFinite(explicitStart) && explicitStart >= 0) {
      return Math.round(explicitStart);
    }

    if (totalQuestions > 0) {
      return Math.max(resolvedHintCoinCost, totalQuestions);
    }

    return Math.max(0, resolvedHintCoinCost);
  }, [initialCoins, resolvedHintCoinCost, totalQuestions]);

  useEffect(() => {
    setPlacements(initialPlacements);
    setMistakes(0);
    setDraggingPartId(null);
    setShakePartId('');
    setShakeSlotId('');
    setInfoCard(null);
    setActiveQuestionPartId('');
    setQuestionFeedback(null);
    setAnsweredQuestionMap({});
    setPoints(0);
    setCoins(resolvedStartingCoins);
    setHintsUsed(0);
    setShowTutorial(false);
    setShowGuide(showLevelGuideline && !isTutorialLevel);
    setTutorialStepIndex(0);
    setTutorialCoachOpen(isTutorialLevel);
    setRevealedHintCount(0);
    setHintNotice('');
    submittedRef.current = false;
  }, [initialPlacements, isFirstLevelGuide, isTutorialLevel, resolvedStartingCoins, showLevelGuideline]);

  const placedCount = getPlacedCount(placements);
  const answeredQuestionsCount = Object.keys(answeredQuestionMap).length;

  useEffect(() => {
    setRevealedHintCount(0);
    setHintNotice('');
  }, [activeQuestionPartId]);

  const showInfo = (part) => {
    if (!part) {
      return;
    }

    setInfoCard({
      title: part.label,
      description: part.info,
    });

    if (infoTimerRef.current) {
      clearTimeout(infoTimerRef.current);
    }

    infoTimerRef.current = setTimeout(() => {
      setInfoCard(null);
    }, 2600);
  };

  const showWrongFeedback = (partId, slotId) => {
    playGameTwoSoundEffect(GAME_TWO_INCORRECT_SOUND_SRC);
    setMistakes((value) => value + 1);
    setShakePartId(partId);
    setShakeSlotId(slotId);

    if (shakeTimerRef.current) {
      clearTimeout(shakeTimerRef.current);
    }

    shakeTimerRef.current = setTimeout(() => {
      setShakePartId('');
      setShakeSlotId('');
    }, 380);
  };

  const playGameTwoLockSound = () => {
    const audioContext = lockAudioContextRef.current;
    const audioBuffer = lockAudioBufferRef.current;

    if (!audioContext || !audioBuffer) {
      playGameTwoSoundEffect(GAME_TWO_LOCK_SOUND_SRC, 1);
      return;
    }

    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    source.buffer = audioBuffer;
    gainNode.gain.value = 1.25;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const startSound = () => {
      const offset = Math.min(GAME_TWO_LOCK_SOUND_OFFSET_SECONDS, Math.max(0, audioBuffer.duration - 0.05));
      source.start(0, offset);
    };

    if (audioContext.state === 'suspended') {
      audioContext.resume().then(startSound).catch(() => {
        playGameTwoSoundEffect(GAME_TWO_LOCK_SOUND_SRC, 1);
      });
      return;
    }

    startSound();
  };

  const resolvePartIdFromDrop = (event) => {
    const fromTransfer = event?.dataTransfer?.getData('application/x-itechs-part-id');
    if (fromTransfer) {
      return fromTransfer;
    }

    return draggingPartId || '';
  };

  const handleDropOnSlot = (event, slot) => {
    event.preventDefault();
    event.stopPropagation();

    if (showGuide || showTutorial || shouldPauseForTutorialCoach) {
      return;
    }

    const partId = resolvePartIdFromDrop(event);
    if (!partId || placements[slot.id]) {
      return;
    }

    const part = partMap.get(partId);
    if (!part) {
      return;
    }

    if (!isCorrectDrop(slot, partId)) {
      showWrongFeedback(partId, slot.id);
      return;
    }
    
    playGameTwoLockSound();
    setPlacements((previous) => applyCorrectDrop(previous, slot.id, partId));
    if (isTutorialLevel && tutorialStepIndex < 2) {
      setTutorialStepIndex(part.question?.correctOptionId && Array.isArray(part.question?.options) ? 2 : 3);
      setTutorialCoachOpen(true);
    }

    if (part.question?.correctOptionId && Array.isArray(part.question?.options)) {
      setInfoCard(null);
      setActiveQuestionPartId(part.id);
      setQuestionFeedback(null);
      return;
    }

    showInfo(part);
  };

  const findSlotAtBoardPoint = (clientX, clientY, boardElement) => {
    if (!boardElement) {
      return null;
    }

    const bounds = boardElement.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {
      return null;
    }

    const xPercent = ((clientX - bounds.left) / bounds.width) * 100;
    const yPercent = ((clientY - bounds.top) / bounds.height) * 100;

    return slots.find((slot) => {
      const slotWidth = clamp(Number(slot.width) || 12, 8, 80);
      const slotHeight = clamp(Number(slot.height) || 12, 8, 80);
      const slotX = clamp(Number(slot.x) || 0, 0, 100);
      const slotY = clamp(Number(slot.y) || 0, 0, 100);

      return xPercent >= slotX - slotWidth / 2
        && xPercent <= slotX + slotWidth / 2
        && yPercent >= slotY - slotHeight / 2
        && yPercent <= slotY + slotHeight / 2;
    }) || null;
  };

  const handleDropOnBoard = (event) => {
    event.preventDefault();

    const targetSlot = findSlotAtBoardPoint(event.clientX, event.clientY, event.currentTarget);
    if (targetSlot) {
      handleDropOnSlot(event, targetSlot);
    }
  };

  const handleQuestionAnswer = (optionId) => {
    if (!activeQuestionPart || questionFeedback) {
      return;
    }

    const correctOptionId = activeQuestionPart.question?.correctOptionId;
    const isCorrect = optionId === correctOptionId;

    setQuestionFeedback({
      selectedOptionId: optionId,
      correctOptionId,
      isCorrect,
    });

    setAnsweredQuestionMap((current) => (
      current[activeQuestionPart.id]
        ? current
        : { ...current, [activeQuestionPart.id]: true }
    ));

    if (isCorrect) {
      playGameTwoSoundEffect(GAME_TWO_CORRECT_SOUND_SRC);
      setPoints((current) => current + 1);
      setCoins((current) => current + 1);
      if (isTutorialLevel && tutorialStepIndex < 3) {
        setTutorialStepIndex(3);
        setTutorialCoachOpen(true);
      }
    } else {
      playGameTwoSoundEffect(GAME_TWO_INCORRECT_SOUND_SRC);
    }
  };

  const handleRevealHint = () => {
    if (!activeQuestionPart || activeHints.length === 0 || revealedHintCount >= activeHints.length) {
      return;
    }

    if (resolvedHintCoinCost > 0 && coins < resolvedHintCoinCost) {
      setHintNotice(`Not enough coins. Need ${resolvedHintCoinCost}, you have ${coins}.`);
      return;
    }

    if (resolvedHintCoinCost > 0) {
      setCoins((current) => Math.max(0, current - resolvedHintCoinCost));
    }

    setHintsUsed((current) => current + 1);
    setHintNotice('');
    setRevealedHintCount((value) => Math.min(activeHints.length, value + 1));
    playGameTwoSoundEffect(GAME_TWO_HINT_SOUND_SRC, 0.65);
  };

  const handleContinueFromQuestion = () => {
    if (!activeQuestionPart) {
      return;
    }

    showInfo(activeQuestionPart);
    setActiveQuestionPartId('');
    setQuestionFeedback(null);
    setRevealedHintCount(0);
    setHintNotice('');
  };

  useEffect(() => {
    if (submittedRef.current) {
      return;
    }

    const allQuestionsResolved = totalQuestions === 0 || answeredQuestionsCount >= totalQuestions;

    if (!isLevelCompleted(placements, slots)) {
      return;
    }

    if (!allQuestionsResolved || activeQuestionPartId) {
      return;
    }

    submittedRef.current = true;

    onLevelComplete?.({
      outcome: 'COMPLETED',
      mistakes,
      correctPlacements: slots.length,
      totalPlacements: slots.length,
      points,
      starsEarned: earnedStars,
      coinsRemaining: coins,
      hintsUsed,
      answeredQuestions: answeredQuestionsCount,
      totalQuestions,
      completedTasks: slots.length,
      totalTasks: slots.length,
    });
  }, [activeQuestionPartId, answeredQuestionsCount, coins, earnedStars, hintsUsed, mistakes, onLevelComplete, placements, points, slots, totalQuestions]);

  return (
    <div className="game-two-shell">
      <div className="game-two-layout">
        <section className="game-two-board-wrap">
          <div
            className={`game-two-board ${board.transparentBackground ? 'game-two-board-transparent' : ''} ${isCodeLab ? 'game-two-board-code-lab' : ''}`}
            style={{ width: `${boardWidth}px`, height: `${boardHeight}px` }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDropOnBoard}
          >
            <div className="game-two-board-image">
              {isCodeLab ? (
                <div className="game-two-code-program" aria-hidden="true">
                  <div className="game-two-code-line"><span>public class AssemblyLab {'{'}</span></div>
                  <div className="game-two-code-line game-two-code-indent"><span>public static void main(String[] args) {'{'}</span></div>
                  <div className="game-two-code-line game-two-code-indent-2"><span>// repair the missing Java code blocks</span></div>
                  <div className="game-two-code-line game-two-code-indent"><span>{'}'}</span></div>
                  <div className="game-two-code-line"><span>{'}'}</span></div>
                </div>
              ) : boardSprite && (
                <img
                  src={boardSprite.url}
                  alt={levelData?.title || 'Code layout'}
                  className="game-two-board-image-sprite"
                  draggable={false}
                />
              )}
            </div>

            {slots.map((slot) => {
              const slotWidth = clamp(Number(slot.width) || 12, 8, 80);
              const slotHeight = clamp(Number(slot.height) || 12, 8, 80);
              const slotX = clamp(Number(slot.x) || 0, 0, 100);
              const slotY = clamp(Number(slot.y) || 0, 0, 100);
              const placedPartId = placements[slot.id];
              const placedPart = placedPartId ? partMap.get(placedPartId) : null;
              const placedSprite = placedPartId ? spriteMap.get(placedPartId) : null;
              const placedRotation = Number(slot.rotation ?? placedPart?.placedRotation ?? 0) || 0;
              const placedWidth = clamp(Number(slot.placedWidth) || 100, 20, 3000);
              const placedHeight = clamp(Number(slot.placedHeight) || 100, 20, 3000);
              const placedOffsetX = clamp(Number(slot.placedOffsetX) || 0, -100, 100);
              const placedOffsetY = clamp(Number(slot.placedOffsetY) || 0, -100, 100);
              const placedScale = clamp(Number(slot.placedScale) || 1, 0.25, 8);
              const placedImageTransform = [
                placedRotation ? `rotate(${placedRotation}deg)` : '',
                placedScale !== 1 ? `scale(${placedScale})` : '',
              ].filter(Boolean).join(' ');

              return (
                <div
                  key={slot.id}
                  className={`game-two-slot ${isCodeLab ? 'game-two-slot-code-lab' : ''} ${slot.hidden ? 'game-two-slot-hidden' : ''} ${placedPart ? 'game-two-slot-locked' : ''} ${shakeSlotId === slot.id ? 'game-two-shake' : ''}`}
                  style={{
                    left: `${slotX}%`,
                    top: `${slotY}%`,
                    width: `${slotWidth}%`,
                    height: `${slotHeight}%`,
                  }}
                  aria-label={placedPart ? `${placedPart.label} placed` : 'Drop zone'}
                  title={placedPart ? placedPart.label : slot.label}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDropOnSlot(event, slot)}
                >
                  {placedPart ? (
                    <div
                      className="game-two-part-in-slot"
                      style={{
                        width: `${placedWidth}%`,
                        height: `${placedHeight}%`,
                        transform: `translate(${placedOffsetX}%, ${placedOffsetY}%)`,
                      }}
                    >
                      {placedSprite ? (
                        <img
                          src={placedSprite.url}
                          alt={placedPart.label}
                          className="game-two-part-in-slot-image"
                          style={placedImageTransform ? { transform: placedImageTransform } : undefined}
                          draggable={false}
                        />
                      ) : (
                        <code className="game-two-code-block game-two-code-block-placed">
                          {placedPart.code || placedPart.label}
                        </code>
                      )}
                    </div>
                  ) : (
                    <span className="game-two-slot-label">{slot.label}</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="game-two-metrics">
            <span className="student-stat-chip">Placed {placedCount}/{totalSlots}</span>
            <span className="student-stat-chip">Mistakes {mistakes}</span>
            <span className="student-stat-chip">Stars {earnedStars}/3</span>
            <span className="student-stat-chip">Correct {points}/{totalQuestions}</span>
            <span className="student-stat-chip inline-flex items-center gap-1">
              <Coins className="h-3.5 w-3.5" />
              Coins {coins}
            </span>
            <button type="button" className="student-stat-chip inline-flex items-center gap-1" onClick={onExitRequest}>
              <LogOut className="h-3.5 w-3.5" />
              Exit Level
            </button>
          </div>
        </section>

        <aside className={`game-two-parts-wrap ${shouldScrollPartsPanel ? 'game-two-parts-wrap-scroll' : ''}`}>
          <div className="game-two-parts-head">
            <p className="student-mini-kicker">Code Blocks</p>
            <h3>Drag To Matching Slot</h3>
          </div>

          <div className="game-two-parts-grid">
            {availableParts.map((part) => {
              const partSprite = spriteMap.get(part.id);

              return (
                <div
                  key={part.id}
                  draggable
                  className={`game-two-part-card ${draggingPartId === part.id ? 'game-two-part-dragging' : ''} ${shakePartId === part.id ? 'game-two-shake' : ''}`}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/x-itechs-part-id', part.id);
                    event.dataTransfer.effectAllowed = 'move';

                    const previewImage = event.currentTarget.querySelector('.game-two-part-preview-image');
                    if (previewImage && event.dataTransfer?.setDragImage) {
                      event.dataTransfer.setDragImage(
                        previewImage,
                        previewImage.clientWidth / 2,
                        previewImage.clientHeight / 2,
                      );
                    }

                    setDraggingPartId(part.id);
                  }}
                  onDragEnd={() => setDraggingPartId('')}
                >
                  <div className="game-two-part-meta">
                    <Grip className="h-3.5 w-3.5" />
                    <span>{part.label}</span>
                  </div>
                  <div className="game-two-part-preview">
                    {partSprite ? (
                      <img
                        src={partSprite.url}
                        alt={part.label}
                        className="game-two-part-preview-image"
                        draggable={false}
                      />
                    ) : (
                      <code className="game-two-code-block">
                        {part.code || part.label}
                      </code>
                    )}
                  </div>
                </div>
              );
            })}

            {availableParts.length === 0 && (
              <div className="game-two-empty-state">
                <CheckCircle2 className="h-5 w-5" />
                <p>All required blocks are locked in place.</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {renderScreenModal(
        <AnimatePresence>
          {shouldPauseForIntroGuide && !shouldPauseForTutorialCoach && (
            <motion.div
              className="actual-game-tutorial-motion"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GameGuideOverlay
                kicker={guideContent.kicker}
                title={guideContent.title}
                lead={guideContent.lead}
                summary={guideContent.summary}
                sections={guideContent.sections}
                onExit={onExitRequest}
                onStart={() => {
                  setShowGuide(false);
                  setShowTutorial(continueToTutorialAfterGuide);
                }}
                startLabel="Next"
              />
            </motion.div>
          )}
          {showTutorial && !showGuide && !shouldPauseForTutorialCoach && (
            <motion.div
              className="actual-game-tutorial-motion"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GameTutorialOverlay
                gameType="GAME_TWO"
                levelNumber={levelData?.levelNumber || 1}
                onExit={onExitRequest}
                onStart={() => setShowTutorial(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>,
      )}

      {isTutorialLevel && shouldPauseForTutorialCoach && (
        <PlayableTutorialCoach
          steps={GAME_TWO_TUTORIAL_STEPS}
          stepIndex={tutorialStepIndex}
          stats={[
            { label: 'Placed', value: `${placedCount}/${totalSlots}` },
            { label: 'Checks', value: `${answeredQuestionsCount}/${totalQuestions}` },
          ]}
          onContinue={handleContinueTutorialStep}
        />
      )}

      <AnimatePresence>
        {infoCard && (
          <motion.div
            key={infoCard.title}
            className="game-two-info-card"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
          >
            <div className="game-two-info-title">
              <Info className="h-4 w-4" />
              {infoCard.title} Locked
            </div>
            <p>{infoCard.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeQuestionPart && (
          <motion.div
            className="game-two-question-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="game-two-question-card"
              initial={{ opacity: 0, scale: 0.92, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="game-two-question-head">
                <div className="game-two-question-copy">
                  <p className="student-mini-kicker">Code Block Locked</p>
                  <h3>{activeQuestionPart.label}</h3>
                  <p>{activeQuestionPart.info}</p>
                </div>
                <div className="game-two-question-points">
                  <span>Question Reward</span>
                  <strong>+1 Correct</strong>
                </div>
              </div>

              <div className="game-two-question-prompt">
                {activeQuestionPart.question?.prompt}
              </div>

              <div className="game-two-hint-panel">
                <div className="game-two-hint-head">
                  <span className="student-mini-kicker">AI Hint</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleRevealHint}
                    disabled={
                      activeHints.length === 0
                      || revealedHintCount >= activeHints.length
                      || (resolvedHintCoinCost > 0 && coins < resolvedHintCoinCost)
                    }
                  >
                    {activeHints.length === 0
                      ? 'No Hints'
                      : revealedHintCount < activeHints.length
                        ? (resolvedHintCoinCost > 0
                          ? `Reveal Hint (-${resolvedHintCoinCost} coin${resolvedHintCoinCost === 1 ? '' : 's'})`
                          : 'Reveal Hint')
                        : 'All Hints Shown'}
                  </button>
                </div>

                {hintNotice && (
                  <p className="game-two-hint-empty text-rose-600">{hintNotice}</p>
                )}
                {!hintNotice && resolvedHintCoinCost > 0 && coins < resolvedHintCoinCost && activeHints.length > 0 && (
                  <p className="game-two-hint-empty text-amber-700">
                    Need {resolvedHintCoinCost} coin{resolvedHintCoinCost === 1 ? '' : 's'} to reveal the next hint.
                  </p>
                )}

                {revealedHintCount > 0 ? (
                  <ul className="game-two-hint-list">
                    {activeHints.slice(0, revealedHintCount).map((hint, index) => (
                      <li key={`${activeQuestionPart.id}-hint-${index}`}>{hint}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="game-two-hint-empty">
                    {activeHints.length === 0
                      ? 'No AI hint is available for this question.'
                      : 'Need a clue? Reveal an AI hint before choosing.'}
                  </p>
                )}
              </div>

              <div className="game-two-question-options">
                {activeQuestionPart.question?.options?.map((option) => {
                  const isSelected = questionFeedback?.selectedOptionId === option.id;
                  const isCorrect = questionFeedback?.correctOptionId === option.id;
                  const isWrongSelected = Boolean(questionFeedback && isSelected && !questionFeedback.isCorrect);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`game-two-question-option ${isSelected ? 'game-two-question-option-selected' : ''} ${isCorrect && questionFeedback ? 'game-two-question-option-correct' : ''} ${isWrongSelected ? 'game-two-question-option-wrong' : ''}`}
                      onClick={() => handleQuestionAnswer(option.id)}
                      disabled={Boolean(questionFeedback)}
                    >
                      <span className="game-two-question-option-index">{option.id.toUpperCase()}</span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="game-two-question-footer">
                {questionFeedback ? (
                  <p className={`game-two-question-feedback ${questionFeedback.isCorrect ? 'game-two-question-feedback-correct' : 'game-two-question-feedback-wrong'}`}>
                    {questionFeedback.isCorrect ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Correct. This answer helps your 3-star rating.
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        No correct-answer point awarded. Correct answer:{' '}
                        {activeQuestionPart.question?.options?.find((option) => option.id === questionFeedback.correctOptionId)?.label || questionFeedback.correctOptionId}
                      </>
                    )}
                  </p>
                ) : (
                  <p className="game-two-question-hint">Answer to improve your 3-star rating.</p>
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleContinueFromQuestion}
                  disabled={!questionFeedback}
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {(isSubmitting || (resultData && !hideResultOverlay)) && (
        <div className="game-two-result-overlay">
          {isSubmitting ? (
            <div className="game-two-result-card">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
              <p className="text-lg font-black text-slate-900">Submitting Result...</p>
            </div>
          ) : (
            <div className="game-two-result-card">
              <div className="game-two-result-title">
                {resultData?.result === 'COMPLETED' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-700" />
                )}
                <span>{resultData?.result === 'COMPLETED' ? 'Level Cleared' : 'Try Again'}</span>
              </div>

              <div className="game-two-result-stats">
                <span>Correct answers: <strong>{points}</strong> / {totalQuestions}</span>
                <span>Local stars: <strong>{earnedStars}</strong> / 3</span>
                <span>Placed blocks: <strong>{placedCount}</strong> / {totalSlots}</span>
                <span>Coins left: <strong>{coins}</strong></span>
                <span>Stars earned: <strong>{resultData?.starsEarned ?? 0}</strong></span>
              </div>

              <div className="game-two-result-actions">
                <button type="button" className="btn btn-secondary" onClick={onRetry}>
                  <RotateCcw className="h-4 w-4" />
                  Retry
                </button>
                <button type="button" className="btn btn-secondary" onClick={onBack}>
                  Back
                </button>
                {canAdvanceLevel && (
                  <button type="button" className="btn btn-primary" onClick={onNextLevel}>
                    Next Level
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const GameTwoCodeLabCanvas = ({
  levelData,
  onLevelComplete,
  onLevelFail,
  onExitRequest,
  resultData,
  isSubmitting,
  canAdvanceLevel,
  hideResultOverlay = false,
  onRetry,
  onBack,
  onNextLevel,
  hintCoinCost = 1,
  freeMistakes = 3,
  hintStarCost = 1,
  initialCoins,
  playerId = 'guest',
  suppressIntroTutorial = false,
  showLevelGuideline = false,
  gameTutorialRequested = false,
  continueToTutorialAfterGuide = false,
}) => {
  const tasks = useMemo(() => (Array.isArray(levelData?.tasks) ? levelData.tasks : []), [levelData]);
  const guideContent = useMemo(
    () => buildGameTwoGuideContent(levelData, { freeMistakes, hintCoinCost, hintStarCost }),
    [freeMistakes, hintCoinCost, hintStarCost, levelData],
  );
  const isTutorialLevel = Boolean(levelData?.isTutorialLevel);
  const [activeTaskIndex, setActiveTaskIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [completedTaskMap, setCompletedTaskMap] = useState({});
  const [failedTaskMap, setFailedTaskMap] = useState({});
  const [compileChecksUsed, setCompileChecksUsed] = useState({});
  const [submittedAnswerSignatures, setSubmittedAnswerSignatures] = useState({});
  const [mistakes, setMistakes] = useState(0);
  const [coins, setCoins] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealedHintCounts, setRevealedHintCounts] = useState({});
  const [generatedHints, setGeneratedHints] = useState({});
  const [isGeneratingHint, setIsGeneratingHint] = useState(false);
  const [hintNotice, setHintNotice] = useState('');

  useEffect(() => {
    if (Number(gameTutorialRequested) > 0 && !isTutorialLevel) {
      setShowGuide(false);
      setShowTutorial(true);
    }
  }, [gameTutorialRequested, isTutorialLevel]);
  const [feedback, setFeedback] = useState(null);
  const [showGuide, setShowGuide] = useState(showLevelGuideline && !isTutorialLevel);
  const [showTutorial, setShowTutorial] = useState(false);
  const [draggedSnippetId, setDraggedSnippetId] = useState('');
  const [touchDrag, setTouchDrag] = useState(null);
  const submittedRef = useRef(false);
  const backgroundMusicRef = useRef(null);
  const backgroundMusicBlockedRef = useRef(false);

  useEffect(() => {
    if (
      typeof window === 'undefined'
      || typeof window.Audio === 'undefined'
      || !getStudentMusicPreference()
    ) {
      return undefined;
    }

    const backgroundMusic = new Audio(GAME_TWO_BACKGROUND_MUSIC_SRC);
    backgroundMusic.loop = true;
    backgroundMusic.preload = 'auto';
    backgroundMusic.volume = 0.55;
    backgroundMusicRef.current = backgroundMusic;

    const attemptPlayback = () => {
      if (!getStudentMusicPreference()) {
        backgroundMusic.pause();
        return;
      }

      const playPromise = backgroundMusic.play();
      if (playPromise?.then) {
        playPromise
          .then(() => {
            backgroundMusicBlockedRef.current = false;
          })
          .catch(() => {
            backgroundMusicBlockedRef.current = true;
          });
      }
    };

    attemptPlayback();
    window.addEventListener('pointerdown', attemptPlayback);
    window.addEventListener('keydown', attemptPlayback);
    window.addEventListener('dragstart', attemptPlayback);

    return () => {
      window.removeEventListener('pointerdown', attemptPlayback);
      window.removeEventListener('keydown', attemptPlayback);
      window.removeEventListener('dragstart', attemptPlayback);
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
      backgroundMusicBlockedRef.current = false;
      if (backgroundMusicRef.current === backgroundMusic) {
        backgroundMusicRef.current = null;
      }
    };
  }, []);

  const activeTask = tasks[activeTaskIndex] || null;
  const taskDragModel = useMemo(() => createTaskDragModel(activeTask), [activeTask]);
  const snippetMap = useMemo(
    () => new Map(taskDragModel.snippets.map((snippet) => [snippet.id, snippet])),
    [taskDragModel.snippets],
  );
  const resolvedHintCoinCost = clamp(Math.round(Number(hintCoinCost) || 0), 0, 9);
  const resolvedCount = tasks.filter((task) => completedTaskMap[task.id] || failedTaskMap[task.id]).length;
  const correctCount = Object.values(completedTaskMap).filter(Boolean).length;
  const requiredCorrectCount = Math.max(1, Math.ceil(tasks.length * 0.8));
  const earnedStars = calculateQuestionStars(correctCount, tasks.length, mistakes);
  const rawPoints = tasks.reduce((sum, task) => (
    completedTaskMap[task.id] ? sum + (Number(task.points) || 0) : sum
  ), 0);

  useEffect(() => {
    const startingAnswers = {};
    tasks.forEach((task) => {
      if (task.type === 'reorder') {
        const slotCount = Array.isArray(task.correctOrder) ? task.correctOrder.length : getTaskInitialOrder(task).length;
        startingAnswers[task.id] = Array.from({ length: slotCount }, () => '');
      } else {
        startingAnswers[task.id] = '';
      }
    });

    setActiveTaskIndex(0);
    setAnswers(startingAnswers);
    setCompletedTaskMap({});
    setFailedTaskMap({});
    setCompileChecksUsed({});
    setSubmittedAnswerSignatures({});
    setMistakes(0);
    setCoins(Math.max(Number(initialCoins) || 0, tasks.length));
    setHintsUsed(0);
    setRevealedHintCounts({});
    setGeneratedHints({});
    setIsGeneratingHint(false);
    setHintNotice('');
    setFeedback(null);
    setShowGuide(showLevelGuideline && !isTutorialLevel);
    setShowTutorial(false);
    setDraggedSnippetId('');
    submittedRef.current = false;
  }, [initialCoins, isTutorialLevel, levelData?.levelNumber, showLevelGuideline, tasks]);

  useEffect(() => {
    setHintNotice('');
    setFeedback(null);
  }, [activeTaskIndex]);

  useEffect(() => {
    if (submittedRef.current || tasks.length === 0 || resolvedCount < tasks.length) {
      return;
    }

    submittedRef.current = true;
    const passed = correctCount >= requiredCorrectCount;
    const payload = {
      outcome: passed ? 'COMPLETED' : 'FAILED',
      mistakes,
      correctPlacements: correctCount,
      totalPlacements: tasks.length,
      points: correctCount,
      rawPoints,
      starsEarned: earnedStars,
      coinsRemaining: coins,
      hintsUsed,
      answeredQuestions: resolvedCount,
      totalQuestions: tasks.length,
      completedTasks: correctCount,
      totalTasks: tasks.length,
    };
    if (passed) onLevelComplete?.(payload);
    else onLevelFail?.(payload);
  }, [coins, correctCount, earnedStars, hintsUsed, mistakes, onLevelComplete, onLevelFail, rawPoints, requiredCorrectCount, resolvedCount, tasks.length]);

  const activeHints = useMemo(
    () => (Array.isArray(activeTask?.hints)
      ? activeTask.hints.map((hint) => String(hint || '').trim()).filter(Boolean)
      : []),
    [activeTask],
  );
  const revealedHintCount = activeTask ? Number(revealedHintCounts[activeTask.id] || 0) : 0;

  const resolveSnippetIdFromDrop = (event) => (
    event?.dataTransfer?.getData('application/x-itechs-code-snippet-id') || draggedSnippetId || ''
  );

  const currentTaskAnswer = activeTask ? answers[activeTask.id] : '';
  const placedSnippetIds = useMemo(() => {
    if (Array.isArray(currentTaskAnswer)) {
      return new Set(currentTaskAnswer.filter(Boolean));
    }

    return new Set(currentTaskAnswer ? [currentTaskAnswer] : []);
  }, [currentTaskAnswer]);
  const availableSnippets = useMemo(
    () => taskDragModel.snippets.filter((snippet) => !placedSnippetIds.has(snippet.id)),
    [placedSnippetIds, taskDragModel.snippets],
  );
  const isActiveTaskReady = useMemo(() => {
    if (!activeTask) {
      return false;
    }

    if (taskDragModel.isReorder) {
      return Array.isArray(answers[activeTask.id])
        && answers[activeTask.id].length >= taskDragModel.slots.length
        && answers[activeTask.id].slice(0, taskDragModel.slots.length).every(Boolean);
    }

    return Boolean(answers[activeTask.id]);
  }, [activeTask, answers, taskDragModel.isReorder, taskDragModel.slots.length]);

  const handleDropSnippet = (task, slotIndex, snippetId) => {
    if (!task || completedTaskMap[task.id] || failedTaskMap[task.id] || !snippetMap.has(snippetId)) {
      return;
    }

    setAnswers((current) => {
      if (taskDragModel.isReorder) {
        const slotCount = taskDragModel.slots.length;
        const nextSlots = Array.isArray(current[task.id])
          ? current[task.id].slice(0, slotCount)
          : Array.from({ length: slotCount }, () => '');

        while (nextSlots.length < slotCount) {
          nextSlots.push('');
        }

        const existingIndex = nextSlots.indexOf(snippetId);
        if (existingIndex >= 0) {
          nextSlots[existingIndex] = '';
        }
        nextSlots[slotIndex] = snippetId;

        return { ...current, [task.id]: nextSlots };
      }

      return { ...current, [task.id]: snippetId };
    });
  };

  const handleDropOnCodeSlot = (event, task, slotIndex) => {
    event.preventDefault();
    const snippetId = resolveSnippetIdFromDrop(event);
    handleDropSnippet(task, slotIndex, snippetId);
  };

  const handleTouchDragStart = (event, snippet) => {
    if (event.pointerType === 'mouse' || completedTaskMap[activeTask.id]) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraggedSnippetId(snippet.id);
    setTouchDrag({
      pointerId: event.pointerId,
      snippetId: snippet.id,
      label: snippet.label,
      code: snippet.code,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleTouchDragMove = (event) => {
    if (!touchDrag || touchDrag.pointerId !== event.pointerId) return;
    event.preventDefault();
    setTouchDrag((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : null));
  };

  const handleTouchDragEnd = (event) => {
    if (!touchDrag || touchDrag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dropTarget = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest?.('[data-game-two-code-slot]');

    if (dropTarget) {
      const slotIndex = Number(dropTarget.getAttribute('data-game-two-code-slot'));
      if (Number.isInteger(slotIndex)) {
        handleDropSnippet(activeTask, slotIndex, touchDrag.snippetId);
      }
    }

    setTouchDrag(null);
    setDraggedSnippetId('');
  };

  const handleTapCodeSlot = (task, slotIndex) => {
    if (!draggedSnippetId) return;
    handleDropSnippet(task, slotIndex, draggedSnippetId);
    setDraggedSnippetId('');
  };

  const handleSelectCodeSnippet = (task, snippetId) => {
    if (!task || !snippetId || completedTaskMap[task.id] || failedTaskMap[task.id]) return;

    // A single blank can be filled immediately on phones. Reorder tasks still
    // select the snippet first so the player can choose its destination line.
    if (!taskDragModel.isReorder && taskDragModel.slots.length === 1) {
      handleDropSnippet(task, 0, snippetId);
      setDraggedSnippetId('');
      return;
    }

    setDraggedSnippetId((current) => (current === snippetId ? '' : snippetId));
  };

  const handleClearCodeSlot = (task, slotIndex) => {
    if (!task || completedTaskMap[task.id] || failedTaskMap[task.id]) {
      return;
    }

    setAnswers((current) => {
      if (taskDragModel.isReorder) {
        const nextSlots = Array.isArray(current[task.id])
          ? [...current[task.id]]
          : Array.from({ length: taskDragModel.slots.length }, () => '');
        nextSlots[slotIndex] = '';
        return { ...current, [task.id]: nextSlots };
      }

      return { ...current, [task.id]: '' };
    });
  };

  const markTaskComplete = (task, isCorrect, answerSignature) => {
    if (isCorrect) {
      setCompletedTaskMap((current) => ({ ...current, [task.id]: true }));
      playGameTwoSoundEffect(GAME_TWO_CORRECT_SOUND_SRC);
      setCoins((current) => current + (Number(task.coinReward) || 1));
      setFeedback({
        taskId: task.id,
        isCorrect: true,
        message: task.feedback?.correct || task.coach || 'Correct. Code accepted.',
      });
    } else {
      const previousChecksUsed = Number(compileChecksUsed[task.id] || 0);
      const nextChecksUsed = previousChecksUsed + 1;
      const checksLeft = Math.max(0, 3 - nextChecksUsed);
      playGameTwoSoundEffect(GAME_TWO_INCORRECT_SOUND_SRC);
      setMistakes((current) => current + 1);
      setCompileChecksUsed((current) => ({ ...current, [task.id]: nextChecksUsed }));
      setSubmittedAnswerSignatures((current) => ({
        ...current,
        [task.id]: [...(current[task.id] || []), answerSignature],
      }));
      if (checksLeft === 0) {
        setFailedTaskMap((current) => ({ ...current, [task.id]: true }));
      }
      setAnswers((current) => ({
        ...current,
        [task.id]: task.type === 'reorder'
          ? Array.from({ length: taskDragModel.slots.length }, () => '')
          : '',
      }));
      setDraggedSnippetId('');
      setFeedback({
        taskId: task.id,
        isCorrect: false,
        message: checksLeft === 0
          ? 'No compile checks remain. This task is unsuccessful; the correct answer stays hidden.'
          : nextChecksUsed === 1
            ? `Compilation failed. Review the code structure and data types. ${checksLeft} checks remain.`
            : `Compilation still fails. Rebuild the full answer or use a hint to inspect the task. ${checksLeft} check remains.`,
      });
    }
  };

  const handleSubmitTask = (task) => {
    if (!task || completedTaskMap[task.id] || failedTaskMap[task.id]) {
      return;
    }

    const answerSignature = Array.isArray(answers[task.id])
      ? answers[task.id].join('|')
      : String(answers[task.id] || '');
    if ((submittedAnswerSignatures[task.id] || []).includes(answerSignature)) {
      setFeedback({
        taskId: task.id,
        isCorrect: false,
        message: 'You already compiled that exact answer. Change the code before using another check.',
      });
      return;
    }

    if (task.type === 'choice') {
      markTaskComplete(task, answers[task.id] === task.correctOptionId, answerSignature);
      return;
    }

    if (task.type === 'reorder') {
      const currentOrder = Array.isArray(answers[task.id]) ? answers[task.id] : [];
      markTaskComplete(task, isCodingAnswerCorrect(task, currentOrder), answerSignature);
      return;
    }

    const acceptedAnswers = Array.isArray(task.acceptedAnswers) && task.acceptedAnswers.length > 0
      ? task.acceptedAnswers
      : [task.answer];
    const selectedSnippet = snippetMap.get(answers[task.id]);
    const submittedAnswer = normalizeCodeAnswer(selectedSnippet?.code);
    const isCorrect = acceptedAnswers.some((answer) => normalizeCodeAnswer(answer) === submittedAnswer);
    markTaskComplete(task, isCorrect, answerSignature);
  };

  const handleRevealHint = async () => {
    if (!activeTask || isGeneratingHint || activeHints.length === 0 || revealedHintCount >= activeHints.length) {
      return;
    }

    if (resolvedHintCoinCost > 0 && coins < resolvedHintCoinCost) {
      setHintNotice(`Need ${resolvedHintCoinCost} coin${resolvedHintCoinCost === 1 ? '' : 's'} to reveal the next hint.`);
      return;
    }

    const fallbackHint = activeHints[revealedHintCount] || 'Inspect the Java syntax around the blank.';
    const placedCodes = (Array.isArray(currentTaskAnswer) ? currentTaskAnswer : [currentTaskAnswer])
      .filter(Boolean)
      .map((snippetId) => snippetMap.get(snippetId)?.code)
      .filter(Boolean);
    setIsGeneratingHint(true);
    setHintNotice('');
    let resolvedHint = fallbackHint;
    try {
      const response = await levelAPI.generateGameHint('GAME_TWO', levelData?.levelNumber || 1, {
        topic: activeTask.title,
        objective: activeTask.prompt,
        availableTokens: taskDragModel.snippets.map((snippet) => snippet.code),
        assembledTokens: placedCodes,
        hintNumber: revealedHintCount + 1,
        fallbackHint,
        forbiddenAnswer: activeTask.answer
          || activeTask.options?.find((option) => option.id === activeTask.correctOptionId)?.label
          || '',
      });
      const aiHint = String(response?.data?.hint || '').trim();
      if (response?.status === 'success' && aiHint) resolvedHint = aiHint;
    } catch {
      // Use the validated task hint when AI is unavailable.
    } finally {
      setIsGeneratingHint(false);
    }

    if (resolvedHintCoinCost > 0) setCoins((current) => Math.max(0, current - resolvedHintCoinCost));
    setHintsUsed((current) => current + 1);
    setGeneratedHints((current) => ({
      ...current,
      [activeTask.id]: [...(current[activeTask.id] || []), resolvedHint],
    }));
    setRevealedHintCounts((current) => ({
      ...current,
      [activeTask.id]: Math.min(activeHints.length, revealedHintCount + 1),
    }));
    playGameTwoSoundEffect(GAME_TWO_HINT_SOUND_SRC, 0.65);
  };

  const goToNextTask = () => {
    setActiveTaskIndex((current) => Math.min(tasks.length - 1, current + 1));
  };

  const handleRetryGame = () => {
    onRetry?.();
  };

  if (tasks.length === 0 || !activeTask) {
    return (
      <div className="game-two-shell">
        <section className="game-two-empty-state">
          <AlertCircle className="h-5 w-5" />
          <p>No Java code lab tasks are available for this level.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="game-two-shell game-two-code-lab-shell">
      <div className="game-two-code-lab-layout">
        <section className="game-two-code-lab-main">
          <div className="game-two-code-lab-terminal">
            <div className="game-two-code-lab-terminal-bar">
              <span className="student-mini-kicker">Java Code Lab</span>
              <span>{levelData?.title || 'Code Lab'}</span>
            </div>
            <pre>{`public class CodeLab {
  public static void main(String[] args) {
    // Drag the correct snippet into the broken code, then compile.
  }
}`}</pre>
          </div>

          <div className="game-two-code-lab-task">
            <p className="student-mini-kicker">Task {activeTaskIndex + 1} of {tasks.length}</p>
            <h3>{activeTask.title}</h3>
            <p>{activeTask.prompt}</p>

            <div className="game-two-code-drop-workspace">
              <div className="game-two-code-structure game-two-guide-code-target" aria-label="Code structure">
                <div className="game-two-code-lab-terminal-bar">
                  <span className="student-mini-kicker">Code Structure</span>
                  <span>{taskDragModel.isReorder ? 'Drop each line in order' : 'Repair the blank'}</span>
                </div>

                {activeTask.snippet && activeTask.type === 'debug' && (
                  <code className="game-two-code-lab-snippet game-two-code-lab-broken">{activeTask.snippet}</code>
                )}

                {taskDragModel.isReorder ? (
                  <div className="game-two-code-slot-stack">
                    {taskDragModel.slots.map((slot, index) => {
                      const placedSnippetId = Array.isArray(answers[activeTask.id]) ? answers[activeTask.id][index] : '';
                      const placedSnippet = placedSnippetId ? snippetMap.get(placedSnippetId) : null;

                      return (
                        <div key={slot.id} className="game-two-code-structure-line">
                          <span className="game-two-code-line-number">{index + 1}</span>
                          <div
                            data-game-two-code-slot={index}
                            className={`game-two-code-drop-slot ${placedSnippet ? 'game-two-code-drop-slot-filled' : ''}`}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => handleDropOnCodeSlot(event, activeTask, index)}
                            onClick={() => handleTapCodeSlot(activeTask, index)}
                          >
                            {placedSnippet ? (
                              <div
                                draggable={!completedTaskMap[activeTask.id]}
                                className="game-two-code-placed-snippet"
                                onDragStart={(event) => {
                                  event.dataTransfer.setData('application/x-itechs-code-snippet-id', placedSnippet.id);
                                  event.dataTransfer.effectAllowed = 'move';
                                  setDraggedSnippetId(placedSnippet.id);
                                }}
                                onDragEnd={() => setDraggedSnippetId('')}
                              >
                                <Grip className="h-4 w-4" />
                                <code>{placedSnippet.code}</code>
                                {!completedTaskMap[activeTask.id] && (
                                  <button
                                    type="button"
                                    className="game-two-code-clear-slot"
                                    onClick={() => handleClearCodeSlot(activeTask, index)}
                                    aria-label="Remove snippet"
                                  >
                                    x
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span>{slot.label}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="game-two-code-fill-line">
                    {taskDragModel.beforeBlank && <code>{taskDragModel.beforeBlank}</code>}
                    <div
                      data-game-two-code-slot="0"
                      className={`game-two-code-drop-slot ${answers[activeTask.id] ? 'game-two-code-drop-slot-filled' : ''}`}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => handleDropOnCodeSlot(event, activeTask, 0)}
                      onClick={() => handleTapCodeSlot(activeTask, 0)}
                    >
                      {answers[activeTask.id] ? (
                        <div
                          draggable={!completedTaskMap[activeTask.id]}
                          className="game-two-code-placed-snippet"
                          onDragStart={(event) => {
                            event.dataTransfer.setData('application/x-itechs-code-snippet-id', answers[activeTask.id]);
                            event.dataTransfer.effectAllowed = 'move';
                            setDraggedSnippetId(answers[activeTask.id]);
                          }}
                          onDragEnd={() => setDraggedSnippetId('')}
                        >
                          <Grip className="h-4 w-4" />
                          <code>{snippetMap.get(answers[activeTask.id])?.code || ''}</code>
                          {!completedTaskMap[activeTask.id] && (
                            <button
                              type="button"
                              className="game-two-code-clear-slot"
                              onClick={() => handleClearCodeSlot(activeTask, 0)}
                              aria-label="Remove snippet"
                            >
                              x
                            </button>
                          )}
                        </div>
                      ) : (
                        <span>{taskDragModel.slots[0]?.label || 'Drop snippet here'}</span>
                      )}
                    </div>
                    {taskDragModel.afterBlank && <code>{taskDragModel.afterBlank}</code>}
                    {!activeTask.snippet && activeTask.type !== 'choice' && (
                      <span className="game-two-code-expression-note">snippet</span>
                    )}
                  </div>
                )}
              </div>

              <div className="game-two-code-snippet-tray game-two-guide-snippets-target">
                <div className="game-two-code-lab-terminal-bar">
                  <span className="student-mini-kicker">Code Choices</span>
                  <span>Drag, or tap a choice then its slot</span>
                </div>
                <div className="game-two-code-drag-list">
                  {availableSnippets.map((snippet) => (
                    <div
                      key={snippet.id}
                      draggable={!completedTaskMap[activeTask.id]}
                      className={`game-two-part-card game-two-code-drag-card ${draggedSnippetId === snippet.id ? 'game-two-part-dragging' : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={draggedSnippetId === snippet.id}
                      onClick={() => handleSelectCodeSnippet(activeTask, snippet.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleSelectCodeSnippet(activeTask, snippet.id);
                        }
                      }}
                      onDragStart={(event) => {
                        event.dataTransfer.setData('application/x-itechs-code-snippet-id', snippet.id);
                        event.dataTransfer.effectAllowed = 'move';
                        setDraggedSnippetId(snippet.id);
                      }}
                      onDragEnd={() => setDraggedSnippetId('')}
                    >
                      <span
                        className="game-two-code-touch-handle"
                        aria-label={`Drag ${snippet.label}`}
                        onPointerDown={(event) => handleTouchDragStart(event, snippet)}
                        onPointerMove={handleTouchDragMove}
                        onPointerUp={handleTouchDragEnd}
                        onPointerCancel={() => {
                          setTouchDrag(null);
                          setDraggedSnippetId('');
                        }}
                      >
                        <Grip className="h-4 w-4" />
                      </span>
                      <div>
                        <span>{snippet.label}</span>
                        <code>{snippet.code}</code>
                      </div>
                    </div>
                  ))}

                  {availableSnippets.length === 0 && (
                    <div className="game-two-empty-state">
                      <CheckCircle2 className="h-5 w-5" />
                      <p>All snippets are placed.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {feedback?.taskId === activeTask.id && (
              <p className={`game-two-question-feedback ${feedback.isCorrect ? 'game-two-question-feedback-correct' : 'game-two-question-feedback-wrong'}`}>
                {feedback.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {feedback.message}
              </p>
            )}

            <div className="game-two-question-footer">
              <button
                type="button"
                className="btn btn-secondary game-two-guide-hint-target"
                onClick={handleRevealHint}
                disabled={isGeneratingHint || activeHints.length === 0 || revealedHintCount >= activeHints.length}
              >
                {isGeneratingHint ? <Loader2 className="h-4 w-4 animate-spin" /> : <HelpCircle className="h-4 w-4" />}
                {isGeneratingHint ? 'Thinking...' : 'Hint'}
              </button>
              <button
                type="button"
                className="btn btn-primary game-two-guide-compile-target"
                onClick={() => ((completedTaskMap[activeTask.id] || failedTaskMap[activeTask.id]) ? goToNextTask() : handleSubmitTask(activeTask))}
                disabled={Boolean(
                  ((completedTaskMap[activeTask.id] || failedTaskMap[activeTask.id]) && activeTaskIndex >= tasks.length - 1)
                  || (!completedTaskMap[activeTask.id] && !failedTaskMap[activeTask.id] && !isActiveTaskReady),
                )}
              >
                {(completedTaskMap[activeTask.id] || failedTaskMap[activeTask.id]) ? 'Next Task' : 'Compile Answer'}
              </button>
            </div>

            <p className="game-two-hint-empty">
              Compile checks: {Math.max(0, 3 - Number(compileChecksUsed[activeTask.id] || 0))}/3 remaining
            </p>

            {hintNotice && <p className="game-two-hint-empty text-rose-600">{hintNotice}</p>}
            {revealedHintCount > 0 && (
              <ul className="game-two-hint-list">
                {(generatedHints[activeTask.id] || activeHints.slice(0, revealedHintCount)).map((hint, index) => (
                  <li key={`${activeTask.id}-hint-${index}`}>{hint}</li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="game-two-code-lab-sidebar">
          <div className="game-two-side-card game-two-guide-progress-target">
            <span className="student-stat-chip">Resolved {resolvedCount}/{tasks.length}</span>
            <span className="student-stat-chip">Correct {correctCount}/{tasks.length}</span>
            <span className="student-stat-chip">Need {requiredCorrectCount}/{tasks.length}</span>
            <span className="student-stat-chip">Mistakes {mistakes}</span>
            <span className="student-stat-chip">Stars {earnedStars}/3</span>
            <span className="student-stat-chip inline-flex items-center gap-1 game-two-guide-coins-target">
              <Coins className="h-3.5 w-3.5" />
              Coins {coins}
            </span>
            <button type="button" className="student-stat-chip inline-flex items-center gap-1" onClick={onExitRequest}>
              <LogOut className="h-3.5 w-3.5" />
              Exit Level
            </button>
          </div>

          <div className="game-two-task-list game-two-guide-tasks-target">
            {tasks.map((task, index) => {
              const previousTaskId = tasks[index - 1]?.id;
              const isUnlocked = index === 0 || Boolean(completedTaskMap[previousTaskId] || failedTaskMap[previousTaskId]);
              return (
                <button
                  key={task.id}
                  type="button"
                  className={`game-two-task-tab ${index === activeTaskIndex ? 'game-two-task-tab-active' : ''} ${completedTaskMap[task.id] ? 'game-two-task-tab-done' : ''} ${failedTaskMap[task.id] ? 'game-two-task-tab-failed' : ''} ${!isUnlocked ? 'game-two-task-tab-locked' : ''}`}
                  onClick={() => {
                    if (isUnlocked) setActiveTaskIndex(index);
                  }}
                  disabled={!isUnlocked}
                  aria-label={`${task.title}${isUnlocked ? '' : ' (locked)'}`}
                >
                  <span>{isUnlocked ? index + 1 : <Lock className="h-3.5 w-3.5" />}</span>
                  <strong>{task.title}</strong>
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {touchDrag && createPortal(
        <div
          className="game-two-code-touch-ghost"
          style={{ left: touchDrag.x, top: touchDrag.y }}
          aria-hidden="true"
        >
          <strong>{touchDrag.label}</strong>
          <code>{touchDrag.code}</code>
        </div>,
        document.body,
      )}

      {renderScreenModal(
        <AnimatePresence>
          {showGuide && (
            <motion.div
              className="actual-game-tutorial-motion"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GameGuideOverlay
                kicker={guideContent.kicker}
                title={guideContent.title}
                lead={guideContent.lead}
                summary={guideContent.summary}
                sections={guideContent.sections}
                onExit={onExitRequest}
                onStart={() => {
                  setShowGuide(false);
                  setShowTutorial(continueToTutorialAfterGuide);
                }}
                startLabel="Next"
              />
            </motion.div>
          )}
          {showTutorial && !showGuide && (
            <motion.div
              className="actual-game-tutorial-motion"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GameTutorialOverlay
                gameType="GAME_TWO"
                levelNumber={levelData?.levelNumber || 1}
                onExit={onExitRequest}
                onStart={() => setShowTutorial(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>,
      )}

      {(isSubmitting || (resultData && !hideResultOverlay)) && (
        <div className="game-two-result-overlay">
          {isSubmitting ? (
            <div className="game-two-result-card">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
              <p className="text-lg font-black text-slate-900">Submitting Result...</p>
            </div>
          ) : (
            <div className="game-two-result-card">
              <div className="game-two-result-title">
                {resultData?.result === 'COMPLETED'
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  : <AlertCircle className="h-5 w-5 text-rose-700" />}
                <span>{resultData?.result === 'COMPLETED' ? 'Level Cleared' : 'Level Not Passed'}</span>
              </div>
              <div className="game-two-result-stats">
                <span>Correct tasks: <strong>{correctCount}</strong> / {tasks.length}</span>
                <span>Local stars: <strong>{earnedStars}</strong> / 3</span>
                <span>Coins left: <strong>{coins}</strong></span>
                <span>Stars earned: <strong>{resultData?.starsEarned ?? 0}</strong></span>
              </div>
              <div className="game-two-result-actions">
                <button type="button" className="btn btn-secondary" onClick={handleRetryGame}>
                  <RotateCcw className="h-4 w-4" />
                  Retry
                </button>
                <button type="button" className="btn btn-secondary" onClick={onBack}>Back</button>
                {canAdvanceLevel && (
                  <button type="button" className="btn btn-primary" onClick={onNextLevel}>
                    Next Level
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const GameCanvasGameTwo = (props) => {
  const [showCongratulations, setShowCongratulations] = useState(false);
  const isCompleted = props.resultData?.result === 'COMPLETED';

  useEffect(() => {
    setShowCongratulations(isCompleted);
  }, [isCompleted, props.levelData?.levelNumber]);

  const Canvas = Array.isArray(props.levelData?.tasks) && props.levelData.tasks.length > 0
    ? GameTwoCodeLabCanvas
    : GameTwoHardwareDragCanvas;

  return (
    <>
      <Canvas
        {...props}
        hideResultOverlay={props.hideResultOverlay || showCongratulations}
      />
      <AnimatePresence>
        {showCongratulations && isCompleted && (
          <motion.div
            className="student-story-intro-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              initial={{ y: 18, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 12, scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <CongratulatoryOverlay
                message={`You completed ${props.levelData?.title || `Level ${props.levelData?.levelNumber || 1}`}. Great job!`}
                onNext={() => setShowCongratulations(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GameCanvasGameTwo;
