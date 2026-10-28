const { body, validationResult, param, query } = require('express-validator');
const validator = require('validator');

const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_#-])[A-Za-z\d@$!%*?&_#-]+$/;
const ROOM_VIEWPORT_WIDTH = 1296;
const ROOM_VIEWPORT_HEIGHT = 720;
const SHARED_GRID_SNAP_OPTIONS = [0, 16, 24, 48];
const PLAYABLE_GAME_TYPES = ['GAME_ONE', 'GAME_TWO', 'GAME_THREE', 'GAME_FOUR', 'GAME_FIVE', 'GAME_SIX'];
const PLAYABLE_GAME_TYPES_MESSAGE = `Game type must be ${PLAYABLE_GAME_TYPES.join(', ')}`;

// Custom validation function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: formattedErrors
    });
  }
  
  next();
};

// Custom validator for role-based usernames
const validateRoleBasedUsername = (value, { req }) => {
  const { role } = req.body;
  
  if (role === 'STUDENT' && !value.endsWith('@student.com')) {
    throw new Error('Student username must end with @student.com');
  }
  
  if (role === 'TEACHER' && !value.endsWith('@teacher.com')) {
    throw new Error('Teacher username must end with @teacher.com');
  }
  
  if (role === 'SUPER_ADMIN') {
    // Super admin can have any valid email format
    if (!validator.isEmail(value)) {
      throw new Error('Super admin username must be a valid email');
    }
  }
  
  return true;
};

const validateCreatePassword = (value, { req }) => {
  const { role } = req.body;

  if (!value || value.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  if (role === 'SUPER_ADMIN' && !strongPasswordPattern.test(value)) {
    throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&_#-)');
  }

  return true;
};

// Authentication validation rules
const registerValidation = () => [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .custom(validateRoleBasedUsername),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .custom(validateCreatePassword),
  
  body('role')
    .isIn(['STUDENT', 'TEACHER', 'SUPER_ADMIN'])
    .withMessage('Role must be either STUDENT, TEACHER, or SUPER_ADMIN'),
  
  body('firstName')
    .optional()
    .isLength({ min: 2, max: 30 })
    .withMessage('First name must be between 2 and 30 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('lastName')
    .optional()
    .isLength({ min: 2, max: 30 })
    .withMessage('Last name must be between 2 and 30 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),

  body('section')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 1, max: 40 })
    .withMessage('Section must be between 1 and 40 characters')
    .matches(/^[a-zA-Z0-9\s._-]+$/)
    .withMessage('Section can only contain letters, numbers, spaces, dots, underscores, and hyphens'),

  body('academicYear')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Academic year must use the format YYYY-YYYY, like 2025-2026'),
  
  handleValidationErrors
];

const loginValidation = () => [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ max: 50 })
    .withMessage('Username cannot exceed 50 characters'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  body('role')
    .optional()
    .isIn(['STUDENT', 'TEACHER', 'SUPER_ADMIN'])
    .withMessage('Role must be either STUDENT, TEACHER, or SUPER_ADMIN'),
  
  handleValidationErrors
];

const otpValidation = () => [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('otpCode')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  
  handleValidationErrors
];

const requestOtpValidation = () => [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  handleValidationErrors
];

const changePasswordValidation = () => [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(strongPasswordPattern)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&_#-)'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  
  handleValidationErrors
];

