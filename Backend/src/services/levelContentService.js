const { createHash } = require('crypto');
const prisma = require('../lib/prisma');
const {
  ensureLevelCatalog,
  getAdminLevelCatalog,
  getLevelDefinitionByGame,
} = require('./levelCatalogService');
const {
  generateStatueQuestionsWithGemini,
  generateSingleQuestionWithGemini,
  generateQuestionWithGemini,
  generateQuestionRetryPoolWithGemini,
} = require('./aiQuestionService');
const { isAiEnabled } = require('./aiControlService');
const { getTeacherPlayableLevelData } = require('./teacherLevelEditorService');

const cloneJson = (value) => JSON.parse(JSON.stringify(value));
const DEFAULT_STATUE_SUCCESS_TEXT = 'Correct! The statue grants your request.';
const DEFAULT_STATUE_FAILURE_TEXT = 'Not quite. Try again.';
const DEFAULT_DYNAMIC_QUESTION_TIMEOUT_MS = 55000;
const DEFAULT_PLAYABLE_DYNAMIC_QUESTION_TIMEOUT_MS = 22000;
const MIN_DYNAMIC_QUESTION_TIMEOUT_MS = 1000;
const MAX_DYNAMIC_QUESTION_TIMEOUT_MS = 120000;
const MAX_PLAYABLE_DYNAMIC_QUESTION_TIMEOUT_MS = 45000;
const DEFAULT_DYNAMIC_QUESTION_CACHE_TTL_MS = 0;
const MAX_DYNAMIC_QUESTION_CACHE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_DYNAMIC_QUESTION_POOL_TTL_MS = 72 * 60 * 60 * 1000;
const MIN_DYNAMIC_QUESTION_POOL_TTL_MS = 5 * 60 * 1000;
const MAX_DYNAMIC_QUESTION_POOL_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_DYNAMIC_QUESTION_ASSIGNMENT_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_DYNAMIC_QUESTION_ASSIGNMENT_TTL_MS = 5 * 60 * 1000;
const MAX_DYNAMIC_QUESTION_ASSIGNMENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_DYNAMIC_QUESTION_POOL_CANDIDATE_LIMIT = 20;
const MIN_DYNAMIC_QUESTION_POOL_CANDIDATE_LIMIT = 1;
const MAX_DYNAMIC_QUESTION_POOL_CANDIDATE_LIMIT = 60;
const DEFAULT_DYNAMIC_QUESTION_RECENT_EXCLUSIONS = 3;
const MIN_DYNAMIC_QUESTION_RECENT_EXCLUSIONS = 0;
const MAX_DYNAMIC_QUESTION_RECENT_EXCLUSIONS = 10;
const DEFAULT_PERSISTED_POOL_PRUNE_INTERVAL_MS = 60 * 1000;
const MAX_STATUE_QUESTION_ID_LENGTH = 80;
const DYNAMIC_QUESTION_CACHE_MAX_ENTRIES = 200;
const MAX_RUNTIME_PROMPT_LENGTH = 260;
const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));
const dynamicQuestionCache = new Map();
const dynamicQuestionInFlight = new Map();
let lastPersistedPoolPruneAt = 0;

const resolveAIProvider = () => String(
  process.env.AI_PROVIDER
  || process.env.LLM_PROVIDER
  || 'gemini',
).trim().toLowerCase();

const hasAIProviderCredentials = () => {
  const provider = resolveAIProvider();
  if (provider === 'deepseek') {
    return Boolean(String(
      process.env.DEEPSEEK_API_KEY
      || process.env.OPENAI_API_KEY
      || process.env.API_KEY
      || '',
    ).trim());
  }

  return Boolean(String(process.env.GEMINI_API_KEY || '').trim());
};

const resolveDynamicQuestionTimeoutMs = () => {
  const parsed = Number.parseInt(process.env.GEMINI_DYNAMIC_QUESTION_TIMEOUT_MS || '', 10);
  if (!Number.isInteger(parsed)) {
    return DEFAULT_DYNAMIC_QUESTION_TIMEOUT_MS;
  }

  return clampNumber(parsed, MIN_DYNAMIC_QUESTION_TIMEOUT_MS, MAX_DYNAMIC_QUESTION_TIMEOUT_MS);
};

const resolvePlayableDynamicQuestionTimeoutMs = () => {
  const parsed = Number.parseInt(process.env.GEMINI_PLAYABLE_DYNAMIC_QUESTION_TIMEOUT_MS || '', 10);
  if (!Number.isInteger(parsed)) {
    return DEFAULT_PLAYABLE_DYNAMIC_QUESTION_TIMEOUT_MS;
  }

  return clampNumber(parsed, MIN_DYNAMIC_QUESTION_TIMEOUT_MS, MAX_PLAYABLE_DYNAMIC_QUESTION_TIMEOUT_MS);
};

const resolveDynamicQuestionCacheTtlMs = () => {
  const parsed = Number.parseInt(process.env.DYNAMIC_QUESTION_CACHE_TTL_MS || '', 10);
  if (!Number.isInteger(parsed)) {
    return DEFAULT_DYNAMIC_QUESTION_CACHE_TTL_MS;
  }

  return clampNumber(parsed, 0, MAX_DYNAMIC_QUESTION_CACHE_TTL_MS);
};

const resolveBooleanFlag = (rawValue, fallback) => {
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const resolvePersistentDynamicQuestionPoolEnabled = () => resolveBooleanFlag(
  process.env.DYNAMIC_QUESTION_POOL_PERSISTENCE_ENABLED,
  true,
);

const resolveDynamicQuestionPoolTtlMs = () => {
  const parsed = Number.parseInt(process.env.DYNAMIC_QUESTION_POOL_TTL_MS || '', 10);
  if (!Number.isInteger(parsed)) {
    return DEFAULT_DYNAMIC_QUESTION_POOL_TTL_MS;
  }

  return clampNumber(parsed, MIN_DYNAMIC_QUESTION_POOL_TTL_MS, MAX_DYNAMIC_QUESTION_POOL_TTL_MS);
};

const resolveDynamicQuestionAssignmentTtlMs = () => {
  const parsed = Number.parseInt(process.env.DYNAMIC_QUESTION_ASSIGNMENT_TTL_MS || '', 10);
  if (!Number.isInteger(parsed)) {
    return DEFAULT_DYNAMIC_QUESTION_ASSIGNMENT_TTL_MS;
  }

  return clampNumber(parsed, MIN_DYNAMIC_QUESTION_ASSIGNMENT_TTL_MS, MAX_DYNAMIC_QUESTION_ASSIGNMENT_TTL_MS);
};

const resolveDynamicQuestionPoolCandidateLimit = () => {
  const parsed = Number.parseInt(process.env.DYNAMIC_QUESTION_POOL_CANDIDATE_LIMIT || '', 10);
  if (!Number.isInteger(parsed)) {
    return DEFAULT_DYNAMIC_QUESTION_POOL_CANDIDATE_LIMIT;
  }

  return clampNumber(parsed, MIN_DYNAMIC_QUESTION_POOL_CANDIDATE_LIMIT, MAX_DYNAMIC_QUESTION_POOL_CANDIDATE_LIMIT);
};

const resolveDynamicQuestionRecentExclusions = () => {
  const parsed = Number.parseInt(process.env.DYNAMIC_QUESTION_RECENT_EXCLUSIONS || '', 10);
  if (!Number.isInteger(parsed)) {
    return DEFAULT_DYNAMIC_QUESTION_RECENT_EXCLUSIONS;
  }

  return clampNumber(parsed, MIN_DYNAMIC_QUESTION_RECENT_EXCLUSIONS, MAX_DYNAMIC_QUESTION_RECENT_EXCLUSIONS);
};

const resolvePersistedPoolPruneIntervalMs = () => {
  const parsed = Number.parseInt(process.env.DYNAMIC_QUESTION_POOL_PRUNE_INTERVAL_MS || '', 10);
  if (!Number.isInteger(parsed)) {
    return DEFAULT_PERSISTED_POOL_PRUNE_INTERVAL_MS;
  }

  return clampNumber(parsed, 10 * 1000, 10 * 60 * 1000);
};

const withTimeout = (promise, timeoutMs, timeoutMessage) => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage || 'Operation timed out'));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
};

