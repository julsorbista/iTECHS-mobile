import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { applyGameOneAiContent, buildGameOneAiContentRequest, loadGameOneHintsForRun } from './aiLearningContent';
import { createHintTapGuard } from './hintPurchaseGuard';
import levelOne from '../data/levels/level-01.json';
import levelTwo from '../data/levels/level-02.json';
import levelThree from '../data/levels/level-03-operators.json';
import levelFour from '../data/levels/level-04.json';
import levelFive from '../data/levels/level-05.json';

describe('Game 1 hints-only application', () => {
  it.each([levelOne, levelTwo, levelThree, levelFour, levelFive])('applies three fallback hints and preserves $title content', (level) => {
    const request = buildGameOneAiContentRequest(level, 'fallback-run');
    const result = applyGameOneAiContent(level, request, {});
    const restoreHints = structuredClone(result);
    for (const question of restoreHints.questions) {
      const original = level.questions.find((item) => item.id === question.id);
      if (question.challengeType === 'WORD_SCRAMBLE') {
        expect(question.hints).toHaveLength(3);
        expect(question.hintSource).toBe('fallback');
        question.hints = original.hints;
        delete question.hintSource;
      }
    }
    delete restoreHints.aiLearningContentSource;
    expect(restoreHints).toEqual(level);
  });
  it('applies validated AI hints but rejects revealing, repeated and missing hints', () => {
    const request = buildGameOneAiContentRequest(levelOne, 'ai-run');
    const id = request.items[0].id;
    const hints = ['It helps code remember information.', 'A reusable name points to stored data.', 'The stored value can change while that name remains available.'];
    const valid = applyGameOneAiContent(levelOne, request, { source: 'ai', items: [{ id, hints }] });
    expect(valid.questions[0].hints).toEqual(hints);
    expect(valid.questions[0].hintSource).toBe('ai');
    for (const invalid of [['VARIABLE', 'V A R I A B L E', 'The answer is variable.'], ['same', 'same', 'same'], hints.slice(0, 2), [1, 2, 3], ['a'.repeat(141), ...hints.slice(0, 2)]]) {
      const result = applyGameOneAiContent(levelOne, request, { source: 'ai', items: [{ id, hints: invalid }] });
      expect(result.questions[0].hints).toHaveLength(3);
      expect(result.questions[0].hintSource).toBe('fallback');
    }
  });
  it('coalesces rerenders but sends a fresh request on retry or for another student', async () => {
    const send = vi.fn().mockResolvedValue({ status: 'success' });
    const request = buildGameOneAiContentRequest(levelOne, 'dedupe-run');
    await Promise.all([loadGameOneHintsForRun('student1:1', request, send), loadGameOneHintsForRun('student1:1', request, send)]);
    expect(send).toHaveBeenCalledTimes(1);
    await loadGameOneHintsForRun('student1:1', { ...request, variationSeed: 'retry-run' }, send);
    await loadGameOneHintsForRun('student2:1', request, send);
    expect(send).toHaveBeenCalledTimes(3);
  });
  it('keeps failed requests deduplicated and allows normal fallback handling', async () => {
    const send = vi.fn().mockRejectedValue(new Error('timeout'));
    const request = buildGameOneAiContentRequest(levelOne, 'failed-run');
    const results = await Promise.allSettled([loadGameOneHintsForRun('student1:1', request, send), loadGameOneHintsForRun('student1:1', request, send)]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(results.every((item) => item.status === 'rejected')).toBe(true);
    expect(applyGameOneAiContent(levelOne, request, {}).questions[0].hints).toHaveLength(3);
  });
});

describe('hint purchase guards', () => {
  it('rejects repeated gesture events and rapid taps', () => {
    let now = 0;
    const accept = createHintTapGuard(() => now);
    expect(accept()).toBe(true);
    expect(accept()).toBe(false);
    now = 200;
    expect(accept()).toBe(false);
    now = 350;
    expect(accept()).toBe(true);
  });
  it('the actual LevelScene handler deducts once per sequential hint receipt', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/games/game-one/scenes/LevelScene.js'), 'utf8');
    const method = source.match(/  (handleQuestionHintPurchased\(payload = \{\}\) \{[\s\S]*?\n  \})\n\n  handleQuestionAnswered/)[1];
    const handler = new Function('normalizeHintCoinCost', `return ({${method}}).handleQuestionHintPurchased;`)((value) => Number(value || 0));
    const state = { coinBalance: 5, hintsUsed: 0, questionHintProgress: new Map(), registry: { set: vi.fn() }, setObjectiveMessage: vi.fn() };
    handler.call(state, { questionId: 'chest', hintIndex: 1, hintCoinCost: 2 });
    handler.call(state, { questionId: 'chest', hintIndex: 1, hintCoinCost: 2 });
    expect(state.coinBalance).toBe(3);
    expect(state.hintsUsed).toBe(1);
    handler.call(state, { questionId: 'chest', hintIndex: 2, hintCoinCost: 2 });
    expect(state.coinBalance).toBe(1);
    handler.call(state, { questionId: 'chest', hintIndex: 3, hintCoinCost: 2 });
    expect(state.hintsUsed).toBe(2);
    expect(state.coinBalance).toBe(1);
    handler.call(state, { questionId: 'other', hintIndex: 1, hintCoinCost: 0 });
    expect(state.hintsUsed).toBe(3);
  });
});
