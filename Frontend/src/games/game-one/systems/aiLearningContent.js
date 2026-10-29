const cleanText = (value, maxLength = 400) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);

const normalizeComparable = (value) => cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const ANSWER_REVEAL_PATTERNS = [
  /\b(?:the\s+)?answer\s+(?:is|would\s+be|must\s+be)\b/i,
  /\b(?:target|correct)\s+(?:word|term|answer)\s+(?:is|would\s+be)\b/i,
  /\b(?:starts?|begins?|ends?|finishes?)\s+with\s+(?:the\s+letter\s+)?[a-z]\b/i,
  /\b(?:has|contains?)\s+\d+\s+letters?\b/i,
  /\b(?:spell|spelled|spelling|anagram|jumbled)\b/i,
];

const GENERIC_FALLBACK_PHRASES = [
  'think about what this java concept does',
  'which explanation best matches the behavior and purpose',
  'focus on what the concept does during program execution',
  'compare its purpose and behavior with the other java concepts',
];

const SAFE_TARGET_FALLBACKS = Object.freeze({
  variable: {
    scrolls: [
      'A program can give a reusable name to a stored value so it can be used again later.',
      'This named container may hold information such as a score, price, or message, and its contents can change while code runs.',
      'Use this concept when a program must remember information and update it as actions occur.',
    ],
    question: 'What Java concept gives a value a reusable name and allows the stored information to change while a program runs?',
    hints: ['It helps a program remember information.', 'Its stored value can be read and updated.'],
  },
  'data type': {
    scrolls: [
      'Java classifies stored values so it knows whether they represent whole numbers, decimals, truth values, or text.',
      'Before storing information, Java needs to know what kind of value it is allowed to hold.',
      'Different kinds of information follow different storage rules, such as numbers, true-or-false values, and text.',
    ],
    question: 'What Java concept identifies the kind of value that may be stored, such as a whole number, decimal, truth value, or text?',
    hints: ['It describes what kind of information can be stored.', 'Examples include int, double, boolean, and String.'],
  },
  operator: {
    scrolls: [
      'Some Java symbols perform calculations such as addition, subtraction, multiplication, and division.',
      'Other symbols compare values to determine whether they are equal, different, greater, or smaller.',
      'Java also uses symbols to combine or reverse true-or-false tests when making decisions.',
    ],
    question: 'What Java concept uses symbols to calculate values, compare them, or combine true-or-false tests?',
    hints: ['Think about symbols placed between or before values.', 'They can perform arithmetic, comparison, or logical actions.'],
  },
  condition: {
    scrolls: [
      'Java can evaluate a true-or-false test before deciding whether a block of code should run.',
      'A program may choose one path when a test succeeds and another path when it does not.',
      'Decision statements inspect tests in order and follow the first path whose result is true.',
    ],
    question: 'What Java concept is evaluated as true or false to determine which path of code will execute?',
    hints: ['It is a test used when making a decision.', 'Its result controls whether a code path runs.'],
  },
  loop: {
    scrolls: [
      'A repetition structure can run a block of instructions a set number of times.',
      'Some repeated instructions continue while a true-or-false test remains true.',
      'Another repetition structure runs its instructions once before checking whether it should continue.',
    ],
    question: 'What Java concept repeats a block of instructions either a set number of times or while a test remains true?',
    hints: ['It prevents writing the same instructions again and again.', 'Its repetition may be controlled by a counter or a true-or-false test.'],
  },
});

export const containsTargetAnswer = (text, target) => {
  const normalizedTarget = normalizeComparable(target);
  if (normalizedTarget.length < 2) return false;
  const normalizedText = normalizeComparable(text);
  const wholeTermMatch = (` ${normalizedText} `).includes(` ${normalizedTarget} `);
  const compactTarget = normalizedTarget.replace(/\s+/g, '');
  const compactText = normalizedText.replace(/\s+/g, '');
  return wholeTermMatch || (compactTarget.length >= 4 && compactText.includes(compactTarget));
};

export const containsObviousAnswerReveal = (text) => (
  ANSWER_REVEAL_PATTERNS.some((pattern) => pattern.test(cleanText(text)))
);

const isGenericGameOneFallback = (text) => {
  const normalizedText = normalizeComparable(text);
  return GENERIC_FALLBACK_PHRASES.some((phrase) => normalizedText.includes(normalizeComparable(phrase)));
};

const resolveSafeTargetProfile = (target) => {
  const normalizedTarget = normalizeComparable(target);
  if (SAFE_TARGET_FALLBACKS[normalizedTarget]) return SAFE_TARGET_FALLBACKS[normalizedTarget];
  if (normalizedTarget.includes('variable')) return SAFE_TARGET_FALLBACKS.variable;
  if (normalizedTarget.includes('data type') || normalizedTarget.includes('datatype')) return SAFE_TARGET_FALLBACKS['data type'];
  if (normalizedTarget.includes('operator')) return SAFE_TARGET_FALLBACKS.operator;
  if (normalizedTarget.includes('condition') || normalizedTarget.includes('decision')) return SAFE_TARGET_FALLBACKS.condition;
  if (normalizedTarget.includes('loop') || normalizedTarget.includes('iteration')) return SAFE_TARGET_FALLBACKS.loop;
  return null;
};

const getTargetSpecificFallback = (item = {}) => {
  const profile = resolveSafeTargetProfile(item.target);
  if (!profile) return null;
  if (item.kind === 'question') return { text: profile.question, hints: profile.hints };
  const scrollNumber = Number.parseInt(String(item.id || '').match(/\d+/)?.[0], 10);
  const index = Number.isFinite(scrollNumber) ? Math.max(0, scrollNumber - 1) : 0;
  return { text: profile.scrolls[index % profile.scrolls.length], hints: profile.hints };
};

