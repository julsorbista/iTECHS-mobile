const { isAiEnabled } = require('./aiControlService');

const DEFAULT_REQUEST_TIMEOUT_MS = 60000;
const MIN_REQUEST_TIMEOUT_MS = 10000;
const MAX_REQUEST_TIMEOUT_MS = 180000;
const MIN_OUTPUT_TOKENS = 1200;
const MAX_OUTPUT_TOKENS = 7000;
const OUTPUT_TEXT_PREVIEW_LIMIT = 220;
const DEFAULT_AI_PROVIDER = 'gemini';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';
const SUPPORTED_AI_PROVIDERS = new Set(['gemini', 'deepseek']);
const MAX_QUESTION_TEXT_LENGTH = 180;
const MAX_FORMATTED_QUESTION_LENGTH = 260;
const MAX_QUESTION_LEAD_LENGTH = 120;
const MAX_QUESTION_ASK_LENGTH = 140;
const MAX_QUESTION_CONTEXT_LINES = 4;
const MAX_QUESTION_CONTEXT_LINE_LENGTH = 84;
const MAX_CHOICE_TEXT_LENGTH = 90;
const MAX_OPEN_ANSWER_TEXT_LENGTH = 400;
const MAX_HINT_TEXT_LENGTH = 120;
const MAX_EXPLANATION_TEXT_LENGTH = 220;

const SINGLE_QUESTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    type: { type: 'STRING' },
    question: { type: 'STRING' },
    questionLead: { type: 'STRING' },
    questionContextLines: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    questionAsk: { type: 'STRING' },
    choices: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    answerIndex: { type: 'INTEGER' },
    answer: { type: 'STRING' },
    explanation: { type: 'STRING' },
    hints: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    difficulty: { type: 'STRING' },
  },
  required: ['type', 'question', 'answer', 'explanation', 'hints'],
};

const QUESTION_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: SINGLE_QUESTION_SCHEMA,
    },
  },
  required: ['questions'],
};

const STATUE_BATCH_QUESTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questionId: { type: 'STRING' },
    type: { type: 'STRING' },
    question: { type: 'STRING' },
    questionLead: { type: 'STRING' },
    questionContextLines: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    questionAsk: { type: 'STRING' },
    choices: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    answerIndex: { type: 'INTEGER' },
    answer: { type: 'STRING' },
    explanation: { type: 'STRING' },
    hints: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    difficulty: { type: 'STRING' },
  },
  required: ['questionId', 'type', 'question', 'answer', 'explanation', 'hints'],
};

const STATUE_BATCH_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: STATUE_BATCH_QUESTION_SCHEMA,
    },
  },
  required: ['questions'],
};

const PERFORMANCE_INSIGHT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    strengths: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    weaknesses: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    recommendedAction: { type: 'STRING' },
  },
  required: ['strengths', 'weaknesses', 'recommendedAction'],
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeAIProvider = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (SUPPORTED_AI_PROVIDERS.has(normalized)) {
    return normalized;
  }

  return DEFAULT_AI_PROVIDER;
};

const resolveAIProvider = () => normalizeAIProvider(
  process.env.AI_PROVIDER
  || process.env.LLM_PROVIDER
  || DEFAULT_AI_PROVIDER,
);

const resolveGeminiModel = () => (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();

const resolveDeepSeekModel = () => (process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL).trim();

const resolveDeepSeekUrl = () => {
  const rawUrl = String(process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1').trim();
  const normalizedBase = rawUrl.replace(/\/$/, '');

  if (normalizedBase.endsWith('/chat/completions')) {
    return normalizedBase;
  }

  return `${normalizedBase}/chat/completions`;
};

const resolveAIClientConfig = () => {
  const provider = resolveAIProvider();

  if (provider === 'deepseek') {
    const apiKey = String(
      process.env.DEEPSEEK_API_KEY
      || process.env.OPENAI_API_KEY
      || process.env.API_KEY
      || '',
    ).trim();

    if (!apiKey) {
      throw new Error('Missing DEEPSEEK_API_KEY (or API_KEY). Add it to Backend/.env.');
    }

    return {
      provider,
      providerLabel: 'DeepSeek',
      apiKey,
      model: resolveDeepSeekModel(),
      url: resolveDeepSeekUrl(),
    };
  }

  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY. Add it to Backend/.env.');
  }

  const configuredModel = resolveGeminiModel();
  const normalizedModel = configuredModel.startsWith('models/')
    ? configuredModel.slice('models/'.length)
    : configuredModel;

  const endpointRoot = (process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models').replace(/\/$/, '');

  return {
    provider,
    providerLabel: 'Gemini',
    apiKey,
    model: configuredModel,
    url: `${endpointRoot}/${encodeURIComponent(normalizedModel)}:generateContent?key=${encodeURIComponent(apiKey)}`,
  };
};

const resolveRequestTimeoutMs = () => {
  const parsed = Number.parseInt(process.env.GEMINI_REQUEST_TIMEOUT_MS || '', 10);
  if (!Number.isInteger(parsed)) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }

  return clampNumber(parsed, MIN_REQUEST_TIMEOUT_MS, MAX_REQUEST_TIMEOUT_MS);
};

const resolveMaxOutputTokens = (questionCount) => {
  const explicit = Number.parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '', 10);
  if (Number.isInteger(explicit)) {
    return clampNumber(explicit, MIN_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS);
  }

  const parsedCount = Number.parseInt(questionCount || 5, 10);
  const normalizedCount = Number.isInteger(parsedCount) ? parsedCount : 5;
  return clampNumber((normalizedCount * 420) + 1200, MIN_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS);
};

const escapeControlCharsInStrings = (rawText = '') => {
  let output = '';
  let inString = false;
  let isEscaped = false;

  for (let index = 0; index < rawText.length; index += 1) {
    const char = rawText[index];

    if (inString) {
      if (isEscaped) {
        output += char;
        isEscaped = false;
        continue;
      }

      if (char === '\\') {
        output += char;
        isEscaped = true;
        continue;
      }

      if (char === '"') {
        output += char;
        inString = false;
        continue;
      }

      if (char === '\n') {
        output += '\\n';
        continue;
      }

      if (char === '\r') {
        output += '\\r';
        continue;
      }

      if (char === '\t') {
        output += '\\t';
        continue;
      }

      output += char;
      continue;
    }

    if (char === '"') {
      inString = true;
    }

    output += char;
  }

  return output;
};

const parseJsonCandidate = (candidate = '') => {
  const rawCandidate = String(candidate || '').trim();
  if (!rawCandidate) {
    return null;
  }

  // Gemini sometimes adds trailing commas and literal control characters inside strings.
  const withoutTrailingCommas = rawCandidate.replace(/,\s*([}\]])/g, '$1');
  const escapedControlChars = escapeControlCharsInStrings(withoutTrailingCommas);

  const candidates = [rawCandidate, withoutTrailingCommas, escapedControlChars];

  for (const entry of candidates) {
    const parsed = safeJsonParse(entry);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
};

const extractBalancedObjectSlice = (text = '') => {
  let startIndex = -1;
  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (startIndex < 0) {
      if (char === '{') {
        startIndex = index;
        depth = 1;
      }
      continue;
    }

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === '\\') {
        isEscaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  return '';
};

const extractAllBalancedObjectSlices = (text = '') => {
  const slices = [];
  const stack = [];
  let inString = false;
  let isEscaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === '\\') {
        isEscaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      stack.push(index);
      continue;
    }

    if (char === '}' && stack.length > 0) {
      const startIndex = stack.pop();
      slices.push(text.slice(startIndex, index + 1));
    }
  }

  return slices;
};

const extractQuestionCandidatesFromText = (text = '') => {
  const candidates = [];

  extractAllBalancedObjectSlices(text).forEach((slice) => {
    const parsed = parseJsonCandidate(slice);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return;
    }

    if (Array.isArray(parsed.questions)) {
      parsed.questions.forEach((entry) => {
        candidates.push(entry);
      });
      return;
    }

    if (Object.prototype.hasOwnProperty.call(parsed, 'question') && Object.prototype.hasOwnProperty.call(parsed, 'choices')) {
      candidates.push(parsed);
    }
  });

  return candidates;
};

const extractJsonObject = (text = '') => {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/);
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  const balancedSlice = extractBalancedObjectSlice(text);

  const candidates = [
    text,
    fencedMatch?.[1] || '',
    balancedSlice,
    start >= 0 && end > start ? text.slice(start, end + 1) : '',
  ].filter(Boolean);

  for (const candidate of candidates) {
    const parsed = parseJsonCandidate(candidate);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && typeof parsed === 'object') {
      return parsed;
    }

    // Some responses are JSON strings containing an object payload.
    if (typeof parsed === 'string') {
      const parsedNested = parseJsonCandidate(parsed);
      if (Array.isArray(parsedNested)) {
        return parsedNested;
      }

      if (parsedNested && typeof parsedNested === 'object') {
        return parsedNested;
      }
    }
  }

  return null;
};

const normalizeDifficulty = (value = '') => {
  const parsed = String(value).trim().toLowerCase();
  if (parsed === 'easy' || parsed === 'medium' || parsed === 'hard') {
    return parsed;
  }

  return 'medium';
};

const toLineArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((line) => (typeof line === 'string' ? line.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
};

const cleanSentence = (value = '') => String(value || '').replace(/\s+/g, ' ').trim();
const normalizeComparableText = (value = '') => cleanSentence(value).toLowerCase();

const truncateText = (value = '', maxLength = 180) => {
  const source = String(value || '').trim();
  if (!source || source.length <= maxLength) {
    return source;
  }

  const safeLength = Math.max(1, maxLength - 3);
  return `${source.slice(0, safeLength).trimEnd()}...`;
};

const truncateLineArray = (value = [], maxLines = 4, maxLineLength = 84) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, maxLines)
    .map((line) => truncateText(line, maxLineLength))
    .filter(Boolean);
};

const autoFormatQuestionText = (value = '') => {
  const source = cleanSentence(value);
  if (!source) {
    return '';
  }

  const hasCodeLikeTokens = /\b(FOR|IF|ELSE|WHILE|RETURN|FUNCTION|THEN)\b/.test(source) || source.includes('=');
  if (!hasCodeLikeTokens) {
    return source;
  }

  let formatted = source;

  formatted = formatted.replace(/\s+(FOR|IF|ELSE IF|ELSE|WHILE|RETURN|FUNCTION|THEN)\b/g, '\n$1');
  formatted = formatted.replace(/:\s+(?=[A-Za-z0-9])/g, ':\n');
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  return formatted.trim();
};

