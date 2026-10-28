const prisma = require('../lib/prisma');
const {
  GAME_CATALOG,
  GAME_TYPE_VALUES,
} = require('../config/gameCatalog');
const {
  ensureLevelCatalog,
  ensureLevelDefinitions,
  getGameMeta,
  sortByGameTrack,
} = require('./levelCatalogService');
const { getTeacherSavedLevelNumbers } = require('./teacherLevelEditorService');

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const DEFAULT_TEACHER_POLICY = Object.freeze({
  difficultyPreset: 'STANDARD',
  freeMistakes: 3,
  hintStarCost: 1,
});
const GAME_ONE_NEXT_LEVEL_MIN_STARS = 2;
const PLACEHOLDER_LEVEL_PATTERN = /configure this level in the admin editor/i;

const resolveClient = (tx) => tx || prisma;

const getStudentAssignment = async (studentId) => prisma.user.findUnique({
  where: { id: studentId },
  select: {
    id: true,
    role: true,
    teacherId: true,
    isArchived: true,
  },
});

const getTeacherSavedLevelSet = async (teacherId) => {
  if (!teacherId) {
    return null;
  }

  const levelNumbers = await getTeacherSavedLevelNumbers(teacherId);
  return new Set(levelNumbers);
};

const filterStatesForTeacherScope = (states, teacherSavedLevelSet) => {
  if (!teacherSavedLevelSet) {
    return states;
  }

  return states.filter((state) => {
    if (state?.level?.gameType !== 'GAME_ONE') {
      return true;
    }

    return teacherSavedLevelSet.has(Number(state.level.gameLevelNumber));
  });
};

const getRetryMultiplier = (attemptsCount) => {
  const multiplier = 1 - (attemptsCount * 0.1);
  return Math.max(0.5, Number(multiplier.toFixed(2)));
};

const normalizeTeacherPolicy = (policy) => ({
  difficultyPreset: policy?.difficultyPreset || DEFAULT_TEACHER_POLICY.difficultyPreset,
  freeMistakes: clamp(Number(policy?.freeMistakes ?? DEFAULT_TEACHER_POLICY.freeMistakes), 1, 10),
  hintStarCost: clamp(Number(policy?.hintStarCost ?? DEFAULT_TEACHER_POLICY.hintStarCost), 0, 3),
});

const canUnlockNextLevel = (state) => {
  if (!state?.level) {
    return false;
  }

  if (state.status !== 'COMPLETED') {
    return false;
  }

  if (state.level.gameType === 'GAME_ONE') {
    return Number(state.bestStars || 0) >= GAME_ONE_NEXT_LEVEL_MIN_STARS;
  }

  return true;
};

const hasEndingPortal = (levelData) => {
  const roomHasExit = Array.isArray(levelData?.rooms)
    && levelData.rooms.some((room) => Boolean(room?.portal?.endsLevel));

  if (roomHasExit) {
    return true;
  }

  const portalObjects = levelData?.worldObjects?.portal;
  const portals = Array.isArray(portalObjects)
    ? portalObjects
    : portalObjects && typeof portalObjects === 'object'
      ? [portalObjects]
      : [];

  return portals.some((portal) => Boolean(portal?.endsLevel));
};

const hasPlaceholderText = (levelData) => {
  const values = [
    levelData?.title,
    levelData?.subtitle,
    levelData?.objective,
    ...(Array.isArray(levelData?.rooms) ? levelData.rooms.map((room) => room?.objective) : []),
  ];

  return values.some((value) => PLACEHOLDER_LEVEL_PATTERN.test(String(value || '')));
};

const hasMeaningfulGameOneContent = (levelData) => {
  if (!levelData || typeof levelData !== 'object' || hasPlaceholderText(levelData)) {
    return false;
  }

  if (Array.isArray(levelData.rooms) && levelData.rooms.length > 0) {
    return hasEndingPortal(levelData);
  }

  const worldObjects = levelData.worldObjects;
  if (worldObjects && typeof worldObjects === 'object') {
    return hasEndingPortal(levelData);
  }

  return false;
};

