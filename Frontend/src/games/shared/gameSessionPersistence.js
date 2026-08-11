const STORAGE_KEY = 'itechsGameSessionPersistence';

export const GAME_SCORE_RULES = Object.freeze({
  CORRECT_ANSWER_POINTS: 100,
  CORRECT_TYPED_WORD_POINTS: 100,
  CORRECT_ACTION_COINS: 1,
  STARTING_STARS: 3,
  MIN_STARS_TO_ADVANCE: 2,
  HINT_COIN_COST: 1,
  TIME_BONUS_START: 50,
  TIME_BONUS_STEP_SECONDS: 30,
  TIME_BONUS_STEP_POINTS: 10,
  TIME_BONUS_MIN: 10,
});

export const getTimedAnswerBonus = (elapsedSeconds = 0) => {
  const elapsedIntervals = Math.max(0, Math.floor(Number(elapsedSeconds || 0) / GAME_SCORE_RULES.TIME_BONUS_STEP_SECONDS));
  return Math.max(
    GAME_SCORE_RULES.TIME_BONUS_START - (elapsedIntervals * GAME_SCORE_RULES.TIME_BONUS_STEP_POINTS),
    GAME_SCORE_RULES.TIME_BONUS_MIN,
  );
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const getBaseStarsFromPercentage = (percentage = 0) => {
  const safePercentage = clamp(Math.round(Number(percentage || 0)), 0, 100);
  if (safePercentage >= 90) return 3;
  if (safePercentage >= 75) return 2;
  if (safePercentage >= 50) return 1;
  return 0;
};

export const getFinalStarsAfterHints = (baseStars = 0, hintsUsed = 0) => (
  clamp(
    Math.round(Number(baseStars || 0)) - Math.max(0, Math.round(Number(hintsUsed || 0))),
    0,
    3,
  )
);

export const getStarsFromHints = (hintsUsed = 0) => (
  getFinalStarsAfterHints(GAME_SCORE_RULES.STARTING_STARS, hintsUsed)
);

export const calculateGameRating = ({
  completed = 0,
  total = 0,
  score = 0,
  hintsUsed = 0,
} = {}) => {
  const safeCompleted = clamp(Math.round(Number(completed || 0)), 0, 999999);
  const safeTotal = Math.max(safeCompleted, clamp(Math.round(Number(total || 0)), 0, 999999));
  const safeHintsUsed = clamp(Math.round(Number(hintsUsed || 0)), 0, 999999);
  const percentage = safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;
  const baseStars = getBaseStarsFromPercentage(percentage);
  const stars = getFinalStarsAfterHints(baseStars, safeHintsUsed);

  return {
    score: Math.max(0, Math.round(Number(score || 0))),
    percentage,
    hintsUsed: safeHintsUsed,
    baseStars,
    stars,
    ratingLabel: stars > 0 ? `${stars} Star${stars === 1 ? '' : 's'}` : 'Retry',
    shouldRetry: stars === 0 || percentage < 50,
    canUnlockNextLevel: stars >= GAME_SCORE_RULES.MIN_STARS_TO_ADVANCE,
  };
};

const COIN_STORAGE_KEY = 'itechsSharedUserCoins';
const ASSIGNMENT_STORAGE_KEY = 'itechsPersistedQuestionAssignments';

const readCoinStorage = () => {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COIN_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
};

const writeCoinStorage = (value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COIN_STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    // Ignore local persistence failures.
  }
};

const getSafeUserId = (userId) => String(userId || 'guest');

export const getUserCoinState = (userId) => {
  const allData = readCoinStorage();
  const safeUserId = getSafeUserId(userId);
  const entry = allData[safeUserId];
  return entry && typeof entry === 'object'
    ? {
      balance: Math.max(0, Math.round(Number(entry.balance || 0))),
      completedSubLevels: entry.completedSubLevels && typeof entry.completedSubLevels === 'object'
        ? entry.completedSubLevels
        : {},
    }
    : { balance: 0, completedSubLevels: {} };
};

const saveUserCoinState = (userId, state) => {
  const allData = readCoinStorage();
  allData[getSafeUserId(userId)] = {
    balance: Math.max(0, Math.round(Number(state?.balance || 0))),
    completedSubLevels: state?.completedSubLevels && typeof state.completedSubLevels === 'object'
      ? state.completedSubLevels
      : {},
    updatedAt: new Date().toISOString(),
  };
  writeCoinStorage(allData);
  return allData[getSafeUserId(userId)];
};

export const getUserCoinBalance = (userId) => getUserCoinState(userId).balance;

