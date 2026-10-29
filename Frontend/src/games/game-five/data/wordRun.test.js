import { expect, it } from 'vitest';
import { selectHiddenLetter, shuffleWordRun } from './wordRun';

it('shuffles a copy while preserving every word and its meaningful clue', () => {
  const words = [
    { word: 'LOOP', clue: 'A structure that repeats instructions.' },
    { word: 'BOOLEAN', clue: 'A data type that can only be true or false.' },
    { word: 'VARIABLE', clue: 'A named container that stores a value.' },
  ];
  const run = shuffleWordRun(words, () => 0);
  expect(run.map((entry) => entry.word)).not.toEqual(words.map((entry) => entry.word));
  expect(new Set(run.map((entry) => entry.word))).toEqual(new Set(words.map((entry) => entry.word)));
  run.forEach((entry) => expect(entry.clue).toBe(words.find((word) => word.word === entry.word).clue));
  expect(words[0].word).toBe('LOOP');
});

it('two hints reveal different positions without replacing the current answer or clue', () => {
  const entry = { word: 'LOOP', clue: 'A programming structure that repeats instructions.' };
  const first = selectHiddenLetter(entry.word, [], [], () => 0);
  const second = selectHiddenLetter(entry.word, [], [first.index], () => 0);
  expect(first).toEqual({ letter: 'L', index: 0 });
  expect(second).toEqual({ letter: 'O', index: 1 });
  expect(entry).toEqual({ word: 'LOOP', clue: 'A programming structure that repeats instructions.' });
});

it('selects only hidden positions and returns nothing when all are visible', () => {
  expect(selectHiddenLetter('LOOP', ['L', 'O'], [], () => 0)).toEqual({ letter: 'P', index: 3 });
  expect(selectHiddenLetter('LOOP', ['L', 'O'], [3])).toBeNull();
});
