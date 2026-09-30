import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  LogOut,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react';
import {
  getGameThreeCardArtByKey,
  getGameThreeCardDisplayNameByKey,
} from '../data/cardArt';
import GameGuideOverlay from '../../shared/ui/GameGuideOverlay';
import GameThreeInteractiveTutorial from './GameThreeInteractiveTutorial';
import GameThreeCardFaces from './GameThreeCardFaces';
import useTutorialPauseTimer from '../systems/useTutorialPauseTimer';
import PlayableTutorialCoach from '../../shared/ui/PlayableTutorialCoach';
import { buildGameThreeGuideContent } from '../../shared/ui/levelGuideBuilders';
import { getStudentMusicVolume, getStudentSfxVolume } from '../../../utils/studentMenuAudio';
import gameThreeBackgroundMusic from '../../../assets/game-arcade/audio/game3-background.mp3';
import gameThreeCardPickSfx from '../assets/audio/flipping-card-sfx.mp3';
import gameThreeGameOverSfx from '../assets/audio/game-over-sfx.mp3';
import levelOneBackground from '../../../assets/game-three/backgrounds/Background 1.png';
import levelTwoBackground from '../../../assets/game-three/backgrounds/Background 2.png';
import levelThreeBackground from '../../../assets/game-three/backgrounds/Background 3.png';
import levelFourBackground from '../../../assets/game-three/backgrounds/Background 4.png';
import levelFiveBackground from '../../../assets/game-three/backgrounds/Background 5.png';

const GAME_THREE_LEVEL_BACKGROUNDS = Object.freeze({
  1: levelOneBackground,
  2: levelTwoBackground,
  3: levelThreeBackground,
  4: levelFourBackground,
  5: levelFiveBackground,
  6: levelFourBackground,
  7: levelThreeBackground,
  8: levelFiveBackground,
  9: levelOneBackground,
  10: levelTwoBackground,
});

const GAME_THREE_LEVEL_SURFACES = Object.freeze({
  1: 'linear-gradient(180deg, #e7c999 0%, #c99a66 100%)',
  2: 'linear-gradient(180deg, #b9d86d 0%, #729b49 100%)',
  3: 'linear-gradient(180deg, #dca067 0%, #a8613d 100%)',
  4: 'linear-gradient(180deg, #8172c8 0%, #aa6fae 100%)',
  5: 'linear-gradient(180deg, #496b36 0%, #263f2d 100%)',
  6: 'linear-gradient(180deg, #8172c8 0%, #aa6fae 100%)',
  7: 'linear-gradient(180deg, #dca067 0%, #a8613d 100%)',
  8: 'linear-gradient(180deg, #496b36 0%, #263f2d 100%)',
  9: 'linear-gradient(180deg, #e7c999 0%, #c99a66 100%)',
  10: 'linear-gradient(180deg, #b9d86d 0%, #729b49 100%)',
});

const GAME_THREE_LEVEL_PANEL_COLORS = Object.freeze({
  1: ['#efd3a4', '#fae8c8'],
  2: ['#c9df8b', '#e7f1be'],
  3: ['#e7ac77', '#f5ceb0'],
  4: ['#a99bd9', '#d5cced'],
  5: ['#789365', '#b8caa5'],
  6: ['#a99bd9', '#d5cced'],
  7: ['#e7ac77', '#f5ceb0'],
  8: ['#789365', '#b8caa5'],
  9: ['#efd3a4', '#fae8c8'],
  10: ['#c9df8b', '#e7f1be'],
});

const gameThreeCorrectSfx = new URL(
  '../../../../assets/Game/game_two/Game 2_ Hardware/Music & Sound Effects/correct answer sf.mp3',
  import.meta.url,
).href;

const gameThreeWrongSfx = new URL(
  '../../../../assets/Game/game_two/Game 2_ Hardware/Music & Sound Effects/incorrect answer sf.mp3',
  import.meta.url,
).href;

const DEFAULT_ACCENTS = ['#34d399', '#38bdf8', '#f59e0b', '#fb7185', '#a78bfa', '#22c55e'];
const DEFAULT_COLUMNS = 4;
const DEFAULT_FLIP_BACK_MS = 900;
const DEFAULT_PREVIEW_MS = 0;
const DEFAULT_PAIR_HINT_COUNT = 3;
const QUESTION_ATTEMPT_LIMIT = 1;
const DEFAULT_QUESTION_BANK_SIZE = 10;
const GAME_THREE_TUTORIAL_STEPS = Object.freeze([
  { title: 'Practice Tutorial', body: 'This tutorial teaches card preview, flipping, and matching before the real Level 1 starts.', buttonLabel: 'Start Practice' },
  { title: 'Watch The Preview', body: 'Cards briefly show themselves at the start. Use the preview to remember where matching pairs are.', buttonLabel: 'Flip Cards' },
  { title: 'Find A Match', body: 'Flip two cards. Matching concepts stay revealed and earn a star.', buttonLabel: 'Try Match' },
  { title: 'Earn The Reward', body: 'Each matching pair immediately adds to your score.', buttonLabel: 'Continue' },
  { title: 'Finish The Tutorial', body: 'Match the practice pair to finish, then start Level 1.', buttonLabel: 'Continue' },
]);

const QUESTION_VARIATION_PROMPTS = Object.freeze([
  (label, prompt) => prompt,
  (label, prompt) => `Write a short Java answer about ${label}: ${prompt}`,
  (label, prompt) => `Review ${label}. ${prompt}`,
  (label, prompt) => `For ${label}, complete this beginner Java scenario: ${prompt}`,
  (label, prompt) => `In a Java quiz about ${label}, answer this: ${prompt}`,
  (label, prompt) => `Which Java idea is shown by ${label}? ${prompt}`,
  (label, prompt) => `Focus on ${label}. ${prompt}`,
  (label, prompt) => `Arrange the best short answer for ${label}: ${prompt}`,
  (label, prompt) => `What should you remember about ${label}? ${prompt}`,
  (label, prompt) => `Which answer correctly matches ${label}? ${prompt}`,
]);

const QUESTION_BANK_DISTRACTORS = Object.freeze([
  'A method that performs a reusable task',
  'A loop that repeats a block of code',
  'A class blueprint used to create objects',
  'A condition that chooses between branches',
  'An import statement that loads a package',
  'An operator that compares two values',
  'A text value written inside quotation marks',
  'A collection that stores multiple elements',
  'A return statement that exits a method',
  'A block of code enclosed in curly braces',
  'A value passed into a method call',
  'A true-or-false value used in logic',
]);

