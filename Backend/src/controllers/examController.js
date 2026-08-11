const { 
  successResponse,
  errorResponse,
  getPaginationData,
  generateExamCode
} = require('../utils/helpers');
const prisma = require('../lib/prisma');
const {
  DEFAULT_XP_REWARD,
  DEFAULT_COIN_REWARD,
  getStudentMaterialDetail,
} = require('../services/learningMaterialService');

const DEFAULT_PASSING_SCORE = 90;
const DEFAULT_QUESTION_POINTS = 10;
const QUESTION_TYPE_LABELS = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  identification: 'Identification',
};

const normalizeOptionalText = (value, maxLength) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
};

const normalizePassingScore = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_PASSING_SCORE;
  }

  return Math.max(DEFAULT_PASSING_SCORE, Math.min(100, parsed));
};

const normalizeQuestionType = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'essay') {
    return 'identification';
  }
  if (['multiple_choice', 'true_false', 'identification'].includes(normalized)) {
    return normalized;
  }

  return 'multiple_choice';
};

const normalizeQuestionOptions = (type, options = []) => {
  if (type === 'multiple_choice') {
    const normalized = Array.isArray(options)
      ? options
        .map((option) => String(option || '').trim())
        .filter(Boolean)
        .slice(0, 8)
      : [];

    return normalized.length >= 2 ? normalized : ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
  }

  if (type === 'true_false') {
    return ['True', 'False'];
  }

  return null;
};

const parseStoredQuestionOptions = (options) => {
  if (Array.isArray(options)) {
    return options.map((option) => String(option || '').trim()).filter(Boolean);
  }

  const storedValue = String(options || '').trim();
  if (!storedValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedValue);
    if (Array.isArray(parsed)) {
      return parsed.map((option) => String(option || '').trim()).filter(Boolean);
    }
  } catch {
    // Older databases may store choices as newline- or comma-separated text.
  }

  return storedValue
    .split(/\r?\n|\s*\|\s*|\s*,\s*/)
    .map((option) => option.trim())
    .filter(Boolean);
};

const normalizeCorrectAnswer = (type, correctAnswer, options) => {
  const normalizedAnswer = String(correctAnswer || '').trim();

  if (type === 'multiple_choice') {
    if (normalizedAnswer && options.includes(normalizedAnswer)) {
      return normalizedAnswer;
    }

    return options[0] || '';
  }

  if (type === 'true_false') {
    return normalizedAnswer.toLowerCase() === 'false' ? 'False' : 'True';
  }

  return normalizedAnswer;
};

const normalizeQuestionPayload = (question = {}, index = 0) => {
  const type = normalizeQuestionType(question.type);
  const options = normalizeQuestionOptions(type, question.options);
  const prompt = String(question.question || question.prompt || '').trim() || `Question ${index + 1}`;
  const correctAnswer = normalizeCorrectAnswer(type, question.correctAnswer, options || []);

  return {
    question: prompt.slice(0, 1000),
    options,
    correctAnswer: correctAnswer.slice(0, 500),
    type,
    marks: DEFAULT_QUESTION_POINTS,
  };
};

const serializeQuestion = (question) => ({
  id: question.id,
  question: question.question,
  prompt: question.question,
  options: parseStoredQuestionOptions(question.options),
  correctAnswer: question.correctAnswer,
  type: normalizeQuestionType(question.type),
  typeLabel: QUESTION_TYPE_LABELS[normalizeQuestionType(question.type)] || QUESTION_TYPE_LABELS.multiple_choice,
  marks: DEFAULT_QUESTION_POINTS,
  points: DEFAULT_QUESTION_POINTS,
});