const isLevelReadyForStudent = (state, teacherSavedLevelSet = null) => {
  const level = state?.level || state;

  if (!level || level.gameType !== 'GAME_ONE') {
    return true;
  }

  // A student assigned to a teacher plays that teacher's saved Game 1 levels.
  // Those levels are stored in the teacher workspace, not in the global
  // LevelContent record, so global publishedJson must not block progression.
  if (teacherSavedLevelSet) {
    return teacherSavedLevelSet.has(Number(level.gameLevelNumber));
  }

  return hasMeaningfulGameOneContent(level.content?.publishedJson);
};

const getMinimumPassingStars = (gameType) => (
  gameType === 'GAME_ONE' ? GAME_ONE_NEXT_LEVEL_MIN_STARS : 1
);

const calculateGameOneStarsEarned = (payload) => {
  const coinBalance = clamp(Number(payload?.coinBalance ?? payload?.coinsCollected ?? 0), 0, 9999);
  return clamp(Math.round(coinBalance), 0, 3);
};

const calculateReportedStarsEarned = (payload, fallbackStars) => {
  const reportedStars = payload?.starsEarned ?? payload?.starsRemaining;

  if (reportedStars === undefined || reportedStars === null || reportedStars === '') {
    return fallbackStars;
  }

  return clamp(Math.round(Number(reportedStars || 0)), 0, 3);
};

const getTeacherPolicyForStudent = async (studentId, teacherId, tx) => {
  if (!teacherId) {
    return { ...DEFAULT_TEACHER_POLICY };
  }

  const db = resolveClient(tx);
  const policy = await db.teacherStudentPolicy.findUnique({
    where: {
      teacherId_studentId: {
        teacherId,
        studentId,
      },
    },
    select: {
      difficultyPreset: true,
      freeMistakes: true,
      hintStarCost: true,
    },
  });

  return normalizeTeacherPolicy(policy);
};

const createInitialLevelState = (studentId, level) => {
  const gameMeta = getGameMeta(level.gameType);
  const shouldUnlock = Boolean(gameMeta?.isAvailable && level.gameLevelNumber === 1);

  return {
    studentId,
    levelId: level.id,
    status: shouldUnlock ? 'UNLOCKED' : 'LOCKED',
    unlockedAt: shouldUnlock ? new Date() : null,
  };
};

const syncSequentialUnlocks = async (studentId, tx) => {
  const db = resolveClient(tx);
  const student = await db.user.findUnique({
    where: { id: studentId },
    select: { teacherId: true },
  });
  const teacherSavedLevelSet = student?.teacherId
    ? await getTeacherSavedLevelSet(student.teacherId)
    : null;

  const states = await db.studentLevelState.findMany({
    where: {
      studentId,
      level: {
        isActive: true,
      },
    },
    include: {
      level: {
        select: {
          gameType: true,
          gameLevelNumber: true,
          content: {
            select: {
              publishedJson: true,
            },
          },
        },
      },
    },
  });

  const statesByGame = states.reduce((accumulator, state) => {
    if (!accumulator[state.level.gameType]) {
      accumulator[state.level.gameType] = [];
    }

    accumulator[state.level.gameType].push(state);
    return accumulator;
  }, {});

  const stateIdsToUnlock = [];
  const stateIdsToRelock = [];

  Object.entries(statesByGame).forEach(([gameType, gameStates]) => {
    const gameMeta = getGameMeta(gameType);
    const orderedStates = [...gameStates].sort((left, right) => (
      left.level.gameLevelNumber - right.level.gameLevelNumber
    ));

    orderedStates.forEach((state, index) => {
      const currentLevelReady = isLevelReadyForStudent(state, teacherSavedLevelSet);

      if (index === 0) {
        if (state.status === 'LOCKED' && gameMeta?.isAvailable && currentLevelReady) {
          stateIdsToUnlock.push(state.id);
        }

        if (
          !currentLevelReady
          && state.status === 'UNLOCKED'
          && Number(state.attemptsCount || 0) === 0
          && Number(state.bestStars || 0) === 0
        ) {
          stateIdsToRelock.push(state.id);
        }
        return;
      }

      const previousStateAllowsProgression = canUnlockNextLevel(orderedStates[index - 1]);

      if (state.status === 'LOCKED' && previousStateAllowsProgression && currentLevelReady) {
        stateIdsToUnlock.push(state.id);
        return;
      }

      if (
        (!previousStateAllowsProgression || !currentLevelReady)
        && state.status === 'UNLOCKED'
        && Number(state.attemptsCount || 0) === 0
        && Number(state.bestStars || 0) === 0
      ) {
        stateIdsToRelock.push(state.id);
      }
    });
  });

  if (stateIdsToUnlock.length > 0) {
    await db.studentLevelState.updateMany({
      where: {
        id: {
          in: stateIdsToUnlock,
        },
        status: 'LOCKED',
      },
      data: {
        status: 'UNLOCKED',
        unlockedAt: new Date(),
      },
    });
  }

  if (stateIdsToRelock.length > 0) {
    await db.studentLevelState.updateMany({
      where: {
        id: {
          in: stateIdsToRelock,
        },
        status: 'UNLOCKED',
      },
      data: {
        status: 'LOCKED',
        unlockedAt: null,
      },
    });
  }
};