const JAVA_SCENARIO_QUESTION_BANK = Object.freeze({
  variable: [
    {
      questionType: 'Fill in the blank',
      prompt: 'A Java program stores a score with int score = 95;. Fill in the concept name: score is a ____.',
      acceptedAnswers: ['variable'],
      hints: ['It is the named spot that keeps a value.', 'It can change while the program runs.'],
      explanation: 'A variable is a named place that stores a value in a program.',
    },
    {
      questionType: 'Short coding scenario',
      prompt: 'Complete the Java line to store a player level: int ____ = 3;',
      acceptedAnswers: ['level'],
      hints: ['Use the name from the sentence.', 'Only type the missing variable name.'],
      explanation: 'The line declares an int variable named level.',
    },
  ],
  boolean: [
    {
      questionType: 'Scenario based',
      prompt: 'A door can only be open or closed. Which Java type stores true or false? ____',
      acceptedAnswers: ['boolean'],
      hints: ['This type has only two possible values.', 'The values are true and false.'],
      explanation: 'boolean values store true or false decisions.',
    },
    {
      questionType: 'Fill in the blank',
      prompt: 'Complete the Java statement: ____ isGameOver = false;',
      acceptedAnswers: ['boolean'],
      hints: ['The value false gives away the type.', 'Use the Java true/false type.'],
      explanation: 'A boolean variable can store false or true.',
    },
  ],
  string: [
    {
      questionType: 'Fill in the blank',
      prompt: 'Complete the Java declaration for text: ____ playerName = "Mia";',
      acceptedAnswers: ['string'],
      hints: ['Text in double quotes uses this type.', 'In Java, this type starts with a capital S.'],
      explanation: 'String stores text such as names and messages.',
    },
  ],
  array: [
    {
      questionType: 'Scenario based',
      prompt: 'You need one Java variable to hold many scores: int[] scores = {90, 85, 88};. This is an ____.',
      acceptedAnswers: ['array'],
      hints: ['It stores multiple values together.', 'The square brackets are a clue.'],
      explanation: 'An array stores multiple values of the same type.',
    },
  ],
  loop: [
    {
      questionType: 'Short coding scenario',
      prompt: 'You need to print "Hello" five times without writing the same line five times. A ____ helps repeat code.',
      acceptedAnswers: ['loop'],
      hints: ['It runs a block again and again.', 'for and while are examples.'],
      explanation: 'A loop repeats a block of code.',
    },
  ],
  method: [
    {
      questionType: 'Scenario based',
      prompt: 'In Java, a reusable block named calculateTotal() is a ____.',
      acceptedAnswers: ['method'],
      hints: ['It can be called by name.', 'Java usually calls functions by this word.'],
      explanation: 'A method is a reusable block of code inside a class.',
    },
  ],
  function: [
    {
      questionType: 'Scenario based',
      prompt: 'In Java, a reusable block named calculateTotal() is usually called a ____.',
      acceptedAnswers: ['method', 'function'],
      hints: ['Java classes contain these reusable blocks.', 'The Java word is method.'],
      explanation: 'In Java, reusable functions inside classes are called methods.',
    },
  ],
  parameter: [
    {
      questionType: 'Fill in the blank',
      prompt: 'In void greet(String name), name receives a value from the method call. name is a ____.',
      acceptedAnswers: ['parameter'],
      hints: ['It appears inside the parentheses of a method definition.', 'It receives an argument.'],
      explanation: 'A parameter is a named input in a method definition.',
    },
  ],
  return: [
    {
      questionType: 'Short coding scenario',
      prompt: 'A method must send the final total back to the caller. Which Java keyword does that? ____',
      acceptedAnswers: ['return'],
      hints: ['It gives a value back.', 'It can also end a method.'],
      explanation: 'return sends a value back from a method.',
    },
  ],
  class: [
    {
      questionType: 'Scenario based',
      prompt: 'A Java file defines a blueprint named Student with fields and methods. Student is a ____.',
      acceptedAnswers: ['class'],
      hints: ['Objects can be created from it.', 'It is a blueprint.'],
      explanation: 'A class is a blueprint for creating objects.',
    },
  ],
  object: [
    {
      questionType: 'Scenario based',
      prompt: 'Student s = new Student(); creates s from the Student class. s is an ____.',
      acceptedAnswers: ['object'],
      hints: ['It is made from a class.', 'The new keyword creates it.'],
      explanation: 'An object is an instance created from a class.',
    },
  ],
  condition: [
    {
      questionType: 'Fill in the blank',
      prompt: 'Complete the decision statement keyword: ____ (score >= 75) { System.out.println("Pass"); }',
      acceptedAnswers: ['if'],
      hints: ['It starts a branch.', 'It checks whether something is true.'],
      explanation: 'if starts a condition that chooses whether a block runs.',
    },
  ],
  operator: [
    {
      questionType: 'Scenario based',
      prompt: 'In score >= 75, the >= symbol compares two values. It is an ____.',
      acceptedAnswers: ['operator'],
      hints: ['It performs an action or comparison.', '+ and == are also examples.'],
      explanation: 'An operator performs work such as math or comparison.',
    },
  ],
  index: [
    {
      questionType: 'Fill in the blank',
      prompt: 'In names[0], the 0 is the first ____ of the array.',
      acceptedAnswers: ['index'],
      hints: ['Arrays count positions starting at 0.', 'It tells which item to use.'],
      explanation: 'An index is the position of an item in an array.',
    },
  ],
  syntax: [
    {
      questionType: 'Short coding scenario',
      prompt: 'A Java statement is missing its ending punctuation: int age = 12____',
      acceptedAnswers: [';'],
      hints: ['Most Java statements end with it.', 'It is a semicolon.'],
      explanation: 'Java statements usually end with a semicolon.',
    },
  ],
});

const JAVA_SCENARIO_KEY_ALIASES = Object.freeze({
  int: 'variable',
  integer: 'variable',
  bool: 'boolean',
  text: 'string',
  collection: 'array',
  list: 'array',
  repeat: 'loop',
  branch: 'condition',
  comparison: 'operator',
});

const normalizeAnswerText = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[.]+$/g, '')
  .replace(/\s+/g, ' ');

const normalizeJumbledAnswerText = (value) => normalizeAnswerText(value).replace(/\s+/g, '');

const limitAnswerToTwoWords = (value) => {
  const words = normalizeAnswerText(value).split(' ').filter(Boolean);
  return words.slice(0, 2).join(' ');
};

const buildJumbledAnswerTiles = (answer, seed = '') => {
  const letters = normalizeJumbledAnswerText(answer).split('');
  const seedOffset = String(seed)
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  const tiles = letters.map((letter, index) => ({
    id: `${seed || 'answer'}-${letter}-${index}`,
    letter,
    sortValue: ((letter.charCodeAt(0) * 31) + (index * 17) + seedOffset) % 997,
  }));
  const shuffled = [...tiles].sort((firstTile, secondTile) => (
    firstTile.sortValue - secondTile.sortValue || firstTile.id.localeCompare(secondTile.id)
  ));

  if (shuffled.map((tile) => tile.letter).join('') === letters.join('') && shuffled.length > 1) {
    shuffled.push(shuffled.shift());
  }

  return shuffled;
};

const getJavaScenarioKey = (pairLabel) => {
  const normalized = normalizeAnswerText(pairLabel).replace(/[^a-z0-9]+/g, ' ');
  const words = normalized.split(' ').filter(Boolean);
  const directKey = words.find((word) => JAVA_SCENARIO_QUESTION_BANK[word]);

  if (directKey) {
    return directKey;
  }

  return words.find((word) => JAVA_SCENARIO_KEY_ALIASES[word]) || normalized;
};

