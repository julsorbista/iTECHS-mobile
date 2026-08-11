const { successResponse, errorResponse } = require('../utils/helpers');
const prisma = require('../lib/prisma');
const { generateQuestionWithGemini } = require('../services/aiQuestionService');
const { getAiControlState, setAiEnabled } = require('../services/aiControlService');
const { buildMaterialQuestionGenerationSource } = require('../services/learningMaterialService');

const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const MAX_MODULE_SOURCE_LENGTH = 16000;
const ASSESSMENT_QUESTION_TYPE_ROTATION = ['multiple_choice', 'true_false', 'identification', 'essay'];

const normalizeRequestedQuestionType = (value) => {
  const normalized = String(value || 'mixed').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['multiple_choice', 'true_false', 'identification', 'essay', 'mixed'].includes(normalized)) {
    return normalized;
  }

  return 'mixed';
};

const buildQuestionTypePlan = (questionCount, questionType) => {
  const normalizedType = normalizeRequestedQuestionType(questionType);
  if (normalizedType !== 'mixed') {
    return Array.from({ length: questionCount }, () => normalizedType);
  }

  return Array.from({ length: questionCount }, (_, index) => (
    ASSESSMENT_QUESTION_TYPE_ROTATION[index % ASSESSMENT_QUESTION_TYPE_ROTATION.length]
  ));
};

const buildQuestionTypeCounts = (typePlan = []) => typePlan.reduce((counts, type) => ({
  ...counts,
  [type]: (counts[type] || 0) + 1,
}), {});

const buildBatchExclusionInstructions = (questions = []) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return '';
  }

  const questionLines = questions
    .map((question, index) => {
      const prompt = String(question?.formattedQuestion || question?.question || '').trim();
      return prompt ? `${index + 1}. ${prompt}` : '';
    })
    .filter(Boolean);
  const answerLines = questions
    .map((question, index) => {
      const answer = String(question?.correctAnswer || '').trim();
      return answer ? `${index + 1}. ${answer}` : '';
    })
    .filter(Boolean);

  return [
    questionLines.length > 0 ? 'Do not repeat these existing question prompts:' : '',
    ...questionLines,
    answerLines.length > 0 ? 'Do not reuse these existing correct answers or answer guides:' : '',
    ...answerLines,
    'Keep each new question focused on a different concept, section, subtopic, or image-supported detail when possible.',
  ]
    .filter(Boolean)
    .join('\n');
};

const reorderQuestionsByTypePlan = (questions = [], typePlan = []) => {
  const queues = new Map();
  questions.forEach((question) => {
    const type = normalizeRequestedQuestionType(question?.type || question?.meta?.questionType || 'multiple_choice');
    const list = queues.get(type) || [];
    list.push(question);
    queues.set(type, list);
  });

  const ordered = [];
  typePlan.forEach((type) => {
    const queue = queues.get(type) || [];
    if (queue.length > 0) {
      ordered.push(queue.shift());
    }
  });

  queues.forEach((queue) => {
    while (queue.length > 0) {
      ordered.push(queue.shift());
    }
  });

  return ordered;
};

const createModuleGenerationInstructions = (sourceSnapshot) => {
  const serializedSource = JSON.stringify(sourceSnapshot, null, 2);
  const compactSource = serializedSource.length > MAX_MODULE_SOURCE_LENGTH
    ? `${serializedSource.slice(0, MAX_MODULE_SOURCE_LENGTH).trimEnd()}\n...`
    : serializedSource;

  return [
    'Use only the module source data below.',
    `The current module being edited is: ${sourceSnapshot?.moduleTitle || 'the selected module'}.`,
    'Do not use content, terms, answers, or ideas from any other module.',
    'Base every question on the provided lesson text, section content, subtopics, and image information only.',
    'Treat image information as educational evidence when alt text, captions, names, or nearby lesson text describe meaningful learning content.',
    'If an image clearly supports a concept, you may create an image-based question that refers to that visual content.',
    'Do not introduce outside facts, unrelated examples, or topics not supported by the module source data.',
    'Make each question answerable from the provided module source.',
    'Generate unique questions with unique wording.',
    'Do not repeat the same correct answer, the same choice set, or the same concept focus across the batch when the module provides enough material.',
    'When generating 5 questions, spread them across different sections, topics, subtopics, or image-supported concepts whenever possible.',
    'When generating multiple questions for an assessment, rotate across these available question types whenever possible: Multiple Choice, True / False, Identification, Essay.',
    'For a mixed batch, prefer a sequence like: Multiple Choice, True / False, Identification, Essay, then repeat.',
    sourceSnapshot?.coverageTargets?.length
      ? `Prefer covering different targets from this module: ${sourceSnapshot.coverageTargets.join(' | ')}.`
      : '',
    '',
    'Module source data:',
    compactSource,
  ].join('\n');
};

const getQuestionGenerationMaterial = async (user, materialId) => {
  if (typeof materialId !== 'string' || !materialId.trim()) {
    return null;
  }

  const material = await prisma.learningMaterial.findUnique({
    where: { id: materialId.trim() },
  });

  if (!material) {
    return null;
  }

  if (user?.role === 'TEACHER' && material.teacherId !== user.id) {
    const error = new Error('You can only generate questions for your own learning materials.');
    error.status = 403;
    throw error;
  }

  return material;
};