const initializeStudentProgression = async (studentId, tx) => {
  const db = resolveClient(tx);

  await ensureLevelCatalog(db);

  const student = await db.user.findUnique({
    where: { id: studentId },
    select: { id: true, role: true },
  });

  if (!student || student.role !== 'STUDENT') {
    return;
  }

  const levelDefinitions = await db.levelDefinition.findMany({
    where: { isActive: true },
    orderBy: [{ gameType: 'asc' }, { gameLevelNumber: 'asc' }],
  });

  if (levelDefinitions.length === 0) {
    return;
  }

  const existingStates = await db.studentLevelState.findMany({
    where: { studentId },
    select: { levelId: true },
  });

  const existingLevelIds = new Set(existingStates.map((state) => state.levelId));
  const missingStates = levelDefinitions
    .filter((level) => !existingLevelIds.has(level.id))
    .map((level) => createInitialLevelState(studentId, level));

  if (missingStates.length > 0) {
    await db.studentLevelState.createMany({
      data: missingStates,
      skipDuplicates: true,
    });
  }

  await syncSequentialUnlocks(studentId, db);
};

const mapLevelState = (state, teacherSavedLevelSet = null) => ({
  id: state.level.id,
  gameType: state.level.gameType,
  legacyLevelNumber: state.level.levelNumber,
  levelNumber: state.level.gameLevelNumber,
  gameLevelNumber: state.level.gameLevelNumber,
  title: state.level.title,
  description: state.level.description,
  status: state.status,
  attemptsCount: state.attemptsCount,
  bestStars: state.bestStars,
  bestScore: state.bestScore,
  unlockedAt: state.unlockedAt,
  completedAt: state.completedAt,
  isReadyToPlay: isLevelReadyForStudent(state, teacherSavedLevelSet),
});

const buildGameSummary = (gameMeta, levelStates, teacherSavedLevelSet = null) => {
  const levels = levelStates.map((state) => mapLevelState(state, teacherSavedLevelSet));
  const completedLevels = levels.filter((level) => level.status === 'COMPLETED').length;
  const unlockedLevels = levels.filter((level) => level.status !== 'LOCKED').length;
  const authoredLevels = levels.length;
  const totalStars = levels.reduce((sum, level) => sum + Number(level.bestStars || 0), 0);
  const nextLevel = levels.find((level) => level.status !== 'COMPLETED') || null;

  return {
    gameType: gameMeta.gameType,
    slug: gameMeta.slug,
    label: gameMeta.label,
    title: gameMeta.title,
    shortTitle: gameMeta.shortTitle,
    description: gameMeta.description,
    isAvailable: gameMeta.isAvailable,
    plannedLevels: gameMeta.plannedLevels,
    authoredLevels,
    completedLevels,
    unlockedLevels,
    totalStars,
    progressPercent: authoredLevels > 0
      ? Number(((completedLevels / authoredLevels) * 100).toFixed(2))
      : 0,
    nextLevelNumber: nextLevel?.gameLevelNumber || null,
  };
};