const buildFormattedQuestion = ({
  question,
  questionLead,
  questionContextLines,
  questionAsk,
}) => {
  const lead = truncateText(cleanSentence(questionLead), MAX_QUESTION_LEAD_LENGTH);
  const askRaw = truncateText(cleanSentence(questionAsk), MAX_QUESTION_ASK_LENGTH);
  const ask = askRaw && !askRaw.endsWith('?') ? `${askRaw}?` : askRaw;
  const contextLines = truncateLineArray(
    toLineArray(questionContextLines),
    MAX_QUESTION_CONTEXT_LINES,
    MAX_QUESTION_CONTEXT_LINE_LENGTH,
  );

  if (lead || contextLines.length > 0 || ask) {
    const segments = [];
    if (lead) {
      segments.push(lead);
    }

    if (contextLines.length > 0) {
      segments.push(contextLines.join('\n'));
    }

    if (ask) {
      segments.push(ask);
    }

    return {
      formattedQuestion: truncateText(segments.join('\n\n').trim(), MAX_FORMATTED_QUESTION_LENGTH),
      questionDisplay: {
        lead,
        contextLines,
        ask,
      },
    };
  }

  return {
    formattedQuestion: truncateText(autoFormatQuestionText(question), MAX_FORMATTED_QUESTION_LENGTH),
    questionDisplay: {
      lead: '',
      contextLines: [],
      ask: '',
    },
  };
};

const normalizeHints = (candidateHints, questionText) => {
  const providedHints = Array.isArray(candidateHints)
    ? candidateHints
      .map((hint) => (typeof hint === 'string' ? hint.trim() : ''))
      .filter(Boolean)
      .slice(0, 2)
    : [];

  const hasCodeLikeContext = /\b(FOR|IF|ELSE|WHILE|RETURN|FUNCTION|THEN)\b/.test(questionText || '') || String(questionText || '').includes('=');
  const fallbackHints = hasCodeLikeContext
    ? [
      'Track the variable value after each step.',
      'Check the condition result for each loop iteration.',
    ]
    : [
      'Focus on the key concept asked in the question.',
      'Eliminate clearly incorrect choices first.',
    ];

  const merged = [...providedHints];
  for (const hint of fallbackHints) {
    if (merged.length >= 2) {
      break;
    }

    if (!merged.includes(hint)) {
      merged.push(hint);
    }
  }

  return merged
    .slice(0, 2)
    .map((hint) => truncateText(hint, MAX_HINT_TEXT_LENGTH))
    .filter(Boolean);
};

const sanitizeQuestionPayload = (payload, fallback) => {
  const type = normalizeGeneratedQuestionType(payload?.type || payload?.questionType, fallback?.questionType);
  const questionRaw = typeof payload?.question === 'string' ? payload.question.trim() : '';
  const question = truncateText(questionRaw, MAX_QUESTION_TEXT_LENGTH);
  const expectedChoicesCount = Math.max(2, Math.min(6, Number.parseInt(fallback?.choicesCount, 10) || 4));
  const rawChoices = Array.isArray(payload?.choices)
    ? payload.choices
      .map((choice) => truncateText(typeof choice === 'string' ? choice.trim() : '', MAX_CHOICE_TEXT_LENGTH))
      .filter(Boolean)
      .filter((choice, index, collection) => collection.findIndex((candidate) => candidate.toLowerCase() === choice.toLowerCase()) === index)
    : [];
  const choices = type === 'true_false'
    ? ['True', 'False']
    : rawChoices;

  let answerIndex = Number.isInteger(payload?.answerIndex) ? payload.answerIndex : -1;
  const answerText = truncateText(
    typeof payload?.answer === 'string'
      ? payload.answer.trim()
      : typeof payload?.correctAnswer === 'string'
        ? payload.correctAnswer.trim()
        : '',
    type === 'multiple_choice' || type === 'true_false'
      ? MAX_CHOICE_TEXT_LENGTH
      : MAX_OPEN_ANSWER_TEXT_LENGTH,
  );

  if (type === 'true_false') {
    if (answerText.toLowerCase() === 'false') {
      answerIndex = 1;
    } else if (answerText.toLowerCase() === 'true') {
      answerIndex = 0;
    }
  } else if (answerIndex < 0 || answerIndex >= choices.length) {
    if (answerText) {
      const matchedIndex = choices.findIndex((choice) => choice.toLowerCase() === answerText.toLowerCase());
      answerIndex = matchedIndex;
    }
  }

  const explanation = truncateText(
    typeof payload?.explanation === 'string' ? payload.explanation.trim() : '',
    MAX_EXPLANATION_TEXT_LENGTH,
  );

  if (!question) {
    throw new Error('Gemini returned an invalid question format. Please try again with a clearer prompt.');
  }

  if (type === 'multiple_choice') {
    if (choices.length !== expectedChoicesCount || answerIndex < 0 || answerIndex >= choices.length) {
      throw new Error('Gemini returned an invalid question format. Please try again with a clearer prompt.');
    }
  } else if (type === 'true_false') {
    if (answerIndex !== 0 && answerIndex !== 1) {
      throw new Error('Gemini returned an invalid question format. Please try again with a clearer prompt.');
    }
  } else if (!answerText) {
    throw new Error('Gemini returned an invalid question format. Please try again with a clearer prompt.');
  }

  const questionParts = buildFormattedQuestion({
    question,
    questionLead: payload?.questionLead,
    questionContextLines: payload?.questionContextLines,
    questionAsk: payload?.questionAsk,
  });

  const formattedQuestion = truncateText(questionParts.formattedQuestion || question, MAX_FORMATTED_QUESTION_LENGTH);
  const hints = normalizeHints(payload?.hints, formattedQuestion || question);

  return {
    type,
    question,
    formattedQuestion,
    questionDisplay: questionParts.questionDisplay,
    choices: type === 'multiple_choice' || type === 'true_false' ? choices : [],
    answerIndex: type === 'multiple_choice' || type === 'true_false' ? answerIndex : null,
    correctAnswer: type === 'multiple_choice' || type === 'true_false' ? choices[answerIndex] : answerText,
    explanation: explanation || 'No explanation provided by Gemini.',
    hints,
    meta: {
      topic: fallback.topic,
      difficulty: normalizeDifficulty(payload?.difficulty || fallback.difficulty),
      gradeLevel: fallback.gradeLevel || null,
      questionType: type,
      language: fallback.language,
      choicesCount: expectedChoicesCount,
    },
  };
};

const GAME_HINT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    hint: { type: 'STRING' },
  },
  required: ['hint'],
};

const GAME_FIVE_WORDS_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          word: { type: 'STRING' },
          clue: { type: 'STRING' },
        },
        required: ['word', 'clue'],
      },
    },
  },
  required: ['questions'],
};

const GAME_TWO_TASKS_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    tasks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          prompt: { type: 'STRING' },
          codeContext: { type: 'STRING' },
          choices: { type: 'ARRAY', items: { type: 'STRING' } },
          correctChoiceIndex: { type: 'INTEGER' },
          hints: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['title', 'prompt', 'codeContext', 'choices', 'correctChoiceIndex', 'hints'],
      },
    },
  },
  required: ['tasks'],
};

const GAME_TWO_TASK_VERIFICATION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reviews: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          taskIndex: { type: 'INTEGER' },
          valid: { type: 'BOOLEAN' },
          correctChoiceIndex: { type: 'INTEGER' },
          validChoiceCount: { type: 'INTEGER' },
          reason: { type: 'STRING' },
        },
        required: ['taskIndex', 'valid', 'correctChoiceIndex', 'validChoiceCount', 'reason'],
      },
    },
  },
  required: ['reviews'],
};

const normalizeGeneratedQuestionType = (value = '', fallback = 'multiple-choice') => {
  const normalized = String(value || fallback || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'essay') {
    return 'identification';
  }
  if (['multiple_choice', 'true_false', 'identification'].includes(normalized)) {
    return normalized;
  }

  return 'multiple_choice';
};

const normalizeQuestionBatch = (payload, fallback) => {
  const rawQuestions = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.questions)
      ? payload.questions
      : payload && typeof payload === 'object'
        ? [payload]
        : [];

  const normalizedQuestions = [];

  for (const candidate of rawQuestions) {
    try {
      const normalized = sanitizeQuestionPayload(candidate, fallback);
      normalizedQuestions.push(normalized);
    } catch {
      // Skip malformed entries and keep valid ones.
    }
  }

  if (normalizedQuestions.length === 0) {
    throw new Error('Gemini returned no valid questions.');
  }

  return distributeCorrectAnswerPositions(normalizedQuestions, fallback?.choicesCount || 4);
};

const normalizeQuestionsFromText = (text, fallback) => {
  const candidates = extractQuestionCandidatesFromText(text);
  const normalizedQuestions = [];
  const seenQuestionKeys = new Set();

  for (const candidate of candidates) {
    try {
      const normalized = sanitizeQuestionPayload(candidate, fallback);
      const key = normalized.question.toLowerCase();
      if (seenQuestionKeys.has(key)) {
        continue;
      }

      seenQuestionKeys.add(key);
      normalizedQuestions.push(normalized);
    } catch {
      // Ignore malformed partial question candidates.
    }
  }

  return distributeCorrectAnswerPositions(normalizedQuestions, fallback?.choicesCount || 4);
};

const repositionCorrectAnswer = (question = {}, targetIndex = 0) => {
  const choices = Array.isArray(question.choices) ? [...question.choices] : [];
  const currentIndex = Number.isInteger(question.answerIndex) ? question.answerIndex : -1;

  if (choices.length < 2 || currentIndex < 0 || currentIndex >= choices.length) {
    return question;
  }

  const safeTargetIndex = Math.max(0, Math.min(choices.length - 1, targetIndex));
  if (safeTargetIndex === currentIndex) {
    return question;
  }

  const [correctChoice] = choices.splice(currentIndex, 1);
  choices.splice(safeTargetIndex, 0, correctChoice);

  return {
    ...question,
    choices,
    answerIndex: safeTargetIndex,
    correctAnswer: correctChoice,
  };
};

const distributeCorrectAnswerPositions = (questions = [], expectedChoicesCount = 4) => {
  const safeChoicesCount = Math.max(2, Math.min(6, Number.parseInt(expectedChoicesCount, 10) || 4));

  return questions.map((question, index) => {
    const targetIndex = index % safeChoicesCount;
    return repositionCorrectAnswer(question, targetIndex);
  });
};