const updateProfileValidation = () => [
  body('firstName')
    .optional()
    .isLength({ min: 2, max: 30 })
    .withMessage('First name must be between 2 and 30 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),

  body('lastName')
    .optional()
    .isLength({ min: 2, max: 30 })
    .withMessage('Last name must be between 2 and 30 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('avatarKey')
    .optional()
    .matches(/^(girl-avatar-[1-4]|boy-avatar-[1-4])$/)
    .withMessage('Please provide a valid avatar selection'),

  handleValidationErrors
];

// Exam validation rules
const examValidation = () => [
  body('title')
    .isLength({ min: 3, max: 100 })
    .withMessage('Exam title must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('timeLimit')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Time limit must be between 1 and 480 minutes'),
  
  body('totalMarks')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Total marks must be a non-negative integer'),
  
  handleValidationErrors
];

// Generic ID validation
const idValidation = () => [
  param('id')
    .isLength({ min: 1 })
    .withMessage('ID is required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid ID format'),
  
  handleValidationErrors
];

// Pagination validation
const paginationValidation = () => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

const gameTypeQueryValidation = () => [
  query('gameType')
    .isIn(PLAYABLE_GAME_TYPES)
    .withMessage(PLAYABLE_GAME_TYPES_MESSAGE),

  handleValidationErrors
];

const gameTypeParamValidation = () => [
  param('gameType')
    .isIn(PLAYABLE_GAME_TYPES)
    .withMessage(PLAYABLE_GAME_TYPES_MESSAGE),

  handleValidationErrors
];

const gameLevelNumberValidation = () => [
  param('levelNumber')
    .isInt({ min: 1, max: 20 })
    .withMessage('Level number must be between 1 and 20'),

  handleValidationErrors
];

const levelSessionSubmitValidation = () => [
  param('sessionId')
    .isLength({ min: 1 })
    .withMessage('Session ID is required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid session ID format'),

  body('outcome')
    .optional()
    .isIn(['COMPLETED', 'FAILED'])
    .withMessage('Outcome must be COMPLETED or FAILED'),

  body('mistakes')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Mistakes must be a non-negative integer'),

  body('hintsUsed')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Hints used must be a non-negative integer'),

  body('baseScore')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Base score must be a non-negative integer'),

  handleValidationErrors
];

const teacherStudentIdValidation = () => [
  param('studentId')
    .isLength({ min: 1 })
    .withMessage('Student ID is required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid student ID format'),

  handleValidationErrors
];

const teacherPolicyValidation = () => [
  body('difficultyPreset')
    .optional()
    .isIn(['EASY', 'STANDARD', 'HARD'])
    .withMessage('Difficulty preset must be EASY, STANDARD, or HARD'),

  body('freeMistakes')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Free mistakes must be between 1 and 10'),

  body('hintStarCost')
    .optional()
    .isInt({ min: 0, max: 3 })
    .withMessage('Hint star cost must be between 0 and 3'),

  body('notes')
    .optional({ nullable: true })
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),

  handleValidationErrors
];

const contentFlagValidation = () => [
  body('gameType')
    .isIn(PLAYABLE_GAME_TYPES)
    .withMessage(PLAYABLE_GAME_TYPES_MESSAGE),

  body('levelNumber')
    .isInt({ min: 1, max: 20 })
    .withMessage('Level number must be between 1 and 20'),

  body('reason')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Reason must be between 10 and 1000 characters'),

  handleValidationErrors
];

const courseCodeEnrollmentValidation = () => [
  body('courseCode')
    .isString()
    .withMessage('Course code is required')
    .trim()
    .isLength({ min: 4, max: 32 })
    .withMessage('Course code must be between 4 and 32 characters')
    .matches(/^[a-zA-Z0-9\s-]+$/)
    .withMessage('Course code can only contain letters, numbers, spaces, and hyphens'),

  body('confirmProgressReset')
    .optional()
    .isBoolean()
    .withMessage('confirmProgressReset must be a boolean when provided'),

  handleValidationErrors
];

const courseCodeResetValidation = () => [
  body('confirmProgressReset')
    .optional()
    .isBoolean()
    .withMessage('confirmProgressReset must be a boolean when provided'),

  handleValidationErrors
];

const adminStudentAssignmentValidation = () => [
  body('studentId')
    .isLength({ min: 1 })
    .withMessage('studentId is required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid studentId format'),

  body('teacherId')
    .isLength({ min: 1 })
    .withMessage('teacherId is required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid teacherId format'),

  body('resetProgress')
    .optional()
    .isBoolean()
    .withMessage('resetProgress must be a boolean when provided'),

  handleValidationErrors,
];

const adminAssignmentResetValidation = () => [
  body('resetProgress')
    .optional()
    .isBoolean()
    .withMessage('resetProgress must be a boolean when provided'),

  handleValidationErrors,
];

const teacherLevelCanvasValidation = () => [
  body('gridRows')
    .optional()
    .isInt({ min: 8, max: 80 })
    .withMessage('gridRows must be an integer between 8 and 80'),

  body('gridCols')
    .optional()
    .isInt({ min: 8, max: 80 })
    .withMessage('gridCols must be an integer between 8 and 80'),

  body('cellBackgrounds')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined) {
        return true;
      }

      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('cellBackgrounds must be a JSON object');
      }

      const entries = Object.entries(value);
      if (entries.length > 6400) {
        throw new Error('cellBackgrounds contains too many cells');
      }

      for (const [key, background] of entries) {
        if (!/^\d+:\d+$/.test(key)) {
          throw new Error('cellBackgrounds keys must use row:col format');
        }

        if (typeof background !== 'string') {
          throw new Error('cellBackgrounds values must be strings');
        }

        if (background.length > 40) {
          throw new Error('cellBackground values cannot exceed 40 characters');
        }
      }

      return true;
    }),

  body('roomChunkData')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined) {
        return true;
      }

      if (typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('roomChunkData must be a JSON object');
      }

      if (value.settings !== undefined && value.settings !== null) {
        if (typeof value.settings !== 'object' || Array.isArray(value.settings)) {
          throw new Error('roomChunkData.settings must be a JSON object when provided');
        }

        if (value.settings.backgroundKey !== undefined && value.settings.backgroundKey !== null) {
          if (typeof value.settings.backgroundKey !== 'string') {
            throw new Error('roomChunkData.settings.backgroundKey must be a string when provided');
          }

          if (value.settings.backgroundKey.trim().length > 40) {
            throw new Error('roomChunkData.settings.backgroundKey cannot exceed 40 characters');
          }
        }

        if (value.settings.playerHealth !== undefined && value.settings.playerHealth !== null) {
          const playerHealth = Number(value.settings.playerHealth);
          if (!Number.isFinite(playerHealth) || playerHealth < 1 || playerHealth > 10) {
            throw new Error('roomChunkData.settings.playerHealth must be between 1 and 10');
          }
        }

        if (value.settings.timerEnabled !== undefined && value.settings.timerEnabled !== null && typeof value.settings.timerEnabled !== 'boolean') {
          throw new Error('roomChunkData.settings.timerEnabled must be a boolean when provided');
        }

        if (value.settings.timerSeconds !== undefined && value.settings.timerSeconds !== null) {
          const timerSeconds = Number(value.settings.timerSeconds);
          if (!Number.isFinite(timerSeconds) || timerSeconds < 10 || timerSeconds > 3600) {
            throw new Error('roomChunkData.settings.timerSeconds must be between 10 and 3600');
          }
        }

        if (value.settings.allowMidairDash !== undefined && value.settings.allowMidairDash !== null && typeof value.settings.allowMidairDash !== 'boolean') {
          throw new Error('roomChunkData.settings.allowMidairDash must be a boolean when provided');
        }

        if (value.settings.allowProjectile !== undefined && value.settings.allowProjectile !== null && typeof value.settings.allowProjectile !== 'boolean') {
          throw new Error('roomChunkData.settings.allowProjectile must be a boolean when provided');
        }

        if (value.settings.allowDoubleJump !== undefined && value.settings.allowDoubleJump !== null && typeof value.settings.allowDoubleJump !== 'boolean') {
          throw new Error('roomChunkData.settings.allowDoubleJump must be a boolean when provided');
        }

        if (value.settings.sharedGridSnap !== undefined && value.settings.sharedGridSnap !== null) {
          const sharedGridSnap = Number(value.settings.sharedGridSnap);
          if (!Number.isInteger(sharedGridSnap) || !SHARED_GRID_SNAP_OPTIONS.includes(sharedGridSnap)) {
            throw new Error('roomChunkData.settings.sharedGridSnap must be one of 0, 16, 24, or 48');
          }
        }
      }

      const rooms = Array.isArray(value.rooms) ? value.rooms : null;
      if (!rooms || rooms.length === 0) {
        throw new Error('roomChunkData.rooms must contain at least one room');
      }

      if (rooms.length > 500) {
        throw new Error('roomChunkData.rooms cannot exceed 500 rooms');
      }

      const roomIds = new Set();
      const portalLinkNameCounts = new Map();

      for (const room of rooms) {
        if (!room || typeof room !== 'object' || Array.isArray(room)) {
          throw new Error('Each room must be a JSON object');
        }

        if (typeof room.id !== 'string' || !room.id.trim()) {
          throw new Error('Each room must include a non-empty id');
        }

        const trimmedRoomId = room.id.trim();
        if (trimmedRoomId.length > 80) {
          throw new Error('room id cannot exceed 80 characters');
        }

        if (roomIds.has(trimmedRoomId)) {
          throw new Error('room ids must be unique');
        }
        roomIds.add(trimmedRoomId);

        if (!Number.isInteger(Number(room.row)) || Number(room.row) < 0 || Number(room.row) > 79) {
          throw new Error('room.row must be an integer between 0 and 79');
        }

        if (!Number.isInteger(Number(room.col)) || Number(room.col) < 0 || Number(room.col) > 79) {
          throw new Error('room.col must be an integer between 0 and 79');
        }

        if (room.backgroundKey !== undefined && room.backgroundKey !== null) {
          if (typeof room.backgroundKey !== 'string') {
            throw new Error('room.backgroundKey must be a string when provided');
          }

          if (room.backgroundKey.trim().length > 40) {
            throw new Error('room.backgroundKey cannot exceed 40 characters');
          }
        }
      }

      for (const room of rooms) {
        if (room.links === undefined || room.links === null) {
          // Continue validating other room-level optional objects like portal.
        } else {
          if (!Array.isArray(room.links)) {
            throw new Error('room.links must be an array when provided');
          }

          if (room.links.length > 12) {
            throw new Error('room.links cannot exceed 12 entries per room');
          }

          for (const link of room.links) {
            if (!link || typeof link !== 'object' || Array.isArray(link)) {
              throw new Error('room link entries must be JSON objects');
            }

            if (typeof link.targetRoomId !== 'string' || !link.targetRoomId.trim()) {
              throw new Error('Each room link must include a non-empty targetRoomId');
            }

            if (!roomIds.has(link.targetRoomId.trim())) {
              throw new Error('room link targetRoomId must reference an existing room id');
            }

            if (link.doorway !== undefined && link.doorway !== null) {
              if (typeof link.doorway !== 'string') {
                throw new Error('room link doorway must be a string when provided');
              }

              if (!['N', 'E', 'S', 'W', 'AUTO'].includes(link.doorway.trim().toUpperCase())) {
                throw new Error('room link doorway must be one of N, E, S, W, or AUTO');
              }
            }
          }
        }

        if (room.portal !== undefined && room.portal !== null) {
          if (typeof room.portal !== 'object' || Array.isArray(room.portal)) {
            throw new Error('room.portal must be a JSON object when provided');
          }

          if (room.portal.targetRoomId !== undefined && room.portal.targetRoomId !== null) {
            if (typeof room.portal.targetRoomId !== 'string') {
              throw new Error('room.portal.targetRoomId must be a string when provided');
            }

            const targetRoomId = room.portal.targetRoomId.trim();
            if (targetRoomId && !roomIds.has(targetRoomId)) {
              throw new Error('room.portal.targetRoomId must reference an existing room id');
            }
          }

          if (room.portal.endsLevel !== undefined && room.portal.endsLevel !== null && typeof room.portal.endsLevel !== 'boolean') {
            throw new Error('room.portal.endsLevel must be a boolean when provided');
          }
        }

        if (room.components !== undefined && room.components !== null) {
          if (!Array.isArray(room.components)) {
            throw new Error('room.components must be an array when provided');
          }

          if (room.components.length > 200) {
            throw new Error('room.components cannot exceed 200 entries per room');
          }

          const componentIds = new Set();
          for (const component of room.components) {
            if (!component || typeof component !== 'object' || Array.isArray(component)) {
              throw new Error('room component entries must be JSON objects');
            }

            if (typeof component.type !== 'string' || !component.type.trim()) {
              throw new Error('Each room component must include a non-empty type');
            }

            const componentType = component.type.trim();
            if (!['spawn', 'invisiblePlatform', 'triggerPlatform', 'coin', 'ghost', 'slimeGreen', 'slimeOrange', 'projectileEnemy', 'villain1', 'boss', 'portal', 'portal3', 'statue'].includes(componentType)) {
              throw new Error('room component type must be one of spawn, invisiblePlatform, triggerPlatform, coin, ghost, slimeGreen, slimeOrange, projectileEnemy, villain1, boss, portal, portal3, or statue');
            }

            if (component.id !== undefined && component.id !== null) {
              if (typeof component.id !== 'string' || !component.id.trim()) {
                throw new Error('room component id must be a non-empty string when provided');
              }

              const trimmedComponentId = component.id.trim();
              if (trimmedComponentId.length > 80) {
                throw new Error('room component id cannot exceed 80 characters');
              }

              if (componentIds.has(trimmedComponentId)) {
                throw new Error('room component ids must be unique per room');
              }

              componentIds.add(trimmedComponentId);
            }

            const x = Number(component.x);
            const y = Number(component.y);
            if (!Number.isFinite(x) || x < 0 || x > ROOM_VIEWPORT_WIDTH) {
              throw new Error(`room component x must be a number between 0 and ${ROOM_VIEWPORT_WIDTH}`);
            }

            if (!Number.isFinite(y) || y < 0 || y > ROOM_VIEWPORT_HEIGHT) {
              throw new Error(`room component y must be a number between 0 and ${ROOM_VIEWPORT_HEIGHT}`);
            }

            if (['projectileEnemy', 'villain1', 'boss'].includes(componentType) && component.fireDirection !== undefined && component.fireDirection !== null) {
              if (typeof component.fireDirection !== 'string') {
                throw new Error('projectile enemy fireDirection must be a string when provided');
              }

              const fireDirection = component.fireDirection.trim().toUpperCase();
              if (!['LEFT', 'RIGHT'].includes(fireDirection)) {
                throw new Error('projectile enemy fireDirection must be LEFT or RIGHT');
              }
            }

            if (['projectileEnemy', 'villain1', 'boss'].includes(componentType) && component.enemyType !== undefined && component.enemyType !== null) {
              if (typeof component.enemyType !== 'string') {
                throw new Error('projectile enemy enemyType must be a string when provided');
              }

              const enemyType = component.enemyType.trim().toLowerCase();
              if (!['elemental', 'hunter', 'boss', 'villain1', 'spiritboss', 'spirit-boss', 'boss6'].includes(enemyType)) {
                throw new Error('projectile enemy enemyType must be elemental, hunter, boss, villain1, or spiritboss');
              }
            }

            if (['ghost', 'slimeGreen', 'slimeOrange'].includes(componentType) && component.movementDirection !== undefined && component.movementDirection !== null) {
              if (typeof component.movementDirection !== 'string') {
                throw new Error('ghost/slime movementDirection must be a string when provided');
              }

              const movementDirection = component.movementDirection.trim().toUpperCase();
              if (!['LEFT', 'RIGHT', 'UP', 'DOWN'].includes(movementDirection)) {
                throw new Error('ghost/slime movementDirection must be LEFT, RIGHT, UP, or DOWN');
              }
            }

            if (componentType === 'spawn') {
              if (component.health !== undefined && component.health !== null) {
                const health = Number(component.health);
                if (!Number.isFinite(health) || health < 1 || health > 10) {
                  throw new Error('spawn health must be between 1 and 10');
                }
              }

              if (component.allowMidairDash !== undefined && component.allowMidairDash !== null && typeof component.allowMidairDash !== 'boolean') {
                throw new Error('spawn allowMidairDash must be a boolean when provided');
              }

              if (component.allowProjectile !== undefined && component.allowProjectile !== null && typeof component.allowProjectile !== 'boolean') {
                throw new Error('spawn allowProjectile must be a boolean when provided');
              }

              if (component.allowDoubleJump !== undefined && component.allowDoubleJump !== null && typeof component.allowDoubleJump !== 'boolean') {
                throw new Error('spawn allowDoubleJump must be a boolean when provided');
              }
            }

            if (componentType === 'invisiblePlatform') {
              const width = Number(component.width);
              const height = Number(component.height);
              if (!Number.isFinite(width) || width < 40 || width > ROOM_VIEWPORT_WIDTH) {
                throw new Error(`invisiblePlatform width must be between 40 and ${ROOM_VIEWPORT_WIDTH}`);
              }

              if (!Number.isFinite(height) || height < 8 || height > 360) {
                throw new Error('invisiblePlatform height must be between 8 and 360');
              }

              if (component.passThroughSides !== undefined && component.passThroughSides !== null) {
                if (!Array.isArray(component.passThroughSides)) {
                  throw new Error('invisiblePlatform passThroughSides must be an array when provided');
                }

                for (const side of component.passThroughSides) {
                  if (typeof side !== 'string' || !['TOP', 'BOTTOM', 'LEFT', 'RIGHT'].includes(side.trim().toUpperCase())) {
                    throw new Error('invisiblePlatform passThroughSides entries must be TOP, BOTTOM, LEFT, or RIGHT');
                  }
                }
              }
            }

            if (componentType === 'triggerPlatform') {
              if (component.triggerId !== undefined && component.triggerId !== null) {
                if (typeof component.triggerId !== 'string') {
                  throw new Error('triggerPlatform triggerId must be a string when provided');
                }

                if (component.triggerId.trim().length > 80) {
                  throw new Error('triggerPlatform triggerId cannot exceed 80 characters');
                }
              }

              if (component.cells !== undefined && component.cells !== null) {
                if (!Array.isArray(component.cells) || component.cells.length === 0) {
                  throw new Error('triggerPlatform cells must be a non-empty array when provided');
                }

                for (const cell of component.cells) {
                  if (!cell || typeof cell !== 'object') {
                    throw new Error('triggerPlatform cells must contain objects');
                  }

                  if (!Number.isInteger(Number(cell.col)) || !Number.isInteger(Number(cell.row))) {
                    throw new Error('triggerPlatform cells must include integer col and row values');
                  }
                }
              }

              if (component.passThroughSides !== undefined && component.passThroughSides !== null) {
                if (!Array.isArray(component.passThroughSides)) {
                  throw new Error('triggerPlatform passThroughSides must be an array when provided');
                }

                for (const side of component.passThroughSides) {
                  if (typeof side !== 'string' || !['TOP', 'BOTTOM', 'LEFT', 'RIGHT'].includes(side.trim().toUpperCase())) {
                    throw new Error('triggerPlatform passThroughSides entries must be TOP, BOTTOM, LEFT, or RIGHT');
                  }
                }
              }

              if (component.correctAction !== undefined && component.correctAction !== null) {
                const action = typeof component.correctAction === 'string' ? component.correctAction.trim().toUpperCase() : '';
                if (action && !['NONE', 'MOVE', 'GO_THROUGH'].includes(action)) {
                  throw new Error('triggerPlatform correctAction must be NONE, MOVE, or GO_THROUGH');
                }
              }

              if (component.wrongAction !== undefined && component.wrongAction !== null) {
                const action = typeof component.wrongAction === 'string' ? component.wrongAction.trim().toUpperCase() : '';
                if (action && !['NONE', 'MOVE', 'GO_THROUGH'].includes(action)) {
                  throw new Error('triggerPlatform wrongAction must be NONE, MOVE, or GO_THROUGH');
                }
              }

              for (const moveField of ['correctMoveTo', 'wrongMoveTo']) {
                const moveTarget = component[moveField];
                if (moveTarget === undefined || moveTarget === null) {
                  continue;
                }

                if (!moveTarget || typeof moveTarget !== 'object') {
                  throw new Error(`triggerPlatform ${moveField} must be an object when provided`);
                }

                if (!Number.isInteger(Number(moveTarget.col)) || !Number.isInteger(Number(moveTarget.row))) {
                  throw new Error(`triggerPlatform ${moveField} must include integer col and row values`);
                }
              }

              for (const goThroughField of ['correctGoThrough', 'wrongGoThrough']) {
                const goThrough = component[goThroughField];
                if (goThrough === undefined || goThrough === null) {
                  continue;
                }

                if (!goThrough || typeof goThrough !== 'object' || Array.isArray(goThrough)) {
                  throw new Error(`triggerPlatform ${goThroughField} must be an object when provided`);
                }

                if (goThrough.player !== undefined && goThrough.player !== null && typeof goThrough.player !== 'boolean') {
                  throw new Error(`triggerPlatform ${goThroughField}.player must be a boolean when provided`);
                }

                if (goThrough.entities !== undefined && goThrough.entities !== null && typeof goThrough.entities !== 'boolean') {
                  throw new Error(`triggerPlatform ${goThroughField}.entities must be a boolean when provided`);
                }
              }

              for (const tileField of ['untriggeredTileKey', 'triggeredTileKey']) {
                const tileKey = component[tileField];
                if (tileKey === undefined || tileKey === null) {
                  continue;
                }

                if (typeof tileKey !== 'string') {
                  throw new Error(`triggerPlatform ${tileField} must be a string when provided`);
                }

                if (tileKey.trim().length > 120) {
                  throw new Error(`triggerPlatform ${tileField} cannot exceed 120 characters`);
                }
              }

              if (component.invisible !== undefined && component.invisible !== null && typeof component.invisible !== 'boolean') {
                throw new Error('triggerPlatform invisible must be a boolean when provided');
              }
            }

            if (componentType === 'portal' || componentType === 'portal3') {
              if (component.linkName !== undefined && component.linkName !== null) {
                if (typeof component.linkName !== 'string') {
                  throw new Error('portal component linkName must be a string when provided');
                }

                const trimmedLinkName = component.linkName.trim();
                if (trimmedLinkName.length > 40) {
                  throw new Error('portal component linkName cannot exceed 40 characters');
                }

                if (trimmedLinkName) {
                  const count = (portalLinkNameCounts.get(trimmedLinkName) || 0) + 1;
                  if (count > 2) {
                    throw new Error('A portal linkName can only be used by two portals in the same level');
                  }
                  portalLinkNameCounts.set(trimmedLinkName, count);
                }
              }

              if (component.locked !== undefined && component.locked !== null && typeof component.locked !== 'boolean') {
                throw new Error('portal component locked must be a boolean when provided');
              }

              if (component.endsLevel !== undefined && component.endsLevel !== null && typeof component.endsLevel !== 'boolean') {
                throw new Error('portal component endsLevel must be a boolean when provided');
              }

              if (component.variant !== undefined && component.variant !== null) {
                if (typeof component.variant !== 'string') {
                  throw new Error('portal component variant must be a string when provided');
                }

                const variant = component.variant.trim().toLowerCase();
                if (variant && !['portal', 'portal3'].includes(variant)) {
                  throw new Error('portal component variant must be portal or portal3 when provided');
                }
              }
            }

            if (componentType === 'statue') {
              if (component.triggerId !== undefined && component.triggerId !== null) {
                if (typeof component.triggerId !== 'string') {
                  throw new Error('statue triggerId must be a string when provided');
                }

                if (component.triggerId.trim().length > 80) {
                  throw new Error('statue triggerId cannot exceed 80 characters');
                }
              }

              if (component.questionId !== undefined && component.questionId !== null) {
                if (typeof component.questionId !== 'string') {
                  throw new Error('legacy statue questionId must be a string when provided');
                }

                if (component.questionId.trim().length > 80) {
                  throw new Error('legacy statue questionId cannot exceed 80 characters');
                }
              }

              if (component.questionTopic !== undefined && component.questionTopic !== null) {
                if (typeof component.questionTopic !== 'string') {
                  throw new Error('statue questionTopic must be a string when provided');
                }

                if (component.questionTopic.trim().length > 140) {
                  throw new Error('statue questionTopic cannot exceed 140 characters');
                }
              }

              if (component.aiChoicesCount !== undefined && component.aiChoicesCount !== null) {
                const aiChoicesCount = Number(component.aiChoicesCount);
                if (!Number.isInteger(aiChoicesCount) || aiChoicesCount < 2 || aiChoicesCount > 6) {
                  throw new Error('statue aiChoicesCount must be between 2 and 6');
                }
              }

              if (component.aiDifficulty !== undefined && component.aiDifficulty !== null) {
                if (typeof component.aiDifficulty !== 'string') {
                  throw new Error('statue aiDifficulty must be a string when provided');
                }

                const difficulty = component.aiDifficulty.trim().toLowerCase();
                if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
                  throw new Error('statue aiDifficulty must be easy, medium, or hard');
                }
              }

              if (component.aiLanguage !== undefined && component.aiLanguage !== null) {
                if (typeof component.aiLanguage !== 'string') {
                  throw new Error('statue aiLanguage must be a string when provided');
                }

                if (component.aiLanguage.trim().length > 40) {
                  throw new Error('statue aiLanguage cannot exceed 40 characters');
                }
              }

              if (component.aiGradeLevel !== undefined && component.aiGradeLevel !== null) {
                if (typeof component.aiGradeLevel !== 'string') {
                  throw new Error('statue aiGradeLevel must be a string when provided');
                }

                if (component.aiGradeLevel.trim().length > 40) {
                  throw new Error('statue aiGradeLevel cannot exceed 40 characters');
                }
              }

              if (component.aiInstructions !== undefined && component.aiInstructions !== null) {
                if (typeof component.aiInstructions !== 'string') {
                  throw new Error('statue aiInstructions must be a string when provided');
                }

                if (component.aiInstructions.trim().length > 500) {
                  throw new Error('statue aiInstructions cannot exceed 500 characters');
                }
              }

              if (component.damageOnWrongAnswer !== undefined && component.damageOnWrongAnswer !== null) {
                const damageOnWrongAnswer = Number(component.damageOnWrongAnswer);
                if (!Number.isInteger(damageOnWrongAnswer) || damageOnWrongAnswer < 0 || damageOnWrongAnswer > 10) {
                  throw new Error('statue damageOnWrongAnswer must be a whole number between 0 and 10');
                }
              }

              if (component.prompt !== undefined && component.prompt !== null) {
                if (typeof component.prompt !== 'string') {
                  throw new Error('statue prompt must be a string when provided');
                }

                if (component.prompt.trim().length > 240) {
                  throw new Error('statue prompt cannot exceed 240 characters');
                }
              }

              if (component.choices !== undefined && component.choices !== null) {
                if (!Array.isArray(component.choices)) {
                  throw new Error('statue choices must be an array when provided');
                }

                if (component.choices.length < 2 || component.choices.length > 4) {
                  throw new Error('statue choices must include between 2 and 4 options');
                }

                for (const choice of component.choices) {
                  if (typeof choice !== 'string' || !choice.trim()) {
                    throw new Error('statue choices must contain non-empty strings');
                  }

                  if (choice.trim().length > 120) {
                    throw new Error('statue choice text cannot exceed 120 characters');
                  }
                }
              }

              if (component.correctAnswerIndex !== undefined && component.correctAnswerIndex !== null) {
                const answerIndex = Number(component.correctAnswerIndex);
                if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
                  throw new Error('statue correctAnswerIndex must be between 0 and 3');
                }
              }

            }
          }
        }
      }

      return true;
    }),

  handleValidationErrors
];