const normalizeQuestionIdForGemini = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, MAX_STATUE_QUESTION_ID_LENGTH);
};

const buildStatueRequestFingerprint = (statueRequests = []) => {
  const normalizedRequests = (Array.isArray(statueRequests) ? statueRequests : [])
    .map((request) => ({
      questionId: normalizeQuestionIdForGemini(request?.questionId),
      topic: normalizeStatueTopic(request?.topic),
      choicesCount: normalizeStatueChoicesCount(request?.choicesCount),
      difficulty: normalizeStatueDifficulty(request?.difficulty),
      language: normalizeStatueLanguage(request?.language),
      gradeLevel: normalizeStatueGradeLevel(request?.gradeLevel),
      instructions: normalizeStatueInstructions(request?.instructions),
    }))
    .filter((request) => request.questionId && request.topic)
    .sort((left, right) => left.questionId.localeCompare(right.questionId));

  return createHash('sha1')
    .update(JSON.stringify(normalizedRequests))
    .digest('hex');
};

const buildDynamicQuestionCacheKey = ({ cacheScope, gameType, statueRequests }) => {
  const scope = typeof cacheScope === 'string' && cacheScope.trim()
    ? cacheScope.trim()
    : 'global';
  const game = typeof gameType === 'string' && gameType.trim() ? gameType.trim() : 'GAME_ONE';
  const fingerprint = buildStatueRequestFingerprint(statueRequests);
  return `${scope}|${game}|${fingerprint}`;
};

const pruneDynamicQuestionCache = () => {
  const now = Date.now();

  for (const [cacheKey, cacheEntry] of dynamicQuestionCache.entries()) {
    if (!cacheEntry || cacheEntry.expiresAt <= now) {
      dynamicQuestionCache.delete(cacheKey);
    }
  }

  if (dynamicQuestionCache.size <= DYNAMIC_QUESTION_CACHE_MAX_ENTRIES) {
    return;
  }

  const overflowCount = dynamicQuestionCache.size - DYNAMIC_QUESTION_CACHE_MAX_ENTRIES;
  const oldestKeys = Array.from(dynamicQuestionCache.keys()).slice(0, overflowCount);
  oldestKeys.forEach((cacheKey) => {
    dynamicQuestionCache.delete(cacheKey);
  });
};

const getCachedDynamicQuestions = (cacheKey) => {
  if (resolveDynamicQuestionCacheTtlMs() <= 0) {
    return null;
  }

  if (!cacheKey) {
    return null;
  }

  const cacheEntry = dynamicQuestionCache.get(cacheKey);
  if (!cacheEntry) {
    return null;
  }

  if (cacheEntry.expiresAt <= Date.now()) {
    dynamicQuestionCache.delete(cacheKey);
    return null;
  }

  return { ...cacheEntry.questionsById };
};

const setCachedDynamicQuestions = (cacheKey, questionsById) => {
  const cacheTtlMs = resolveDynamicQuestionCacheTtlMs();
  if (cacheTtlMs <= 0) {
    return;
  }

  if (!cacheKey || !questionsById || typeof questionsById !== 'object') {
    return;
  }

  pruneDynamicQuestionCache();
  dynamicQuestionCache.set(cacheKey, {
    expiresAt: Date.now() + cacheTtlMs,
    questionsById: { ...questionsById },
  });
};

const hasPersistentDynamicQuestionModels = () => Boolean(
  prisma
  && typeof prisma === 'object'
  && prisma.dynamicQuestionVariant
  && prisma.dynamicQuestionAssignment,
);

const isMissingPersistentDynamicPoolSchemaError = (error) => ['P2021', 'P2022'].includes(String(error?.code || ''));

const normalizeStoredQuestionsById = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const normalized = Object.entries(value)
    .filter(([questionId, questionValue]) => typeof questionId === 'string' && questionId.trim() && questionValue && typeof questionValue === 'object')
    .reduce((accumulator, [questionId, questionValue]) => {
      accumulator[questionId] = questionValue;
      return accumulator;
    }, {});

  if (Object.keys(normalized).length === 0) {
    return null;
  }

  return normalized;
};

const buildGeneratedQuestionsFingerprint = (questionsById = {}) => {
  const orderedEntries = Object.entries(questionsById)
    .filter(([questionId, questionValue]) => typeof questionId === 'string' && questionId.trim() && questionValue && typeof questionValue === 'object')
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId));

  return createHash('sha1')
    .update(JSON.stringify(orderedEntries))
    .digest('hex');
};

const buildSessionScopedDynamicCacheKey = ({ cacheKey, studentId, loginSessionKey }) => {
  if (!cacheKey) {
    return '';
  }

  const normalizedStudentId = typeof studentId === 'string' ? studentId.trim() : '';
  const normalizedSessionKey = typeof loginSessionKey === 'string' ? loginSessionKey.trim() : '';
  if (!normalizedStudentId || !normalizedSessionKey) {
    return '';
  }

  return `${cacheKey}|student:${normalizedStudentId}|login:${normalizedSessionKey}`;
};

const resolveDynamicQuestionVariantExpiryDate = () => {
  const ttlMs = resolveDynamicQuestionPoolTtlMs();
  return new Date(Date.now() + ttlMs);
};

const resolveDynamicQuestionAssignmentExpiryDate = (variantExpiresAt) => {
  const assignmentTtlMs = resolveDynamicQuestionAssignmentTtlMs();
  const assignmentExpiry = new Date(Date.now() + assignmentTtlMs);
  if (!(variantExpiresAt instanceof Date) || Number.isNaN(variantExpiresAt.getTime())) {
    return assignmentExpiry;
  }

  return variantExpiresAt < assignmentExpiry ? variantExpiresAt : assignmentExpiry;
};

const selectStableVariantForLogin = ({ variants = [], studentId, loginSessionKey, requestFingerprint }) => {
  if (!Array.isArray(variants) || variants.length === 0) {
    return null;
  }

  const seed = `${studentId || ''}|${loginSessionKey || ''}|${requestFingerprint || ''}`;
  const hashHex = createHash('sha1').update(seed).digest('hex');
  const numericValue = Number.parseInt(hashHex.slice(0, 12), 16);
  const safeIndex = Number.isFinite(numericValue) ? numericValue % variants.length : 0;
  return variants[safeIndex] || variants[0] || null;
};

const prunePersistedDynamicQuestionPool = async () => {
  if (!resolvePersistentDynamicQuestionPoolEnabled() || !hasPersistentDynamicQuestionModels()) {
    return;
  }

  const nowMs = Date.now();
  if ((nowMs - lastPersistedPoolPruneAt) < resolvePersistedPoolPruneIntervalMs()) {
    return;
  }

  lastPersistedPoolPruneAt = nowMs;
  const now = new Date(nowMs);

  try {
    await prisma.dynamicQuestionAssignment.deleteMany({
      where: {
        expiresAt: {
          lte: now,
        },
      },
    });

    await prisma.dynamicQuestionVariant.updateMany({
      where: {
        staleAt: null,
        expiresAt: {
          lte: now,
        },
      },
      data: {
        staleAt: now,
      },
    });

    await prisma.dynamicQuestionAssignment.deleteMany({
      where: {
        variant: {
          staleAt: {
            not: null,
          },
        },
      },
    });
  } catch (error) {
    if (!isMissingPersistentDynamicPoolSchemaError(error)) {
      console.warn('Dynamic question pool prune skipped:', error.message || error);
    }
  }
};

