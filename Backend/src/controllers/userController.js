const { 
  hashPassword,
  successResponse,
  errorResponse,
  sanitizeUser,
  getPaginationData,
  generateUsername
} = require('../utils/helpers');
const { sendWelcomeEmail, EMAIL_PURPOSES } = require('../utils/emailService');
const { initializeStudentProgression } = require('../services/progressionService');
const crypto = require('crypto');
const XLSX = require('xlsx');
const prisma = require('../lib/prisma');

const removeUserDependenciesForPermanentDelete = async (tx, user) => {
  await tx.score.deleteMany({
    where: { studentId: user.id }
  });

  if (user.role === 'TEACHER') {
    const createdExamIds = (user.createdExams || []).map(exam => exam.id);

    if (createdExamIds.length > 0) {
      await tx.score.deleteMany({
        where: {
          examId: {
            in: createdExamIds
          }
        }
      });

      await tx.exam.deleteMany({
        where: {
          id: {
            in: createdExamIds
          }
        }
      });
    }

    await tx.user.updateMany({
      where: { teacherId: user.id },
      data: { teacherId: null }
    });

    await tx.archivedUser.updateMany({
      where: { teacherId: user.id },
      data: { teacherId: null }
    });
  }
};

const COURSE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const COURSE_CODE_LENGTH = 8;
const MAX_STUDENTS_PER_SECTION = 35;
const STUDENT_USERNAME_SUFFIX = '@student.com';
const TEACHER_USERNAME_SUFFIX = '@teacher.com';
const STUDENT_UPLOAD_DEFAULT_PASSWORD_FALLBACK = 'Student123!';
const TEACHER_UPLOAD_DEFAULT_PASSWORD_FALLBACK = 'Teacher123!';
const STUDENT_UPLOAD_FIELD_ORDER = [
  'firstName',
  'lastName',
  'username',
  'email',
  'section',
  'academicYear',
  'password',
];
const TEACHER_UPLOAD_FIELD_ORDER = [
  'firstName',
  'lastName',
  'username',
  'email',
  'password',
];
const STUDENT_UPLOAD_HEADER_ALIASES = {
  firstName: ['first name', 'firstname', 'given name'],
  lastName: ['last name', 'lastname', 'surname', 'family name'],
  username: ['username', 'user name', 'student username'],
  email: ['email', 'email address', 'student email'],
  section: ['section', 'class section'],
  academicYear: ['academic year', 'academic_year', 'school year', 'school_year'],
  password: ['password', 'temporary password'],
};

const normalizeStudentUploadText = (value) => String(value ?? '').trim();
const normalizeStudentSection = (value) => normalizeStudentUploadText(value);
const normalizeSectionKey = (value) => String(value ?? '').trim();

const getAssessmentStarRating = (percentage) => {
  const safePercentage = Number(percentage);

  if (!Number.isFinite(safePercentage) || safePercentage <= 0) {
    return 0;
  }

  if (safePercentage >= 85) {
    return 3;
  }

  if (safePercentage >= 70) {
    return 2;
  }

  if (safePercentage >= 50) {
    return 1;
  }

  return 0;
};

const getLatestTimestamp = (...values) => {
  const timestamps = values
    .flat()
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps));
};

const normalizeStudentName = (value) => normalizeStudentUploadText(value).replace(/\s+/g, ' ');

const normalizeStudentUsernameBase = (value) => {
  const normalized = normalizeStudentUploadText(value).toLowerCase();

  if (!normalized) {
    return '';
  }

  if (normalized.endsWith(STUDENT_USERNAME_SUFFIX)) {
    return normalized.slice(0, -STUDENT_USERNAME_SUFFIX.length);
  }

  return normalized.includes('@') ? normalized.split('@')[0] : normalized;
};

const toStudentUsername = (value) => {
  const base = normalizeStudentUsernameBase(value);
  return base ? `${base}${STUDENT_USERNAME_SUFFIX}` : '';
};

const normalizeTeacherUsernameBase = (value) => {
  const normalized = normalizeStudentUploadText(value).toLowerCase();

  if (!normalized) {
    return '';
  }

  if (normalized.endsWith(TEACHER_USERNAME_SUFFIX)) {
    return normalized.slice(0, -TEACHER_USERNAME_SUFFIX.length);
  }

  return normalized.includes('@') ? normalized.split('@')[0] : normalized;
};

const toTeacherUsername = (value) => {
  const base = normalizeTeacherUsernameBase(value);
  return base ? `${base}${TEACHER_USERNAME_SUFFIX}` : '';
};

const buildGeneratedStudentPassword = (firstName = '', username = '', lastName = '') => {
  const normalizePasswordPart = (value = '') => String(value).toLowerCase().trim().replace(/\s+/g, '');
  const first = normalizePasswordPart(firstName);
  const usernameBase = normalizeStudentUsernameBase(username);
  const last = normalizePasswordPart(lastName);

  if (!first || !usernameBase || !last) {
    return STUDENT_UPLOAD_DEFAULT_PASSWORD_FALLBACK;
  }

  return `${first}_${usernameBase}@_${last}`;
};

const buildGeneratedTeacherPassword = (firstName = '', username = '', lastName = '') => {
  const normalizePasswordPart = (value = '') => String(value).toLowerCase().trim().replace(/\s+/g, '');
  const first = normalizePasswordPart(firstName);
  const usernameBase = normalizeTeacherUsernameBase(username);
  const last = normalizePasswordPart(lastName);

  if (!first || !usernameBase || !last) {
    return TEACHER_UPLOAD_DEFAULT_PASSWORD_FALLBACK;
  }

  return `${first}_${usernameBase}@_${last}`;
};

const normalizeStudentUploadHeader = (value) => normalizeStudentUploadText(value).toLowerCase().replace(/[_-]+/g, ' ');

const mapStudentUploadHeader = (headerValue) => {
  const normalizedHeader = normalizeStudentUploadHeader(headerValue);

  return Object.entries(STUDENT_UPLOAD_HEADER_ALIASES).find(([, aliases]) => aliases.includes(normalizedHeader))?.[0] || null;
};

const buildStudentDraftFromRaw = (rawRow = {}, rowNumber = 1) => {
  const draft = {
    rowNumber,
    firstName: normalizeStudentName(rawRow.firstName),
    lastName: normalizeStudentName(rawRow.lastName),
    username: normalizeStudentUsernameBase(rawRow.username),
    email: normalizeStudentUploadText(rawRow.email).toLowerCase(),
    section: normalizeStudentUploadText(rawRow.section),
    academicYear: normalizeStudentUploadText(rawRow.academicYear),
    password: normalizeStudentUploadText(rawRow.password),
  };

  if (!draft.password) {
    draft.password = buildGeneratedStudentPassword(draft.firstName, draft.username, draft.lastName);
  }

  return draft;
};

const buildTeacherDraftFromRaw = (rawRow = {}, rowNumber = 1) => {
  const draft = {
    rowNumber,
    firstName: normalizeStudentName(rawRow.firstName),
    lastName: normalizeStudentName(rawRow.lastName),
    username: normalizeTeacherUsernameBase(rawRow.username),
    email: normalizeStudentUploadText(rawRow.email).toLowerCase(),
    password: normalizeStudentUploadText(rawRow.password),
  };

  if (!draft.password) {
    draft.password = buildGeneratedTeacherPassword(draft.firstName, draft.username, draft.lastName);
  }

  return draft;
};