const buildScenarioQuestion = (question, pairLabel, questionIndex = 0) => {
  const scenarioKey = getJavaScenarioKey(pairLabel);
  const bankKey = JAVA_SCENARIO_QUESTION_BANK[scenarioKey]
    ? scenarioKey
    : JAVA_SCENARIO_KEY_ALIASES[scenarioKey];
  const bank = JAVA_SCENARIO_QUESTION_BANK[bankKey] || [];
  const fallbackAnswer = normalizeAnswerText(pairLabel) || 'java';
  const scenario = bank[questionIndex % Math.max(1, bank.length)] || {
    questionType: 'Scenario based',
    prompt: `In a beginner Java lesson, which concept matches this card: ${pairLabel}? ____`,
    acceptedAnswers: [fallbackAnswer],
    hints: [`Arrange the Java concept shown on the matched card: ${pairLabel}.`],
    explanation: `${pairLabel} is the concept represented by this pair.`,
  };
  const acceptedAnswers = (Array.isArray(scenario.acceptedAnswers) ? scenario.acceptedAnswers : [])
    .map(normalizeAnswerText)
    .map(limitAnswerToTwoWords)
    .filter(Boolean);

  return {
    ...scenario,
    acceptedAnswers: acceptedAnswers.length > 0
      ? acceptedAnswers
      : [limitAnswerToTwoWords(fallbackAnswer) || 'java'],
  };
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const isHexColor = (value) => /^#[0-9a-fA-F]{6}$/.test(String(value || '').trim());

const toRgba = (hexColor, alpha) => {
  if (!isHexColor(hexColor)) {
    return `rgba(15, 23, 42, ${alpha})`;
  }

  const normalized = hexColor.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const shuffleDeck = (items) => {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};

const shuffleQuestionOptions = (options, correctOptionId) => {
  const originalOptions = Array.isArray(options) ? options : [];
  if (originalOptions.length === 0) {
    return {
      options: [],
      correctOptionId: 'a',
    };
  }

  const correctOption = originalOptions.find((option) => option.id === correctOptionId)
    || originalOptions[0];
  const shuffled = shuffleDeck(originalOptions).map((option, index) => ({
    ...option,
    id: String.fromCharCode(97 + index),
  }));
  const remappedCorrectOption = shuffled.find((option) => option.label === correctOption.label);

  return {
    options: shuffled,
    correctOptionId: remappedCorrectOption?.id || 'a',
  };
};

const resolveGameThreePairSprite = (pair, index = 0, levelNumber = 1) => ({
  url: getGameThreeCardArtByKey(
    pair?.cardArt || pair?.spriteKey || pair?.label || '',
    index,
    levelNumber,
  ),
  label: getGameThreeCardDisplayNameByKey(
    pair?.cardArt || pair?.spriteKey || pair?.label || '',
    index,
    levelNumber,
  ),
});

const normalizeQuestion = (question, pairLabel, questionIndex = 0) => {
  const scenarioQuestion = buildScenarioQuestion(question, pairLabel, questionIndex);
  const hints = (Array.isArray(question?.hints) ? question.hints : [])
    .map((hint) => String(hint || '').trim())
    .filter(Boolean)
    .slice(0, DEFAULT_PAIR_HINT_COUNT);

  return {
    id: typeof question?.id === 'string' && question.id.trim()
      ? question.id.trim()
      : `${String(pairLabel || 'question').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'question'}-${questionIndex + 1}`,
    prompt: scenarioQuestion.prompt,
    questionType: scenarioQuestion.questionType,
    acceptedAnswers: scenarioQuestion.acceptedAnswers,
    answerLabel: scenarioQuestion.acceptedAnswers[0] || '',
    hints: hints.length > 0
      ? hints
      : scenarioQuestion.hints.slice(0, DEFAULT_PAIR_HINT_COUNT),
    explanation: scenarioQuestion.explanation || '',
  };
};

const buildOptionVariations = (question, questionIndex, pairLabel) => {
  const rawOptions = Array.isArray(question?.options) && question.options.length > 0
    ? question.options
    : ['A', 'B', 'C', 'D'];
  const normalizedOptions = rawOptions.map((option, index) => {
    const fallbackId = String.fromCharCode(97 + index);
    const id = typeof option === 'object' && option?.id
      ? String(option.id).trim().toLowerCase() || fallbackId
      : fallbackId;
    const label = typeof option === 'object' && option?.label
      ? String(option.label).trim()
      : String(option || fallbackId).trim();

    return {
      id,
      label: label || fallbackId.toUpperCase(),
    };
  });
  const correctOptionId = String(question?.correctOptionId || normalizedOptions[0]?.id || 'a')
    .trim()
    .toLowerCase();
  const correctOption = normalizedOptions.find((option) => option.id === correctOptionId)
    || normalizedOptions[0]
    || { label: pairLabel || 'the concept' };
  const correctLabel = correctOption.label;
  const originalDistractors = normalizedOptions
    .filter((option) => option.id !== correctOptionId)
    .map((option) => option.label);
  const distractorPool = [...originalDistractors, ...QUESTION_BANK_DISTRACTORS]
    .filter((label) => label && label.toLowerCase() !== correctLabel.toLowerCase());
  const distractors = [];
  let cursor = questionIndex;

  while (distractors.length < 3 && distractorPool.length > 0) {
    const candidate = distractorPool[cursor % distractorPool.length];
    if (!distractors.some((label) => label.toLowerCase() === candidate.toLowerCase())) {
      distractors.push(candidate);
    }
    cursor += 1;
  }

  while (distractors.length < 3) {
    distractors.push(`Unrelated option ${distractors.length + 1}`);
  }

  const labelOffset = String(pairLabel || '')
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  const correctIndex = (questionIndex + labelOffset) % 4;
  const orderedLabels = [...distractors];
  orderedLabels.splice(correctIndex, 0, correctLabel);

  return {
    options: orderedLabels.slice(0, 4).map((label, index) => ({
      id: String.fromCharCode(97 + index),
      label,
    })),
    correctOptionId: String.fromCharCode(97 + correctIndex),
  };
};

const buildQuestionVariation = (question, pairLabel, index, optionSeedQuestion = question) => {
  const promptBuilder = QUESTION_VARIATION_PROMPTS[index % QUESTION_VARIATION_PROMPTS.length];
  const prompt = typeof question?.prompt === 'string' && question.prompt.trim()
    ? question.prompt.trim()
    : `What best describes ${pairLabel}?`;

  return {
    ...(question || {}),
    id: `${String(pairLabel || 'question').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'question'}-ai-${index + 1}`,
    prompt: promptBuilder(pairLabel, prompt),
    ...buildOptionVariations(optionSeedQuestion, index, pairLabel),
    source: 'AI_GENERATED_BANK',
  };
};

const normalizeQuestionBank = (pair, pairLabel) => {
  const explicitQuestions = Array.isArray(pair?.questions)
    ? pair.questions.filter((question) => question && typeof question === 'object')
    : [];
  const legacyQuestion = pair?.question && typeof pair.question === 'object' ? pair.question : null;
  const firstExplicitPrompt = typeof explicitQuestions[0]?.prompt === 'string'
    ? explicitQuestions[0].prompt.trim()
    : '';
  const legacyPrompt = typeof legacyQuestion?.prompt === 'string'
    ? legacyQuestion.prompt.trim()
    : '';
  const shouldPrependLegacyQuestion = Boolean(
    legacyQuestion
    && explicitQuestions.length > 0
    && (legacyQuestion.isDynamic || (legacyPrompt && legacyPrompt !== firstExplicitPrompt))
  );
  const baseQuestions = explicitQuestions.length > 0
    ? (shouldPrependLegacyQuestion ? [legacyQuestion, ...explicitQuestions] : explicitQuestions)
    : (legacyQuestion ? [legacyQuestion] : []);
  const seedQuestion = baseQuestions[0] || legacyQuestion || {};
  const expandedQuestions = [...baseQuestions];

  while (expandedQuestions.length < DEFAULT_QUESTION_BANK_SIZE) {
    expandedQuestions.push(buildQuestionVariation(seedQuestion, pairLabel, expandedQuestions.length));
  }

  return expandedQuestions
    .slice(0, DEFAULT_QUESTION_BANK_SIZE)
    .map((question, index) => normalizeQuestion(question, pairLabel, index));
};

const normalizePairs = (pairs, levelNumber = 1) => (
  (Array.isArray(pairs) ? pairs : [])
    .map((pair, index) => {
      if (!pair || typeof pair !== 'object') {
        return null;
      }

      const safeId = String(pair.id || '').trim();
      if (!safeId) {
        return null;
      }

      const safeLabel = typeof pair.label === 'string' && pair.label.trim()
        ? pair.label.trim()
        : `Pair ${index + 1}`;
      const accent = isHexColor(pair.accent)
        ? String(pair.accent).trim()
        : DEFAULT_ACCENTS[index % DEFAULT_ACCENTS.length];
      const badge = typeof pair.badge === 'string' && pair.badge.trim()
        ? pair.badge.trim()
        : String(index + 1).padStart(2, '0');

      const sprite = resolveGameThreePairSprite(pair, index, levelNumber);
      const displayLabel = safeLabel;

      const questions = normalizeQuestionBank(pair, displayLabel);

      return {
        id: safeId,
        label: displayLabel,
        originalLabel: safeLabel,
        accent,
        badge,
        sprite,
        spriteUrl: sprite?.url || '',
        question: questions[0],
        questions,
      };
    })
    .filter(Boolean)
);

const buildDeck = (pairs) => shuffleDeck(
  pairs.flatMap((pair) => {
    const pairContent = Object.freeze({
      pairId: pair.id,
      label: pair.label,
      accent: pair.accent,
      badge: pair.badge,
      spriteUrl: pair.sprite?.url || '',
    });

    return [
      {
        ...pairContent,
        cardId: `${pair.id}-1`,
        pairContent,
      },
      {
        ...pairContent,
      cardId: `${pair.id}-2`,
        pairContent,
      },
    ];
  }),
);

const renderScreenModal = (content) => (
  typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : null
);

const buildQuestionBankProgressKey = (levelData, pairId) => {
  const levelKey = typeof levelData?.id === 'string' && levelData.id.trim()
    ? levelData.id.trim()
    : `game-three-level-${Number(levelData?.levelNumber) || 1}`;
  return `itechs:game-three:question-bank:${levelKey}:${pairId}`;
};

const buildGameThreeRunKey = (levelData) => {
  const levelKey = typeof levelData?.id === 'string' && levelData.id.trim()
    ? levelData.id.trim()
    : `game-three-level-${Number(levelData?.levelNumber) || 1}`;
  return `itechs:game-three:run-count:${levelKey}`;
};

const readQuestionBankIndex = (levelData, pairId, bankLength) => {
  if (typeof window === 'undefined' || !pairId || bankLength <= 0) {
    return 0;
  }

  const parsed = Number.parseInt(
    window.localStorage.getItem(buildQuestionBankProgressKey(levelData, pairId)) || '',
    10,
  );

  if (!Number.isInteger(parsed)) {
    return 0;
  }

  return clamp(parsed, 0, bankLength - 1);
};

const advanceQuestionBankIndex = (levelData, pairId, currentIndex, bankLength) => {
  if (typeof window === 'undefined' || !pairId || bankLength <= 0) {
    return;
  }

  const nextIndex = (clamp(Number(currentIndex) || 0, 0, bankLength - 1) + 1) % bankLength;
  window.localStorage.setItem(
    buildQuestionBankProgressKey(levelData, pairId),
    String(nextIndex),
  );
};

const readGameThreeRunCount = (levelData) => {
  if (typeof window === 'undefined') {
    return 0;
  }

  const parsed = Number.parseInt(window.localStorage.getItem(buildGameThreeRunKey(levelData)) || '', 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const advanceGameThreeRunCount = (levelData) => {
  if (typeof window === 'undefined') {
    return 0;
  }

  const nextCount = readGameThreeRunCount(levelData) + 1;
  window.localStorage.setItem(buildGameThreeRunKey(levelData), String(nextCount));
  return nextCount;
};

const useGameThreeAudio = ({ musicSrc, correctSrc, wrongSrc, cardPickSrc, gameOverSrc, active }) => {
  const musicRef = useRef(null);
  const correctRef = useRef(null);
  const wrongRef = useRef(null);
  const cardPickRef = useRef(null);
  const gameOverRef = useRef(null);
  const musicBlockedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.Audio === 'undefined') return undefined;

    const music = new Audio(musicSrc);
    music.loop = true;
    music.volume = getStudentMusicVolume(1);
    music.preload = 'auto';
    musicRef.current = music;

    const correct = new Audio(correctSrc);
    correct.volume = getStudentSfxVolume(1);
    correct.preload = 'auto';
    correctRef.current = correct;

    const wrong = new Audio(wrongSrc);
    wrong.volume = getStudentSfxVolume(1);
    wrong.preload = 'auto';
    wrongRef.current = wrong;

    const cardPick = new Audio(cardPickSrc);
    cardPick.volume = getStudentSfxVolume(1);
    cardPick.preload = 'auto';
    cardPickRef.current = cardPick;

    const gameOver = new Audio(gameOverSrc);
    gameOver.volume = getStudentSfxVolume(1);
    gameOver.preload = 'auto';
    gameOverRef.current = gameOver;

    return () => {
      music.pause();
      music.currentTime = 0;
      musicRef.current = null;
      correctRef.current = null;
      wrongRef.current = null;
      cardPickRef.current = null;
      gameOverRef.current = null;
      musicBlockedRef.current = false;
    };
  }, [cardPickSrc, correctSrc, gameOverSrc, musicSrc, wrongSrc]);

  useEffect(() => {
    const music = musicRef.current;
    if (!music) return;

    if (!active) {
      music.pause();
      return;
    }

    const retryMusic = () => {
      if (!active || !music.paused) return;

      music.volume = getStudentMusicVolume(1);
      const retryPromise = music.play();
      if (retryPromise?.then) {
        retryPromise
          .then(() => {
            musicBlockedRef.current = false;
          })
          .catch(() => {
            musicBlockedRef.current = true;
          });
      }
    };

    const playPromise = music.play();
    if (playPromise?.then) {
      playPromise
        .then(() => {
          musicBlockedRef.current = false;
        })
        .catch(() => {
          musicBlockedRef.current = true;
        });
    }

    window.addEventListener('pointerdown', retryMusic);
    window.addEventListener('keydown', retryMusic);

    return () => {
      window.removeEventListener('pointerdown', retryMusic);
      window.removeEventListener('keydown', retryMusic);
    };
  }, [active]);

  const playCorrect = React.useCallback(() => {
    const sound = correctRef.current;
    if (!sound) return;
    try {
      sound.currentTime = 0;
      const playPromise = sound.play();
      if (playPromise?.catch) playPromise.catch(() => {});
    } catch (error) {
      // Ignore browser audio restrictions.
    }
  }, []);

  const playWrong = React.useCallback(() => {
    const sound = wrongRef.current;
    if (!sound) return;
    try {
      sound.currentTime = 0;
      const playPromise = sound.play();
      if (playPromise?.catch) playPromise.catch(() => {});
    } catch (error) {
      // Ignore browser audio restrictions.
    }
  }, []);

  const playCardPick = React.useCallback(() => {
    const sound = cardPickRef.current;
    if (!sound) return;
    try {
      sound.currentTime = 0;
      const playPromise = sound.play();
      if (playPromise?.catch) playPromise.catch(() => {});
    } catch (error) {
      // Ignore browser audio restrictions.
    }
  }, []);

  const playGameOver = React.useCallback(() => {
    const sound = gameOverRef.current;
    if (!sound) return;
    try {
      const music = musicRef.current;
      if (music) {
        music.pause();
      }
      [wrongRef.current, correctRef.current, cardPickRef.current].forEach((otherSound) => {
        if (!otherSound) return;
        otherSound.pause();
        otherSound.currentTime = 0;
      });
      sound.muted = false;
      sound.volume = getStudentSfxVolume(1);
      sound.currentTime = 0;
      const playPromise = sound.play();
      if (playPromise?.catch) playPromise.catch(() => {});
    } catch (error) {
      // Ignore browser audio restrictions.
    }
  }, []);

  const stopGameAudio = React.useCallback(() => {
    [musicRef.current, correctRef.current, wrongRef.current, cardPickRef.current, gameOverRef.current]
      .forEach((sound) => {
        if (!sound) return;
        sound.pause();
        sound.currentTime = 0;
      });
  }, []);

  return { playCorrect, playWrong, playCardPick, playGameOver, stopGameAudio };
};

  const GameCanvasGameThree = ({
  levelData,
  viewportWidth = 1280,
  onLevelComplete,
  onExitRequest,
  resultData,
  gameplayData,
  isSubmitting,
  canAdvanceLevel,
  hideResultOverlay = false,
  onRetry,
  onBack,
  onNextLevel,
  freeMistakes = 3,
  initialCoins,
  suppressIntroTutorial = false,
  showLevelGuideline = false,
  gameTutorialRequested = false,
  onTutorialRequest,
  continueToTutorialAfterGuide = false,
}) => {
  const tutorialRootRef = useRef(null);
  const pairs = useMemo(
    () => normalizePairs(levelData?.pairs, levelData?.levelNumber),
    [levelData],
  );
  const deck = useMemo(() => buildDeck(pairs), [pairs]);
  const deckById = useMemo(
    () => new Map(deck.map((card) => [card.cardId, card])),
    [deck],
  );
  const pairById = useMemo(
    () => new Map(pairs.map((pair) => [pair.id, pair])),
    [pairs],
  );

  const settings = levelData?.settings && typeof levelData.settings === 'object'
    ? levelData.settings
    : {};
  const guideContent = useMemo(
    () => buildGameThreeGuideContent(levelData, { freeMistakes }),
    [freeMistakes, levelData],
  );
  const isTutorialLevel = Boolean(levelData?.isTutorialLevel);
  const isFirstLevelGuide = Number(levelData?.levelNumber || 1) === 1;
  const isLevelOneLayout = Number(levelData?.levelNumber || 1) === 1;
  const isLevelThreeLayout = Number(levelData?.levelNumber || 1) === 3;
  const isLevelFourLayout = Number(levelData?.levelNumber || 1) === 4;
  const isLevelFiveLayout = Number(levelData?.levelNumber || 1) === 5;
  const isFinalLevel = Number(levelData?.levelNumber || 1) >= 10;
  const levelBackground = GAME_THREE_LEVEL_BACKGROUNDS[Number(levelData?.levelNumber || 1)];
  const levelSurface = GAME_THREE_LEVEL_SURFACES[Number(levelData?.levelNumber || 1)];
  const levelPanelColors = GAME_THREE_LEVEL_PANEL_COLORS[Number(levelData?.levelNumber || 1)];
  const columns = clamp(Math.round(Number(settings.columns) || DEFAULT_COLUMNS), 2, 8);
  const flipBackMs = clamp(
    Math.round(Number(settings.flipBackMs) || DEFAULT_FLIP_BACK_MS),
    450,
    2200,
  );
  const previewMs = clamp(
    Math.round(Number(settings.previewMs) || DEFAULT_PREVIEW_MS),
    0,
    10000,
  );

  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [matchedPairIds, setMatchedPairIds] = useState([]);
  const [answeredPairIds, setAnsweredPairIds] = useState([]);
  const [points, setPoints] = useState(0);
  const [coins, setCoins] = useState(0);
  const [moves, setMoves] = useState(0);
  const [mismatches, setMismatches] = useState(0);
  const [wrongQuestionAnswers, setWrongQuestionAnswers] = useState(0);
  const [isPreviewing, setIsPreviewing] = useState(previewMs > 0);
  const [isResolving, setIsResolving] = useState(false);
  const [activePairId, setActivePairId] = useState('');
  const [questionFeedback, setQuestionFeedback] = useState(null);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [showGuide, setShowGuide] = useState(
    showLevelGuideline && !isTutorialLevel,
  );
  const [guideOpenedDuringGameplay, setGuideOpenedDuringGameplay] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [tutorialDemo, setTutorialDemo] = useState(null);
  const activeDemo = showHowToPlay ? tutorialDemo : null;

  useEffect(() => {
    if (Number(gameTutorialRequested) > 0 && !isTutorialLevel) {
      setShowGuide(false);
      setShowHowToPlay(true);
    }
  }, [gameTutorialRequested, isTutorialLevel]);
  const [tutorialCoachOpen, setTutorialCoachOpen] = useState(
    isTutorialLevel,
  );
  const [flipAttemptsLeft, setFlipAttemptsLeft] = useState(0);
  const [questionAttemptsLeft, setQuestionAttemptsLeft] = useState(QUESTION_ATTEMPT_LIMIT);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedAnswerTileIds, setSelectedAnswerTileIds] = useState([]);
  const [runQuestionOffset, setRunQuestionOffset] = useState(0);

  const compareTimer = useTutorialPauseTimer(showHowToPlay);
  const previewTimer = useTutorialPauseTimer(showHowToPlay);
  const handleReturnFromTutorial = () => {
    // Restart only pending timers, while still paused. The full level-configured
    // preview/comparison delay begins once the tutorial is actually dismissed.
    // Already matched cards, selected cards and run counters are left alone.
    previewTimer.restart();
    compareTimer.restart();
    setShowHowToPlay(false);
  };
  const previewStartedRef = useRef(false);
  const questionAdvanceTimerRef = useRef(null);
  const shouldPauseForGuide = Boolean(showGuide && !isTutorialLevel);
  const shouldPauseForTutorialCoach = Boolean(
    tutorialCoachOpen && (isTutorialLevel || (isFirstLevelGuide && !suppressIntroTutorial)),
  );
  const shouldPauseForIntroOverlay = shouldPauseForGuide || showHowToPlay || shouldPauseForTutorialCoach;
  const handleContinueTutorialStep = () => {
    if (tutorialStepIndex === 0) {
      setTutorialStepIndex(1);
    }
    setTutorialCoachOpen(false);
  };
  const submittedRef = useRef(false);

  const selectedCardIdSet = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);
  const matchedPairIdSet = useMemo(() => new Set(matchedPairIds), [matchedPairIds]);
  const answeredPairIdSet = useMemo(() => new Set(answeredPairIds), [answeredPairIds]);
  const totalPairs = pairs.length;
  const totalCards = deck.length;
  const resolvedStartingCoins = useMemo(() => {
    const explicitStart = Number(initialCoins);
    if (Number.isFinite(explicitStart) && explicitStart >= 0) {
      return Math.round(explicitStart);
    }

    if (totalPairs > 0) {
      return totalPairs;
    }

    return 0;
  }, [initialCoins, totalPairs]);
  const activePair = activePairId ? pairById.get(activePairId) : null;
  const activePairSpriteUrl = activePair?.spriteUrl || activePair?.sprite?.url || '';
  const activeQuestionBank = Array.isArray(activePair?.questions) && activePair.questions.length > 0
    ? activePair.questions
    : (activePair?.question ? [activePair.question] : []);
  const activeQuestion = activeQuestionBank[activeQuestionIndex] || activeQuestionBank[0] || activePair?.question || null;
  const activeQuestionNumber = Math.min(activeQuestionIndex + 1, Math.max(1, activeQuestionBank.length));
  const activeAnswerLabel = activeQuestion?.answerLabel || activeQuestion?.acceptedAnswers?.[0] || '';
  const answerTiles = useMemo(
    () => buildJumbledAnswerTiles(activeAnswerLabel, activeQuestion?.id || activePairId || 'answer'),
    [activeAnswerLabel, activePairId, activeQuestion?.id],
  );
  const selectedAnswerTileIdSet = useMemo(
    () => new Set(selectedAnswerTileIds),
    [selectedAnswerTileIds],
  );
  const arrangedAnswer = useMemo(() => (
    selectedAnswerTileIds
      .map((tileId) => answerTiles.find((tile) => tile.id === tileId)?.letter || '')
      .join('')
  ), [answerTiles, selectedAnswerTileIds]);
  const isAnswerComplete = answerTiles.length > 0 && selectedAnswerTileIds.length === answerTiles.length;
  const summaryPoints = resultData?.finalScore ?? gameplayData?.points ?? points;
  const summaryMoves = gameplayData?.moves ?? moves;
  const summaryPairs = gameplayData?.matchedPairs ?? matchedPairIds.length;
  const preferredColumns = Math.min(totalCards, Math.max(2, columns));
  const responsiveColumns = useMemo(() => {
    if (viewportWidth < 560 && totalCards >= 16) {
      // Preserve the approved large-card phone presentation for dense levels.
      // The page remains vertically scrollable so every card stays accessible.
      return 4;
    }

    if (totalCards >= 16) {
      // Dense memory boards must remain fully visible without creating the
      // narrow 2-column strips seen on phones. Square decks become 4x4 and
      // 6x6 while other dense decks use the nearest complete square width.
      return Math.ceil(Math.sqrt(totalCards));
    }

    if (viewportWidth >= 1400) {
      return preferredColumns;
    }

    if (viewportWidth >= 1180) {
      return Math.min(preferredColumns, 7);
    }

    if (viewportWidth >= 920) {
      return Math.min(preferredColumns, 6);
    }

    if (viewportWidth >= 760) {
      return Math.min(preferredColumns, 5);
    }

    if (viewportWidth >= 560) {
      return Math.min(preferredColumns, 4);
    }

    return Math.min(preferredColumns, 3);
  }, [preferredColumns, totalCards, viewportWidth]);
  const responsiveRows = useMemo(
    () => Math.max(1, Math.ceil(totalCards / responsiveColumns)),
    [responsiveColumns, totalCards],
  );
  const audioEnabled = !shouldPauseForIntroOverlay && !resultData && !isSubmitting;
  const { playCorrect, playWrong, playCardPick, playGameOver, stopGameAudio } = useGameThreeAudio({
    musicSrc: gameThreeBackgroundMusic,
    correctSrc: gameThreeCorrectSfx,
    wrongSrc: gameThreeWrongSfx,
    cardPickSrc: gameThreeCardPickSfx,
    gameOverSrc: gameThreeGameOverSfx,
    active: audioEnabled,
  });
  const gameOverPlayedRef = useRef(false);

  useEffect(() => {
    if (!resultData || isSubmitting) {
      return;
    }

    if (resultData.result !== 'COMPLETED' && !gameOverPlayedRef.current) {
      gameOverPlayedRef.current = true;
      playGameOver();
    }
  }, [isSubmitting, playGameOver, resultData]);

  useEffect(() => {
    compareTimer.cancel();
    previewTimer.cancel();
    if (questionAdvanceTimerRef.current) {
      clearTimeout(questionAdvanceTimerRef.current);
    }

    submittedRef.current = false;
    gameOverPlayedRef.current = false;
    setSelectedCardIds([]);
    setMatchedPairIds([]);
    setAnsweredPairIds([]);
    setPoints(0);
    setCoins(resolvedStartingCoins);
    setMoves(0);
    setMismatches(0);
    setWrongQuestionAnswers(0);
    setIsResolving(false);
    setActivePairId('');
    setQuestionFeedback(null);
    setIsPreviewing(false);
    previewStartedRef.current = false;
    setTutorialStepIndex(0);
    setShowGuide(showLevelGuideline && !isTutorialLevel);
    setGuideOpenedDuringGameplay(false);
    setShowHowToPlay(false);
    setTutorialCoachOpen(isTutorialLevel);
    setFlipAttemptsLeft(deck.length);
    setQuestionAttemptsLeft(QUESTION_ATTEMPT_LIMIT);
    setActiveQuestionIndex(0);
    setSelectedAnswerTileIds([]);
    if (typeof window === 'undefined') {
      setRunQuestionOffset(0);
    } else {
      const currentRunOffset = readGameThreeRunCount(levelData);
      setRunQuestionOffset(currentRunOffset);
      advanceGameThreeRunCount(levelData);
    }

  }, [compareTimer, previewTimer, deck, isFirstLevelGuide, isTutorialLevel, levelData, previewMs, resolvedStartingCoins, showLevelGuideline, suppressIntroTutorial]);

  useEffect(() => {
    if (previewMs <= 0 || shouldPauseForIntroOverlay || previewStartedRef.current) {
      return undefined;
    }

    previewStartedRef.current = true;
    setIsPreviewing(true);
    previewTimer.schedule(() => {
      setIsPreviewing(false);
    }, previewMs);
    return undefined;
  }, [previewMs, previewTimer, shouldPauseForIntroOverlay]);

  useEffect(() => () => {
    if (questionAdvanceTimerRef.current) {
      clearTimeout(questionAdvanceTimerRef.current);
    }
  }, []);

  useEffect(() => {
    setSelectedAnswerTileIds([]);
    setQuestionAttemptsLeft(QUESTION_ATTEMPT_LIMIT);
    setActiveQuestionIndex(
      activePair
        ? (readQuestionBankIndex(levelData, activePair.id, activeQuestionBank.length) + runQuestionOffset) % Math.max(1, activeQuestionBank.length)
        : 0,
    );
  }, [activePair, activePairId, activeQuestionBank.length, levelData, runQuestionOffset]);

  useEffect(() => {
    if (submittedRef.current || totalPairs === 0 || answeredPairIds.length < totalPairs) {
      return;
    }

    submittedRef.current = true;
    stopGameAudio();
    onLevelComplete?.({
      outcome: 'COMPLETED',
      points,
      coinsRemaining: coins,
      hintsUsed: 0,
      answeredQuestions: answeredPairIds.length,
      totalQuestions: totalPairs,
      matchedPairs: matchedPairIds.length,
      totalPairs,
      moves,
      mismatches,
      wrongAnswers: wrongQuestionAnswers,
    });
  }, [answeredPairIds.length, coins, matchedPairIds.length, mismatches, moves, onLevelComplete, points, stopGameAudio, totalPairs, wrongQuestionAnswers]);

  useEffect(() => {
    const hasResolvedQuestion = Boolean(questionFeedback?.isCorrect || questionAttemptsLeft <= 0);
    const hasFinishedAllPairs = answeredPairIds.length >= totalPairs && totalPairs > 0;

    if (!activePairId || !hasResolvedQuestion || !hasFinishedAllPairs) {
      if (questionAdvanceTimerRef.current) {
        clearTimeout(questionAdvanceTimerRef.current);
        questionAdvanceTimerRef.current = null;
      }
      return undefined;
    }

    questionAdvanceTimerRef.current = window.setTimeout(() => {
      setActivePairId('');
      setQuestionFeedback(null);
      setSelectedAnswerTileIds([]);
      questionAdvanceTimerRef.current = null;
    }, 650);

    return () => {
      if (questionAdvanceTimerRef.current) {
        clearTimeout(questionAdvanceTimerRef.current);
        questionAdvanceTimerRef.current = null;
      }
    };
  }, [activePairId, answeredPairIds.length, questionAttemptsLeft, questionFeedback, totalPairs]);

  useEffect(() => {
    if (
      submittedRef.current
      || isSubmitting
      || resultData
      || totalPairs === 0
      || moves <= 0
      || shouldPauseForIntroOverlay
      || isPreviewing
      || flipAttemptsLeft > 0
      || isResolving
      || activePairId
      || answeredPairIds.length >= totalPairs
    ) {
      return;
    }

    submittedRef.current = true;
    if (!gameOverPlayedRef.current) {
      gameOverPlayedRef.current = true;
      playGameOver();
    }
    onLevelComplete?.({
      outcome: 'FAILED',
      points,
      coinsRemaining: coins,
      hintsUsed: 0,
      answeredQuestions: answeredPairIds.length,
      totalQuestions: totalPairs,
      matchedPairs: matchedPairIds.length,
      totalPairs,
      moves,
      mismatches,
      flipAttemptsUsed: totalCards,
      wrongAnswers: wrongQuestionAnswers,
    });
  }, [
    activePairId,
    answeredPairIds.length,
    coins,
    flipAttemptsLeft,
    isResolving,
    isPreviewing,
    isSubmitting,
    matchedPairIds.length,
    mismatches,
    moves,
    onLevelComplete,
    playGameOver,
    points,
    resultData,
    shouldPauseForIntroOverlay,
    totalCards,
    totalPairs,
    wrongQuestionAnswers,
  ]);

  const handleCardSelect = (card) => {
    const interactionLocked = Boolean(
      isSubmitting
      || resultData
      || isPreviewing
      || isResolving
      || activePairId
      || shouldPauseForIntroOverlay
      || flipAttemptsLeft <= 0
    );

    if (interactionLocked) {
      return;
    }

    if (matchedPairIdSet.has(card.pairId) || selectedCardIdSet.has(card.cardId)) {
      return;
    }

    playCardPick();

    if (selectedCardIds.length === 0) {
      if (isTutorialLevel && tutorialStepIndex < 2) {
        setTutorialStepIndex(2);
      }
      setSelectedCardIds([card.cardId]);
      return;
    }

    const firstCard = deckById.get(selectedCardIds[0]);
    if (!firstCard) {
      setSelectedCardIds([card.cardId]);
      return;
    }

    compareTimer.cancel();

    setSelectedCardIds([firstCard.cardId, card.cardId]);
    setMoves((value) => value + 1);
    setFlipAttemptsLeft((value) => Math.max(0, value - 1));
    setIsResolving(true);

    const isMatch = firstCard.pairId === card.pairId;
    compareTimer.schedule(() => {
      if (isMatch) {
        setMatchedPairIds((previous) => {
          if (previous.includes(card.pairId)) return previous;
          const nextMatchedPairs = [...previous, card.pairId];
          if (nextMatchedPairs.length < totalPairs) {
            playCorrect();
          }
          return nextMatchedPairs;
        });
        setAnsweredPairIds((previous) => (
          previous.includes(card.pairId) ? previous : [...previous, card.pairId]
        ));
        setPoints((value) => value + 100);
        if (isTutorialLevel && tutorialStepIndex < 3) {
          setTutorialStepIndex(4);
          setTutorialCoachOpen(true);
        }
      } else {
        playWrong();
        setMismatches((value) => value + 1);
      }

      setSelectedCardIds([]);
      setIsResolving(false);
    }, isMatch ? 440 : flipBackMs);
  };

  const handleSelectAnswerTile = (tileId) => {
    if (questionFeedback || questionAttemptsLeft <= 0 || selectedAnswerTileIdSet.has(tileId)) {
      return;
    }

    setSelectedAnswerTileIds((previous) => [...previous, tileId]);
  };

  const handleRemoveAnswerTile = (tileId) => {
    if (questionFeedback || questionAttemptsLeft <= 0) {
      return;
    }

    setSelectedAnswerTileIds((previous) => previous.filter((selectedTileId) => selectedTileId !== tileId));
  };

  const handleClearAnswerTiles = () => {
    if (questionFeedback || questionAttemptsLeft <= 0) {
      return;
    }

    setSelectedAnswerTileIds([]);
  };

  const handleQuestionSubmit = (event) => {
    event?.preventDefault();

    if (!activePair || questionFeedback || questionAttemptsLeft <= 0 || !isAnswerComplete) {
      return;
    }

    if (!activeQuestion) {
      return;
    }

    const submittedAnswer = arrangedAnswer;
    const normalizedSubmittedAnswer = normalizeJumbledAnswerText(submittedAnswer);
    const acceptedAnswers = Array.isArray(activeQuestion.acceptedAnswers)
      ? activeQuestion.acceptedAnswers
      : [];
    const normalizedAcceptedAnswers = acceptedAnswers.map(normalizeJumbledAnswerText).filter(Boolean);
    const isCorrect = normalizedAcceptedAnswers.includes(normalizedSubmittedAnswer);

    setQuestionFeedback({
      isCorrect,
      selectedAnswer: submittedAnswer.toUpperCase(),
      correctAnswer: activeQuestion.answerLabel || normalizedAcceptedAnswers[0] || '',
    });

    if (isCorrect) {
      playCorrect();
      setAnsweredPairIds((previous) => (
        previous.includes(activePair.id) ? previous : [...previous, activePair.id]
      ));
      setPoints((value) => value + 1);
      setCoins((value) => value + 1);
      if (isTutorialLevel && tutorialStepIndex < 4) {
        setTutorialStepIndex(4);
        setTutorialCoachOpen(true);
      }
    } else {
      playWrong();
      setAnsweredPairIds((previous) => (
        previous.includes(activePair.id) ? previous : [...previous, activePair.id]
      ));
      setWrongQuestionAnswers((value) => value + 1);
      setQuestionAttemptsLeft((value) => Math.max(0, value - 1));
      advanceQuestionBankIndex(levelData, activePair.id, activeQuestionIndex, activeQuestionBank.length);
    }
  };

  const handleContinueFromQuestion = () => {
    if (!questionFeedback) {
      return;
    }

    setActivePairId('');
    setQuestionFeedback(null);
    setSelectedAnswerTileIds([]);
  };

  if (totalPairs === 0) {
    return (
      <div className="game-three-shell">
        <section className="game-three-empty-state">
          <AlertCircle className="h-6 w-6" />
          <div>
            <h3>No Cards Available</h3>
            <p>This level does not have any memory cards yet.</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={onBack || onExitRequest}>
            Back
          </button>
        </section>
      </div>
    );
  }

  return (
    <div
      ref={tutorialRootRef}
      className="game-three-shell"
      style={levelSurface ? {
        background: levelSurface,
        '--game-three-panel-surface': levelPanelColors?.[0],
        '--game-three-control-surface': levelPanelColors?.[1],
      } : undefined}
    >
      <div
        className={clsx(
          'game-three-layout',
          isLevelThreeLayout && 'game-three-layout-level-three',
          isLevelFourLayout && 'game-three-layout-level-four',
          isLevelFiveLayout && 'game-three-layout-level-five',
        )}
      >
        <section
          className={clsx(
            'game-three-board-panel',
            isLevelThreeLayout && 'game-three-board-panel-level-three',
            isLevelFourLayout && 'game-three-board-panel-level-four',
            isLevelFiveLayout && 'game-three-board-panel-level-five',
          )}
          style={levelBackground ? {
            backgroundImage: `url(${levelBackground})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
          } : undefined}
        >
          <div
            className={clsx(
              'game-three-board-shell',
              isLevelOneLayout && 'game-three-board-shell-level-one',
              isLevelThreeLayout && 'game-three-board-shell-level-three',
              isLevelFourLayout && 'game-three-board-shell-level-four',
              isLevelFiveLayout && 'game-three-board-shell-level-five',
            )}
            style={{
              '--game-three-mobile-board-aspect': `${responsiveColumns * 477} / ${responsiveRows * 625}`,
              ...(totalCards >= 16
                ? {
                    '--game-three-many-height': `${(responsiveRows * 249) + ((responsiveRows - 1) * 15) + 32}px`,
                  }
                : isLevelOneLayout
                  ? {}
                  : {
                    aspectRatio: `${responsiveColumns * 477} / ${responsiveRows * 625}`,
                  }),
            }}
          >
            <div className="game-three-board-wrap">
              <div
                className={clsx(
                  'game-three-board',
                  levelBackground && 'game-three-board-on-level-background',
                  isLevelOneLayout && 'game-three-board-level-one',
                  isLevelThreeLayout && 'game-three-board-level-three',
                  isLevelFourLayout && 'game-three-board-level-four',
                  isLevelFiveLayout && 'game-three-board-level-five',
                  totalCards >= 16 && 'game-three-board-many-cards',
                )}
                style={{
                  '--game-three-columns': String(responsiveColumns),
                  '--game-three-rows': String(responsiveRows),
                  '--game-three-mobile-board-aspect': `${responsiveColumns * 477} / ${responsiveRows * 625}`,
                  '--game-three-many-height': `${(responsiveRows * 249) + ((responsiveRows - 1) * 15) + 32}px`,
                }}
              >
                {deck.map((card, cardIndex) => {
                  const linkedCard = card.pairContent || card;
                  const isFaceUp = activeDemo ? activeDemo.revealed.includes(card.cardId) : isPreviewing
                    || matchedPairIdSet.has(card.pairId)
                    || selectedCardIdSet.has(card.cardId);
                  const isMatched = activeDemo ? activeDemo.matched.includes(card.pairId) : matchedPairIdSet.has(card.pairId);
                  const accentGlow = toRgba(linkedCard.accent, isMatched ? 0.28 : 0.22);

                  return (
                    <motion.button
                      key={card.cardId}
                      data-demo-card={cardIndex}
                      type="button"
                      className={clsx(
                        'game-three-card',
                        isFaceUp && 'game-three-card-flipped',
                        isMatched && 'game-three-card-matched',
                        (isPreviewing || isResolving || activePairId || isSubmitting || resultData) && 'game-three-card-disabled',
                      )}
                      style={{
                        '--game-three-card-glow': accentGlow,
                      }}
                      onClick={() => handleCardSelect(card)}
                      whileHover={isFaceUp || isSubmitting || resultData ? undefined : { y: -4, scale: 1.02 }}
                      whileTap={isFaceUp || isSubmitting || resultData ? undefined : { scale: 0.98 }}
                      aria-label={`Memory card ${linkedCard.label}`}
                    >
                      <GameThreeCardFaces
                        linkedCard={linkedCard}
                        accentGlow={accentGlow}
                        background={`linear-gradient(165deg, ${toRgba(linkedCard.accent, 0.95)} 0%, #0f172a 145%)`}
                      />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="game-three-board-footer">
            <span className="game-three-board-note">
              Flip two cards at a time. Matching pairs stay revealed and earn a star.
            </span>
            <span className="game-three-board-note">
              Flip attempts match the number of cards.
            </span>
          </div>
        </section>

        <aside className="game-three-side-panel">
          <button
            type="button"
            className="btn btn-secondary game-three-tutorial-button"
            onClick={() => {
              setGuideOpenedDuringGameplay(true);
              setShowHowToPlay(false);
              setShowGuide(true);
            }}
          >
            Guidelines
          </button>
          <button
            type="button"
            className="btn btn-secondary game-three-tutorial-button"
            onClick={onTutorialRequest}
          >
            Game Tutorial
          </button>

          <div className="game-three-side-card">
            <p className="student-mini-kicker">Progress</p>
            <div className="game-three-side-metrics">
              <span className="game-three-metric">
                <Sparkles className="h-4 w-4" />
                Pairs {matchedPairIds.length}/{totalPairs}
              </span>
              <span className="game-three-metric">
                <Trophy className="h-4 w-4" />
                Stars {points}
              </span>
              <span className="game-three-metric">
                <AlertCircle className="h-4 w-4" />
                Flip Attempts {flipAttemptsLeft}/{totalCards}
              </span>
            </div>
          </div>

          <div className="game-three-side-card">
            <p className="student-mini-kicker">Run State</p>
            <div className="game-three-side-status">
              {isPreviewing ? (
                <span className="game-three-status game-three-status-preview">
                  Memorize the board
                </span>
              ) : isResolving ? (
                <span className="game-three-status game-three-status-live">
                  Checking cards...
                </span>
              ) : (
                <span className="game-three-status game-three-status-neutral">
                  Find the next pair
                </span>
              )}
              <span className="game-three-side-copy">
                <Target className="h-4 w-4" />
                {`Moves ${moves} | Misses ${mismatches}`}
              </span>
            </div>
          </div>

          <div className="game-three-side-card">
            <p className="student-mini-kicker">Session</p>
            <div className="game-three-side-copy-stack">
              <span className="game-three-side-copy">Square board scales with the level size.</span>
              <span className="game-three-side-copy">Match all pairs to complete the board.</span>
            </div>
            <button type="button" className="btn btn-secondary" onClick={onExitRequest}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Back</span>
            </button>
          </div>
        </aside>
      </div>

      {shouldPauseForGuide && (
        <GameGuideOverlay
          kicker={guideContent.kicker}
          title={guideContent.title}
          lead={guideContent.lead}
          summary={guideContent.summary}
          sections={guideContent.sections}
          onExit={guideOpenedDuringGameplay ? () => {
            setGuideOpenedDuringGameplay(false);
            setShowGuide(false);
          } : onExitRequest}
          onStart={() => {
            if (guideOpenedDuringGameplay) {
              setGuideOpenedDuringGameplay(false);
              setShowGuide(false);
              return;
            }
            setShowGuide(false);
            setShowHowToPlay(continueToTutorialAfterGuide);
          }}
          startLabel={guideOpenedDuringGameplay ? 'Continue' : 'Next'}
          renderInPortal
        />
      )}

      {showHowToPlay && !resultData && !isSubmitting && (
        <GameThreeInteractiveTutorial
          onDemo={setTutorialDemo}
          rootRef={tutorialRootRef}
          deck={deck}
          background={levelBackground}
          flipBackMs={flipBackMs}
          isFirstPlay={continueToTutorialAfterGuide && !gameTutorialRequested}
          levelNumber={levelData?.levelNumber || 1}
          onExit={onExitRequest}
          onStart={handleReturnFromTutorial}
        />
      )}

      {(isTutorialLevel || (isFirstLevelGuide && !suppressIntroTutorial)) && shouldPauseForTutorialCoach && (
        <PlayableTutorialCoach
          kicker="Game Three Tutorial"
          steps={GAME_THREE_TUTORIAL_STEPS}
          stepIndex={tutorialStepIndex}
          stats={[
            { label: 'Pairs', value: `${matchedPairIds.length}/${totalPairs}` },
            { label: 'Stars', value: `${points}/${totalPairs}` },
            { label: 'Flip Meter', value: `${flipAttemptsLeft}/${totalCards} left` },
          ]}
          onContinue={handleContinueTutorialStep}
        />
      )}

      {renderScreenModal(
        <AnimatePresence>
          {activePair && (
            <motion.div
              className="game-three-question-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="game-three-question-card"
                initial={{ opacity: 0, scale: 0.78, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: 10 }}
                transition={{ duration: 0.22 }}
              >
                <div className="game-three-question-head">
                  <motion.div
                    className="game-three-question-pair"
                    initial={{ scale: 0.7, rotate: -8, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ duration: 0.24, delay: 0.05 }}
                    style={{
                      background: `linear-gradient(160deg, ${toRgba(activePair.accent, 0.96)} 0%, #0f172a 145%)`,
                      boxShadow: `0 18px 30px ${toRgba(activePair.accent, 0.22)}`,
                    }}
                  >
                    {activePairSpriteUrl && (
                      <span className="game-three-question-pair-art">
                        <img
                          src={activePairSpriteUrl}
                          alt={`${activePair.label} concept card`}
                          draggable={false}
                        />
                      </span>
                    )}
                    <span className="game-three-question-pair-title">{activePair.label}</span>
                  </motion.div>

                  <div className="game-three-question-copy">
                    <p className="student-mini-kicker">Pair matched</p>
                    <h3>Answer to earn 1 star</h3>
                    <p className="student-mini-kicker">
                      AI Question Bank {activeQuestionNumber}/{activeQuestionBank.length}
                    </p>
                    {activeQuestion?.questionType && (
                      <span className="game-three-question-type">
                        {activeQuestion.questionType}
                      </span>
                    )}
                    <p>{activeQuestion?.prompt}</p>
                  </div>
                </div>

                <form className="game-three-answer-form" onSubmit={handleQuestionSubmit}>
                  <div className="game-three-answer-label-row">
                    <span className="game-three-answer-label">Arrange the jumbled answer</span>
                    <button
                      type="button"
                      className="game-three-answer-clear"
                      onClick={handleClearAnswerTiles}
                      disabled={Boolean(questionFeedback || questionAttemptsLeft <= 0 || selectedAnswerTileIds.length === 0)}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="game-three-answer-slots" aria-label="Arranged answer">
                    {answerTiles.map((tile, index) => {
                      const selectedTileId = selectedAnswerTileIds[index];
                      const selectedTile = answerTiles.find((candidate) => candidate.id === selectedTileId);

                      return (
                        <button
                          key={`${tile.id}-slot-${index}`}
                          type="button"
                          className={clsx(
                            'game-three-answer-slot',
                            selectedTile && 'game-three-answer-slot-filled',
                          )}
                          onClick={() => selectedTile && handleRemoveAnswerTile(selectedTile.id)}
                          disabled={Boolean(!selectedTile || questionFeedback || questionAttemptsLeft <= 0)}
                        >
                          {selectedTile?.letter?.toUpperCase() || ''}
                        </button>
                      );
                    })}
                  </div>
                  <div className="game-three-jumble-bank" aria-label="Jumbled answer tiles">
                    {answerTiles.map((tile) => (
                      <button
                        key={tile.id}
                        type="button"
                        className="game-three-jumble-tile"
                        onClick={() => handleSelectAnswerTile(tile.id)}
                        disabled={Boolean(
                          questionFeedback
                          || questionAttemptsLeft <= 0
                          || selectedAnswerTileIdSet.has(tile.id),
                        )}
                      >
                        {tile.letter.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={Boolean(questionFeedback || questionAttemptsLeft <= 0 || !isAnswerComplete)}
                  >
                    Submit
                  </button>
                  {questionFeedback && (
                    <p
                      className={clsx(
                        'game-three-answer-feedback',
                        questionFeedback.isCorrect
                          ? 'game-three-answer-feedback-correct'
                          : 'game-three-answer-feedback-wrong',
                      )}
                    >
                      Your answer: <strong>{questionFeedback.selectedAnswer}</strong>
                      {!questionFeedback.isCorrect && questionFeedback.correctAnswer
                        ? (
                          <>
                            {' '} | Correct answer: <strong>{questionFeedback.correctAnswer}</strong>
                          </>
                        )
                        : null}
                    </p>
                  )}
                </form>

                <div className="game-three-question-footer">
                  {questionAttemptsLeft <= 0 && !questionFeedback?.isCorrect ? (
                    <div className="game-three-question-feedback-wrap">
                      <p className="game-three-question-feedback game-three-question-feedback-wrong">
                        <XCircle className="h-4 w-4" />
                        Wrong answer. No star for this pair; continue matching the other cards.
                      </p>
                    </div>
                  ) : questionFeedback ? (
                    <div className="game-three-question-feedback-wrap">
                      <p
                        className={clsx(
                          'game-three-question-feedback',
                          questionFeedback.isCorrect
                            ? 'game-three-question-feedback-correct'
                            : 'game-three-question-feedback-wrong',
                        )}
                      >
                        {questionFeedback.isCorrect ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Correct. You earned 1 star.
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" />
                            Wrong answer.{' '}
                            No star for this pair.
                          </>
                        )}
                      </p>

                      {questionFeedback.isCorrect && activeQuestion?.explanation && (
                        <p className="game-three-question-explanation">
                          {activeQuestion.explanation}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="game-three-question-hint">
                      Arrange the jumbled tiles. This question has {questionAttemptsLeft} attempt left.
                    </p>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleContinueFromQuestion}
                    disabled={!(questionFeedback?.isCorrect || questionAttemptsLeft <= 0)}
                  >
                    Continue
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
      )}

      {renderScreenModal(
        (isSubmitting || (resultData && !hideResultOverlay)) && (
          <div className="game-three-result-overlay">
            {isSubmitting ? (
              <div className="game-three-result-card">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
                <p className="text-lg font-black text-slate-900">Submitting Result...</p>
              </div>
            ) : (
              <div className="game-three-result-card">
                <div className="game-three-result-title">
                  {resultData?.result === 'COMPLETED' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-700" />
                  )}
                  <span>{resultData?.result === 'COMPLETED' ? 'Memory Run Complete' : 'Run Ended'}</span>
                </div>

                <div className="game-three-result-stats">
                  <span>Score: <strong>{summaryPoints}</strong></span>
                  <span>Pairs solved: <strong>{summaryPairs}</strong> / {totalPairs}</span>
                  <span>Moves used: <strong>{summaryMoves}</strong></span>
                  <span>Stars earned: <strong>{resultData?.starsEarned ?? 0}</strong></span>
                </div>

                <div className="game-three-result-actions">
                  <button type="button" className="btn btn-secondary" onClick={onRetry}>
                    <RotateCcw className="h-4 w-4" />
                    Retry
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={onBack}>
                    Back
                  </button>
                  {canAdvanceLevel && !isFinalLevel && (
                    <button type="button" className="btn btn-primary" onClick={onNextLevel}>
                      Next Level
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ),
      )}
    </div>
  );
};

export default GameCanvasGameThree;