const generateAiQuestion = async (req, res, next) => {
  try {
    const {
      materialId,
      topic,
      difficulty = 'medium',
      gradeLevel = '',
      questionType = 'mixed',
      language = 'English',
      instructions = '',
      choicesCount = 4,
      questionCount = 5,
    } = req.body || {};

    const material = await getQuestionGenerationMaterial(req.user, materialId);
    const hasTopic = typeof topic === 'string' && topic.trim();

    if (!material && !hasTopic) {
      return res.status(400).json(errorResponse('Topic or materialId is required.'));
    }

    const normalizedDifficulty = String(difficulty || 'medium').trim().toLowerCase();
    if (!ALLOWED_DIFFICULTIES.has(normalizedDifficulty)) {
      return res.status(400).json(errorResponse('Difficulty must be one of: easy, medium, hard.'));
    }

    const normalizedChoicesCount = Number.parseInt(choicesCount, 10);
    if (!Number.isInteger(normalizedChoicesCount) || normalizedChoicesCount < 2 || normalizedChoicesCount > 6) {
      return res.status(400).json(errorResponse('choicesCount must be an integer between 2 and 6.'));
    }

    const normalizedQuestionCount = Number.parseInt(questionCount, 10);
    if (!Number.isInteger(normalizedQuestionCount) || normalizedQuestionCount < 1 || normalizedQuestionCount > 20) {
      return res.status(400).json(errorResponse('questionCount must be an integer between 1 and 20.'));
    }

    if (typeof instructions !== 'string') {
      return res.status(400).json(errorResponse('instructions must be a string when provided.'));
    }

    if (instructions.length > 1000) {
      return res.status(400).json(errorResponse('instructions cannot exceed 1000 characters.'));
    }

    const sourceSnapshot = material
      ? buildMaterialQuestionGenerationSource(material)
      : null;
    const compiledInstructions = [
      instructions.trim(),
      sourceSnapshot ? createModuleGenerationInstructions(sourceSnapshot) : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const normalizedQuestionType = material
      ? 'mixed'
      : normalizeRequestedQuestionType(questionType);
    const generationTopic = material?.title?.trim() || topic.trim();
    const generationGradeLevel = material?.section?.trim() || (typeof gradeLevel === 'string' ? gradeLevel.trim() : '');
    const generationLanguage = typeof language === 'string' && language.trim() ? language.trim() : 'English';

    let payload;

    if (normalizedQuestionType === 'mixed' && normalizedQuestionCount > 1) {
      const typePlan = buildQuestionTypePlan(normalizedQuestionCount, normalizedQuestionType);
      const typeCounts = buildQuestionTypeCounts(typePlan);
      const generatedQuestions = [];

      for (const type of ASSESSMENT_QUESTION_TYPE_ROTATION) {
        const countForType = Number(typeCounts[type] || 0);
        if (countForType <= 0) {
          continue;
        }

        const batchInstructions = [
          compiledInstructions,
          `Generate exactly ${countForType} ${type.replace(/_/g, ' ')} question${countForType === 1 ? '' : 's'} for this batch.`,
          buildBatchExclusionInstructions(generatedQuestions),
        ]
          .filter(Boolean)
          .join('\n\n');

        const batchPayload = await generateQuestionWithGemini({
          topic: generationTopic,
          difficulty: normalizedDifficulty,
          gradeLevel: generationGradeLevel,
          questionType: type,
          language: generationLanguage,
          instructions: batchInstructions,
          choicesCount: normalizedChoicesCount,
          questionCount: countForType,
        });

        generatedQuestions.push(...(Array.isArray(batchPayload?.questions) ? batchPayload.questions : []));
      }

      payload = {
        questions: reorderQuestionsByTypePlan(generatedQuestions, typePlan).slice(0, normalizedQuestionCount),
        requestedQuestionCount: normalizedQuestionCount,
        generatedQuestionCount: normalizedQuestionCount,
        raw: { questions: generatedQuestions },
        model: generatedQuestions[0]?.model || null,
      };
    } else {
      payload = await generateQuestionWithGemini({
        topic: generationTopic,
        difficulty: normalizedDifficulty,
        gradeLevel: generationGradeLevel,
        questionType: normalizedQuestionType,
        language: generationLanguage,
        instructions: compiledInstructions,
        choicesCount: normalizedChoicesCount,
        questionCount: normalizedQuestionCount,
      });
    }

    return res.status(200).json(
      successResponse(
        {
          ...payload,
          sourceMaterial: material
            ? {
              id: material.id,
              title: material.title,
            }
            : null,
        },
        'AI questions generated successfully.',
      ),
    );
  } catch (error) {
    return next(error);
  }
};

const getAiControlSettings = async (req, res, next) => {
  try {
    const controlState = await getAiControlState();

    return res.status(200).json(
      successResponse(controlState, 'AI control settings retrieved successfully.'),
    );
  } catch (error) {
    return next(error);
  }
};

const updateAiControlSettings = async (req, res, next) => {
  try {
    const { aiEnabled } = req.body || {};

    if (typeof aiEnabled !== 'boolean') {
      return res.status(400).json(errorResponse('aiEnabled must be a boolean.'));
    }

    const controlState = await setAiEnabled(aiEnabled, {
      updatedByUserId: req.user?.id || null,
    });

    return res.status(200).json(
      successResponse(
        controlState,
        aiEnabled
          ? 'AI generation has been enabled for the system.'
          : 'AI generation has been disabled for the system.',
      ),
    );
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  generateAiQuestion,
  getAiControlSettings,
  updateAiControlSettings,
};