const isStudentDraftEmpty = (draft) => ![
  draft.firstName,
  draft.lastName,
  draft.username,
  draft.email,
  draft.section,
  draft.academicYear,
  draft.password,
].some(Boolean);

const isTeacherDraftEmpty = (draft) => ![
  draft.firstName,
  draft.lastName,
  draft.username,
  draft.email,
  draft.password,
].some(Boolean);

const parseSpreadsheetStudentRows = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  return rows.map((row, index) => {
    const mappedRow = {};

    for (const [key, value] of Object.entries(row)) {
      const mappedKey = mapStudentUploadHeader(key);
      if (mappedKey) {
        mappedRow[mappedKey] = value;
      }
    }
    return buildStudentDraftFromRaw(mappedRow, index + 1);
  }).filter((draft) => !isStudentDraftEmpty(draft));
};

const parseStudentUploadFile = async (file) => {
  const fileName = String(file?.originalname || '').toLowerCase();

  if (!file?.buffer) {
    throw new Error('No upload file received.');
  }

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseSpreadsheetStudentRows(file.buffer);
  }

  throw new Error('Only Excel files (.xlsx, .xls) are supported.');
};

const parseTeacherUploadFile = async (file) => {
  const fileName = String(file?.originalname || '').toLowerCase();

  if (!file?.buffer) {
    throw new Error('No upload file received.');
  }

  if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
    throw new Error('Only Excel files (.xlsx, .xls) are supported.');
  }

  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  return rows.map((row, index) => {
    const mappedRow = {};

    for (const [key, value] of Object.entries(row)) {
      const mappedKey = mapStudentUploadHeader(key);
      if (mappedKey) {
        mappedRow[mappedKey] = value;
      }
    }

    return buildTeacherDraftFromRaw(mappedRow, index + 1);
  }).filter((draft) => !isTeacherDraftEmpty(draft));
};

const findDuplicateValues = (values = []) => {
  const counts = new Map();

  values.filter(Boolean).forEach((value) => {
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([value]) => value));
};

const collectStudentDraftConflicts = async (drafts) => {
  const usernames = Array.from(new Set(drafts.map((draft) => toStudentUsername(draft.username)).filter(Boolean)));
  const emails = Array.from(new Set(drafts.map((draft) => draft.email).filter(Boolean)));
  const existingUsernames = new Set();
  const existingEmails = new Set();

  if (usernames.length === 0 && emails.length === 0) {
    return { existingUsernames, existingEmails };
  }

  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [
        ...(usernames.length > 0 ? [{ username: { in: usernames } }] : []),
        ...(emails.length > 0 ? [{ email: { in: emails } }] : []),
      ],
    },
    select: {
      username: true,
      email: true,
    },
  });

  existingUsers.forEach((user) => {
    if (user.username) existingUsernames.add(user.username);
    if (user.email) existingEmails.add(user.email);
  });

  return { existingUsernames, existingEmails };
};

const getActiveStudentSectionCounts = async (sections = []) => {
  const normalizedSections = Array.from(
    new Set(
      sections
        .map((section) => normalizeStudentSection(section))
        .filter(Boolean)
    )
  );

  if (normalizedSections.length === 0) {
    return new Map();
  }

  const groupedSections = await prisma.user.groupBy({
    by: ['section'],
    where: {
      role: 'STUDENT',
      isArchived: false,
      section: {
        in: normalizedSections,
      },
    },
    _count: {
      _all: true,
    },
  });

  const sectionCounts = new Map(normalizedSections.map((section) => [section, 0]));
  groupedSections.forEach((group) => {
    sectionCounts.set(group.section, Number(group._count?._all || 0));
  });

  return sectionCounts;
};

const createSectionCapacityError = (section, currentCount, pendingCount = 1) => {
  const error = new Error(
    `Section "${section}" already has ${currentCount} active student${currentCount === 1 ? '' : 's'}. Adding ${pendingCount} more would exceed the ${MAX_STUDENTS_PER_SECTION}-student limit.`
  );
  error.statusCode = 400;
  return error;
};

const validateStudentUploadDrafts = async (drafts = []) => {
  const usernameDuplicatesInFile = findDuplicateValues(drafts.map((draft) => toStudentUsername(draft.username)));
  const emailDuplicatesInFile = findDuplicateValues(drafts.map((draft) => draft.email));
  const { existingUsernames, existingEmails } = await collectStudentDraftConflicts(drafts);
  const existingSectionCounts = await getActiveStudentSectionCounts(drafts.map((draft) => draft.section));
  const sectionRunningCounts = new Map(existingSectionCounts);

  return drafts.map((draft) => {
    const errors = [];
    const warnings = [];
    const usernameWithSuffix = toStudentUsername(draft.username);
    const normalizedSection = normalizeStudentSection(draft.section);

    if (!draft.firstName) errors.push('First name is required.');
    if (!draft.lastName) errors.push('Last name is required.');
    if (!draft.username) errors.push('Username is required.');
    if (!draft.email) errors.push('Email is required.');
    if (!draft.section) errors.push('Section is required.');
    if (!draft.academicYear) errors.push('Academic year is required.');

    if (draft.firstName && !/^[a-zA-Z\s]+$/.test(draft.firstName)) {
      errors.push('First name can only contain letters and spaces.');
    }

    if (draft.lastName && !/^[a-zA-Z\s]+$/.test(draft.lastName)) {
      errors.push('Last name can only contain letters and spaces.');
    }

    if (draft.username && !/^[a-zA-Z0-9._-]+$/.test(draft.username)) {
      errors.push('Username can only contain letters, numbers, dots, hyphens, and underscores.');
    }

    if (draft.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/.test(draft.email)) {
      errors.push('Email address is not valid.');
    }

    if (draft.section && (draft.section.length > 40 || !/^[a-zA-Z0-9\s._-]+$/.test(draft.section))) {
      errors.push('Section can only contain letters, numbers, spaces, dots, underscores, and hyphens and must be 40 characters or fewer.');
    }

    if (draft.academicYear && !/^\d{4}-\d{4}$/.test(draft.academicYear)) {
      errors.push('Academic year must use the format YYYY-YYYY, like 2025-2026.');
    }

    if (draft.password && draft.password.length < 8) {
      errors.push('Password must be at least 8 characters.');
    }

    if (usernameWithSuffix && usernameDuplicatesInFile.has(usernameWithSuffix)) {
      errors.push('Username is duplicated in the uploaded file.');
    }

    if (draft.email && emailDuplicatesInFile.has(draft.email)) {
      errors.push('Email is duplicated in the uploaded file.');
    }

    if (usernameWithSuffix && existingUsernames.has(usernameWithSuffix)) {
      errors.push('Username already exists in the system.');
    }

    if (draft.email && existingEmails.has(draft.email)) {
      errors.push('Email already exists in the system.');
    }

    if (normalizedSection) {
      const currentCount = existingSectionCounts.get(normalizedSection) || 0;
      const nextCount = (sectionRunningCounts.get(normalizedSection) || 0) + 1;
      sectionRunningCounts.set(normalizedSection, nextCount);

      if (nextCount > MAX_STUDENTS_PER_SECTION) {
        errors.push(
          `Section "${normalizedSection}" already has ${currentCount} active student${currentCount === 1 ? '' : 's'}. This row exceeds the ${MAX_STUDENTS_PER_SECTION}-student limit for that section.`
        );
      }
    }

    if (draft.password === STUDENT_UPLOAD_DEFAULT_PASSWORD_FALLBACK) {
      warnings.push('Password was auto-filled because the row did not contain enough information to generate the usual student password pattern.');
    }

    return {
      ...draft,
      usernameWithSuffix,
      errors,
      warnings,
      isValid: errors.length === 0,
    };
  });
};