const getStudentGameCatalog = async (studentId) => {
  await ensureLevelCatalog();
  await initializeStudentProgression(studentId);

  const student = await getStudentAssignment(studentId);
  const teacherSavedLevelSet = student?.teacherId
    ? await getTeacherSavedLevelSet(student.teacherId)
    : null;

  const levelStates = await prisma.studentLevelState.findMany({
    where: { studentId },
    include: {
      level: {
        select: {
          id: true,
          levelNumber: true,
          gameType: true,
          gameLevelNumber: true,
          title: true,
          description: true,
          isActive: true,
          content: {
            select: {
              publishedJson: true,
            },
          },
        },
      },
    },
  });

  const activeStates = filterStatesForTeacherScope(
    levelStates.filter((state) => state.level.isActive),
    teacherSavedLevelSet,
  );
  const statesByGame = activeStates.reduce((accumulator, state) => {
    if (!accumulator[state.level.gameType]) {
      accumulator[state.level.gameType] = [];
    }
    accumulator[state.level.gameType].push(state);
    return accumulator;
  }, {});

  const games = GAME_CATALOG.map((gameMeta) => {
    const states = [...(statesByGame[gameMeta.gameType] || [])]
      .sort((left, right) => sortByGameTrack(
        { gameType: left.level.gameType, gameLevelNumber: left.level.gameLevelNumber },
        { gameType: right.level.gameType, gameLevelNumber: right.level.gameLevelNumber },
      ));

    return buildGameSummary(gameMeta, states, teacherSavedLevelSet);
  });

  return { games };
};

const getStudentProgression = async (studentId, gameType) => {
  await ensureLevelCatalog();
  await initializeStudentProgression(studentId);

  const student = await getStudentAssignment(studentId);
  const teacherSavedLevelSet = student?.teacherId
    ? await getTeacherSavedLevelSet(student.teacherId)
    : null;

  const gameMeta = getGameMeta(gameType);
  if (!gameMeta) {
    throw new Error('Unknown game type.');
  }

  const levelStates = await prisma.studentLevelState.findMany({
    where: {
      studentId,
      level: {
        gameType,
        isActive: true,
      },
    },
    include: {
      level: {
        select: {
          id: true,
          levelNumber: true,
          gameType: true,
          gameLevelNumber: true,
          title: true,
          description: true,
          isActive: true,
          content: {
            select: {
              publishedJson: true,
            },
          },
        },
      },
    },
  });

  const scopedStates = filterStatesForTeacherScope(levelStates, teacherSavedLevelSet);
  const orderedStates = [...scopedStates].sort((left, right) => left.level.gameLevelNumber - right.level.gameLevelNumber);
  const levels = orderedStates.map((state) => mapLevelState(state, teacherSavedLevelSet));
  const summary = buildGameSummary(gameMeta, orderedStates, teacherSavedLevelSet);

  return {
    game: summary,
    levels,
    summary: {
      totalLevels: summary.authoredLevels,
      completedLevels: summary.completedLevels,
      unlockedLevels: summary.unlockedLevels,
      progressPercent: summary.progressPercent,
    },
  };
};

const getLevelStateForGame = async (db, studentId, gameType, gameLevelNumber, includeLevel = false) => db.studentLevelState.findFirst({
  where: {
    studentId,
    level: {
      gameType,
      gameLevelNumber,
      isActive: true,
    },
  },
  include: includeLevel
    ? {
      level: {
        include: {
          content: {
            select: {
              publishedJson: true,
            },
          },
        },
      },
    }
    : undefined,
});

const calculateStarsRemaining = (mistakes, hintsUsed, policy) => {
  const effectivePolicy = normalizeTeacherPolicy(policy);
  const penaltyFromMistakes = Math.max(0, mistakes - effectivePolicy.freeMistakes);
  const penalties = penaltyFromMistakes + (hintsUsed * effectivePolicy.hintStarCost);
  return clamp(3 - penalties, 0, 3);
};