const resolvePersistentAssignedDynamicQuestions = async ({
  studentId,
  levelId,
  loginSessionKey,
  cacheScope,
  gameType,
  requestFingerprint,
}) => {
  if (!resolvePersistentDynamicQuestionPoolEnabled() || !hasPersistentDynamicQuestionModels()) {
    return null;
  }

  const normalizedStudentId = typeof studentId === 'string' ? studentId.trim() : '';
  const normalizedSessionKey = typeof loginSessionKey === 'string' ? loginSessionKey.trim() : '';
  if (!normalizedStudentId || !normalizedSessionKey || !cacheScope || !requestFingerprint) {
    return null;
  }

  await prunePersistedDynamicQuestionPool();

  const now = new Date();
  const assignmentUniqueInput = {
    studentId: normalizedStudentId,
    cacheScope,
    gameType,
    requestFingerprint,
    loginSessionKey: normalizedSessionKey,
  };

  try {
    const existingAssignment = await prisma.dynamicQuestionAssignment.findUnique({
      where: {
        studentId_cacheScope_gameType_requestFingerprint_loginSessionKey: assignmentUniqueInput,
      },
      include: {
        variant: true,
      },
    });

    if (existingAssignment?.variant
      && !existingAssignment.variant.staleAt
      && (!existingAssignment.variant.expiresAt || existingAssignment.variant.expiresAt > now)) {
      const normalizedQuestions = normalizeStoredQuestionsById(existingAssignment.variant.questionsById);
      if (normalizedQuestions) {
        await Promise.allSettled([
          prisma.dynamicQuestionAssignment.update({
            where: { id: existingAssignment.id },
            data: {
              levelId: levelId || null,
              assignedAt: now,
              expiresAt: resolveDynamicQuestionAssignmentExpiryDate(existingAssignment.variant.expiresAt),
            },
          }),
          prisma.dynamicQuestionVariant.update({
            where: { id: existingAssignment.variant.id },
            data: {
              lastAssignedAt: now,
            },
          }),
        ]);

        return normalizedQuestions;
      }
    }

    if (existingAssignment) {
      await prisma.dynamicQuestionAssignment.delete({
        where: {
          id: existingAssignment.id,
        },
      }).catch(() => {});
    }

    const variants = await prisma.dynamicQuestionVariant.findMany({
      where: {
        cacheScope,
        gameType,
        requestFingerprint,
        staleAt: null,
        OR: [
          { expiresAt: null },
          {
            expiresAt: {
              gt: now,
            },
          },
        ],
      },
      orderBy: [
        { lastAssignedAt: 'asc' },
        { createdAt: 'asc' },
      ],
      take: resolveDynamicQuestionPoolCandidateLimit(),
    });

    if (!Array.isArray(variants) || variants.length === 0) {
      return null;
    }

    let candidateVariants = variants;
    const exclusionCount = resolveDynamicQuestionRecentExclusions();
    if (exclusionCount > 0) {
      const recentAssignments = await prisma.dynamicQuestionAssignment.findMany({
        where: {
          studentId: normalizedStudentId,
          cacheScope,
          gameType,
          requestFingerprint,
        },
        orderBy: {
          assignedAt: 'desc',
        },
        take: exclusionCount,
      });

      const excludedVariantIds = new Set(
        recentAssignments
          .map((assignment) => assignment.variantId)
          .filter((variantId) => typeof variantId === 'string' && variantId.trim()),
      );

      const filtered = variants.filter((variant) => !excludedVariantIds.has(variant.id));
      if (filtered.length > 0) {
        candidateVariants = filtered;
      }
    }

    const selectedVariant = selectStableVariantForLogin({
      variants: candidateVariants,
      studentId: normalizedStudentId,
      loginSessionKey: normalizedSessionKey,
      requestFingerprint,
    });

    if (!selectedVariant) {
      return null;
    }

    const normalizedQuestions = normalizeStoredQuestionsById(selectedVariant.questionsById);
    if (!normalizedQuestions) {
      return null;
    }

    await prisma.dynamicQuestionAssignment.upsert({
      where: {
        studentId_cacheScope_gameType_requestFingerprint_loginSessionKey: assignmentUniqueInput,
      },
      create: {
        ...assignmentUniqueInput,
        levelId: levelId || null,
        variantId: selectedVariant.id,
        assignedAt: now,
        expiresAt: resolveDynamicQuestionAssignmentExpiryDate(selectedVariant.expiresAt),
      },
      update: {
        levelId: levelId || null,
        variantId: selectedVariant.id,
        assignedAt: now,
        expiresAt: resolveDynamicQuestionAssignmentExpiryDate(selectedVariant.expiresAt),
      },
    });

    await prisma.dynamicQuestionVariant.update({
      where: { id: selectedVariant.id },
      data: {
        lastAssignedAt: now,
      },
    }).catch(() => {});

    return normalizedQuestions;
  } catch (error) {
    if (!isMissingPersistentDynamicPoolSchemaError(error)) {
      console.warn('Dynamic question pool assignment fallback:', error.message || error);
    }

    return null;
  }
};

const persistDynamicQuestionVariantAndAssignment = async ({
  studentId,
  levelId,
  loginSessionKey,
  cacheScope,
  gameType,
  requestFingerprint,
  questionsById,
}) => {
  if (!resolvePersistentDynamicQuestionPoolEnabled() || !hasPersistentDynamicQuestionModels()) {
    return;
  }

  const normalizedQuestions = normalizeStoredQuestionsById(questionsById);
  if (!normalizedQuestions || !cacheScope || !requestFingerprint) {
    return;
  }

  const now = new Date();
  const variantFingerprint = buildGeneratedQuestionsFingerprint(normalizedQuestions);
  const variantExpiryDate = resolveDynamicQuestionVariantExpiryDate();

  try {
    const variant = await prisma.dynamicQuestionVariant.upsert({
      where: {
        cacheScope_gameType_requestFingerprint_variantFingerprint: {
          cacheScope,
          gameType,
          requestFingerprint,
          variantFingerprint,
        },
      },
      create: {
        cacheScope,
        gameType,
        requestFingerprint,
        variantFingerprint,
        questionsById: cloneJson(normalizedQuestions),
        expiresAt: variantExpiryDate,
        lastAssignedAt: now,
      },
      update: {
        questionsById: cloneJson(normalizedQuestions),
        staleAt: null,
        expiresAt: variantExpiryDate,
        lastAssignedAt: now,
      },
    });

    const normalizedStudentId = typeof studentId === 'string' ? studentId.trim() : '';
    const normalizedSessionKey = typeof loginSessionKey === 'string' ? loginSessionKey.trim() : '';
    if (!normalizedStudentId || !normalizedSessionKey) {
      return;
    }

    const assignmentUniqueInput = {
      studentId: normalizedStudentId,
      cacheScope,
      gameType,
      requestFingerprint,
      loginSessionKey: normalizedSessionKey,
    };

    await prisma.dynamicQuestionAssignment.upsert({
      where: {
        studentId_cacheScope_gameType_requestFingerprint_loginSessionKey: assignmentUniqueInput,
      },
      create: {
        ...assignmentUniqueInput,
        levelId: levelId || null,
        variantId: variant.id,
        assignedAt: now,
        expiresAt: resolveDynamicQuestionAssignmentExpiryDate(variant.expiresAt),
      },
      update: {
        levelId: levelId || null,
        variantId: variant.id,
        assignedAt: now,
        expiresAt: resolveDynamicQuestionAssignmentExpiryDate(variant.expiresAt),
      },
    });
  } catch (error) {
    if (!isMissingPersistentDynamicPoolSchemaError(error)) {
      console.warn('Dynamic question pool persist fallback:', error.message || error);
    }
  }
};

const invalidateRuntimeDynamicQuestionScope = ({ cacheScope, gameType }) => {
  if (!cacheScope || !gameType) {
    return;
  }

  const cachePrefix = `${cacheScope}|${gameType}|`;
  for (const cacheKey of Array.from(dynamicQuestionCache.keys())) {
    if (cacheKey.startsWith(cachePrefix)) {
      dynamicQuestionCache.delete(cacheKey);
    }
  }
};

