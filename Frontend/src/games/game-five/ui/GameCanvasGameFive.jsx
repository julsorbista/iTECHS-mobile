import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Coins,
  Heart,
  Loader2,
  LogOut,
  RotateCcw,
  Bot,
  Star,
} from 'lucide-react';
import gameFiveMusic from '../../../assets/game-arcade/audio/game5.mp3';
import sharedSfx from '../../../assets/game-arcade/audio/soundeffects.mp3';
import combo3Sound from '../../../assets/game-arcade/audio/combo_3_x2.mp3';
import combo5Sound from '../../../assets/game-arcade/audio/combo_5_x3.mp3';
import combo10Sound from '../../../assets/game-arcade/audio/combo_10_x5.mp3';
import {
  getStudentMusicPreference,
  getStudentSfxPreference,
} from '../../../utils/studentMenuAudio';
import GameGuideOverlay from '../../shared/ui/GameGuideOverlay';
import GameTutorialOverlay from '../../shared/ui/GameTutorialOverlay';
import PlayableTutorialCoach from '../../shared/ui/PlayableTutorialCoach';
import { buildGameFiveGuideContent } from '../../shared/ui/levelGuideBuilders';
import { levelAPI } from '../../../utils/api';
import { addUserCoins } from '../../shared/gameSessionPersistence';

const getLegacyGameFiveTitlePattern = () => {
  const encodedLegacyObjectName = 'c25vd21hbg==';
  const legacyObjectName = typeof globalThis.atob === 'function'
    ? globalThis.atob(encodedLegacyObjectName)
    : ['s', 'n', 'o', 'w', 'm', 'a', 'n'].join('');
  return new RegExp(['code', legacyObjectName].join('\\s+'), 'gi');
};
const LEGACY_GAME_FIVE_TITLE_PATTERN = getLegacyGameFiveTitlePattern();

const WORDS_BY_LEVEL = Object.freeze({
  1: [
    { word: 'VARIABLE', clue: 'A named container that stores a value while a program runs.' },
    { word: 'STRING', clue: 'A data type used for text such as names and messages.' },
    { word: 'BOOLEAN', clue: 'A data type that can only be true or false.' },
    { word: 'LOOP', clue: 'A structure that repeats instructions.' },
    { word: 'ARRAY', clue: 'A collection of values stored by index.' },
  ],
  2: [
    { word: 'CONDITION', clue: 'A decision test that controls what code runs next.' },
    { word: 'INTEGER', clue: 'A whole number data type.' },
    { word: 'OPERATOR', clue: 'A symbol used for math, assignment, or comparison.' },
    { word: 'INPUT', clue: 'Data given to a program by a user or another system.' },
    { word: 'OUTPUT', clue: 'The result shown or produced by a program.' },
    { word: 'DEBUG', clue: 'To find and fix errors in code.' },
  ],
  3: [
    { word: 'FUNCTION', clue: 'A reusable block of code that performs a task.' },
    { word: 'PARAMETER', clue: 'A value a function receives when it runs.' },
    { word: 'RETURN', clue: 'A keyword that sends a result back from a function.' },
    { word: 'INDEX', clue: 'The position number of an item inside an array.' },
    { word: 'SYNTAX', clue: 'The rules for writing code correctly.' },
    { word: 'COMPILE', clue: 'To translate source code so the computer can run it.' },
    { word: 'OBJECT', clue: 'A structure that groups data and behavior together.' },
  ],
  4: [
    { word: 'CLASS', clue: 'A blueprint used to create objects.' },
    { word: 'METHOD', clue: 'A function that belongs to an object or class.' },
    { word: 'INSTANCE', clue: 'An object created from a class.' },
    { word: 'PROPERTY', clue: 'A value stored inside an object.' },
    { word: 'ALGORITHM', clue: 'A step-by-step plan for solving a problem.' },
    { word: 'ITERATION', clue: 'One pass through a repeating loop.' },
    { word: 'CONSTANT', clue: 'A value that should not change while a program runs.' },
    { word: 'EXCEPTION', clue: 'An error event that interrupts normal program flow.' },
  ],
  5: [
    { word: 'ENCAPSULATION', clue: 'Bundling data and behavior while controlling access.' },
    { word: 'INHERITANCE', clue: 'A class receiving features from another class.' },
    { word: 'POLYMORPHISM', clue: 'One interface or method behaving in different ways.' },
    { word: 'ABSTRACTION', clue: 'Hiding complex details and showing only what is needed.' },
    { word: 'RECURSION', clue: 'A function solving a problem by calling itself.' },
    { word: 'CONSTRUCTOR', clue: 'A special method that creates and prepares an object.' },
    { word: 'INTERFACE', clue: 'A contract that defines what methods a class should provide.' },
    { word: 'SCOPE', clue: 'The part of a program where a variable can be used.' },
    { word: 'PACKAGE', clue: 'A way to group related classes or code files.' },
    { word: 'COMPILER', clue: 'A tool that checks and translates code before running.' },
  ],
});

