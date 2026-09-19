import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '../gameTwoCodeLab.css';
import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import GameGuideOverlay from '../../shared/ui/GameGuideOverlay';
import GameTutorialOverlay from '../../shared/ui/GameTutorialOverlay';
import announcementBoard from '../../../assets/announcement-board.png';
import industrialFrameBackground from '../../../assets/game-two/industrial-frame-background.png';
import beepOne from '../../game-six/assets/beep-1.mp3';
import beepTwo from '../../game-six/assets/beep-2.mp3';
import beepThree from '../../game-six/assets/beep-3.mp3';
import {
  getStudentAudioVolumePreference,
  getStudentMusicPreference,
  getStudentSfxPreference,
  getStudentSfxVolumePreference,
} from '../../../utils/studentMenuAudio';

const SWORD_SLICE_SOUND_SRC = new URL('../assets/processed/swordslice.mp3', import.meta.url).href;
const SYNTAX_SLICE_SOUND_SRC = new URL('../assets/processed/sfxgame2.mp3', import.meta.url).href;
const BOMB_ERROR_SOUND_SRC = new URL('../assets/processed/error.mp3', import.meta.url).href;
const COMBO_SOUND_SRC = new URL('../assets/processed/game2combo.mp3', import.meta.url).href;
const BACKGROUND_MUSIC_SRC = new URL('../assets/processed/game2background.mp3', import.meta.url).href;

const getComboMultiplier = (combo) => {
  if (combo >= 10) return 5;
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
};

const COMBO_MILESTONES = [3, 5, 10];

const getStudentMusicVolume = (baseVolume = 1) => (
  baseVolume * (getStudentAudioVolumePreference() / 100)
);

const getStudentSfxVolume = (baseVolume = 1) => (
  baseVolume * (getStudentSfxVolumePreference() / 100)
);

const LEVEL_CONFIG = Object.freeze({
  1: { target: 2, spawnRate: 1750, speed: 90, bombChance: 0.12, decoyChance: 0.22, correctChance: 0.42, correctGap: 1, maxObjects: 4 },
  2: { target: 3, spawnRate: 1220, speed: 128, bombChance: 0.16, decoyChance: 0.28, correctChance: 0.36, correctGap: 1, maxObjects: 6 },
  3: { target: 4, spawnRate: 980, speed: 155, bombChance: 0.21, decoyChance: 0.35, correctChance: 0.33, correctGap: 1, maxObjects: 7 },
  4: { target: 5, spawnRate: 780, speed: 180, bombChance: 0.25, decoyChance: 0.43, correctChance: 0.3, correctGap: 2, maxObjects: 8 },
  5: { target: 6, spawnRate: 640, speed: 205, bombChance: 0.29, decoyChance: 0.5, correctChance: 0.28, correctGap: 2, maxObjects: 9 },
});

const AFK_TIMEOUT_MS = 20000;
const ANNOUNCEMENT_MS = 5500;
const COUNTDOWN_SECONDS = 3;
const FADE_MS = 350;

const FALLBACK_DECOYS = Object.freeze([
  'System.out.printline',
  'int score == 10;',
  'if score >= 10',
  'retrun;',
  'clas CodeLab',
  'boolean ready = yes;',
  'for int i = 0;',
  'whlie (isRunning)',
  'new Scaner(System.in)',
]);

