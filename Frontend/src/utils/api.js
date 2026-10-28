import axios from 'axios';
import { Capacitor } from '@capacitor/core';

export const getApiBaseUrl = () => {
  const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (Capacitor.isNativePlatform()) {
    return 'http://10.0.2.2:5001/api';
  }

  // Browser development is retained only for debugging the packaged UI.
  return '/api';
};

export const resolveApiAssetUrl = (value) => {
  const source = String(value || '').trim();
  if (!source || /^(?:https?:|data:|blob:)/i.test(source)) {
    return source;
  }

  const apiBaseUrl = getApiBaseUrl();
  if (!/^https?:\/\//i.test(apiBaseUrl)) {
    return source;
  }

  const backendOrigin = apiBaseUrl.replace(/\/api\/?$/i, '');
  return `${backendOrigin}${source.startsWith('/') ? source : `/${source}`}`;
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle token expiration (but not for login/register endpoints)
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                            error.config?.url?.includes('/auth/register') ||
                            error.config?.url?.includes('/auth/verify-otp');
      
      // Only redirect if it's NOT an auth endpoint (meaning it's a protected route with expired token)
      if (!isAuthEndpoint) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.hash = '#/';
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  // Login (returns requiresOTP for teachers)
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Verify OTP for teachers
  verifyOTP: async (data) => {
    const response = await api.post('/auth/verify-otp', data);
    return response.data;
  },

  // Request OTP
  requestOTP: async (email) => {
    const response = await api.post('/auth/request-otp', { email });
    return response.data;
  },

  // Register new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  // Update profile
  updateProfile: async (data) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  // Change password
  changePassword: async (data) => {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await api.post('/auth/logout');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    return response.data;
  },
};

