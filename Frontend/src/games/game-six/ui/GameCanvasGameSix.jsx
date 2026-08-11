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
import { getStudentSfxPreference } from '../../../utils/studentMenuAudio';
import GameGuideOverlay from '../../shared/ui/GameGuideOverlay';
import GameTutorialOverlay from '../../shared/ui/GameTutorialOverlay';
import PlayableTutorialCoach from '../../shared/ui/PlayableTutorialCoach';
import { buildGameSixGuideContent } from '../../shared/ui/levelGuideBuilders';

const WORD_BANK = [
  'variable',
  'array',
  'loop',
  'boolean',
  'string',
  'function',
  'operator',
  'condition',
  'integer',
  'debug',
  'syntax',
  'compile',
  'return',
  'parameter',
  'object',
  'class',
  'method',
  'index',
  'constant',
  'scope',
  'recursion',
  'interface',
  'constructor',
  'package',
];

const renderScreenModal = (content) => (
  typeof document === 'undefined' ? content : createPortal(content, document.body)
);

const GAME_SIX_TUTORIAL_STEPS = Object.freeze([
  { title: 'Practice Tutorial', body: 'This tutorial teaches falling terms, typing, health, and combo rewards before the real Level 1 starts.', buttonLabel: 'Start Practice' },
  { title: 'Read A Falling Term', body: 'Watch the falling word. Your job is to type it exactly before it reaches the bottom.', buttonLabel: 'Try Typing' },
  { title: 'Press Enter', body: 'Type the word into the input box, then press Enter to clear it and earn score.', buttonLabel: 'Clear A Word' },
  { title: 'Watch Health', body: 'Wrong words or missed drops remove health. In tutorial, practice safely before the real level.', buttonLabel: 'Continue' },
  { title: 'Build A Combo', body: 'Every reward streak gives coins and restores 1 health only if health is not full.', buttonLabel: 'Finish Tutorial' },
]);

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

const DROP_LANES = Object.freeze([5, 22, 39, 56, 73]);

const getDropTuning = (level, cleared, rewardEvery) => {
  const progressBoost = Math.floor(cleared / Math.max(3, rewardEvery));
  const pressureLevel = Math.min(7, level + progressBoost);
  const maxDropsByLevel = [2, 3, 4, 5, 6];
  const spawnMsByLevel = [2600, 2250, 1900, 1600, 1350];

  return {
    pressureLevel,
    maxDrops: Math.min(DROP_LANES.length, maxDropsByLevel[level - 1] + Math.floor(progressBoost / 2)),
    spawnMs: Math.max(1050, spawnMsByLevel[level - 1] - (progressBoost * 110)),
    fallSpeed: 0.11 + (level * 0.025) + (progressBoost * 0.012),
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

const makeDrop = (level, id, items = [], cleared = 0, rewardEvery = 3) => {
  const laneChoice = chooseDropLane(items);
  if (!laneChoice) return null;

  const tuning = getDropTuning(level, cleared, rewardEvery);
  return {
    id,
    word: WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)],
    x: laneChoice.x,
    lane: laneChoice.lane,
    y: -12,
    speed: tuning.fallSpeed + Math.random() * 0.025,
  };
};

const useArcadeAudio = (musicSrc, sfxSrc, active) => {
  const musicRef = useRef(null);
  const sfxRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.Audio === 'undefined') return undefined;
    const music = new Audio(musicSrc);
    music.loop = true;
    music.volume = 0.28;
    music.preload = 'auto';
    musicRef.current = music;

    const sfx = new Audio(sfxSrc);
    sfx.volume = 0.52;
    sfx.preload = 'auto';
    sfxRef.current = sfx;

    return () => {
      music.pause();
      musicRef.current = null;
      sfxRef.current = null;
    };
  }, [musicSrc, sfxSrc]);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;
    if (!active) {
      music.pause();
      return;
    }
    const playPromise = music.play();
    if (playPromise?.catch) playPromise.catch(() => {});
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

    return () => {
      correct.pause();
      incorrect.pause();
      correctRef.current = null;
      incorrectRef.current = null;
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
  };
};

const PixelPanel = ({ children, className = '' }) => (
  <div className={`border-4 border-[#43204f] bg-[#fff1be] text-[#201325] shadow-[6px_6px_0_#43204f] ${className}`}>
    {children}
  </div>
);