const invalidatePersistedDynamicQuestionScope = async ({ cacheScope, gameType }) => {
  if (!resolvePersistentDynamicQuestionPoolEnabled() || !hasPersistentDynamicQuestionModels()) {
    return;
  }

  if (!cacheScope || !gameType) {
    return;
  }

  const staleAt = new Date();

  try {
    await prisma.dynamicQuestionVariant.updateMany({
      where: {
        cacheScope,
        gameType,
        staleAt: null,
      },
      data: {
        staleAt,
      },
    });

    await prisma.dynamicQuestionAssignment.deleteMany({
      where: {
        cacheScope,
        gameType,
      },
    });
  } catch (error) {
    if (!isMissingPersistentDynamicPoolSchemaError(error)) {
      console.warn('Dynamic question scope invalidation fallback:', error.message || error);
    }
  }
};

const getGeneratedQuestionForRequest = (generatedQuestionsById = {}, request = {}) => {
  if (!generatedQuestionsById || typeof generatedQuestionsById !== 'object') {
    return null;
  }

  const canonicalQuestionId = typeof request.questionId === 'string' ? request.questionId : '';
  if (canonicalQuestionId && generatedQuestionsById[canonicalQuestionId]) {
    return generatedQuestionsById[canonicalQuestionId];
  }

  const normalizedQuestionId = normalizeQuestionIdForGemini(request.normalizedQuestionId || canonicalQuestionId);
  if (normalizedQuestionId && generatedQuestionsById[normalizedQuestionId]) {
    return generatedQuestionsById[normalizedQuestionId];
  }

  return null;
};

const setGeneratedQuestionForRequest = (generatedQuestionsById = {}, request = {}, question = null) => {
  if (!question || typeof question !== 'object') {
    return;
  }

  const canonicalQuestionId = typeof request.questionId === 'string' ? request.questionId : '';
  if (canonicalQuestionId) {
    generatedQuestionsById[canonicalQuestionId] = question;
  }

  const normalizedQuestionId = normalizeQuestionIdForGemini(request.normalizedQuestionId || canonicalQuestionId);
  if (normalizedQuestionId) {
    generatedQuestionsById[normalizedQuestionId] = question;
  }
};

const generateMissingQuestionsIndividually = async ({
  statueRequests,
  generatedQuestionsById,
  deadlineAt = 0,
}) => {
  const nextQuestionsById = { ...(generatedQuestionsById || {}) };
  const requests = Array.isArray(statueRequests) ? statueRequests : [];
  const parsedDeadline = Number(deadlineAt);
  const overallDeadline = Number.isFinite(parsedDeadline) && parsedDeadline > Date.now()
    ? parsedDeadline
    : Date.now() + resolveDynamicQuestionTimeoutMs();

  const getAttemptTimeoutMs = () => {
    const remainingMs = overallDeadline - Date.now();
    if (remainingMs <= 0) {
      return 0;
    }

    return clampNumber(remainingMs, 3500, 15000);
  };

  const buildStrategies = (request) => {
    const base = {
      topic: request.topic,
      difficulty: request.difficulty,
      gradeLevel: request.gradeLevel,
      questionType: 'multiple-choice',
      language: request.language,
      instructions: request.instructions,
      choicesCount: request.choicesCount,
    };

    return [
      base,
      {
        ...base,
        instructions: '',
      },
      {
        ...base,
        difficulty: 'medium',
        gradeLevel: '',
        language: 'English',
        instructions: '',
      },
      {
        ...base,
        difficulty: 'medium',
        gradeLevel: '',
        language: 'English',
        instructions: '',
        choicesCount: 4,
      },
    ];
  };

  const generateViaBatchFallback = async (request) => {
    const timeoutMs = getAttemptTimeoutMs();
    if (!timeoutMs) {
      return null;
    }

    try {
      const payload = await withTimeout(
        generateQuestionWithGemini({
          topic: request.topic,
          difficulty: request.difficulty,
          gradeLevel: request.gradeLevel,
          questionType: 'multiple-choice',
          language: request.language,
          instructions: request.instructions,
          choicesCount: request.choicesCount,
          questionCount: 16,
        }),
        timeoutMs,
        'Dynamic batch-question generation timed out',
      );

      const batchQuestions = Array.isArray(payload?.questions) ? payload.questions : [];
      const [firstQuestion, ...retryQuestions] = batchQuestions;
      return firstQuestion && typeof firstQuestion === 'object'
        ? {
            ...firstQuestion,
            retryQuestions,
          }
        : null;
    } catch {
      return null;
    }
  };

  for (const request of requests) {
    if (!request?.questionId || getGeneratedQuestionForRequest(nextQuestionsById, request)) {
      continue;
    }

    const strategies = buildStrategies(request);

    for (const strategy of strategies) {
      if (getGeneratedQuestionForRequest(nextQuestionsById, request)) {
        break;
      }

      const timeoutMs = getAttemptTimeoutMs();
      if (!timeoutMs) {
        break;
      }

      const retryInstructions = [
        strategy.instructions,
        'Return strict JSON only. Keep question concise with exactly two hints and the requested number of choices.',
      ].filter(Boolean).join('\n');

      try {
        const result = await withTimeout(
          generateSingleQuestionWithGemini({
            topic: strategy.topic,
            difficulty: strategy.difficulty,
            gradeLevel: strategy.gradeLevel,
            questionType: strategy.questionType,
            language: strategy.language,
            instructions: retryInstructions,
            choicesCount: strategy.choicesCount,
          }),
          timeoutMs,
          'Dynamic single-question generation timed out',
        );

        if (result?.question && typeof result.question === 'object') {
          setGeneratedQuestionForRequest(nextQuestionsById, request, result.question);
          break;
        }
      } catch {
        // Keep retrying until attempts are exhausted.
      }
    }

    if (!getGeneratedQuestionForRequest(nextQuestionsById, request)) {
      const batchFallbackQuestion = await generateViaBatchFallback(request);
      if (batchFallbackQuestion) {
        setGeneratedQuestionForRequest(nextQuestionsById, request, batchFallbackQuestion);
      }
    }
  }

  return nextQuestionsById;
};

const enrichGeneratedQuestionRetryPools = async ({
  statueRequests,
  generatedQuestionsById,
  deadlineAt = 0,
}) => {
  const nextQuestionsById = { ...(generatedQuestionsById || {}) };
  const requests = Array.isArray(statueRequests) ? statueRequests : [];
  const parsedDeadline = Number(deadlineAt);
  const overallDeadline = Number.isFinite(parsedDeadline) && parsedDeadline > Date.now()
    ? parsedDeadline
    : Date.now() + resolveDynamicQuestionTimeoutMs();

  const getAttemptTimeoutMs = () => {
    const remainingMs = overallDeadline - Date.now();
    if (remainingMs <= 0) {
      return 0;
    }

    return clampNumber(remainingMs, 3500, 12000);
  };

  for (const request of requests) {
    const existingQuestion = getGeneratedQuestionForRequest(nextQuestionsById, request);
    if (!request?.questionId || !existingQuestion || (Array.isArray(existingQuestion.retryQuestions) && existingQuestion.retryQuestions.length > 0)) {
      continue;
    }

    const timeoutMs = getAttemptTimeoutMs();
    if (!timeoutMs) {
      break;
    }

    try {
      const retryPool = await withTimeout(
        generateQuestionRetryPoolWithGemini({
          topic: request.topic,
          difficulty: request.difficulty,
          gradeLevel: request.gradeLevel,
          questionType: 'multiple-choice',
          language: request.language,
          instructions: request.instructions,
          choicesCount: request.choicesCount,
          existingQuestion,
          retryQuestionCount: 15,
        }),
        timeoutMs,
        'Dynamic retry-question generation timed out',
      );

      if (Array.isArray(retryPool?.retryQuestions) && retryPool.retryQuestions.length > 0) {
        setGeneratedQuestionForRequest(nextQuestionsById, request, {
          ...existingQuestion,
          retryQuestions: retryPool.retryQuestions,
        });
      }
    } catch {
      // Keep the primary generated question even if retry-pool generation fails.
    }
  }

  return nextQuestionsById;
};

