const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

// Real routes, validators, controller and AI HTTP adapter. Only auth/database
// dependencies and the external provider are fixtures; no live accounts used.
const stub = (modulePath, exports) => {
  const id = require.resolve(modulePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
};
stub('../src/services/progressionService', {});
stub('../src/services/levelContentService', {});
let enabled = true;
stub('../src/services/aiControlService', { isAiEnabled: async () => enabled });
stub('../src/middleware/auth', {
  authenticateToken: (req, res, next) => { req.user = { id: req.headers['x-student'] || 'fixture-student', role: 'STUDENT' }; next(); },
  requireStudent: (req, res, next) => next(),
});
const originalFetch = global.fetch;
const oldProvider = process.env.AI_PROVIDER;
const oldKey = process.env.GEMINI_API_KEY;
process.env.AI_PROVIDER = 'gemini';
process.env.GEMINI_API_KEY = 'test-fixture-not-a-real-key';
const app = express();
app.use(express.json());
app.use('/api/levels', require('../src/routes/levelRoutes'));
const frontend = import(pathToFileURL(path.resolve(__dirname, '../../Frontend/src/games/game-one/systems/aiLearningContent.js')));
const level = {
  title: 'Java variables', treasureQuestionId: 'chest',
  rooms: [{ coins: [{ collectibleType: 'scroll', clueText: 'A named container remembers a changing value.' }] }],
  questions: [{ id: 'chest', challengeType: 'WORD_SCRAMBLE', answer: 'VARIABLE', prompt: 'What stores a value by name?', hints: ['It remembers data.'] }],
};
const aiHints = ['Recall how a program remembers information.', 'A stored value can be referenced through a reusable name.', 'That named storage can hold a score and later receive a different value.'];
const send = (payload) => request(app).post('/api/levels/GAME_ONE/1/questions/generate').send(payload);
const provider = (payload) => ({ ok: true, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }) });
after(() => {
  global.fetch = originalFetch;
  if (oldProvider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = oldProvider;
  if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
});

test('frontend payload -> actual route -> provider adapter -> frontend applies three AI hints only', async () => {
  enabled = true;
  let calls = 0;
  global.fetch = async (url, options) => {
    calls += 1;
    const prompt = JSON.parse(options.body).contents[0].parts[0].text;
    assert.match(prompt, /Learning scrolls:/);
    assert.match(prompt, /fixture-student:1:run-ai/);
    return provider({ items: [{ id: 'question:chest', hints: aiHints }] });
  };
  const api = await frontend;
  const payload = api.buildGameOneAiContentRequest(level, 'run-ai');
  const res = await send(payload);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.source, 'ai');
  const result = api.applyGameOneAiContent(level, payload, res.body.data);
  assert.deepEqual(result.questions[0].hints, aiHints);
  assert.deepEqual(result.questions[0].answer, level.questions[0].answer);
  assert.deepEqual(result.questions[0].prompt, level.questions[0].prompt);
  assert.deepEqual(result.rooms, level.rooms);
  assert.equal(calls, 1);
});

test('AI disabled uses three safe hints without a provider request', async () => {
  enabled = false;
  global.fetch = async () => { throw new Error('Should not call provider'); };
  const api = await frontend;
  const payload = api.buildGameOneAiContentRequest(level, 'run-off');
  const res = await send(payload);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.source, 'fallback');
  const result = api.applyGameOneAiContent(level, payload, res.body.data);
  assert.equal(result.questions[0].hints.length, 3);
  assert.equal(result.questions[0].hintSource, 'fallback');
  assert.equal(result.questions[0].hints[0], 'It remembers data.');
});

test('provider failures, malformed and revealing responses use fallback', async () => {
  enabled = true;
  for (const output of [null, 'timeout', { items: [{ id: 'question:chest', hints: ['V A R I A B L E', 'The answer is VARIABLE.', 'It starts with V.'] }] }, { items: [{ id: 'question:chest', hints: ['Same', 'Same', 'Same'] }] }]) {
    global.fetch = async () => {
      if (!output) throw new Error('Provider unavailable');
      if (output === 'timeout') { const error = new Error('Request aborted'); error.name = 'AbortError'; throw error; }
      return provider(output);
    };
    const api = await frontend;
    const payload = api.buildGameOneAiContentRequest(level, `run-bad-${JSON.stringify(output)}`.slice(0, 100));
    const res = await send(payload);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.source, 'fallback');
    const result = api.applyGameOneAiContent(level, payload, res.body.data);
    assert.equal(result.questions[0].hints.length, 3);
    result.questions[0].hints.forEach((hint) => assert.equal(api.containsTargetAnswer(hint, 'VARIABLE'), false));
  }
});

test('invalid payload and level are rejected by route/controller validation', async () => {
  assert.equal((await send({ items: [], variationSeed: 'bad' })).status, 400);
  assert.equal((await request(app).post('/api/levels/GAME_ONE/99/questions/generate').send({})).status, 400);
});

test('Game 2 and Game 5 retain their original fallback response contracts', async () => {
  enabled = false;
  for (const [game, payload, key] of [
    ['GAME_TWO', { count: 1, fallbackTasks: [] }, 'tasks'],
    ['GAME_FIVE', { count: 1, fallbackQuestions: [{ word: 'LOOP', clue: 'Repeats instructions.' }] }, 'questions'],
  ]) {
    const res = await request(app).post(`/api/levels/${game}/1/questions/generate`).send(payload);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.source, 'fallback');
    assert.ok(Array.isArray(res.body.data[key]));
  }
});