const levelContentDraftValidation = () => [
  body('levelData')
    .custom((value, { req }) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('levelData must be a JSON object');
      }

      if (!value.gameType || !PLAYABLE_GAME_TYPES.includes(value.gameType)) {
        throw new Error(`levelData.gameType must be ${PLAYABLE_GAME_TYPES.join(', ')}`);
      }

      if (!Number.isInteger(Number(value.levelNumber)) || Number(value.levelNumber) < 1) {
        throw new Error('levelData.levelNumber must be a positive integer');
      }

      if (req?.params?.gameType && value.gameType !== req.params.gameType) {
        throw new Error('levelData.gameType must match the route game type');
      }

      if (req?.params?.levelNumber && Number(value.levelNumber) !== Number(req.params.levelNumber)) {
        throw new Error('levelData.levelNumber must match the route level number');
      }

      if (!value.viewport || typeof value.viewport !== 'object') {
        throw new Error('levelData.viewport is required');
      }

      if (value.gameType === 'GAME_FOUR') {
        if (!Array.isArray(value.rounds) || value.rounds.length === 0) {
          throw new Error('levelData.rounds must contain at least one round for GAME_FOUR');
        }
      } else if (value.gameType === 'GAME_FIVE' || value.gameType === 'GAME_SIX') {
        if (!value.settings || typeof value.settings !== 'object' || Array.isArray(value.settings)) {
          throw new Error(`levelData.settings must be a JSON object for ${value.gameType}`);
        }
      } else if (!Array.isArray(value.rooms) || value.rooms.length === 0) {
        throw new Error('levelData.rooms must contain at least one room');
      }

      return true;
    }),

  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  otpValidation,
  requestOtpValidation,
  changePasswordValidation,
  updateProfileValidation,
  examValidation,
  idValidation,
  paginationValidation,
  gameTypeQueryValidation,
  gameTypeParamValidation,
  gameLevelNumberValidation,
  levelSessionSubmitValidation,
  teacherStudentIdValidation,
  teacherPolicyValidation,
  contentFlagValidation,
  courseCodeEnrollmentValidation,
  courseCodeResetValidation,
  adminStudentAssignmentValidation,
  adminAssignmentResetValidation,
  teacherLevelCanvasValidation,
  levelContentDraftValidation,
  handleValidationErrors
};
