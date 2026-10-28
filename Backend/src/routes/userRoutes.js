const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
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
} = require('../controllers/userController');
const {
  getMyStudentsRoster,
  getStudentProgressDetail,
  getRosterLeaderboard,
  getStudentCourseLeaderboard,
  upsertStudentPolicy,
  requestContentRegeneration,
  getMyContentFlags,
  generateStudentPerformanceInsight,
  getTeacherLevelCanvas,
  saveTeacherLevelCanvas,
  createLearningMaterial,
  updateTeacherLearningMaterial,
  getTeacherLearningMaterials,
  deleteTeacherLearningMaterial,
  getAssignedLearningMaterials,
  getAssignedLearningMaterialDetail,
  startAssignedLearningMaterial,
  saveAssignedLearningMaterialProgress,
  getStudentMaterialsProgressSummary,
  downloadLearningMaterialFile,
  uploadLearningMaterialAsset,
} = require('../controllers/teacherController');
const {
  registerValidation,
  idValidation,
  paginationValidation,
  gameLevelNumberValidation,
  teacherStudentIdValidation,
  teacherPolicyValidation,
  contentFlagValidation,
  teacherLevelCanvasValidation,
  courseCodeEnrollmentValidation,
  courseCodeResetValidation,
  adminStudentAssignmentValidation,
  adminAssignmentResetValidation,
} = require('../middleware/validation');
const { 
  authenticateToken, 
  requireSuperAdmin,
  requireTeacher,
  requireTeacherOnly,
  requireStudentOnly,
} = require('../middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const learningMaterialUploadDirectory = path.resolve(__dirname, '../../uploads/learning-materials');

const normalizeUploadedExtension = (file) => {
  const originalExtension = path.extname(String(file?.originalname || '')).toLowerCase();
  if (originalExtension) {
    return originalExtension;
  }

  const mimeType = String(file?.mimetype || '').toLowerCase();

  if (mimeType === 'application/pdf') {
    return '.pdf';
  }

  if (mimeType === 'application/msword') {
    return '.doc';
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return '.docx';
  }

  if (mimeType === 'application/vnd.ms-powerpoint') {
    return '.ppt';
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    return '.pptx';
  }

  return '';
};

const learningMaterialUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      fs.mkdirSync(learningMaterialUploadDirectory, { recursive: true });
      callback(null, learningMaterialUploadDirectory);
    },
    filename(req, file, callback) {
      callback(null, `${Date.now()}-${crypto.randomUUID()}${normalizeUploadedExtension(file)}`);
    },
  }),
  limits: {
    fileSize: 1000 * 1024 * 1024,
    fieldSize: 1000 * 1024 * 1024,
  },
  fileFilter(req, file, callback) {
    const mimeType = String(file?.mimetype || '').toLowerCase();
    const extension = path.extname(String(file?.originalname || '')).toLowerCase();
    const isPdf = mimeType === 'application/pdf' || extension === '.pdf';
    const isVideo = mimeType.startsWith('video/') || ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'].includes(extension);
    const isWord = ['.doc', '.docx'].includes(extension)
      || ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mimeType);
    const isPowerPoint = ['.ppt', '.pptx'].includes(extension)
      || ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'].includes(mimeType);

    if (isPdf || isVideo || isWord || isPowerPoint) {
      return callback(null, true);
    }

    return callback(new Error('Only PDF, video, Word, and PowerPoint files are supported'));
  },
});

const learningMaterialAssetUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      const assetDirectory = path.resolve(learningMaterialUploadDirectory, 'assets');
      fs.mkdirSync(assetDirectory, { recursive: true });
      callback(null, assetDirectory);
    },
    filename(req, file, callback) {
      const extension = path.extname(String(file?.originalname || '')).toLowerCase() || '.mp4';
      callback(null, `lesson-asset-${Date.now()}-${crypto.randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    const mimeType = String(file?.mimetype || '').toLowerCase();
    const extension = path.extname(String(file?.originalname || '')).toLowerCase();
    const supportedVideo = mimeType.startsWith('video/') || ['.mp4', '.mov', '.webm', '.m4v'].includes(extension);
    callback(supportedVideo ? null : new Error('Only MP4, MOV, WebM, and M4V video files are supported'), supportedVideo);
  },
});

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination and filtering
 * @access  Private (Super Admin sees all, Teachers see their students, Students see only themselves)
 */
router.get('/', paginationValidation(), getUsers);

/**
 * @route   GET /api/users/my-students
 * @desc    Get students created by the authenticated teacher
 * @access  Private (Teachers only)
 */
router.get('/my-students', requireTeacher, paginationValidation(), getMyStudents);

/**
 * @route   GET /api/users/me/course-code
 * @desc    Get or initialize the authenticated teacher's unique course code
 * @access  Private (Teachers only)
 */
router.get('/me/course-code', requireTeacherOnly, getMyCourseCode);

/**
 * @route   GET /api/users/me/course-enrollment
 * @desc    Get the authenticated student's current course enrollment
 * @access  Private (Students only)
 */
router.get('/me/course-enrollment', requireStudentOnly, getMyCourseEnrollment);

/**
 * @route   GET /api/users/me/leaderboard
 * @desc    Get leaderboard for the authenticated student's class roster
 * @access  Private (Students only)
 */
router.get('/me/leaderboard', requireStudentOnly, getStudentCourseLeaderboard);

/**
 * @route   POST /api/users/me/course-enrollment
 * @desc    Enroll or replace course enrollment using a teacher course code
 * @access  Private (Students only)
 */
router.post('/me/course-enrollment', requireStudentOnly, courseCodeEnrollmentValidation(), enrollWithCourseCode);

/**
 * @route   DELETE /api/users/me/course-enrollment
 * @desc    Remove current course enrollment (destructive reset)
 * @access  Private (Students only)
 */
router.delete('/me/course-enrollment', requireStudentOnly, courseCodeResetValidation(), removeCourseEnrollment);

/**
 * @route   GET /api/users/me/level-editor/levels/:levelNumber
 * @desc    Get authenticated teacher level editor canvas data
 * @access  Private (Teachers only)
 */
router.get('/me/level-editor/levels/:levelNumber', requireTeacherOnly, gameLevelNumberValidation(), getTeacherLevelCanvas);

/**
 * @route   PUT /api/users/me/level-editor/levels/:levelNumber
 * @desc    Save authenticated teacher level editor canvas data
 * @access  Private (Teachers only)
 */
router.put('/me/level-editor/levels/:levelNumber', requireTeacherOnly, gameLevelNumberValidation(), teacherLevelCanvasValidation(), saveTeacherLevelCanvas);

router.get('/me/learning-materials', requireTeacherOnly, getTeacherLearningMaterials);
router.post('/me/learning-materials', requireTeacherOnly, learningMaterialUpload.single('file'), createLearningMaterial);
router.post('/me/learning-material-assets', requireTeacherOnly, learningMaterialAssetUpload.single('asset'), uploadLearningMaterialAsset);
router.put('/me/learning-materials/:materialId', requireTeacherOnly, learningMaterialUpload.single('file'), updateTeacherLearningMaterial);
router.delete('/me/learning-materials/:materialId', requireTeacherOnly, deleteTeacherLearningMaterial);
router.get('/me/assigned-learning-materials', requireStudentOnly, getAssignedLearningMaterials);
router.get('/me/assigned-learning-materials/progress-summary', requireStudentOnly, getStudentMaterialsProgressSummary);
router.get('/me/assigned-learning-materials/:materialId', requireStudentOnly, getAssignedLearningMaterialDetail);
router.post('/me/assigned-learning-materials/:materialId/start', requireStudentOnly, startAssignedLearningMaterial);
router.patch('/me/assigned-learning-materials/:materialId/progress', requireStudentOnly, saveAssignedLearningMaterialProgress);
router.get('/learning-materials/:materialId/file', downloadLearningMaterialFile);

/**
 * @route   POST /api/users/assignments
 * @desc    Assign or reassign a student to a teacher (admin-managed)
 * @access  Private (Super Admin only)
 */
router.post('/assignments', requireSuperAdmin, adminStudentAssignmentValidation(), assignStudentToTeacher);

/**
 * @route   DELETE /api/users/assignments/:studentId
 * @desc    Clear a student-teacher assignment (admin-managed)
 * @access  Private (Super Admin only)
 */
router.delete('/assignments/:studentId', requireSuperAdmin, teacherStudentIdValidation(), adminAssignmentResetValidation(), clearStudentTeacherAssignment);

/**
 * @route   GET /api/users/my-students/roster
 * @desc    Get teacher roster with progression metrics
 * @access  Private (Teachers only)
 */
router.get('/my-students/roster', requireTeacher, paginationValidation(), getMyStudentsRoster);

/**
 * @route   GET /api/users/my-students/leaderboard
 * @desc    Get leaderboard for teacher assigned roster
 * @access  Private (Teachers only)
 */
router.get('/my-students/leaderboard', requireTeacher, getRosterLeaderboard);

/**
 * @route   GET /api/users/my-students/flags
 * @desc    Get teacher content flags / regeneration requests
 * @access  Private (Teachers only)
 */
router.get('/my-students/flags', requireTeacher, getMyContentFlags);

/**
 * @route   GET /api/users/my-students/:studentId/progress
 * @desc    Get student detail progression (levels + attempt timeline)
 * @access  Private (Teachers only)
 */
router.get('/my-students/:studentId/progress', requireTeacher, teacherStudentIdValidation(), getStudentProgressDetail);

/**
 * @route   PATCH /api/users/my-students/:studentId/policy
 * @desc    Upsert teacher policy knobs for a student
 * @access  Private (Teachers only)
 */
router.patch('/my-students/:studentId/policy', requireTeacher, teacherStudentIdValidation(), teacherPolicyValidation(), upsertStudentPolicy);

/**
 * @route   POST /api/users/my-students/:studentId/flags
 * @desc    Request content regeneration for a student level
 * @access  Private (Teachers only)
 */
router.post('/my-students/:studentId/flags', requireTeacher, teacherStudentIdValidation(), contentFlagValidation(), requestContentRegeneration);

/**
 * @route   POST /api/users/my-students/:studentId/performance-insight/generate
 * @desc    Generate and save AI performance analytics for a student
 * @access  Private (Teachers only)
 */
router.post('/my-students/:studentId/performance-insight/generate', requireTeacher, teacherStudentIdValidation(), generateStudentPerformanceInsight);

/**
 * @route   GET /api/users/archived
 * @desc    Get archived users
 * @access  Private (Super Admin sees all, Teachers see their archived students)
 */
router.get('/archived', paginationValidation(), getArchivedUsers);

/**
 * @route   POST /api/users/students/bulk-upload/preview
 * @desc    Parse and preview bulk student uploads from PDF/Excel/CSV
 * @access  Private (Super Admin only)
 */
router.post('/students/bulk-upload/preview', requireSuperAdmin, upload.single('file'), previewBulkStudentUpload);

/**
 * @route   POST /api/users/students/bulk-upload/create
 * @desc    Create student accounts in bulk after preview confirmation
 * @access  Private (Super Admin only)
 */
router.post('/students/bulk-upload/create', requireSuperAdmin, bulkCreateStudents);

/**
 * @route   POST /api/users/teachers/batch-upload/preview
 * @desc    Parse and preview batch teacher uploads from PDF/Excel/CSV
 * @access  Private (Super Admin only)
 */
router.post('/teachers/batch-upload/preview', requireSuperAdmin, upload.single('file'), previewBatchTeacherUpload);

/**
 * @route   POST /api/users/teachers/batch-upload/create
 * @desc    Create teacher accounts in batch after preview confirmation
 * @access  Private (Super Admin only)
 */
router.post('/teachers/batch-upload/create', requireSuperAdmin, batchCreateTeachers);

/**
 * @route   POST /api/users/archive/batch
 * @desc    Archive multiple active student accounts
 * @access  Private (Super Admin only)
 */
router.post('/archive/batch', requireSuperAdmin, archiveUsersBulk);

/**
 * @route   POST /api/users/restore/batch
 * @desc    Restore multiple archived student accounts
 * @access  Private (Super Admin only)
 */
router.post('/restore/batch', requireSuperAdmin, restoreUsersBulk);

/**
 * @route   POST /api/users/:id/restore
 * @desc    Restore archived user
 * @access  Private (Super Admin or Teachers for their students)
 */
router.post('/:id/restore', idValidation(), restoreUser);

/**
 * @route   DELETE /api/users/:id/permanent
 * @desc    Permanently delete archived user
 * @access  Private (Super Admin or Teachers for their archived students)
 */
router.delete('/:id/permanent', idValidation(), permanentlyDeleteUser);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Role-based access control)
 */
router.get('/:id', idValidation(), getUserById);

/**
 * @route   POST /api/users
 * @desc    Create new user (Super Admin creates Teachers and Students)
 * @access  Private (Super Admin only)
 */
router.post('/', registerValidation(), createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user by ID
 * @access  Private (Role-based access control)
 */
router.put('/:id', idValidation(), updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Deactivate user by ID
 * @access  Private (Super Admin or Teachers for their students)
 */
router.delete('/:id', idValidation(), deleteUser);

/**
 * @route   POST /api/users/:id/reset-password
 * @desc    Reset user password (generate new temporary password)
 * @access  Private (Super Admin or Teachers for their students)
 */
router.post('/:id/reset-password', idValidation(), resetUserPassword);

module.exports = router;