const validateTeacherUploadDrafts = async (drafts = []) => {
  const usernameDuplicatesInFile = findDuplicateValues(drafts.map((draft) => toTeacherUsername(draft.username)));
  const emailDuplicatesInFile = findDuplicateValues(drafts.map((draft) => draft.email));
  const usernames = Array.from(new Set(drafts.map((draft) => toTeacherUsername(draft.username)).filter(Boolean)));
  const emails = Array.from(new Set(drafts.map((draft) => draft.email).filter(Boolean)));
  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [
        ...(usernames.length > 0 ? [{ username: { in: usernames } }] : []),
        ...(emails.length > 0 ? [{ email: { in: emails } }] : []),
      ],
    },
    select: {
      username: true,
      email: true,
    },
  });
  const existingUsernames = new Set(existingUsers.map((user) => user.username).filter(Boolean));
  const existingEmails = new Set(existingUsers.map((user) => user.email).filter(Boolean));

  return drafts.map((draft) => {
    const errors = [];
    const warnings = [];
    const usernameWithSuffix = toTeacherUsername(draft.username);

    if (!draft.firstName) errors.push('First name is required.');
    if (!draft.lastName) errors.push('Last name is required.');
    if (!draft.username) errors.push('Username is required.');
    if (!draft.email) errors.push('Email is required.');

    if (draft.firstName && !/^[a-zA-Z\s]+$/.test(draft.firstName)) {
      errors.push('First name can only contain letters and spaces.');
    }

    if (draft.lastName && !/^[a-zA-Z\s]+$/.test(draft.lastName)) {
      errors.push('Last name can only contain letters and spaces.');
    }

    if (draft.username && !/^[a-zA-Z0-9._-]+$/.test(draft.username)) {
      errors.push('Username can only contain letters, numbers, dots, hyphens, and underscores.');
    }

    if (draft.email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/.test(draft.email)) {
      errors.push('Email address is not valid.');
    }

    if (draft.password && draft.password.length < 8) {
      errors.push('Password must be at least 8 characters.');
    }

    if (usernameWithSuffix && usernameDuplicatesInFile.has(usernameWithSuffix)) {
      errors.push('Username is duplicated in the uploaded file.');
    }

    if (draft.email && emailDuplicatesInFile.has(draft.email)) {
      errors.push('Email is duplicated in the uploaded file.');
    }

    if (usernameWithSuffix && existingUsernames.has(usernameWithSuffix)) {
      errors.push('Username already exists in the system.');
    }

    if (draft.email && existingEmails.has(draft.email)) {
      errors.push('Email already exists in the system.');
    }

    if (draft.password === TEACHER_UPLOAD_DEFAULT_PASSWORD_FALLBACK) {
      warnings.push('Password was auto-filled because the row did not contain enough information to generate the usual teacher password pattern.');
    }

    return {
      ...draft,
      usernameWithSuffix,
      errors,
      warnings,
      isValid: errors.length === 0,
    };
  });
};

const createStudentUserFromDraft = async (draft, actorUserId) => {
  const password = draft.password || buildGeneratedStudentPassword(draft.firstName, draft.username, draft.lastName);
  const hashedPassword = await hashPassword(password);
  const normalizedSection = normalizeStudentSection(draft.section);

  const createdUser = await prisma.$transaction(async (tx) => {
    const activeCount = await tx.user.count({
      where: {
        role: 'STUDENT',
        isArchived: false,
        section: normalizedSection,
      },
    });

    if (normalizedSection && activeCount >= MAX_STUDENTS_PER_SECTION) {
      throw createSectionCapacityError(normalizedSection, activeCount);
    }

    const newUser = await tx.user.create({
      data: {
        username: toStudentUsername(draft.username),
        email: draft.email,
        password: hashedPassword,
        role: 'STUDENT',
        firstName: draft.firstName,
        lastName: draft.lastName,
        section: normalizedSection,
        academicYear: draft.academicYear,
        isVerified: false,
        teacherId: actorUserId && actorUserId.role === 'TEACHER' ? actorUserId.id : null,
      },
    });

    await initializeStudentProgression(newUser.id, tx);
    return newUser;
  });

  return {
    createdUser,
    password,
  };
};

const createTeacherUserFromDraft = async (draft) => {
  const password = draft.password || buildGeneratedTeacherPassword(draft.firstName, draft.username, draft.lastName);
  const hashedPassword = await hashPassword(password);

  const createdUser = await prisma.$transaction(async (tx) => {
    return tx.user.create({
      data: {
        username: toTeacherUsername(draft.username),
        email: draft.email,
        password: hashedPassword,
        role: 'TEACHER',
        firstName: draft.firstName,
        lastName: draft.lastName,
        isVerified: false,
        courseCode: await generateUniqueTeacherCourseCode(tx),
      },
    });
  });

  return {
    createdUser,
    password,
  };
};

