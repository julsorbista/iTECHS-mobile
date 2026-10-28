import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Eye,
  AlertCircle,
  Loader2,
  LogOut,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import { adminAiAPI, examAPI, handleAPIError, userAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

const QUESTION_TYPE_OPTIONS = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'identification', label: 'Identification' },
];

const createOptionLabel = (index) => `Option ${index + 1}`;
const DEFAULT_AI_QUESTION_COUNT = 5;
const DEFAULT_AI_CHOICES_COUNT = 4;
const DEFAULT_PASSING_SCORE = 90;
const DEFAULT_QUESTION_POINTS = 10;

const createEmptyQuestion = (index = 0) => ({
  id: `draft-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
  question: '',
  type: 'multiple_choice',
  points: DEFAULT_QUESTION_POINTS,
  options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
  correctAnswer: 'Option 1',
});

const normalizeQuestionForForm = (question = {}, index = 0) => {
  const type = String(question.type || 'multiple_choice').trim().toLowerCase();
  const options = Array.isArray(question.options)
    ? question.options.map((option) => String(option || '')).filter(Boolean)
    : [];

  if (type === 'true_false') {
    return {
      id: question.id || `draft-${index}`,
      question: String(question.question || ''),
      type,
      points: DEFAULT_QUESTION_POINTS,
      options: ['True', 'False'],
      correctAnswer: String(question.correctAnswer || 'True') === 'False' ? 'False' : 'True',
    };
  }

  if (type === 'multiple_choice') {
    const safeOptions = options.length >= 2 ? options : ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
    return {
      id: question.id || `draft-${index}`,
      question: String(question.question || ''),
      type,
      points: DEFAULT_QUESTION_POINTS,
      options: safeOptions,
      correctAnswer: safeOptions.includes(question.correctAnswer) ? question.correctAnswer : safeOptions[0],
    };
  }

  return {
    id: question.id || `draft-${index}`,
    question: String(question.question || ''),
    type: 'identification',
    points: DEFAULT_QUESTION_POINTS,
    options: [],
    correctAnswer: String(question.correctAnswer || ''),
  };
};

const normalizeGeneratedAiQuestionForForm = (question = {}, index = 0) => {
  const type = String(question.type || question.meta?.questionType || 'multiple_choice')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const rawChoices = Array.isArray(question.choices)
    ? question.choices
    : Array.isArray(question.options)
      ? question.options
      : [];
  const options = rawChoices
    .map((option) => String(option || '').trim())
    .filter(Boolean);
  const candidateAnswer = String(
    question.correctAnswer
    || (Number.isInteger(question.answerIndex) ? options[question.answerIndex] : '')
    || ''
  ).trim();

  return normalizeQuestionForForm({
    id: `ai-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    question: String(question.formattedQuestion || question.question || '').trim(),
    type,
    points: DEFAULT_QUESTION_POINTS,
    options,
    correctAnswer: String(question.correctAnswer || candidateAnswer || '').trim(),
  }, index);
};

const hasMeaningfulQuestionContent = (question = {}) => (
  Boolean(String(question.question || '').trim())
  || Boolean(String(question.correctAnswer || '').trim())
  || (Array.isArray(question.options) && question.options.some((option) => String(option || '').trim()))
);

const getQuestionDeduplicationKey = (question = {}) => (
  [
    String(question.type || 'multiple_choice').trim().toLowerCase(),
    String(question.question || '').trim().toLowerCase(),
    String(question.correctAnswer || '').trim().toLowerCase(),
  ].join('::')
);