const GAME_FIVE_TUTORIAL_STEPS = Object.freeze([
  { title: 'Practice Tutorial', body: 'This tutorial teaches the word clue, keyboard, hint, timer, and lives. You can practice before the real Level 1 starts.', buttonLabel: 'Start Practice' },
  { title: 'Read The Clue', body: 'Use the clue to guess the programming word. The blanks show how many letters are in the answer.', buttonLabel: 'Try Letters' },
  { title: 'Guess Letters', body: 'Click a letter or press it on your keyboard. Correct letters reveal parts of the word.', buttonLabel: 'Keep Guessing' },
  { title: 'Use A Hint', body: 'The Hint button reveals extra help. In the real level, use hints when you are stuck.', buttonLabel: 'Use Hint' },
  { title: 'Protect Lives', body: 'Wrong letters remove lives. Finish the practice word to start the real Level 1.', buttonLabel: 'Finish Tutorial' },
]);

const CORRECT_ANSWER_SOUND_SRC = new URL(
  '../../../../assets/Game/game_two/Game 2_ Hardware/Music & Sound Effects/correct answer sf.mp3',
  import.meta.url,
).href;
const INCORRECT_ANSWER_SOUND_SRC = new URL(
  '../../../../assets/Game/game_two/Game 2_ Hardware/Music & Sound Effects/incorrect answer sf.mp3',
  import.meta.url,
).href;
const HINT_SOUND_SRC = new URL(
  '../../../../assets/Game/game_two/Game 2_ Hardware/Music & Sound Effects/hint sf.mp3',
  import.meta.url,
).href;
const ROBOT_DESTROY_HIT_SOUND_SRC = new URL(
  '../../../assets/game-five/robot/sfx/robot-destroy-hit.mp4',
  import.meta.url,
).href;
const ROBOT_DESTROYED_SOUND_SRC = new URL(
  '../../../assets/game-five/robot/sfx/robot-destroyed.mp4',
  import.meta.url,
).href;
const ROBOT_INTRO_VOICE_SRC = new URL(
  '../../../assets/game-five/robot/sfx/robot-intro-voice.mp4',
  import.meta.url,
).href;
const ROBOT_GUIDE_VOICE_SRC = new URL(
  '../../../assets/game-five/robot/sfx/robot-guide-voice.mp4',
  import.meta.url,
).href;

const ROBOT_FRAME_MODULES = import.meta.glob(
  '../../../assets/game-five/robot/frames/*/*.png',
  { eager: true, import: 'default' },
);

const ROBOT_FRAMES = Object.freeze(
  Object.entries(ROBOT_FRAME_MODULES).reduce((framesByAnimation, [path, src]) => {
    const [, animationName, frameName] = path.match(/frames\/([^/]+)\/([^/]+)\.png$/) || [];
    if (!animationName || !frameName) return framesByAnimation;
    if (!framesByAnimation[animationName]) framesByAnimation[animationName] = [];
    framesByAnimation[animationName][Number(frameName)] = src;
    return framesByAnimation;
  }, {}),
);

const ROBOT_SPRITES = Object.freeze({
  idle: { animationName: 'idle', frameSequence: [0, 1, 2, 3, 4, 5, 4, 3, 2, 1], frameMs: 170, loop: true },
  hurt1: { animationName: 'hurt1', frameMs: 90, loop: false },
  hurt1Idle: { animationName: 'hurt1Idle', frameSequence: [0, 1, 2, 3, 4, 3, 2, 1], frameMs: 170, loop: true },
  hurt2: { animationName: 'hurt2', frameMs: 90, loop: false },
  hurt2Idle: { animationName: 'hurt2Idle', frameSequence: [0, 1, 2, 3, 4, 5, 4, 3, 2, 1], frameMs: 170, loop: true },
  hurt3: { animationName: 'hurt3', frameMs: 82, loop: false },
  finalDestruction: { animationName: 'finalDestruction', frameMs: 120, loop: false },
  destroyed: { animationName: 'destroyed', frameMs: 220, loop: true },
});

const getSettings = (levelData) => {
  const level = Math.max(1, Math.min(5, Number(levelData?.levelNumber || 1)));
  return {
    level,
    targetWords: Number(levelData?.settings?.targetWords || WORDS_BY_LEVEL[level].length),
    seconds: Number(levelData?.settings?.seconds || 180),
    lives: Number(levelData?.settings?.lives || 5),
    words: WORDS_BY_LEVEL[level],
  };
};

const getRobotDamageRatio = (lives, maxLives) => {
  const safeMaxLives = Math.max(1, Number(maxLives) || 1);
  return Math.max(0, Math.min(1, (safeMaxLives - Math.max(0, lives)) / safeMaxLives));
};

const getRobotIdleKey = (lives, maxLives, timedOut) => {
  if (timedOut || lives <= 0) return 'destroyed';
  const damageRatio = getRobotDamageRatio(lives, maxLives);
  if (damageRatio <= 0) return 'idle';
  if (damageRatio <= 0.34) return 'hurt1Idle';
  return 'hurt2Idle';
};

const getRobotImpactKey = (nextLives, maxLives) => {
  if (nextLives <= 0) return 'finalDestruction';
  const damageRatio = getRobotDamageRatio(nextLives, maxLives);
  if (damageRatio <= 0.34) return 'hurt1';
  if (damageRatio <= 0.67) return 'hurt2';
  return 'hurt3';
};

const getGameFiveComboMultiplier = (comboCount) => {
  if (comboCount >= 10) return 5;
  if (comboCount >= 5) return 3;
  if (comboCount >= 3) return 2;
  return 1;
};

