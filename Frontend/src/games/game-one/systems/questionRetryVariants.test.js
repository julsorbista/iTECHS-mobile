import { buildQuestionRetryVariant, getQuestionTopicLabel } from './questionRetryVariants';

describe('questionRetryVariants', () => {
  it('uses the next stored unused question and keeps its correct answer after rotating choices', () => {
    const variant = buildQuestionRetryVariant({
      topic: 'RAM',
      prompt: 'What does RAM stand for?',
      choices: ['Random Access Memory', 'Read Access Module', 'Rapid Action Memory'],
      answerIndex: 0,
      retryQuestions: [{
        prompt: 'Which memory temporarily stores active program data?',
        choices: ['RAM', 'ROM', 'SSD'],
        answerIndex: 0,
      }],
    }, 2);

    expect(variant.prompt).toBe('Which memory temporarily stores active program data?');
    expect(variant.choices).toEqual(['SSD', 'RAM', 'ROM']);
    expect(variant.answerIndex).toBe(1);
    expect(variant.choices[variant.answerIndex]).toBe('RAM');
  });

  it('does not fabricate or repeat a question after the stored pool is exhausted', () => {
    expect(buildQuestionRetryVariant({
      topic: 'RAM',
      prompt: 'What does RAM stand for?',
      choices: ['Random Access Memory', 'Read Access Module'],
      answerIndex: 0,
      retryQuestions: [],
    }, 2)).toBeNull();
  });

  it('consumes a different stored question on every consecutive retry', () => {
    let currentQuestion = {
      topic: 'Java variables',
      prompt: 'Primary question',
      choices: ['A1', 'A2', 'A3'],
      answerIndex: 0,
      retryQuestions: [
        { prompt: 'Retry question one', choices: ['B1', 'B2', 'B3'], answerIndex: 0 },
        { prompt: 'Retry question two', choices: ['C1', 'C2', 'C3'], answerIndex: 1 },
        { prompt: 'Retry question three', choices: ['D1', 'D2', 'D3'], answerIndex: 2 },
      ],
    };

    const seenPrompts = [];
    for (let retryIndex = 1; retryIndex <= 3; retryIndex += 1) {
      currentQuestion = buildQuestionRetryVariant(currentQuestion, retryIndex);
      seenPrompts.push(currentQuestion.prompt);
    }

    expect(seenPrompts).toEqual([
      'Retry question one',
      'Retry question two',
      'Retry question three',
    ]);
    expect(new Set(seenPrompts).size).toBe(3);
    expect(currentQuestion.retryQuestions).toHaveLength(0);
  });

  it('falls back to the prompt when no explicit topic exists', () => {
    expect(getQuestionTopicLabel({
      prompt: 'Which software manages the computer hardware?',
    })).toBe('Which software manages the computer hardware');
  });
});