const getQuestionTarget = (question = {}) => {
  const directAnswer = cleanText(question.answer || question.correctAnswer, 80);
  if (directAnswer) return directAnswer;
  const choices = Array.isArray(question.choices) ? question.choices : [];
  const index = Number.isInteger(question.answerIndex)
    ? question.answerIndex
    : Number(question.correctChoiceIndex || 0);
  return cleanText(choices[index], 80);
};

const getScrolls = (levelData = {}) => {
  const containers = [levelData.worldObjects, ...(Array.isArray(levelData.rooms) ? levelData.rooms : [])];
  return containers.flatMap((container) => (Array.isArray(container?.coins) ? container.coins : []))
    .filter((pickup) => (pickup.collectibleType || pickup.pickupType) === 'scroll');
};

export const buildGameOneAiContentRequest = (levelData = {}, variationSeed = '') => {
  const questions = Array.isArray(levelData.questions) ? levelData.questions : [];
  const scrambleQuestions = questions.filter((question) => question.challengeType === 'WORD_SCRAMBLE');
  const levelContext = cleanText(
    [levelData.title, levelData.subtitle, levelData.missionText, levelData.objective].filter(Boolean).join('. '),
    260,
  );
  const scrollContext = cleanText(getScrolls(levelData).map((scroll) => scroll.clueText).filter(Boolean).join(' '), 900);
  const questionItems = scrambleQuestions.map((question, index) => ({
    id: `question:${cleanText(question.id || index, 68)}`,
    kind: 'hints',
    target: getQuestionTarget(question),
    targetQuestionId: cleanText(question.id, 68),
    context: cleanText(`${levelContext}. Topic: ${question.topic || ''}. Official question: ${question.prompt || question.formattedQuestion || ''}. Learning scrolls: ${scrollContext}`, 1400),
    fallbackHints: question.hints,
  })).filter((item) => item.target);
  return { items: questionItems, variationSeed };
};

export const buildSafeGameOneFallbackContent = (request = {}) => ({
  source: 'fallback',
  items: (request.items || []).map((item) => {
    const targetSpecificFallback = getTargetSpecificFallback(item);
    const safeHints = (Array.isArray(item.fallbackHints) ? item.fallbackHints : [])
      .map((hint) => cleanText(hint, 140))
      .filter((hint) => hint
        && !containsTargetAnswer(hint, item.target)
        && !containsObviousAnswerReveal(hint))
      .filter((hint, index, values) => values.indexOf(hint) === index);
    return {
      id: item.id,
      hints: safeHints.length >= 3 ? safeHints.slice(0, 3) : [
        ...safeHints,
        ...(targetSpecificFallback?.hints || []),
        'Focus on what the concept does during program execution.',
        'Compare its purpose and behavior with the other Java concepts in this lesson.',
        'Recall how this concept behaves when Java runs the code.',
      ].filter((hint, index, values) => hint && values.indexOf(hint) === index
        && !containsTargetAnswer(hint, item.target) && !containsObviousAnswerReveal(hint)).slice(0, 3),
    };
  }),
});

const validGeneratedItem = (item, specification) => {
  if (!Array.isArray(item?.hints) || item.hints.length !== 3
    || item.hints.some((hint) => typeof hint !== 'string' || !hint.trim() || hint.length > 140)) return false;
  const hints = (Array.isArray(item?.hints) ? item.hints : [])
    .map((hint) => cleanText(hint, 140))
    .filter(Boolean);
  return hints.length === 3 && new Set(hints.map((hint) => hint.toLowerCase())).size === 3
    && hints.every((hint) => !containsTargetAnswer(hint, specification.target)
      && !containsObviousAnswerReveal(hint)
      && !isGenericGameOneFallback(hint));
};

export const applyGameOneAiContent = (levelData = {}, request = {}, responseData = {}) => {
  const nextLevelData = structuredClone(levelData);
  const specificationsById = new Map((request.items || []).map((item) => [item.id, item]));
  const generatedItems = responseData.source === 'ai' ? responseData.items : [];
  const generatedById = new Map((generatedItems || []).map((item) => [cleanText(item?.id, 80), item]));
  const fallbackById = new Map(
    buildSafeGameOneFallbackContent(request).items.map((item) => [item.id, item]),
  );
  if (Array.isArray(nextLevelData.questions)) {
    nextLevelData.questions.forEach((question, index) => {
      const id = `question:${cleanText(question.id || index, 68)}`;
      const generated = generatedById.get(id);
      const specification = specificationsById.get(id);
      if (!specification) return;
      const isAi = responseData.source === 'ai' && generated?.source !== 'fallback' && validGeneratedItem(generated, specification);
      const selected = isAi ? generated : fallbackById.get(id);
      question.hints = selected.hints.slice(0, 3);
      question.hintSource = isAi ? 'ai' : 'fallback';
    });
  }
  nextLevelData.aiLearningContentSource = nextLevelData.questions?.some((question) => question.hintSource === 'ai') ? 'ai' : 'fallback';
  return nextLevelData;
};

// Share an in-flight/result promise across StrictMode and harmless rerenders.
// A retry's new run token always gets a fresh request; keep the cache bounded.
const hintRuns = new Map();
export const loadGameOneHintsForRun = (scope, request, send) => {
  const key = JSON.stringify([scope, request]);
  if (!hintRuns.has(key)) {
    hintRuns.set(key, Promise.resolve().then(send));
    if (hintRuns.size > 20) hintRuns.delete(hintRuns.keys().next().value);
  }
  return hintRuns.get(key);
};