const buildAiClue = (entry, level, clueDepth, guessedLetters) => {
  const word = String(entry?.word || '').toUpperCase();
  const baseClue = String(entry?.clue || 'Think about a programming concept from your ICT lesson.');
  const revealed = word.split('').map((letter) => (guessedLetters.includes(letter) ? letter : '_')).join(' ');
  const vowels = word.split('').filter((letter) => 'AEIOU'.includes(letter)).length;
  const topicType = level <= 2
    ? 'basic programming vocabulary'
    : level <= 4
      ? 'code structure and problem-solving'
      : 'object-oriented programming';

  if (clueDepth <= 0) return baseClue;
  if (clueDepth === 1) return `This is a ${word.length}-letter ${topicType} term. ${baseClue}`;
  if (clueDepth === 2) return `Current pattern is ${revealed}. It starts with "${word.charAt(0)}" and has ${vowels} vowel${vowels === 1 ? '' : 's'}.`;
  return `Think of this when you ${baseClue.charAt(0).toLowerCase() + baseClue.slice(1)}`;
};

const useArcadeAudio = (musicSrc, sfxSrc, active) => {
  const musicRef = useRef(null);
  const sfxRef = useRef(null);
  const musicBlockedRef = useRef(false);
  const musicDuckedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.Audio === 'undefined') return undefined;
    const music = new Audio(musicSrc);
    music.loop = true;
    music.volume = 0.48;
    music.preload = 'auto';
    musicRef.current = music;

    const sfx = new Audio(sfxSrc);
    sfx.volume = 0.55;
    sfx.preload = 'auto';
    sfxRef.current = sfx;

    return () => {
      music.pause();
      music.currentTime = 0;
      musicRef.current = null;
      sfxRef.current = null;
      musicBlockedRef.current = false;
      musicDuckedRef.current = false;
    };
  }, [musicSrc, sfxSrc]);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;
    if (!active || !getStudentMusicPreference()) {
      music.pause();
      return;
    }

    const retryMusic = () => {
      if (!active || !getStudentMusicPreference() || !music.paused) return;
      const retryPromise = music.play();
      if (retryPromise?.then) {
        retryPromise
          .then(() => {
            musicBlockedRef.current = false;
          })
          .catch(() => {
            musicBlockedRef.current = true;
          });
      }
    };

    const playPromise = music.play();
    if (playPromise?.then) {
      playPromise
        .then(() => {
          musicBlockedRef.current = false;
        })
        .catch(() => {
          musicBlockedRef.current = true;
        });
    }

    window.addEventListener('pointerdown', retryMusic);
    window.addEventListener('keydown', retryMusic);

    return () => {
      window.removeEventListener('pointerdown', retryMusic);
      window.removeEventListener('keydown', retryMusic);
    };
  }, [active]);

  const playSfx = useCallback(() => {
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

  const setMusicDucked = useCallback((isDucked) => {
    musicDuckedRef.current = Boolean(isDucked);
    const music = musicRef.current;
    if (!music) return;
    music.volume = isDucked ? 0.14 : 0.48;
  }, []);

  return { playSfx, setMusicDucked };
};

const useAnswerSounds = () => {
  const correctRef = useRef(null);
  const incorrectRef = useRef(null);
  const hintRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.Audio === 'undefined') return undefined;

    const correct = new Audio(CORRECT_ANSWER_SOUND_SRC);
    correct.preload = 'auto';
    correct.volume = 0.7;
    correctRef.current = correct;

    const incorrect = new Audio(INCORRECT_ANSWER_SOUND_SRC);
    incorrect.preload = 'auto';
    incorrect.volume = 0.7;
    incorrectRef.current = incorrect;

    const hint = new Audio(HINT_SOUND_SRC);
    hint.preload = 'auto';
    hint.volume = 0.7;
    hintRef.current = hint;

    return () => {
      correct.pause();
      incorrect.pause();
      hint.pause();
      correctRef.current = null;
      incorrectRef.current = null;
      hintRef.current = null;
    };
  }, []);

  const play = useCallback((audioRef) => {
    if (!getStudentSfxPreference()) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise?.catch) playPromise.catch(() => {});
  }, []);

  return {
    playCorrectAnswer: useCallback(() => play(correctRef), [play]),
    playIncorrectAnswer: useCallback(() => play(incorrectRef), [play]),
    playHint: useCallback(() => play(hintRef), [play]),
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
      audio.volume = 1;
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
    if (!getStudentSfxPreference()) return;
    const audio = soundsRef.current.get(comboCount);
    if (!audio) return;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise?.catch) playPromise.catch(() => {});
  }, []);
};

const useRobotDestructionSounds = () => {
  const hitRef = useRef(null);
  const destroyedRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.Audio === 'undefined') return undefined;

    const hit = new Audio(ROBOT_DESTROY_HIT_SOUND_SRC);
    hit.preload = 'auto';
    hit.volume = 0.85;
    hitRef.current = hit;

    const destroyed = new Audio(ROBOT_DESTROYED_SOUND_SRC);
    destroyed.preload = 'auto';
    destroyed.volume = 0.85;
    destroyedRef.current = destroyed;

    return () => {
      hit.pause();
      destroyed.pause();
      hitRef.current = null;
      destroyedRef.current = null;
    };
  }, []);

  return useCallback(() => {
    if (!getStudentSfxPreference()) return;
    const hit = hitRef.current;
    const destroyed = destroyedRef.current;
    if (!hit || !destroyed) return;

    const playDestroyed = () => {
      destroyed.currentTime = 0;
      const destroyedPromise = destroyed.play();
      if (destroyedPromise?.catch) destroyedPromise.catch(() => {});
    };

    hit.pause();
    destroyed.pause();
    hit.currentTime = 0;
    destroyed.currentTime = 0;
    hit.onended = playDestroyed;

    const hitPromise = hit.play();
    if (hitPromise?.catch) {
      hitPromise.catch(() => {
        playDestroyed();
      });
    }
  }, []);
};