const GameCanvasGameSix = ({
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
  const settings = useMemo(() => getSettings(levelData), [levelData]);
  const guideContent = useMemo(
    () => buildGameSixGuideContent(levelData),
    [levelData],
  );
  const isTutorialLevel = Boolean(levelData?.isTutorialLevel);
  const [timeLeft, setTimeLeft] = useState(settings.seconds);
  const [drops, setDrops] = useState(() => {
    const firstDrop = makeDrop(settings.level, 1, [], 0, settings.rewardEvery);
    const secondDrop = settings.level >= 3 && firstDrop
      ? makeDrop(settings.level, 2, [firstDrop], 0, settings.rewardEvery)
      : null;
    return [firstDrop, secondDrop].filter(Boolean);
  });
  const [typed, setTyped] = useState('');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [cleared, setCleared] = useState(0);
  const [health, setHealth] = useState(settings.lives);
  const [mistakes, setMistakes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [finished, setFinished] = useState(false);
  const isFirstLevelGuide = settings.level === 1;
  const [showTutorial, setShowTutorial] = useState(showLevelGuideline);
  const [tutorialView, setTutorialView] = useState(
    showLevelGuideline ? 'guide' : null,
  );
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialCoachOpen, setTutorialCoachOpen] = useState(isTutorialLevel);
  const shouldPauseForTutorialCoach = Boolean(isTutorialLevel && tutorialCoachOpen);
  const showGuide = showTutorial && tutorialView === 'guide';

  useEffect(() => {
    if (Number(gameTutorialRequested) > 0 && !isTutorialLevel) {
      setTutorialView('tutorial');
      setShowTutorial(true);
    }
  }, [gameTutorialRequested, isTutorialLevel]);
  const playSfx = useArcadeAudio(gameSixMusic, sharedSfx, !showTutorial && !shouldPauseForTutorialCoach && !finished && !resultData);
  const { playCorrectAnswer, playIncorrectAnswer } = useAnswerSounds();
  const nextIdRef = useRef(3);
  const inputRef = useRef(null);

  const dropTuning = useMemo(() => (
    getDropTuning(settings.level, cleared, settings.rewardEvery)
  ), [cleared, settings.level, settings.rewardEvery]);
  const speedLevel = dropTuning.pressureLevel;
  const spawnMs = dropTuning.spawnMs;
  const handleContinueTutorialStep = () => {
    if (tutorialStepIndex === 0) {
      setTutorialStepIndex(1);
    }
    setTutorialCoachOpen(false);
    inputRef.current?.focus();
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

    const focusInput = () => inputRef.current?.focus({ preventScroll: true });
    const frameId = window.requestAnimationFrame(focusInput);

    return () => window.cancelAnimationFrame(frameId);
  }, [finished, resultData, shouldPauseForTutorialCoach, showTutorial]);

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
        if (items.length >= dropTuning.maxDrops) return items;

        const nextDrop = makeDrop(settings.level, nextIdRef.current, items, cleared, settings.rewardEvery);
        if (!nextDrop) return items;

        nextIdRef.current += 1;
        return [...items, nextDrop];
      });
    }, spawnMs);
    return () => window.clearInterval(id);
  }, [cleared, dropTuning.maxDrops, finished, resultData, settings.level, settings.rewardEvery, shouldPauseForTutorialCoach, showTutorial, spawnMs]);

  useEffect(() => {
    if (showTutorial || shouldPauseForTutorialCoach || finished || resultData) return undefined;
    const id = window.setInterval(() => {
      setDrops((items) => {
        let missed = 0;
        const next = items.map((item) => ({ ...item, y: item.y + item.speed })).filter((item) => {
          if (item.y >= 94) {
            missed += 1;
            return false;
          }
          return true;
        });
        if (missed > 0) {
          setStreak(0);
          setMistakes((value) => value + missed);
          setHealth((value) => {
            const nextHealth = value - missed;
            if (nextHealth <= 0) finish('FAILED', cleared, score, mistakes + missed);
            return Math.max(0, nextHealth);
          });
        }
        return next;
      });
    }, 28);
    return () => window.clearInterval(id);
  }, [cleared, finish, finished, mistakes, resultData, score, shouldPauseForTutorialCoach, showTutorial]);

  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    const answer = typed.trim().toLowerCase();
    if (!answer || showTutorial || shouldPauseForTutorialCoach || finished || resultData) return;

    const hit = drops.find((item) => item.word === answer);
    if (!hit) {
      playIncorrectAnswer();
      if (isTutorialLevel && tutorialStepIndex < 3) {
        setTutorialStepIndex(3);
        setTutorialCoachOpen(true);
      }
      setStreak(0);
      setMistakes((value) => value + 1);
      setHealth((value) => {
        const nextHealth = value - 1;
        if (nextHealth <= 0) finish('FAILED');
        return Math.max(0, nextHealth);
      });
      setTyped('');
      return;
    }

    const nextCleared = cleared + 1;
    const nextStreak = streak + 1;
    const awardNow = nextStreak >= settings.rewardEvery;
    const coinReward = awardNow ? 15 + (settings.level * 5) : 0;
    const nextCoins = coins + coinReward;
    const nextScore = score + 100 + (speedLevel * 8) + coinReward + Math.max(0, Math.round(90 - hit.y));

    playCorrectAnswer();
    playSfx();
    if (isTutorialLevel && tutorialStepIndex < 2) {
      setTutorialStepIndex(2);
      setTutorialCoachOpen(true);
    } else if (isTutorialLevel && awardNow && tutorialStepIndex < 4) {
      setTutorialStepIndex(4);
      setTutorialCoachOpen(true);
    }
    setDrops((items) => items.filter((item) => item.id !== hit.id));
    setCleared(nextCleared);
    setCoins(nextCoins);
    setScore(nextScore);
    setStreak(awardNow ? 0 : nextStreak);
    if (awardNow) {
      setHealth((value) => (value < settings.lives ? value + 1 : value));
    }
    setTyped('');

    if (nextCleared >= settings.targetWords) finish('COMPLETED', nextCleared, nextScore, mistakes);
  }, [cleared, coins, drops, finish, finished, isTutorialLevel, mistakes, playCorrectAnswer, playIncorrectAnswer, playSfx, resultData, score, settings.level, settings.lives, settings.rewardEvery, settings.targetWords, shouldPauseForTutorialCoach, showTutorial, speedLevel, streak, tutorialStepIndex, typed]);

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  return (
    <div className="game-six-shell min-h-[700px] w-full overflow-hidden border-4 border-[#32173b] bg-[#f8d994] p-3 text-[#201325] shadow-2xl" style={{ imageRendering: 'pixelated' }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-4 border-[#43204f] bg-[#ffe8aa] px-4 py-3 shadow-[4px_4px_0_#43204f]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide">Game 6</p>
          <h2 className="text-3xl font-bold text-[#4b235d]">{levelData?.title || 'Syntax Rain Typing'}</h2>
        </div>
        <div className="flex flex-wrap gap-3 text-lg font-semibold">
          <PixelPanel className="px-4 py-2">Level: {settings.level} <Star className="inline h-5 w-5 fill-yellow-300 text-yellow-500" /></PixelPanel>
          <PixelPanel className="game-six-coins-status px-4 py-2"><Coins className="inline h-5 w-5 text-yellow-500" /> Coins: {coins}</PixelPanel>
          <PixelPanel className="game-six-lives-status px-4 py-2"><Heart className="inline h-5 w-5 fill-red-500 text-red-600" /> Lives: {health}/{settings.lives}</PixelPanel>
          <PixelPanel className="px-4 py-2">Round: {cleared}/{settings.targetWords}</PixelPanel>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
        <aside className="space-y-4">
          <PixelPanel className="game-six-mission-panel p-4">
            <h3 className="mb-3 text-xl font-bold uppercase">Mission</h3>
            <p className="font-medium leading-snug">Type the falling programming terms before they reach the bottom.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <PixelPanel className="p-3 text-center"><Clock3 className="mx-auto h-6 w-6 text-green-700" /><strong className="block text-xl font-semibold">{minutes}:{seconds}</strong><span className="text-xs font-semibold">Timer</span></PixelPanel>
              <PixelPanel className="p-3 text-center"><Zap className="mx-auto h-6 w-6 text-yellow-600" /><strong className="block text-xl font-semibold">{speedLevel}</strong><span className="text-xs font-semibold">Speed</span></PixelPanel>
              <PixelPanel className="game-six-score-status p-3 text-center"><Star className="mx-auto h-6 w-6 fill-yellow-300 text-yellow-500" /><strong className="block text-xl font-semibold">{score}</strong><span className="text-xs font-semibold">Score</span></PixelPanel>
              <PixelPanel className="game-six-health-status p-3 text-center"><Heart className="mx-auto h-6 w-6 fill-red-500 text-red-600" /><strong className="block text-xl font-semibold">{health}</strong><span className="text-xs font-semibold">Health</span></PixelPanel>
            </div>
            <PixelPanel className="game-six-goal-status mt-4 p-3">
              <div className="flex items-center justify-between text-sm font-semibold"><span><Heart className="inline h-4 w-4 fill-red-500 text-red-600" /> Goal</span><span>{cleared}/{settings.targetWords}</span></div>
              <div className="mt-2 h-4 border-2 border-[#43204f] bg-[#43204f]/20">
                <div className="h-full bg-[#5a2a68]" style={{ width: `${Math.min(100, (cleared / settings.targetWords) * 100)}%` }} />
              </div>
            </PixelPanel>
          </PixelPanel>
          <PixelPanel className="p-4">
            <h3 className="mb-2 text-xl font-bold uppercase">Guide</h3>
            <p className="font-medium">Type the exact falling word and press Enter. Every {settings.rewardEvery} correct words gives coins and restores 1 health only if health is not full.</p>
          </PixelPanel>
          <button type="button" className="w-full border-4 border-[#43204f] bg-[#fff1be] px-5 py-3 text-xl font-semibold shadow-[4px_4px_0_#43204f] transition hover:bg-white" onClick={onExitRequest}>
            <LogOut className="inline h-5 w-5" /> Back
          </button>
        </aside>

        <main className="game-six-playfield relative min-h-[560px] overflow-hidden border-4 border-[#43204f] bg-gradient-to-b from-[#8e74c9] via-[#97a4d5] to-[#6a8f63] shadow-[5px_5px_0_#43204f]">
          <PixelPanel className="game-six-instruction absolute left-1/2 top-3 z-20 -translate-x-1/2 px-8 py-2 text-center text-lg font-semibold">
            <Keyboard className="inline h-5 w-5" /> Type the term then press Enter!
          </PixelPanel>
          <div className="absolute bottom-0 left-0 right-0 h-28 border-t-4 border-[#43204f] bg-[#4d4650]" />
          <div className="absolute bottom-24 left-16 h-28 w-20 border-4 border-[#43204f] bg-[#8b342e] shadow-[4px_4px_0_#43204f]" />
          <div className="absolute bottom-24 right-20 h-40 w-16 bg-[#315f3d]" />
          {drops.map((drop) => (
            <div
              key={drop.id}
              className="game-six-drop absolute z-10 w-[10.75rem] border-4 border-[#43204f] bg-[#fff1be] px-3 py-2 text-center text-xl font-semibold text-[#201325] shadow-[4px_4px_0_#43204f]"
              style={{ '--game-six-drop-x': `${drop.x}%`, left: `${drop.x}%`, top: `${drop.y}%` }}
            >
              {drop.word}
            </div>
          ))}
          <form onSubmit={handleSubmit} className="game-six-answer-form absolute bottom-14 left-1/2 z-20 flex w-[min(650px,86%)] -translate-x-1/2 gap-3">
            <input
              ref={inputRef}
              autoFocus
              className="min-w-0 flex-1 border-4 border-[#43204f] bg-[#fff1be] px-5 py-4 text-2xl font-medium text-[#201325] shadow-[4px_4px_0_#43204f] outline-none placeholder:text-[#8a7482]"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="type falling word..."
              inputMode="text"
              enterKeyHint="send"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={Boolean(resultData)}
            />
            <button type="submit" className="border-4 border-[#43204f] bg-[#5a2a68] px-10 py-4 text-2xl font-semibold text-[#fff1be] shadow-[4px_4px_0_#43204f] transition hover:brightness-110">Enter</button>
          </form>
          <PixelPanel className="absolute bottom-3 left-10 right-10 z-20 px-5 py-2 text-sm font-semibold">
            Combo: {streak}/{settings.rewardEvery} toward next reward
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
            gameType="GAME_SIX"
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
          steps={GAME_SIX_TUTORIAL_STEPS}
          stepIndex={tutorialStepIndex}
          stats={[
            { label: 'Terms', value: `${cleared}/${settings.targetWords}` },
            { label: 'Health', value: `${health}/${settings.lives}` },
          ]}
          onContinue={handleContinueTutorialStep}
        />
      )}

      {!hideResultOverlay && (resultData || isSubmitting) && renderScreenModal(
        <div className="game-two-result-overlay game-six-result-overlay">
          <div className="game-two-result-card game-six-result-card">
            {isSubmitting ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : <h3 className="game-two-result-title">{resultData?.result === 'COMPLETED' ? 'Rain Cleared' : 'System Failed'}</h3>}
            <p className="student-body-copy student-body-copy-tight">Score: {Number(gameplayData?.points || 0)} | Terms: {Number(gameplayData?.completedTasks || 0)}/{settings.targetWords}</p>
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

export default GameCanvasGameSix;
