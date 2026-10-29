export const shuffleWordRun = (words, random = Math.random) => {
  const run = words.map((entry) => ({ ...entry }));
  for (let i = run.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [run[i], run[j]] = [run[j], run[i]];
  }
  return run;
};

export const selectHiddenLetter = (word, guessed, hintedIndices, random = Math.random) => {
  const hidden = word.split('').map((letter, index) => ({ letter, index }))
    .filter(({ letter, index }) => !guessed.includes(letter) && !hintedIndices.includes(index));
  return hidden.length ? hidden[Math.floor(random() * hidden.length)] : null;
};