const serializeAssessment = (exam, material) => {
  const questions = Array.isArray(exam?.questions) ? exam.questions.map(serializeQuestion) : [];
  const totalPoints = questions.length * DEFAULT_QUESTION_POINTS;

  return {
    id: exam?.id || null,
    title: exam?.title || `${material?.title || 'Learning Material'} Assessment`,
    description: exam?.description || '',
    status: exam?.isActive === false ? 'DRAFT' : 'PUBLISHED',
    passingScore: normalizePassingScore(exam?.passingScore),
    timeLimit: Number(exam?.timeLimit || 30),
    xpReward: Number(exam?.xpReward || DEFAULT_XP_REWARD),
    coinReward: Number(exam?.coinReward || DEFAULT_COIN_REWARD),
    totalPoints,
    totalQuestions: questions.length,
    shuffleQuestions: exam?.shuffleQuestions !== false,
    showResultsToStudents: exam?.showResultsToStudents !== false,
    questions,
    material: material ? {
      id: material.id,
      title: material.title,
      section: material.section,
      subject: material.subject,
      materialType: material.materialType,
      materialTypeLabel: material.materialTypeLabel,
    } : null,
  };
};

const assertTeacherOwnsMaterial = async (teacherId, materialId) => {
  const material = await prisma.learningMaterial.findUnique({
    where: { id: materialId },
  });

  if (!material || material.teacherId !== teacherId) {
    return null;
  }

  return material;
};

const normalizeStudentAnswer = (value) => String(value ?? '').trim();

const isAnswerCorrect = (question, selectedAnswer) => {
  const normalizedAnswer = normalizeStudentAnswer(selectedAnswer);
  const correctAnswer = String(question.correctAnswer || '').trim();

  if (question.type === 'identification' || question.type === 'essay') {
    return normalizedAnswer.toLowerCase() === correctAnswer.toLowerCase();
  }

  return normalizedAnswer === correctAnswer;
};

const serializeQuizQuestion = (question, index) => ({
  id: question.id,
  prompt: question.question,
  question: question.question,
  options: parseStoredQuestionOptions(question.options),
  type: question.type,
  points: DEFAULT_QUESTION_POINTS,
  order: index,
});

const shuffleArray = (items = []) => {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }

  return clone;
};

