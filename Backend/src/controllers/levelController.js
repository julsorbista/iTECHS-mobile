const {
  successResponse,
  errorResponse
} = require('../utils/helpers');
const {
  getStudentGameCatalog,
  getStudentProgression,
  startGameSession,
  submitGameSession,
  getLevelHistory
} = require('../services/progressionService');
const { getPublishedLevelContent } = require('../services/levelContentService');
const {
  generateGameHintWithGemini,
  generateGameTwoTasksWithGemini,
  generateGameFiveQuestionsWithGemini
} = require('../services/aiQuestionService');

const normalizeRunToken = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const cleaned = value.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned.slice(0, 64);
};

const getMyGames = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can access game progression'));
    }

    const gameCatalog = await getStudentGameCatalog(req.user.id);

    return res.status(200).json(
      successResponse(gameCatalog, 'Game progression retrieved successfully')
    );
  } catch (error) {
    return next(error);
  }
};

const getMyLevels = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can access level progression'));
    }

    const { gameType } = req.query;
    const progression = await getStudentProgression(req.user.id, gameType);

    return res.status(200).json(
      successResponse(progression, 'Level progression retrieved successfully')
    );
  } catch (error) {
    return res.status(400).json(errorResponse(error.message || 'Failed to retrieve level progression'));
  }
};

const startLevelSession = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can start level sessions'));
    }

    const { gameType, levelNumber } = req.params;
    const session = await startGameSession(req.user.id, gameType, levelNumber);

    return res.status(201).json(
      successResponse(session, 'Level session started successfully')
    );
  } catch (error) {
    return res.status(400).json(errorResponse(error.message || 'Failed to start level session'));
  }
};

const submitLevelSession = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can submit level sessions'));
    }

    const { gameType, levelNumber, sessionId } = req.params;
    const result = await submitGameSession(req.user.id, gameType, levelNumber, sessionId, req.body || {});

    return res.status(200).json(
      successResponse(result, 'Level session submitted successfully')
    );
  } catch (error) {
    return res.status(400).json(errorResponse(error.message || 'Failed to submit level session'));
  }
};

const getMyLevelHistory = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can access level history'));
    }

    const { gameType, levelNumber } = req.params;
    const { limit = 10 } = req.query;

    const history = await getLevelHistory(req.user.id, gameType, levelNumber, limit);

    return res.status(200).json(
      successResponse(history, 'Level history retrieved successfully')
    );
  } catch (error) {
    return res.status(400).json(errorResponse(error.message || 'Failed to retrieve level history'));
  }
};

const getPlayableLevelContent = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can access playable level content'));
    }

    const { gameType, levelNumber } = req.params;
    const prefetchRaw = typeof req.query.prefetch === 'string' ? req.query.prefetch.trim().toLowerCase() : '';
    const skipDynamicQuestions = prefetchRaw === '1' || prefetchRaw === 'true' || prefetchRaw === 'yes';
    const requestedRunToken = normalizeRunToken(req.query.runToken);
    const loginSessionKey = !skipDynamicQuestions
      && String(gameType || '').trim().toUpperCase() === 'GAME_ONE'
      && requestedRunToken
      ? `${req.authSessionKey || ''}|run:${requestedRunToken}`
      : (req.authSessionKey || '');
    const content = await getPublishedLevelContent(gameType, levelNumber, {
      skipDynamicQuestions,
      teacherId: req.user.teacherId || null,
      allowMissing: skipDynamicQuestions,
      studentId: req.user.id,
      loginSessionKey,
    });

    return res.status(200).json(
      successResponse(content, 'Playable level content retrieved successfully')
    );
  } catch (error) {
    const statusCode = Number(error?.statusCode);
    const resolvedStatus = Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600
      ? statusCode
      : ((error?.message || '').toLowerCase().includes('not found') ? 404 : 400);

    return res.status(resolvedStatus).json(errorResponse(error.message || 'Failed to retrieve playable level content'));
  }
};

const generateGameHint = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can request game hints'));
    }

    const { gameType, levelNumber } = req.params;
    const normalizedGameType = String(gameType || '').trim().toUpperCase();
    if (!['GAME_TWO', 'GAME_FOUR', 'GAME_FIVE'].includes(normalizedGameType)) {
      return res.status(400).json(errorResponse('AI hints are currently available for Games 2, 4, and 5 only'));
    }

    const hint = await generateGameHintWithGemini({
      gameType,
      topic: req.body?.topic,
      objective: req.body?.objective,
      availableTokens: req.body?.availableTokens,
      assembledTokens: req.body?.assembledTokens,
      answerPattern: req.body?.answerPattern,
      hintNumber: req.body?.hintNumber,
      fallbackHint: req.body?.fallbackHint,
      forbiddenAnswer: req.body?.forbiddenAnswer,
      levelNumber,
    });

    return res.status(200).json(successResponse(hint, 'Game hint generated successfully'));
  } catch (error) {
    return res.status(400).json(errorResponse(error.message || 'Failed to generate game hint'));
  }
};

const generateGameFiveQuestions = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can request game questions'));
    }

    const { gameType, levelNumber } = req.params;
    const normalizedGameType = String(gameType || '').trim().toUpperCase();
    if (normalizedGameType === 'GAME_TWO') {
      const result = await generateGameTwoTasksWithGemini({
        levelNumber,
        count: req.body?.count,
        objective: req.body?.objective,
        fallbackTasks: req.body?.fallbackTasks,
        variationSeed: `${req.user.id || 'student'}-${req.body?.variationSeed || Date.now()}`,
      });
      return res.status(200).json(successResponse(result, 'Game 2 retry tasks generated successfully'));
    }
    if (normalizedGameType !== 'GAME_FIVE') {
      return res.status(400).json(errorResponse('AI question generation is available for Games 2 and 5 only'));
    }

    const result = await generateGameFiveQuestionsWithGemini({
      levelNumber,
      count: req.body?.count,
      fallbackQuestions: req.body?.fallbackQuestions,
      variationSeed: `${req.user.id || 'student'}-${req.body?.variationSeed || Date.now()}`,
    });

    return res.status(200).json(successResponse(result, 'Game 5 questions generated successfully'));
  } catch (error) {
    return res.status(400).json(errorResponse(error.message || 'Failed to generate Game 5 questions'));
  }
};

module.exports = {
  getMyGames,
  getMyLevels,
  startLevelSession,
  submitLevelSession,
  getMyLevelHistory,
  getPlayableLevelContent,
  generateGameHint,
  generateGameFiveQuestions
};