const FALLBACK_AI_MODEL = 'ai-disabled-fallback';

const buildFallbackTopicLabel = (topic = '', fallback = 'the lesson') => {
  const cleaned = truncateText(cleanSentence(topic), 72);
  return cleaned || fallback;
};

const buildFallbackChoices = (topic, choicesCount = 4) => {
  const safeTopic = buildFallbackTopicLabel(topic);
  const baseChoices = [
    `The main idea of ${safeTopic}`,
    `A detail that does not match ${safeTopic}`,
    `An unrelated classroom example`,
    `A distractor with incorrect context`,
    `Another off-topic option`,
    `A second incorrect example`,
  ];

  const normalizedChoices = baseChoices.slice(0, Math.max(2, Math.min(6, choicesCount)));
  while (normalizedChoices.length < Math.max(2, Math.min(6, choicesCount))) {
    normalizedChoices.push(`Extra distractor ${normalizedChoices.length}`);
  }

  return normalizedChoices;
};

const buildFallbackQuestionItem = (fallbackMeta = {}, index = 0, choicesCount = 4, explicitType = '') => {
  const type = normalizeGeneratedQuestionType(explicitType || fallbackMeta.questionType, 'multiple_choice');
  const topicLabel = buildFallbackTopicLabel(fallbackMeta.topic);
  const basePayload = {
    explanation: 'AI is disabled right now, so this placeholder question is using default testing content.',
    difficulty: fallbackMeta.difficulty || 'medium',
  };

  if (type === 'true_false') {
    return sanitizeQuestionPayload({
      ...basePayload,
      type,
      question: `Practice ${index + 1}: ${topicLabel} is part of this lesson.`,
      questionLead: `Practice question ${index + 1}.`,
      questionAsk: `True or False: ${topicLabel} is part of this lesson?`,
      choices: ['True', 'False'],
      answerIndex: 0,
      answer: 'True',
      hints: [
        `Recall the lesson idea connected to ${topicLabel}.`,
        'Decide whether the statement is supported by the lesson.',
      ],
    }, {
      topic: fallbackMeta.topic || '',
      difficulty: fallbackMeta.difficulty || 'medium',
      gradeLevel: fallbackMeta.gradeLevel || '',
      questionType: type,
      language: fallbackMeta.language || 'English',
      choicesCount,
    });
  }

  if (type === 'identification') {
    return sanitizeQuestionPayload({
      ...basePayload,
      type,
      question: `Practice ${index + 1}: Identify one key idea from ${topicLabel}.`,
      questionLead: `Practice question ${index + 1}.`,
      questionAsk: `What key idea should a learner identify from ${topicLabel}?`,
      choices: [],
      answer: `${topicLabel} main idea`,
      hints: [
        `Think of a core term or label from ${topicLabel}.`,
        'Use a short direct answer.',
      ],
    }, {
      topic: fallbackMeta.topic || '',
      difficulty: fallbackMeta.difficulty || 'medium',
      gradeLevel: fallbackMeta.gradeLevel || '',
      questionType: type,
      language: fallbackMeta.language || 'English',
      choicesCount,
    });
  }

  return sanitizeQuestionPayload({
    ...basePayload,
    type: 'multiple_choice',
    question: `Practice ${index + 1}: Which option best matches ${topicLabel}?`,
    questionLead: `Practice question ${index + 1}.`,
    questionAsk: `Which option best matches ${topicLabel}?`,
    choices: buildFallbackChoices(fallbackMeta.topic, choicesCount),
    answerIndex: 0,
    answer: buildFallbackChoices(fallbackMeta.topic, choicesCount)[0],
    hints: [
      `Focus on the main idea of ${topicLabel}.`,
      'Choose the option that most directly fits the prompt.',
    ],
  }, {
  topic: fallbackMeta.topic || '',
  difficulty: fallbackMeta.difficulty || 'medium',
  gradeLevel: fallbackMeta.gradeLevel || '',
  questionType: 'multiple_choice',
  language: fallbackMeta.language || 'English',
  choicesCount,
  });
};

const buildFallbackQuestionBatch = ({
  topic = '',
  difficulty = 'medium',
  gradeLevel = '',
  questionType = 'multiple-choice',
  language = 'English',
  choicesCount = 4,
  questionCount = 5,
} = {}) => {
  const safeQuestionCount = Math.max(1, Math.min(20, Number.parseInt(questionCount, 10) || 1));
  const safeChoicesCount = Math.max(2, Math.min(6, Number.parseInt(choicesCount, 10) || 4));
  const requestedQuestionType = String(questionType || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const normalizedQuestionType = requestedQuestionType === 'mixed'
    ? 'mixed'
    : normalizeGeneratedQuestionType(questionType, 'multiple_choice');
  const typePlan = normalizedQuestionType === 'mixed'
    ? Array.from({ length: safeQuestionCount }, (_, index) => (
      ['multiple_choice', 'true_false', 'identification'][index % 3]
    ))
    : Array.from({ length: safeQuestionCount }, () => normalizedQuestionType);

  return typePlan.map((type, index) => {
    const question = buildFallbackQuestionItem({
      topic,
      difficulty,
      gradeLevel,
      questionType: type,
      language,
    }, index, safeChoicesCount, type);

    return type === 'multiple_choice'
      ? repositionCorrectAnswer(question, index % safeChoicesCount)
      : question;
  });
};

const buildFallbackStatueQuestions = (statues = []) => {
  const questionsById = {};

  statues.forEach((statue, index) => {
    const questionId = normalizeStatueQuestionId(statue?.questionId);
    if (!questionId || questionsById[questionId]) {
      return;
    }

    questionsById[questionId] = {
      ...buildFallbackQuestionItem({
        topic: statue?.topic || `statue challenge ${index + 1}`,
        difficulty: statue?.difficulty || 'medium',
        gradeLevel: statue?.gradeLevel || '',
        questionType: 'multiple-choice',
        language: statue?.language || 'English',
      }, index, statue?.choicesCount || 4),
      questionId,
    };
  });

  return questionsById;
};

const buildFallbackPerformanceInsight = ({ sourceSnapshot = {} } = {}) => {
  const totalCompleted = Number(sourceSnapshot?.summary?.totalLevelsCompleted || 0);
  const totalStars = Number(sourceSnapshot?.summary?.totalStars || 0);
  const recentAttempts = Array.isArray(sourceSnapshot?.timeline) ? sourceSnapshot.timeline.length : 0;

  return normalizePerformanceInsightPayload({
    strengths: [
      recentAttempts > 0
        ? `Recent attempts (${recentAttempts}) are available for manual review while AI is off.`
        : 'Dashboard progress data is still available for manual review while AI is off.',
      totalCompleted > 0
        ? `The student has completed ${totalCompleted} level${totalCompleted === 1 ? '' : 's'} so far.`
        : 'Level completion can still be tracked without live AI summaries.',
      totalStars > 0
        ? `Star totals remain visible with ${totalStars} star${totalStars === 1 ? '' : 's'} earned.`
        : 'Star totals remain available as a quick testing signal.',
    ],
    weaknesses: [
      'AI insight generation is disabled, so this summary is using default fallback notes.',
      recentAttempts > 0
        ? 'Use the recent attempt list to confirm where extra support is needed.'
        : 'More attempts are needed before stronger patterns can be observed.',
      totalCompleted > 0
        ? 'Review low-star or recently failed levels manually while testing.'
        : 'The student still needs cleared levels before deeper trend analysis is possible.',
    ],
    recommendedAction: 'AI insights are off. Review the recent timeline, stars, and level completions manually while testing.',
  });
};

const normalizeStatueQuestionId = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, 80);
};

const normalizeStatueBatchPayload = (payload, fallbackByQuestionId = new Map()) => {
  const rawQuestions = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.questions)
      ? payload.questions
      : payload && typeof payload === 'object'
        ? [payload]
        : [];

  const normalizedByQuestionId = new Map();

  for (const candidate of rawQuestions) {
    const questionId = normalizeStatueQuestionId(candidate?.questionId);
    if (!questionId || normalizedByQuestionId.has(questionId) || !fallbackByQuestionId.has(questionId)) {
      continue;
    }

    try {
      const normalized = sanitizeQuestionPayload(candidate, fallbackByQuestionId.get(questionId));
      normalizedByQuestionId.set(questionId, {
        ...normalized,
        questionId,
      });
    } catch {
      // Skip malformed entries and keep valid ones.
    }
  }

  return normalizedByQuestionId;
};

const normalizeStatueBatchFromText = (text, fallbackByQuestionId = new Map()) => {
  const candidates = extractQuestionCandidatesFromText(text);
  const normalizedByQuestionId = new Map();

  for (const candidate of candidates) {
    const questionId = normalizeStatueQuestionId(candidate?.questionId);
    if (!questionId || normalizedByQuestionId.has(questionId) || !fallbackByQuestionId.has(questionId)) {
      continue;
    }

    try {
      const normalized = sanitizeQuestionPayload(candidate, fallbackByQuestionId.get(questionId));
      normalizedByQuestionId.set(questionId, {
        ...normalized,
        questionId,
      });
    } catch {
      // Skip malformed entries and keep valid ones.
    }
  }

  return normalizedByQuestionId;
};

const mergeStatueQuestionMaps = (baseMap = new Map(), incomingMap = new Map(), orderedQuestionIds = []) => {
  const merged = new Map(baseMap);

  for (const questionId of orderedQuestionIds) {
    if (merged.has(questionId) || !incomingMap.has(questionId)) {
      continue;
    }

    merged.set(questionId, incomingMap.get(questionId));
  }

  return merged;
};