const startGameSession = async (studentId, gameType, gameLevelNumber) => {
  await ensureLevelCatalog();
  await initializeStudentProgression(studentId);

  const parsedLevelNumber = Number(gameLevelNumber);
  const gameMeta = getGameMeta(gameType);

  if (!gameMeta) {
    throw new Error('Unknown game type.');
  }

  if (!gameMeta.isAvailable) {
    throw new Error('This game is not available yet.');
  }

  const student = await getStudentAssignment(studentId);
  const teacherSavedLevelSet = student?.teacherId
    ? await getTeacherSavedLevelSet(student.teacherId)
    : null;

  if (teacherSavedLevelSet && gameType === 'GAME_ONE' && !teacherSavedLevelSet.has(parsedLevelNumber)) {
    throw new Error('This level is not available for your assigned course.');
  }

  const levelState = await getLevelStateForGame(prisma, studentId, gameType, parsedLevelNumber, true);

  if (!levelState) {
    throw new Error('Level not found for this game.');
  }

  if (levelState.status === 'LOCKED') {
    throw new Error('This level is locked. Complete previous levels first.');
  }

  if (!isLevelReadyForStudent(levelState, teacherSavedLevelSet)) {
    throw new Error('This level is not ready to play yet.');
  }

  const teacherPolicy = await getTeacherPolicyForStudent(studentId, student?.teacherId || null);

  const retryMultiplier = getRetryMultiplier(levelState.attemptsCount);
  const previousGameSessions = await prisma.gameSession.count({
    where: {
      studentId,
      gameType,
    },
  });
  const isFirstGamePlay = parsedLevelNumber === 1 && previousGameSessions === 0;

  const session = await prisma.gameSession.create({
    data: {
      studentId,
      levelId: levelState.levelId,
      levelNumber: parsedLevelNumber,
      gameType,
      retryMultiplier,
      status: 'IN_PROGRESS',
      startingStars: 3,
      starsRemaining: 3,
    },
  });

  return {
    sessionId: session.id,
    gameType,
    levelNumber: parsedLevelNumber,
    retryMultiplier,
    startingStars: 3,
    policy: teacherPolicy,
    isFirstGamePlay,
  };
};

