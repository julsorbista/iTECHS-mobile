const fs = require('fs/promises');
const path = require('path');

const CONTROL_DIRECTORY = path.resolve(__dirname, '../../data');
const CONTROL_FILE_PATH = path.join(CONTROL_DIRECTORY, 'ai-controls.json');

const DEFAULT_AI_CONTROL_STATE = Object.freeze({
  aiEnabled: true,
  updatedAt: null,
  updatedByUserId: null,
});

let cachedState = null;

const sanitizeControlState = (value = {}) => {
  const updatedAt = typeof value?.updatedAt === 'string' && value.updatedAt.trim()
    ? value.updatedAt.trim()
    : null;
  const updatedByUserId = value?.updatedByUserId === null || value?.updatedByUserId === undefined
    ? null
    : String(value.updatedByUserId).trim() || null;

  return {
    aiEnabled: value?.aiEnabled !== false,
    updatedAt,
    updatedByUserId,
  };
};

const ensureControlDirectory = async () => {
  await fs.mkdir(CONTROL_DIRECTORY, { recursive: true });
};

const persistControlState = async (nextState) => {
  await ensureControlDirectory();
  await fs.writeFile(CONTROL_FILE_PATH, JSON.stringify(nextState, null, 2), 'utf8');
};

const getAiControlState = async ({ fresh = false } = {}) => {
  if (!fresh && cachedState) {
    return { ...cachedState };
  }

  try {
    const raw = await fs.readFile(CONTROL_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    cachedState = sanitizeControlState(parsed);
    return { ...cachedState };
  } catch (error) {
    if (error?.code === 'ENOENT' || error instanceof SyntaxError) {
      cachedState = sanitizeControlState(DEFAULT_AI_CONTROL_STATE);
      await persistControlState(cachedState);
      return { ...cachedState };
    }

    throw error;
  }
};

const setAiEnabled = async (aiEnabled, { updatedByUserId = null } = {}) => {
  const nextState = sanitizeControlState({
    aiEnabled: Boolean(aiEnabled),
    updatedAt: new Date().toISOString(),
    updatedByUserId,
  });

  cachedState = nextState;
  await persistControlState(nextState);
  return { ...nextState };
};

const isAiEnabled = async () => {
  const state = await getAiControlState();
  return state.aiEnabled !== false;
};

module.exports = {
  DEFAULT_AI_CONTROL_STATE,
  getAiControlState,
  setAiEnabled,
  isAiEnabled,
};