const generateStatueQuestionsForRequests = async (statueRequestList = [], {
  timeoutMs = resolveDynamicQuestionTimeoutMs(),
  throwOnMissing = true,
} = {}) => {
  const safeTimeoutMs = clampNumber(
    Number(timeoutMs) || resolveDynamicQuestionTimeoutMs(),
    MIN_DYNAMIC_QUESTION_TIMEOUT_MS,
    MAX_DYNAMIC_QUESTION_TIMEOUT_MS,
  );
  const overallDeadline = Date.now() + safeTimeoutMs;
  const getRemainingTimeoutMs = () => Math.max(0, overallDeadline - Date.now());
  const variationSeed = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const requestsWithVariation = (Array.isArray(statueRequestList) ? statueRequestList : []).map((request, index) => ({
    ...request,
    instructions: [
      request.instructions,
      `Create a fresh variation for seed ${variationSeed}-${index}. Do not mention this seed in output.`,
    ].filter(Boolean).join('\n'),
  }));

  let generatedQuestionsById = {};

  try {
    const batchTimeoutMs = getRemainingTimeoutMs();
    if (!batchTimeoutMs) {
      throw new Error('Dynamic question generation timed out');
    }

    const payload = await withTimeout(
      generateStatueQuestionsWithGemini({
        statues: requestsWithVariation.map((request) => ({
          ...request,
          questionId: normalizeQuestionIdForGemini(request.questionId),
        })),
      }),
      batchTimeoutMs,
      'Dynamic question generation timed out',
    );

    if (payload?.questionsById && typeof payload.questionsById === 'object') {
      generatedQuestionsById = payload.questionsById;
    }
  } catch {
    generatedQuestionsById = {};
  }

  generatedQuestionsById = await generateMissingQuestionsIndividually({
    statueRequests: requestsWithVariation,
    generatedQuestionsById,
    deadlineAt: overallDeadline,
  });

  generatedQuestionsById = await enrichGeneratedQuestionRetryPools({
    statueRequests: requestsWithVariation,
    generatedQuestionsById,
    deadlineAt: overallDeadline,
  });

  const missingQuestionIds = requestsWithVariation
    .filter((request) => !getGeneratedQuestionForRequest(generatedQuestionsById, request))
    .map((request) => request.questionId);

  if (missingQuestionIds.length > 0 && throwOnMissing) {
    const missingPreview = missingQuestionIds.slice(0, 3).join(', ');
    const generationError = new Error(
      `Unable to generate all statue questions right now. Missing ${missingQuestionIds.length} question(s): ${missingPreview}. Please retry.`,
    );
    generationError.statusCode = 503;
    throw generationError;
  }

  return generatedQuestionsById;
};

const toVillainArray = (value) => {
  if (Array.isArray(value)) {
    return value.filter((entry) => entry && typeof entry === 'object');
  }

  if (value && typeof value === 'object') {
    return [value];
  }

  return [];
};

const normalizeStatueTopic = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, 140);
};

const isGenericFallbackTopic = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'solve the statue riddle.'
    || normalized === 'what is the correct answer?';
};

const normalizeStatueChoicesCount = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    return 4;
  }

  return Math.min(6, Math.max(2, parsed));
};

const normalizeStatueDifficulty = (value) => {
  const parsed = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (parsed === 'easy' || parsed === 'medium' || parsed === 'hard') {
    return parsed;
  }

  return 'medium';
};

const normalizeStatueLanguage = (value) => {
  if (typeof value !== 'string') {
    return 'English';
  }

  const parsed = value.trim().slice(0, 40);
  return parsed || 'English';
};

const normalizeStatueGradeLevel = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, 40);
};

const normalizeStatueInstructions = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, 500);
};

const normalizeQuestionPrompt = (generatedQuestion = {}) => {
  const truncatePrompt = (value) => {
    const normalized = String(value || '').trim();
    if (!normalized || normalized.length <= MAX_RUNTIME_PROMPT_LENGTH) {
      return normalized;
    }

    const safeLength = Math.max(1, MAX_RUNTIME_PROMPT_LENGTH - 3);
    return `${normalized.slice(0, safeLength).trimEnd()}...`;
  };

  const formatted = typeof generatedQuestion.formattedQuestion === 'string'
    ? generatedQuestion.formattedQuestion.trim()
    : '';
  if (formatted) {
    return truncatePrompt(formatted);
  }

  const plain = typeof generatedQuestion.question === 'string'
    ? generatedQuestion.question.trim()
    : '';

  return truncatePrompt(plain);
};

const normalizeGeneratedChoices = (generatedQuestion = {}, fallbackChoices = []) => {
  const generatedChoices = Array.isArray(generatedQuestion.choices)
    ? generatedQuestion.choices
      .map((choice) => (typeof choice === 'string' ? choice.trim() : ''))
      .filter(Boolean)
    : [];

  if (generatedChoices.length >= 2) {
    return generatedChoices;
  }

  if (Array.isArray(fallbackChoices) && fallbackChoices.length >= 2) {
    return fallbackChoices;
  }

  return ['A', 'B', 'C', 'D'];
};

const clampAnswerIndex = (value, choicesLength, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, 0), Math.max(0, choicesLength - 1));
};

const toChoiceOptionId = (index) => String.fromCharCode(97 + Math.min(25, Math.max(0, Number(index) || 0)));

const normalizePairQuestionOptions = (options = []) => {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option, index) => {
      if (option && typeof option === 'object') {
        const label = typeof option.label === 'string' ? option.label.trim() : '';
        if (label) {
          return label;
        }
      }

      const rawValue = String(option || '').trim();
      if (rawValue) {
        return rawValue;
      }

      return toChoiceOptionId(index).toUpperCase();
    })
    .filter(Boolean);
};

const resolvePairQuestionAnswerIndex = (question = {}, options = []) => {
  if (!Array.isArray(options) || options.length === 0) {
    return 0;
  }

  const explicitIndex = Number(question?.answerIndex);
  if (Number.isInteger(explicitIndex) && explicitIndex >= 0 && explicitIndex < options.length) {
    return explicitIndex;
  }

  const correctOptionId = typeof question?.correctOptionId === 'string'
    ? question.correctOptionId.trim().toLowerCase()
    : '';

  if (correctOptionId) {
    const resolvedIndex = options.findIndex((option) => option.id === correctOptionId);
    if (resolvedIndex >= 0) {
      return resolvedIndex;
    }
  }

  return 0;
};

const normalizeGameThreeHints = (generatedHints = [], fallbackHints = [], pairLabel = '') => {
  const normalizedGeneratedHints = (Array.isArray(generatedHints) ? generatedHints : [])
    .map((hint) => (typeof hint === 'string' ? hint.trim() : ''))
    .filter(Boolean)
    .slice(0, 3);

  if (normalizedGeneratedHints.length > 0) {
    return normalizedGeneratedHints;
  }

  const normalizedFallbackHints = (Array.isArray(fallbackHints) ? fallbackHints : [])
    .map((hint) => (typeof hint === 'string' ? hint.trim() : ''))
    .filter(Boolean)
    .slice(0, 3);

  if (normalizedFallbackHints.length > 0) {
    return normalizedFallbackHints;
  }

  const safeLabel = typeof pairLabel === 'string' && pairLabel.trim()
    ? pairLabel.trim().slice(0, 48)
    : 'the part';

  return [
    `Think about the primary role of ${safeLabel}.`,
    'Eliminate options that clearly describe a different component.',
  ];
};

const isPlaceholderPairQuestionPrompt = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.startsWith('sample question for')
    || normalized.includes('choose the correct option');
};