const buildTeacherDisplayName = (teacher) => {
  if (!teacher) {
    return '';
  }

  const fullName = `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim();
  return fullName || teacher.username || teacher.email || '';
};

const normalizeCourseCode = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32);
};

const generateCourseCodeCandidate = () => {
  let code = '';

  for (let index = 0; index < COURSE_CODE_LENGTH; index += 1) {
    code += COURSE_CODE_ALPHABET[crypto.randomInt(0, COURSE_CODE_ALPHABET.length)];
  }

  return code;
};

const generateUniqueTeacherCourseCode = async (tx, maxAttempts = 12) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generateCourseCodeCandidate();
    const existing = await tx.user.findUnique({
      where: { courseCode: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error('Unable to generate a unique course code.');
};

const ensureTeacherCourseCode = async (teacherId, tx = prisma) => {
  const teacher = await tx.user.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      role: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      courseCode: true,
      isArchived: true,
    },
  });

  if (!teacher || teacher.role !== 'TEACHER' || teacher.isArchived) {
    return null;
  }

  if (teacher.courseCode) {
    return teacher;
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const nextCode = await generateUniqueTeacherCourseCode(tx);

    const result = await tx.user.updateMany({
      where: {
        id: teacher.id,
        role: 'TEACHER',
        isArchived: false,
        courseCode: null,
      },
      data: {
        courseCode: nextCode,
      },
    });

    if (result.count === 1) {
      return {
        ...teacher,
        courseCode: nextCode,
      };
    }

    const refreshedTeacher = await tx.user.findUnique({
      where: { id: teacher.id },
      select: {
        id: true,
        role: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        courseCode: true,
        isArchived: true,
      },
    });

    if (refreshedTeacher?.courseCode) {
      return refreshedTeacher;
    }
  }

  throw new Error('Unable to assign a course code to this teacher right now.');
};

const resetStudentProgressionForEnrollmentChange = async (studentId, tx) => {
  await tx.levelAttempt.deleteMany({
    where: { studentId },
  });

  await tx.gameSession.deleteMany({
    where: { studentId },
  });

  await tx.studentLevelState.deleteMany({
    where: { studentId },
  });

  await tx.teacherStudentPolicy.deleteMany({
    where: { studentId },
  });

  await initializeStudentProgression(studentId, tx);
};

// Get all users (with pagination and filtering)
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, search, isArchived, includeProgress } = req.query;
    const shouldIncludeProgress = req.user.role === 'SUPER_ADMIN' && includeProgress === 'true';
    
    const where = {};
    
    // Apply filters
    if (role) {
      where.role = role;
    }
    
    if (isArchived !== undefined) {
      where.isArchived = isArchived === 'true';
    }
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ];
    }

    // For teachers, only show their students
    if (req.user.role === 'TEACHER') {
      where.OR = [
        { teacherId: req.user.id },
        { id: req.user.id } // Include self
      ];
    }

    // Get total count
    const totalCount = await prisma.user.count({ where });
    
    // Get pagination data
    const paginationData = getPaginationData(page, limit, totalCount);
    
    // Get users
    const users = await prisma.user.findMany({
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
            createdStudents: true,
            exams: true,
            scores: true,
            ...(shouldIncludeProgress ? {
              levelAttempts: true,
              materialQuizAttempts: true,
            } : {})
          }
        },
        ...(shouldIncludeProgress ? {
          levelStates: {
            select: {
              status: true,
              bestStars: true,
              bestScore: true
            }
          },
          levelAttempts: {
            select: {
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          materialProgress: {
            select: {
              status: true,
              progressPercent: true,
              startedAt: true,
              lastViewedAt: true,
              latestQuizScore: true,
              completedAt: true,
              updatedAt: true,
              material: {
                select: {
                  section: true,
                  assessment: {
                    select: {
                      id: true
                    }
                  }
                }
              }
            }
          },
          materialQuizAttempts: {
            select: {
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        } : {})
      },
      orderBy: { createdAt: 'desc' },
      skip: paginationData.offset,
      take: paginationData.limit
    });

    const assessmentCountsBySection = new Map();
    const moduleCountsBySection = new Map();

    if (shouldIncludeProgress) {
      const studentSections = Array.from(
        new Set(
          users
            .filter((user) => user.role === 'STUDENT')
            .map((user) => normalizeSectionKey(user.section))
            .filter(Boolean)
        )
      );

      if (studentSections.length > 0) {
        const materialCatalog = await prisma.learningMaterial.findMany({
          where: {
            section: {
              in: studentSections
            }
          },
          select: {
            section: true,
            assessment: {
              select: {
                id: true
              }
            }
          }
        });

        materialCatalog.forEach((material) => {
          const sectionKey = normalizeSectionKey(material.section);
          if (material.assessment) {
            assessmentCountsBySection.set(sectionKey, (assessmentCountsBySection.get(sectionKey) || 0) + 1);
          } else {
            moduleCountsBySection.set(sectionKey, (moduleCountsBySection.get(sectionKey) || 0) + 1);
          }
        });
      }
    }

    const sanitizedUsers = users.map((user) => {
      const sanitizedUser = sanitizeUser(user);

      if (!shouldIncludeProgress) {
        return sanitizedUser;
      }

      delete sanitizedUser.levelStates;
      delete sanitizedUser.levelAttempts;
      delete sanitizedUser.materialProgress;
      delete sanitizedUser.materialQuizAttempts;

      if (user.role !== 'STUDENT') {
        return sanitizedUser;
      }

      const completedLevels = (user.levelStates || []).filter((item) => item.status === 'COMPLETED').length;
      const gameTotalStars = (user.levelStates || []).reduce((sum, item) => sum + Number(item.bestStars || 0), 0);
      const gameTotalScore = (user.levelStates || []).reduce((sum, item) => sum + Number(item.bestScore || 0), 0);
      const totalLevels = (user.levelStates || []).length;
      const gameProgressPercent = totalLevels > 0
        ? Number(((completedLevels / totalLevels) * 100).toFixed(2))
        : 0;

      const studentSectionKey = normalizeSectionKey(user.section);
      const relevantModuleProgress = (user.materialProgress || []).filter((record) => (
        !record?.material?.assessment
        && normalizeSectionKey(record?.material?.section) === studentSectionKey
      ));
      const relevantAssessmentProgress = (user.materialProgress || []).filter((record) => (
        record?.material?.assessment
        && normalizeSectionKey(record.material.section) === studentSectionKey
      ));
      const totalModules = moduleCountsBySection.get(studentSectionKey) || 0;
      const completedModules = relevantModuleProgress.filter((record) => record.status === 'COMPLETED').length;
      const startedModules = relevantModuleProgress.filter((record) => (
        record.status !== 'LOCKED'
        || Number(record.progressPercent || 0) > 0
        || Boolean(record.startedAt || record.lastViewedAt || record.completedAt)
      )).length;
      const totalAssessments = assessmentCountsBySection.get(studentSectionKey) || 0;
      const completedAssessments = relevantAssessmentProgress.filter((record) => record.status === 'COMPLETED').length;
      const attemptedAssessmentProgress = relevantAssessmentProgress.filter((record) => (
        (record.latestQuizScore !== null && record.latestQuizScore !== undefined)
        || record.status === 'IN_PROGRESS'
        || record.status === 'COMPLETED'
      ));
      const scoredAssessments = relevantAssessmentProgress
        .map((record) => Number(record.latestQuizScore))
        .filter((score) => Number.isFinite(score));
      const assessmentTotalStars = relevantAssessmentProgress.reduce((sum, record) => (
        sum + getAssessmentStarRating(record.latestQuizScore)
      ), 0);
      const assessmentTotalScore = scoredAssessments.reduce((sum, score) => sum + score, 0);
      const assessmentAverageScore = scoredAssessments.length > 0
        ? Number((assessmentTotalScore / scoredAssessments.length).toFixed(2))
        : 0;
      const moduleProgressPercent = totalModules > 0
        ? Number(((completedModules / totalModules) * 100).toFixed(2))
        : 0;
      const assessmentProgressPercent = totalAssessments > 0
        ? Number(((completedAssessments / totalAssessments) * 100).toFixed(2))
        : 0;

      const completedActivities = completedLevels + completedModules + completedAssessments;
      const totalActivities = totalLevels + totalModules + totalAssessments;
      const totalStars = gameTotalStars + assessmentTotalStars;
      const totalScore = gameTotalScore + assessmentTotalScore;
      const progressPercent = totalActivities > 0
        ? Number(((completedActivities / totalActivities) * 100).toFixed(2))
        : 0;
      const lastGameAttemptAt = user.levelAttempts?.[0]?.createdAt || null;
      const lastModuleActivityAt = getLatestTimestamp(
        relevantModuleProgress.map((record) => [
          record.startedAt,
          record.lastViewedAt,
          record.completedAt,
          record.updatedAt
        ])
      );
      const lastAssessmentAttemptAt = getLatestTimestamp(
        user.materialQuizAttempts?.[0]?.createdAt || null,
        relevantAssessmentProgress.map((record) => record.completedAt)
      );
      const lastAttemptAt = getLatestTimestamp(
        lastGameAttemptAt,
        lastModuleActivityAt,
        lastAssessmentAttemptAt
      );
      const gameAttemptsCount = Number(user?._count?.levelAttempts || 0);
      const assessmentAttemptsCount = Number(user?._count?.materialQuizAttempts || 0);
      const hasAnyActivity = Boolean(lastGameAttemptAt || lastModuleActivityAt || lastAssessmentAttemptAt);
      const activityRecordCount = [
        gameAttemptsCount > 0 ? 1 : 0,
        startedModules > 0 ? 1 : 0,
        assessmentAttemptsCount > 0 ? 1 : 0
      ].reduce((sum, count) => sum + count, 0);

      return {
        ...sanitizedUser,
        metrics: {
          completedLevels,
          totalLevels,
          completedModules,
          totalModules,
          startedModules,
          completedAssessments,
          totalAssessments,
          completedActivities,
          totalActivities,
          totalStars,
          gameTotalStars,
          assessmentTotalStars,
          totalScore,
          gameProgressPercent,
          moduleProgressPercent,
          assessmentProgressPercent,
          assessmentAverageScore,
          attemptedAssessments: attemptedAssessmentProgress.length,
          gameAttemptsCount,
          assessmentAttemptsCount,
          progressPercent,
          lastGameAttemptAt,
          lastModuleActivityAt,
          lastAssessmentAttemptAt,
          lastAttemptAt,
          hasAnyActivity,
          activityRecordCount,
        }
      };
    });

    res.status(200).json(
      successResponse(
        {
          users: sanitizedUsers,
          ...paginationData.pagination
        },
        'Users retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

// Get user by ID
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
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
        createdStudents: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            isArchived: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            exams: true,
            scores: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json(
        errorResponse('User not found')
      );
    }

    // Check access permissions
    if (req.user.role === 'TEACHER') {
      // Teachers can only view their own profile or their students
      if (user.id !== req.user.id && user.teacherId !== req.user.id) {
        return res.status(403).json(
          errorResponse('Insufficient permissions')
        );
      }
    } else if (req.user.role === 'STUDENT') {
      // Students can only view their own profile
      if (user.id !== req.user.id) {
        return res.status(403).json(
          errorResponse('Insufficient permissions')
        );
      }
    }

    const sanitizedUser = sanitizeUser(user);

    res.status(200).json(
      successResponse(
        sanitizedUser,
        'User retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

// Create teacher/student (super admin only)
const createUser = async (req, res, next) => {
  try {
    const {
      email,
      password,
      role,
      firstName,
      lastName,
      section,
      academicYear,
      username: providedUsername
    } = req.body;
    
    // Check permissions
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json(
        errorResponse('Only super admins can create user accounts')
      );
    }

    // Determine username
    let username;
    if (providedUsername) {
      // Validate provided username format
      if (role === 'STUDENT' && !providedUsername.endsWith('@student.com')) {
        return res.status(400).json(
          errorResponse('Student username must end with @student.com')
        );
      }
      if (role === 'TEACHER' && !providedUsername.endsWith('@teacher.com')) {
        return res.status(400).json(
          errorResponse('Teacher username must end with @teacher.com')
        );
      }
      username = providedUsername;
    } else {
      // Generate username based on email and role if not provided
      username = generateUsername(email, role);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json(
        errorResponse('User with this username or email already exists')
      );
    }

    // Generate temporary password if not provided
    const userPassword = password || crypto.randomBytes(8).toString('hex') + 'A1!';
    const hashedPassword = await hashPassword(userPassword);

    const normalizedSection = normalizeStudentSection(section);

    const newUser = await prisma.$transaction(async (tx) => {
      const userData = {
        username,
        email,
        password: hashedPassword,
        role,
        firstName: firstName || null,
        lastName: lastName || null,
        section: role === 'STUDENT' ? normalizedSection || null : null,
        academicYear: role === 'STUDENT' ? String(academicYear || '').trim() || null : null,
        isVerified: role === 'SUPER_ADMIN'
      };

      if (role === 'TEACHER') {
        userData.courseCode = await generateUniqueTeacherCourseCode(tx);
      }

      // For students, set the teacher relationship
      if (role === 'STUDENT' && req.user.role === 'TEACHER') {
        userData.teacherId = req.user.id;
      }

      if (role === 'STUDENT' && normalizedSection) {
        const activeCount = await tx.user.count({
          where: {
            role: 'STUDENT',
            isArchived: false,
            section: normalizedSection,
          },
        });

        if (activeCount >= MAX_STUDENTS_PER_SECTION) {
          throw createSectionCapacityError(normalizedSection, activeCount);
        }
      }

      const createdUser = await tx.user.create({
        data: userData
      });

      if (role === 'STUDENT') {
        await initializeStudentProgression(createdUser.id, tx);
      }

      return createdUser;
    });

    // Send the login username and created password to the new user's email.
    const isTemporaryPassword = !password;
    await sendWelcomeEmail({
      email,
      userName: firstName || email.split('@')[0],
      role,
      username,
      password: userPassword,
      isTemporaryPassword,
      purpose: EMAIL_PURPOSES.ACCOUNT_CREATED
    });

    const sanitizedUser = sanitizeUser(newUser);

    res.status(201).json(
      successResponse(
        {
          user: sanitizedUser,
          ...(isTemporaryPassword && { temporaryPassword: userPassword })
        },
        `${role.toLowerCase()} account created successfully`
      )
    );
  } catch (error) {
    next(error);
  }
};

const previewBulkStudentUpload = async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json(
        errorResponse('Only super admins can preview batch student uploads')
      );
    }

    if (!req.file) {
      return res.status(400).json(
        errorResponse('Please upload an Excel file (.xlsx or .xls)')
      );
    }

    const parsedRows = await parseStudentUploadFile(req.file);

    if (parsedRows.length === 0) {
      return res.status(400).json(
        errorResponse('No student rows were detected in the uploaded file')
      );
    }

    const validatedRows = await validateStudentUploadDrafts(parsedRows);

    res.status(200).json(
      successResponse(
        {
          rows: validatedRows,
          summary: {
            totalRows: validatedRows.length,
            validRows: validatedRows.filter((row) => row.isValid).length,
            invalidRows: validatedRows.filter((row) => !row.isValid).length,
          },
        },
        'Student upload preview generated successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

const bulkCreateStudents = async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json(
        errorResponse('Only super admins can batch create student accounts')
      );
    }

    const studentRows = Array.isArray(req.body?.students) ? req.body.students : [];

    if (studentRows.length === 0) {
      return res.status(400).json(
        errorResponse('At least one student row is required for batch creation')
      );
    }

    const normalizedDrafts = studentRows.map((row, index) => buildStudentDraftFromRaw(row, index + 1));
    const validatedRows = await validateStudentUploadDrafts(normalizedDrafts);
    const invalidRows = validatedRows.filter((row) => !row.isValid);

    if (invalidRows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Some student rows still have validation issues',
        details: {
          rows: validatedRows,
        },
      });
    }

    const createdStudents = [];
    const creationWarnings = [];

    for (const row of validatedRows) {
      const { createdUser, password } = await createStudentUserFromDraft(row, req.user);

      try {
        await sendWelcomeEmail({
          email: createdUser.email,
          userName: createdUser.firstName || createdUser.username,
          role: createdUser.role,
          username: createdUser.username,
          password,
          isTemporaryPassword: false,
          purpose: EMAIL_PURPOSES.ACCOUNT_CREATED
        });
      } catch (emailError) {
        creationWarnings.push({
          rowNumber: row.rowNumber,
          email: createdUser.email,
          message: 'Student account was created, but the welcome email could not be sent.',
        });
      }

      createdStudents.push(sanitizeUser(createdUser));
    }

    res.status(201).json(
      successResponse(
        {
          users: createdStudents,
          warnings: creationWarnings,
          summary: {
            totalRows: validatedRows.length,
            createdCount: createdStudents.length,
            warningCount: creationWarnings.length,
          },
        },
        'Student accounts created successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

const previewBatchTeacherUpload = async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json(
        errorResponse('Only super admins can preview batch teacher uploads')
      );
    }

    if (!req.file) {
      return res.status(400).json(
        errorResponse('Please upload an Excel file (.xlsx or .xls)')
      );
    }

    const parsedRows = await parseTeacherUploadFile(req.file);

    if (parsedRows.length === 0) {
      return res.status(400).json(
        errorResponse('No teacher rows were detected in the uploaded file')
      );
    }

    const validatedRows = await validateTeacherUploadDrafts(parsedRows);

    res.status(200).json(
      successResponse(
        {
          rows: validatedRows,
          summary: {
            totalRows: validatedRows.length,
            validRows: validatedRows.filter((row) => row.isValid).length,
            invalidRows: validatedRows.filter((row) => !row.isValid).length,
          },
        },
        'Teacher upload preview generated successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

const batchCreateTeachers = async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json(
        errorResponse('Only super admins can batch create teacher accounts')
      );
    }

    const teacherRows = Array.isArray(req.body?.teachers) ? req.body.teachers : [];

    if (teacherRows.length === 0) {
      return res.status(400).json(
        errorResponse('At least one teacher row is required for batch creation')
      );
    }

    const normalizedDrafts = teacherRows.map((row, index) => buildTeacherDraftFromRaw(row, index + 1));
    const validatedRows = await validateTeacherUploadDrafts(normalizedDrafts);
    const invalidRows = validatedRows.filter((row) => !row.isValid);

    if (invalidRows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Some teacher rows still have validation issues',
        details: {
          rows: validatedRows,
        },
      });
    }

    const createdTeachers = [];
    const creationWarnings = [];

    for (const row of validatedRows) {
      const { createdUser, password } = await createTeacherUserFromDraft(row);

      try {
        await sendWelcomeEmail({
          email: createdUser.email,
          userName: createdUser.firstName || createdUser.username,
          role: createdUser.role,
          username: createdUser.username,
          password,
          isTemporaryPassword: false,
          purpose: EMAIL_PURPOSES.ACCOUNT_CREATED
        });
      } catch (emailError) {
        creationWarnings.push({
          rowNumber: row.rowNumber,
          email: createdUser.email,
          message: 'Teacher account was created, but the welcome email could not be sent.',
        });
      }

      createdTeachers.push(sanitizeUser(createdUser));
    }

    res.status(201).json(
      successResponse(
        {
          users: createdTeachers,
          warnings: creationWarnings,
          summary: {
            totalRows: validatedRows.length,
            createdCount: createdTeachers.length,
            warningCount: creationWarnings.length,
          },
        },
        'Teacher accounts created successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

// Update user
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, section, academicYear, isArchived } = req.body;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json(
        errorResponse('User not found')
      );
    }

    // Check permissions
    if (req.user.role === 'TEACHER') {
      // Teachers can only update their students or their own profile
      if (user.id !== req.user.id && user.teacherId !== req.user.id) {
        return res.status(403).json(
          errorResponse('Insufficient permissions')
        );
      }
      
      // Teachers cannot change isArchived status
      if (isArchived !== undefined && user.id !== req.user.id) {
        return res.status(403).json(
          errorResponse('Teachers cannot archive/unarchive accounts')
        );
      }
    } else if (req.user.role === 'STUDENT') {
      // Students can only update their own profile
      if (user.id !== req.user.id) {
        return res.status(403).json(
          errorResponse('Insufficient permissions')
        );
      }
    }

    // Check if email already exists for another user
    if (email && email !== user.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id }
        }
      });

      if (existingUser) {
        return res.status(400).json(
          errorResponse('Email already in use by another account')
        );
      }
    }

    if (user.role === 'STUDENT' && academicYear !== undefined) {
      const normalizedAcademicYear = String(academicYear || '').trim();
      if (normalizedAcademicYear && !/^\d{4}-\d{4}$/.test(normalizedAcademicYear)) {
        return res.status(400).json(
          errorResponse('Academic year must use the format YYYY-YYYY, like 2025-2026')
        );
      }
    }

    if (user.role === 'STUDENT' && section !== undefined) {
      const normalizedSection = normalizeStudentSection(section);

      if (normalizedSection) {
        const activeCount = await prisma.user.count({
          where: {
            role: 'STUDENT',
            isArchived: false,
            section: normalizedSection,
            id: {
              not: user.id,
            },
          },
        });

        if (activeCount >= MAX_STUDENTS_PER_SECTION) {
          return res.status(400).json(
            errorResponse(
              `Section "${normalizedSection}" already has ${activeCount} active student${activeCount === 1 ? '' : 's'}. The maximum is ${MAX_STUDENTS_PER_SECTION}.`
            )
          );
        }
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email && { email }),
        ...(user.role === 'STUDENT' && section !== undefined && { section: String(section || '').trim() || null }),
        ...(user.role === 'STUDENT' && academicYear !== undefined && { academicYear: String(academicYear || '').trim() || null }),
        ...(isArchived !== undefined && 
            req.user.role === 'SUPER_ADMIN' && { isArchived })
      }
    });

    const sanitizedUser = sanitizeUser(updatedUser);

    res.status(200).json(
      successResponse(
        sanitizedUser,
        'User updated successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

// Archive user (move to archive table)
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Find user with all related data
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        teacher: true,
        createdStudents: true,
        exams: true,
        scores: true,
        createdExams: true
      }
    });

    if (!user) {
      return res.status(404).json(
        errorResponse('User not found')
      );
    }

    // Check permissions
    if (req.user.role === 'TEACHER') {
      // Teachers can only archive their students
      if (user.teacherId !== req.user.id) {
        return res.status(403).json(
          errorResponse('Teachers can only archive their own students')
        );
      }
    } else if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json(
        errorResponse('Insufficient permissions')
      );
    }

    // Prevent self-archiving
    if (user.id === req.user.id) {
      return res.status(400).json(
        errorResponse('Cannot archive your own account')
      );
    }

    // Start transaction to move user to archive table
    await prisma.$transaction(async (tx) => {
      // Create archived user record with complete data
      await tx.archivedUser.create({
        data: {
          userId: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          section: user.section,
          academicYear: user.academicYear,
          teacherId: user.teacherId,
          archivedBy: req.user.id,
          archiveReason: reason || 'No reason provided',
          userData: JSON.stringify({
            ...user,
            scores: undefined, // Don't duplicate relational data
            exams: undefined,
            createdExams: undefined,
            createdStudents: undefined,
            teacher: undefined
          })
        }
      });

      // Mark user as archived in main table (soft delete)
      await tx.user.update({
        where: { id },
        data: { isArchived: true }
      });
    });

    res.status(200).json(
      successResponse(
        null,
        'User archived successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

const archiveUsersBulk = async (req, res, next) => {
  try {
    const { userIds, reason } = req.body || {};
    const normalizedUserIds = [...new Set(
      (Array.isArray(userIds) ? userIds : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )];

    if (normalizedUserIds.length === 0) {
      return res.status(400).json(
        errorResponse('At least one student must be selected for archiving')
      );
    }

    if (normalizedUserIds.includes(req.user.id)) {
      return res.status(400).json(
        errorResponse('Cannot archive your own account')
      );
    }

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: normalizedUserIds
        }
      },
      include: {
        teacher: true,
        createdStudents: true,
        exams: true,
        scores: true,
        createdExams: true
      }
    });

    if (users.length !== normalizedUserIds.length) {
      return res.status(404).json(
        errorResponse('One or more selected students could not be found')
      );
    }

    const invalidUsers = users.filter((user) => user.role !== 'STUDENT' || user.isArchived);
    if (invalidUsers.length > 0) {
      return res.status(400).json(
        errorResponse('Only active student accounts can be archived in bulk')
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const user of users) {
        await tx.archivedUser.create({
          data: {
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            section: user.section,
            academicYear: user.academicYear,
            teacherId: user.teacherId,
            archivedBy: req.user.id,
            archiveReason: reason || 'Bulk archived by super admin',
            userData: JSON.stringify({
              ...user,
              scores: undefined,
              exams: undefined,
              createdExams: undefined,
              createdStudents: undefined,
              teacher: undefined
            })
          }
        });

        await tx.user.update({
          where: { id: user.id },
          data: { isArchived: true }
        });
      }
    });

    res.status(200).json(
      successResponse(
        { archivedCount: users.length },
        `${users.length} student${users.length === 1 ? '' : 's'} archived successfully`
      )
    );
  } catch (error) {
    next(error);
  }
};

// Restore archived user
const restoreUser = async (req, res, next) => {
  try {
    const { id } = req.params; // This is the userId of the archived user
    
    // Find archived user
    const archivedUser = await prisma.archivedUser.findUnique({
      where: { userId: id }
    });

    if (!archivedUser) {
      return res.status(404).json(
        errorResponse('Archived user not found')
      );
    }

    // Check permissions
    if (req.user.role === 'TEACHER') {
      // Teachers can only restore their students
      if (archivedUser.teacherId !== req.user.id) {
        return res.status(403).json(
          errorResponse('Teachers can only restore their own students')
        );
      }
    } else if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json(
        errorResponse('Insufficient permissions')
      );
    }

    // Start transaction to restore user
    await prisma.$transaction(async (tx) => {
      // Update user to mark as active
      await tx.user.update({
        where: { id },
        data: { isArchived: false }
      });

      // Remove from archive table
      await tx.archivedUser.delete({
        where: { userId: id }
      });
    });

    res.status(200).json(
      successResponse(
        null,
        'User restored successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

const restoreUsersBulk = async (req, res, next) => {
  try {
    const { userIds } = req.body || {};
    const normalizedUserIds = [...new Set(
      (Array.isArray(userIds) ? userIds : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )];

    if (normalizedUserIds.length === 0) {
      return res.status(400).json(
        errorResponse('At least one student must be selected for restore')
      );
    }

    const archivedUsers = await prisma.archivedUser.findMany({
      where: {
        userId: {
          in: normalizedUserIds
        }
      }
    });

    if (archivedUsers.length !== normalizedUserIds.length) {
      return res.status(404).json(
        errorResponse('One or more selected archived students could not be found')
      );
    }

    const invalidUsers = archivedUsers.filter((user) => user.role !== 'STUDENT');
    if (invalidUsers.length > 0) {
      return res.status(400).json(
        errorResponse('Only archived student accounts can be restored in bulk')
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const archivedUser of archivedUsers) {
        await tx.user.update({
          where: { id: archivedUser.userId },
          data: { isArchived: false }
        });

        await tx.archivedUser.delete({
          where: { userId: archivedUser.userId }
        });
      }
    });

    res.status(200).json(
      successResponse(
        { restoredCount: archivedUsers.length },
        `${archivedUsers.length} student${archivedUsers.length === 1 ? '' : 's'} restored successfully`
      )
    );
  } catch (error) {
    next(error);
  }
};

// Permanently delete archived user
const permanentlyDeleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        createdExams: {
          select: {
            id: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json(
        errorResponse('User not found')
      );
    }

    if (!user.isArchived) {
      return res.status(400).json(
        errorResponse('Only archived users can be permanently deleted')
      );
    }

    if (req.user.role === 'TEACHER') {
      if (user.role !== 'STUDENT' || user.teacherId !== req.user.id) {
        return res.status(403).json(
          errorResponse('Teachers can only permanently delete their own archived students')
        );
      }
    } else if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json(
        errorResponse('Insufficient permissions')
      );
    }

    if (user.id === req.user.id) {
      return res.status(400).json(
        errorResponse('Cannot permanently delete your own account')
      );
    }

    await prisma.$transaction(async (tx) => {
      await removeUserDependenciesForPermanentDelete(tx, user);

      await tx.archivedUser.deleteMany({
        where: { userId: id }
      });

      await tx.user.delete({
        where: { id }
      });
    });

    res.status(200).json(
      successResponse(
        null,
        'User permanently deleted successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

// Get archived users
const getArchivedUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    const where = {};
    
    // For teachers, only show their archived students
    if (req.user.role === 'TEACHER') {
      where.teacherId = req.user.id;
    }
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { academicYear: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count
    const totalCount = await prisma.archivedUser.count({ where });
    
    // Get pagination data
    const paginationData = getPaginationData(page, limit, totalCount);
    
    // Get archived users
    const archivedUsers = await prisma.archivedUser.findMany({
      where,
      orderBy: { archivedAt: 'desc' },
      skip: paginationData.offset,
      take: paginationData.limit
    });

    res.status(200).json(
      successResponse(
        {
          archivedUsers,
          ...paginationData.pagination
        },
        'Archived users retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

// Get students for a teacher (active only by default)
const getMyStudents = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(
        errorResponse('Only teachers can view their students')
      );
    }

    const { page = 1, limit = 10, search, isArchived } = req.query;
    
    const where = {
      teacherId: req.user.id,
      isArchived: isArchived === 'true' ? true : false // Default to active students
    };
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count
    const totalCount = await prisma.user.count({ where });
    
    // Get pagination data
    const paginationData = getPaginationData(page, limit, totalCount);
    
    // Get students
    const students = await prisma.user.findMany({
      where,
      include: {
        _count: {
          select: {
            exams: true,
            scores: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: paginationData.offset,
      take: paginationData.limit
    });

    const sanitizedStudents = students.map(student => sanitizeUser(student));

    res.status(200).json(
      successResponse(
        {
          students: sanitizedStudents,
          ...paginationData.pagination
        },
        'Students retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

const getMyCourseCode = async (req, res, next) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json(
        errorResponse('Only teachers can access course code settings')
      );
    }

    const teacher = await prisma.$transaction((tx) => ensureTeacherCourseCode(req.user.id, tx));
    if (!teacher) {
      return res.status(404).json(
        errorResponse('Teacher account not found')
      );
    }

    return res.status(200).json(
      successResponse(
        {
          courseCode: teacher.courseCode,
        },
        'Course code retrieved successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

const getMyCourseEnrollment = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(
        errorResponse('Only students can access course enrollment settings')
      );
    }

    const student = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        role: true,
        teacherId: true,
        teacher: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            courseCode: true,
            isArchived: true,
          },
        },
      },
    });

    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json(
        errorResponse('Student account not found')
      );
    }

    const teacher = student.teacher && !student.teacher.isArchived
      ? {
          id: student.teacher.id,
          username: student.teacher.username,
          firstName: student.teacher.firstName,
          lastName: student.teacher.lastName,
          displayName: buildTeacherDisplayName(student.teacher),
          courseCode: student.teacher.courseCode || null,
        }
      : null;

    return res.status(200).json(
      successResponse(
        {
          hasEnrollment: Boolean(teacher),
          teacher,
          courseCode: teacher?.courseCode || null,
        },
        'Course enrollment retrieved successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

const assignStudentToTeacher = async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json(
        errorResponse('Only super admins can assign students to teachers')
      );
    }

    const {
      studentId,
      teacherId,
      resetProgress = false,
    } = req.body || {};

    if (!studentId || !teacherId) {
      return res.status(400).json(
        errorResponse('studentId and teacherId are required')
      );
    }

    if (studentId === teacherId) {
      return res.status(400).json(
        errorResponse('studentId and teacherId must be different')
      );
    }

    const [student, teacher] = await Promise.all([
      prisma.user.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          role: true,
          teacherId: true,
          isArchived: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: teacherId },
        select: {
          id: true,
          role: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          isArchived: true,
        },
      }),
    ]);

    if (!student || student.role !== 'STUDENT' || student.isArchived) {
      return res.status(404).json(
        errorResponse('Student account not found')
      );
    }

    if (!teacher || teacher.role !== 'TEACHER' || teacher.isArchived) {
      return res.status(404).json(
        errorResponse('Teacher account not found')
      );
    }

    if (student.teacherId === teacher.id) {
      return res.status(200).json(
        successResponse(
          {
            studentId: student.id,
            teacher: {
              id: teacher.id,
              username: teacher.username,
              firstName: teacher.firstName,
              lastName: teacher.lastName,
              displayName: buildTeacherDisplayName(teacher),
            },
            replacedTeacher: false,
            progressReset: false,
          },
          'Student is already assigned to this teacher'
        )
      );
    }

    const replacingTeacher = Boolean(student.teacherId && student.teacherId !== teacher.id);

    await prisma.$transaction(async (tx) => {
      if (resetProgress && replacingTeacher) {
        await resetStudentProgressionForEnrollmentChange(student.id, tx);
      }

      await tx.user.update({
        where: { id: student.id },
        data: { teacherId: teacher.id },
      });
    });

    return res.status(200).json(
      successResponse(
        {
          studentId: student.id,
          teacher: {
            id: teacher.id,
            username: teacher.username,
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            displayName: buildTeacherDisplayName(teacher),
          },
          replacedTeacher: replacingTeacher,
          progressReset: Boolean(resetProgress && replacingTeacher),
        },
        'Student assignment updated successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

const enrollWithCourseCode = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json(
        errorResponse('Only students can update course enrollment')
      );
    }

    const courseCode = normalizeCourseCode(req.body?.courseCode);
    const confirmProgressReset = req.body?.confirmProgressReset === true;

    if (!courseCode) {
      return res.status(400).json(
        errorResponse('Course code is required')
      );
    }

    const [student, teacher] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          role: true,
          teacherId: true,
          isArchived: true,
        },
      }),
      prisma.user.findUnique({
        where: { courseCode },
        select: {
          id: true,
          role: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          courseCode: true,
          isArchived: true,
        },
      }),
    ]);

    if (!student || student.role !== 'STUDENT' || student.isArchived) {
      return res.status(404).json(
        errorResponse('Student account not found')
      );
    }

    if (!teacher || teacher.role !== 'TEACHER' || teacher.isArchived) {
      return res.status(404).json(
        errorResponse('Course code was not found')
      );
    }

    if (student.teacherId === teacher.id) {
      return res.status(200).json(
        successResponse(
          {
            hasEnrollment: true,
            teacher: {
              id: teacher.id,
              username: teacher.username,
              firstName: teacher.firstName,
              lastName: teacher.lastName,
              displayName: buildTeacherDisplayName(teacher),
              courseCode: teacher.courseCode,
            },
            courseCode: teacher.courseCode,
            replacedTeacher: false,
            progressReset: false,
          },
          'You are already enrolled with this teacher'
        )
      );
    }

    const replacingTeacher = Boolean(student.teacherId && student.teacherId !== teacher.id);

    if (replacingTeacher && !confirmProgressReset) {
      return res.status(409).json({
        ...errorResponse('Changing course code will reset your game progress. Please confirm to continue.'),
        data: {
          requiresConfirmation: true,
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      if (replacingTeacher) {
        await resetStudentProgressionForEnrollmentChange(student.id, tx);
      }

      await tx.user.update({
        where: { id: student.id },
        data: { teacherId: teacher.id },
      });
    });

    return res.status(200).json(
      successResponse(
        {
          hasEnrollment: true,
          teacher: {
            id: teacher.id,
            username: teacher.username,
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            displayName: buildTeacherDisplayName(teacher),
            courseCode: teacher.courseCode,
          },
          courseCode: teacher.courseCode,
          replacedTeacher: replacingTeacher,
          progressReset: replacingTeacher,
        },
        replacingTeacher
          ? 'Course code replaced and progress reset successfully'
          : 'Course code linked successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

const removeCourseEnrollment = async (req, res, next) => {
  try {
    return res.status(403).json(
      errorResponse('Self-enrollment is disabled. Contact an administrator to update teacher assignment.')
    );
  } catch (error) {
    return next(error);
  }
};

const clearStudentTeacherAssignment = async (req, res, next) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json(
        errorResponse('Only super admins can clear student-teacher assignments')
      );
    }

    const { studentId } = req.params;
    const { resetProgress = false } = req.body || {};

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        role: true,
        teacherId: true,
        isArchived: true,
      },
    });

    if (!student || student.role !== 'STUDENT' || student.isArchived) {
      return res.status(404).json(
        errorResponse('Student account not found')
      );
    }

    if (!student.teacherId) {
      return res.status(200).json(
        successResponse(
          {
            studentId: student.id,
            progressReset: false,
          },
          'Student has no teacher assignment to clear'
        )
      );
    }

    await prisma.$transaction(async (tx) => {
      if (resetProgress) {
        await resetStudentProgressionForEnrollmentChange(student.id, tx);
      }

      await tx.user.update({
        where: { id: student.id },
        data: { teacherId: null },
      });
    });

    return res.status(200).json(
      successResponse(
        {
          studentId: student.id,
          progressReset: Boolean(resetProgress),
        },
        'Student teacher assignment cleared successfully'
      )
    );
  } catch (error) {
    return next(error);
  }
};

// Reset user password (generate new temporary password)
const resetUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json(
        errorResponse('User not found')
      );
    }

    // Check permissions
    if (req.user.role === 'TEACHER' && user.teacherId !== req.user.id) {
      return res.status(403).json(
        errorResponse('Teachers can only reset passwords for their students')
      );
    } else if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'TEACHER') {
      return res.status(403).json(
        errorResponse('Insufficient permissions')
      );
    }

    // Generate new temporary password
    const temporaryPassword = crypto.randomBytes(8).toString('hex') + 'A1!';
    const hashedPassword = await hashPassword(temporaryPassword);

    // Update user password
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    // Send email with new password
    await sendWelcomeEmail({
      email: user.email,
      userName: user.firstName || user.username,
      role: user.role,
      username: user.username,
      password: temporaryPassword,
      isTemporaryPassword: true,
      purpose: EMAIL_PURPOSES.PASSWORD_RESET
    });

    res.status(200).json(
      successResponse(
        { temporaryPassword },
        'Password reset successfully. New temporary password sent to user email.'
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  previewBulkStudentUpload,
  bulkCreateStudents,
  previewBatchTeacherUpload,
  batchCreateTeachers,
  updateUser,
  deleteUser,
  archiveUsersBulk,
  restoreUser,
  restoreUsersBulk,
  permanentlyDeleteUser,
  getArchivedUsers,
  getMyStudents,
  getMyCourseCode,
  getMyCourseEnrollment,
  assignStudentToTeacher,
  clearStudentTeacherAssignment,
  enrollWithCourseCode,
  removeCourseEnrollment,
  resetUserPassword
};
