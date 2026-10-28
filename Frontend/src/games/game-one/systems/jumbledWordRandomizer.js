const hashSeed = (value) => {
  let hash = 2166136261;
  for (const character of String(value || '')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeededRandom = (seed) => {
  let state = hashSeed(seed) || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffleWord = (word, random) => {
  if (word.length < 2 || new Set(word).size < 2) return word;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const letters = [...word];
    for (let index = letters.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [letters[index], letters[swapIndex]] = [letters[swapIndex], letters[index]];
    }
    const shuffled = letters.join('');
    if (shuffled !== word) return shuffled;
  }
  return `${word.slice(1)}${word[0]}`;
};

export const createSafeJumbledTerm = (answer, seed = '') => {
  const normalizedAnswer = String(answer || '').toUpperCase().replace(/[^A-Z ]+/g, '').replace(/\s+/g, ' ').trim();
  if (!normalizedAnswer) return '';
  const random = createSeededRandom(`${seed}:${normalizedAnswer}`);
  const jumbled = normalizedAnswer.split(' ').map((word) => shuffleWord(word, random)).join(' ');
  if (jumbled !== normalizedAnswer) return jumbled;
  const words = normalizedAnswer.split(' ');
  const changeableIndex = words.findIndex((word) => new Set(word).size > 1);
  if (changeableIndex < 0) return normalizedAnswer;
  words[changeableIndex] = `${words[changeableIndex].slice(1)}${words[changeableIndex][0]}`;
  return words.join(' ');
};

const normalizeRiddleVariants = (question = {}) => {
  const variants = Array.isArray(question.riddleVariants)
    ? question.riddleVariants.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  return [...new Set(variants)];
};

export const createTreasureAttemptVariation = (question = {}, attemptSeed = '', previousQuestion = null) => {
  if (question?.challengeType !== 'WORD_SCRAMBLE') return question;

  const answer = question.answer || question.correctAnswer;
  const variants = normalizeRiddleVariants(question);
  const random = createSeededRandom(`${attemptSeed}:${question.id || ''}:riddle`);
  let riddleVariantIndex = variants.length > 0 ? Math.floor(random() * variants.length) : -1;
  const previousVariantIndex = Number(previousQuestion?.riddleVariantIndex);
  if (variants.length > 1 && riddleVariantIndex === previousVariantIndex) {
    riddleVariantIndex = (riddleVariantIndex + 1) % variants.length;
  }

  const riddle = riddleVariantIndex >= 0 ? variants[riddleVariantIndex] : '';
  const previousJumble = String(previousQuestion?.jumbledWord || '').trim();
  let jumbledWord = '';
  for (let retry = 0; retry < 12; retry += 1) {
    jumbledWord = createSafeJumbledTerm(answer, `${attemptSeed}:${question.id || ''}:jumble:${retry}`);
    if (jumbledWord && jumbledWord !== previousJumble) break;
  }

  return {
    ...question,
    ...(riddle ? {
      formattedQuestion: `FINAL TREASURE RIDDLE\n${riddle}`,
      prompt: `${riddle} Jumbled word: ${jumbledWord}`,
      riddleVariantIndex,
    } : {}),
    ...(jumbledWord ? { jumbledWord } : {}),
    attemptVariationSeed: String(attemptSeed),
  };
};

export const randomizeGameOneJumbledWords = (levelData = {}, attemptSeed = '') => {
  const nextLevelData = structuredClone(levelData);
  if (!Array.isArray(nextLevelData.questions)) return nextLevelData;
  nextLevelData.questions = nextLevelData.questions.map((question, index) => {
    if (question?.challengeType !== 'WORD_SCRAMBLE') return question;
    return createTreasureAttemptVariation(question, `${attemptSeed}:${question.id || index}`);
  });
  return nextLevelData;
};

