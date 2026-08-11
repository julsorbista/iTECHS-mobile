const RETRY_PROMPT_TEMPLATES = Object.freeze([
  (topic) => `Which choice best matches the idea of ${topic}?`,
  (topic) => `About ${topic}, which answer is correct?`,
  (topic) => `Choose the statement that correctly describes ${topic}.`,
  (topic) => `Think about ${topic}. Which option fits best?`,
]);

const sanitizeTopic = (value) => String(value || '')
  .replace(/\s+/g, ' ')
  .replace(/[?.!]+$/g, '')
  .trim();

const buildFallbackRetryChoices = (topic, correctChoice, choices = []) => {
  const normalizedTopic = sanitizeTopic(topic) || 'this topic';
  const normalizedCorrectChoice = String(correctChoice || '').trim();
  const sourceChoices = Array.isArray(choices)
    ? choices
      .map((choice) => String(choice || '').trim())
      .filter(Boolean)
    : [];

  const distractorPool = [
    `A detail that sounds related to ${normalizedTopic} but does not fully match it`,
    `A common misunderstanding about ${normalizedTopic}`,
    `An example that only partly fits ${normalizedTopic}`,
    `A description that mixes up the purpose of ${normalizedTopic}`,
    `A statement that sounds technical but is incorrect for ${normalizedTopic}`,
    `An outcome that is not actually caused by ${normalizedTopic}`,
  ];

  const nextChoices = [];
  if (normalizedCorrectChoice) {
    nextChoices.push(normalizedCorrectChoice);
  }

  for (const distractor of distractorPool) {
    if (nextChoices.length >= Math.max(2, sourceChoices.length || 4)) {
      break;
    }

    if (!nextChoices.includes(distractor)) {
      nextChoices.push(distractor);
    }
  }

  while (nextChoices.length < Math.max(2, sourceChoices.length || 4)) {
    nextChoices.push(`Another incorrect statement about ${normalizedTopic}`);
  }

  return nextChoices;
};

export const getQuestionTopicLabel = (question = {}) => {
  const explicitTopic = sanitizeTopic(
    question?.topic
    || question?.meta?.topic
    || question?.questionTopic,
  );

  if (explicitTopic) {
    return explicitTopic;
  }

  const prompt = sanitizeTopic(question?.prompt || question?.formattedQuestion);
  if (!prompt) {
    return 'this topic';
  }

  return prompt.length > 80 ? `${prompt.slice(0, 77).trim()}...` : prompt;
};

const rotateChoices = (choices = [], retryIndex = 1) => {
  if (!Array.isArray(choices) || choices.length <= 1) {
    return Array.isArray(choices) ? [...choices] : [];
  }

  const safeRetryIndex = Math.max(1, Math.trunc(Number(retryIndex) || 1));
  const shift = ((safeRetryIndex - 1) % (choices.length - 1)) + 1;
  return choices.map((_, index) => choices[(index + shift) % choices.length]);
};

const reorderChoicesWithAnswer = (choices = [], answerIndex = 0, retryIndex = 1) => {
  const normalizedChoices = Array.isArray(choices)
    ? choices.filter((choice) => choice !== undefined && choice !== null)
    : [];

  if (normalizedChoices.length <= 1) {
    return {
      choices: normalizedChoices,
      answerIndex: Math.max(0, Math.min(normalizedChoices.length - 1, Number(answerIndex) || 0)),
    };
  }

  const clampedAnswerIndex = Math.max(
    0,
    Math.min(normalizedChoices.length - 1, Number.isInteger(answerIndex) ? answerIndex : 0),
  );
  const correctChoice = normalizedChoices[clampedAnswerIndex];
  const rotatedChoices = rotateChoices(normalizedChoices, retryIndex);
  const rotatedAnswerIndex = Math.max(0, rotatedChoices.findIndex((choice) => choice === correctChoice));

  return {
    choices: rotatedChoices,
    answerIndex: rotatedAnswerIndex,
  };
};

export const buildQuestionRetryVariant = (question = {}, retryIndex = 1) => {
  const retryQuestions = Array.isArray(question?.retryQuestions)
    ? question.retryQuestions.filter((retryQuestion) => retryQuestion && typeof retryQuestion === 'object')
    : [];
  if (retryQuestions.length > 0) {
    const [nextRetryQuestion, ...remainingRetryQuestions] = retryQuestions;
    const nextChoices = Array.isArray(nextRetryQuestion?.choices)
      ? nextRetryQuestion.choices.filter((choice) => choice !== undefined && choice !== null)
      : [];
    const { choices: shuffledNextChoices, answerIndex: shuffledNextAnswerIndex } = reorderChoicesWithAnswer(
      nextChoices,
      Number.isInteger(nextRetryQuestion?.answerIndex) ? nextRetryQuestion.answerIndex : 0,
      retryIndex,
    );

    if (shuffledNextChoices.length >= 2) {
      return {
        ...question,
        ...nextRetryQuestion,
        prompt: String(nextRetryQuestion.prompt || nextRetryQuestion.formattedQuestion || question.prompt || '').trim(),
        formattedQuestion: String(nextRetryQuestion.formattedQuestion || nextRetryQuestion.prompt || question.formattedQuestion || question.prompt || '').trim(),
        choices: shuffledNextChoices,
        answerIndex: shuffledNextAnswerIndex,
        retryQuestions: remainingRetryQuestions,
        isRetryVariant: true,
        retryVariantIndex: Math.max(1, Math.trunc(Number(retryIndex) || 1)),
      };
    }
  }

  return null;
};

export default buildQuestionRetryVariant;