const mergeUniqueQuestions = (baseQuestions = [], incomingQuestions = []) => {
  const merged = [...baseQuestions];
  const seenKeys = new Set(baseQuestions.map(getQuestionDeduplicationKey).filter(Boolean));

  incomingQuestions.forEach((question) => {
    const key = getQuestionDeduplicationKey(question);
    if (!key || seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    merged.push(question);
  });

  return merged;
};

const isLegacyTemplateQuestion = (question = {}) => {
  const prompt = String(question.question || '').trim().toLowerCase();
  if (!prompt) {
    return false;
  }

  return [
    'which topic is included in the',
    'which topic is discussed in',
    'which section of',
    'appears under the',
    'is one of the concepts discussed in',
    'which statement best matches the uploaded content of',
    'which statement best describes a lesson from',
    'which statement is supported by the lesson in',
    'which statement best matches the lesson image information in',
    'what is one important concept from',
    'which topic is directly connected to',
    'practice question',
    'practice 1:',
    'practice 2:',
    'practice 3:',
    'practice 4:',
    'practice 5:',
  ].some((pattern) => prompt.includes(pattern));
};

const sanitizeLoadedQuestions = (questions = []) => {
  const normalizedQuestions = Array.isArray(questions)
    ? questions.map((question, index) => normalizeQuestionForForm(question, index))
    : [];

  if (normalizedQuestions.length === 0) {
    return [createEmptyQuestion(0)];
  }

  const filteredQuestions = normalizedQuestions.filter((question) => !isLegacyTemplateQuestion(question));

  if (filteredQuestions.length === 0) {
    return [createEmptyQuestion(0)];
  }

  return filteredQuestions;
};

const navigateToTeacherMaterials = (navigate) => {
  navigate('/teacher', { state: { activeTab: 'materials' } });
};

const getAssessmentDraftStorageKey = (materialId) => `teacher-assessment-draft:${materialId}`;

const loadDraftAssessment = (materialId) => {
  if (!materialId || typeof window === 'undefined') {
    return null;
  }

  try {
    const rawDraft = window.localStorage.getItem(getAssessmentDraftStorageKey(materialId));
    if (!rawDraft) {
      return null;
    }

    const parsedDraft = JSON.parse(rawDraft);
    const questions = sanitizeLoadedQuestions(parsedDraft?.questions);

    return {
      title: String(parsedDraft?.title || '').trim(),
      description: String(parsedDraft?.description || ''),
      status: String(parsedDraft?.status || 'PUBLISHED').trim().toUpperCase() === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
      passingScore: Math.max(DEFAULT_PASSING_SCORE, Math.min(100, Number(parsedDraft?.passingScore || DEFAULT_PASSING_SCORE))),
      timeLimit: Number(parsedDraft?.timeLimit || 30),
      xpReward: Number(parsedDraft?.xpReward || 50),
      coinReward: Number(parsedDraft?.coinReward || 10),
      totalQuestions: Number(parsedDraft?.totalQuestions ?? questions.length ?? 0) || 0,
      totalPoints: Number(parsedDraft?.totalPoints ?? questions.reduce((sum, question) => sum + Number(question.points || 0), 0) ?? 0) || 0,
      shuffleQuestions: parsedDraft?.shuffleQuestions !== false,
      showResultsToStudents: parsedDraft?.showResultsToStudents !== false,
      questions,
    };
  } catch {
    return null;
  }
};

const saveDraftAssessment = (materialId, form) => {
  if (!materialId || typeof window === 'undefined') {
    return false;
  }

  try {
    window.localStorage.setItem(getAssessmentDraftStorageKey(materialId), JSON.stringify(form));
    return true;
  } catch {
    return false;
  }
};

const createDraftAssessmentFromMaterial = (material) => ({
  title: material?.title ? `${material.title} Quiz` : 'New Assessment',
  description: material?.title ? `Assessment for ${material.title}.` : '',
  status: 'PUBLISHED',
  passingScore: DEFAULT_PASSING_SCORE,
  timeLimit: 30,
  xpReward: 50,
  coinReward: 10,
  totalQuestions: 1,
  totalPoints: DEFAULT_QUESTION_POINTS,
  shuffleQuestions: true,
  showResultsToStudents: true,
  questions: [createEmptyQuestion(0)],
});

const buildAssessmentSavePayload = (form) => {
  const totalQuestions = Array.isArray(form?.questions) ? form.questions.length : 0;
  const totalPoints = totalQuestions * DEFAULT_QUESTION_POINTS;

  return {
    title: String(form?.title || '').trim(),
    description: form?.description || '',
    status: form?.status || 'PUBLISHED',
    passingScore: Math.max(DEFAULT_PASSING_SCORE, Math.min(100, Number(form?.passingScore || DEFAULT_PASSING_SCORE))),
    timeLimit: Number(form?.timeLimit || 30),
    xpReward: Number(form?.xpReward || 50),
    coinReward: Number(form?.coinReward || 10),
    totalQuestions,
    totalPoints,
    shuffleQuestions: form?.shuffleQuestions !== false,
    showResultsToStudents: form?.showResultsToStudents !== false,
    questions: Array.isArray(form?.questions)
      ? form.questions.map((question) => ({
        question: question.question,
        type: question.type,
        points: DEFAULT_QUESTION_POINTS,
        options: ['multiple_choice', 'true_false'].includes(question.type) ? question.options : [],
        correctAnswer: question.correctAnswer,
      }))
      : [],
  };
};

const getQuestionValidationIssues = (question = {}) => {
  const issues = [];
  if (!String(question.question || '').trim()) issues.push('Add a question prompt');

  if (question.type === 'multiple_choice') {
    const options = Array.isArray(question.options) ? question.options : [];
    if (options.length < 2 || options.some((option) => !String(option || '').trim())) issues.push('Complete at least two answer options');
    if (!options.includes(question.correctAnswer) || !String(question.correctAnswer || '').trim()) issues.push('Select a correct answer');
  } else if (question.type === 'true_false' && !['True', 'False'].includes(question.correctAnswer)) {
    issues.push('Select True or False');
  } else if (question.type === 'identification' && !String(question.correctAnswer || '').trim()) {
    issues.push('Add the correct answer');
  }

  return issues;
};

const TeacherAssessmentEditorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { materialId } = useParams();
  const { user, logout } = useAuth();
  const initialMaterial = location.state?.material || null;
  const [teacherCourseCode, setTeacherCourseCode] = useState('');
  const [isLoadingCourseCode, setIsLoadingCourseCode] = useState(false);
  const [sidebarStudents, setSidebarStudents] = useState([]);
  const [selectedSidebarStudentId, setSelectedSidebarStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAiQuestions, setIsGeneratingAiQuestions] = useState(false);
  const [material, setMaterial] = useState(initialMaterial);
  const [form, setForm] = useState(createDraftAssessmentFromMaterial(initialMaterial));
  const [questionAuthoringMode, setQuestionAuthoringMode] = useState('manual');
  const [lastSavedFingerprint, setLastSavedFingerprint] = useState('');
  const [showStudentPreview, setShowStudentPreview] = useState(false);

  const calculatedTotalQuestions = form.questions.length;
  const calculatedTotalPoints = useMemo(
    () => form.questions.length * DEFAULT_QUESTION_POINTS,
    [form.questions.length]
  );
  const totalQuestions = calculatedTotalQuestions;
  const totalPoints = calculatedTotalPoints;
  const formFingerprint = useMemo(() => JSON.stringify(buildAssessmentSavePayload(form)), [form]);
  const isDirty = Boolean(lastSavedFingerprint) && formFingerprint !== lastSavedFingerprint;
  const completedQuestionCount = useMemo(
    () => form.questions.filter((question) => getQuestionValidationIssues(question).length === 0).length,
    [form.questions]
  );

  const questionTypeCounts = useMemo(() => {
    const counts = {
      all: form.questions.length,
      multiple_choice: 0,
      true_false: 0,
      identification: 0,
    };

    form.questions.forEach((question) => {
      const type = question.type || 'multiple_choice';
      counts[type] += 1;
    });

    return counts;
  }, [form.questions]);

  const sidebarSummary = useMemo(() => {
    const totalStudents = sidebarStudents.length;
    const totalProgress = sidebarStudents.reduce((sum, student) => (
      sum + Number(student.metrics?.progressPercent || 0)
    ), 0);
    const averageProgress = totalStudents > 0 ? Number((totalProgress / totalStudents).toFixed(2)) : 0;
    const needsSupportCount = sidebarStudents.filter((student) => Number(student.metrics?.progressPercent || 0) < 40).length;

    return {
      totalStudents,
      averageProgress,
      needsSupportCount,
    };
  }, [sidebarStudents]);

  useEffect(() => {
    const loadCourseCode = async () => {
      try {
        setIsLoadingCourseCode(true);
        const response = await userAPI.getMyCourseCode();
        setTeacherCourseCode(response.data?.courseCode || '');
      } catch {
        setTeacherCourseCode('');
      } finally {
        setIsLoadingCourseCode(false);
      }
    };

    loadCourseCode();
  }, []);

  useEffect(() => {
    const loadSidebarStudents = async () => {
      try {
        const response = await userAPI.getMyStudentsRoster();
        const roster = Array.isArray(response.data?.students) ? response.data.students : [];
        setSidebarStudents(roster.slice(0, 12));
        setSelectedSidebarStudentId((current) => current || roster[0]?.id || '');
      } catch {
        setSidebarStudents([]);
      }
    };

    loadSidebarStudents();
  }, []);

  useEffect(() => {
    const loadAssessment = async () => {
      try {
        setIsLoading(true);
        const response = await examAPI.getAssessmentByMaterial(materialId);
        const assessment = response.data?.assessment;
        setMaterial(assessment?.material || null);
        const normalizedQuestions = sanitizeLoadedQuestions(assessment?.questions);
        setForm({
          title: assessment?.title || '',
          description: assessment?.description || '',
          status: assessment?.status || 'PUBLISHED',
          passingScore: Math.max(DEFAULT_PASSING_SCORE, Math.min(100, Number(assessment?.passingScore || DEFAULT_PASSING_SCORE))),
          timeLimit: Number(assessment?.timeLimit || 30),
          xpReward: Number(assessment?.xpReward || 50),
          coinReward: Number(assessment?.coinReward || 10),
          totalQuestions: Number(assessment?.totalQuestions ?? assessment?.questions?.length ?? 1) || 1,
          totalPoints: Number(assessment?.totalPoints ?? assessment?.questions?.reduce?.((sum, question) => sum + Number(question.points || 0), 0) ?? 10) || 10,
          shuffleQuestions: assessment?.shuffleQuestions !== false,
          showResultsToStudents: assessment?.showResultsToStudents !== false,
          questions: normalizedQuestions,
        });
      } catch (error) {
        const fallbackMaterial = initialMaterial || {
          id: materialId,
          title: 'Learning Material',
          section: user?.section || 'Class',
          subject: '',
          materialType: 'PDF',
          materialTypeLabel: 'Material',
        };
        const savedDraft = loadDraftAssessment(materialId);

        setMaterial(fallbackMaterial);
        setForm((current) => {
          if (savedDraft) {
            return savedDraft;
          }

          const hasRealDraft = String(current.title || '').trim() || current.questions.some((question) => String(question.question || '').trim());
          return hasRealDraft ? current : createDraftAssessmentFromMaterial(fallbackMaterial);
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAssessment();
  }, [initialMaterial, materialId, user?.section]);

  useEffect(() => {
    if (!isLoading && !lastSavedFingerprint) {
      setLastSavedFingerprint(formFingerprint);
    }
  }, [formFingerprint, isLoading, lastSavedFingerprint]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  const returnToMaterials = () => {
    if (isDirty && !window.confirm('You have unsaved assessment changes. Leave without saving?')) return;
    navigateToTeacherMaterials(navigate);
  };

  const updateQuestion = (questionId, updater) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question) => (
        question.id === questionId ? updater(question) : question
      )),
    }));
  };

  const addQuestion = () => {
    setForm((current) => ({
      ...current,
      questions: [...current.questions, createEmptyQuestion(current.questions.length)],
    }));
  };

  const startManualQuestions = () => {
    setQuestionAuthoringMode('manual');
    setForm((current) => {
      const hasMeaningfulQuestions = current.questions.some((question) => (
        String(question.question || '').trim()
        || String(question.correctAnswer || '').trim()
      ));

      if (hasMeaningfulQuestions) {
        return current;
      }

      return {
        ...current,
        questions: [createEmptyQuestion(0)],
      };
    });
    toast.success('Manual question mode selected.');
  };

  const deleteQuestion = (questionId) => {
    setForm((current) => {
      if (current.questions.length === 1) {
        toast.error('At least one question is required.');
        return current;
      }

      return {
        ...current,
        questions: current.questions.filter((question) => question.id !== questionId),
      };
    });
  };

  const persistAssessmentForm = async (nextForm, successMessage = '') => {
    const response = await examAPI.saveAssessmentByMaterial(materialId, buildAssessmentSavePayload(nextForm));
    const assessment = response.data?.assessment;

    setForm((current) => ({
      ...current,
      title: assessment?.title || nextForm.title || current.title,
      description: assessment?.description || nextForm.description || '',
      status: assessment?.status || nextForm.status || current.status,
      passingScore: Number(assessment?.passingScore || nextForm.passingScore || current.passingScore),
      timeLimit: Number(assessment?.timeLimit || nextForm.timeLimit || current.timeLimit),
      xpReward: Number(assessment?.xpReward || nextForm.xpReward || current.xpReward),
      coinReward: Number(assessment?.coinReward || nextForm.coinReward || current.coinReward),
      totalQuestions: nextForm.questions.length,
      totalPoints: nextForm.questions.length * DEFAULT_QUESTION_POINTS,
      shuffleQuestions: assessment?.shuffleQuestions !== false,
      showResultsToStudents: assessment?.showResultsToStudents !== false,
      questions: Array.isArray(assessment?.questions) && assessment.questions.length > 0
        ? sanitizeLoadedQuestions(assessment.questions)
        : nextForm.questions,
    }));
    setLastSavedFingerprint(JSON.stringify(buildAssessmentSavePayload(nextForm)));

    if (successMessage) {
      toast.success(successMessage);
    }

    return response;
  };

  const addOption = (questionId) => {
    updateQuestion(questionId, (question) => {
      const nextOptions = [...question.options, createOptionLabel(question.options.length)];
      return {
        ...question,
        options: nextOptions,
        correctAnswer: question.correctAnswer || nextOptions[0],
      };
    });
  };

  const removeOption = (questionId, optionIndex) => {
    updateQuestion(questionId, (question) => {
      if (question.options.length <= 2) {
        toast.error('Multiple choice questions need at least two options.');
        return question;
      }

      const removedOption = question.options[optionIndex];
      const nextOptions = question.options.filter((_, index) => index !== optionIndex);
      return {
        ...question,
        options: nextOptions,
        correctAnswer: question.correctAnswer === removedOption ? nextOptions[0] : question.correctAnswer,
      };
    });
  };

  const onGenerateQuestions = async () => {
    if (!materialId) {
      toast.error('This material is missing an ID for AI question generation.');
      return;
    }

    try {
      setIsGeneratingAiQuestions(true);
      const response = await adminAiAPI.generateQuestion({
        materialId,
        difficulty: 'medium',
        questionType: 'mixed',
        language: 'English',
        choicesCount: DEFAULT_AI_CHOICES_COUNT,
        questionCount: DEFAULT_AI_QUESTION_COUNT,
      });

      const generatedQuestions = Array.isArray(response.data?.questions)
        ? response.data.questions.map((question, index) => normalizeGeneratedAiQuestionForForm(question, index))
        : [];

      if (generatedQuestions.length === 0) {
        toast.error('AI did not return any valid questions for this module.');
        return;
      }

      const existingQuestions = Array.isArray(form.questions) ? form.questions : [];
      const shouldReplaceEmptyDraft = existingQuestions.length === 1 && !hasMeaningfulQuestionContent(existingQuestions[0]);
      const shouldReplaceLegacyTemplates = existingQuestions.length > 0 && existingQuestions.every(isLegacyTemplateQuestion);
      const nextQuestions = shouldReplaceEmptyDraft || shouldReplaceLegacyTemplates
        ? generatedQuestions
        : mergeUniqueQuestions(existingQuestions, generatedQuestions);
      const priorQuestionCount = shouldReplaceEmptyDraft || shouldReplaceLegacyTemplates ? 0 : existingQuestions.length;
      const addedQuestionCount = nextQuestions.length - priorQuestionCount;

      if (addedQuestionCount <= 0) {
        toast.error('AI generation returned only questions that already exist in this assessment.');
        return;
      }

      const nextForm = {
        ...form,
        totalQuestions: nextQuestions.length,
        totalPoints: nextQuestions.length * DEFAULT_QUESTION_POINTS,
        questions: nextQuestions,
      };

      setQuestionAuthoringMode('ai');
      setForm(nextForm);

      try {
        await persistAssessmentForm(
          nextForm,
          `${addedQuestionCount} AI question${addedQuestionCount === 1 ? '' : 's'} added and saved to this assessment.`,
        );
      } catch (error) {
        const apiError = handleAPIError(error);
        const message = String(apiError.message || '').toLowerCase();
        const isDatabaseFailure = apiError.status >= 500
          || message.includes('database operation failed')
          || message.includes('database schema is missing')
          || message.includes('invalid data format');

        if (isDatabaseFailure) {
          const savedLocally = saveDraftAssessment(materialId, nextForm);
          if (savedLocally) {
            setLastSavedFingerprint(JSON.stringify(buildAssessmentSavePayload(nextForm)));
            toast.success('AI questions were added and saved locally. The database is unavailable right now, but this assessment draft was kept on this device.');
            return;
          }
        }

        toast.error(apiError.message || 'AI questions were added to the editor, but saving the assessment failed.');
      }
    } catch (error) {
      const apiError = handleAPIError(error);
      toast.error(apiError.message || 'Unable to generate AI questions.');
    } finally {
      setIsGeneratingAiQuestions(false);
    }
  };

  const onSave = async () => {
    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      toast.error('Assessment title is required.');
      return;
    }

    for (const [index, question] of form.questions.entries()) {
      if (!String(question.question || '').trim()) {
        toast.error(`Question ${index + 1} needs a prompt.`);
        return;
      }

      if (question.type === 'multiple_choice' && (!Array.isArray(question.options) || question.options.length < 2)) {
        toast.error(`Question ${index + 1} needs at least two options.`);
        return;
      }
    }

    try {
      setIsSaving(true);
      await persistAssessmentForm({
        ...form,
        title: trimmedTitle,
      }, 'Assessment saved successfully.');
    } catch (error) {
      const apiError = handleAPIError(error);
      const message = String(apiError.message || '').toLowerCase();
      const isDatabaseFailure = apiError.status >= 500
        || message.includes('database operation failed')
        || message.includes('database schema is missing')
        || message.includes('invalid data format');

      if (isDatabaseFailure) {
        const savedLocally = saveDraftAssessment(materialId, form);
        if (savedLocally) {
          setLastSavedFingerprint(JSON.stringify(buildAssessmentSavePayload(form)));
          toast.success('Assessment saved locally. The database is unavailable right now, but your changes were kept on this device.');
          return;
        }
      }

      toast.error(apiError.message || 'Unable to save assessment.');
    } finally {
      setIsSaving(false);
    }
  };

  const onSignOut = async () => {
    await logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto flex max-w-7xl items-center justify-center rounded-3xl border border-slate-200 bg-white p-16 shadow-sm">
          <div className="inline-flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading assessment editor...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
              <img src={logo} alt="iTECHS" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">Teacher Dashboard</h1>
              <p className="text-sm text-slate-500">{user?.section || 'Class'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate('/teacher/level-editor')} className="btn btn-primary">
              <Settings2 className="mr-2 h-4 w-4" />
              Edit Level
            </button>
            <button type="button" onClick={onSignOut} className="btn btn-secondary">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </button>
          </div>
        </header>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="grid min-h-[72vh] lg:grid-cols-[260px_minmax(0,1fr)_260px]">
          <aside className="border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Navigation</p>
            </div>

            <nav className="divide-y divide-slate-200 border-b border-slate-200">
              {[
                { id: 'roster', label: 'Overview', icon: Users },
                { id: 'difficulty', label: 'Progress', icon: Activity },
                { id: 'leaderboard', label: 'Ranking', icon: Trophy },
                { id: 'materials', label: 'Materials', icon: BookOpen, active: true },
                { id: 'policy', label: 'Settings', icon: Settings2 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                <button
                  key={item.label}
                  type="button"
                    onClick={() => {
                      if (isDirty && !window.confirm('You have unsaved assessment changes. Leave without saving?')) return;
                      navigate('/teacher', { state: { activeTab: item.id } });
                    }}
                    className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold transition ${
                      item.active
                        ? 'bg-white text-emerald-800'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="border-b border-slate-200 px-4 py-3 text-xs text-slate-600">
              <div className="flex items-center justify-between"><span>Material</span><span className="font-bold text-slate-900">{material?.title || '--'}</span></div>
              <div className="mt-1 flex items-center justify-between"><span>Questions</span><span className="font-bold text-slate-900">{totalQuestions}</span></div>
              <div className="mt-1 flex items-center justify-between"><span>Total Points</span><span className="font-bold text-slate-900">{totalPoints}</span></div>
              <div className="mt-1 flex items-center justify-between"><span>Students</span><span className="font-bold text-slate-900">{sidebarSummary.totalStudents}</span></div>
              <div className="mt-1 flex items-center justify-between"><span>Avg. Progress</span><span className="font-bold text-slate-900">{sidebarSummary.averageProgress}%</span></div>
              <div className="mt-1 flex items-center justify-between"><span>Needs Support</span><span className="font-bold text-rose-700">{sidebarSummary.needsSupportCount}</span></div>
            </div>

            <div>
              <div className="border-b border-slate-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Student List</p>
              </div>
              <div className="max-h-75 divide-y divide-slate-200 overflow-y-auto">
                {sidebarStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedSidebarStudentId(student.id)}
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-xs ${
                      selectedSidebarStudentId === student.id
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate pr-2 font-semibold">
                      {`${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username || 'Student'}
                    </span>
                    <span className="font-bold">{Number(student.metrics?.progressPercent || 0)}%</span>
                  </button>
                ))}
                {sidebarStudents.length === 0 && (
                  <p className="px-4 py-3 text-xs text-slate-500">No students found.</p>
                )}
              </div>
            </div>
          </aside>

          <main className="space-y-4 bg-white p-4">
            <div className="sticky top-2 z-20 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold text-sky-600">Materials / {material?.title || 'Module'} / Edit Assessment</p>
                <h2 className="mt-2 text-4xl font-black text-slate-900">Edit Assessment</h2>
                <p className="mt-2 text-sm text-slate-500">Modify the assessment details and questions linked to this learning material.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-black ${isDirty ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
                  {isDirty ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {isDirty ? 'Unsaved changes' : 'Saved'}
                </span>
                <button type="button" onClick={() => setShowStudentPreview(true)} className="btn btn-secondary">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview as Student
                </button>
                <button type="button" onClick={onSave} disabled={isSaving || !isDirty} className="btn btn-primary">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </button>
                <button type="button" onClick={returnToMaterials} className="btn btn-secondary">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Materials
                </button>
              </div>
            </div>

            <section className="rounded-3xl border border-slate-200 p-4">
              <h3 className="text-2xl font-black text-slate-900">Assessment Information</h3>
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_160px_160px]">
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Title</label>
                  <input
                    className="input-field"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Assessment title"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Module</label>
                  <div className="input-field flex items-center gap-2 bg-slate-50">
                    <BookOpen className="h-4 w-4 text-emerald-600" />
                    <span>{material?.title || 'Learning Material'}</span>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Total Questions</label>
                  <input
                    type="number"
                    className="input-field bg-slate-50"
                    value={totalQuestions}
                    readOnly
                    aria-readonly="true"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px]">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
                  <textarea
                    className="input-field min-h-28 resize-y"
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Assessment description or student instructions"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Total Points</label>
                  <input
                    type="number"
                    className="input-field"
                    value={totalPoints}
                    readOnly
                    aria-readonly="true"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="text-2xl font-black text-slate-900">Assessment Questions ({totalQuestions})</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (questionAuthoringMode !== 'manual') {
                        startManualQuestions();
                        return;
                      }

                      addQuestion();
                    }}
                    className="btn btn-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {questionAuthoringMode === 'manual' ? 'Add Manual Question' : 'Use Manual Questions'}
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-600">
                    {completedQuestionCount} of {totalQuestions} questions complete
                  </p>
                  <div className="flex flex-wrap gap-2" aria-label="Question navigator">
                    {form.questions.map((question, index) => {
                      const isComplete = getQuestionValidationIssues(question).length === 0;
                      return (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => document.getElementById(`assessment-question-${question.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                          className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-black transition ${
                            isComplete
                              ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                              : 'border-amber-200 bg-amber-100 text-amber-800'
                          }`}
                          title={isComplete ? `Question ${index + 1} is complete` : `Question ${index + 1} needs attention`}
                        >
                          {index + 1}{isComplete ? ' ✓' : ' !'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {form.questions.map((question, index) => {
                  const validationIssues = getQuestionValidationIssues(question);
                  const isQuestionComplete = validationIssues.length === 0;
                  return (
                  <article id={`assessment-question-${question.id}`} key={question.id} className={`scroll-mt-28 rounded-3xl border p-4 ${isQuestionComplete ? 'border-emerald-200' : 'border-amber-200'}`}>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">Question {index + 1}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${isQuestionComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                          {isQuestionComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                          {isQuestionComplete ? 'Complete' : 'Needs attention'}
                        </span>
                      </div>
                      {!isQuestionComplete ? <p className="text-xs font-semibold text-amber-700">{validationIssues.join(' • ')}</p> : null}
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_110px_72px]">
                      <div className="min-w-0">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Question prompt</label>
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
                          <input
                            className="w-full border-none bg-transparent text-base font-bold text-slate-900 outline-none"
                            value={question.question}
                            onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, question: event.target.value }))}
                            placeholder="Enter your question"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Type</label>
                        <select
                          className="input-field"
                          value={question.type}
                          onChange={(event) => updateQuestion(question.id, (current) => normalizeQuestionForForm({
                            ...current,
                            type: event.target.value,
                          }, index))}
                        >
                          {QUESTION_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Points</label>
                        <input
                          className="input-field"
                          type="number"
                          value={DEFAULT_QUESTION_POINTS}
                          readOnly
                          aria-readonly="true"
                        />
                      </div>

                      <div className="flex items-start justify-end pt-7">
                        <button type="button" onClick={() => window.confirm(`Delete Question ${index + 1}?`) && deleteQuestion(question.id)} className="rounded-xl border border-rose-200 p-3 text-rose-600 transition hover:bg-rose-50" title="Delete Question">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {question.type === 'multiple_choice' && (
                        <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                          Select the radio button beside the correct answer.
                        </p>
                      )}
                      {question.type === 'multiple_choice' && question.options.map((option, optionIndex) => (
                        <div key={`${question.id}-option-${optionIndex}`} className={`flex items-center gap-3 rounded-xl border p-2 ${question.correctAnswer === option ? 'border-emerald-300 bg-emerald-50' : 'border-transparent'}`}>
                          <input
                            type="radio"
                            checked={question.correctAnswer === option}
                            onChange={() => updateQuestion(question.id, (current) => ({ ...current, correctAnswer: option }))}
                          />
                          <input
                            className="input-field max-w-xs flex-1"
                            value={option}
                            onChange={(event) => updateQuestion(question.id, (current) => {
                              const nextOptions = current.options.map((item, itemIndex) => (
                                itemIndex === optionIndex ? event.target.value : item
                              ));
                              const previousOption = current.options[optionIndex];
                              return {
                                ...current,
                                options: nextOptions,
                                correctAnswer: current.correctAnswer === previousOption ? event.target.value : current.correctAnswer,
                              };
                            })}
                          />
                          <button type="button" onClick={() => removeOption(question.id, optionIndex)} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
                            Remove
                          </button>
                          {question.correctAnswer === option ? (
                            <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-black uppercase text-white">Correct Answer</span>
                          ) : null}
                        </div>
                      ))}

                      {question.type === 'true_false' && ['True', 'False'].map((option) => (
                        <label key={`${question.id}-${option}`} className="flex items-center gap-3 text-sm text-slate-700">
                          <input
                            type="radio"
                            checked={question.correctAnswer === option}
                            onChange={() => updateQuestion(question.id, (current) => ({ ...current, correctAnswer: option }))}
                          />
                          {option}
                        </label>
                      ))}

                      {question.type === 'identification' && (
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Correct answer
                          </label>
                          {question.type === 'identification' ? (
                            <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                              <p className="font-black">Identification answer rule</p>
                              <p className="mt-1">
                                Enter one exact expected answer. Capitalization and spaces at the beginning or end are ignored, but the wording and punctuation must otherwise match. Alternate answers are not supported.
                              </p>
                            </div>
                          ) : null}
                          <textarea
                            className="input-field min-h-24 resize-y"
                            value={question.correctAnswer}
                            onChange={(event) => updateQuestion(question.id, (current) => ({ ...current, correctAnswer: event.target.value }))}
                            placeholder="Enter one exact expected answer"
                          />
                        </div>
                      )}

                      {question.type === 'multiple_choice' && (
                        <button type="button" onClick={() => addOption(question.id)} className="text-sm font-semibold text-sky-600">
                          + Add Option
                        </button>
                      )}
                    </div>
                  </article>
                  );
                })}
              </div>
            </section>
          </main>

          <aside className="space-y-4 border-t border-slate-200 bg-slate-50 p-4 lg:border-t-0 lg:border-l">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-xl font-black text-slate-900">Assessment Settings</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                  <select className="input-field" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Passing Score (%)</label>
                  <input
                    className="input-field"
                    type="number"
                    min={DEFAULT_PASSING_SCORE}
                    max="100"
                    value={form.passingScore}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      passingScore: Math.max(DEFAULT_PASSING_SCORE, Math.min(100, Number(event.target.value || DEFAULT_PASSING_SCORE))),
                    }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Time Limit (minutes)</label>
                  <input
                    className="input-field"
                    type="number"
                    min="1"
                    max="480"
                    value={form.timeLimit}
                    onChange={(event) => setForm((current) => ({ ...current, timeLimit: Number(event.target.value || 1) }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">XP Reward</label>
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    value={form.xpReward}
                    onChange={(event) => setForm((current) => ({ ...current, xpReward: Number(event.target.value || 0) }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Coin Reward</label>
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    value={form.coinReward}
                    onChange={(event) => setForm((current) => ({ ...current, coinReward: Number(event.target.value || 0) }))}
                  />
                </div>
                <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.shuffleQuestions}
                    onChange={(event) => setForm((current) => ({ ...current, shuffleQuestions: event.target.checked }))}
                  />
                  Shuffle Questions
                </label>
                <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.showResultsToStudents}
                    onChange={(event) => setForm((current) => ({ ...current, showResultsToStudents: event.target.checked }))}
                  />
                  Show Results to Students
                </label>
                <button type="button" onClick={onSave} disabled={isSaving} className="btn btn-primary w-full">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-xl font-black text-slate-900">Question Bank</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between"><span>All Questions</span><span className="font-bold">{questionTypeCounts.all}</span></div>
                <div className="flex items-center justify-between"><span>Multiple Choice</span><span className="font-bold">{questionTypeCounts.multiple_choice}</span></div>
                <div className="flex items-center justify-between"><span>True / False</span><span className="font-bold">{questionTypeCounts.true_false}</span></div>
                <div className="flex items-center justify-between"><span>Identification</span><span className="font-bold">{questionTypeCounts.identification}</span></div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-xl font-black text-slate-900">AI Question Generator</h3>
              <p className="mt-3 text-sm text-slate-500">
                Generate AI questions from the selected module content and its lesson images, using a mix of question types when appropriate, then review and edit them here before saving.
              </p>
              <button type="button" onClick={onGenerateQuestions} disabled={isGeneratingAiQuestions} className="btn btn-secondary mt-4 w-full">
                {isGeneratingAiQuestions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate AI Questions
              </button>
            </section>

          </aside>
        </div>
        </div>
      </div>

      {showStudentPreview && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onClick={() => setShowStudentPreview(false)}>
          <div
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assessment-preview-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Student Preview</p>
                <h2 id="assessment-preview-title" className="mt-1 text-2xl font-black text-slate-900">{form.title || 'Untitled Assessment'}</h2>
              </div>
              <button type="button" onClick={() => setShowStudentPreview(false)} className="btn btn-secondary">Close Preview</button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-6">
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Questions</p><p className="mt-1 text-xl font-black">{totalQuestions}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Time Limit</p><p className="mt-1 text-xl font-black">{form.timeLimit} min</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">Passing Score</p><p className="mt-1 text-xl font-black">{form.passingScore}%</p></div>
              </div>
              {form.description ? <p className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">{form.description}</p> : null}

              <div className="space-y-4">
                {form.questions.map((question, index) => (
                  <section key={question.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Question {index + 1} · {DEFAULT_QUESTION_POINTS} points</p>
                    <h3 className="mt-2 text-base font-bold text-slate-900">{question.question || 'Question prompt has not been added.'}</h3>
                    <div className="mt-4 space-y-2">
                      {['multiple_choice', 'true_false'].includes(question.type) && question.options.map((option, optionIndex) => (
                        <label key={`${question.id}-preview-${optionIndex}`} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
                          <input type="radio" name={`preview-${question.id}`} disabled />
                          {option || `Option ${optionIndex + 1}`}
                        </label>
                      ))}
                      {question.type === 'identification' && (
                        <div>
                          <p className="mb-2 text-xs font-semibold text-slate-500">
                            Answer using the expected wording. Capitalization and surrounding spaces do not affect grading.
                          </p>
                          <input className="input-field" disabled placeholder="Student enters an answer here" />
                        </div>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAssessmentEditorPage;