const useRobotVoiceSounds = (setMusicDucked) => {
  const introRef = useRef(null);
  const guideRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.Audio === 'undefined') return undefined;

    const intro = new Audio(ROBOT_INTRO_VOICE_SRC);
    intro.preload = 'auto';
    intro.volume = 1;
    introRef.current = intro;

    const guide = new Audio(ROBOT_GUIDE_VOICE_SRC);
    guide.preload = 'auto';
    guide.volume = 1;
    guideRef.current = guide;

    return () => {
      intro.pause();
      guide.pause();
      setMusicDucked?.(false);
      introRef.current = null;
      guideRef.current = null;
    };
  }, [setMusicDucked]);

  const play = useCallback((audioRef) => {
    if (!getStudentSfxPreference()) return;
    const audio = audioRef.current;
    if (!audio) return;

    setMusicDucked?.(true);
    audio.onended = () => {
      setMusicDucked?.(false);
    };
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        setMusicDucked?.(false);
      });
    }
  }, [setMusicDucked]);

  return {
    playIntroVoice: useCallback(() => play(introRef), [play]),
    playGuideVoice: useCallback(() => play(guideRef), [play]),
  };
};

const PixelPanel = ({ children, className = '' }) => (
  <div className={`border-4 border-[#0f3a5f] bg-[#e0f2fe] text-[#082f49] shadow-[6px_6px_0_#082f49] ${className}`}>
    {children}
  </div>
);

const RobotSprite = ({ spriteKey, animationId, onComplete }) => {
  const sprite = ROBOT_SPRITES[spriteKey] || ROBOT_SPRITES.idle;
  const frames = ROBOT_FRAMES[sprite.animationName] || ROBOT_FRAMES.idle || [];
  const frameSequence = useMemo(() => (
    sprite.frameSequence || frames.map((_, index) => index)
  ), [frames, sprite]);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    setFrameIndex(0);
  }, [spriteKey, animationId]);

  useEffect(() => {
    let nextFrame = 0;
    const intervalId = window.setInterval(() => {
      nextFrame += 1;
      if (nextFrame >= frameSequence.length) {
        if (!sprite.loop) {
          window.clearInterval(intervalId);
          setFrameIndex(frameSequence[frameSequence.length - 1] || 0);
          onComplete?.();
          return;
        }
        nextFrame = 0;
      }
      setFrameIndex(frameSequence[nextFrame] || 0);
    }, sprite.frameMs);

    return () => window.clearInterval(intervalId);
  }, [animationId, frameSequence, onComplete, sprite, spriteKey]);

  const frameSrc = frames[frameIndex] || frames[0] || '';

  return (
    <img
      className="game-five-robot-sprite absolute bottom-6 left-1/2 h-[460px] w-[460px] max-w-none -translate-x-1/2 object-contain transition-transform duration-200 2xl:h-[520px] 2xl:w-[520px]"
      src={frameSrc}
      alt="Code robot"
      draggable="false"
      style={{ imageRendering: 'auto' }}
    />
  );
};