// User API calls
export const userAPI = {
  // Get all users with pagination
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  // Get user by ID
  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  // Create new user
  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  previewBulkStudentUpload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/users/students/bulk-upload/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    });
    return response.data;
  },

  bulkCreateStudents: async (students) => {
    const response = await api.post('/users/students/bulk-upload/create', { students }, {
      timeout: 60000,
    });
    return response.data;
  },

  previewBatchTeacherUpload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/users/teachers/batch-upload/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    });
    return response.data;
  },

  batchCreateTeachers: async (teachers) => {
    const response = await api.post('/users/teachers/batch-upload/create', { teachers }, {
      timeout: 60000,
    });
    return response.data;
  },

  // Update user
  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  // Delete/archive user
  deleteUser: async (id, reason) => {
    const response = await api.delete(`/users/${id}`, { data: { reason } });
    return response.data;
  },

  archiveUsers: async (userIds, reason) => {
    const response = await api.post('/users/archive/batch', { userIds, reason });
    return response.data;
  },

  // Restore archived user
  restoreUser: async (id) => {
    const response = await api.post(`/users/${id}/restore`);
    return response.data;
  },

  restoreUsers: async (userIds) => {
    const response = await api.post('/users/restore/batch', { userIds });
    return response.data;
  },

  // Permanently delete archived user
  permanentlyDeleteUser: async (id) => {
    const response = await api.delete(`/users/${id}/permanent`);
    return response.data;
  },

  // Get archived users
  getArchivedUsers: async (params = {}) => {
    const response = await api.get('/users/archived', { params });
    return response.data;
  },

  // Get teacher's students
  getMyStudents: async (params = {}) => {
    const response = await api.get('/users/my-students', { params });
    return response.data;
  },

  // Get authenticated teacher course code
  getMyCourseCode: async () => {
    const response = await api.get('/users/me/course-code');
    return response.data;
  },

  // Get authenticated student course enrollment
  getMyCourseEnrollment: async () => {
    const response = await api.get('/users/me/course-enrollment');
    return response.data;
  },

  getMyLeaderboard: async () => {
    const response = await api.get('/users/me/leaderboard');
    return response.data;
  },

  // Enroll or replace student course code
  enrollWithCourseCode: async (payload) => {
    const response = await api.post('/users/me/course-enrollment', payload);
    return response.data;
  },

  // Remove student course enrollment (destructive reset)
  removeCourseEnrollment: async (payload = {}) => {
    const response = await api.delete('/users/me/course-enrollment', { data: payload });
    return response.data;
  },

  // Assign/reassign student to teacher (admin-managed)
  assignStudentToTeacher: async (payload) => {
    const response = await api.post('/users/assignments', payload);
    return response.data;
  },

  // Clear student-teacher assignment (admin-managed)
  clearStudentAssignment: async (studentId, payload = {}) => {
    const response = await api.delete(`/users/assignments/${studentId}`, { data: payload });
    return response.data;
  },

  // Get teacher roster with progression metrics
  getMyStudentsRoster: async (params = {}) => {
    const response = await api.get('/users/my-students/roster', { params });
    return response.data;
  },

  // Get one student's progression detail for teacher monitoring
  getStudentProgress: async (studentId) => {
    const response = await api.get(`/users/my-students/${studentId}/progress`);
    return response.data;
  },

  // Get leaderboard for teacher roster
  getRosterLeaderboard: async () => {
    const response = await api.get('/users/my-students/leaderboard');
    return response.data;
  },

  // Upsert student policy knobs
  updateStudentPolicy: async (studentId, payload) => {
    const response = await api.patch(`/users/my-students/${studentId}/policy`, payload);
    return response.data;
  },

  // Request content regeneration for a level
  requestContentRegeneration: async (studentId, payload) => {
    const response = await api.post(`/users/my-students/${studentId}/flags`, payload);
    return response.data;
  },

  // Generate and save AI performance insight for a student
  generateStudentPerformanceInsight: async (studentId) => {
    const aiGenerationTimeoutMs = Number(import.meta.env.VITE_AI_GENERATION_TIMEOUT_MS || 60000);
    const response = await api.post(`/users/my-students/${studentId}/performance-insight/generate`, {}, {
      timeout: Number.isFinite(aiGenerationTimeoutMs) ? aiGenerationTimeoutMs : 60000,
    });
    return response.data;
  },

  // Get teacher content flags
  getMyContentFlags: async (params = {}) => {
    const response = await api.get('/users/my-students/flags', { params });
    return response.data;
  },

  getMyLearningMaterials: async () => {
    const response = await api.get('/users/me/learning-materials');
    return response.data;
  },

  uploadLearningMaterial: async (formData) => {
    const response = await api.post('/users/me/learning-materials', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 600000,
    });
    return response.data;
  },

  uploadLearningMaterialAsset: async (file) => {
    const formData = new FormData();
    formData.append('asset', file);
    const response = await api.post('/users/me/learning-material-assets', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000,
    });
    return response.data;
  },

  updateLearningMaterial: async (materialId, formData) => {
    const response = await api.put(`/users/me/learning-materials/${materialId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 600000,
    });
    return response.data;
  },

  deleteLearningMaterial: async (materialId) => {
    const response = await api.delete(`/users/me/learning-materials/${materialId}`);
    return response.data;
  },

  getAssignedLearningMaterials: async () => {
    const response = await api.get('/users/me/assigned-learning-materials');
    return response.data;
  },

  getAssignedLearningMaterialDetail: async (materialId) => {
    const response = await api.get(`/users/me/assigned-learning-materials/${materialId}`);
    return response.data;
  },

  startAssignedLearningMaterial: async (materialId) => {
    const response = await api.post(`/users/me/assigned-learning-materials/${materialId}/start`);
    return response.data;
  },

  saveAssignedLearningMaterialProgress: async (materialId, payload) => {
    const response = await api.patch(`/users/me/assigned-learning-materials/${materialId}/progress`, payload);
    return response.data;
  },

  getStudentMaterialsProgressSummary: async () => {
    const response = await api.get('/users/me/assigned-learning-materials/progress-summary');
    return response.data;
  },

  downloadLearningMaterialFile: async (materialId, options = {}) => {
    return api.get(`/users/learning-materials/${materialId}/file`, {
      params: {
        download: options.download ? '1' : undefined,
      },
      responseType: 'blob',
      timeout: 600000,
    });
  },

  // Reset user password
  resetPassword: async (id) => {
    const response = await api.post(`/users/${id}/reset-password`);
    return response.data;
  },
};

// Exam API calls
export const examAPI = {
  // Get all exams
  getExams: async (params = {}) => {
    const response = await api.get('/exams', { params });
    return response.data;
  },

  // Get exam by ID
  getExamById: async (id) => {
    const response = await api.get(`/exams/${id}`);
    return response.data;
  },

  // Get exam by code (public preview)
  getExamByCode: async (code) => {
    const response = await api.get(`/exams/code/${code}`);
    return response.data;
  },

  // Create new exam
  createExam: async (examData) => {
    const response = await api.post('/exams', examData);
    return response.data;
  },

  // Update exam
  updateExam: async (id, examData) => {
    const response = await api.put(`/exams/${id}`, examData);
    return response.data;
  },

  // Delete exam
  deleteExam: async (id) => {
    const response = await api.delete(`/exams/${id}`);
    return response.data;
  },

  // Join exam with code
  joinExam: async (examCode) => {
    const response = await api.post('/exams/join', { examCode });
    return response.data;
  },

  // Get exam statistics
  getExamStatistics: async (id) => {
    const response = await api.get(`/exams/${id}/statistics`);
    return response.data;
  },

  getAssessmentByMaterial: async (materialId) => {
    const response = await api.get(`/exams/materials/${materialId}/assessment`);
    return response.data;
  },

  getTeacherAssessmentProgress: async () => {
    const response = await api.get('/exams/progress/teacher');
    return response.data;
  },

  saveAssessmentByMaterial: async (materialId, payload) => {
    const response = await api.put(`/exams/materials/${materialId}/assessment`, payload);
    return response.data;
  },

  getStudentQuizByMaterial: async (materialId) => {
    const response = await api.get(`/exams/materials/${materialId}/quiz`);
    return response.data;
  },

  submitStudentQuizByMaterial: async (materialId, payload) => {
    const response = await api.post(`/exams/materials/${materialId}/quiz/submit`, payload);
    return response.data;
  },

  getStudentQuizAttemptResult: async (materialId, attemptId) => {
    const response = await api.get(`/exams/materials/${materialId}/quiz-attempts/${attemptId}`);
    return response.data;
  },
};

export const levelAPI = {
  getMyGames: async () => {
    const response = await api.get('/levels/games/me');
    return response.data;
  },

  getMyLevels: async (gameType) => {
    const response = await api.get('/levels/me', {
      params: { gameType }
    });
    return response.data;
  },

  getPlayableLevelContent: async (gameType, levelNumber, options = {}) => {
    const levelContentTimeoutMs = Number(import.meta.env.VITE_LEVEL_CONTENT_TIMEOUT_MS || 65000);
    const params = {};
    if (options.prefetch) {
      params.prefetch = '1';
    }
    if (typeof options.runToken === 'string' && options.runToken.trim()) {
      params.runToken = options.runToken.trim();
    }
    const response = await api.get(`/levels/${gameType}/${levelNumber}/content`, {
      params: Object.keys(params).length > 0 ? params : undefined,
      timeout: Number.isFinite(levelContentTimeoutMs) ? levelContentTimeoutMs : 30000,
    });
    return response.data;
  },

  generateGameHint: async (gameType, levelNumber, payload) => {
    const aiGenerationTimeoutMs = Number(import.meta.env.VITE_AI_GENERATION_TIMEOUT_MS || 60000);
    const response = await api.post(`/levels/${gameType}/${levelNumber}/hints/generate`, payload, {
      timeout: Number.isFinite(aiGenerationTimeoutMs) ? aiGenerationTimeoutMs : 60000,
    });
    return response.data;
  },

  generateGameQuestions: async (gameType, levelNumber, payload, options = {}) => {
    const aiGenerationTimeoutMs = Number(import.meta.env.VITE_AI_GENERATION_TIMEOUT_MS || 60000);
    const response = await api.post(`/levels/${gameType}/${levelNumber}/questions/generate`, payload, {
      timeout: Number.isFinite(options.timeout) && options.timeout > 0
        ? options.timeout
        : Number.isFinite(aiGenerationTimeoutMs) ? aiGenerationTimeoutMs : 60000,
    });
    return response.data;
  },

  startLevelSession: async (gameType, levelNumber) => {
    const response = await api.post(`/levels/${gameType}/${levelNumber}/sessions/start`);
    return response.data;
  },

  submitLevelSession: async (gameType, levelNumber, sessionId, payload) => {
    const response = await api.post(`/levels/${gameType}/${levelNumber}/sessions/${sessionId}/submit`, payload);
    return response.data;
  },

  resolveGameSixTerm: async (levelNumber, sessionId, payload) => {
    const response = await api.post(`/levels/GAME_SIX/${levelNumber}/sessions/${sessionId}/terms/resolve`, payload);
    return response.data;
  },

  getLevelHistory: async (gameType, levelNumber, params = {}) => {
    const response = await api.get(`/levels/${gameType}/${levelNumber}/history`, { params });
    return response.data;
  }
};

export const adminLevelAPI = {
  getLevelCatalog: async () => {
    const response = await api.get('/admin/levels/catalog');
    return response.data;
  },

  getLevelContent: async (gameType, levelNumber) => {
    const response = await api.get(`/admin/levels/${gameType}/${levelNumber}/content`);
    return response.data;
  },

  saveLevelDraft: async (gameType, levelNumber, levelData) => {
    const response = await api.put(`/admin/levels/${gameType}/${levelNumber}/content/draft`, {
      levelData,
    });
    return response.data;
  },

  publishLevelContent: async (gameType, levelNumber) => {
    const response = await api.post(`/admin/levels/${gameType}/${levelNumber}/content/publish`);
    return response.data;
  },
};

export const adminAiAPI = {
  getControlState: async () => {
    const response = await api.get('/admin/ai/control-state');
    return response.data;
  },

  updateControlState: async (payload) => {
    const response = await api.patch('/admin/ai/control-state', payload);
    return response.data;
  },

  generateQuestion: async (payload) => {
    const aiGenerationTimeoutMs = Number(import.meta.env.VITE_AI_GENERATION_TIMEOUT_MS || 60000);
    const response = await api.post('/admin/ai/questions/generate', payload, {
      timeout: Number.isFinite(aiGenerationTimeoutMs) ? aiGenerationTimeoutMs : 60000,
    });
    return response.data;
  },
};

export const teacherLevelEditorAPI = {
  getLevelCanvas: async (levelNumber) => {
    const response = await api.get(`/users/me/level-editor/levels/${levelNumber}`);
    return response.data;
  },

  saveLevelCanvas: async (levelNumber, payload) => {
    const response = await api.put(`/users/me/level-editor/levels/${levelNumber}`, payload);
    return response.data;
  },
};

// Error handler utility
export const handleAPIError = (error) => {
  if (error.code === 'ECONNABORTED') {
    const requestUrl = String(error?.config?.url || '');
    const isAiGenerationRequest = requestUrl.includes('/admin/ai/questions/generate')
      || requestUrl.includes('/performance-insight/generate');

    return {
      message: isAiGenerationRequest
        ? 'Request timed out while generating AI content. Please try again.'
        : 'Request timed out. Please try again.',
      status: 0,
    };
  }

  if (error.response) {
    // Server returned error response
    const data = error.response.data;
    const responseStatus = error.response.status;
    const isStringResponse = typeof data === 'string';
    const isHtmlErrorResponse = isStringResponse && /<!doctype html>|<html/i.test(data);

    let message = data?.message
      || data?.error
      || (isStringResponse ? data : null)
      || 'An error occurred';

    if ([502, 503, 504].includes(responseStatus) || isHtmlErrorResponse) {
      message = 'The server is unavailable right now. Please make sure the backend is running and try again.';
    }
    
    // Handle rate limiting specifically
    if (responseStatus === 429) {
      message = data?.message || data?.error || 'Too many requests. Please wait a moment and try again.';
    }
    
    // If there are validation errors, format them nicely
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      const errorMessages = data.errors.map(err => `${err.field}: ${err.message}`).join('\n');
      message = errorMessages;
    }
    
    return {
      message,
      status: responseStatus,
      details: data?.details,
      errors: data?.errors,
      data: data?.data,
    };
  } else if (error.request) {
    // Network error
    return {
      message: 'Unable to reach the server. Please make sure the backend is running, then try again.',
      status: 0,
    };
  } else {
    // Other error
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0,
    };
  }
};

export default api;