const mergeUniqueQuestions = (baseQuestions = [], incomingQuestions = [], limit = Infinity) => {
  const merged = [...baseQuestions];
  const seenKeys = new Set(
    baseQuestions
      .map((question) => String(question?.question || '').trim().toLowerCase())
      .filter(Boolean),
  );

  for (const question of incomingQuestions) {
    if (merged.length >= limit) {
      break;
    }

    const key = String(question?.question || '').trim().toLowerCase();
    if (!key || seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    merged.push(question);
  }

  return merged.slice(0, limit);
};

const getQuestionChoiceSetKey = (question = {}) => (
  (Array.isArray(question?.choices) ? question.choices : [])
    .map((choice) => normalizeComparableText(choice))
    .filter(Boolean)
    .sort()
    .join('|')
);

const getQuestionAnswerKey = (question = {}) => normalizeComparableText(question?.correctAnswer || '');

const getQuestionCoverageKey = (question = {}) => {
  const display = question?.questionDisplay || {};
  const keySource = [
    display.lead,
    ...(Array.isArray(display.contextLines) ? display.contextLines : []),
    display.ask,
    question?.question,
  ]
    .map((entry) => normalizeComparableText(entry))
    .filter(Boolean)
    .join(' ');

  return keySource
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .slice(0, 10)
    .join(' ');
};

const buildQuestionBatchExclusions = (questions = []) => ({
  questionLines: questions
    .map((question, index) => {
      const prompt = cleanSentence(question?.question || '');
      return prompt ? `${index + 1}. ${prompt}` : '';
    })
    .filter(Boolean),
  answerLines: questions
    .map((question, index) => {
      const answer = cleanSentence(question?.correctAnswer || '');
      return answer ? `${index + 1}. ${answer}` : '';
    })
    .filter(Boolean),
  choiceSetLines: questions
    .map((question, index) => {
      const choices = Array.isArray(question?.choices)
        ? question.choices.map((choice) => cleanSentence(choice)).filter(Boolean)
        : [];
      return choices.length > 0 ? `${index + 1}. ${choices.join(' | ')}` : '';
    })
    .filter(Boolean),
});

const selectDiverseQuestionBatch = (questions = [], limit = Infinity) => {
  const uniqueByQuestion = [];
  const seenQuestionKeys = new Set();

  for (const question of questions) {
    const questionKey = normalizeComparableText(question?.question || '');
    if (!questionKey || seenQuestionKeys.has(questionKey)) {
      continue;
    }

    seenQuestionKeys.add(questionKey);
    uniqueByQuestion.push(question);
  }

  const selected = [];
  const usedChoiceSets = new Set();
  const usedAnswers = new Set();
  const usedCoverage = new Set();

  for (const question of uniqueByQuestion) {
    if (selected.length >= limit) {
      break;
    }

    const choiceSetKey = getQuestionChoiceSetKey(question);
    const answerKey = getQuestionAnswerKey(question);
    const coverageKey = getQuestionCoverageKey(question);

    if ((choiceSetKey && usedChoiceSets.has(choiceSetKey)) || (answerKey && usedAnswers.has(answerKey)) || (coverageKey && usedCoverage.has(coverageKey))) {
      continue;
    }

    selected.push(question);
    if (choiceSetKey) {
      usedChoiceSets.add(choiceSetKey);
    }
    if (answerKey) {
      usedAnswers.add(answerKey);
    }
    if (coverageKey) {
      usedCoverage.add(coverageKey);
    }
  }

  for (const question of uniqueByQuestion) {
    if (selected.length >= limit) {
      break;
    }

    const questionKey = normalizeComparableText(question?.question || '');
    if (!questionKey || selected.some((entry) => normalizeComparableText(entry?.question || '') === questionKey)) {
      continue;
    }

    const choiceSetKey = getQuestionChoiceSetKey(question);
    if (choiceSetKey && usedChoiceSets.has(choiceSetKey)) {
      continue;
    }

    selected.push(question);
    if (choiceSetKey) {
      usedChoiceSets.add(choiceSetKey);
    }
  }

  for (const question of uniqueByQuestion) {
    if (selected.length >= limit) {
      break;
    }

    const questionKey = normalizeComparableText(question?.question || '');
    if (!questionKey || selected.some((entry) => normalizeComparableText(entry?.question || '') === questionKey)) {
      continue;
    }

    selected.push(question);
  }

  return selected.slice(0, limit);
};

const buildPrompt = ({
  topic,
  difficulty,
  gradeLevel,
  questionType,
  language,
  instructions,
  choicesCount,
  questionCount,
}) => {
  const optionalGrade = gradeLevel ? `Target grade level: ${gradeLevel}.` : '';
  const optionalInstructions = instructions ? `Extra instructions: ${instructions}` : '';

  return [
    'You are creating clean classroom-ready assessment questions for an educational module.',
    `Create exactly ${questionCount} ${questionType} questions about: ${topic}.`,
    `Each question must be short, clear, and understandable (keep the displayed prompt concise).`,
    `Difficulty: ${difficulty}.`,
    optionalGrade,
    `Language: ${language}.`,
    `For multiple_choice questions, return exactly ${choicesCount} answer choices.`,
    optionalInstructions,
    'Return strict JSON only using this schema:',
    '{',
    '  "questions": [',
    '    {',
    '      "type": "multiple_choice|true_false|identification",',
    '      "question": "string",',
    '      "questionLead": "string",',
    '      "questionContextLines": ["string", "..."],',
    '      "questionAsk": "string",',
    '      "choices": ["string", "string", "..."],',
    '      "answerIndex": 0,',
    '      "answer": "string",',
    '      "explanation": "string",',
    '      "hints": ["string", "string"],',
    '      "difficulty": "easy|medium|hard"',
    '    }',
    '  ]',
    '}',
    'Formatting rules:',
    '- questionLead: short context sentence with minimal filler words.',
    '- questionContextLines: one logical step per line.',
    '- If code or pseudocode is used, put code only in questionContextLines.',
    '- questionAsk: one final explicit question ending with ?.',
    '- question: full human-readable version using line breaks between lead, context block, and ask.',
    '- type must be one of: multiple_choice, true_false, identification.',
    '- When asked for mixed questions, do not make every question multiple_choice if the lesson supports other formats.',
    '- Use true_false for short fact checks and identification for direct recall, definitions, or labels.',
    '- For multiple_choice questions: provide exactly the requested number of choices, set answerIndex, and set answer to the correct choice text.',
    '- For true_false questions: set choices to ["True","False"], set answerIndex to 0 or 1, and set answer to "True" or "False".',
    '- For identification questions: set choices to [], omit answerIndex or set it to -1, and set answer to the exact correct response.',
    '- hints must contain exactly 2 short hints per question.',
    '- Keep choices concise and avoid long paragraphs.',
    '- Make the wrong choices plausible and closely related to the same topic so the question feels challenging.',
    '- Prefer choices that describe behaviors, examples, use cases, definitions, code effects, or outcomes related to the topic.',
    '- Do not rely on sibling lesson titles or nearby concept labels as the default distractors.',
    '- When generating multiple questions, spread coverage across different concepts, sections, examples, or images whenever the source material allows.',
    '- Do not repeat the same question idea, wording, correct answer, or answer-choice set across the batch.',
    '- If the topic is a named programming concept, avoid one-word answer choices that are just other concept names unless the question explicitly asks to compare them.',
    '- Every question must have its own distinct choice set. Do not recycle the same list of concept words across questions in the batch.',
    '- Avoid duplicate question prompts and avoid repeating the same correct answer or answer guide across the batch when the lesson provides enough variety.',
    '- Exactly one answer choice must be correct; the remaining choices must be incorrect.',
    'Do not wrap the JSON in markdown fences and do not include additional keys.',
    'Do not add any prose before or after the JSON object.',
  ]
    .filter(Boolean)
    .join('\n');
};

const buildStatueBatchPrompt = ({ statues = [] }) => {
  const normalizedStatues = Array.isArray(statues) ? statues : [];

  const statueLines = normalizedStatues.map((statue, index) => [
    `Statue ${index + 1}:`,
    `- questionId: ${statue.questionId}`,
    `- topic: ${statue.topic}`,
    `- choicesCount: ${statue.choicesCount}`,
    `- difficulty: ${statue.difficulty}`,
    `- language: ${statue.language}`,
    `- gradeLevel: ${statue.gradeLevel || '(none)'}`,
    `- extraInstructions: ${statue.instructions || '(none)'}`,
  ].join('\n'));

  return [
    'You are creating classroom-ready multiple-choice questions for game statues.',
    `Generate exactly ${normalizedStatues.length} questions, one per statue specification below.`,
    'Each output question must keep the same questionId from the input.',
    'Return strict JSON only using this schema:',
    '{',
    '  "questions": [',
    '    {',
    '      "questionId": "string",',
    '      "question": "string",',
    '      "questionLead": "string",',
    '      "questionContextLines": ["string", "..."],',
    '      "questionAsk": "string",',
    '      "choices": ["string", "string", "..."],',
    '      "answerIndex": 0,',
    '      "explanation": "string",',
    '      "hints": ["string", "string"],',
    '      "difficulty": "easy|medium|hard"',
    '    }',
    '  ]',
    '}',
    'Rules:',
    '- Use each questionId exactly once.',
    '- choices length must match choicesCount for that statue.',
    '- hints must contain exactly 2 short hints per question.',
    '- Keep question text concise and classroom-appropriate.',
    '- Make the wrong choices plausible and closely related to the same topic so the statue question feels challenging.',
    '- Prefer choices that describe behaviors, examples, use cases, definitions, code effects, or outcomes related to the topic.',
    '- Do not rely on sibling lesson titles or nearby concept labels as the default distractors.',
    '- If the topic is a named programming concept, avoid one-word answer choices that are just other concept names unless the question explicitly asks to compare them.',
    '- Use a distinct answer-choice set for each statue. Do not recycle the same list of concept words across different questions.',
    '- Exactly one answer choice must be correct; the remaining choices must be incorrect.',
    '- Do not wrap JSON in markdown.',
    '- Do not output extra keys or extra prose.',
    '',
    'Statue specifications:',
    ...statueLines,
  ].join('\n');
};

const buildPerformanceInsightPrompt = ({ sourceSnapshot = {} } = {}) => [
  'You are helping a teacher interpret one student\'s educational game performance.',
  'Use only the source data below. Do not invent personal details or unsupported diagnoses.',
  'Return strict JSON only using this exact schema:',
  '{',
  '  "strengths": ["string", "string", "string"],',
  '  "weaknesses": ["string", "string", "string"],',
  '  "recommendedAction": "string"',
  '}',
  'Rules:',
  '- strengths must contain exactly 3 concise classroom observations.',
  '- weaknesses must contain exactly 3 concise, constructive focus areas.',
  '- recommendedAction must be one practical next step for the teacher, under 260 characters.',
  '- Keep the tone professional, specific, and useful for a teacher dashboard.',
  '- Do not wrap JSON in markdown. Do not add extra keys or extra prose.',
  '',
  'Source data:',
  JSON.stringify(sourceSnapshot, null, 2),
].join('\n');

const normalizeInsightList = (value, fallbackItems = []) => {
  const items = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? value.split(/\n|;/) : []);

  const normalized = items
    .map((item) => String(item || '').replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .map((item) => item.slice(0, 220))
    .slice(0, 3);

  fallbackItems.forEach((item) => {
    if (normalized.length < 3) {
      normalized.push(item);
    }
  });

  return normalized.slice(0, 3);
};

const normalizePerformanceInsightPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('AI returned an invalid performance insight format.');
  }

  const strengths = normalizeInsightList(payload.strengths, [
    'The student has enough recorded activity to begin identifying learning patterns.',
    'Completed work and attempts give the teacher a useful progress baseline.',
    'Recent game records can guide focused classroom support.',
  ]);
  const weaknesses = normalizeInsightList(payload.weaknesses, [
    'Continue collecting attempts to confirm which skills need the most support.',
    'Review missed or low-score levels for recurring misconceptions.',
    'Use short follow-up practice before moving to harder content.',
  ]);
  const recommendedAction = String(payload.recommendedAction || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 320)
    || 'Review the most recent attempts with the student and assign one focused replay target before the next lesson.';

  return {
    strengths,
    weaknesses,
    recommendedAction,
  };
};