const GameTwoAnnouncementBoard = ({ levelNumber = 1, targetCodes = [], onStart }) => {
  const level = clamp(Math.round(Number(levelNumber) || 1), 1, 5);
  const displayTargetCodes = Array.isArray(targetCodes) ? targetCodes.filter(Boolean).join(' & ') : '';
  const [countdown, setCountdown] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const onStartRef = useRef(onStart);
  const countdownAudioRef = useRef({});
  onStartRef.current = onStart;

  useEffect(() => {
    const sounds = {
      1: new Audio(beepOne),
      2: new Audio(beepTwo),
      3: new Audio(beepThree),
    };
    Object.values(sounds).forEach((sound) => {
      sound.preload = 'auto';
      sound.load();
    });
    countdownAudioRef.current = sounds;
    return () => {
      Object.values(sounds).forEach((sound) => {
        sound.pause();
        sound.currentTime = 0;
      });
      countdownAudioRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!countdown) return undefined;
    const sourceSound = countdownAudioRef.current[countdown];
    if (!sourceSound) return undefined;

    const sound = sourceSound.cloneNode();
    sound.muted = false;
    sound.volume = getStudentSfxVolume(1);
    sound.currentTime = 0;
    sound.play().catch(() => {});

    return () => {
      if (countdown !== 1) {
        sound.pause();
        sound.currentTime = 0;
      }
    };
  }, [countdown]);

  useEffect(() => {
    setCountdown(null);
    setLeaving(false);
    const timers = [
      window.setTimeout(() => setCountdown(3), ANNOUNCEMENT_MS),
      window.setTimeout(() => setCountdown(2), ANNOUNCEMENT_MS + 1000),
      window.setTimeout(() => setCountdown(1), ANNOUNCEMENT_MS + 2000),
      window.setTimeout(() => setLeaving(true), ANNOUNCEMENT_MS + (COUNTDOWN_SECONDS * 1000) - FADE_MS),
      window.setTimeout(() => onStartRef.current?.(), ANNOUNCEMENT_MS + (COUNTDOWN_SECONDS * 1000)),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [level]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.body.classList.add('game-six-announcement-open');

    return () => {
      document.body.classList.remove('game-six-announcement-open');
    };
  }, []);

  const isCountingDown = countdown !== null;
  const announcement = (
    <div className={`announcement-guide-backdrop game-two-announcement-backdrop${leaving ? ' is-leaving' : ''}`} role="dialog" aria-modal="true" aria-labelledby="game-two-announcement-title">
      <section className="announcement-guide-board" style={{ backgroundImage: `url(${announcementBoard})` }}>
        <div className="announcement-guide-paper">
          {isCountingDown ? (
            <div className="announcement-guide-countdown" role="timer" aria-live="assertive">
              <p>GET READY!</p>
              <strong key={countdown}>{countdown}</strong>
            </div>
          ) : (
            <>
              <p className="announcement-guide-level">CHALLENGE ANNOUNCEMENT</p>
              <h2 id="game-two-announcement-title">READY?</h2>
              <div className="announcement-guide-divider" aria-hidden="true" />
              <h3 className="announcement-guide-challenge-title">LEVEL {level}: SLASH THE CORRECT CODE</h3>
              <p className="announcement-guide-instruction">TARGET CODE</p>
              <p className="announcement-guide-instruction">{displayTargetCodes}</p>
            </>
          )}
        </div>
      </section>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(announcement, document.body)
    : announcement;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (items) => items[Math.floor(Math.random() * items.length)];
const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const drawCoverImage = (ctx, image, width, height) => {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
};

const getLevelConfig = (levelNumber) => (
  LEVEL_CONFIG[clamp(Math.round(Number(levelNumber) || 1), 1, 5)] || LEVEL_CONFIG[1]
);

const getCorrectOptionLabel = (task) => (
  (Array.isArray(task?.options) ? task.options : [])
    .find((option) => String(option.id) === String(task?.correctOptionId))
    ?.label || task?.answer || ''
);

const getReorderCode = (task) => {
  const blocks = Array.isArray(task?.blocks) ? task.blocks : [];
  const blockMap = new Map(blocks.map((block) => [block.id, block.code]));
  const order = Array.isArray(task?.correctOrder) && task.correctOrder.length
    ? task.correctOrder
    : blocks.map((block) => block.id);
  return order.map((id) => blockMap.get(id)).filter(Boolean).join('\n');
};

const getTaskTargetCode = (task) => {
  if (task?.type === 'reorder') return getReorderCode(task);
  if (task?.type === 'choice') return getCorrectOptionLabel(task);
  return String(task?.acceptedAnswers?.[0] || task?.answer || '').trim();
};

const smartJoin = (pieces) => (
  pieces.reduce((line, piece) => {
    if (!line) return piece;
    if (/^[;,){}\]]/.test(piece) || piece.startsWith('.')) return `${line}${piece}`;
    if (line.endsWith('(') || line.endsWith('.') || line.endsWith('[')) return `${line}${piece}`;
    return `${line} ${piece}`;
  }, '')
);

const formatCodePieces = (pieces, type) => (
  type === 'reorder' ? pieces.join('\n') : smartJoin(pieces)
);

const splitCodePieces = (code) => {
  const value = String(code || '').trim();
  if (!value) return [];
  if (value.includes('\n')) return value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const printlnMatch = value.match(/^System\.out\.println\s*(\(.*\))\s*;?$/);
  if (printlnMatch) return ['System', '.out', '.println', printlnMatch[1], ';'];
  const tokens = value.match(/"[^"]*"|==|>=|<=|!=|\+\+|--|&&|\|\||[A-Za-z_$][\w$]*|\d+|[(){}[\].,;=<>+\-*/]/g) || [value];
  const pieces = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if ((token === 'System' && tokens[i + 1] === '.' && tokens[i + 2] === 'out')
      || (token === 'out' && tokens[i + 1] === '.' && tokens[i + 2] === 'println')) {
      pieces.push(token);
      continue;
    }
    if (token === '.' && pieces.length) {
      pieces[pieces.length - 1] = `${pieces[pieces.length - 1]}.`;
      continue;
    }
    if (/^["\d]/.test(token) && pieces[pieces.length - 1] === '(' && tokens[i + 1] === ')') {
      pieces[pieces.length - 1] = `(${token})`;
      i += 1;
      continue;
    }
    pieces.push(token);
  }
  return pieces.filter(Boolean);
};

const renderCodePreview = (challenge, pieceIndex) => {
  const pieces = challenge.pieces || [];
  const correctCode = formatCodePieces(pieces, challenge.type);
  const slicedCode = formatCodePieces(pieces.slice(0, pieceIndex), challenge.type);
  return `CORRECT CODE:\n${correctCode}\n\nSLICED CODE:\n${slicedCode || '____'}`;
};

const inferOutput = (task, targetCode) => {
  const source = `${task?.snippet || ''}\n${targetCode || ''}`;
  const printed = [...source.matchAll(/System\.out\.println\s*\(\s*"([^"]*)"\s*\)\s*;?/g)]
    .map((match) => match[1]);
  if (printed.length) return printed.join('\n');
  if (task?.type === 'choice') return getCorrectOptionLabel(task);
  const assignment = String(targetCode || '').match(/(?:int|double|String|boolean)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]+);?/);
  if (assignment) return `${assignment[1]} = ${assignment[2].replace(/^"|"$/g, '')}`;
  if (String(task?.prompt || '').toLowerCase().includes('how many times')) return targetCode;
  return targetCode || 'Compiled';
};

const makeDecoy = (piece) => {
  const value = String(piece || '').trim();
  if (!value) return pick(FALLBACK_DECOYS);
  return value
    .replace(/\bSystem\b/g, 'Systme')
    .replace(/\bprintln\b/g, 'printline')
    .replace(/\bpublic\b/g, 'publik')
    .replace(/\bstatic\b/g, 'statik')
    .replace(/\bvoid\b/g, 'viod')
    .replace(/\bclass\b/g, 'clas')
    .replace(/==/g, '=')
    .replace(/>=/g, '=>')
    .replace(/;/g, '');
};

const normalizeChallengePieces = (task, targetCode, pieces) => {
  let normalizedPieces = Array.isArray(pieces) ? pieces.filter(Boolean) : [];

  if (normalizedPieces.length < 3 && String(task?.snippet || '').includes('____')) {
    const expandedCode = String(task.snippet).replace('____', targetCode);
    const expandedPieces = splitCodePieces(expandedCode);
    if (expandedPieces.length >= 3) normalizedPieces = expandedPieces;
  }

  if (normalizedPieces.length > 5) {
    const groupSize = Math.ceil(normalizedPieces.length / 5);
    normalizedPieces = Array.from(
      { length: Math.ceil(normalizedPieces.length / groupSize) },
      (_, index) => normalizedPieces.slice(index * groupSize, (index + 1) * groupSize).join(' '),
    );
  }

  return normalizedPieces;
};

const taskToChallenge = (task, index) => {
  const targetCode = getTaskTargetCode(task);
  const pieces = normalizeChallengePieces(task, targetCode, splitCodePieces(targetCode));
  const optionDecoys = (Array.isArray(task?.options) ? task.options : [])
    .map((option) => option.label)
    .filter((label) => normalize(label) !== normalize(targetCode));
  return {
    id: task?.id || `game-two-slice-${index}`,
    title: task?.title || `Code Challenge ${index + 1}`,
    prompt: task?.prompt || 'Slice the code pieces in order.',
    type: task?.type || 'complete',
    template: task?.snippet || targetCode,
    targetCode,
    pieces: pieces.length ? pieces : [targetCode],
    output: inferOutput(task, targetCode),
    decoys: [...optionDecoys, ...pieces.map(makeDecoy), ...FALLBACK_DECOYS].filter(Boolean),
  };
};