export const spendUserCoins = (userId, amount = 0) => {
  const cost = Math.max(0, Math.round(Number(amount || 0)));
  const current = getUserCoinState(userId);
  if (cost <= 0) return { success: true, balance: current.balance };
  if (current.balance < cost) return { success: false, balance: current.balance };
  const saved = saveUserCoinState(userId, { ...current, balance: current.balance - cost });
  return { success: true, balance: saved.balance };
};

export const addUserCoins = (userId, amount = 0) => {
  const reward = Math.max(0, Math.round(Number(amount || 0)));
  const current = getUserCoinState(userId);
  if (reward <= 0) return { balance: current.balance };
  const saved = saveUserCoinState(userId, { ...current, balance: current.balance + reward });
  return { balance: saved.balance };
};

const readAssignmentStorage = () => {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ASSIGNMENT_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
};

const writeAssignmentStorage = (value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ASSIGNMENT_STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    // Local persistence can be unavailable in private contexts.
  }
};

export const buildAssignmentScopeKey = ({
  userId,
  gameType,
  levelNumber,
  subLevelId = 'main',
} = {}) => [
  getSafeUserId(userId),
  String(gameType || '').toUpperCase(),
  String(levelNumber || 1),
  String(subLevelId || 'main'),
].join(':');

export const getAssignmentAttempt = (scopeKey) => {
  const storage = readAssignmentStorage();
  return Math.max(1, Math.round(Number(storage[String(scopeKey || '')]?.attempt || 1)));
};

export const advanceAssignmentAttempt = (scopeKey) => {
  const storage = readAssignmentStorage();
  const key = String(scopeKey || '');
  const current = storage[key] && typeof storage[key] === 'object' ? storage[key] : {};
  const nextAttempt = Math.max(1, Math.round(Number(current.attempt || 1))) + 1;
  storage[key] = {
    ...current,
    attempt: nextAttempt,
    updatedAt: new Date().toISOString(),
  };
  writeAssignmentStorage(storage);
  return nextAttempt;
};

export const buildAssignedContentKey = (scopeKey, attempt = 1) => (
  `${String(scopeKey || '')}:attempt:${Math.max(1, Math.round(Number(attempt || 1)))}`
);

export const loadAssignedContent = (contentKey) => {
  const storage = readAssignmentStorage();
  const entry = storage[String(contentKey || '')];
  return entry && typeof entry === 'object' ? entry.content || null : null;
};

export const saveAssignedContent = (contentKey, content) => {
  if (!contentKey) return;
  const storage = readAssignmentStorage();
  storage[String(contentKey)] = {
    content,
    savedAt: new Date().toISOString(),
  };
  writeAssignmentStorage(storage);
};

export const awardSubLevelCoinOnce = (userId, { gameType, levelNumber, subLevelId } = {}) => {
  const safeGameType = String(gameType || '').toUpperCase();
  const safeLevelNumber = String(levelNumber || 1);
  const safeSubLevelId = String(subLevelId || 'complete');
  const key = [safeGameType, safeLevelNumber, safeSubLevelId].join(':');
  const current = getUserCoinState(userId);
  if (current.completedSubLevels[key]) {
    return { awarded: 0, balance: current.balance, key };
  }
  const completedSubLevels = {
    ...current.completedSubLevels,
    [key]: new Date().toISOString(),
  };
  const saved = saveUserCoinState(userId, {
    balance: current.balance + GAME_SCORE_RULES.CORRECT_ACTION_COINS,
    completedSubLevels,
  });
  return { awarded: GAME_SCORE_RULES.CORRECT_ACTION_COINS, balance: saved.balance, key };
};

const readStorage = () => {
  if (typeof window === 'undefined') return {};

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
};

const writeStorage = (value) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    // Local persistence can be unavailable in private contexts.
  }
};

export const buildGameSessionKey = ({ userId, gameType, levelNumber, subLevelId }) => [
  String(userId || 'guest'),
  String(gameType || '').toUpperCase(),
  String(levelNumber || 1),
  ...(subLevelId ? [String(subLevelId)] : []),
].join(':');

export const loadGameSession = (key) => {
  const allData = readStorage();
  const entry = allData[String(key || '')];
  return entry && typeof entry === 'object' ? entry : null;
};

export const saveGameSession = (key, value) => {
  if (!key) return;
  const allData = readStorage();
  allData[String(key)] = {
    ...(value && typeof value === 'object' ? value : {}),
    savedAt: new Date().toISOString(),
  };
  writeStorage(allData);
};

export const clearGameSession = (key) => {
  if (!key) return;
  const allData = readStorage();
  delete allData[String(key)];
  writeStorage(allData);
};