const shouldRetryWithoutSchema = (errorMessage = '') => {
  const normalized = String(errorMessage).toLowerCase();
  return normalized.includes('responseschema')
    || normalized.includes('unknown name "responseschema"')
    || normalized.includes('cannot find field "responseschema"');
};

const isRetryableGeminiError = (error) => {
  const statusCode = Number(error?.statusCode);
  if (error?.retryable) {
    return true;
  }

  return [408, 429, 500, 502, 503, 504].includes(statusCode);
};

const collectOutputTextFromResponse = (parsedResponse = {}, provider = DEFAULT_AI_PROVIDER) => {
  if (provider === 'deepseek') {
    return (parsedResponse?.choices || [])
      .map((choice) => choice?.message?.content)
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  return (parsedResponse?.candidates || [])
    .flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => part?.text)
    .filter(Boolean)
    .join('\n')
    .trim();
};

const requestAiContent = async ({
  providerConfig,
  prompt,
  temperature,
  includeResponseSchema,
  responseSchema = QUESTION_RESPONSE_SCHEMA,
  timeoutMs,
  maxOutputTokens,
}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const isGeminiProvider = providerConfig.provider === 'gemini';

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    const requestBody = isGeminiProvider
      ? {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature,
            topP: 0.8,
            maxOutputTokens,
            responseMimeType: 'application/json',
            ...(includeResponseSchema ? { responseSchema } : {}),
          },
        }
      : {
          model: providerConfig.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature,
          top_p: 0.8,
          max_tokens: maxOutputTokens,
          response_format: {
            type: 'json_object',
          },
        };

    if (!isGeminiProvider) {
      headers.Authorization = `Bearer ${providerConfig.apiKey}`;
    }

    const response = await fetch(providerConfig.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const rawResponse = await response.text();
    const parsedResponse = safeJsonParse(rawResponse) || {};

    if (!response.ok) {
      const apiMessage = parsedResponse?.error?.message
        || parsedResponse?.message
        || `${providerConfig.providerLabel} request failed with status ${response.status}`;
      const error = new Error(apiMessage);
      error.statusCode = response.status;
      error.retryable = [408, 429, 500, 502, 503, 504].includes(response.status);
      throw error;
    }

    const outputText = collectOutputTextFromResponse(parsedResponse, providerConfig.provider);
    return {
      outputText,
      parsedResponse,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`${providerConfig.providerLabel} request timed out after ${Math.round(timeoutMs / 1000)}s. Please try again.`);
      timeoutError.code = 'GEMINI_TIMEOUT';
      timeoutError.statusCode = 504;
      timeoutError.retryable = true;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const requestAIWithFallback = async ({
  providerConfig,
  prompt,
  temperature,
  timeoutMs,
  maxOutputTokens,
  responseSchema = QUESTION_RESPONSE_SCHEMA,
}) => {
  try {
    return await requestAiContent({
      providerConfig,
      prompt,
      temperature,
      includeResponseSchema: true,
      responseSchema,
      timeoutMs,
      maxOutputTokens,
    });
  } catch (error) {
    const canRetryWithoutSchema = providerConfig.provider === 'gemini' && shouldRetryWithoutSchema(error.message);
    if (!canRetryWithoutSchema && !isRetryableGeminiError(error)) {
      throw error;
    }

    const relaxedTokenBudget = clampNumber(Math.floor(maxOutputTokens * 0.85), 900, maxOutputTokens);

    try {
      return await requestAiContent({
        providerConfig,
        prompt,
        temperature,
        includeResponseSchema: false,
        responseSchema,
        timeoutMs,
        maxOutputTokens: relaxedTokenBudget,
      });
    } catch (retryError) {
      if (!isRetryableGeminiError(retryError)) {
        throw retryError;
      }

      return requestAiContent({
        providerConfig,
        prompt,
        temperature: Math.min(temperature, 0.1),
        includeResponseSchema: false,
        responseSchema,
        timeoutMs: clampNumber(timeoutMs + 15000, MIN_REQUEST_TIMEOUT_MS, MAX_REQUEST_TIMEOUT_MS),
        maxOutputTokens: relaxedTokenBudget,
      });
    }
  }
};

const generateQuestionWithGemini = async ({
  topic,
  difficulty,
  gradeLevel,
  questionType,
  language,
  instructions,
  choicesCount,
  questionCount,
}) => {
  if (!(await isAiEnabled())) {
    const questions = buildFallbackQuestionBatch({
      topic,
      difficulty,
      gradeLevel,
      questionType,
      language,
      choicesCount,
      questionCount,
    });

    return {
      questions,
      requestedQuestionCount: questions.length,
      generatedQuestionCount: questions.length,
      raw: { questions },
      model: FALLBACK_AI_MODEL,
    };
  }

  if (typeof fetch !== 'function') {
    throw new Error('Fetch API is not available in this Node runtime. Use Node 18+ to call the AI provider.');
  }

  const providerConfig = resolveAIClientConfig();
  const requestTimeoutMs = resolveRequestTimeoutMs();
  const maxOutputTokens = resolveMaxOutputTokens(questionCount);
  const fallbackMeta = {
    topic,
    difficulty,
    gradeLevel,
    questionType,
    language,
    choicesCount,
  };

  const prompt = buildPrompt({
    topic,
    difficulty,
    gradeLevel,
    questionType,
    language,
    instructions,
    choicesCount,
    questionCount,
  });

  const retryPrompt = [
    prompt,
    'Your last answer was invalid or incomplete.',
    `Return exactly ${questionCount} valid questions in one strict JSON object with no markdown and no extra text.`,
    'Keep each field concise so the JSON is not truncated.',
  ].join('\n\n');

  const compactRetryPrompt = [
    prompt,
    `Return exactly ${questionCount} valid questions.`,
    'Keep the question prompt under 130 characters when possible.',
    'Keep explanation and hints very short.',
    'Respond with strict compact JSON only and no markdown.',
  ].join('\n\n');

  const attemptPlans = [
    {
      prompt,
      temperature: 0.2,
      maxOutputTokens,
    },
    {
      prompt: retryPrompt,
      temperature: 0,
      maxOutputTokens: clampNumber(maxOutputTokens + 1200, MIN_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
    },
    {
      prompt: compactRetryPrompt,
      temperature: 0,
      maxOutputTokens: clampNumber(maxOutputTokens + 2200, MIN_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
    },
  ];

  let bestNormalizedQuestions = [];
  let bestParsedQuestion = null;
  let lastOutputText = '';

  for (const attemptPlan of attemptPlans) {
    const attemptResult = await requestAIWithFallback({
      providerConfig,
      prompt: attemptPlan.prompt,
      temperature: attemptPlan.temperature,
      timeoutMs: requestTimeoutMs,
      maxOutputTokens: attemptPlan.maxOutputTokens,
    });

    const outputText = String(attemptResult.outputText || '');
    lastOutputText = outputText;
    if (!outputText) {
      continue;
    }

    const parsedQuestion = extractJsonObject(outputText);
    let normalizedQuestions = [];

    if (parsedQuestion) {
      try {
        normalizedQuestions = normalizeQuestionBatch(parsedQuestion, fallbackMeta);
      } catch {
        normalizedQuestions = [];
      }
    }

    if (normalizedQuestions.length === 0) {
      normalizedQuestions = normalizeQuestionsFromText(outputText, fallbackMeta);
    }

    normalizedQuestions = selectDiverseQuestionBatch(normalizedQuestions, questionCount);

    if (normalizedQuestions.length > bestNormalizedQuestions.length) {
      bestNormalizedQuestions = normalizedQuestions;
      bestParsedQuestion = parsedQuestion;
    }

    if (normalizedQuestions.length >= questionCount) {
      const normalized = normalizedQuestions.slice(0, questionCount);
      return {
        questions: normalized,
        requestedQuestionCount: questionCount,
        generatedQuestionCount: normalized.length,
        raw: parsedQuestion || { questions: normalized },
        model: providerConfig.model,
      };
    }
  }

  if (bestNormalizedQuestions.length > 0 && bestNormalizedQuestions.length < questionCount) {
    const remainingCount = questionCount - bestNormalizedQuestions.length;
    const exclusions = buildQuestionBatchExclusions(bestNormalizedQuestions);

    const fillInstructions = [
      instructions,
      exclusions.questionLines.length > 0 ? 'Do not repeat these existing questions:' : '',
      exclusions.questionLines.join('\n'),
      exclusions.answerLines.length > 0 ? 'Do not reuse these existing correct answers:' : '',
      exclusions.answerLines.join('\n'),
      exclusions.choiceSetLines.length > 0 ? 'Do not reuse these existing answer-choice sets:' : '',
      exclusions.choiceSetLines.join('\n'),
      'Cover different concepts or sections from the same source material whenever possible.',
      'Keep text concise to avoid truncation.',
    ]
      .filter(Boolean)
      .join('\n');

    const fillPrompt = buildPrompt({
      topic,
      difficulty,
      gradeLevel,
      questionType,
      language,
      instructions: fillInstructions,
      choicesCount,
      questionCount: remainingCount,
    });

    try {
      const fillAttempt = await requestAIWithFallback({
        providerConfig,
        prompt: fillPrompt,
        temperature: 0,
        timeoutMs: requestTimeoutMs,
        maxOutputTokens: clampNumber(maxOutputTokens + 1400, MIN_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
      });

      const fillOutput = String(fillAttempt.outputText || '');
      if (fillOutput) {
        const fillParsed = extractJsonObject(fillOutput);
        let fillQuestions = [];

        if (fillParsed) {
          try {
            fillQuestions = normalizeQuestionBatch(fillParsed, fallbackMeta);
          } catch {
            fillQuestions = [];
          }
        }

        if (fillQuestions.length === 0) {
          fillQuestions = normalizeQuestionsFromText(fillOutput, fallbackMeta);
        }

        const mergedQuestions = selectDiverseQuestionBatch(mergeUniqueQuestions(
          bestNormalizedQuestions,
          fillQuestions,
          questionCount,
        ), questionCount);

        if (mergedQuestions.length > bestNormalizedQuestions.length) {
          bestNormalizedQuestions = mergedQuestions;
          bestParsedQuestion = fillParsed || bestParsedQuestion;
          lastOutputText = fillOutput;
        }
      }
    } catch {
      // Ignore fill pass failures and use best recovered questions.
    }
  }

  if (bestNormalizedQuestions.length >= questionCount) {
    const normalized = bestNormalizedQuestions.slice(0, questionCount);
    return {
      questions: normalized,
      requestedQuestionCount: questionCount,
      generatedQuestionCount: normalized.length,
      raw: bestParsedQuestion || { questions: normalized },
      model: providerConfig.model,
    };
  }

  if (questionCount === 1 && bestNormalizedQuestions.length > 0) {
    const normalized = bestNormalizedQuestions.slice(0, 1);
    return {
      questions: normalized,
      requestedQuestionCount: 1,
      generatedQuestionCount: normalized.length,
      raw: bestParsedQuestion || { questions: normalized },
      model: providerConfig.model,
    };
  }

  const preview = String(lastOutputText || '')
    .slice(0, OUTPUT_TEXT_PREVIEW_LIMIT)
    .replace(/\s+/g, ' ')
    .trim();

  if (bestNormalizedQuestions.length > 0) {
    throw new Error(`Gemini returned only ${bestNormalizedQuestions.length}/${questionCount} valid questions. Preview: ${preview}`);
  }

  throw new Error(`Gemini response was not valid JSON. Preview: ${preview}`);
};

const generateSingleQuestionWithGemini = async ({
  topic,
  difficulty = 'medium',
  gradeLevel = '',
  questionType = 'multiple-choice',
  language = 'English',
  instructions = '',
  choicesCount = 4,
}) => {
  const payload = await generateQuestionWithGemini({
    topic,
    difficulty,
    gradeLevel,
    questionType,
    language,
    instructions,
    choicesCount,
    questionCount: 1,
  });

  return {
    question: payload.questions[0],
    raw: payload.raw,
    model: payload.model,
  };
};

const generateQuestionRetryPoolWithGemini = async ({
  topic,
  difficulty = 'medium',
  gradeLevel = '',
  questionType = 'multiple-choice',
  language = 'English',
  instructions = '',
  choicesCount = 4,
  existingQuestion = null,
  retryQuestionCount = 15,
}) => {
  const existingQuestionText = typeof existingQuestion?.question === 'string' && existingQuestion.question.trim()
    ? existingQuestion.question.trim()
    : '';
  const poolInstructions = [
    instructions,
    existingQuestionText
      ? `Do not repeat or closely paraphrase this existing question: ${existingQuestionText}`
      : '',
    Array.isArray(existingQuestion?.choices) && existingQuestion.choices.length > 0
      ? `Do not reuse this exact answer-choice set from the current question: ${existingQuestion.choices.join(' | ')}`
      : '',
    'Make each new question meaningfully different while staying on the same topic.',
    'Each retry question must use a fresh answer-choice set, not just the same concepts in a different order.',
    'Use topic-connected distractors such as short behaviors, examples, code effects, or outcomes instead of reusing nearby lesson titles as plain answer choices.',
  ].filter(Boolean).join('\n');
  const targetRetryCount = Math.max(1, Number.parseInt(retryQuestionCount, 10) || 1);
  const seenQuestions = new Set(
    existingQuestionText
      ? [existingQuestionText.toLowerCase()]
      : [],
  );
  const collectedRetryQuestions = [];
  const rawResponses = [];
  let model = '';

  // Smaller batches are much more reliable than a single exact 16-question response.
  const batchSizes = [6, 5, 4, 3, 2, 1];

  for (const batchSize of batchSizes) {
    if (collectedRetryQuestions.length >= targetRetryCount) {
      break;
    }

    const remainingCount = targetRetryCount - collectedRetryQuestions.length;
    const requestCount = Math.max(1, Math.min(batchSize, remainingCount));
    const excludeQuestionsText = [
      existingQuestionText,
      ...collectedRetryQuestions.map((question) => String(question?.question || '').trim()),
    ]
      .filter(Boolean)
      .map((questionText, index) => `${index + 1}. ${questionText}`)
      .join('\n');
    const excludeChoiceSetsText = [
      Array.isArray(existingQuestion?.choices) && existingQuestion.choices.length > 0
        ? existingQuestion.choices.join(' | ')
        : '',
      ...collectedRetryQuestions.map((question) => (
        Array.isArray(question?.choices) && question.choices.length > 0
          ? question.choices.join(' | ')
          : ''
      )),
    ]
      .filter(Boolean)
      .map((choiceSet, index) => `${index + 1}. ${choiceSet}`)
      .join('\n');

    try {
      const payload = await generateQuestionWithGemini({
        topic,
        difficulty,
        gradeLevel,
        questionType,
        language,
        instructions: [
          poolInstructions,
          excludeQuestionsText ? `Avoid repeating these questions:\n${excludeQuestionsText}` : '',
          excludeChoiceSetsText ? `Avoid repeating these answer-choice sets:\n${excludeChoiceSetsText}` : '',
        ].filter(Boolean).join('\n\n'),
        choicesCount,
        questionCount: requestCount,
      });

      if (payload?.raw) {
        rawResponses.push(payload.raw);
      }
      if (!model && typeof payload?.model === 'string') {
        model = payload.model;
      }

      const nextQuestions = Array.isArray(payload?.questions) ? payload.questions : [];
      for (const question of nextQuestions) {
        if (collectedRetryQuestions.length >= targetRetryCount) {
          break;
        }

        const normalizedQuestion = typeof question?.question === 'string'
          ? question.question.trim().toLowerCase()
          : '';
        if (!normalizedQuestion || seenQuestions.has(normalizedQuestion)) {
          continue;
        }

        seenQuestions.add(normalizedQuestion);
        collectedRetryQuestions.push(question);
      }
    } catch {
      // Keep trying smaller batches so partial retry pools can still succeed.
    }
  }

  return {
    retryQuestions: collectedRetryQuestions,
    raw: rawResponses.length === 1 ? rawResponses[0] : { batches: rawResponses },
    model,
  };
};

const generateStatueQuestionsWithGemini = async ({ statues = [] } = {}) => {
  const normalizedStatues = (Array.isArray(statues) ? statues : [])
    .map((entry) => {
      const questionId = normalizeStatueQuestionId(entry?.questionId);
      const topic = typeof entry?.topic === 'string' ? entry.topic.trim().slice(0, 140) : '';

      if (!questionId || !topic) {
        return null;
      }

      const choicesCountRaw = Number.parseInt(entry?.choicesCount, 10);
      const choicesCount = Number.isInteger(choicesCountRaw)
        ? clampNumber(choicesCountRaw, 2, 6)
        : 4;

      return {
        questionId,
        topic,
        choicesCount,
        difficulty: normalizeDifficulty(entry?.difficulty || 'medium'),
        gradeLevel: typeof entry?.gradeLevel === 'string' ? entry.gradeLevel.trim().slice(0, 40) : '',
        language: typeof entry?.language === 'string' && entry.language.trim()
          ? entry.language.trim().slice(0, 40)
          : 'English',
        instructions: typeof entry?.instructions === 'string' ? entry.instructions.trim().slice(0, 500) : '',
      };
    })
    .filter(Boolean)
    .filter((entry, index, array) => array.findIndex((candidate) => candidate.questionId === entry.questionId) === index);

  if (normalizedStatues.length === 0) {
    return {
      questionsById: {},
      requestedQuestionCount: 0,
      generatedQuestionCount: 0,
      raw: { questions: [] },
      model: FALLBACK_AI_MODEL,
    };
  }

  if (!(await isAiEnabled())) {
    const questionsById = buildFallbackStatueQuestions(normalizedStatues);
    return {
      questionsById,
      requestedQuestionCount: normalizedStatues.length,
      generatedQuestionCount: Object.keys(questionsById).length,
      raw: { questions: Object.values(questionsById) },
      model: FALLBACK_AI_MODEL,
    };
  }

  if (typeof fetch !== 'function') {
    throw new Error('Fetch API is not available in this Node runtime. Use Node 18+ to call the AI provider.');
  }

  const providerConfig = resolveAIClientConfig();

  const requestTimeoutMs = resolveRequestTimeoutMs();
  const maxOutputTokens = resolveMaxOutputTokens(Math.max(normalizedStatues.length, 4));
  const orderedQuestionIds = normalizedStatues.map((entry) => entry.questionId);

  const fallbackByQuestionId = new Map(
    normalizedStatues.map((entry) => [
      entry.questionId,
      {
        topic: entry.topic,
        difficulty: entry.difficulty,
        gradeLevel: entry.gradeLevel,
        questionType: 'multiple-choice',
        language: entry.language,
      },
    ]),
  );

  const prompt = buildStatueBatchPrompt({
    statues: normalizedStatues,
  });

  const retryPrompt = [
    prompt,
    'Your last answer was invalid or incomplete.',
    'Return all required questionIds exactly once in strict JSON.',
    'Keep explanations and hints concise to avoid truncation.',
  ].join('\n\n');

  const compactRetryPrompt = [
    prompt,
    'Keep each question under 130 characters when possible.',
    'Keep hints short and direct.',
    'Respond with strict compact JSON only and no markdown.',
  ].join('\n\n');

  const attemptPlans = [
    {
      prompt,
      temperature: 0.2,
      maxOutputTokens,
    },
    {
      prompt: retryPrompt,
      temperature: 0,
      maxOutputTokens: clampNumber(maxOutputTokens + 1400, MIN_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
    },
    {
      prompt: compactRetryPrompt,
      temperature: 0,
      maxOutputTokens: clampNumber(maxOutputTokens + 2200, MIN_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
    },
  ];

  let bestQuestionsById = new Map();
  let bestParsedPayload = null;
  let lastOutputText = '';

  for (const attemptPlan of attemptPlans) {
    const attemptResult = await requestAIWithFallback({
      providerConfig,
      prompt: attemptPlan.prompt,
      temperature: attemptPlan.temperature,
      timeoutMs: requestTimeoutMs,
      maxOutputTokens: attemptPlan.maxOutputTokens,
      responseSchema: STATUE_BATCH_RESPONSE_SCHEMA,
    });

    const outputText = String(attemptResult.outputText || '');
    lastOutputText = outputText;
    if (!outputText) {
      continue;
    }

    const parsedPayload = extractJsonObject(outputText);
    let attemptQuestionsById = new Map();

    if (parsedPayload) {
      attemptQuestionsById = normalizeStatueBatchPayload(parsedPayload, fallbackByQuestionId);
    }

    if (attemptQuestionsById.size === 0) {
      attemptQuestionsById = normalizeStatueBatchFromText(outputText, fallbackByQuestionId);
    }

    const mergedQuestionsById = mergeStatueQuestionMaps(bestQuestionsById, attemptQuestionsById, orderedQuestionIds);
    if (mergedQuestionsById.size > bestQuestionsById.size) {
      bestQuestionsById = mergedQuestionsById;
      bestParsedPayload = parsedPayload || bestParsedPayload;
    }

    if (bestQuestionsById.size >= orderedQuestionIds.length) {
      break;
    }
  }

  if (bestQuestionsById.size > 0 && bestQuestionsById.size < orderedQuestionIds.length) {
    const missingQuestionIds = orderedQuestionIds.filter((questionId) => !bestQuestionsById.has(questionId));
    const missingStatues = normalizedStatues.filter((entry) => missingQuestionIds.includes(entry.questionId));

    const fillPrompt = [
      buildStatueBatchPrompt({ statues: missingStatues }),
      'Only return these missing questionIds. Do not repeat previously answered questionIds.',
    ].join('\n\n');

    try {
      const fillAttempt = await requestAIWithFallback({
        providerConfig,
        prompt: fillPrompt,
        temperature: 0,
        timeoutMs: requestTimeoutMs,
        maxOutputTokens: clampNumber(maxOutputTokens + 1400, MIN_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
        responseSchema: STATUE_BATCH_RESPONSE_SCHEMA,
      });

      const fillOutputText = String(fillAttempt.outputText || '');
      if (fillOutputText) {
        const fillPayload = extractJsonObject(fillOutputText);
        let fillQuestionsById = new Map();

        if (fillPayload) {
          fillQuestionsById = normalizeStatueBatchPayload(fillPayload, fallbackByQuestionId);
        }

        if (fillQuestionsById.size === 0) {
          fillQuestionsById = normalizeStatueBatchFromText(fillOutputText, fallbackByQuestionId);
        }

        const mergedFill = mergeStatueQuestionMaps(bestQuestionsById, fillQuestionsById, orderedQuestionIds);
        if (mergedFill.size > bestQuestionsById.size) {
          bestQuestionsById = mergedFill;
          bestParsedPayload = fillPayload || bestParsedPayload;
          lastOutputText = fillOutputText;
        }
      }
    } catch {
      // Ignore fill failures and return partial successful questions.
    }
  }

  if (bestQuestionsById.size === 0) {
    const preview = String(lastOutputText || '')
      .slice(0, OUTPUT_TEXT_PREVIEW_LIMIT)
      .replace(/\s+/g, ' ')
      .trim();
    throw new Error(`Gemini response was not valid JSON. Preview: ${preview}`);
  }

  return {
    questionsById: Object.fromEntries(Array.from(bestQuestionsById.entries())),
    requestedQuestionCount: orderedQuestionIds.length,
    generatedQuestionCount: bestQuestionsById.size,
    raw: bestParsedPayload || { questions: Array.from(bestQuestionsById.values()) },
    model: providerConfig.model,
  };
};

const generatePerformanceInsightWithGemini = async ({ sourceSnapshot = {} } = {}) => {
  if (!(await isAiEnabled())) {
    const insight = buildFallbackPerformanceInsight({ sourceSnapshot });
    return {
      ...insight,
      raw: insight,
      model: FALLBACK_AI_MODEL,
    };
  }

  if (typeof fetch !== 'function') {
    throw new Error('Fetch API is not available in this Node runtime. Use Node 18+ to call the AI provider.');
  }

  const providerConfig = resolveAIClientConfig();
  const prompt = buildPerformanceInsightPrompt({ sourceSnapshot });
  const attemptResult = await requestAIWithFallback({
    providerConfig,
    prompt,
    temperature: 0.15,
    timeoutMs: resolveRequestTimeoutMs(),
    maxOutputTokens: 1400,
    responseSchema: PERFORMANCE_INSIGHT_RESPONSE_SCHEMA,
  });

  const outputText = String(attemptResult.outputText || '');
  const parsedPayload = extractJsonObject(outputText);
  const insight = normalizePerformanceInsightPayload(parsedPayload);

  return {
    ...insight,
    raw: parsedPayload || insight,
    model: providerConfig.model,
  };
};

const generateGameHintWithGemini = async ({
  gameType = '',
  topic = '',
  objective = '',
  availableTokens = [],
  assembledTokens = [],
  answerPattern = '',
  hintNumber = 1,
  fallbackHint = '',
  forbiddenAnswer = '',
} = {}) => {
  const safeFallback = truncateText(cleanSentence(fallbackHint), MAX_HINT_TEXT_LENGTH)
    || 'Review the Java declaration order: type, variable name, equals sign, value, then semicolon.';

  if (!(await isAiEnabled())) {
    return { hint: safeFallback, source: 'fallback', model: FALLBACK_AI_MODEL };
  }

  if (typeof fetch !== 'function') {
    return { hint: safeFallback, source: 'fallback', model: FALLBACK_AI_MODEL };
  }

  const normalizedAvailable = (Array.isArray(availableTokens) ? availableTokens : [])
    .slice(0, 12)
    .map((token) => truncateText(cleanSentence(token), 40))
    .filter(Boolean);
  const normalizedAssembled = (Array.isArray(assembledTokens) ? assembledTokens : [])
    .slice(0, 12)
    .map((token) => truncateText(cleanSentence(token), 40))
    .filter(Boolean);

  const normalizedGameType = String(gameType || '').trim().toUpperCase();
  const isWordGame = normalizedGameType === 'GAME_FIVE';
  const prompt = [
    `You are the hint assistant for a beginner ${isWordGame ? 'programming vocabulary word game' : 'Java learning game'}.`,
    'Return JSON with exactly one field named "hint".',
    'Give one concise, encouraging clue (maximum 120 characters).',
    isWordGame
      ? 'Do not state, spell, or quote the complete answer. Do not reveal another letter.'
      : 'Do not provide the complete answer or the final complete Java statement.',
    'Base the clue only on the supplied game state. Point out the next concept or position the learner should inspect.',
    `Game: ${truncateText(cleanSentence(gameType), 40) || 'GAME_FOUR'}`,
    `Topic: ${truncateText(cleanSentence(topic), 80) || 'Java variables'}`,
    `Objective: ${truncateText(cleanSentence(objective), 180) || 'Arrange a valid Java declaration.'}`,
    ...(isWordGame
      ? [`Visible answer pattern: ${truncateText(cleanSentence(answerPattern), 100) || 'hidden'}`]
      : []),
    `Available pieces: ${normalizedAvailable.join(' | ') || 'none'}`,
    `Current arrangement: ${normalizedAssembled.join(' | ') || 'empty'}`,
    `Requested hint number: ${Math.max(1, Math.min(3, Number.parseInt(hintNumber, 10) || 1))}`,
  ].join('\n');

  try {
    const providerConfig = resolveAIClientConfig();
    const attemptResult = await requestAIWithFallback({
      providerConfig,
      prompt,
      temperature: 0.2,
      timeoutMs: resolveRequestTimeoutMs(),
      maxOutputTokens: 300,
      responseSchema: GAME_HINT_RESPONSE_SCHEMA,
    });
    const parsedPayload = extractJsonObject(String(attemptResult.outputText || ''));
    const hint = truncateText(cleanSentence(parsedPayload?.hint), MAX_HINT_TEXT_LENGTH);
    const normalizedForbiddenAnswer = normalizeComparableText(forbiddenAnswer);
    const revealsForbiddenAnswer = normalizedForbiddenAnswer.length >= 2
      && normalizeComparableText(hint).includes(normalizedForbiddenAnswer);

    if (!hint || revealsForbiddenAnswer) {
      return { hint: safeFallback, source: 'fallback', model: providerConfig.model };
    }

    return { hint, source: 'ai', model: providerConfig.model };
  } catch {
    return { hint: safeFallback, source: 'fallback', model: FALLBACK_AI_MODEL };
  }
};

const normalizeGameFiveQuestions = (questions = [], count = 5) => {
  const seen = new Set();
  return (Array.isArray(questions) ? questions : [])
    .map((entry) => ({
      word: String(entry?.word || '').toUpperCase().replace(/[^A-Z]/g, ''),
      clue: truncateText(cleanSentence(entry?.clue), 180),
    }))
    .filter(({ word, clue }) => {
      if (word.length < 3 || word.length > 16 || !clue || seen.has(word)) return false;
      seen.add(word);
      return true;
    })
    .slice(0, count);
};

const normalizeGameTwoTasks = (tasks = [], count = 3, fallbackTasks = [], variationSeed = '') => (
  (Array.isArray(tasks) ? tasks : [])
    .map((entry, index) => {
      const choices = (Array.isArray(entry?.choices) ? entry.choices : [])
        .map((choice) => truncateText(cleanSentence(choice), 240))
        .filter(Boolean)
        .filter((choice, choiceIndex, all) => all.indexOf(choice) === choiceIndex)
        .slice(0, 6);
      const correctChoiceIndex = Number.parseInt(entry?.correctChoiceIndex, 10);
      if (choices.length !== 6 || !Number.isInteger(correctChoiceIndex) || correctChoiceIndex < 0 || correctChoiceIndex >= choices.length) {
        return null;
      }
      const fallback = fallbackTasks[index] || {};
      const optionIds = ['a', 'b', 'c', 'd', 'e', 'f'];
      const hints = (Array.isArray(entry?.hints) ? entry.hints : [])
        .map((hint) => truncateText(cleanSentence(hint), 140))
        .filter(Boolean)
        .slice(0, 3);
      return {
        id: `ai-g2-${String(variationSeed || Date.now()).replace(/[^a-zA-Z0-9]/g, '').slice(-12)}-${index + 1}`,
        type: 'choice',
        title: truncateText(cleanSentence(entry?.title), 80) || `Code Challenge ${index + 1}`,
        prompt: truncateText(cleanSentence(entry?.prompt), 260),
        snippet: truncateText(String(entry?.codeContext || '').trim(), 700) || '____',
        answer: choices[correctChoiceIndex],
        acceptedAnswers: [choices[correctChoiceIndex]],
        correctOptionId: optionIds[correctChoiceIndex],
        options: choices.map((label, choiceIndex) => ({ id: optionIds[choiceIndex], label })),
        points: Math.max(1, Number(fallback?.points) || 100),
        coinReward: Math.max(0, Number(fallback?.coinReward) || 1),
        coach: truncateText(cleanSentence(fallback?.coach), 180) || 'Read the complete Java statement before compiling.',
        hints: hints.length > 0 ? hints : (Array.isArray(fallback?.hints) ? fallback.hints.slice(0, 3) : []),
        feedback: { correct: 'Code compiled successfully.' },
      };
    })
    .filter((task) => task?.prompt)
    .slice(0, count)
);

const verifyGameTwoTasksWithGemini = async ({ providerConfig, tasks = [] } = {}) => {
  const reviewInput = tasks.map((task, taskIndex) => ({
    taskIndex,
    prompt: task?.prompt,
    codeContext: task?.codeContext,
    choices: task?.choices,
    hints: task?.hints,
    proposedCorrectChoiceIndex: task?.correctChoiceIndex,
  }));
  const prompt = [
    'Act as a strict independent Java instructor and code reviewer.',
    'Verify every supplied Code Lab task; do not assume the proposed answer is correct.',
    'For each task, substitute every choice into ____ and evaluate Java syntax, types, semantics, and the prompt requirement.',
    'A task is valid only when exactly one choice correctly satisfies both the code context and prompt.',
    'Return one review per task with taskIndex, valid, correctChoiceIndex, validChoiceCount, and a concise reason.',
    'Set valid=false for ambiguity, missing context, multiple defensible answers, no correct answer, inaccurate terminology, or an answer disclosed by the prompt/hints.',
    `Tasks: ${JSON.stringify(reviewInput)}`,
  ].join('\n');
  const attemptResult = await requestAIWithFallback({
    providerConfig,
    prompt,
    temperature: 0.05,
    timeoutMs: resolveRequestTimeoutMs(),
    maxOutputTokens: 2200,
    responseSchema: GAME_TWO_TASK_VERIFICATION_SCHEMA,
  });
  const parsedPayload = extractJsonObject(String(attemptResult.outputText || ''));
  const reviews = Array.isArray(parsedPayload?.reviews) ? parsedPayload.reviews : [];
  if (reviews.length !== tasks.length) return false;

  return tasks.every((task, taskIndex) => {
    const review = reviews.find((entry) => Number(entry?.taskIndex) === taskIndex);
    return review?.valid === true
      && Number(review?.validChoiceCount) === 1
      && Number(review?.correctChoiceIndex) === Number(task?.correctChoiceIndex);
  });
};

const generateGameTwoTasksWithGemini = async ({
  levelNumber = 1,
  count = 3,
  objective = '',
  fallbackTasks = [],
  variationSeed = '',
} = {}) => {
  const safeLevel = Math.max(1, Math.min(5, Number.parseInt(levelNumber, 10) || 1));
  const safeCount = Math.max(1, Math.min(8, Number.parseInt(count, 10) || 3));
  const fallbackResult = { tasks: fallbackTasks.slice(0, safeCount), source: 'fallback', model: FALLBACK_AI_MODEL };
  if (!(await isAiEnabled()) || typeof fetch !== 'function') return fallbackResult;

  const difficulty = ['beginner', 'foundational', 'intermediate', 'upper-intermediate', 'advanced'][safeLevel - 1];
  const examples = fallbackTasks.slice(0, safeCount).map((task) => ({
    title: task?.title,
    prompt: task?.prompt,
    code: task?.snippet,
    answer: task?.answer || task?.options?.find((option) => option?.id === task?.correctOptionId)?.label,
  }));
  const prompt = [
    'Create fresh Java Code Lab tasks for a student retry.',
    `Return exactly ${safeCount} tasks for level ${safeLevel} at ${difficulty} difficulty.`,
    `Learning objective: ${truncateText(cleanSentence(objective), 300) || 'Practice Java syntax and reasoning.'}`,
    'Keep the same curriculum difficulty as the examples, but change identifiers, literals, scenario wording, and code.',
    'Each task must contain title, prompt, codeContext, choices, correctChoiceIndex, and hints.',
    'Each choices array must contain exactly 6 unique, plausible Java code choices with exactly one correct answer.',
    'Use syntactically believable distractors. Do not disclose the answer in the prompt or hints.',
    'codeContext must contain ____ where the selected choice belongs.',
    'Hints should identify concepts to inspect without giving the final code.',
    `Do not reproduce these examples verbatim: ${JSON.stringify(examples)}`,
    `Unique retry variation seed: ${truncateText(cleanSentence(variationSeed), 80) || Date.now()}.`,
  ].join('\n');

  try {
    const providerConfig = resolveAIClientConfig();
    const attemptResult = await requestAIWithFallback({
      providerConfig,
      prompt,
      temperature: 0.8,
      timeoutMs: resolveRequestTimeoutMs(),
      maxOutputTokens: 4200,
      responseSchema: GAME_TWO_TASKS_RESPONSE_SCHEMA,
    });
    const parsedPayload = extractJsonObject(String(attemptResult.outputText || ''));
    const rawTasks = Array.isArray(parsedPayload?.tasks) ? parsedPayload.tasks.slice(0, safeCount) : [];
    const structurallyValid = rawTasks.length === safeCount && rawTasks.every((task) => {
      const choices = Array.isArray(task?.choices) ? task.choices.map((choice) => String(choice || '').trim()) : [];
      const uniqueChoices = new Set(choices.map((choice) => choice.replace(/\s+/g, ' ').toLowerCase()));
      const blankCount = (String(task?.codeContext || '').match(/____/g) || []).length;
      const correctIndex = Number.parseInt(task?.correctChoiceIndex, 10);
      const correctChoice = choices[correctIndex] || '';
      const hintText = (Array.isArray(task?.hints) ? task.hints : []).join(' ').toLowerCase();
      return Boolean(String(task?.prompt || '').trim())
        && blankCount === 1
        && choices.length === 6
        && uniqueChoices.size === 6
        && Number.isInteger(correctIndex)
        && correctIndex >= 0
        && correctIndex < choices.length
        && correctChoice.length > 0
        && !hintText.includes(correctChoice.toLowerCase());
    });
    if (!structurallyValid || !(await verifyGameTwoTasksWithGemini({ providerConfig, tasks: rawTasks }))) {
      return { ...fallbackResult, model: providerConfig.model, rejectedAiOutput: true };
    }
    const tasks = normalizeGameTwoTasks(rawTasks, safeCount, fallbackTasks, variationSeed);
    if (tasks.length !== safeCount) return { ...fallbackResult, model: providerConfig.model };
    return { tasks, source: 'ai', model: providerConfig.model };
  } catch {
    return fallbackResult;
  }
};

const generateGameFiveQuestionsWithGemini = async ({
  levelNumber = 1,
  count = 5,
  fallbackQuestions = [],
  variationSeed = '',
} = {}) => {
  const safeLevel = Math.max(1, Math.min(5, Number.parseInt(levelNumber, 10) || 1));
  const safeCount = Math.max(1, Math.min(10, Number.parseInt(count, 10) || 5));
  const safeFallback = normalizeGameFiveQuestions(fallbackQuestions, safeCount);
  const fallbackResult = {
    questions: safeFallback,
    source: 'fallback',
    model: FALLBACK_AI_MODEL,
  };

  if (!(await isAiEnabled()) || typeof fetch !== 'function') return fallbackResult;

  const difficulty = [
    'introductory programming vocabulary',
    'basic programming logic and data vocabulary',
    'intermediate functions, arrays, syntax, and object vocabulary',
    'Java classes, methods, algorithms, and exceptions',
    'advanced object-oriented programming vocabulary',
  ][safeLevel - 1];
  const excludedWords = safeFallback.map(({ word }) => word).join(', ');
  const prompt = [
    'You create questions for Code Snowman, a beginner programming vocabulary guessing game.',
    `Create exactly ${safeCount} distinct questions for level ${safeLevel}.`,
    `Difficulty: ${difficulty}.`,
    'Return JSON with one field named "questions". Each item must contain exactly "word" and "clue".',
    'The word must be one programming term containing only A-Z letters, 3 to 16 characters, with no spaces or punctuation.',
    'The clue must be accurate, student-friendly, one sentence, and must not contain or spell the answer.',
    'Use varied concepts. Do not repeat any answer.',
    excludedWords ? `Prefer answers different from these fallback terms: ${excludedWords}.` : '',
    `Variation seed for this play session: ${truncateText(cleanSentence(variationSeed), 80) || Date.now()}.`,
  ].filter(Boolean).join('\n');

  try {
    const providerConfig = resolveAIClientConfig();
    const attemptResult = await requestAIWithFallback({
      providerConfig,
      prompt,
      temperature: 0.75,
      timeoutMs: resolveRequestTimeoutMs(),
      maxOutputTokens: 1400,
      responseSchema: GAME_FIVE_WORDS_RESPONSE_SCHEMA,
    });
    const parsedPayload = extractJsonObject(String(attemptResult.outputText || ''));
    const questions = normalizeGameFiveQuestions(parsedPayload?.questions, safeCount);
    if (questions.length !== safeCount) {
      return { ...fallbackResult, model: providerConfig.model };
    }
    return { questions, source: 'ai', model: providerConfig.model };
  } catch {
    return fallbackResult;
  }
};

module.exports = {
  generateQuestionWithGemini,
  generateSingleQuestionWithGemini,
  generateQuestionRetryPoolWithGemini,
  generateStatueQuestionsWithGemini,
  generatePerformanceInsightWithGemini,
  generateGameHintWithGemini,
  generateGameTwoTasksWithGemini,
  generateGameFiveQuestionsWithGemini,
};