const buildChallenges = (levelData, target) => {
  const sourceTasks = Array.isArray(levelData?.tasks) && levelData.tasks.length
    ? levelData.tasks
    : [{
      id: 'fallback-print',
      title: 'Print Hello',
      prompt: 'Slice the Java pieces that build a console output statement.',
      snippet: '____',
      answer: 'System.out.println("Hello");',
      acceptedAnswers: ['System.out.println("Hello");'],
    }];
  const base = sourceTasks.map(taskToChallenge).filter((challenge) => challenge.pieces.length);
  return Array.from({ length: target }, (_, index) => ({
    ...base[index % base.length],
    id: `${base[index % base.length].id}-${index}`,
  }));
};

const buildScoreProfile = (levelData, config) => {
  const challenges = buildChallenges(levelData, config.target);
  let combo = 0;
  let noMistakeScore = 0;
  let requiredSlices = 0;
  challenges.forEach((challenge) => {
    challenge.pieces.forEach((_, index) => {
      combo = Math.min(3, combo + 1);
      noMistakeScore += 40 + combo * 10;
      requiredSlices += 1;
      if (index === challenge.pieces.length - 1) {
        noMistakeScore += 120 + combo * 15;
      }
    });
  });
  return {
    requiredSlices,
    noMistakeScore,
    averagePieces: challenges.length ? Math.round(requiredSlices / challenges.length) : 0,
  };
};

const removeDuplicateGuideItems = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item).trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const splitGuideItemsIntoTwoPages = (items, title) => {
  const dedupedItems = removeDuplicateGuideItems(items);
  const splitIndex = Math.max(1, Math.ceil(dedupedItems.length / 2));
  return {
    summary: dedupedItems.slice(0, splitIndex),
    sections: [{ title, items: dedupedItems.slice(splitIndex) }],
  };
};

const buildGuideContent = (levelData, config) => {
  const levelNumber = levelData?.levelNumber || 1;
  const scoreProfile = buildScoreProfile(levelData, config);
  const guidePages = splitGuideItemsIntoTwoPages([
    `Complete ${config.target} Java output${config.target === 1 ? '' : 's'} to clear Level ${levelNumber}.`,
    'Slice gold syntax cards in the exact order shown by Java Code.',
    'Avoid red decoy cards and bombs while protecting your 3 Lives.',
    'If you do not slice anything for 20 consecutive seconds, the game ends due to inactivity.',
    'Correct syntax slices earn 40 base points, multiplied by ×2 at Combo 3, ×3 at Combo 5, and ×5 at Combo 10.',
    'Each completed Java output adds a 120-point completion reward using the active Combo multiplier.',
    `Recorded base score: syntax slice rewards + (${config.target} completed outputs × completion reward) − decoy/bomb penalties.`,
    `With no decoy or bomb mistakes, the estimated Level ${levelNumber} base score is ${scoreProfile.noMistakeScore} points across about ${scoreProfile.requiredSlices} required syntax slices.`,
    `Clear ${config.target} / ${config.target} Outputs to pass this level.`,
    'Passing the level unlocks the next available Game 2 level.',
  ], `Level ${levelNumber} Guide`);

  return {
    kicker: `Game 2 · Level ${levelNumber}`,
    title: 'Code Ninja Guide',
    lead: 'Read the output target, hazards, score, Stars, and level-only requirements before you begin.',
    summary: guidePages.summary,
    sections: guidePages.sections,
  };
};

const makeOutcome = ({ outcome, score, outputs, target, mistakes, levelNumber }) => ({
  outcome,
  points: score,
  completedTasks: outputs,
  totalTasks: target,
  mistakes,
  hintsUsed: 0,
  starsEarned: outcome === 'COMPLETED' ? 3 : 0,
  levelNumber,
});