const mergeGeneratedPairQuestion = ({
  pairId,
  pairLabel,
  currentQuestion,
  generatedQuestion,
  topic,
}) => {
  const fallbackPrompt = typeof currentQuestion?.prompt === 'string' && currentQuestion.prompt.trim()
    ? currentQuestion.prompt.trim()
    : `What is the primary role of ${pairLabel || 'this part'}?`;
  const prompt = normalizeQuestionPrompt(generatedQuestion) || fallbackPrompt;
  const fallbackChoices = normalizePairQuestionOptions(currentQuestion?.options);
  const choices = normalizeGeneratedChoices(generatedQuestion, fallbackChoices);
  const options = choices.map((choice, index) => ({
    id: toChoiceOptionId(index),
    label: choice,
  }));

  const fallbackAnswerIndex = resolvePairQuestionAnswerIndex(currentQuestion, options);
  const answerIndex = clampAnswerIndex(
    generatedQuestion?.answerIndex,
    options.length,
    fallbackAnswerIndex,
  );

  return {
    ...(currentQuestion || {}),
    id: pairId,
    prompt,
    options,
    correctOptionId: options[answerIndex]?.id || options[0]?.id || 'a',
    hints: normalizeGameThreeHints(generatedQuestion?.hints, currentQuestion?.hints, pairLabel),
    explanation: typeof generatedQuestion?.explanation === 'string' && generatedQuestion.explanation.trim()
      ? generatedQuestion.explanation.trim()
      : (typeof currentQuestion?.explanation === 'string' ? currentQuestion.explanation.trim() : ''),
    topic,
    difficulty: normalizeStatueDifficulty(generatedQuestion?.difficulty || currentQuestion?.difficulty),
    isDynamic: true,
    generatedAt: new Date().toISOString(),
  };
};

const mergeGeneratedQuestion = ({
  questionId,
  currentQuestion,
  generatedQuestion,
  topic,
}) => {
  const fallbackPrompt = typeof currentQuestion?.prompt === 'string'
    ? currentQuestion.prompt
    : 'Solve the statue riddle.';
  const prompt = normalizeQuestionPrompt(generatedQuestion) || fallbackPrompt;
  const choices = normalizeGeneratedChoices(generatedQuestion, currentQuestion?.choices);
  const answerIndex = clampAnswerIndex(
    generatedQuestion?.answerIndex,
    choices.length,
    clampAnswerIndex(currentQuestion?.answerIndex, choices.length, 0),
  );
  const retryQuestions = Array.isArray(generatedQuestion?.retryQuestions)
    ? generatedQuestion.retryQuestions
      .map((retryQuestion) => {
        const retryPrompt = normalizeQuestionPrompt(retryQuestion);
        const retryChoices = normalizeGeneratedChoices(retryQuestion, currentQuestion?.choices);
        const retryAnswerIndex = clampAnswerIndex(
          retryQuestion?.answerIndex,
          retryChoices.length,
          clampAnswerIndex(currentQuestion?.answerIndex, retryChoices.length, 0),
        );

        if (!retryPrompt || retryChoices.length < 2) {
          return null;
        }

        return {
          prompt: retryPrompt,
          formattedQuestion: typeof retryQuestion?.formattedQuestion === 'string' && retryQuestion.formattedQuestion.trim()
            ? retryQuestion.formattedQuestion.trim()
            : retryPrompt,
          choices: retryChoices,
          answerIndex: retryAnswerIndex,
          explanation: typeof retryQuestion?.explanation === 'string' && retryQuestion.explanation.trim()
            ? retryQuestion.explanation.trim()
            : (typeof generatedQuestion?.explanation === 'string' ? generatedQuestion.explanation.trim() : ''),
          hints: Array.isArray(retryQuestion?.hints) && retryQuestion.hints.length
            ? retryQuestion.hints
            : (Array.isArray(generatedQuestion?.hints) ? generatedQuestion.hints : []),
          topic,
          isDynamic: true,
        };
      })
      .filter(Boolean)
    : [];

  return {
    ...(currentQuestion || {}),
    id: questionId,
    prompt,
    choices,
    answerIndex,
    successText: typeof currentQuestion?.successText === 'string' && currentQuestion.successText.trim()
      ? currentQuestion.successText.trim()
      : DEFAULT_STATUE_SUCCESS_TEXT,
    failureText: typeof currentQuestion?.failureText === 'string' && currentQuestion.failureText.trim()
      ? currentQuestion.failureText.trim()
      : DEFAULT_STATUE_FAILURE_TEXT,
    explanation: typeof generatedQuestion?.explanation === 'string' && generatedQuestion.explanation.trim()
      ? generatedQuestion.explanation.trim()
      : (typeof currentQuestion?.explanation === 'string' ? currentQuestion.explanation : ''),
    hints: Array.isArray(generatedQuestion?.hints) && generatedQuestion.hints.length
      ? generatedQuestion.hints
      : (Array.isArray(currentQuestion?.hints) ? currentQuestion.hints : []),
    retryQuestions,
    topic,
    isDynamic: true,
    generatedAt: new Date().toISOString(),
  };
};