const getTeacherAssessmentProgress = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(errorResponse('Only teachers can view assessment progress'));
    }

    const students = await prisma.user.findMany({
      where: {
        teacherId: req.user.id,
        role: 'STUDENT',
        isArchived: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        section: true,
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    const studentIds = students.map((student) => student.id);

    const materials = await prisma.learningMaterial.findMany({
      where: { teacherId: req.user.id },
      include: {
        assessment: {
          include: {
            questions: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        progressRecords: {
          where: {
            studentId: {
              in: studentIds.length > 0 ? studentIds : [''],
            },
          },
        },
      },
      orderBy: [
        { createdAt: 'asc' },
        { title: 'asc' },
      ],
    });

    const attempts = studentIds.length > 0
      ? await prisma.learningMaterialQuizAttempt.findMany({
        where: {
          studentId: { in: studentIds },
          material: { teacherId: req.user.id },
        },
        orderBy: { createdAt: 'desc' },
      })
      : [];

    const latestAttemptByKey = new Map();
    attempts.forEach((attempt) => {
      const key = `${attempt.studentId}:${attempt.materialId}`;
      if (!latestAttemptByKey.has(key)) {
        latestAttemptByKey.set(key, attempt);
      }
    });

    const progressByKey = new Map();
    materials.forEach((material) => {
      material.progressRecords.forEach((progress) => {
        progressByKey.set(`${progress.studentId}:${material.id}`, progress);
      });
    });

    const serializedMaterials = materials.map((material) => ({
      id: material.id,
      title: material.assessment?.title || `${material.title} Quiz`,
      module: material.title,
      questionCount: Array.isArray(material.assessment?.questions) ? material.assessment.questions.length : 0,
      passingScore: normalizePassingScore(material.assessment?.passingScore),
      section: material.section,
      subject: material.subject || '',
    }));

    const serializedStudents = students.map((student) => {
      const assessmentRows = serializedMaterials.map((material) => {
        const key = `${student.id}:${material.id}`;
        const progress = progressByKey.get(key) || null;
        const latestAttempt = latestAttemptByKey.get(key) || null;
        const percentage = Number(progress?.latestQuizScore ?? latestAttempt?.percentage ?? 0);
        const completed = progress?.status === 'COMPLETED';
        const attempted = Boolean(latestAttempt) || progress?.status === 'IN_PROGRESS' || completed;
        const score = latestAttempt ? Number(latestAttempt.correctCount || 0) : 0;
        const totalQuestions = Number(latestAttempt?.totalQuestions || material.questionCount || 0);
        const stars = attempted ? Math.max(0, Math.min(5, Math.round(percentage / 20))) : 0;

        return {
          id: material.id,
          assessmentTitle: material.title,
          module: material.module,
          totalQuestions,
          score,
          percentage,
          stars,
          passed: completed,
          status: completed ? 'Completed' : attempted ? 'Failed' : 'Not Attempted',
          attemptedAt: latestAttempt?.createdAt || progress?.completedAt || progress?.lastViewedAt || null,
        };
      });

      const completedRows = assessmentRows.filter((row) => row.passed);
      const attemptedRows = assessmentRows.filter((row) => row.status !== 'Not Attempted');
      const averageScore = attemptedRows.length > 0
        ? Math.round(attemptedRows.reduce((sum, row) => sum + row.percentage, 0) / attemptedRows.length)
        : 0;

      return {
        ...student,
        assessmentRows,
        metrics: {
          progressPercent: serializedMaterials.length > 0
            ? Number(((completedRows.length / serializedMaterials.length) * 100).toFixed(2))
            : 0,
        },
      };
    });

    return res.status(200).json(
      successResponse(
        {
          materials: serializedMaterials,
          students: serializedStudents,
        },
        'Assessment progress retrieved successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

// Get all exams (with pagination and filtering)
const getExams = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;
    
    const where = {};
    
    // Apply role-based filtering
    if (req.user.role === 'TEACHER') {
      where.teacherId = req.user.id;
    } else if (req.user.role === 'STUDENT') {
      where.students = {
        some: {
          id: req.user.id
        }
      };
    }
    
    // Apply other filters
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { examCode: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count
    const totalCount = await prisma.exam.count({ where });
    
    // Get pagination data
    const paginationData = getPaginationData(page, limit, totalCount);
    
    // Get exams
    const exams = await prisma.exam.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            students: true,
            scores: true,
            questions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: paginationData.offset,
      take: paginationData.limit
    });

    res.status(200).json(
      successResponse(
        {
          exams,
          ...paginationData.pagination
        },
        'Exams retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

// Get exam by ID
const getExamById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        students: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        questions: {
          select: {
            id: true,
            question: true,
            options: true,
            type: true,
            marks: true,
            ...(req.user.role === 'TEACHER' && { correctAnswer: true })
          }
        },
        scores: {
          include: {
            student: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!exam) {
      return res.status(404).json(
        errorResponse('Exam not found')
      );
    }

    // Check access permissions
    if (req.user.role === 'TEACHER' && exam.teacherId !== req.user.id) {
      return res.status(403).json(
        errorResponse('You can only access your own exams')
      );
    } else if (req.user.role === 'STUDENT') {
      // Check if student is enrolled in the exam
      const isEnrolled = exam.students.some(student => student.id === req.user.id);
      if (!isEnrolled) {
        return res.status(403).json(
          errorResponse('You are not enrolled in this exam')
        );
      }
    }

    res.status(200).json(
      successResponse(
        exam,
        'Exam retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

// Get exam by code (for students to join)
const getExamByCode = async (req, res, next) => {
  try {
    const { examCode } = req.params;
    
    const exam = await prisma.exam.findUnique({
      where: { 
        examCode: examCode.toUpperCase(),
        isActive: true
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            questions: true,
            students: true
          }
        }
      }
    });

    if (!exam) {
      return res.status(404).json(
        errorResponse('Invalid exam code or exam is not active')
      );
    }

    // Don't include questions or sensitive data for preview
    res.status(200).json(
      successResponse(
        {
          id: exam.id,
          title: exam.title,
          description: exam.description,
          examCode: exam.examCode,
          timeLimit: exam.timeLimit,
          totalMarks: exam.totalMarks,
          passingScore: exam.passingScore,
          shuffleQuestions: exam.shuffleQuestions,
          showResultsToStudents: exam.showResultsToStudents,
          teacher: exam.teacher,
          questionCount: exam._count.questions,
          studentCount: exam._count.students
        },
        'Exam found successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

// Create new exam (teachers only)
const createExam = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(
        errorResponse('Only teachers can create exams')
      );
    }

    const {
      title,
      description,
      timeLimit,
      totalMarks,
    passingScore,
    xpReward,
    coinReward,
    shuffleQuestions,
      showResultsToStudents,
      learningMaterialId,
    } = req.body;
    
    // Generate unique exam code
    let examCode;
    let isUnique = false;
    
    while (!isUnique) {
      examCode = generateExamCode();
      const existing = await prisma.exam.findUnique({
        where: { examCode }
      });
      isUnique = !existing;
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        description: description || null,
        examCode,
        timeLimit: timeLimit || null,
        totalMarks: totalMarks || 0,
        passingScore: Number.isInteger(passingScore) ? passingScore : DEFAULT_PASSING_SCORE,
        xpReward: Number.isInteger(xpReward) ? xpReward : DEFAULT_XP_REWARD,
        coinReward: Number.isInteger(coinReward) ? coinReward : DEFAULT_COIN_REWARD,
        shuffleQuestions: shuffleQuestions !== false,
        showResultsToStudents: showResultsToStudents !== false,
        learningMaterialId: learningMaterialId || null,
        teacherId: req.user.id
      },
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json(
      successResponse(
        exam,
        'Exam created successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

// Update exam
const updateExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      timeLimit,
      totalMarks,
      isActive,
      passingScore,
      xpReward,
      coinReward,
      shuffleQuestions,
      showResultsToStudents,
      learningMaterialId,
    } = req.body;
    
    // Find exam
    const exam = await prisma.exam.findUnique({
      where: { id }
    });

    if (!exam) {
      return res.status(404).json(
        errorResponse('Exam not found')
      );
    }

    // Check permissions
    if (req.user.role !== 'SUPER_ADMIN' && exam.teacherId !== req.user.id) {
      return res.status(403).json(
        errorResponse('You can only update your own exams')
      );
    }

    const updatedExam = await prisma.exam.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(timeLimit !== undefined && { timeLimit }),
        ...(totalMarks !== undefined && { totalMarks }),
        ...(isActive !== undefined && { isActive }),
        ...(passingScore !== undefined && { passingScore }),
        ...(xpReward !== undefined && { xpReward }),
        ...(coinReward !== undefined && { coinReward }),
        ...(shuffleQuestions !== undefined && { shuffleQuestions }),
        ...(showResultsToStudents !== undefined && { showResultsToStudents }),
        ...(learningMaterialId !== undefined && { learningMaterialId })
      },
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            questions: true,
            students: true,
            scores: true
          }
        }
      }
    });

    res.status(200).json(
      successResponse(
        updatedExam,
        'Exam updated successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

// Delete exam
const deleteExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find exam
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            scores: true
          }
        }
      }
    });

    if (!exam) {
      return res.status(404).json(
        errorResponse('Exam not found')
      );
    }

    // Check permissions
    if (req.user.role !== 'SUPER_ADMIN' && exam.teacherId !== req.user.id) {
      return res.status(403).json(
        errorResponse('You can only delete your own exams')
      );
    }

    // Check if exam has scores (completed attempts)
    if (exam._count.scores > 0) {
      return res.status(400).json(
        errorResponse('Cannot delete exam with existing student scores')
      );
    }

    await prisma.exam.delete({
      where: { id }
    });

    res.status(200).json(
      successResponse(
        null,
        'Exam deleted successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

// Join exam (students)
const joinExam = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(
        errorResponse('Only students can join exams')
      );
    }

    const { examCode } = req.body;
    
    const exam = await prisma.exam.findUnique({
      where: { 
        examCode: examCode.toUpperCase(),
        isActive: true
      }
    });

    if (!exam) {
      return res.status(404).json(
        errorResponse('Invalid exam code or exam is not active')
      );
    }

    // Check if already joined
    const existingEnrollment = await prisma.exam.findFirst({
      where: {
        id: exam.id,
        students: {
          some: {
            id: req.user.id
          }
        }
      }
    });

    if (existingEnrollment) {
      return res.status(400).json(
        errorResponse('You are already enrolled in this exam')
      );
    }

    // Add student to exam
    const updatedExam = await prisma.exam.update({
      where: { id: exam.id },
      data: {
        students: {
          connect: { id: req.user.id }
        }
      },
      include: {
        teacher: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(200).json(
      successResponse(
        {
          id: exam.id,
          title: exam.title,
          description: exam.description,
          examCode: exam.examCode,
          timeLimit: exam.timeLimit,
          teacher: updatedExam.teacher
        },
        'Successfully joined the exam'
      )
    );
  } catch (error) {
    next(error);
  }
};

// Get exam statistics (for teachers)
const getExamStatistics = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        scores: {
          include: {
            student: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { percentage: 'desc' }
        },
        _count: {
          select: {
            students: true,
            questions: true
          }
        }
      }
    });

    if (!exam) {
      return res.status(404).json(
        errorResponse('Exam not found')
      );
    }

    // Check permissions
    if (req.user.role === 'TEACHER' && exam.teacherId !== req.user.id) {
      return res.status(403).json(
        errorResponse('You can only view statistics for your own exams')
      );
    }

    // Calculate statistics
    const scores = exam.scores.map(score => score.percentage);
    const statistics = {
      totalStudents: exam._count.students,
      completedAttempts: exam.scores.length,
      completionRate: exam._count.students > 0 
        ? ((exam.scores.length / exam._count.students) * 100).toFixed(2)
        : 0,
      averageScore: scores.length > 0 
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
        : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      questionCount: exam._count.questions
    };

    res.status(200).json(
      successResponse(
        {
          exam: {
            id: exam.id,
            title: exam.title,
            examCode: exam.examCode,
            totalMarks: exam.totalMarks
          },
          statistics,
          scores: exam.scores
        },
        'Exam statistics retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

const getAssessmentByMaterial = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(
        errorResponse('Only teachers can manage assessments')
      );
    }

    const material = await assertTeacherOwnsMaterial(req.user.id, req.params.materialId);
    if (!material) {
      return res.status(404).json(
        errorResponse('Learning material not found')
      );
    }

    const exam = await prisma.exam.findFirst({
      where: {
        teacherId: req.user.id,
        learningMaterialId: material.id,
      },
      include: {
        questions: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    res.status(200).json(
      successResponse(
        {
          assessment: serializeAssessment(exam, {
            ...material,
            materialTypeLabel: String(material.materialType || '').replace('_', ' ')
          })
        },
        'Assessment retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

const upsertAssessmentByMaterial = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(
        errorResponse('Only teachers can manage assessments')
      );
    }

    const material = await assertTeacherOwnsMaterial(req.user.id, req.params.materialId);
    if (!material) {
      return res.status(404).json(
        errorResponse('Learning material not found')
      );
    }

    const title = String(req.body?.title || '').trim() || `${material.title} Assessment`;
    const description = normalizeOptionalText(req.body?.description, 500);
    const status = String(req.body?.status || 'PUBLISHED').trim().toUpperCase() === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
    const timeLimit = Math.max(1, Math.min(480, Number.parseInt(req.body?.timeLimit, 10) || 30));
    const passingScore = normalizePassingScore(req.body?.passingScore);
    const xpReward = Math.max(0, Number.parseInt(req.body?.xpReward, 10) || DEFAULT_XP_REWARD);
    const coinReward = Math.max(0, Number.parseInt(req.body?.coinReward, 10) || DEFAULT_COIN_REWARD);
    const shuffleQuestions = req.body?.shuffleQuestions !== false;
    const showResultsToStudents = req.body?.showResultsToStudents !== false;
    const normalizedQuestions = Array.isArray(req.body?.questions)
      ? req.body.questions.map((question, index) => normalizeQuestionPayload(question, index))
      : [];
    const totalMarks = normalizedQuestions.reduce((sum, question) => sum + question.marks, 0);

    const savedExam = await prisma.$transaction(async (tx) => {
      const existingExam = await tx.exam.findFirst({
        where: {
          teacherId: req.user.id,
          learningMaterialId: material.id,
        },
      });

      let examCode = existingExam?.examCode || null;
      while (!examCode) {
        const candidate = generateExamCode();
        const duplicate = await tx.exam.findUnique({
          where: { examCode: candidate }
        });
        if (!duplicate) {
          examCode = candidate;
        }
      }

      const exam = existingExam
        ? await tx.exam.update({
          where: { id: existingExam.id },
          data: {
            title: title.slice(0, 100),
            description,
            timeLimit,
            totalMarks,
            passingScore,
            xpReward,
            coinReward,
            shuffleQuestions,
            showResultsToStudents,
            isActive: status === 'PUBLISHED',
          },
        })
        : await tx.exam.create({
          data: {
            title: title.slice(0, 100),
            description,
            examCode,
            timeLimit,
            totalMarks,
            passingScore,
            xpReward,
            coinReward,
            shuffleQuestions,
            showResultsToStudents,
            isActive: status === 'PUBLISHED',
            teacherId: req.user.id,
            learningMaterialId: material.id,
          },
        });

      await tx.question.deleteMany({
        where: { examId: exam.id }
      });

      if (normalizedQuestions.length > 0) {
        await tx.question.createMany({
          data: normalizedQuestions.map((question) => ({
            examId: exam.id,
            question: question.question,
            options: question.options || undefined,
            correctAnswer: question.correctAnswer,
            type: question.type,
            marks: question.marks,
          }))
        });
      }

      return tx.exam.findUnique({
        where: { id: exam.id },
        include: {
          questions: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });
    });

    res.status(200).json(
      successResponse(
        {
          assessment: serializeAssessment(savedExam, {
            ...material,
            materialTypeLabel: String(material.materialType || '').replace('_', ' ')
          })
        },
        'Assessment saved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

const getStudentQuizByMaterial = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can view module quizzes'));
    }

    const detail = await getStudentMaterialDetail(req.user.id, req.params.materialId);
    if (!detail.student) {
      return res.status(404).json(errorResponse('Student account not found'));
    }

    const material = detail.material;
    if (!material) {
      return res.status(404).json(errorResponse('Learning material not found'));
    }

    if (material.isLocked) {
      return res.status(403).json(errorResponse('Complete the previous module first to unlock this quiz'));
    }

    const exam = await prisma.exam.findFirst({
      where: {
        learningMaterialId: material.id,
        teacherId: detail.student.teacherId || undefined,
      },
      include: {
        questions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!exam || exam.isActive === false) {
      return res.status(404).json(errorResponse('Quiz is not available for this module yet'));
    }

    if (!Array.isArray(exam.questions) || exam.questions.length === 0) {
      return res.status(400).json(errorResponse('The teacher has not added quiz questions for this module yet'));
    }

    const orderedQuestions = exam.shuffleQuestions === false
      ? exam.questions
      : shuffleArray(exam.questions);

    return res.status(200).json(
      successResponse(
        {
          quiz: {
            id: exam.id,
            title: exam.title,
            materialId: material.id,
            moduleTitle: material.title,
            passingScore: normalizePassingScore(exam.passingScore),
            timeLimit: Number(exam.timeLimit || 30),
            totalQuestions: orderedQuestions.length,
            totalPoints: Number(exam.totalMarks || 0),
            xpReward: Number(exam.xpReward || DEFAULT_XP_REWARD),
            coinReward: Number(exam.coinReward || DEFAULT_COIN_REWARD),
            questions: orderedQuestions.map(serializeQuizQuestion),
            progress: material.progress,
            outline: material.outline,
          },
        },
        'Quiz retrieved successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

const submitStudentQuizByMaterial = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can submit module quizzes'));
    }

    const detail = await getStudentMaterialDetail(req.user.id, req.params.materialId);
    if (!detail.student) {
      return res.status(404).json(errorResponse('Student account not found'));
    }

    const material = detail.material;
    if (!material) {
      return res.status(404).json(errorResponse('Learning material not found'));
    }

    if (material.isLocked) {
      return res.status(403).json(errorResponse('This quiz is still locked'));
    }

    const exam = await prisma.exam.findFirst({
      where: {
        learningMaterialId: material.id,
      },
      include: {
        questions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!exam || exam.isActive === false || !Array.isArray(exam.questions) || exam.questions.length === 0) {
      return res.status(400).json(errorResponse('Quiz is not ready for this module yet'));
    }

    const submittedAnswers = req.body?.answers && typeof req.body.answers === 'object'
      ? req.body.answers
      : {};
    const timeTakenSeconds = Math.max(0, Number.parseInt(req.body?.timeTakenSeconds, 10) || 0);
    const totalMarks = exam.questions.length * DEFAULT_QUESTION_POINTS;

    const reviewedQuestions = exam.questions.map((question) => {
      const selectedAnswer = normalizeStudentAnswer(submittedAnswers[question.id]);
      const correct = isAnswerCorrect(question, selectedAnswer);

      return {
        questionId: question.id,
        prompt: question.question,
        type: question.type,
        options: parseStoredQuestionOptions(question.options),
        selectedAnswer,
        correctAnswer: question.correctAnswer,
        correct,
        points: DEFAULT_QUESTION_POINTS,
      };
    });

    const correctCount = reviewedQuestions.filter((question) => question.correct).length;
    const obtainedMarks = reviewedQuestions.reduce((sum, question) => (
      sum + (question.correct ? question.points : 0)
    ), 0);
    const percentage = totalMarks > 0
      ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2))
      : 0;
    const passed = percentage >= normalizePassingScore(exam.passingScore);
    const previousCompletion = material.progress.status === 'COMPLETED';
    const xpReward = passed && !previousCompletion ? Number(exam.xpReward || DEFAULT_XP_REWARD) : 0;
    const coinReward = passed && !previousCompletion ? Number(exam.coinReward || DEFAULT_COIN_REWARD) : 0;
    const outlineCount = Number(material.outlineCount || material.outlineItems?.length || 0);

    const savedResult = await prisma.$transaction(async (tx) => {
      const score = await tx.score.create({
        data: {
          totalMarks,
          obtainedMarks,
          percentage,
          timeTaken: Math.max(0, Math.round(timeTakenSeconds / 60)),
          studentId: req.user.id,
          examId: exam.id,
        },
      });

      const attempt = await tx.learningMaterialQuizAttempt.create({
        data: {
          studentId: req.user.id,
          materialId: material.id,
          examId: exam.id,
          scoreId: score.id,
          answersJson: reviewedQuestions,
          correctCount,
          totalQuestions: reviewedQuestions.length,
          percentage,
          passed,
          timeTakenSeconds,
          xpReward,
          coinReward,
        },
      });

      const progress = await tx.learningMaterialProgress.upsert({
        where: {
          studentId_materialId: {
            studentId: req.user.id,
            materialId: material.id,
          },
        },
        create: {
          studentId: req.user.id,
          materialId: material.id,
          status: passed ? 'COMPLETED' : 'IN_PROGRESS',
          progressPercent: passed ? 100 : Math.max(0, Number(material.progress.percent || 0)),
          currentOutlineIndex: passed ? Math.max(outlineCount - 1, 0) : Number(material.progress.currentOutlineIndex || 0),
          outlineCount,
          timeSpentSeconds: Number(material.progress.timeSpentSeconds || 0),
          startedAt: material.progress.startedAt || new Date(),
          lastViewedAt: new Date(),
          completedAt: passed ? new Date() : null,
          latestQuizScore: percentage,
          latestQuizAttemptId: attempt.id,
          xpEarned: xpReward,
          coinsEarned: coinReward,
        },
        update: {
          status: passed ? 'COMPLETED' : 'IN_PROGRESS',
          progressPercent: passed ? 100 : Math.max(Number(material.progress.percent || 0), 0),
          currentOutlineIndex: passed
            ? Math.max(outlineCount - 1, Number(material.progress.currentOutlineIndex || 0))
            : Number(material.progress.currentOutlineIndex || 0),
          outlineCount,
          lastViewedAt: new Date(),
          completedAt: passed ? new Date() : null,
          latestQuizScore: percentage,
          latestQuizAttemptId: attempt.id,
          xpEarned: previousCompletion ? Number(material.progress.xpEarned || 0) : { increment: xpReward },
          coinsEarned: previousCompletion ? Number(material.progress.coinsEarned || 0) : { increment: coinReward },
        },
      });

      return { score, attempt, progress };
    });

    const refreshedDetail = await getStudentMaterialDetail(req.user.id, material.id);
    const currentIndex = refreshedDetail.materials.findIndex((entry) => entry.id === material.id);
    const nextMaterial = currentIndex >= 0 ? refreshedDetail.materials[currentIndex + 1] || null : null;

    return res.status(200).json(
      successResponse(
        {
          result: {
            attemptId: savedResult.attempt.id,
            quizId: exam.id,
            materialId: material.id,
            moduleTitle: material.title,
            quizTitle: exam.title,
            passed,
            status: passed ? 'PASSED' : 'FAILED',
            finalScore: obtainedMarks,
            totalMarks,
            percentage,
            correctCount,
            totalQuestions: reviewedQuestions.length,
            passingScore: normalizePassingScore(exam.passingScore),
            timeTakenSeconds,
            xpReward,
            coinReward,
            review: reviewedQuestions,
            nextMaterialId: passed ? nextMaterial?.id || null : null,
            nextMaterialTitle: passed ? nextMaterial?.title || null : null,
            progress: {
              status: savedResult.progress.status,
              percent: savedResult.progress.progressPercent,
              xpEarned: savedResult.progress.xpEarned,
              coinsEarned: savedResult.progress.coinsEarned,
            },
          },
        },
        'Quiz submitted successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

const getStudentQuizAttemptResult = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(errorResponse('Only students can view quiz results'));
    }

    const attempt = await prisma.learningMaterialQuizAttempt.findUnique({
      where: { id: req.params.attemptId },
      include: {
        material: true,
        exam: true,
      },
    });

    if (!attempt || attempt.studentId !== req.user.id || attempt.materialId !== req.params.materialId) {
      return res.status(404).json(errorResponse('Quiz result not found'));
    }

    const review = Array.isArray(attempt.answersJson) ? attempt.answersJson : [];
    const obtainedMarks = review.reduce((sum, item) => (
      sum + (item?.correct ? Number(item.points || 0) : 0)
    ), 0);
    const totalMarks = review.reduce((sum, item) => sum + Number(item?.points || 0), 0);

    return res.status(200).json(
      successResponse(
        {
          result: {
            attemptId: attempt.id,
            quizId: attempt.examId,
            materialId: attempt.materialId,
            moduleTitle: attempt.material.title,
            quizTitle: attempt.exam.title,
            passed: attempt.passed,
            status: attempt.passed ? 'PASSED' : 'FAILED',
            finalScore: obtainedMarks,
            totalMarks,
            percentage: Number(attempt.percentage || 0),
            correctCount: attempt.correctCount,
            totalQuestions: attempt.totalQuestions,
            passingScore: normalizePassingScore(attempt.exam.passingScore),
            timeTakenSeconds: attempt.timeTakenSeconds,
            xpReward: attempt.xpReward,
            coinReward: attempt.coinReward,
            review,
            createdAt: attempt.createdAt,
          },
        },
        'Quiz result retrieved successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getExams,
  getExamById,
  getExamByCode,
  createExam,
  updateExam,
  deleteExam,
  joinExam,
  getExamStatistics,
  getAssessmentByMaterial,
  upsertAssessmentByMaterial,
  getTeacherAssessmentProgress,
  getStudentQuizByMaterial,
  submitStudentQuizByMaterial,
  getStudentQuizAttemptResult,
};
