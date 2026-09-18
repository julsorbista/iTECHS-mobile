import { describe, expect, it } from 'vitest';
import {
  createSafeJumbledTerm,
  createTreasureAttemptVariation,
  randomizeGameOneJumbledWords,
} from './jumbledWordRandomizer';

describe('Game 1 jumbled-word randomizer', () => {
  it.each(['VARIABLE', 'DATA TYPE', 'OPERATOR', 'CONDITION', 'LOOP'])(
    'preserves the letters and never reveals %s',
    (answer) => {
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const result = createSafeJumbledTerm(answer, `attempt-${attempt}`);
        expect(result).not.toBe(answer);
        expect(result.split(' ')).toHaveLength(answer.split(' ').length);
        result.split(' ').forEach((word, index) => {
          expect([...word].sort()).toEqual([...answer.split(' ')[index]].sort());
        });
      }
    },
  );

  it('is stable for one attempt and can vary between attempts', () => {
    const first = createSafeJumbledTerm('LOOP', 'student-attempt-1');
    expect(createSafeJumbledTerm('LOOP', 'student-attempt-1')).toBe(first);
    const variants = new Set(Array.from({ length: 12 }, (_, index) => createSafeJumbledTerm('LOOP', `attempt-${index}`)));
    expect(variants.size).toBeGreaterThan(1);
  });

  it('changes only word-scramble questions and keeps the official answer', () => {
    const result = randomizeGameOneJumbledWords({ questions: [
      { id: 'final', challengeType: 'WORD_SCRAMBLE', answer: 'LOOP', jumbledWord: 'OPOL' },
      { id: 'gate', prompt: 'Choose one', choices: ['A', 'B'] },
    ] }, 'run');
    expect(result.questions[0].answer).toBe('LOOP');
    expect(result.questions[0].jumbledWord).not.toBe('LOOP');
    expect(result.questions[1]).toEqual({ id: 'gate', prompt: 'Choose one', choices: ['A', 'B'] });
  });

  it('changes both the treasure riddle and jumble on the next attempt', () => {
    const question = {
      id: 'final',
      challengeType: 'WORD_SCRAMBLE',
      answer: 'VARIABLE',
      riddleVariants: ['Riddle one?', 'Riddle two?', 'Riddle three?'],
    };
    const first = createTreasureAttemptVariation(question, 'student-a:first');
    const retry = createTreasureAttemptVariation(question, 'student-a:retry', first);

    expect(retry.riddleVariantIndex).not.toBe(first.riddleVariantIndex);
    expect(retry.formattedQuestion).not.toBe(first.formattedQuestion);
    expect(retry.jumbledWord).not.toBe(first.jumbledWord);
    expect(retry.answer).toBe('VARIABLE');
  });
});