const GameCanvasGameFive = ({
  levelData,
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
  const baseSettings = useMemo(() => getSettings(levelData), [levelData]);
  const [generatedQuestions, setGeneratedQuestions] = useState(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(true);
  const variationSeedRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const settings = useMemo(() => ({
    ...baseSettings,
    words: generatedQuestions?.length ? generatedQuestions : baseSettings.words,
  }), [baseSettings, generatedQuestions]);
  const guideContent = useMemo(
    () => buildGameFiveGuideContent(levelData),
    [levelData],
  );
  const isTutorialLevel = Boolean(levelData?.isTutorialLevel);
  const [timeLeft, setTimeLeft] = useState(settings.seconds);
  const [wordIndex, setWordIndex] = useState(0);
  const [guessed, setGuessed] = useState([]);
  const [lives, setLives] = useState(settings.lives);
  const [solved, setSolved] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboFeedback, setComboFeedback] = useState(null);
  const [coins, setCoins] = useState(() => Math.max(0, Math.round(Number(initialCoins) || 0)));
  const [hintsUsed, setHintsUsed] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const isFirstLevelGuide = settings.level === 1;
  const [showTutorial, setShowTutorial] = useState(showLevelGuideline);
  const [tutorialView, setTutorialView] = useState(
    showLevelGuideline ? 'guide' : null,
  );
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialCoachOpen, setTutorialCoachOpen] = useState(isTutorialLevel);
  const [clueDepth, setClueDepth] = useState(0);
  const [aiClue, setAiClue] = useState('');
  const [isGeneratingHint, setIsGeneratingHint] = useState(false);
  const [hintedIndices, setHintedIndices] = useState([]);
  const [hintReveal, setHintReveal] = useState(null);
  const [robotImpact, setRobotImpact] = useState(null);
  const introVoicePlayedRef = useRef(false);
  const guideVoicePlayedRef = useRef(false);
  const shouldPauseForTutorialCoach = Boolean(isTutorialLevel && tutorialCoachOpen);
  const showGuide = showTutorial && tutorialView === 'guide';
  const gameplayAudioActive = !showTutorial && !shouldPauseForTutorialCoach && !finished && !resultData;

  useEffect(() => {
    if (Number(gameTutorialRequested) > 0 && !isTutorialLevel) {
      setTutorialView('tutorial');
      setShowTutorial(true);
    }
  }, [gameTutorialRequested, isTutorialLevel]);
  const { setMusicDucked } = useArcadeAudio(gameFiveMusic, sharedSfx, gameplayAudioActive);
  const { playCorrectAnswer, playIncorrectAnswer, playHint } = useAnswerSounds();
  const playComboMilestone = useComboMilestoneSounds(gameplayAudioActive);
  const playRobotDestructionSounds = useRobotDestructionSounds();
  const { playIntroVoice, playGuideVoice } = useRobotVoiceSounds(setMusicDucked);

  const current = settings.words[wordIndex % settings.words.length];
  const letters = useMemo(() => current.word.split(''), [current.word]);
  const robotIdleKey = getRobotIdleKey(lives, settings.lives, timedOut);
  const robotSpriteKey = robotImpact?.key || robotIdleKey;
  const handleRobotImpactComplete = useCallback(() => {
    setRobotImpact(null);
  }, []);
  const handleContinueTutorialStep = () => {
    if (tutorialStepIndex === 0) {
      setTutorialStepIndex(1);
    }
    setTutorialCoachOpen(false);
  };

  const fallbackClue = useMemo(() => (
    buildAiClue(current, settings.level, clueDepth, guessed)
  ), [current, settings.level, clueDepth, guessed]);
  const activeClue = aiClue || fallbackClue;

  useEffect(() => {
    if (
      introVoicePlayedRef.current
      || isGeneratingQuestions
      || showTutorial
      || shouldPauseForTutorialCoach
      || finished
      || resultData
    ) {
      return;
    }

    introVoicePlayedRef.current = true;
    playIntroVoice();
  }, [finished, isGeneratingQuestions, playIntroVoice, resultData, shouldPauseForTutorialCoach, showTutorial]);

  useEffect(() => {
    let active = true;
    setIsGeneratingQuestions(true);

    levelAPI.generateGameQuestions('GAME_FIVE', baseSettings.level, {
      count: baseSettings.targetWords,
      fallbackQuestions: baseSettings.words,
      variationSeed: variationSeedRef.current,
    }).then((response) => {
      const questions = response?.data?.questions;
      if (active && Array.isArray(questions) && questions.length === baseSettings.targetWords) {
        setGeneratedQuestions(questions);
      }
    }).catch(() => {
      // Keep the validated built-in questions when AI is unavailable.
    }).finally(() => {
      if (active) setIsGeneratingQuestions(false);
    });

    return () => {
      active = false;
    };
  }, [baseSettings]);

  const finish = useCallback((outcome, finalSolved = solved, finalScore = score, finalMistakes = mistakes) => {
    if (finished) return;
    setFinished(true);
    const payload = {
      outcome,
      points: finalScore,
      mistakes: finalMistakes,
      completedTasks: finalSolved,
      totalTasks: settings.targetWords,
      hintsUsed,
      coinsRemaining: coins,
    };
    if (outcome === 'COMPLETED') onLevelComplete?.(payload);
    else onLevelFail?.(payload);
  }, [coins, finished, hintsUsed, mistakes, onLevelComplete, onLevelFail, score, settings.targetWords, solved]);

  useEffect(() => {
    if (isGeneratingQuestions || showTutorial || shouldPauseForTutorialCoach || finished || resultData) return undefined;
    const id = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          setTimedOut(true);
          setLives(0);
          setRobotImpact({ key: 'finalDestruction', id: Date.now() });
          playRobotDestructionSounds();
          finish('FAILED', solved, score, mistakes + settings.lives);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [finish, finished, isGeneratingQuestions, mistakes, playRobotDestructionSounds, resultData, score, settings.lives, shouldPauseForTutorialCoach, showTutorial, solved]);

  useEffect(() => {
    setHintReveal(null);
    setHintedIndices([]);
    setAiClue('');
    setIsGeneratingHint(false);
  }, [current.word]);

  const completeCurrentWord = useCallback((finalMistakes = mistakes) => {
    const nextSolved = solved + 1;
    const nextCombo = combo + 1;
    const earnedCoins = 10 + (settings.level * 2);
    const persistedCoins = addUserCoins(playerId, earnedCoins).balance;
    const activeMultiplier = getGameFiveComboMultiplier(nextCombo);
    const nextScore = score + (100 * activeMultiplier) + Math.max(0, Math.floor(timeLeft / 3));
    setSolved(nextSolved);
    setCombo(nextCombo);
    if ([3, 5, 10].includes(nextCombo)) {
      playComboMilestone(nextCombo);
      setComboFeedback({
        id: `milestone-${nextCombo}-${Date.now()}`,
        type: 'milestone',
        count: nextCombo,
        label: `${nextCombo} COMBO!`,
        multiplier: activeMultiplier,
      });
    }
    setCoins(persistedCoins);
    onCoinBalanceChange?.(persistedCoins);
    setScore(nextScore);
    if (isTutorialLevel && tutorialStepIndex < 4) {
      setTutorialStepIndex(4);
      setTutorialCoachOpen(true);
    }

    if (nextSolved >= settings.targetWords) {
      finish('COMPLETED', nextSolved, nextScore, finalMistakes);
      return;
    }

    setWordIndex((value) => value + 1);
    setGuessed([]);
    setClueDepth(0);
    setHintedIndices([]);
    setAiClue('');
  }, [combo, finish, isTutorialLevel, mistakes, onCoinBalanceChange, playComboMilestone, playerId, score, settings.level, settings.targetWords, solved, timeLeft, tutorialStepIndex]);

  const chooseLetter = useCallback((rawLetter) => {
    const letter = String(rawLetter || '').toUpperCase();
    if (isGeneratingQuestions || showTutorial || shouldPauseForTutorialCoach || finished || resultData || !/^[A-Z]$/.test(letter) || guessed.includes(letter)) return;

    const nextGuessed = [...guessed, letter];
    setGuessed(nextGuessed);
    if (isTutorialLevel && tutorialStepIndex < 2) {
      setTutorialStepIndex(2);
      setTutorialCoachOpen(true);
    }

    if (!current.word.includes(letter)) {
      const nextLives = lives - 1;
      const nextMistakes = mistakes + 1;
      if (nextLives <= 0) {
        playRobotDestructionSounds();
      } else {
        playIncorrectAnswer();
        if (!guideVoicePlayedRef.current) {
          guideVoicePlayedRef.current = true;
          playGuideVoice();
        }
      }
      setLives(Math.max(0, nextLives));
      setMistakes(nextMistakes);
      setRobotImpact({ key: getRobotImpactKey(nextLives, settings.lives), id: Date.now() });
      if (nextLives <= 0) {
        finish('FAILED', solved, score, nextMistakes);
      }
      return;
    }

    playCorrectAnswer();
    const solvedWord = current.word
      .split('')
      .every((item, index) => nextGuessed.includes(item) || hintedIndices.includes(index));
    if (!solvedWord) return;

    completeCurrentWord(mistakes);
  }, [completeCurrentWord, current.word, finish, finished, guessed, hintedIndices, isGeneratingQuestions, isTutorialLevel, lives, mistakes, playCorrectAnswer, playGuideVoice, playIncorrectAnswer, playRobotDestructionSounds, resultData, score, settings.lives, shouldPauseForTutorialCoach, showTutorial, solved, tutorialStepIndex]);

  const revealRandomLetterHint = useCallback(async () => {
    if (isGeneratingQuestions || isGeneratingHint || clueDepth >= 3 || showTutorial || shouldPauseForTutorialCoach || finished || Boolean(resultData)) return;

    const hiddenIndices = current.word
      .split('')
      .map((letter, index) => ({ letter, index }))
      .filter(({ letter, index }) => !guessed.includes(letter) && !hintedIndices.includes(index));
    if (hiddenIndices.length === 0) return;

    const selection = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
    const nextHintedIndices = [...hintedIndices, selection.index];
    const nextClueDepth = Math.min(3, clueDepth + 1);
    const fallbackHint = buildAiClue(current, settings.level, nextClueDepth, guessed);

    playHint();
    if (isTutorialLevel && tutorialStepIndex < 3) {
      setTutorialStepIndex(3);
      setTutorialCoachOpen(true);
    }
    setClueDepth(nextClueDepth);
    setHintsUsed((value) => value + 1);
    setHintedIndices(nextHintedIndices);
    setHintReveal({
      index: selection.index,
      letter: selection.letter,
      key: `${wordIndex}-${selection.index}-${Date.now()}`,
    });

    const solvedWord = current.word
      .split('')
      .every((letter, index) => guessed.includes(letter) || nextHintedIndices.includes(index));
    if (solvedWord) {
      completeCurrentWord(mistakes);
      return;
    }

    setIsGeneratingHint(true);
    try {
      const pattern = current.word
        .split('')
        .map((letter, index) => (
          guessed.includes(letter) || nextHintedIndices.includes(index) ? letter : '_'
        ))
        .join(' ');
      const response = await levelAPI.generateGameHint('GAME_FIVE', settings.level, {
        topic: current.word,
        objective: current.clue,
        answerPattern: pattern,
        hintNumber: nextClueDepth,
        fallbackHint,
      });
      setAiClue(String(response?.data?.hint || fallbackHint).trim() || fallbackHint);
    } catch {
      setAiClue(fallbackHint);
    } finally {
      setIsGeneratingHint(false);
    }
  }, [clueDepth, completeCurrentWord, current, finished, guessed, hintedIndices, isGeneratingHint, isGeneratingQuestions, isTutorialLevel, mistakes, playHint, resultData, settings.level, shouldPauseForTutorialCoach, showTutorial, tutorialStepIndex, wordIndex]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target?.tagName === 'INPUT' || event.target?.tagName === 'TEXTAREA') return;
      chooseLetter(event.key);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chooseLetter]);

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');
  const levelTitle = typeof levelData?.title === 'string' && levelData.title.trim().length > 0
    ? levelData.title.replace(LEGACY_GAME_FIVE_TITLE_PATTERN, 'Code Robot')
    : 'Code Robot';

  return (
    <div className="game-five-shell min-h-[700px] w-full overflow-hidden border-4 border-[#082f49] bg-[#93c5fd] p-3 text-[#082f49] shadow-2xl" style={{ imageRendering: 'pixelated' }}>
      <div className="game-five-header mb-3 flex flex-wrap items-center justify-between gap-3 border-4 border-[#0f3a5f] bg-[#bfdbfe] px-4 py-3 shadow-[4px_4px_0_#082f49]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide">Game 5</p>
          <h2 className="text-3xl font-bold text-[#075985]">{levelTitle}</h2>
        </div>
        <div className="game-five-status-row flex flex-wrap gap-3 text-lg font-semibold">
          <PixelPanel className="px-4 py-2">Level: {settings.level} <Star className="inline h-5 w-5 fill-yellow-300 text-yellow-500" /></PixelPanel>
          <PixelPanel className="game-five-coins-status px-4 py-2"><Coins className="inline h-5 w-5 text-yellow-500" /> Coins: {coins}</PixelPanel>
          <PixelPanel className="game-five-lives-status px-4 py-2"><Heart className="inline h-5 w-5 fill-red-500 text-red-600" /> Lives: {lives}/{settings.lives}</PixelPanel>
          <PixelPanel className="px-4 py-2">Round: {solved + 1}/{settings.targetWords}</PixelPanel>
          {combo > 0 && <PixelPanel className="game-five-combo-status px-4 py-2">Combo: x{getGameFiveComboMultiplier(combo)}</PixelPanel>}
        </div>
      </div>

      <div className="game-five-layout grid gap-4 lg:grid-cols-[280px_460px_minmax(0,1fr)] xl:grid-cols-[300px_520px_minmax(0,1fr)] 2xl:grid-cols-[340px_620px_minmax(0,1fr)]">
        <aside className="game-five-sidebar flex flex-col gap-4 lg:min-h-[760px]">
          <PixelPanel className="game-five-mission-panel p-5">
            <h3 className="mb-3 text-2xl font-bold uppercase">Mission</h3>
            <p className="text-lg font-medium leading-snug">Guess {settings.targetWords} programming words before the timer runs out. Wrong letters damage the code robot.</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <PixelPanel className="game-five-timer-status p-4 text-center"><Clock3 className="mx-auto h-7 w-7 text-green-700" /><strong className="block text-2xl font-semibold">{minutes}:{seconds}</strong><span className="text-sm font-semibold">Timer</span></PixelPanel>
              <PixelPanel className="game-five-score-status p-4 text-center"><Star className="mx-auto h-7 w-7 fill-yellow-300 text-yellow-500" /><strong className="block text-2xl font-semibold">{score}</strong><span className="text-sm font-semibold">Score</span></PixelPanel>
              <PixelPanel className="p-4 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-green-700" /><strong className="block text-2xl font-semibold">{solved}/{settings.targetWords}</strong><span className="text-sm font-semibold">Words</span></PixelPanel>
              <PixelPanel className="game-five-snow-status p-4 text-center"><Bot className="mx-auto h-7 w-7 text-blue-600" /><strong className="block text-2xl font-semibold">{lives}</strong><span className="text-sm font-semibold">Power</span></PixelPanel>
            </div>
          </PixelPanel>
          <PixelPanel className="flex-1 p-5">
            <h3 className="mb-2 text-2xl font-bold uppercase">Guide</h3>
            <p className="text-lg font-medium">Click letters or press your keyboard. Correct letters reveal the word. Wrong letters remove 1 life. If time runs out, the robot shuts down instantly.</p>
          </PixelPanel>
          <button type="button" className="w-full border-4 border-[#0f3a5f] bg-[#dbeafe] px-5 py-3 text-xl font-semibold shadow-[4px_4px_0_#082f49] transition hover:bg-[#f0f9ff]" onClick={onExitRequest}>
            <LogOut className="inline h-5 w-5" /> Back
          </button>
        </aside>

        <section className="game-five-robot-stage relative min-h-[510px] overflow-hidden border-4 border-[#0f3a5f] bg-gradient-to-b from-[#1e3a8a] via-[#60a5fa] to-[#e0f2fe] shadow-[5px_5px_0_#082f49]">
          <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(circle at 22% 18%, white 0 2px, transparent 3px), radial-gradient(circle at 72% 10%, white 0 2px, transparent 3px), radial-gradient(circle at 50% 30%, white 0 2px, transparent 3px)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-[#eef7ff]" />
          <div className="absolute bottom-7 left-1/2 h-14 w-[300px] -translate-x-1/2 rounded-[50%] border-4 border-[#6aa0c8] bg-[#bfe8ff] opacity-80 shadow-[0_0_18px_rgba(191,232,255,.9)]" />
          <RobotSprite
            spriteKey={robotSpriteKey}
            animationId={robotImpact?.id || robotSpriteKey}
            onComplete={handleRobotImpactComplete}
          />
          <PixelPanel className="game-five-stage-tip absolute bottom-20 left-8 p-3 text-center text-sm font-semibold">TIP<br />Think like<br />a coder!</PixelPanel>
        </section>

        <main className="game-five-play-area flex min-h-[760px] flex-col gap-5">
          <PixelPanel className="game-five-clue-panel min-h-[300px] p-5">
            <h3
              className="-mt-10 mb-4 inline-block border-4 border-[#0f3a5f] bg-[#0369a1] px-5 py-2 text-2xl font-semibold uppercase text-[#e0f2fe] shadow-[4px_4px_0_#082f49] transition hover:bg-[#0284c7] disabled:opacity-60"
              role="button"
              tabIndex={0}
              aria-disabled={isGeneratingHint || clueDepth >= 3 || showTutorial || Boolean(resultData)}
              onClick={revealRandomLetterHint}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                revealRandomLetterHint();
              }}
            >
              {isGeneratingHint ? <><Loader2 className="mr-2 inline h-5 w-5 animate-spin" />Thinking...</> : 'Hint'}
            </h3>

            <PixelPanel className="game-five-clue-bubble mt-6 flex min-h-[205px] items-center gap-5 p-5">
              <div className="game-five-clue-avatar h-24 w-24 shrink-0 rounded-full border-4 border-[#0f3a5f] bg-[#0ea5e9]" />
              <p className="text-2xl font-medium leading-relaxed">{activeClue}</p>
            </PixelPanel>
          </PixelPanel>
          <PixelPanel className="game-five-answer-panel mt-auto flex min-h-[280px] flex-wrap items-center justify-center gap-4 px-8 py-14 text-center text-7xl font-semibold">
            {letters.map((letter, index) => {
              const isVisible = guessed.includes(letter) || hintedIndices.includes(index);
              const isHintReveal = isVisible && hintReveal?.index === index && hintReveal?.letter === letter;
              return (
                <span
                  key={`${current.word}-${index}-${isHintReveal ? hintReveal.key : 'steady'}`}
                  className={`game-five-word-tile ${isVisible ? 'game-five-word-tile-filled' : ''} ${isHintReveal ? 'game-five-word-tile-hint' : ''}`}
                >
                  {isVisible ? letter : '_'}
                </span>
              );
            })}
          </PixelPanel>
          <div className="game-five-keyboard mt-6 grid grid-cols-7 gap-4 2xl:grid-cols-13">
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
              <button
                key={letter}
                type="button"
                className="min-h-[88px] border-4 border-[#0f3a5f] bg-[#dbeafe] py-5 text-4xl font-semibold shadow-[4px_4px_0_#082f49] transition hover:bg-[#f0f9ff] disabled:bg-[#94a3b8] disabled:text-[#334155] disabled:shadow-none"
                disabled={guessed.includes(letter) || Boolean(resultData)}
                onClick={() => chooseLetter(letter)}
              >
                {letter}
              </button>
            ))}
          </div>
          {comboFeedback && (
            <div
              key={comboFeedback.id}
              className="game-five-combo-feedback pointer-events-none fixed left-1/2 top-1/2 z-[10030] -translate-x-1/2 -translate-y-1/2 border-4 border-[#0f3a5f] bg-[#fef3c7] px-6 py-4 text-center text-3xl font-black text-[#075985] shadow-[6px_6px_0_#082f49]"
              onAnimationEnd={() => setComboFeedback(null)}
            >
              <span className="block">{comboFeedback.label}</span>
              <span className="block text-xl">Score x{comboFeedback.multiplier}</span>
            </div>
          )}
        </main>
      </div>

      {showTutorial && !shouldPauseForTutorialCoach && !resultData && !isSubmitting && (
        showGuide ? (
          <GameGuideOverlay
            kicker={guideContent.kicker}
            title={guideContent.title}
            lead={guideContent.lead}
            summary={guideContent.summary}
            sections={guideContent.sections}
            onExit={onExitRequest}
            onStart={() => {
              if (continueToTutorialAfterGuide) {
                setTutorialView('tutorial');
              } else {
                setTutorialView(null);
                setShowTutorial(false);
              }
            }}
            startLabel="Next"
          />
        ) : (
          <GameTutorialOverlay
            gameType="GAME_FIVE"
            levelNumber={levelData?.levelNumber || 1}
            onExit={onExitRequest}
            onStart={() => {
              onGameTutorial?.();
              setTutorialView(null);
              setShowTutorial(false);
            }}
          />
        )
      )}

      {isTutorialLevel && shouldPauseForTutorialCoach && (
        <PlayableTutorialCoach
          steps={GAME_FIVE_TUTORIAL_STEPS}
          stepIndex={tutorialStepIndex}
          stats={[
            { label: 'Word', value: `${solved + 1}/${settings.targetWords}` },
            { label: 'Lives', value: `${lives}/${settings.lives}` },
          ]}
          onContinue={handleContinueTutorialStep}
        />
      )}

      {!hideResultOverlay && (resultData || isSubmitting) && (
        <div className="game-two-result-overlay">
          <div className="game-two-result-card">
            {isSubmitting ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : <h3 className="game-two-result-title">{resultData?.result === 'COMPLETED' ? 'Robot Saved' : 'Robot Destroyed'}</h3>}
            <p className="student-body-copy student-body-copy-tight">Final score: {Number(resultData?.finalScore ?? gameplayData?.points ?? 0)} | Words: {Number(gameplayData?.completedTasks || 0)}/{settings.targetWords}</p>
            <div className="game-two-result-actions">
              <button type="button" className="btn btn-secondary" onClick={onBack}>Back</button>
              <button type="button" className="btn btn-primary" onClick={onRetry}><RotateCcw className="h-4 w-4" /> Retry</button>
              {canAdvanceLevel && <button type="button" className="btn btn-primary" onClick={onNextLevel}>Next Level</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvasGameFive;