const injectDynamicStatueQuestions = async (levelData, {
  gameType,
  skipDynamicQuestions = false,
  cacheScope = 'global',
  studentId = '',
  loginSessionKey = '',
  levelId = '',
} = {}) => {
  if (skipDynamicQuestions || gameType !== 'GAME_ONE') {
    return levelData;
  }

  if (!levelData || typeof levelData !== 'object') {
    return levelData;
  }

  if (!(await isAiEnabled()) || !hasAIProviderCredentials() || typeof fetch !== 'function') {
    return levelData;
  }

  const existingQuestions = Array.isArray(levelData.questions)
    ? levelData.questions.filter((question) => question && typeof question === 'object')
    : [];

  const questionById = new Map();
  existingQuestions.forEach((question) => {
    if (typeof question.id !== 'string') {
      return;
    }

    const questionId = question.id.trim();
    if (questionId) {
      questionById.set(questionId, question);
    }
  });

  const statueRequests = new Map();
  const villainEntries = toVillainArray(levelData?.worldObjects?.villain);

  villainEntries.forEach((villain) => {
    const appearance = typeof villain.appearance === 'string' ? villain.appearance.trim().toUpperCase() : '';
    if (appearance && appearance !== 'STATUE') {
      return;
    }

    const questionId = typeof villain.questionId === 'string' ? villain.questionId.trim() : '';
    const normalizedQuestionId = normalizeQuestionIdForGemini(questionId);
    if (!questionId || !normalizedQuestionId || statueRequests.has(questionId)) {
      return;
    }

    const existingQuestion = questionById.get(questionId);
    const existingPrompt = typeof existingQuestion?.prompt === 'string'
      ? existingQuestion.prompt.trim()
      : '';
    const fallbackPromptTopic = existingPrompt && !isGenericFallbackTopic(existingPrompt)
      ? existingPrompt
      : '';

    const topic = normalizeStatueTopic(
      villain.questionTopic
      || villain.topic
      || villain.aiTopic
      || fallbackPromptTopic,
    );
    if (!topic) {
      return;
    }

    statueRequests.set(questionId, {
      questionId,
      normalizedQuestionId,
      topic,
      choicesCount: normalizeStatueChoicesCount(villain.aiChoicesCount || villain.choicesCount),
      difficulty: normalizeStatueDifficulty(villain.aiDifficulty || villain.difficulty),
      language: normalizeStatueLanguage(villain.aiLanguage || villain.language),
      gradeLevel: normalizeStatueGradeLevel(villain.aiGradeLevel || villain.gradeLevel),
      instructions: normalizeStatueInstructions(villain.aiInstructions || villain.instructions),
    });
  });

  if (statueRequests.size === 0) {
    return levelData;
  }

  const statueRequestList = Array.from(statueRequests.values());
  const requestFingerprint = buildStatueRequestFingerprint(statueRequestList);
  const cacheKey = buildDynamicQuestionCacheKey({
    cacheScope,
    gameType,
    statueRequests: statueRequestList,
  });
  const sessionScopedCacheKey = buildSessionScopedDynamicCacheKey({
    cacheKey,
    studentId,
    loginSessionKey,
  });

  let resolvedFromPersistentPool = false;

  let generatedQuestionsById = sessionScopedCacheKey
    ? getCachedDynamicQuestions(sessionScopedCacheKey)
    : getCachedDynamicQuestions(cacheKey);

  if (!generatedQuestionsById && sessionScopedCacheKey) {
    generatedQuestionsById = await resolvePersistentAssignedDynamicQuestions({
      studentId,
      levelId,
      loginSessionKey,
      cacheScope,
      gameType,
      requestFingerprint,
    });

    if (generatedQuestionsById) {
      resolvedFromPersistentPool = true;
      setCachedDynamicQuestions(sessionScopedCacheKey, generatedQuestionsById);
    }
  }

  if (!generatedQuestionsById && sessionScopedCacheKey) {
    generatedQuestionsById = getCachedDynamicQuestions(cacheKey);
    if (generatedQuestionsById) {
      setCachedDynamicQuestions(sessionScopedCacheKey, generatedQuestionsById);
    }
  }

  if (!generatedQuestionsById) {
    const activeGeneration = dynamicQuestionInFlight.get(cacheKey);
    if (activeGeneration) {
      generatedQuestionsById = await activeGeneration;
    } else {
      const generationPromise = generateStatueQuestionsForRequests(statueRequestList);
      dynamicQuestionInFlight.set(cacheKey, generationPromise);

      try {
        generatedQuestionsById = await generationPromise;
        setCachedDynamicQuestions(cacheKey, generatedQuestionsById);
      } finally {
        dynamicQuestionInFlight.delete(cacheKey);
      }
    }
  }

  if (generatedQuestionsById && sessionScopedCacheKey && !resolvedFromPersistentPool) {
    setCachedDynamicQuestions(sessionScopedCacheKey, generatedQuestionsById);
    await persistDynamicQuestionVariantAndAssignment({
      studentId,
      levelId,
      loginSessionKey,
      cacheScope,
      gameType,
      requestFingerprint,
      questionsById: generatedQuestionsById,
    });
  }

  const replacementsById = new Map();
  statueRequests.forEach((request) => {
    const generatedQuestion = getGeneratedQuestionForRequest(generatedQuestionsById, request);
    if (!generatedQuestion) {
      return;
    }

    replacementsById.set(request.questionId, mergeGeneratedQuestion({
      questionId: request.questionId,
      currentQuestion: questionById.get(request.questionId),
      generatedQuestion,
      topic: request.topic,
    }));
  });

  if (replacementsById.size === 0) {
    return levelData;
  }

  const replacedQuestionIds = new Set();
  const nextQuestions = existingQuestions.map((question) => {
    const questionId = typeof question.id === 'string' ? question.id.trim() : '';
    if (!questionId || !replacementsById.has(questionId)) {
      return question;
    }

    replacedQuestionIds.add(questionId);
    return replacementsById.get(questionId);
  });

  replacementsById.forEach((replacement, questionId) => {
    if (!replacedQuestionIds.has(questionId)) {
      nextQuestions.push(replacement);
    }
  });

  return {
    ...levelData,
    questions: nextQuestions,
  };
};

const injectDynamicGameTwoPartQuestions = async (levelData, {
  gameType,
  skipDynamicQuestions = false,
  cacheScope = 'global',
  studentId = '',
  loginSessionKey = '',
  levelId = '',
} = {}) => {
  if (skipDynamicQuestions || gameType !== 'GAME_TWO') {
    return levelData;
  }

  if (!levelData || typeof levelData !== 'object') {
    return levelData;
  }

  if (!(await isAiEnabled()) || !hasAIProviderCredentials() || typeof fetch !== 'function') {
    return levelData;
  }

  const existingParts = Array.isArray(levelData.parts)
    ? levelData.parts.filter((part) => part && typeof part === 'object')
    : [];

  if (existingParts.length === 0) {
    return levelData;
  }

  const partRequests = new Map();
  existingParts.forEach((part) => {
    const partId = typeof part.id === 'string' ? part.id.trim() : '';
    const normalizedPartId = normalizeQuestionIdForGemini(partId);
    if (!partId || !normalizedPartId || partRequests.has(partId)) {
      return;
    }

    const existingQuestion = part.question && typeof part.question === 'object'
      ? part.question
      : {};
    const existingPrompt = typeof existingQuestion.prompt === 'string'
      ? existingQuestion.prompt.trim()
      : '';
    const label = typeof part.label === 'string' ? part.label.trim() : '';
    const info = typeof part.info === 'string' ? part.info.trim() : '';
    const topic = normalizeStatueTopic(
      part.aiTopic
      || part.topic
      || existingQuestion.topic
      || label
      || info
      || (existingPrompt && !isPlaceholderPairQuestionPrompt(existingPrompt) ? existingPrompt : ''),
    );

    if (!topic) {
      return;
    }

    const existingOptionCount = normalizePairQuestionOptions(existingQuestion.options).length;

    partRequests.set(partId, {
      questionId: partId,
      normalizedQuestionId: normalizedPartId,
      topic,
      choicesCount: normalizeStatueChoicesCount(part.aiChoicesCount || existingOptionCount || 4),
      difficulty: normalizeStatueDifficulty(part.aiDifficulty || existingQuestion.difficulty),
      language: normalizeStatueLanguage(part.aiLanguage || existingQuestion.language),
      gradeLevel: normalizeStatueGradeLevel(part.aiGradeLevel || existingQuestion.gradeLevel),
      instructions: normalizeStatueInstructions([
        part.aiInstructions,
        'Generate one concise multiple-choice question about computer hardware assembly.',
        label ? `The question should teach the role of ${label}.` : '',
        'Return 2 to 3 short hints that help without revealing the answer directly.',
      ].filter(Boolean).join('\n')),
    });
  });

  if (partRequests.size === 0) {
    return levelData;
  }

  const partRequestList = Array.from(partRequests.values());
  const requestFingerprint = buildStatueRequestFingerprint(partRequestList);
  const cacheKey = buildDynamicQuestionCacheKey({
    cacheScope,
    gameType,
    statueRequests: partRequestList,
  });
  const sessionScopedCacheKey = buildSessionScopedDynamicCacheKey({
    cacheKey,
    studentId,
    loginSessionKey,
  });

  let resolvedFromPersistentPool = false;

  let generatedQuestionsById = sessionScopedCacheKey
    ? getCachedDynamicQuestions(sessionScopedCacheKey)
    : getCachedDynamicQuestions(cacheKey);

  if (!generatedQuestionsById && sessionScopedCacheKey) {
    generatedQuestionsById = await resolvePersistentAssignedDynamicQuestions({
      studentId,
      levelId,
      loginSessionKey,
      cacheScope,
      gameType,
      requestFingerprint,
    });

    if (generatedQuestionsById) {
      resolvedFromPersistentPool = true;
      setCachedDynamicQuestions(sessionScopedCacheKey, generatedQuestionsById);
    }
  }

  if (!generatedQuestionsById && sessionScopedCacheKey) {
    generatedQuestionsById = getCachedDynamicQuestions(cacheKey);
    if (generatedQuestionsById) {
      setCachedDynamicQuestions(sessionScopedCacheKey, generatedQuestionsById);
    }
  }

  if (!generatedQuestionsById) {
    try {
      const activeGeneration = dynamicQuestionInFlight.get(cacheKey);
      if (activeGeneration) {
        generatedQuestionsById = await activeGeneration;
      } else {
        const generationPromise = generateStatueQuestionsForRequests(partRequestList, {
          timeoutMs: resolvePlayableDynamicQuestionTimeoutMs(),
          throwOnMissing: false,
        });
        dynamicQuestionInFlight.set(cacheKey, generationPromise);

        try {
          generatedQuestionsById = await generationPromise;
          setCachedDynamicQuestions(cacheKey, generatedQuestionsById);
        } finally {
          dynamicQuestionInFlight.delete(cacheKey);
        }
      }
    } catch (error) {
      console.warn('GAME_TWO dynamic question generation skipped:', error.message || error);
      return levelData;
    }
  }

  if (generatedQuestionsById && sessionScopedCacheKey && !resolvedFromPersistentPool) {
    setCachedDynamicQuestions(sessionScopedCacheKey, generatedQuestionsById);
    await persistDynamicQuestionVariantAndAssignment({
      studentId,
      levelId,
      loginSessionKey,
      cacheScope,
      gameType,
      requestFingerprint,
      questionsById: generatedQuestionsById,
    });
  }

  const nextParts = existingParts.map((part) => {
    const partId = typeof part.id === 'string' ? part.id.trim() : '';
    if (!partId || !partRequests.has(partId)) {
      return part;
    }

    const request = partRequests.get(partId);
    const generatedQuestion = getGeneratedQuestionForRequest(generatedQuestionsById, request);
    if (!generatedQuestion) {
      return part;
    }

    const currentQuestion = part.question && typeof part.question === 'object' ? part.question : {};

    return {
      ...part,
      question: mergeGeneratedPairQuestion({
        pairId: partId,
        pairLabel: typeof part.label === 'string' ? part.label.trim() : partId,
        currentQuestion,
        generatedQuestion,
        topic: request.topic,
      }),
    };
  });

  return {
    ...levelData,
    parts: nextParts,
  };
};

