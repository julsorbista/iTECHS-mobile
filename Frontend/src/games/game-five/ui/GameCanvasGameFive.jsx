import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Clock3,
  Coins,
  Heart,
  Loader2,
  LogOut,
  RotateCcw,
  Snowflake,
  Star,
} from 'lucide-react';
import codeSnowman from '../../../assets/game-five/code-snowman-generated.png';
import gameFiveMusic from '../../../assets/game-arcade/audio/game5.mp3';
import sharedSfx from '../../../assets/game-arcade/audio/soundeffects.mp3';
import {
  getStudentMusicPreference,
  getStudentSfxPreference,
} from '../../../utils/studentMenuAudio';
import GameGuideOverlay from '../../shared/ui/GameGuideOverlay';
import GameTutorialOverlay from '../../shared/ui/GameTutorialOverlay';
import PlayableTutorialCoach from '../../shared/ui/PlayableTutorialCoach';
import { buildGameFiveGuideContent } from '../../shared/ui/levelGuideBuilders';
import { levelAPI } from '../../../utils/api';

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

const renderScreenModal = (content) => (
  typeof document === 'undefined' ? content : createPortal(content, document.body)
);

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

const getSnowmanMeltStyle = (lives, maxLives, timedOut) => {
  if (timedOut || lives <= 0) {
    return { opacity: 0, transform: 'translate(-50%, 170px) scale(1.12, 0.08)' };
  }
  const lost = Math.max(0, maxLives - lives);
  const stages = [
    { opacity: 1, transform: 'translate(-50%, 0) scale(1)' },
    { opacity: 0.96, transform: 'translate(-50%, 22px) scale(0.98, 0.9)' },
    { opacity: 0.9, transform: 'translate(-50%, 52px) scale(0.94, 0.76)' },
    { opacity: 0.76, transform: 'translate(-50%, 95px) scale(0.88, 0.55)' },
    { opacity: 0.52, transform: 'translate(-50%, 135px) scale(0.78, 0.32)' },
  ];
  return stages[Math.min(lost, stages.length - 1)];
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

const PixelPanel = ({ children, className = '' }) => (
  <div className={`border-4 border-[#43204f] bg-[#fff1be] text-[#201325] shadow-[6px_6px_0_#43204f] ${className}`}>
    {children}
  </div>
);

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
  const [coins, setCoins] = useState(0);
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
  const shouldPauseForTutorialCoach = Boolean(isTutorialLevel && tutorialCoachOpen);
  const showGuide = showTutorial && tutorialView === 'guide';

  useEffect(() => {
    if (Number(gameTutorialRequested) > 0 && !isTutorialLevel) {
      setTutorialView('tutorial');
      setShowTutorial(true);
    }
  }, [gameTutorialRequested, isTutorialLevel]);
  useArcadeAudio(gameFiveMusic, sharedSfx, !showTutorial && !shouldPauseForTutorialCoach && !finished && !resultData);
  const { playCorrectAnswer, playIncorrectAnswer, playHint } = useAnswerSounds();

  const current = settings.words[wordIndex % settings.words.length];
  const letters = useMemo(() => current.word.split(''), [current.word]);
  const snowmanMeltStyle = getSnowmanMeltStyle(lives, settings.lives, timedOut);
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
    };
    if (outcome === 'COMPLETED') onLevelComplete?.(payload);
    else onLevelFail?.(payload);
  }, [finished, mistakes, onLevelComplete, onLevelFail, score, settings.targetWords, solved]);

  useEffect(() => {
    if (isGeneratingQuestions || showTutorial || shouldPauseForTutorialCoach || finished || resultData) return undefined;
    const id = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          setTimedOut(true);
          setLives(0);
          finish('FAILED', solved, score, mistakes + settings.lives);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [finish, finished, isGeneratingQuestions, mistakes, resultData, score, settings.lives, shouldPauseForTutorialCoach, showTutorial, solved]);

  useEffect(() => {
    setHintReveal(null);
    setHintedIndices([]);
    setAiClue('');
    setIsGeneratingHint(false);
  }, [current.word]);

  const completeCurrentWord = useCallback((finalMistakes = mistakes) => {
    const nextSolved = solved + 1;
    const earnedCoins = 10 + (settings.level * 2);
    const nextCoins = coins + earnedCoins;
    const nextScore = score + 100 + earnedCoins + Math.max(0, Math.floor(timeLeft / 3));
    setSolved(nextSolved);
    setCoins(nextCoins);
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
  }, [coins, finish, isTutorialLevel, mistakes, score, settings.level, settings.targetWords, solved, timeLeft, tutorialStepIndex]);

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
      playIncorrectAnswer();
      const nextLives = lives - 1;
      const nextMistakes = mistakes + 1;
      setLives(Math.max(0, nextLives));
      setMistakes(nextMistakes);
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
  }, [completeCurrentWord, current.word, finish, finished, guessed, hintedIndices, isGeneratingQuestions, isTutorialLevel, lives, mistakes, playCorrectAnswer, playIncorrectAnswer, resultData, score, shouldPauseForTutorialCoach, showTutorial, solved, tutorialStepIndex]);

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

  return (
    <div className="game-five-shell min-h-[700px] w-full overflow-hidden border-4 border-[#32173b] bg-[#f8d994] p-3 text-[#201325] shadow-2xl" style={{ imageRendering: 'pixelated' }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-4 border-[#43204f] bg-[#ffe8aa] px-4 py-3 shadow-[4px_4px_0_#43204f]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide">Game 5</p>
          <h2 className="text-3xl font-bold text-[#4b235d]">{levelData?.title || 'Code Snowman'}</h2>
        </div>
        <div className="flex flex-wrap gap-3 text-lg font-semibold">
          <PixelPanel className="px-4 py-2">Level: {settings.level} <Star className="inline h-5 w-5 fill-yellow-300 text-yellow-500" /></PixelPanel>
          <PixelPanel className="game-five-coins-status px-4 py-2"><Coins className="inline h-5 w-5 text-yellow-500" /> Coins: {coins}</PixelPanel>
          <PixelPanel className="game-five-lives-status px-4 py-2"><Heart className="inline h-5 w-5 fill-red-500 text-red-600" /> Lives: {lives}/{settings.lives}</PixelPanel>
          <PixelPanel className="px-4 py-2">Round: {solved + 1}/{settings.targetWords}</PixelPanel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[250px_420px_1fr]">
        <aside className="space-y-4">
          <PixelPanel className="game-five-mission-panel p-4">
            <h3 className="mb-3 text-xl font-bold uppercase">Mission</h3>
            <p className="font-medium leading-snug">Guess {settings.targetWords} programming words before the timer runs out. Wrong letters melt the code snowman.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <PixelPanel className="game-five-timer-status p-3 text-center"><Clock3 className="mx-auto h-6 w-6 text-green-700" /><strong className="block text-xl font-semibold">{minutes}:{seconds}</strong><span className="text-xs font-semibold">Timer</span></PixelPanel>
              <PixelPanel className="game-five-score-status p-3 text-center"><Star className="mx-auto h-6 w-6 fill-yellow-300 text-yellow-500" /><strong className="block text-xl font-semibold">{score}</strong><span className="text-xs font-semibold">Score</span></PixelPanel>
              <PixelPanel className="p-3 text-center"><CheckCircle2 className="mx-auto h-6 w-6 text-green-700" /><strong className="block text-xl font-semibold">{solved}/{settings.targetWords}</strong><span className="text-xs font-semibold">Words</span></PixelPanel>
              <PixelPanel className="game-five-snow-status p-3 text-center"><Snowflake className="mx-auto h-6 w-6 text-blue-600" /><strong className="block text-xl font-semibold">{lives}</strong><span className="text-xs font-semibold">Snow Left</span></PixelPanel>
            </div>
          </PixelPanel>
          <PixelPanel className="p-4">
            <h3 className="mb-2 text-xl font-bold uppercase">Guide</h3>
            <p className="font-medium">Click letters or press your keyboard. Correct letters reveal the word. Wrong letters remove 1 life. If time runs out, the snowman melts instantly.</p>
          </PixelPanel>
          <button type="button" className="w-full border-4 border-[#43204f] bg-[#fff1be] px-5 py-3 text-xl font-semibold shadow-[4px_4px_0_#43204f] transition hover:bg-white" onClick={onExitRequest}>
            <LogOut className="inline h-5 w-5" /> Back
          </button>
        </aside>

        <section className="relative min-h-[510px] overflow-hidden border-4 border-[#43204f] bg-gradient-to-b from-[#7165c8] via-[#8ca2d8] to-[#fff1be] shadow-[5px_5px_0_#43204f]">
          <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(circle at 22% 18%, white 0 2px, transparent 3px), radial-gradient(circle at 72% 10%, white 0 2px, transparent 3px), radial-gradient(circle at 50% 30%, white 0 2px, transparent 3px)' }} />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-[#eef7ff]" />
          <div className="absolute bottom-7 left-1/2 h-14 w-[300px] -translate-x-1/2 rounded-[50%] border-4 border-[#6aa0c8] bg-[#bfe8ff] opacity-80 shadow-[0_0_18px_rgba(191,232,255,.9)]" />
          <img className="absolute bottom-10 left-1/2 h-[385px] max-w-none origin-bottom transition-all duration-500 ease-out" src={codeSnowman} alt="Code snowman" style={snowmanMeltStyle} />
          <PixelPanel className="absolute bottom-20 left-8 p-3 text-center text-sm font-semibold">TIP<br />Think like<br />a coder!</PixelPanel>
        </section>

        <main className="space-y-4">
          <PixelPanel className="game-five-clue-panel p-5">
            <h3
              className="-mt-10 mb-4 inline-block border-4 border-[#43204f] bg-[#5a2a68] px-5 py-2 text-2xl font-semibold uppercase text-[#fff1be] shadow-[4px_4px_0_#43204f] transition hover:brightness-110 disabled:opacity-60"
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

            <div className="mt-1">
              <p className="text-xl font-medium leading-relaxed">{activeClue}</p>
            </div>

            <PixelPanel className="mt-4 flex items-center gap-4 p-4">
              <div className="h-20 w-20 rounded-full border-4 border-[#43204f] bg-[#5a2a68]" />
              <p className="text-xl font-medium">Let's warm up our coding brain. Solve the clue and keep our snowman safe!</p>
            </PixelPanel>
          </PixelPanel>
          <PixelPanel className="game-five-answer-panel flex flex-wrap items-center justify-center gap-2 p-5 text-center text-4xl font-semibold">
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
          <div className="game-five-keyboard grid grid-cols-7 gap-2 xl:grid-cols-13">
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
              <button
                key={letter}
                type="button"
                className="border-4 border-[#43204f] bg-[#fff1be] py-3 text-2xl font-semibold shadow-[3px_3px_0_#43204f] transition hover:bg-white disabled:bg-[#c9ad91] disabled:text-[#80656f] disabled:shadow-none"
                disabled={guessed.includes(letter) || Boolean(resultData)}
                onClick={() => chooseLetter(letter)}
              >
                {letter}
              </button>
            ))}
          </div>
          <PixelPanel className="flex items-center gap-4 p-4">
            <div className="h-20 w-20 rounded-full border-4 border-[#43204f] bg-[#5a2a68]" />
            <p className="text-xl font-medium">Let's warm up our coding brain. Solve the clue and keep our snowman safe!</p>
          </PixelPanel>
        </main>
      </div>

      {showTutorial && !shouldPauseForTutorialCoach && !resultData && !isSubmitting && (
        showGuide ? renderScreenModal(
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
            {isSubmitting ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : <h3 className="game-two-result-title">{resultData?.result === 'COMPLETED' ? 'Snowman Saved' : 'Snowman Melted'}</h3>}
            <p className="student-body-copy student-body-copy-tight">Score: {Number(gameplayData?.points || 0)} | Words: {Number(gameplayData?.completedTasks || 0)}/{settings.targetWords}</p>
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