const submitGameSession = async (studentId, gameType, gameLevelNumber, sessionId, payload) => {
  const parsedLevelNumber = Number(gameLevelNumber);
  const reportedOutcome = payload?.outcome === 'FAILED' ? 'FAILED' : 'COMPLETED';
  const mistakes = clamp(Number(payload?.mistakes || 0), 0, 9999);
  const hintsUsed = clamp(Number(payload?.hintsUsed || 0), 0, 9999);
  const baseScore = clamp(Number(payload?.baseScore || 0), 0, 1000000);

  return prisma.$transaction(async (tx) => {
    const session = await tx.gameSession.findFirst({
      where: {
        id: sessionId,
        studentId,
        gameType,
        levelNumber: parsedLevelNumber,
        status: 'IN_PROGRESS',
      },
    });

    if (!session) {
      throw new Error('Active session not found.');
    }

    const levelState = await tx.studentLevelState.findFirst({
      where: {
        studentId,
        levelId: session.levelId,
      },
      include: {
        level: {
          select: {
            id: true,
            levelNumber: true,
            gameType: true,
            gameLevelNumber: true,
          },
        },
      },
    });

    if (!levelState) {
      throw new Error('Level state not found.');
    }

    const studentPolicy = await getTeacherPolicyForStudent(
      studentId,
      (await tx.user.findUnique({
        where: { id: studentId },
        select: { teacherId: true },
      }))?.teacherId || null,
      tx,
    );

    const policyStarsRemaining = calculateStarsRemaining(mistakes, hintsUsed, studentPolicy);
    const derivedStarsRemaining = session.gameType === 'GAME_ONE'
      ? calculateGameOneStarsEarned(payload)
      : ['GAME_FIVE', 'GAME_SIX'].includes(session.gameType)
        ? calculateReportedStarsEarned(payload, policyStarsRemaining)
        : policyStarsRemaining;
    const minimumPassingStars = getMinimumPassingStars(session.gameType);
    const isCompleted = reportedOutcome !== 'FAILED' && derivedStarsRemaining >= minimumPassingStars;
    const starsRemaining = derivedStarsRemaining;
    const starsEarned = derivedStarsRemaining;
    const finalScore = isCompleted
      ? Math.round(baseScore * session.retryMultiplier * (starsEarned / 3))
      : 0;
    const completedAt = new Date();

    await tx.gameSession.update({
      where: { id: session.id },
      data: {
        mistakes,
        hintsUsed,
        baseScore,
        starsRemaining,
        starsEarned,
        finalScore,
        status: isCompleted ? 'COMPLETED' : 'FAILED',
        completedAt,
      },
    });

    const nextAttemptsCount = levelState.attemptsCount + 1;

    await tx.studentLevelState.update({
      where: { id: levelState.id },
      data: {
        attemptsCount: nextAttemptsCount,
        bestStars: Math.max(levelState.bestStars, starsEarned),
        bestScore: Math.max(levelState.bestScore, finalScore),
        status: isCompleted ? 'COMPLETED' : levelState.status,
        completedAt: isCompleted ? completedAt : levelState.completedAt,
      },
    });

    let unlockedNextLevel = false;

    if (isCompleted && (
      session.gameType !== 'GAME_ONE'
      || starsEarned >= GAME_ONE_NEXT_LEVEL_MIN_STARS
    )) {
      const student = await tx.user.findUnique({
        where: { id: studentId },
        select: { teacherId: true },
      });
      const teacherSavedLevelSet = student?.teacherId
        ? await getTeacherSavedLevelSet(student.teacherId)
        : null;
      const nextLevelState = await getLevelStateForGame(
        tx,
        studentId,
        session.gameType,
        parsedLevelNumber + 1,
        true,
      );

      if (
        nextLevelState
        && nextLevelState.status === 'LOCKED'
        && isLevelReadyForStudent(nextLevelState, teacherSavedLevelSet)
      ) {
        await tx.studentLevelState.update({
          where: { id: nextLevelState.id },
          data: {
            status: 'UNLOCKED',
            unlockedAt: new Date(),
          },
        });
        unlockedNextLevel = true;
      }
    }

    await tx.levelAttempt.create({
      data: {
        studentId,
        levelId: levelState.levelId,
        sessionId: session.id,
        attemptNumber: nextAttemptsCount,
        gameType: session.gameType,
        mistakes,
        hintsUsed,
        starsEarned,
        baseScore,
        finalScore,
        retryMultiplier: session.retryMultiplier,
        completed: isCompleted,
        completedAt: isCompleted ? completedAt : null,
      },
    });

    return {
      sessionId: session.id,
      gameType: session.gameType,
      levelNumber: parsedLevelNumber,
      result: isCompleted ? 'COMPLETED' : 'FAILED',
      starsRemaining,
      starsEarned,
      policy: studentPolicy,
      retryMultiplier: session.retryMultiplier,
      finalScore,
      unlockedNextLevel,
    };
  });
};

const getLevelHistory = async (studentId, gameType, gameLevelNumber, limit = 10) => {
  const parsedLevelNumber = Number(gameLevelNumber);
  const parsedLimit = clamp(Number(limit || 10), 1, 50);

  const attempts = await prisma.levelAttempt.findMany({
    where: {
      studentId,
      gameType,
      level: {
        gameType,
        gameLevelNumber: parsedLevelNumber,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: parsedLimit,
  });

  return { attempts };
};

module.exports = {
  GAME_CATALOG,
  GAME_TYPE_VALUES,
  ensureLevelDefinitions,
  initializeStudentProgression,
  getStudentGameCatalog,
  getStudentProgression,
  startGameSession,
  submitGameSession,
  getLevelHistory,
  isLevelReadyForStudent,
  canUnlockNextLevel,
  createInitialLevelState,
};
