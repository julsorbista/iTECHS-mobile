import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowUp,
  Bot,
  Gamepad2,
  Keyboard,
  Loader2,
  LogOut,
  Sparkles,
  Target,
} from "lucide-react";
import { handleAPIError, levelAPI } from "../../utils/api";
import { GAME_TYPE_ORDER, normalizeGameType } from "../../utils/gameTracks";
import { useAuth } from "../../context/AuthContext";
import GameOnePlayMode from "../../games/game-one/ui/GameOnePlayMode";
import GameCanvasGameTwo from "../../games/game-two/ui/GameCanvasGameTwo";
import {
  buildGameTwoRunTasks,
  preserveConfiguredAssemblyTasks,
} from "../../games/game-two/data/questionBank";
import GameCanvasGameThree from "../../games/game-three/ui/GameCanvasGameThree";
import GameCanvasGameFour from "../../games/game-four/ui/GameCanvasGameFour";
import GameCanvasGameFive from "../../games/game-five/ui/GameCanvasGameFive";
import GameCanvasGameSix from "../../games/game-six/ui/GameCanvasGameSix";
import StudentActionButton from "./StudentActionButton";
import StudentShell from "./StudentShell";
import { buildSubmissionPayload as buildGameOneSubmissionPayload } from "../../games/game-one/systems/progressBridge";
import {
  applyGameOneAiContent,
  buildGameOneAiContentRequest,
  buildSafeGameOneFallbackContent,
} from "../../games/game-one/systems/aiLearningContent";
import { randomizeGameOneJumbledWords } from "../../games/game-one/systems/jumbledWordRandomizer";
import { buildSubmissionPayload as buildGameTwoSubmissionPayload } from "../../games/game-two/systems/progressBridge";
import { buildSubmissionPayload as buildGameThreeSubmissionPayload } from "../../games/game-three/systems/progressBridge";
import { buildSubmissionPayload as buildGameFourSubmissionPayload } from "../../games/game-four/systems/progressBridge";
import { buildProgrammingSubmissionPayload } from "../../games/shared/programmingProgressBridge";
import { getUserCoinBalance } from "../../games/shared/gameSessionPersistence";
import studentMenuBackground from "../../../assets/Game/game_one/Background/background_menu.avif";
import StudentStoryFrame from "./StudentStoryFrame";
import CongratulatoryOverlay from "../../games/shared/ui/CongratulatoryOverlay";
import ResultOverlay from "../../games/game-one/ui/ResultOverlay";
import GameLoadingOverlay from "../../games/shared/ui/GameLoadingOverlay";
import {
  getLevelStoryBriefing,
  getLevelStoryCompletion,
} from "../../utils/storyline";

const LEVEL_LOADING_TIPS = Object.freeze([
  {
    title: "Game One",
    body: "Explore each room, answer the Java questions, and use the clues to find the Lost Java Treasure.",
  },
  {
    title: "Game Two",
    body: "Read the Java Code guide, slice the correct gold syntax cards in order, and avoid bombs or red decoys.",
  },
  {
    title: "Game Three",
    body: "Flip cards and match the programming concept pairs. Mismatches do not deduct score.",
  },
  {
    title: "Game Four",
    body: "Catch only the needed Java variable tokens, then assemble them in the correct order.",
  },
  {
    title: "Game Five",
    body: "Use the clue, guess only the best letters, and keep the robot online.",
  },
  {
    title: "Game Six",
    body: "Type the falling term exactly, then press Enter before it reaches the ground.",
  },
]);

const GAME_LOADING_TIPS = Object.freeze({
  GAME_ONE: [LEVEL_LOADING_TIPS[0]],
  GAME_TWO: [LEVEL_LOADING_TIPS[1]],
  GAME_THREE: [LEVEL_LOADING_TIPS[2]],
  GAME_FOUR: [LEVEL_LOADING_TIPS[3]],
  GAME_FIVE: [LEVEL_LOADING_TIPS[4]],
  GAME_SIX: [LEVEL_LOADING_TIPS[5]],
});

const LEVEL_NUMBER_WORDS = Object.freeze([
  'ZERO',
  'ONE',
  'TWO',
  'THREE',
  'FOUR',
  'FIVE',
  'SIX',
  'SEVEN',
  'EIGHT',
  'NINE',
  'TEN',
]);

const getLoadingLevelLabel = (levelNumber) => {
  const parsedLevelNumber = Math.max(1, Math.round(Number(levelNumber) || 1));
  return `Loading Level ${LEVEL_NUMBER_WORDS[parsedLevelNumber] || parsedLevelNumber}`;
};

const getLevelObjective = (levelData, normalizedGameType) => {
  if (levelData?.objective) {
    return levelData.objective;
  }

  if (levelData?.subtitle) {
    return levelData.subtitle;
  }

  if (Array.isArray(levelData?.rooms)) {
    return (
      levelData.rooms.find((room) => room?.objective)?.objective ||
      "Clear each room objective and reach the portal to finish the level."
    );
  }

  if (normalizedGameType === "GAME_TWO") {
    return "Slice the correct Java syntax cards in order, complete the required outputs, and avoid bombs or decoys.";
  }

  if (normalizedGameType === "GAME_THREE") {
    return "Match every card pair before your flip attempts run out.";
  }

  if (normalizedGameType === "GAME_FOUR") {
    return "Catch the right Java variable tokens, spend coins for hints, and assemble each declaration correctly.";
  }

  if (normalizedGameType === "GAME_FIVE") {
    return "Guess each programming word from the clue before your robot runs out of power.";
  }

  if (normalizedGameType === "GAME_SIX") {
    return "Type the falling programming terms before they hit the ground and drain your health.";
  }

  return "Complete the level objective and reach the exit portal.";
};

const getUserDisplay = (user) => {
  if (!user) {
    return {
      label: "Player",
      handle: "@player",
    };
  }

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const label = fullName || user.username || user.email || "Player";
  const handle = user.username
    ? `@${user.username}`
    : user.email || "Student account";

  return { label, handle };
};

const getGameFiveDisplayTitle = (title) => {
  if (typeof title !== "string" || title.trim().length === 0) {
    return "Code Robot";
  }

  return title.replace(/code snowman/gi, "Code Robot");
};