const mapLevelContentResponse = (level, content) => ({
  level: {
    id: level.id,
    gameType: level.gameType,
    levelNumber: level.gameLevelNumber,
    legacyLevelNumber: level.levelNumber,
    title: level.title,
    description: level.description,
    isActive: level.isActive,
  },
  content: {
    id: content.id,
    draftJson: cloneJson(content.draftJson),
    publishedJson: cloneJson(content.publishedJson),
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
    updatedBy: content.updatedBy
      ? {
          id: content.updatedBy.id,
          username: content.updatedBy.username,
          firstName: content.updatedBy.firstName,
          lastName: content.updatedBy.lastName,
        }
      : null,
  },
  hasDraftChanges: JSON.stringify(content.draftJson) !== JSON.stringify(content.publishedJson),
});

const getLevelContentRecord = async (gameType, gameLevelNumber) => {
  await ensureLevelCatalog();

  const level = await getLevelDefinitionByGame(gameType, gameLevelNumber);
  if (!level) {
    throw new Error('Level not found for that game track.');
  }

  const content = await prisma.levelContent.findUnique({
    where: { levelId: level.id },
    include: {
      updatedBy: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!content) {
    throw new Error('Level content is not configured yet.');
  }

  return { level, content };
};

const getAdminLevelContent = async (gameType, gameLevelNumber) => {
  const { level, content } = await getLevelContentRecord(gameType, gameLevelNumber);
  return mapLevelContentResponse(level, content);
};

const saveLevelDraft = async (gameType, gameLevelNumber, levelData, actorUserId) => {
  await ensureLevelCatalog();

  const level = await getLevelDefinitionByGame(gameType, gameLevelNumber);
  if (!level) {
    throw new Error('Level not found for that game track.');
  }

  await prisma.levelContent.update({
    where: { levelId: level.id },
    data: {
      draftJson: cloneJson(levelData),
      updatedByUserId: actorUserId || null,
    },
  });

  return getAdminLevelContent(gameType, gameLevelNumber);
};

const publishLevelContent = async (gameType, gameLevelNumber, actorUserId) => {
  await ensureLevelCatalog();

  const level = await getLevelDefinitionByGame(gameType, gameLevelNumber);
  if (!level) {
    throw new Error('Level not found for that game track.');
  }

  const content = await prisma.levelContent.findUnique({
    where: { levelId: level.id },
    select: {
      draftJson: true,
    },
  });

  if (!content) {
    throw new Error('Level content is not configured yet.');
  }

  await prisma.levelContent.update({
    where: { levelId: level.id },
    data: {
      publishedJson: cloneJson(content.draftJson),
      publishedAt: new Date(),
      updatedByUserId: actorUserId || null,
    },
  });

  const catalogCacheScope = `catalog:${level.id}:level:${Number(gameLevelNumber)}`;
  invalidateRuntimeDynamicQuestionScope({
    cacheScope: catalogCacheScope,
    gameType: level.gameType,
  });
  await invalidatePersistedDynamicQuestionScope({
    cacheScope: catalogCacheScope,
    gameType: level.gameType,
  });

  return getAdminLevelContent(gameType, gameLevelNumber);
};

const getPublishedLevelContent = async (gameType, gameLevelNumber, options = {}) => {
  const { level, content } = await getLevelContentRecord(gameType, gameLevelNumber);

  const scopedTeacherId = typeof options.teacherId === 'string' ? options.teacherId.trim() : '';
  if (scopedTeacherId && level.gameType === 'GAME_ONE') {
    const teacherPlayableLevelData = await getTeacherPlayableLevelData(scopedTeacherId, Number(gameLevelNumber));
    if (!teacherPlayableLevelData) {
      if (options.allowMissing) {
        return {
          level: {
            id: level.id,
            gameType: level.gameType,
            levelNumber: level.gameLevelNumber,
            title: level.title,
          },
          levelData: null,
          publishedAt: null,
        };
      }

      throw new Error('Level is not available for your assigned course yet.');
    }

    const teacherLevelDataWithStatues = await injectDynamicStatueQuestions(cloneJson(teacherPlayableLevelData), {
      gameType: level.gameType,
      skipDynamicQuestions: Boolean(options.skipDynamicQuestions),
      cacheScope: `teacher:${scopedTeacherId}:level:${Number(gameLevelNumber)}`,
      studentId: options.studentId,
      loginSessionKey: options.loginSessionKey,
      levelId: level.id,
    });

    const teacherLevelDataWithPartQuestions = await injectDynamicGameTwoPartQuestions(teacherLevelDataWithStatues, {
      gameType: level.gameType,
      skipDynamicQuestions: Boolean(options.skipDynamicQuestions),
      cacheScope: `teacher:${scopedTeacherId}:level:${Number(gameLevelNumber)}`,
      studentId: options.studentId,
      loginSessionKey: options.loginSessionKey,
      levelId: level.id,
    });

    // Game 3 is matching-only; serve the authored pairs without AI questions.
    const teacherLevelData = teacherLevelDataWithPartQuestions;

    return {
      level: {
        id: level.id,
        gameType: level.gameType,
        levelNumber: level.gameLevelNumber,
        title: level.title,
      },
      levelData: teacherLevelData,
      publishedAt: null,
    };
  }

  const clonedPublishedJson = cloneJson(content.publishedJson);
  const levelDataWithStatues = await injectDynamicStatueQuestions(clonedPublishedJson, {
    gameType: level.gameType,
    skipDynamicQuestions: Boolean(options.skipDynamicQuestions),
    cacheScope: `catalog:${level.id}:level:${Number(gameLevelNumber)}`,
    studentId: options.studentId,
    loginSessionKey: options.loginSessionKey,
    levelId: level.id,
  });

  const levelDataWithPartQuestions = await injectDynamicGameTwoPartQuestions(levelDataWithStatues, {
    gameType: level.gameType,
    skipDynamicQuestions: Boolean(options.skipDynamicQuestions),
    cacheScope: `catalog:${level.id}:level:${Number(gameLevelNumber)}`,
    studentId: options.studentId,
    loginSessionKey: options.loginSessionKey,
    levelId: level.id,
  });

  const levelData = levelDataWithPartQuestions;

  return {
    level: {
      id: level.id,
      gameType: level.gameType,
      levelNumber: level.gameLevelNumber,
      title: level.title,
    },
    levelData,
    publishedAt: content.publishedAt,
  };
};

module.exports = {
  getAdminLevelCatalog,
  getAdminLevelContent,
  saveLevelDraft,
  publishLevelContent,
  getPublishedLevelContent,
};
