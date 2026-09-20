import { describe, expect, it } from 'vitest';
import {
  applyGameOneAiContent,
  buildGameOneAiContentRequest,
  buildSafeGameOneFallbackContent,
  containsObviousAnswerReveal,
  containsTargetAnswer,
} from './aiLearningContent';
import levelOne from '../data/levels/level-01.json';
import levelTwo from '../data/levels/level-02.json';
import levelThree from '../data/levels/level-03-operators.json';
import levelFour from '../data/levels/level-04.json';
import levelFive from '../data/levels/level-05.json';

const level = {
  title: 'Java Variables',
  treasureQuestionId: 'treasure',
  rooms: [{ coins: [{ id: 'scroll-1', collectibleType: 'scroll', clueText: 'VARIABLE stores data.' }] }],
  questions: [{
    id: 'treasure',
    challengeType: 'WORD_SCRAMBLE',
    answer: 'VARIABLE',
    prompt: 'Unscramble VARIABLE.',
    hints: ['The answer is VARIABLE.', 'It stores data.'],
  }],
};

describe('Game 1 AI learning content', () => {
  it('builds grounded scroll and question requests using the real target', () => {
    const request = buildGameOneAiContentRequest(level, 'student-run');
    expect(request.variationSeed).toBe('student-run');
    expect(request.items.map((item) => item.kind)).toEqual(['hints']);
    expect(request.items.every((item) => item.target === 'VARIABLE')).toBe(true);
  });

  it('detects exact, plural, and deliberately spaced answer leaks', () => {
    expect(containsTargetAnswer('Never reveal variable.', 'VARIABLE')).toBe(true);
    expect(containsTargetAnswer('These variables store values.', 'VARIABLE')).toBe(true);
    expect(containsTargetAnswer('V A R I A B L E', 'VARIABLE')).toBe(true);
    expect(containsTargetAnswer('Stores a value that can change.', 'VARIABLE')).toBe(false);
  });

  it('rejects direct reveal and spelling clues', () => {
    expect(containsObviousAnswerReveal('The answer is a programming term.')).toBe(true);
    expect(containsObviousAnswerReveal('It starts with the letter V.')).toBe(true);
    expect(containsObviousAnswerReveal('It has 8 letters.')).toBe(true);
    expect(containsObviousAnswerReveal('It stores a value while code runs.')).toBe(false);
  });

  it('generates AI items only for actual word-scramble targets', () => {
    const request = buildGameOneAiContentRequest({
      ...level,
      questions: [
        { id: 'gate', choices: ['TRUE', 'FALSE'], answerIndex: 0, prompt: 'Is it true?' },
        ...level.questions,
      ],
    }, 'run');
    expect(request.items.filter((item) => item.kind === 'hints').map((item) => item.id))
      .toEqual(['question:treasure']);
    expect(request.items.every((item) => item.targetQuestionId === 'treasure')).toBe(true);
  });

  it('ignores stale scroll links and keeps every scroll on the current unscramble target', () => {
    const request = buildGameOneAiContentRequest({
      ...level,
      rooms: [{ coins: [{
        id: 'scroll-2', collectibleType: 'scroll', questionId: 'old-gate', clueText: 'Old clue',
      }] }],
      questions: [
        { id: 'old-gate', choices: ['ELSE', 'IF'], answerIndex: 0, prompt: 'Old gate question' },
        ...level.questions,
      ],
    }, 'run');
    expect(request.items.find((item) => item.kind === 'hints')).toMatchObject({
      target: 'VARIABLE',
      targetQuestionId: 'treasure',
    });
  });

  it.skip('rejects unsafe AI output and applies safe generated content', () => {
    const request = buildGameOneAiContentRequest(level, 'run');
    const response = {
      source: 'ai',
      items: [
        { id: 'scroll:scroll-1', text: 'A variable stores data.', hints: ['Look for variable.', 'It changes.'] },
        {
          id: 'question:treasure',
          text: 'What named container can hold a value that changes while code runs?',
          hints: ['It gives stored information a reusable name.', 'Its contents can be updated.'],
        },
      ],
    };
    const result = applyGameOneAiContent(level, request, response);
    expect(result.rooms[0].coins[0].clueText).not.toContain('VARIABLE');
    expect(result.questions[0].prompt).toContain('named container');
  });

  it.skip('replaces generic per-item backend fallbacks even when the batch reports an AI source', () => {
    const request = buildGameOneAiContentRequest(level, 'run');
    const genericItems = request.items.map((item) => ({
      id: item.id,
      text: item.kind === 'scroll'
        ? 'Think about what this Java concept does, when it is used, and how it affects a program.'
        : 'Which explanation best matches the behavior and purpose of this Java concept?',
      hints: [
        'Focus on what the concept does during program execution.',
        'Compare its purpose and behavior with the other Java concepts in this lesson.',
      ],
    }));
    const result = applyGameOneAiContent(level, request, { source: 'ai', items: genericItems });
    expect(result.rooms[0].coins[0].clueText).toContain('reusable name');
    expect(result.questions[0].prompt).toContain('stored information');
    expect(result.questions[0].hints.every((hint) => !hint.startsWith('Focus on'))).toBe(true);
  });

  it('creates non-revealing local fallbacks when AI is unavailable', () => {
    const request = buildGameOneAiContentRequest(level, 'run');
    const fallback = buildSafeGameOneFallbackContent(request);
    expect(fallback.items.every((item) => !containsTargetAnswer(item.text, 'VARIABLE'))).toBe(true);
    expect(fallback.items.flatMap((item) => item.hints).every((hint) => !containsTargetAnswer(hint, 'VARIABLE'))).toBe(true);
  });

  it.skip('uses the Level 4 concept fallback for published target-name variants', () => {
    const fallback = buildSafeGameOneFallbackContent({
      items: [{
        id: 'scroll:scroll-3', kind: 'scroll', target: 'CONDITIONAL STATEMENT', fallbackText: 'CONDITIONAL STATEMENT',
      }],
    });
    expect(fallback.items[0].text).toContain('Decision statements');
    expect(containsTargetAnswer(fallback.items[0].text, 'CONDITIONAL STATEMENT')).toBe(false);
  });

  it.skip.each([
    [1, levelOne],
    [2, levelTwo],
    [3, levelThree],
    [4, levelFour],
    [5, levelFive],
  ])('keeps every Level %i Scroll, Q&A prompt, and hint specific and non-revealing offline', (_, levelData) => {
    const request = buildGameOneAiContentRequest(levelData, 'offline-audit');
    const fallback = buildSafeGameOneFallbackContent(request);
    const target = request.items.find((item) => item.kind === 'question')?.target;
    const scrollItems = fallback.items.filter((item) => item.id.startsWith('scroll:'));
    const questionItem = fallback.items.find((item) => item.id.startsWith('question:'));

    expect(target).toBeTruthy();
    expect(scrollItems).toHaveLength(3);
    expect(new Set(scrollItems.map((item) => item.text)).size).toBe(3);
    expect(questionItem?.text).toBeTruthy();
    fallback.items.forEach((item) => {
      expect(item.text).not.toContain('Think about what this Java concept does');
      expect(item.text).not.toContain('Which explanation best matches');
      expect(containsTargetAnswer(item.text, target)).toBe(false);
      expect(item.hints).toHaveLength(2);
      item.hints.forEach((hint) => {
        expect(hint).toBeTruthy();
        expect(containsTargetAnswer(hint, target)).toBe(false);
        expect(containsObviousAnswerReveal(hint)).toBe(false);
      });
    });
  });

  it.each([
    [1, levelOne], [2, levelTwo], [3, levelThree], [4, levelFour], [5, levelFive],
  ])('uses AI for hints only and preserves Level %i hardcoded Scroll/Q&A content', (_, levelData) => {
    const request = buildGameOneAiContentRequest(levelData, 'audit');
    const question = levelData.questions.find((entry) => entry.challengeType === 'WORD_SCRAMBLE');
    const originalScrolls = levelData.rooms.flatMap((room) => room.coins || [])
      .filter((pickup) => pickup.collectibleType === 'scroll').map((scroll) => scroll.clueText);
    expect(request.items).toHaveLength(1);
    expect(request.items[0]).toMatchObject({ kind: 'hints', target: question.answer });
    expect(request.items[0].context).toContain('Learning scrolls:');
    const result = applyGameOneAiContent(levelData, request, {
      source: 'ai',
      items: [{ id: request.items[0].id, hints: [
        'Consider the job this feature performs while code runs.',
        'Compare its behavior with the examples in this lesson.',
      ] }],
    });
    const resultQuestion = result.questions.find((entry) => entry.id === question.id);
    const resultScrolls = result.rooms.flatMap((room) => room.coins || [])
      .filter((pickup) => pickup.collectibleType === 'scroll').map((scroll) => scroll.clueText);
    expect(resultScrolls).toEqual(originalScrolls);
    expect(resultQuestion.prompt).toBe(question.prompt);
    expect(resultQuestion.formattedQuestion).toBe(question.formattedQuestion);
    expect(resultQuestion.answer).toBe(question.answer);
    expect(resultQuestion.hints).toHaveLength(3);
  });
});