const createRunToken = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const GAME_ONE_NEXT_LEVEL_MIN_STARS = 2;

const getNextGameType = (normalizedGameType) => {
  const currentIndex = GAME_TYPE_ORDER.indexOf(normalizedGameType);

  if (currentIndex < 0) {
    return null;
  }

  return GAME_TYPE_ORDER[currentIndex + 1] || null;
};

const StudentGameOverlay = ({
  gameType,
  levelNumber,
  onClose,
  onProgressSync,
  onContinueToGame,
  onAdvanceToLevel,
  forceFullReloadOnAdvance = false,
}) => {
  const { user, logout } = useAuth();
  const normalizedGameType = normalizeGameType(gameType);
  const [currentLevelNumber, setCurrentLevelNumber] = useState(
    Number(levelNumber),
  );
  const numericLevelNumber = Number(currentLevelNumber);

  const [sessionInfo, setSessionInfo] = useState(null);
  const [levelData, setLevelData] = useState(null);
  const [starting, setStarting] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [startError, setStartError] = useState("");
  const [loadingTipIndex, setLoadingTipIndex] = useState(0);
  const [runToken, setRunToken] = useState(() => createRunToken());
  const [runtimeBootReady, setRuntimeBootReady] = useState(false);
  const [gameplayData, setGameplayData] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [showCongratsOverlay, setShowCongratsOverlay] = useState(false);
  const [hasDismissedCongrats, setHasDismissedCongrats] = useState(false);
  const [showCompletionStory, setShowCompletionStory] = useState(false);
  const [completionStoryPageIndex, setCompletionStoryPageIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nextLevelAvailable, setNextLevelAvailable] = useState(false);
  const [nextLevelStatus, setNextLevelStatus] = useState("unknown");
  const [sharedCoinBalance, setSharedCoinBalance] = useState(() =>
    getUserCoinBalance(user?.id),
  );
  const [autoShowGameTutorial, setAutoShowGameTutorial] = useState(false);
  const [continueToTutorialAfterGuide, setContinueToTutorialAfterGuide] =
    useState(false);
  const [gameTutorialRequest, setGameTutorialRequest] = useState(0);
  const [gameGuidelinesRequest, setGameGuidelinesRequest] = useState(0);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1440,
    height: typeof window !== "undefined" ? window.innerHeight : 900,
  }));
  const gameOneCanvasRef = useRef(null);
  const gameOverlayRef = useRef(null);
  const runStartedAtRef = useRef(Date.now());

  const isGameOne = normalizedGameType === "GAME_ONE";
  const isGameTwo = normalizedGameType === "GAME_TWO";
  const isGameThree = normalizedGameType === "GAME_THREE";
  const isGameFour = normalizedGameType === "GAME_FOUR";
  const isGameFive = normalizedGameType === "GAME_FIVE";
  const shouldShowLevelGuideline = numericLevelNumber === 1;

  useEffect(() => {
    if (!showCongratsOverlay || !isGameThree) return;

    const overlay = gameOverlayRef.current;
    if (overlay) {
      overlay.scrollTop = 0;
      overlay.scrollLeft = 0;
    }
  }, [isGameThree, showCongratsOverlay]);
  const isGameSix = normalizedGameType === "GAME_SIX";

  useEffect(() => {
    setAutoShowGameTutorial(false);
    setContinueToTutorialAfterGuide(false);
    setGameTutorialRequest(0);
    setGameGuidelinesRequest(0);
  }, [numericLevelNumber, normalizedGameType]);

  useEffect(() => {
    runStartedAtRef.current = Date.now();
  }, [sessionInfo?.sessionId]);

  const isSidebarLayout = isGameTwo || isGameThree;
  const isArcadeCanvas = isGameFour || isGameFive || isGameSix;
  const isProgrammingArcade = isGameFive || isGameSix;
  const isGameFiveGameplay = isGameFive && !starting;
  const showSidebarPanel = false;
  const hasSidebarPanel = isSidebarLayout && showSidebarPanel;
  const activeLevelData = levelData;
  const activeLevelTitle = isGameFive
    ? getGameFiveDisplayTitle(activeLevelData?.title)
    : activeLevelData?.title;
  const activeRunKey = `${sessionInfo?.sessionId || "pending"}-level`;
  const activeLevelLabel = `Level ${String(numericLevelNumber).padStart(2, "0")}`;
  const levelObjective = getLevelObjective(activeLevelData, normalizedGameType);
  const storyBriefing = getLevelStoryBriefing(
    normalizedGameType,
    numericLevelNumber,
    activeLevelData || {},
  );
  const storyBriefingContent = storyBriefing || {
    kicker: `Mission ${String(numericLevelNumber || 1).padStart(2, "0")}`,
    body: activeLevelData?.subtitle || levelObjective,
  };
  const completionStory = getLevelStoryCompletion(
    normalizedGameType,
    numericLevelNumber,
    activeLevelData || {},
  );
  const nextGameType = getNextGameType(normalizedGameType);
  const canContinueToNextGame = Boolean(
    nextLevelStatus === "unavailable" && nextGameType,
  );
  const canFinishQuest = Boolean(
    nextLevelStatus === "unavailable" && !nextGameType,
  );
  const backendUnlockedNextLevel = Boolean(
    resultData?.result === "COMPLETED" && resultData?.unlockedNextLevel,
  );
  const currentRunStarsEarned = Number(resultData?.starsEarned || 0);
  const meetsGameOneAdvanceRequirement =
    !isGameOne || currentRunStarsEarned >= GAME_ONE_NEXT_LEVEL_MIN_STARS;
  const isFinalGameLevel = numericLevelNumber >= (isGameThree ? 10 : 5);
  const effectiveNextLevelAvailable = Boolean(
    (nextLevelAvailable || backendUnlockedNextLevel) &&
    meetsGameOneAdvanceRequirement &&
    !isFinalGameLevel,
  );
  const canAdvanceLevel = Boolean(
    resultData?.result === "COMPLETED" &&
    !isFinalGameLevel &&
    (effectiveNextLevelAvailable ||
      (!isGameTwo && (canContinueToNextGame || canFinishQuest))),
  );
  const completionPrimaryLabel = effectiveNextLevelAvailable
    ? completionStory?.buttonLabel
    : canContinueToNextGame
      ? "Continue to Next Mission"
      : "Finish iTECHS Core Quest";
  const hintCoinCost = 1;
  const userDisplay = useMemo(() => getUserDisplay(user), [user]);
  const userInitial = userDisplay.label.trim().charAt(0).toUpperCase() || "P";
  useEffect(() => {
    setSharedCoinBalance(getUserCoinBalance(user?.id));
  }, [user?.id]);
  const completionPopupKicker = "Level Complete";
  const completionPopupTitle = "Congratulations";
  const completionPopupMessage = useMemo(
    () =>
      `You completed ${activeLevelTitle || `Level ${String(numericLevelNumber).padStart(2, "0")}`}. Great job!`,
    [activeLevelTitle, numericLevelNumber],
  );
  const shouldShowCongratsForCompletion = useMemo(() => {
    if (resultData?.result !== "COMPLETED") {
      return false;
    }

    if (isGameThree) {
      const totalPairs = Math.max(0, Number(gameplayData?.totalPairs || 0));
      const matchedPairs = Math.max(0, Number(gameplayData?.matchedPairs || 0));
      return totalPairs > 0 && matchedPairs >= totalPairs;
    }

    return true;
  }, [
    gameplayData?.matchedPairs,
    gameplayData?.totalPairs,
    isGameThree,
    resultData?.result,
  ]);
  const gameThreeViewportWidth =
    hasSidebarPanel && viewportSize.width >= 1180
      ? Math.max(360, viewportSize.width - 470)
      : Math.max(320, viewportSize.width - 120);

  const controlsText = useMemo(
    () =>
      isGameTwo
        ? [
            { label: "Drag parts", Icon: Gamepad2 },
            { label: "Drop to slot", Icon: ArrowUp },
            { label: "Answer quiz", Icon: Sparkles },
          ]
        : isGameThree
          ? [
              { label: "Flip cards", Icon: Gamepad2 },
              { label: "Match pairs", Icon: Sparkles },
              { label: "Remember positions", Icon: Target },
            ]
          : isGameFour
            ? [
                { label: "Move catcher", Icon: Gamepad2 },
                { label: "Catch tokens", Icon: ArrowUp },
                { label: "Build code", Icon: Sparkles },
              ]
            : isGameFive
              ? [
                  { label: "Guess letters", Icon: Gamepad2 },
                  { label: "Use hint", Icon: Sparkles },
                  { label: "Keep robot online", Icon: Bot },
                ]
              : isGameSix
                ? [
                    { label: "Type terms", Icon: Keyboard },
                    { label: "Press Enter", Icon: ArrowUp },
                    { label: "Keep combo alive", Icon: Sparkles },
                  ]
                : [
                    { label: "Move", Icon: Gamepad2 },
                    { label: "Jump", Icon: ArrowUp },
                    { label: "Dash (Shift)", Icon: Target },
                    { label: "Attack (J)", Icon: Sparkles },
                  ],
    [isGameFive, isGameFour, isGameSix, isGameThree, isGameTwo],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!starting) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setLoadingTipIndex((current) => current + 1);
    }, 2600);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [starting]);

  useEffect(() => {
    setCurrentLevelNumber(Number(levelNumber));
    setGameplayData(null);
    setResultData(null);
    setShowCongratsOverlay(false);
    setHasDismissedCongrats(false);
    setShowCompletionStory(false);
    setCompletionStoryPageIndex(0);
    setStartError("");
    setRunToken(createRunToken());
    setRuntimeBootReady(false);
    setNextLevelStatus("unknown");
  }, [levelNumber]);

  useEffect(() => {
    if (shouldShowCongratsForCompletion) {
      setShowCongratsOverlay(true);
      return;
    }

    setShowCongratsOverlay(false);
  }, [shouldShowCongratsForCompletion]);

  useEffect(() => {
    if (!backendUnlockedNextLevel) {
      return;
    }

    setNextLevelAvailable(true);
    setNextLevelStatus("available");
  }, [backendUnlockedNextLevel]);

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!normalizedGameType) {
      setLevelData(null);
      setSessionInfo(null);
      setStarting(false);
      setStartError("That level is not available yet.");
      return undefined;
    }

    let cancelled = false;

    const prepareLevel = async () => {
      try {
        setStarting(true);
        setLoadingProgress(10);
        setLoadingTipIndex(0);
        setStartError("");
        setSessionInfo(null);
        setLevelData(null);
        setNextLevelAvailable(false);
        setNextLevelStatus("unknown");
        const contentResponse = await levelAPI.getPlayableLevelContent(
          normalizedGameType,
          numericLevelNumber,
          {
            runToken,
            prefetch: normalizedGameType === "GAME_ONE",
          },
        );

        if (cancelled) {
          return;
        }

        if (
          contentResponse.status !== "success" ||
          !contentResponse.data?.levelData
        ) {
          throw new Error("That level is not available yet.");
        }

        let resolvedLevelData = contentResponse.data.levelData;
        setLoadingProgress(40);
        if (normalizedGameType === "GAME_ONE") {
          resolvedLevelData = randomizeGameOneJumbledWords(
            resolvedLevelData,
            runToken,
          );
          const aiContentRequest = buildGameOneAiContentRequest(
            resolvedLevelData,
            runToken,
          );
          if (aiContentRequest.items.length > 0) {
            try {
              const generatedResponse = await levelAPI.generateGameQuestions(
                "GAME_ONE",
                numericLevelNumber,
                aiContentRequest,
              );
              const generatedContent = generatedResponse?.status === "success" && generatedResponse.data?.items
                ? generatedResponse.data
                : buildSafeGameOneFallbackContent(aiContentRequest);
              resolvedLevelData = applyGameOneAiContent(
                resolvedLevelData,
                aiContentRequest,
                generatedContent,
              );
            } catch {
              resolvedLevelData = applyGameOneAiContent(
                resolvedLevelData,
                aiContentRequest,
                buildSafeGameOneFallbackContent(aiContentRequest),
              );
            }
          }
        }
        if (
          normalizedGameType === "GAME_TWO" &&
          Array.isArray(resolvedLevelData.tasks) &&
          resolvedLevelData.tasks.length > 0
        ) {
          const configuredTasks = resolvedLevelData.tasks;
          const fallbackTasks = buildGameTwoRunTasks(
            resolvedLevelData,
            configuredTasks.length,
          );
          let generatedTasks = fallbackTasks;
          let generationSource = "fallback";
          try {
            const generatedResponse = await levelAPI.generateGameQuestions(
              "GAME_TWO",
              numericLevelNumber,
              {
                count: fallbackTasks.length,
                objective: resolvedLevelData.objective,
                fallbackTasks,
                variationSeed: runToken,
              },
            );
            if (
              generatedResponse?.status === "success" &&
              Array.isArray(generatedResponse.data?.tasks) &&
              generatedResponse.data.tasks.length === fallbackTasks.length
            ) {
              generatedTasks = generatedResponse.data.tasks;
              generationSource = generatedResponse.data.source || "ai";
            }
          } catch {
            // The randomized local task set remains playable when AI is unavailable.
          }
          generatedTasks = preserveConfiguredAssemblyTasks(
            configuredTasks,
            generatedTasks,
          );
          resolvedLevelData = {
            ...resolvedLevelData,
            tasks: generatedTasks,
            taskGenerationSource: generationSource,
            taskVariationSeed: runToken,
          };
        }
        if (cancelled) {
          return;
        }
        setLevelData(resolvedLevelData);
        setLoadingProgress(65);
        levelAPI
          .getPlayableLevelContent(normalizedGameType, numericLevelNumber + 1, {
            prefetch: true,
          })
          .then((nextContentResult) => {
            if (!cancelled) {
              const hasNextLevel = Boolean(
                nextContentResult?.status === "success" &&
                nextContentResult?.data?.levelData,
              );
              setNextLevelAvailable(hasNextLevel);
              setNextLevelStatus(hasNextLevel ? "available" : "unavailable");
            }
          })
          .catch(() => {
            if (!cancelled) {
              setNextLevelAvailable(false);
              setNextLevelStatus("unavailable");
            }
          });

        const sessionResponse = await levelAPI.startLevelSession(
          normalizedGameType,
          numericLevelNumber,
        );

        if (!cancelled && sessionResponse.status === "success") {
          setSessionInfo(sessionResponse.data);
          setLoadingProgress(85);
          const shouldShowFirstPlayTutorial = Boolean(
            numericLevelNumber === 1 && sessionResponse.data?.isFirstGamePlay,
          );
          setAutoShowGameTutorial(shouldShowFirstPlayTutorial);
          setContinueToTutorialAfterGuide(shouldShowFirstPlayTutorial);
        }
      } catch (error) {
        if (!cancelled) {
          const errorInfo = handleAPIError(error);
          setStartError(errorInfo.message);
          toast.error(errorInfo.message);
        }
      } finally {
        if (!cancelled) {
          setStarting(false);
        }
      }
    };

    prepareLevel();

    return () => {
      cancelled = true;
    };
  }, [normalizedGameType, numericLevelNumber, runToken]);

  const frameSize = useMemo(() => {
    if (!activeLevelData) {
      return { width: 0, height: 0 };
    }

    const viewportWidth = Math.max(
      1,
      Number(activeLevelData?.viewport?.width) || 1280,
    );
    const viewportHeight = Math.max(
      1,
      Number(activeLevelData?.viewport?.height) || 720,
    );
    const aspectRatio = viewportWidth / viewportHeight;
    const horizontalGutter = hasSidebarPanel
      ? viewportSize.width >= 1100
        ? 420
        : 120
      : viewportSize.width > viewportSize.height && viewportSize.height <= 640
        ? 24
        : 48;
    const verticalGutter = hasSidebarPanel
      ? 160
      : viewportSize.width > viewportSize.height && viewportSize.height <= 640
        ? 48
        : 96;
    const availableWidth = Math.max(320, viewportSize.width - horizontalGutter);
    const availableHeight = Math.max(240, viewportSize.height - verticalGutter);
    const width = Math.min(availableWidth, availableHeight * aspectRatio);

    return {
      width,
      height: width / aspectRatio,
    };
  }, [activeLevelData, hasSidebarPanel, viewportSize]);

  const handleExitRequest = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleLogout = useCallback(() => {
    onClose?.();
    logout();
  }, [logout, onClose]);

  const submitOutcome = useCallback(
    async (gameplay) => {
      if (!sessionInfo || isSubmitting || resultData) {
        return;
      }

      setGameplayData({
        ...gameplay,
        elapsedMs: Number.isFinite(Number(gameplay?.elapsedMs))
          ? Number(gameplay.elapsedMs)
          : Math.max(0, Date.now() - runStartedAtRef.current),
      });

      // These games have already completed locally at this point. Show the required
      // congratulations -> results sequence immediately, then replace this
      // snapshot with the authoritative server result when submission returns.
      const shouldShowImmediateCompletion =
        (isGameOne || isGameTwo || isGameFour || isGameSix) &&
        gameplay?.outcome === "COMPLETED";
      if (shouldShowImmediateCompletion) {
        setHasDismissedCongrats(false);
        setShowCompletionStory(false);
        setShowCongratsOverlay(true);
        setResultData({
          result: "COMPLETED",
          finalScore: Number(gameplay?.points || 0),
          starsEarned: Math.max(1, Number(gameplay?.starsEarned || 3)),
          unlockedNextLevel: false,
        });
      }

      setIsSubmitting(true);

      try {
        const submissionPayload = isGameTwo
          ? buildGameTwoSubmissionPayload(gameplay)
          : isGameThree
            ? buildGameThreeSubmissionPayload(gameplay, sessionInfo)
            : isGameFour
              ? buildGameFourSubmissionPayload({ ...gameplay, levelNumber: numericLevelNumber })
              : isProgrammingArcade
                ? buildProgrammingSubmissionPayload(gameplay)
                : buildGameOneSubmissionPayload(gameplay);

        const response = await levelAPI.submitLevelSession(
          normalizedGameType,
          sessionInfo.levelNumber,
          sessionInfo.sessionId,
          submissionPayload,
        );

        if (response.status === "success") {
          setResultData(
            shouldShowImmediateCompletion
              ? { ...response.data, result: "COMPLETED" }
              : response.data,
          );
          onProgressSync?.(response.data);
          toast.success(
            response.data.result === "COMPLETED"
              ? isGameTwo
                ? `Level cleared. Points: ${Number(gameplay?.points || 0)} | Stars earned: ${response.data.starsEarned}`
                : `Level cleared. Stars earned: ${response.data.starsEarned}`
              : "Attempt recorded. Retry the level to keep progressing.",
          );
        }
      } catch (error) {
        toast.error(handleAPIError(error).message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isGameFour,
      isGameOne,
      isGameSix,
      isGameThree,
      isGameTwo,
      isProgrammingArcade,
      isSubmitting,
      normalizedGameType,
      onProgressSync,
      resultData,
      sessionInfo,
    ],
  );

  const handleRetry = useCallback(() => {
    setGameplayData(null);
    setResultData(null);
    setShowCongratsOverlay(false);
    setHasDismissedCongrats(false);
    setShowCompletionStory(false);
    setCompletionStoryPageIndex(0);
    setStartError("");
    setSessionInfo(null);
    setLevelData(null);
    setStarting(true);
    setRunToken(createRunToken());
    setRuntimeBootReady(false);
    setNextLevelStatus("unknown");
  }, []);

  const advanceToNextLevel = useCallback(() => {
    if (!effectiveNextLevelAvailable) {
      if (canContinueToNextGame) {
        onContinueToGame?.(nextGameType);
      } else if (canFinishQuest) {
        onClose?.();
      }

      return;
    }

    const nextLevelNumber = numericLevelNumber + 1;
    const nextLevelPath = `/student/games/${normalizedGameType}/levels/${nextLevelNumber}/play`;

    if (forceFullReloadOnAdvance && typeof window !== "undefined" && !window.Capacitor?.isNativePlatform?.() && !window.location.hash.startsWith("#/")) {
      window.location.assign(nextLevelPath);
      return;
    }

    if (typeof onAdvanceToLevel === "function") {
      onAdvanceToLevel(nextLevelNumber);
      return;
    }

    setGameplayData(null);
    setResultData(null);
    setShowCongratsOverlay(false);
    setHasDismissedCongrats(false);
    setShowCompletionStory(false);
    setStartError("");
    setSessionInfo(null);
    setLevelData(null);
    setStarting(true);
    setCurrentLevelNumber(nextLevelNumber);
    setRuntimeBootReady(false);
    setNextLevelStatus("unknown");
  }, [
    canContinueToNextGame,
    canFinishQuest,
    effectiveNextLevelAvailable,
    forceFullReloadOnAdvance,
    nextGameType,
    normalizedGameType,
    numericLevelNumber,
    onAdvanceToLevel,
    onClose,
    onContinueToGame,
  ]);

  const handleNextLevel = useCallback(() => {
    if (
      !nextLevelAvailable &&
      !backendUnlockedNextLevel &&
      !canContinueToNextGame &&
      !canFinishQuest
    ) {
      return;
    }

    if (
      !isGameTwo &&
      !isGameThree &&
      resultData?.result === "COMPLETED" &&
      completionStory
    ) {
      setCompletionStoryPageIndex(0);
      setShowCompletionStory(true);
      return;
    }

    advanceToNextLevel();
  }, [
    advanceToNextLevel,
    backendUnlockedNextLevel,
    canContinueToNextGame,
    canFinishQuest,
    completionStory,
    isGameThree,
    isGameTwo,
    nextLevelAvailable,
    resultData,
  ]);

  const handleDismissCongrats = useCallback(() => {
    setShowCongratsOverlay(false);
    setHasDismissedCongrats(true);
  }, []);

  const loadingTips = GAME_LOADING_TIPS[normalizedGameType] || GAME_LOADING_TIPS.GAME_ONE;
  const activeLoadingTip = loadingTips[loadingTipIndex % loadingTips.length];

  return (
    <motion.div
      ref={gameOverlayRef}
      className={`student-game-overlay ${
        isGameOne ? "student-game-overlay-game-one" : ""
      } ${
        isGameTwo || isGameThree ? "student-game-overlay-game-two-scroll" : ""
      } ${isGameTwo ? "student-game-overlay-game-two-active" : ""} ${
        showCongratsOverlay ? "student-game-overlay-congrats-open" : ""
      } ${isGameFour ? "student-game-overlay-game-four-scroll" : ""} ${
        isGameFiveGameplay ? "student-game-overlay-game-five" : ""
      } ${
        isGameSix ? "student-game-overlay-game-six" : ""
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={isGameSix ? { background: '#1c1c1c' } : undefined}
    >
      <StudentShell
        bare={isGameSix}
        backgroundImage={isGameFiveGameplay || isGameSix ? null : studentMenuBackground}
        className={`student-shell-overlay ${
          normalizedGameType === "GAME_ONE" ? "student-shell-warm" : ""
        } ${isGameFiveGameplay ? "student-shell-game-five" : ""} ${
          isGameSix ? "student-shell-overlay-game-six" : ""
        }`}
        style={isGameSix ? { background: '#1c1c1c', padding: 0 } : undefined}
      >
        <main
          className={`student-shell-main ${
            isSidebarLayout ? "student-shell-main-game-three" : ""
          } ${isGameTwo ? "student-shell-main-game-two" : ""} ${
            starting ? "student-shell-main-loading" : ""
          }`}
          style={isGameSix ? { background: '#1c1c1c' } : undefined}
        >
          {!starting &&
          sessionInfo &&
          activeLevelData &&
          !isGameThree &&
          !isGameSix && !isGameFive ? (
            isGameOne ? null : isGameFour ? (
              <div className="student-game-four-top-controls" aria-label="Game 4 controls">
                <button
                  type="button"
                  className="student-preview-chip student-game-four-back-chip transition hover:brightness-95"
                  onClick={onClose}
                >
                  Back
                </button>
              </div>
            ) : (
              <div className={isGameOne ? "student-game-one-top-controls" : "flex flex-wrap justify-end gap-2"}>
                {isGameOne && (
                  <button
                    type="button"
                    className="student-preview-chip student-game-tutorial-test-button transition hover:brightness-95"
                    onClick={() => setGameGuidelinesRequest((request) => request + 1)}
                  >
                    Guidelines
                  </button>
                )}
                <button
                  type="button"
                  className="student-preview-chip student-game-tutorial-test-button transition hover:brightness-95"
                  onClick={() => setGameTutorialRequest((request) => request + 1)}
                >
                  Game Tutorial
                </button>
              </div>
            )
          ) : null}
          {starting ? null : startError || !sessionInfo || !activeLevelData ? (
            <section className="student-panel student-empty-panel student-panel-full">
              <span className="student-card-icon student-icon-slate">
                <Target className="h-6 w-6" />
              </span>
              <h2 className="student-section-title">Level Unavailable</h2>
              <p className="student-body-copy">
                {startError || "This level cannot be played right now."}
              </p>
              <StudentActionButton
                variant="slate"
                className="student-button-inline"
                onClick={onClose}
              >
                Return
              </StudentActionButton>
            </section>
          ) : isSidebarLayout ? (
            <section
              className={`student-game-three-overlay-layout ${!hasSidebarPanel ? "student-game-three-overlay-layout-full" : ""}`}
            >
              {hasSidebarPanel && (
                <aside
                  className={`student-panel student-game-three-sidebar ${isGameTwo ? "student-game-sidebar-compact" : ""}`}
                >
                  <div className="student-game-three-sidebar-block">
                    <p className="student-eyebrow">{sessionInfo.gameType}</p>
                    <h2 className="student-section-title">{activeLevelTitle}</h2>
                    <p className="student-body-copy student-body-copy-tight">
                      {activeLevelData.subtitle || levelObjective}
                    </p>
                  </div>

                  <div className="student-game-three-sidebar-actions">
                    <StudentActionButton
                      variant="sky"
                      size="compact"
                      onClick={onClose}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Levels
                    </StudentActionButton>
                    {!isGameTwo && (
                      <StudentActionButton
                        variant="slate"
                        size="compact"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </StudentActionButton>
                    )}
                  </div>

                  {!isGameTwo && (
                    <div
                      className="student-profile-chip"
                      title={userDisplay.label}
                    >
                      <span className="student-profile-avatar">
                        {userInitial}
                      </span>
                      <div className="student-profile-copy">
                        <span className="student-profile-label">
                          {userDisplay.label}
                        </span>
                        <span className="student-profile-handle">
                          {userDisplay.handle}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="student-game-three-sidebar-grid">
                    <div className="student-inline-summary-card">
                      <span className="student-inline-summary-label">
                        retry
                      </span>
                      <span className="student-inline-summary-value">
                        x{sessionInfo.retryMultiplier}
                      </span>
                    </div>
                    <div className="student-inline-summary-card">
                      <span className="student-inline-summary-label">
                        level
                      </span>
                      <span className="student-inline-summary-value">
                        {String(numericLevelNumber).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="student-inline-summary-card">
                      <span className="student-inline-summary-label">
                        {isGameTwo ? "parts" : "pairs"}
                      </span>
                      <span className="student-inline-summary-value">
                        {isGameTwo
                          ? Array.isArray(activeLevelData?.slots)
                            ? activeLevelData.slots.length
                            : 0
                          : Array.isArray(activeLevelData?.pairs)
                            ? activeLevelData.pairs.length
                            : 0}
                      </span>
                    </div>
                    <div className="student-inline-summary-card">
                      <span className="student-inline-summary-label">
                        {isGameTwo ? "hint" : "next"}
                      </span>
                      <span className="student-inline-summary-value">
                        {isGameTwo
                          ? `${hintCoinCost} coin${hintCoinCost === 1 ? "" : "s"}`
                          : nextLevelAvailable
                            ? "ready"
                            : "none"}
                      </span>
                    </div>
                  </div>

                  <div className="student-game-three-sidebar-block">
                    <p className="student-eyebrow">Objective</p>
                    <p className="student-body-copy student-body-copy-tight">
                      {levelObjective}
                    </p>
                  </div>

                  <div className="student-game-three-sidebar-block">
                    <p className="student-eyebrow">Controls</p>
                    <div className="student-game-three-sidebar-controls">
                      {controlsText.map(({ label, Icon }) => (
                        <span
                          key={label}
                          className="student-game-three-control-item"
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </aside>
              )}

              <section
                className={`student-panel student-game-three-frame-panel ${
                  isGameTwo ? "student-game-two-frame-panel" : ""
                }`}
                style={
                  isGameTwo || isGameThree
                    ? {
                        padding: 0,
                        background: "transparent",
                        boxShadow: "none",
                        border: "none",
                      }
                    : {}
                }
              >
                {isGameTwo ? (
                  <div
                    className="student-game-frame-wrap student-game-frame-wrap-scrollable student-game-two-frame-wrap"
                    style={{
                      width: "100%",
                      height: "100%",
                      minHeight: 0,
                      display: "flex",
                      alignItems: "stretch",
                      justifyContent: "stretch",
                    }}
                  >
                    <div
                      className="student-game-frame-shell student-game-frame-shell-fluid student-game-two-frame-shell"
                      style={{
                        width: "100%",
                        height: "100%",
                        maxWidth: "100%",
                        minHeight: 0,
                      }}
                    >
                      <GameCanvasGameTwo
                        key={activeRunKey}
                        levelData={activeLevelData}
                        onLevelComplete={submitOutcome}
                        onLevelFail={submitOutcome}
                        onExitRequest={handleExitRequest}
                        resultData={resultData}
                        gameplayData={gameplayData}
                        isSubmitting={isSubmitting}
                        canAdvanceLevel={canAdvanceLevel}
                        hideResultOverlay
                        onRetry={handleRetry}
                        onBack={onClose}
                        onNextLevel={handleNextLevel}
                        hintCoinCost={hintCoinCost}
                        freeMistakes={sessionInfo.policy?.freeMistakes ?? 3}
                        hintStarCost={sessionInfo.policy?.hintStarCost ?? 1}
                        playerId={user?.id || "guest"}
                        initialCoins={sharedCoinBalance}
                        onCoinBalanceChange={setSharedCoinBalance}
                        suppressIntroTutorial={!autoShowGameTutorial}
                        showLevelGuideline={shouldShowLevelGuideline}
                        continueToTutorialAfterGuide={
                          continueToTutorialAfterGuide
                        }
                        gameTutorialRequested={gameTutorialRequest}
                        autoFirstHandGuide={Boolean(autoShowGameTutorial)}
                      />
                    </div>
                  </div>
                ) : (
                  <GameCanvasGameThree
                    key={activeRunKey}
                    levelData={activeLevelData}
                    viewportWidth={gameThreeViewportWidth}
                    onLevelComplete={submitOutcome}
                    onExitRequest={handleExitRequest}
                    resultData={resultData}
                    gameplayData={gameplayData}
                    isSubmitting={isSubmitting}
                    canAdvanceLevel={canAdvanceLevel}
                    hideResultOverlay
                    onRetry={handleRetry}
                    onBack={onClose}
                    onNextLevel={handleNextLevel}
                    freeMistakes={sessionInfo.policy?.freeMistakes ?? 3}
                    suppressIntroTutorial={!autoShowGameTutorial}
                    showLevelGuideline={shouldShowLevelGuideline}
                    continueToTutorialAfterGuide={continueToTutorialAfterGuide}
                    gameTutorialRequested={gameTutorialRequest}
                    onTutorialRequest={() =>
                      setGameTutorialRequest((request) => request + 1)
                    }
                  />
                )}
              </section>
            </section>
          ) : (
            <section className="student-game-one-play-layout mx-auto flex h-full w-full max-w-7xl flex-col gap-4">
              <section
                className={`student-panel student-game-one-panel flex flex-col gap-4 ${isArcadeCanvas ? "student-game-four-panel" : ""} ${isGameFive ? "student-game-five-panel" : ""} ${isGameSix ? "student-game-six-panel" : ""} ${!(runtimeBootReady || isArcadeCanvas) ? "student-game-one-preload-panel" : ""}`}
              >
                {(runtimeBootReady || isArcadeCanvas) && !isGameFive && !isGameSix && (
                  <div className={`flex flex-wrap items-center justify-between gap-3 ${isGameOne ? "student-game-one-header" : ""}`}>
                    <div className="text-left">
                      <p className="student-eyebrow">
                        {sessionInfo.gameType} • {activeLevelLabel}
                      </p>
                      <h2 className="student-section-title">{activeLevelTitle}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isGameOne && (
                        <>
                          <button
                            type="button"
                            className="student-preview-chip student-game-one-header-button transition hover:brightness-95"
                            onClick={() => setGameGuidelinesRequest((request) => request + 1)}
                          >
                            Guidelines
                          </button>
                          <button
                            type="button"
                            className="student-preview-chip student-game-one-header-button transition hover:brightness-95"
                            onClick={() => setGameTutorialRequest((request) => request + 1)}
                          >
                            Game Tutorial
                          </button>
                        </>
                      )}
                      {isArcadeCanvas ? (
                        isGameFour ? null : (
                          <button
                            type="button"
                            className="student-preview-chip transition hover:brightness-95"
                            onClick={onClose}
                          >
                            Back
                          </button>
                        )
                      ) : null}
                      {canAdvanceLevel && (
                        <span className="student-preview-chip">
                          Next unlocked
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div
                  className={`student-game-frame-wrap ${isArcadeCanvas ? "student-game-frame-wrap-scrollable" : ""} ${isGameFive ? "student-game-five-frame-wrap" : ""} ${isGameSix ? "student-game-six-frame-wrap" : ""}`}
                >
                  <div
                    className={`student-game-frame-shell ${isArcadeCanvas ? "student-game-frame-shell-fluid" : ""} ${isGameFive ? "student-game-five-frame-shell" : ""}`}
                    style={{
                      width: isGameThree
                        ? "100%"
                        : isGameSix
                          ? "min(1560px, calc(100vw - 32px))"
                        : isArcadeCanvas
                          ? `${Math.round(Math.max(920, Math.min(viewportSize.width - 32, frameSize.width + 88)))}px`
                          : `${frameSize.width}px`,
                      maxWidth: "100%",
                    }}
                  >
                    {isGameFour ? (
                      <GameCanvasGameFour
                        key={sessionInfo.sessionId}
                        levelData={levelData}
                        hintCoinCost={hintCoinCost}
                        freeMistakes={sessionInfo.policy?.freeMistakes ?? 3}
                        hintStarCost={sessionInfo.policy?.hintStarCost ?? 1}
                        onLevelComplete={submitOutcome}
                        onExitRequest={handleExitRequest}
                        resultData={resultData}
                        isSubmitting={isSubmitting}
                        canAdvanceLevel={canAdvanceLevel}
                        hideResultOverlay
                        onRetry={handleRetry}
                        onBack={onClose}
                        onNextLevel={handleNextLevel}
                        playerId={user?.id || "guest"}
                        initialCoins={sharedCoinBalance}
                        onCoinBalanceChange={setSharedCoinBalance}
                        suppressIntroTutorial={!autoShowGameTutorial}
                        showLevelGuideline={shouldShowLevelGuideline}
                        continueToTutorialAfterGuide={
                          continueToTutorialAfterGuide
                        }
                        gameTutorialRequested={gameTutorialRequest}
                        onTutorialRequest={() =>
                          setGameTutorialRequest((request) => request + 1)
                        }
                      />
                    ) : isGameFive ? (
                      <GameCanvasGameFive
                        key={sessionInfo.sessionId}
                        levelData={{
                          ...levelData,
                          title: getGameFiveDisplayTitle(levelData?.title),
                        }}
                        onLevelComplete={submitOutcome}
                        onLevelFail={submitOutcome}
                        onExitRequest={handleExitRequest}
                        resultData={resultData}
                        gameplayData={gameplayData}
                        isSubmitting={isSubmitting}
                        canAdvanceLevel={canAdvanceLevel}
                        hideResultOverlay
                        onRetry={handleRetry}
                        onBack={onClose}
                        onNextLevel={handleNextLevel}
                        playerId={user?.id || "guest"}
                        initialCoins={sharedCoinBalance}
                        onCoinBalanceChange={setSharedCoinBalance}
                        suppressIntroTutorial={!autoShowGameTutorial}
                        showLevelGuideline={shouldShowLevelGuideline}
                        continueToTutorialAfterGuide={
                          continueToTutorialAfterGuide
                        }
                        gameTutorialRequested={gameTutorialRequest}
                      />
                    ) : isGameSix ? (
                      <GameCanvasGameSix
                        key={sessionInfo.sessionId}
                        levelData={levelData}
                        sessionInfo={sessionInfo}
                        onLevelComplete={submitOutcome}
                        onLevelFail={submitOutcome}
                        onExitRequest={handleExitRequest}
                        resultData={resultData}
                        gameplayData={gameplayData}
                        isSubmitting={isSubmitting}
                        canAdvanceLevel={canAdvanceLevel}
                        hideResultOverlay
                        onRetry={handleRetry}
                        onBack={onClose}
                        onNextLevel={handleNextLevel}
                        playerId={user?.id || "guest"}
                        initialCoins={sharedCoinBalance}
                        onCoinBalanceChange={setSharedCoinBalance}
                        suppressIntroTutorial={!autoShowGameTutorial}
                        showLevelGuideline={shouldShowLevelGuideline}
                        continueToTutorialAfterGuide={
                          continueToTutorialAfterGuide
                        }
                        gameTutorialRequested={gameTutorialRequest}
                        onGameTutorial={() =>
                          setGameTutorialRequest((request) => request + 1)
                        }
                      />
                    ) : (
                      <GameOnePlayMode
                        ref={gameOneCanvasRef}
                        key={sessionInfo.sessionId}
                        levelData={levelData}
                        onLevelComplete={submitOutcome}
                        onLevelFail={submitOutcome}
                        onExitRequest={handleExitRequest}
                        resultData={resultData}
                        gameplayData={gameplayData}
                        isSubmitting={isSubmitting}
                        canAdvanceLevel={canAdvanceLevel}
                        hideResultOverlay
                        onRetry={handleRetry}
                        onBack={onClose}
                        onNextLevel={handleNextLevel}
                        onRuntimeBootReady={() => setRuntimeBootReady(true)}
                        suppressPreloadUi
                        initialShowTutorial={autoShowGameTutorial}
                        showLevelGuideline={shouldShowLevelGuideline}
                        gameGuidelinesRequested={gameGuidelinesRequest}
                        continueToTutorialAfterGuide={
                          continueToTutorialAfterGuide
                        }
                        gameTutorialRequested={gameTutorialRequest}
                      />
                    )}
                  </div>
                </div>

                {runtimeBootReady && !isArcadeCanvas && (
                  <div className="student-game-one-footer rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-left">
                    <p className="student-eyebrow">
                      {storyBriefingContent.kicker}
                    </p>
                    <p className="student-body-copy student-body-copy-tight mt-1">
                      {storyBriefingContent.body}
                    </p>
                    <p className="student-eyebrow">Objective</p>
                    <p className="student-body-copy student-body-copy-tight mt-1">
                      {levelObjective}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-300">
                      {controlsText.map(({ label, Icon }) => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-2"
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </section>
          )}
        </main>
        {(starting || (isGameOne && sessionInfo && activeLevelData && !runtimeBootReady && !startError)) && (
          <GameLoadingOverlay
            levelLabel={getLoadingLevelLabel(numericLevelNumber)}
            title={activeLoadingTip.title}
            description={activeLoadingTip.body}
            progress={loadingProgress}
          />
        )}
        <AnimatePresence>
          {!showCongratsOverlay &&
            !showCompletionStory &&
            (!shouldShowCongratsForCompletion || hasDismissedCongrats) &&
            resultData && (
              <ResultOverlay
                key={isGameFive || isGameSix ? `${normalizedGameType}-results` : undefined}
                result={resultData}
                gameplay={gameplayData}
                isSubmitting={isSubmitting}
                canAdvanceLevel={canAdvanceLevel}
                onRetry={handleRetry}
                onBack={onClose}
                onNextLevel={handleNextLevel}
                gameType={normalizedGameType}
                isGameComplete={isFinalGameLevel && resultData?.result === "COMPLETED"}
              />
            )}
          {showCongratsOverlay &&
            !hasDismissedCongrats &&
            resultData?.result === "COMPLETED" &&
            !showCompletionStory &&
            (isGameOne || isGameTwo || isGameFour || isGameFive || isGameSix ? (
              <CongratulatoryOverlay
                key={`${normalizedGameType}-congrats`}
                kicker={completionPopupKicker}
                title={completionPopupTitle}
                message={completionPopupMessage}
                onNext={handleDismissCongrats}
                variant="game-congrats-game-six"
                renderInPortal
                soundDelayMs={400}
              />
            ) : (
              <motion.div
                className="student-story-intro-backdrop student-congrats-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
              <motion.div
                className="student-congrats-motion-frame"
                initial={{ y: 18, scale: 0.98, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  exit={{ y: 12, scale: 0.98, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  <CongratulatoryOverlay
                    kicker={completionPopupKicker}
                    title={completionPopupTitle}
                    message={completionPopupMessage}
                    onNext={handleDismissCongrats}
                  />
                </motion.div>
              </motion.div>
            ))}
          {showCompletionStory && resultData?.result === "COMPLETED" && (
            <motion.div
              className="student-story-intro-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="story-complete-title"
            >
              <motion.div
                className="student-story-motion-frame"
                initial={{ y: 18, scale: 0.98, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 12, scale: 0.98, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <StudentStoryFrame
                  frame={completionStory}
                  page={completionStory?.pages?.[completionStoryPageIndex]}
                  pages={completionStory?.pages || []}
                  currentPage={completionStoryPageIndex}
                  totalPages={
                    completionStory?.pages?.length ||
                    completionStory?.totalPages
                  }
                  mode="completion"
                  chipValue={completionStory?.chip}
                  onBack={
                    isGameOne
                      ? onClose
                      : () => {
                          setShowCompletionStory(false);
                          setCompletionStoryPageIndex(0);
                        }
                  }
                  onPrevious={() =>
                    setCompletionStoryPageIndex((current) =>
                      Math.max(0, current - 1),
                    )
                  }
                  onNext={() =>
                    setCompletionStoryPageIndex((current) =>
                      Math.min(
                        (completionStory?.pages?.length || 1) - 1,
                        current + 1,
                      ),
                    )
                  }
                  onSkip={advanceToNextLevel}
                  primaryLabel={completionPrimaryLabel}
                  onPrimary={advanceToNextLevel}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </StudentShell>
    </motion.div>
  );
};

export default StudentGameOverlay;