const GameCanvasGameTwo = ({
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
  showLevelGuideline = false,
  gameTutorialRequested = 0,
  autoFirstHandGuide = false,
}) => {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const animationRef = useRef(0);
  const stateRef = useRef(null);
  const pointerRef = useRef(null);
  const submittedRef = useRef(false);
  const backgroundRef = useRef(null);
  const levelNumber = clamp(Math.round(Number(levelData?.levelNumber) || 1), 1, 5);
  const shouldAutoOpenFirstHandGuide = Boolean(autoFirstHandGuide && levelNumber === 1);
  const config = useMemo(() => getLevelConfig(levelNumber), [levelNumber]);
  const challenges = useMemo(() => buildChallenges(levelData, config.target), [config.target, levelData]);
  const guideContent = useMemo(() => buildGuideContent(levelData, config), [config, levelData]);
  const initialShowTutorial = Boolean(showLevelGuideline) || levelNumber > 1;
  const [showTutorial, setShowTutorial] = useState(initialShowTutorial);
  const [tutorialView, setTutorialView] = useState(showLevelGuideline ? 'guide' : 'announcement');
  const [tutorialLaunchedFromIntro, setTutorialLaunchedFromIntro] = useState(false);
  const [guideOpenedDuringGameplay, setGuideOpenedDuringGameplay] = useState(false);
  const showGuide = showTutorial && tutorialView === 'guide';
  const showFirstHandGuide = showTutorial && tutorialView === 'tutorial';
  const showAnnouncement = showTutorial && tutorialView === 'announcement';
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [outputs, setOutputs] = useState(0);
  const [challengeTitle, setChallengeTitle] = useState(challenges[0]?.title || 'Code Challenge');
  const [codePreview, setCodePreview] = useState('');
  const [outputText, setOutputText] = useState(challenges[0]?.output || '');
  const [flash, setFlash] = useState(null);
  const [sliceFeedback, setSliceFeedback] = useState(null);
  const [localResult, setLocalResult] = useState(null);
  const javaCodePreview = useMemo(() => {
    const match = String(codePreview || '').match(/^CORRECT CODE:\n([\s\S]*?)\n\nSLICED CODE:\n([\s\S]*)$/);
    if (!match) {
      return {
        correct: codePreview,
        sliced: '',
      };
    }
    return {
      correct: match[1],
      sliced: match[2],
    };
  }, [codePreview]);
  const announcementTargetCodes = useMemo(() => {
    const nextChallenge = challenges[Math.min(outputs, challenges.length - 1)] || challenges[0];
    const targetCode = nextChallenge
      ? formatCodePieces(nextChallenge.pieces || [], nextChallenge.type)
      : '';
    return targetCode ? [targetCode] : [];
  }, [challenges, outputs]);
  const swordSliceSoundRef = useRef(null);
  const syntaxSliceSoundRef = useRef(null);
  const bombErrorSoundRef = useRef(null);
  const comboSoundRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const backgroundMusicBlockedRef = useRef(false);

  const playSound = useCallback((soundRef, soundSrc) => {
    if (typeof window === 'undefined' || typeof window.Audio === 'undefined' || !getStudentSfxPreference()) {
      return;
    }

    try {
      if (!soundRef.current) {
        soundRef.current = new Audio(soundSrc);
        soundRef.current.preload = 'auto';
        soundRef.current.volume = getStudentSfxVolume(0.78);
      } else {
        soundRef.current.currentTime = 0;
      }

      soundRef.current.play().catch(() => {});
    } catch (error) {
      // Ignore sound playback errors.
    }
  }, []);

  const triggerSliceFeedback = useCallback((type, title, detail) => {
    const id = `${type}-${Date.now()}-${Math.random()}`;
    setSliceFeedback({ id, type, title, detail });
    window.setTimeout(() => {
      setSliceFeedback((current) => (current?.id === id ? null : current));
    }, 900);
  }, []);

  const beginIntroSequence = useCallback(() => {
    setTutorialView('announcement');
    setShowTutorial(true);
    const state = stateRef.current;
    if (state) {
      state.running = false;
      state.last = performance.now();
      state.lastSliceAt = performance.now();
    }
  }, []);

  useEffect(() => () => {
    [
      swordSliceSoundRef,
      syntaxSliceSoundRef,
      bombErrorSoundRef,
      comboSoundRef,
    ].forEach((soundRef) => {
      if (soundRef.current) {
        soundRef.current.pause();
        soundRef.current.currentTime = 0;
        soundRef.current = null;
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.Audio === 'undefined' || !getStudentMusicPreference()) {
      return undefined;
    }

    const backgroundMusic = new Audio(BACKGROUND_MUSIC_SRC);
    backgroundMusic.loop = true;
    backgroundMusic.preload = 'auto';
    backgroundMusic.volume = getStudentMusicVolume(0.22);
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

    return () => {
      window.removeEventListener('pointerdown', resumeBackgroundMusic);
      window.removeEventListener('keydown', resumeBackgroundMusic);
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
      backgroundMusicBlockedRef.current = false;
      if (backgroundMusicRef.current === backgroundMusic) {
        backgroundMusicRef.current = null;
      }
    };
  }, []);

  const syncHud = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    const challenge = challenges[state.challengeIndex] || challenges[0];
    setScore(state.score);
    setCombo(state.combo);
    setLives(state.lives);
    setOutputs(state.outputs);
    setChallengeTitle(challenge?.title || 'Code Challenge');
    setCodePreview(challenge ? renderCodePreview(challenge, state.pieceIndex) : '');
    setOutputText(challenge?.output || '');
  }, [challenges]);

  const resetRun = useCallback(() => {
    submittedRef.current = false;
    const firstChallenge = challenges[0];
    stateRef.current = {
      width: 1280,
      height: 720,
      items: [],
      particles: [],
      trails: [],
      sliceBursts: [],
      score: 0,
      combo: 0,
      lives: 3,
      outputs: 0,
      mistakes: 0,
      challengeIndex: 0,
      pieceIndex: 0,
      outputText: firstChallenge?.output || '',
      last: performance.now(),
      lastSliceAt: performance.now(),
      spawnClock: config.spawnRate * 0.65,
      lastSpawnKind: null,
      correctGapRemaining: 0,
      hazardsSinceCorrect: 0,
      running: false,
      finished: false,
    };
    setScore(0);
    setCombo(0);
    setLives(3);
    setOutputs(0);
    setChallengeTitle(firstChallenge?.title || 'Code Challenge');
    setCodePreview(firstChallenge ? renderCodePreview(firstChallenge, 0) : '');
    setOutputText(firstChallenge?.output || '');
    setFlash(null);
    setLocalResult(null);
  }, [challenges, config.spawnRate]);

  useEffect(() => {
    resetRun();
  }, [resetRun]);

  useEffect(() => {
    const image = new Image();
    image.src = industrialFrameBackground;
    backgroundRef.current = image;
  }, []);

  useEffect(() => {
    setShowTutorial(Boolean(showLevelGuideline) || levelNumber > 1);
    setTutorialView(showLevelGuideline ? 'guide' : 'announcement');
    setTutorialLaunchedFromIntro(false);
    setGuideOpenedDuringGameplay(false);
  }, [levelNumber, shouldAutoOpenFirstHandGuide, showLevelGuideline]);

  useEffect(() => {
    if (Number(gameTutorialRequested) > 0) {
      setTutorialLaunchedFromIntro(false);
      setTutorialView('tutorial');
      setShowTutorial(true);
    }
  }, [gameTutorialRequested]);

  const finishRun = useCallback((outcome) => {
    const state = stateRef.current;
    if (!state || submittedRef.current) return;
    submittedRef.current = true;
    state.running = false;
    state.finished = true;
    const payload = makeOutcome({
      outcome,
      score: state.score,
      outputs: state.outputs,
      target: config.target,
      mistakes: state.mistakes,
      levelNumber,
    });
    setLocalResult(outcome);
    if (outcome === 'COMPLETED') onLevelComplete?.(payload);
    else onLevelFail?.(payload);
  }, [config.target, levelNumber, onLevelComplete, onLevelFail]);

  const sizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const host = appRef.current;
    const state = stateRef.current;
    if (!canvas || !host || !state) return;
    const rect = host.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(640, Math.round(rect.width));
    const height = Math.max(460, Math.round(rect.height));
    const isMobileLandscape = rect.width <= 960 && rect.height <= 560;
    const mobileUiScale = isMobileLandscape
      ? clamp(Math.min(rect.width / 1020, rect.height / 620), 0.46, 0.64)
      : 1;
    const backingWidth = Math.round(width * dpr);
    const backingHeight = Math.round(height * dpr);
    if (canvas.width !== backingWidth) canvas.width = backingWidth;
    if (canvas.height !== backingHeight) canvas.height = backingHeight;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    state.width = width;
    state.height = height;
    state.mobileUiScale = mobileUiScale;
    state.mobileSafeTop = isMobileLandscape ? Math.max(92, height * 0.2) : 0;
    state.mobileSafeBottom = isMobileLandscape ? height - Math.max(44, height * 0.09) : height;
  }, []);

  const currentChallenge = () => {
    const state = stateRef.current;
    return state ? challenges[state.challengeIndex] || challenges[0] : challenges[0];
  };

  const createItem = useCallback((kind) => {
    const canvas = canvasRef.current;
    const state = stateRef.current;
    const challenge = currentChallenge();
    if (!canvas || !state || !challenge) return;
    const ctx = canvas.getContext('2d');
    let text = 'BUG';
    if (kind === 'correct') text = challenge.pieces[state.pieceIndex] || challenge.pieces[0];
    if (kind === 'wrong') text = pick(challenge.decoys.length ? challenge.decoys : FALLBACK_DECOYS);
    const mobileUiScale = state.mobileUiScale || 1;
    const validTargetValues = new Set(
      challenges.flatMap((entry) => [entry.targetCode, ...(entry.pieces || [])]).filter(Boolean),
    );
    const isValidDuplicate = kind === 'wrong' && validTargetValues.has(text);
    let width = 118 * mobileUiScale;
    let height = 138 * mobileUiScale;
    if (kind !== 'bomb') {
      ctx.save();
      ctx.font = `800 ${24 * mobileUiScale}px "Space Mono", "Courier New", monospace`;
      width = Math.max(190 * mobileUiScale, Math.min(410 * mobileUiScale, (108 * mobileUiScale) + ctx.measureText(text).width));
      height = 108 * mobileUiScale;
      ctx.restore();
    }
    const isWide = state.width >= 820;
    const playLeft = isWide ? Math.max(360, state.width * 0.28) : state.width * 0.22;
    const playRight = isWide ? Math.min(state.width - 360, state.width * 0.72) : state.width * 0.78;
    const x = rand(playLeft, Math.max(playLeft + 1, playRight));
    const launchDirection = x < state.width / 2 ? 1 : -1;
    const safeTop = state.mobileSafeTop || 0;
    const safeBottom = state.mobileSafeBottom || state.height;
    const spawnY = mobileUiScale < 1 ? safeBottom + height * 0.62 + rand(8, 28) : state.height + height + rand(22, 86);
    const gravity = 330 + config.speed;
    const mobileLaunchVelocity = -Math.sqrt(Math.max(1, 2 * gravity * Math.max(140, spawnY - safeTop - rand(18, 54))));
    state.items.push({
      id: `${Date.now()}-${Math.random()}`,
      kind,
      text,
      isValidDuplicate,
      x: clamp(x, width / 2 + 20, state.width - width / 2 - 20),
      y: spawnY,
      width,
      height,
      renderScale: mobileUiScale,
      vx: launchDirection * rand(22, 82),
      vy: mobileUiScale < 1 ? mobileLaunchVelocity : -(560 + config.speed * 1.45 + rand(-30, 70)),
      gravity,
      drift: rand(-10, 10),
      phase: rand(0, Math.PI * 2),
      spin: rand(-0.08, 0.08),
      dead: false,
    });
  }, [challenges, config.speed]);

  const spawnWave = useCallback(() => {
    const state = stateRef.current;
    if (!state || state.items.length >= config.maxObjects) return;
    const hasNeededPiece = state.items.some((item) => item.kind === 'correct' && !item.dead);
    const spawnHazard = () => {
      const hazardTotal = config.bombChance + config.decoyChance;
      const bombRoll = hazardTotal > 0 ? config.bombChance / hazardTotal : 0.35;
      const kind = Math.random() < bombRoll ? 'bomb' : 'wrong';
      createItem(kind);
      state.lastSpawnKind = kind;
      state.correctGapRemaining = Math.max(0, (state.correctGapRemaining || 0) - 1);
      state.hazardsSinceCorrect = (state.hazardsSinceCorrect || 0) + 1;
    };
    const canSpawnCorrect = !hasNeededPiece && state.lastSpawnKind !== 'correct' && (state.correctGapRemaining || 0) <= 0;
    if (canSpawnCorrect && (Math.random() < config.correctChance || (state.hazardsSinceCorrect || 0) >= 3)) {
      createItem('correct');
      state.lastSpawnKind = 'correct';
      state.correctGapRemaining = config.correctGap;
      state.hazardsSinceCorrect = 0;
    } else {
      spawnHazard();
    }
    if (levelNumber >= 4 && Math.random() < 0.24 && state.items.length < config.maxObjects) {
      const extraKind = Math.random() < 0.65 ? 'wrong' : 'bomb';
      createItem(extraKind);
      state.lastSpawnKind = extraKind;
      state.correctGapRemaining = Math.max(0, (state.correctGapRemaining || 0) - 1);
      state.hazardsSinceCorrect = (state.hazardsSinceCorrect || 0) + 1;
    }
  }, [config.bombChance, config.correctChance, config.correctGap, config.decoyChance, config.maxObjects, createItem, levelNumber]);

  const burst = (ctx, x, y, color, count = 18) => {
    const state = stateRef.current;
    if (!state) return;
    for (let i = 0; i < count; i += 1) {
      state.particles.push({ x, y, vx: rand(-190, 190), vy: rand(-230, 80), life: rand(0.35, 0.8), color });
    }
  };

  const addCorrectSliceEffect = (item, a, b) => {
    const state = stateRef.current;
    if (!state) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const slashLength = clamp(length, 70, 150);
    state.sliceBursts.push({
      id: `${Date.now()}-${Math.random()}`,
      x: item.x,
      y: item.y,
      a: {
        x: item.x - ux * slashLength * 0.5,
        y: item.y - uy * slashLength * 0.5,
      },
      b: {
        x: item.x + ux * slashLength * 0.5,
        y: item.y + uy * slashLength * 0.5,
      },
      life: 0.48,
      maxLife: 0.48,
    });
  };

  const completeChallenge = useCallback((ctx, state, challenge) => {
    state.outputs += 1;
    state.pieceIndex = 0;
    state.challengeIndex = Math.min(challenges.length - 1, state.challengeIndex + 1);
    state.outputText = (challenges[state.challengeIndex] || challenge)?.output || '';
    state.items = state.items.filter((item) => item.kind === 'bomb');
    burst(ctx, state.width / 2, state.height * 0.42, '#ffd15d', 34);
    setFlash({ title: 'OUTPUT DONE', tone: 'good' });
    window.setTimeout(() => setFlash(null), 820);
    if (state.outputs >= config.target) {
      finishRun('COMPLETED');
      return;
    }

    state.running = false;
    state.last = performance.now();
    state.lastSliceAt = performance.now();
    setTutorialView('announcement');
    setShowTutorial(true);
  }, [challenges, config.target, finishRun]);

  const cutItem = useCallback((item, sliceStart, sliceEnd) => {
    const canvas = canvasRef.current;
    const state = stateRef.current;
    const challenge = currentChallenge();
    if (!canvas || !state || !challenge || item.dead || state.finished) return;
    const ctx = canvas.getContext('2d');
    item.dead = true;
    state.lastSliceAt = performance.now();
    playSound(swordSliceSoundRef, SWORD_SLICE_SOUND_SRC);
    if (item.kind === 'correct' && item.text === challenge.pieces[state.pieceIndex]) {
      state.combo += 1;
      const comboMultiplier = getComboMultiplier(state.combo);
      const reachedComboMilestone = COMBO_MILESTONES.includes(state.combo);
      if (reachedComboMilestone && state.lives < 3) {
        state.lives = Math.min(3, state.lives + 1);
      }
      playSound(syntaxSliceSoundRef, SYNTAX_SLICE_SOUND_SRC);
      state.pieceIndex += 1;
      state.score += 40 * comboMultiplier;
      burst(ctx, item.x, item.y, '#ffd15d', 18);
      addCorrectSliceEffect(item, sliceStart || { x: item.x - 52, y: item.y + 36 }, sliceEnd || { x: item.x + 52, y: item.y - 36 });
      if (reachedComboMilestone) {
        playSound(comboSoundRef, COMBO_SOUND_SRC);
        triggerSliceFeedback('combo', `${state.combo} Combo`, `Score multiplier ×${comboMultiplier}`);
      }
      if (state.pieceIndex >= challenge.pieces.length) {
        state.score += 120 * comboMultiplier;
        completeChallenge(ctx, state, challenge);
      }
      syncHud();
      return;
    }
    state.combo = 0;
    state.lives -= 1;
    state.mistakes += 1;
    state.score = Math.max(0, state.score - (item.kind === 'bomb' ? 100 : 70));
    burst(ctx, item.x, item.y, '#ff334f', item.kind === 'bomb' ? 36 : 22);
    if (item.kind === 'bomb' || item.kind === 'wrong') {
      playSound(bombErrorSoundRef, BOMB_ERROR_SOUND_SRC);
      triggerSliceFeedback('bomb', item.kind === 'bomb' ? 'Life Lost' : 'Wrong Syntax', `${Math.max(0, state.lives)} / 3 Lives`);
      if (typeof window !== 'undefined' && typeof window.navigator?.vibrate === 'function') {
        window.navigator.vibrate(item.kind === 'bomb' ? [80, 40, 80] : 120);
      }
      appRef.current?.classList.remove('game-two-fruit-shake');
      void appRef.current?.offsetWidth;
      appRef.current?.classList.add('game-two-fruit-shake');
    }
    setFlash({ title: item.kind === 'bomb' ? 'BOMB HIT' : 'DECOY HIT', tone: 'bad' });
    window.setTimeout(() => setFlash(null), 700);
    syncHud();
    if (state.lives <= 0) finishRun('FAILED');
  }, [completeChallenge, finishRun, playSound, syncHud, triggerSliceFeedback]);

  const hit = (item, a, b) => {
    const radius = item.kind === 'bomb' ? 58 : Math.max(item.width * 0.45, item.height * 0.55);
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const wx = item.x - a.x;
    const wy = item.y - a.y;
    const len = vx * vx + vy * vy || 1;
    const t = clamp((wx * vx + wy * vy) / len, 0, 1);
    const px = a.x + vx * t;
    const py = a.y + vy * t;
    const dx = item.x - px;
    const dy = item.y - py;
    return dx * dx + dy * dy <= radius * radius;
  };

  const pointFromEvent = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const drawSyntaxCard = (ctx, item, textColor) => {
    const ww = item.width;
    const hh = item.height;
    const l = -ww / 2;
    const t = -hh / 2;
    const r = ww / 2;
    const b = hh / 2;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(Math.sin(performance.now() / 720 + item.phase) * 0.06 + item.spin);
    ctx.shadowColor = textColor;
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(255,185,30,.06)';
    ctx.beginPath();
    ctx.roundRect(l + 4, t + 4, ww - 8, hh - 8, 12);
    ctx.fill();
    ctx.shadowBlur = 0;
    const shell = ctx.createLinearGradient(0, t, 0, b);
    shell.addColorStop(0, '#c6bda9');
    shell.addColorStop(0.12, '#5e5b55');
    shell.addColorStop(0.5, '#272622');
    shell.addColorStop(0.88, '#696257');
    shell.addColorStop(1, '#171614');
    ctx.fillStyle = shell;
    ctx.strokeStyle = '#090807';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(l, t, ww, hh, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#171512';
    ctx.beginPath();
    ctx.roundRect(l + 14, t + 13, ww - 28, hh - 26, 7);
    ctx.fill();
    const inset = ctx.createLinearGradient(0, t + 13, 0, b - 13);
    inset.addColorStop(0, 'rgba(255,206,107,.08)');
    inset.addColorStop(0.5, 'rgba(0,0,0,.18)');
    inset.addColorStop(1, 'rgba(255,206,107,.04)');
    ctx.fillStyle = inset;
    ctx.fill();
    ctx.strokeStyle = '#4a4034';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#3f3c36';
    [[l + 6, t + 6], [r - 34, t + 6], [l + 6, b - 26], [r - 34, b - 26]].forEach((p) => {
      ctx.beginPath();
      ctx.roundRect(p[0], p[1], 28, 20, 5);
      ctx.fill();
      ctx.strokeStyle = '#1a1815';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#141311';
      ctx.beginPath();
      ctx.arc(p[0] + 10, p[1] + 10, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8c8373';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#3f3c36';
    });
    ctx.strokeStyle = 'rgba(238,139,43,.6)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i += 1) {
      const sx = l + 36 + i * ((ww - 72) / 5);
      const sy = t + 17 + (i % 3) * 15;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 12, sy - 4);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(r - 48, t + 13);
    ctx.strokeStyle = '#70695d';
    ctx.fillStyle = '#2a2926';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 12; i += 1) {
      const a = i * Math.PI / 6;
      const rad = i % 2 ? 14 : 18;
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.shadowColor = textColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = textColor;
    ctx.font = `800 ${24 * (item.renderScale || 1)}px "Space Mono", "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.text, 0, 2, ww - 58);
    ctx.restore();
  };

  const drawBomb = (ctx, item) => {
    ctx.save();
    const scale = item.renderScale || 1;
    ctx.translate(item.x, item.y + (14 * scale));
    ctx.scale(scale, scale);
    ctx.rotate(Math.sin(performance.now() / 720 + item.phase) * 0.045 + item.spin);
    ctx.shadowColor = '#ff526b';
    ctx.shadowBlur = 22;
    const body = ctx.createRadialGradient(-18, -23, 4, 0, 7, 56);
    body.addColorStop(0, '#ff554d');
    body.addColorStop(0.32, '#e92027');
    body.addColorStop(0.72, '#ae0814');
    body.addColorStop(1, '#67030b');
    ctx.fillStyle = body;
    ctx.strokeStyle = '#4c050b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 7, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.24)';
    ctx.beginPath();
    ctx.ellipse(-20, -13, 13, 7, -0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(74,0,7,.75)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 7, 42, 0.15, 1.2);
    ctx.stroke();
    ctx.fillStyle = '#41464a';
    ctx.beginPath();
    ctx.ellipse(0, -39, 23, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1f252a';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#676d70';
    ctx.beginPath();
    ctx.ellipse(0, -43, 13, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#25292b';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -47);
    ctx.quadraticCurveTo(10, -65, 23, -71);
    ctx.stroke();
    ctx.strokeStyle = '#eafaff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(2, -50);
    ctx.quadraticCurveTo(11, -64, 20, -68);
    ctx.stroke();
    ctx.shadowColor = '#ff6a25';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#f52a16';
    ctx.beginPath();
    ctx.moveTo(21, -72);
    ctx.bezierCurveTo(28, -96, 46, -100, 54, -94);
    ctx.bezierCurveTo(49, -85, 58, -85, 60, -77);
    ctx.bezierCurveTo(47, -70, 39, -69, 30, -62);
    ctx.bezierCurveTo(31, -71, 25, -67, 21, -72);
    ctx.fill();
    ctx.fillStyle = '#ffd15d';
    ctx.beginPath();
    ctx.moveTo(28, -76);
    ctx.bezierCurveTo(31, -88, 42, -91, 47, -88);
    ctx.bezierCurveTo(43, -82, 49, -80, 47, -76);
    ctx.bezierCurveTo(38, -73, 35, -69, 30, -68);
    ctx.fill();
    ctx.restore();
  };

  const drawFrame = useCallback((now) => {
    sizeCanvas();
    const canvas = canvasRef.current;
    const state = stateRef.current;
    if (!canvas || !state) return;
    const ctx = canvas.getContext('2d');
    const dt = Math.min(0.04, (now - state.last) / 1000 || 0);
    state.last = now;
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, state.width, state.height);
    const background = backgroundRef.current;
    if (background?.complete && background.naturalWidth > 0) {
      drawCoverImage(ctx, background, state.width, state.height);
    }
    if (state.running && !state.finished) {
      if (now - state.lastSliceAt >= AFK_TIMEOUT_MS) {
        setFlash({ title: 'AFK', tone: 'bad' });
        finishRun('FAILED');
        return;
      }
      state.spawnClock += dt * 1000;
      if (state.spawnClock >= config.spawnRate) {
        state.spawnClock = 0;
        spawnWave();
      }
      state.items.forEach((item) => {
        item.vy += item.gravity * dt;
        item.y += item.vy * dt;
        item.x += (item.vx || 0) * dt + Math.sin(now / 700 + item.phase) * item.drift * dt;
        if (
          (item.vy > 0 && item.y - item.height / 2 > (state.mobileSafeBottom || state.height) + 18)
          || item.x + item.width < -90
          || item.x - item.width > state.width + 90
        ) {
          item.dead = true;
        }
        if (!item.dead) {
          if (item.kind === 'bomb') drawBomb(ctx, item);
          else drawSyntaxCard(
            ctx,
            item,
            item.kind === 'correct' || item.isValidDuplicate ? '#74ff8a' : '#ff334f',
          );
        }
      });
      state.items = state.items.filter((item) => !item.dead);
    }
    state.particles.forEach((particle) => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 350 * dt;
      particle.life -= dt;
      ctx.globalAlpha = Math.max(0, particle.life * 1.5);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - 3, particle.y - 3, 6, 6);
    });
    state.particles = state.particles.filter((particle) => particle.life > 0);
    state.sliceBursts.forEach((effect) => {
      effect.life -= dt;
      const progress = 1 - Math.max(0, effect.life / effect.maxLife);
      const alpha = Math.max(0, effect.life / effect.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ffd15d';
      ctx.shadowBlur = 16 * alpha;
      ctx.strokeStyle = '#ffd15d';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(effect.a.x, effect.a.y);
      ctx.lineTo(effect.b.x, effect.b.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff3b0';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '900 22px "Space Mono", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd15d';
      ctx.shadowColor = '#ff9f27';
      ctx.shadowBlur = 10;
      ctx.fillText('+1', effect.x + 26, effect.y - 38 - progress * 16);
      ctx.restore();
    });
    state.sliceBursts = state.sliceBursts.filter((effect) => effect.life > 0);
    state.trails.forEach((trail) => {
      trail.life -= dt;
      ctx.globalAlpha = trail.life / 0.18;
      ctx.strokeStyle = '#bcff74';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(trail.a.x, trail.a.y);
      ctx.lineTo(trail.b.x, trail.b.y);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
    });
    state.trails = state.trails.filter((trail) => trail.life > 0);
    ctx.globalAlpha = 1;
    animationRef.current = requestAnimationFrame(drawFrame);
  }, [config.spawnRate, finishRun, sizeCanvas, spawnWave]);

  useEffect(() => {
    const state = stateRef.current;
    if (state) state.running = !showTutorial && !localResult && !resultData;
  }, [localResult, resultData, showTutorial]);

  useEffect(() => {
    sizeCanvas();
    const host = appRef.current;
    const resizeObserver = typeof ResizeObserver !== 'undefined' && host
      ? new ResizeObserver(() => sizeCanvas())
      : null;
    resizeObserver?.observe(host);
    window.addEventListener('resize', sizeCanvas);
    animationRef.current = requestAnimationFrame(drawFrame);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', sizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [drawFrame, sizeCanvas]);

  const handlePointerDown = (event) => {
    pointerRef.current = pointFromEvent(event);
    canvasRef.current?.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const state = stateRef.current;
    if (!state || !pointerRef.current || !state.running || state.finished) return;
    const nextPoint = pointFromEvent(event);
    state.lastSliceAt = performance.now();
    state.trails.push({ a: pointerRef.current, b: nextPoint, life: 0.18 });
    state.items.forEach((item) => {
      if (hit(item, pointerRef.current, nextPoint)) cutItem(item, pointerRef.current, nextPoint);
    });
    pointerRef.current = nextPoint;
  };

  const handlePointerUp = () => {
    pointerRef.current = null;
  };

  const handleLocalRetry = () => {
    onRetry?.();
    resetRun();
  };

  const openGameplayGuidelines = () => {
    setGuideOpenedDuringGameplay(true);
    setTutorialLaunchedFromIntro(false);
    setTutorialView('guide');
    setShowTutorial(true);
    const state = stateRef.current;
    if (state) {
      state.running = false;
      state.last = performance.now();
      state.lastSliceAt = performance.now();
    }
  };

  const closeGameplayGuidelines = () => {
    setGuideOpenedDuringGameplay(false);
    setTutorialView(null);
    setShowTutorial(false);
    const state = stateRef.current;
    if (state) {
      state.last = performance.now();
      state.lastSliceAt = performance.now();
    }
  };

  return (
    <div ref={appRef} className="game-two-fruit-shell">
      <canvas
        ref={canvasRef}
        className="game-two-fruit-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label="Fruit Ninja programming syntax gameplay area"
      />

      <div className="game-two-fruit-code-rain" aria-hidden="true">
        <span>{'public static void main'}</span>
        <span>{'System.out.println();'}</span>
        <span>{'if () { return; }'}</span>
        <span>{'class JavaSlice'}</span>
      </div>

      <div className="game-two-fruit-score">
        <span>Player Score</span>
        <strong>{score}</strong>
      </div>

      <div className="game-two-fruit-lives">
        <span>Lives</span>
        <strong>{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, 3 - lives))}</strong>
      </div>

      <div className="game-two-fruit-mission">
        <strong>Level {levelNumber}</strong>
      </div>

      <div className="game-two-fruit-actions" aria-label="Game 2 controls">
        <button
          type="button"
          className="game-two-fruit-action-button game-two-fruit-tutorial-button"
          onClick={() => {
            setTutorialView('tutorial');
            setShowTutorial(true);
          }}
        >
          Game Tutorial
        </button>
        <button
          type="button"
          className="game-two-fruit-action-button game-two-fruit-tutorial-button"
          onClick={openGameplayGuidelines}
        >
          Guidelines
        </button>
        <button
          type="button"
          className="game-two-fruit-action-button game-two-fruit-back-button"
          onClick={onExitRequest}
        >
          Back
        </button>
      </div>

      <aside className="game-two-fruit-left">
        <section className="game-two-fruit-card game-two-fruit-combo">
          <span>Combo</span>
          <strong>{combo}x</strong>
        </section>
        <section className="game-two-fruit-card game-two-fruit-code">
          <span>Java Code</span>
          <div className="game-two-fruit-code-preview">
            <strong>Correct Code:</strong>
            <code>{javaCodePreview.correct}</code>
            <strong>Sliced Code:</strong>
            <code>{javaCodePreview.sliced || '____'}</code>
          </div>
        </section>
      </aside>

      <aside className="game-two-fruit-right">
        <section className="game-two-fruit-card game-two-fruit-output">
          <span>Output</span>
          <code>{outputText}</code>
          <strong>{outputs} / {config.target}</strong>
        </section>
      </aside>

      {flash && (
        <div className={`game-two-fruit-flash game-two-fruit-flash-${flash.tone}`}>
          {flash.title}
        </div>
      )}

      {sliceFeedback && (
        <div
          key={sliceFeedback.id}
          className={`game-two-slice-feedback game-two-slice-feedback-${sliceFeedback.type}`}
          aria-hidden="true"
        >
          <strong>{sliceFeedback.title}</strong>
          {sliceFeedback.detail && <span>{sliceFeedback.detail}</span>}
        </div>
      )}

      {showGuide && (
        <GameGuideOverlay
          kicker={guideContent.kicker}
          title={guideContent.title}
          lead={guideContent.lead}
          summary={guideContent.summary}
          sections={guideContent.sections}
          onExit={guideOpenedDuringGameplay ? closeGameplayGuidelines : onExitRequest}
          onStart={() => {
            if (guideOpenedDuringGameplay) {
              closeGameplayGuidelines();
              return;
            }
            if (shouldAutoOpenFirstHandGuide) {
              setTutorialLaunchedFromIntro(true);
              setTutorialView('tutorial');
              return;
            }
            beginIntroSequence();
          }}
          startLabel={guideOpenedDuringGameplay ? 'Continue' : 'Next'}
          lockLandscapeOnStart
        />
      )}

      {showFirstHandGuide && (
        <GameTutorialOverlay
          gameType="GAME_TWO"
          levelNumber={levelNumber}
          onExit={onExitRequest}
          onStart={() => {
            if (tutorialLaunchedFromIntro) {
              setTutorialLaunchedFromIntro(false);
              beginIntroSequence();
              return;
            }
            setTutorialView(null);
            setShowTutorial(false);
            const state = stateRef.current;
            if (state) {
              state.running = true;
              state.last = performance.now();
              state.lastSliceAt = performance.now();
            }
          }}
          startLabel="Next"
        />
      )}

      {showAnnouncement && (
        <GameTwoAnnouncementBoard
          levelNumber={levelNumber}
          targetCodes={announcementTargetCodes}
          onStart={() => {
            setTutorialView(null);
            setShowTutorial(false);
            const state = stateRef.current;
            if (state) {
              state.running = true;
              state.last = performance.now();
              state.lastSliceAt = performance.now();
            }
          }}
        />
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
                <span>{resultData?.result === 'COMPLETED' ? 'Level Cleared' : 'Game Over'}</span>
              </div>
              <div className="game-two-result-stats">
                <span>Output: <strong>{outputs}</strong> / {config.target}</span>
                <span>Final score: <strong>{Number(resultData?.finalScore ?? score)}</strong></span>
                <span>Lives: <strong>{lives}</strong> / 3</span>
                <span>Stars earned: <strong>{resultData?.starsEarned ?? (localResult === 'COMPLETED' ? 3 : 0)}</strong></span>
              </div>
              <div className="game-two-result-actions">
                <button type="button" className="btn btn-secondary" onClick={handleLocalRetry}>
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

export default GameCanvasGameTwo;
