import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Shield, UserCheck, Users, Settings, Plus, Search, Eye, EyeOff, LogOut, GraduationCap, Archive, Trash2, Power, Activity, BarChart3, Trophy, ShieldCheck, Flag, Upload, FileSpreadsheet } from 'lucide-react';

import toast from 'react-hot-toast';
import { userAPI, adminAiAPI, handleAPIError } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useAdminDirectory } from '../features/admin/useAdminDirectory';
import {
  buildStudentDashboardInsights,
  getStudentDashboardLatestActivityAt,
  getStudentDashboardMetric,
  getStudentDashboardPerformancePercent,
} from '../utils/studentDashboardInsights';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import logo from '../assets/logo.png';

const normalizePasswordPart = (value = '') => value.toLowerCase().trim().replace(/\s+/g, '');

const getPasswordUsernamePart = (username = '') => {
  const baseUsername = username.split('@')[0] || '';
  return normalizePasswordPart(baseUsername);
};

const generateAccountPassword = (firstName = '', username = '', lastName = '') => {
  const normalizedFirstName = normalizePasswordPart(firstName);
  const normalizedUsername = getPasswordUsernamePart(username);
  const normalizedLastName = normalizePasswordPart(lastName);

  if (!normalizedFirstName || !normalizedUsername || !normalizedLastName) {
    return '';
  }

  return `${normalizedFirstName}_${normalizedUsername}@_${normalizedLastName}`;
};

const OVERVIEW_ALL_SECTIONS = 'ALL_SECTIONS';
const ALL_STUDENT_SECTIONS = 'ALL_STUDENT_SECTIONS';
const ALL_ACADEMIC_YEARS = 'ALL_ACADEMIC_YEARS';
const BULK_UPLOAD_ACCEPT = '.xlsx,.xls,.pdf';

const normalizeBulkStudentText = (value = '') => String(value ?? '').trim();

const normalizeBulkStudentName = (value = '') => normalizeBulkStudentText(value).replace(/\s+/g, ' ');

const normalizeBulkStudentUsername = (value = '') => {
  const normalized = normalizeBulkStudentText(value).toLowerCase();
  if (!normalized) {
    return '';
  }
  if (normalized.endsWith('@student.com')) {
    return normalized.slice(0, -'@student.com'.length);
  }
  return normalized.includes('@') ? normalized.split('@')[0] : normalized;
};

const generateBulkStudentPassword = (firstName = '', username = '', lastName = '') => {
  const normalizedFirstName = normalizePasswordPart(firstName);
  const normalizedUsername = normalizeBulkStudentUsername(username);
  const normalizedLastName = normalizePasswordPart(lastName);

  if (!normalizedFirstName || !normalizedUsername || !normalizedLastName) {
    return 'Student123!';
  }

  return `${normalizedFirstName}_${normalizedUsername}@_${normalizedLastName}`;
};

const normalizeBatchTeacherUsername = (value = '') => {
  const normalized = normalizeBulkStudentText(value).toLowerCase();
  if (!normalized) {
    return '';
  }
  if (normalized.endsWith('@teacher.com')) {
    return normalized.slice(0, -'@teacher.com'.length);
  }
  return normalized.includes('@') ? normalized.split('@')[0] : normalized;
};

const generateBatchTeacherPassword = (firstName = '', username = '', lastName = '') => {
  const normalizedFirstName = normalizePasswordPart(firstName);
  const normalizedUsername = normalizeBatchTeacherUsername(username);
  const normalizedLastName = normalizePasswordPart(lastName);

  if (!normalizedFirstName || !normalizedUsername || !normalizedLastName) {
    return 'Teacher123!';
  }

  return `${normalizedFirstName}_${normalizedUsername}@_${normalizedLastName}`;
};

const createEmptyBulkStudentRow = () => ({
  clientRowId: `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  rowNumber: null,
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  section: '',
  academicYear: '',
  password: '',
  serverErrors: [],
  warnings: [],
});

const createEmptyBatchTeacherRow = () => ({
  clientRowId: `teacher-batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  rowNumber: null,
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  password: '',
  serverErrors: [],
  warnings: [],
});

const getBulkStudentRowErrors = (row, rows, rowIndex) => {
  const errors = [];
  const username = normalizeBulkStudentUsername(row.username);
  const email = normalizeBulkStudentText(row.email).toLowerCase();
  const duplicateUsernameCount = rows.filter((candidate) => normalizeBulkStudentUsername(candidate.username) === username && username).length;
  const duplicateEmailCount = rows.filter((candidate) => normalizeBulkStudentText(candidate.email).toLowerCase() === email && email).length;

  if (!normalizeBulkStudentName(row.firstName)) errors.push('First name is required.');
  if (!normalizeBulkStudentName(row.lastName)) errors.push('Last name is required.');
  if (!username) errors.push('Username is required.');
  if (!email) errors.push('Email is required.');
  if (!normalizeBulkStudentText(row.section)) errors.push('Section is required.');
  if (!normalizeBulkStudentText(row.academicYear)) errors.push('Academic year is required.');

  if (row.firstName && !/^[a-zA-Z\s]+$/.test(normalizeBulkStudentName(row.firstName))) {
    errors.push('First name can only contain letters and spaces.');
  }

  if (row.lastName && !/^[a-zA-Z\s]+$/.test(normalizeBulkStudentName(row.lastName))) {
    errors.push('Last name can only contain letters and spaces.');
  }

  if (username && !/^[a-zA-Z0-9._-]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, dots, hyphens, and underscores.');
  }

  if (email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    errors.push('Email is not valid.');
  }

  if (row.section && (normalizeBulkStudentText(row.section).length > 40 || !/^[a-zA-Z0-9\s._-]+$/.test(normalizeBulkStudentText(row.section)))) {
    errors.push('Section must be 40 characters or fewer and use only letters, numbers, spaces, dots, underscores, or hyphens.');
  }

  if (row.academicYear && !/^\d{4}-\d{4}$/.test(normalizeBulkStudentText(row.academicYear))) {
    errors.push('Academic year must use the format 2025-2026.');
  }

  if (row.password && normalizeBulkStudentText(row.password).length < 8) {
    errors.push('Password must be at least 8 characters.');
  }

  if (username && duplicateUsernameCount > 1) {
    errors.push(`Username is duplicated in the preview rows (row ${rowIndex + 1}).`);
  }

  if (email && duplicateEmailCount > 1) {
    errors.push(`Email is duplicated in the preview rows (row ${rowIndex + 1}).`);
  }

  return errors;
};

const getBatchTeacherRowErrors = (row, rows, rowIndex) => {
  const errors = [];
  const username = normalizeBatchTeacherUsername(row.username);
  const email = normalizeBulkStudentText(row.email).toLowerCase();
  const duplicateUsernameCount = rows.filter((candidate) => normalizeBatchTeacherUsername(candidate.username) === username && username).length;
  const duplicateEmailCount = rows.filter((candidate) => normalizeBulkStudentText(candidate.email).toLowerCase() === email && email).length;

  if (!normalizeBulkStudentName(row.firstName)) errors.push('First name is required.');
  if (!normalizeBulkStudentName(row.lastName)) errors.push('Last name is required.');
  if (!username) errors.push('Username is required.');
  if (!email) errors.push('Email is required.');

  if (row.firstName && !/^[a-zA-Z\s]+$/.test(normalizeBulkStudentName(row.firstName))) {
    errors.push('First name can only contain letters and spaces.');
  }

  if (row.lastName && !/^[a-zA-Z\s]+$/.test(normalizeBulkStudentName(row.lastName))) {
    errors.push('Last name can only contain letters and spaces.');
  }

  if (username && !/^[a-zA-Z0-9._-]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, dots, hyphens, and underscores.');
  }

  if (email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    errors.push('Email is not valid.');
  }

  if (row.password && normalizeBulkStudentText(row.password).length < 8) {
    errors.push('Password must be at least 8 characters.');
  }

  if (username && duplicateUsernameCount > 1) {
    errors.push(`Username is duplicated in the preview rows (row ${rowIndex + 1}).`);
  }

  if (email && duplicateEmailCount > 1) {
    errors.push(`Email is duplicated in the preview rows (row ${rowIndex + 1}).`);
  }

  return errors;
};

const getStudentDisplayName = (student) => {
  const fullName = `${student?.firstName || ''} ${student?.lastName || ''}`.trim();
  return fullName || student?.username || student?.email || 'Unknown student';
};

const getStudentSectionLabel = (student) => String(student?.section || '').trim() || 'Unassigned';
const getStudentAcademicYearLabel = (student) => String(student?.academicYear || '').trim();
const getStudentCompletedActivities = (student) => Number(student?.metrics?.completedActivities ?? student?.metrics?.completedLevels ?? 0);
const getStudentTotalActivities = (student) => Number(student?.metrics?.totalActivities ?? student?.metrics?.totalLevels ?? 0);
const getStudentAssessmentProgressPercent = (student) => Number(student?.metrics?.assessmentProgressPercent || 0);
const getStudentAssessmentAverageScore = (student) => Number(student?.metrics?.assessmentAverageScore || 0);

const getLatestStudentActivityMeta = (student) => {
  const candidates = [
    {
      label: 'Game',
      value: student?.metrics?.lastGameAttemptAt,
    },
    {
      label: 'Module',
      value: student?.metrics?.lastModuleActivityAt,
    },
    {
      label: 'Assessment',
      value: student?.metrics?.lastAssessmentAttemptAt,
    },
  ]
    .map((item) => ({
      ...item,
      timestamp: item.value ? new Date(item.value).getTime() : Number.NaN,
    }))
    .filter((item) => Number.isFinite(item.timestamp))
    .sort((left, right) => right.timestamp - left.timestamp);

  if (candidates.length === 0) {
    return null;
  }

  return candidates[0];
};

const compareStudentsByPerformance = (left, right) => {
  const progressGap = Number(right?.metrics?.progressPercent || 0) - Number(left?.metrics?.progressPercent || 0);
  if (progressGap !== 0) {
    return progressGap;
  }

  const starsGap = Number(right?.metrics?.totalStars || 0) - Number(left?.metrics?.totalStars || 0);
  if (starsGap !== 0) {
    return starsGap;
  }

  const completedGap = getStudentCompletedActivities(right) - getStudentCompletedActivities(left);
  if (completedGap !== 0) {
    return completedGap;
  }

  const assessmentGap = Number(right?.metrics?.assessmentAverageScore || 0) - Number(left?.metrics?.assessmentAverageScore || 0);
  if (assessmentGap !== 0) {
    return assessmentGap;
  }

  return getStudentDisplayName(left).localeCompare(getStudentDisplayName(right));
};

const getPerformanceBandKey = (student) => {
  const progressPercent = Number(student?.metrics?.progressPercent || 0);

  if (progressPercent >= 80) {
    return 'MASTERY';
  }

  if (progressPercent >= 40) {
    return 'PROGRESS';
  }

  return 'SUPPORT';
};

const getProgressPercentTextClass = (value) => {
  const progressPercent = Number(value || 0);

  if (progressPercent >= 70) {
    return 'text-emerald-700';
  }

  if (progressPercent >= 40) {
    return 'text-amber-700';
  }

  return 'text-rose-700';
};

const getStudentActivityStatusLabel = (student) => {
  const latestActivity = getLatestStudentActivityMeta(student);
  if (!latestActivity) {
    return 'No recorded attempts';
  }

  const activityDate = new Date(latestActivity.value);
  const daysSince = Math.floor((Date.now() - activityDate.getTime()) / 86400000);

  if (daysSince <= 0) {
    return `${latestActivity.label} today`;
  }

  if (daysSince === 1) {
    return `${latestActivity.label} yesterday`;
  }

  if (daysSince <= 7) {
    return `${latestActivity.label} ${daysSince} days ago`;
  }

  return `${latestActivity.label} on ${activityDate.toLocaleDateString()}`;
};

const getUserAccountStatusMeta = (user) => {
  if (user?.isArchived) {
    return {
      label: 'Archived',
      className: 'bg-orange-100 text-orange-800',
    };
  }

  if (user?.lastLogin) {
    return {
      label: 'Active',
      className: 'bg-green-100 text-green-800',
    };
  }

  return {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-800',
  };
};

const SuperAdminPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [teacherCreateMode, setTeacherCreateMode] = useState('manual');
  const [isPreviewingTeacherBatchUpload, setIsPreviewingTeacherBatchUpload] = useState(false);
  const [isBatchCreatingTeachers, setIsBatchCreatingTeachers] = useState(false);
  const [teacherBatchUploadFileName, setTeacherBatchUploadFileName] = useState('');
  const [teacherBatchUploadRows, setTeacherBatchUploadRows] = useState([]);
  const [studentCreateMode, setStudentCreateMode] = useState('manual');
  const [isPreviewingBulkUpload, setIsPreviewingBulkUpload] = useState(false);
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [bulkUploadFileName, setBulkUploadFileName] = useState('');
  const [bulkUploadRows, setBulkUploadRows] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Custom confirmation modal
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    action: null,
    user: null
  });
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  
  // Archive view tabs
  const [studentViewTab, setStudentViewTab] = useState('active'); // 'active' or 'archived'
  const [teacherViewTab, setTeacherViewTab] = useState('active');
  const [userViewTab, setUserViewTab] = useState('active');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedArchivedStudentIds, setSelectedArchivedStudentIds] = useState([]);
  
  // Edit form state
  const [editFormData, setEditFormData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Search and filter states
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSectionFilter, setStudentSectionFilter] = useState(ALL_STUDENT_SECTIONS);
  const [studentAcademicYearFilter, setStudentAcademicYearFilter] = useState(ALL_ACADEMIC_YEARS);
  const [userSearch, setUserSearch] = useState('');
  const [overviewSectionFilter, setOverviewSectionFilter] = useState(OVERVIEW_ALL_SECTIONS);
  const [expandedOverviewSection, setExpandedOverviewSection] = useState(null);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [aiControlState, setAiControlState] = useState({
    aiEnabled: true,
    updatedAt: null,
    updatedByUserId: null,
  });
  const [isAiControlLoading, setIsAiControlLoading] = useState(true);
  const [isUpdatingAiControl, setIsUpdatingAiControl] = useState(false);
  
  // Pagination states
  const [teacherPage, setTeacherPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const itemsPerPage = 10;
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const teacherBatchUploadInputRef = useRef(null);
  const studentBulkUploadInputRef = useRef(null);
  const {
    allUsers,
    teachers,
    students,
    isLoading,
    refreshAdminData,
  } = useAdminDirectory();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm();

  const watchedFirstName = watch('firstName');
  const watchedLastName = watch('lastName');
  const watchedUsername = watch('username');

  useEffect(() => {
    if (!showCreateTeacher && !showCreateStudent) {
      return;
    }

    const autoGeneratedPassword = generateAccountPassword(
      watchedFirstName,
      watchedUsername,
      watchedLastName
    );

    setValue('password', autoGeneratedPassword, {
      shouldValidate: Boolean(autoGeneratedPassword),
      shouldDirty: Boolean(autoGeneratedPassword)
    });
  }, [
    setValue,
    showCreateStudent,
    showCreateTeacher,
    watchedFirstName,
    watchedLastName,
    watchedUsername
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadAiControlState = async () => {
      try {
        setIsAiControlLoading(true);
        const response = await adminAiAPI.getControlState();
        if (!cancelled && response.status === 'success') {
          setAiControlState({
            aiEnabled: response.data?.aiEnabled !== false,
            updatedAt: response.data?.updatedAt || null,
            updatedByUserId: response.data?.updatedByUserId || null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(handleAPIError(error).message);
        }
      } finally {
        if (!cancelled) {
          setIsAiControlLoading(false);
        }
      }
    };

    loadAiControlState();

    return () => {
      cancelled = true;
    };
  }, []);

  const resetStudentBulkUploadState = () => {
    setStudentCreateMode('manual');
    setIsPreviewingBulkUpload(false);
    setIsBulkCreating(false);
    setBulkUploadFileName('');
    setBulkUploadRows([]);
    if (studentBulkUploadInputRef.current) {
      studentBulkUploadInputRef.current.value = '';
    }
  };

  const resetTeacherBatchUploadState = () => {
    setTeacherCreateMode('manual');
    setIsPreviewingTeacherBatchUpload(false);
    setIsBatchCreatingTeachers(false);
    setTeacherBatchUploadFileName('');
    setTeacherBatchUploadRows([]);
    if (teacherBatchUploadInputRef.current) {
      teacherBatchUploadInputRef.current.value = '';
    }
  };

  const closeCreateTeacherModal = () => {
    setShowCreateTeacher(false);
    reset();
    resetTeacherBatchUploadState();
  };

  const closeCreateStudentModal = () => {
    setShowCreateStudent(false);
    reset();
    resetStudentBulkUploadState();
  };

  const bulkUploadRowsWithValidation = useMemo(() => (
    bulkUploadRows.map((row, index) => {
      const normalizedRow = {
        ...row,
        firstName: row.firstName ?? '',
        lastName: row.lastName ?? '',
        username: row.username ?? '',
        email: row.email ?? '',
        section: row.section ?? '',
        academicYear: row.academicYear ?? '',
        password: row.password ?? '',
        serverErrors: Array.isArray(row.serverErrors) ? row.serverErrors : (Array.isArray(row.errors) ? row.errors : []),
        warnings: Array.isArray(row.warnings) ? row.warnings : [],
      };

      const clientErrors = getBulkStudentRowErrors(normalizedRow, bulkUploadRows, index);

      return {
        ...normalizedRow,
        clientErrors,
        allErrors: [...normalizedRow.serverErrors, ...clientErrors],
        isValid: normalizedRow.serverErrors.length === 0 && clientErrors.length === 0,
      };
    })
  ), [bulkUploadRows]);

  const bulkUploadSummary = useMemo(() => ({
    totalRows: bulkUploadRowsWithValidation.length,
    validRows: bulkUploadRowsWithValidation.filter((row) => row.isValid).length,
    invalidRows: bulkUploadRowsWithValidation.filter((row) => !row.isValid).length,
  }), [bulkUploadRowsWithValidation]);

  const teacherBatchRowsWithValidation = useMemo(() => (
    teacherBatchUploadRows.map((row, index) => {
      const normalizedRow = {
        ...row,
        firstName: row.firstName ?? '',
        lastName: row.lastName ?? '',
        username: row.username ?? '',
        email: row.email ?? '',
        password: row.password ?? '',
        serverErrors: Array.isArray(row.serverErrors) ? row.serverErrors : (Array.isArray(row.errors) ? row.errors : []),
        warnings: Array.isArray(row.warnings) ? row.warnings : [],
      };

      const clientErrors = getBatchTeacherRowErrors(normalizedRow, teacherBatchUploadRows, index);

      return {
        ...normalizedRow,
        clientErrors,
        allErrors: [...normalizedRow.serverErrors, ...clientErrors],
        isValid: normalizedRow.serverErrors.length === 0 && clientErrors.length === 0,
      };
    })
  ), [teacherBatchUploadRows]);

  const teacherBatchSummary = useMemo(() => ({
    totalRows: teacherBatchRowsWithValidation.length,
    validRows: teacherBatchRowsWithValidation.filter((row) => row.isValid).length,
    invalidRows: teacherBatchRowsWithValidation.filter((row) => !row.isValid).length,
  }), [teacherBatchRowsWithValidation]);

  // Create new teacher
  const onCreateTeacher = async (data) => {
    try {
      setIsCreating(true);
      
      // Auto-append @teacher.com to username if not present
      const username = data.username.includes('@') ? data.username : `${data.username}@teacher.com`;
      
      const teacherData = {
        ...data,
        username,
        role: 'TEACHER'
      };

      const response = await userAPI.createUser(teacherData);
      
      if (response.status === 'success') {
        toast.success('✅ Teacher account created successfully!', {
          duration: 4000,
          style: {
            background: '#10b981',
            color: '#fff',
          },
        });
        closeCreateTeacherModal();
        
        await refreshAdminData();
      }
    } catch (error) {
      const errorInfo = handleAPIError(error);
      toast.error(`❌ ${errorInfo.message}`, {
        duration: 6000,
        style: {
          background: '#ef4444',
          color: '#fff',
          whiteSpace: 'pre-line',
        },
      });
    } finally {
      setIsCreating(false);
    }
  };

  const decorateTeacherBatchRow = (row, index) => ({
    clientRowId: row.clientRowId || `teacher-batch-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    rowNumber: row.rowNumber ?? index + 1,
    firstName: row.firstName || '',
    lastName: row.lastName || '',
    username: normalizeBatchTeacherUsername(row.username || ''),
    email: row.email || '',
    password: row.password || generateBatchTeacherPassword(row.firstName, row.username, row.lastName),
    serverErrors: Array.isArray(row.errors) ? row.errors : (Array.isArray(row.serverErrors) ? row.serverErrors : []),
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
  });

  const handleTeacherBatchFileSelected = async (event) => {
    const [file] = Array.from(event.target.files || []);

    if (!file) {
      return;
    }

    try {
      setTeacherCreateMode('upload');
      setIsPreviewingTeacherBatchUpload(true);
      setTeacherBatchUploadFileName(file.name);

      const response = await userAPI.previewBatchTeacherUpload(file);
      const rows = Array.isArray(response.data?.rows) ? response.data.rows : [];
      setTeacherBatchUploadRows(rows.map(decorateTeacherBatchRow));

      toast.success(`Prepared ${rows.length} teacher row${rows.length === 1 ? '' : 's'} for review.`);
    } catch (error) {
      const errorInfo = handleAPIError(error);
      setTeacherBatchUploadRows([]);
      toast.error(errorInfo.message);
    } finally {
      setIsPreviewingTeacherBatchUpload(false);
    }
  };

  const handleTeacherBatchRowChange = (clientRowId, field, value) => {
    setTeacherBatchUploadRows((prev) => prev.map((row) => {
      if (row.clientRowId !== clientRowId) {
        return row;
      }

      const nextRow = {
        ...row,
        [field]: value,
        serverErrors: [],
      };

      if (field === 'firstName' || field === 'lastName' || field === 'username') {
        const previousGeneratedPassword = generateBatchTeacherPassword(row.firstName, row.username, row.lastName);
        const nextFirstName = field === 'firstName' ? value : nextRow.firstName;
        const nextLastName = field === 'lastName' ? value : nextRow.lastName;
        const nextUsername = field === 'username' ? value : nextRow.username;
        if (!row.password || row.password === previousGeneratedPassword) {
          nextRow.password = generateBatchTeacherPassword(nextFirstName, nextUsername, nextLastName);
        }
      }

      return nextRow;
    }));
  };

  const handleRemoveTeacherBatchRow = (clientRowId) => {
    setTeacherBatchUploadRows((prev) => prev.filter((row) => row.clientRowId !== clientRowId));
  };

  const handleAddTeacherBatchRow = () => {
    setTeacherCreateMode('upload');
    setTeacherBatchUploadRows((prev) => [...prev, createEmptyBatchTeacherRow()]);
  };

  const handleConfirmTeacherBatchCreate = async () => {
    const invalidRows = teacherBatchRowsWithValidation.filter((row) => !row.isValid);

    if (teacherBatchRowsWithValidation.length === 0) {
      toast.error('Add or upload at least one teacher row first.');
      return;
    }

    if (invalidRows.length > 0) {
      toast.error('Please fix the highlighted preview rows before creating the teacher accounts.');
      return;
    }

    try {
      setIsBatchCreatingTeachers(true);

      const payload = teacherBatchRowsWithValidation.map((row) => ({
        firstName: normalizeBulkStudentName(row.firstName),
        lastName: normalizeBulkStudentName(row.lastName),
        username: normalizeBatchTeacherUsername(row.username),
        email: normalizeBulkStudentText(row.email).toLowerCase(),
        password: normalizeBulkStudentText(row.password),
      }));

      const response = await userAPI.batchCreateTeachers(payload);
      const createdCount = Number(response.data?.summary?.createdCount || payload.length);
      const warningCount = Number(response.data?.summary?.warningCount || 0);

      toast.success(`Created ${createdCount} teacher account${createdCount === 1 ? '' : 's'}${warningCount > 0 ? ` with ${warningCount} email warning${warningCount === 1 ? '' : 's'}` : ''}.`);

      await refreshAdminData();
      closeCreateTeacherModal();
    } catch (error) {
      const rows = error.response?.data?.details?.rows;

      if (Array.isArray(rows)) {
        setTeacherBatchUploadRows(rows.map(decorateTeacherBatchRow));
      }

      const errorInfo = handleAPIError(error);
      toast.error(errorInfo.message);
    } finally {
      setIsBatchCreatingTeachers(false);
    }
  };

  // Create new student
  const onCreateStudent = async (data) => {
    try {
      setIsCreating(true);
      
      // Auto-append @student.com to username if not present
      const username = data.username.includes('@') ? data.username : `${data.username}@student.com`;
      
      const studentData = {
        ...data,
        username,
        section: String(data.section || '').trim() || null,
        academicYear: String(data.academicYear || '').trim() || null,
        role: 'STUDENT'
      };

      const response = await userAPI.createUser(studentData);
      
      if (response.status === 'success') {
        toast.success('✅ Student account created successfully!', {
          duration: 4000,
          style: {
            background: '#10b981',
            color: '#fff',
          },
        });
        closeCreateStudentModal();
        
        await refreshAdminData();
      }
    } catch (error) {
      const errorInfo = handleAPIError(error);
      toast.error(`❌ ${errorInfo.message}`, {
        duration: 6000,
        style: {
          background: '#ef4444',
          color: '#fff',
          whiteSpace: 'pre-line',
        },
      });
    } finally {
      setIsCreating(false);
    }
  };

  const decorateBulkStudentRow = (row, index) => ({
    clientRowId: row.clientRowId || `bulk-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    rowNumber: row.rowNumber ?? index + 1,
    firstName: row.firstName || '',
    lastName: row.lastName || '',
    username: normalizeBulkStudentUsername(row.username || ''),
    email: row.email || '',
    section: row.section || '',
    academicYear: row.academicYear || '',
    password: row.password || generateBulkStudentPassword(row.firstName, row.username, row.lastName),
    serverErrors: Array.isArray(row.errors) ? row.errors : (Array.isArray(row.serverErrors) ? row.serverErrors : []),
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
  });

  const handleBulkUploadFileSelected = async (event) => {
    const [file] = Array.from(event.target.files || []);

    if (!file) {
      return;
    }

    try {
      setStudentCreateMode('upload');
      setIsPreviewingBulkUpload(true);
      setBulkUploadFileName(file.name);

      const response = await userAPI.previewBulkStudentUpload(file);
      const rows = Array.isArray(response.data?.rows) ? response.data.rows : [];
      setBulkUploadRows(rows.map(decorateBulkStudentRow));

      toast.success(`Prepared ${rows.length} student row${rows.length === 1 ? '' : 's'} for review.`);
    } catch (error) {
      const errorInfo = handleAPIError(error);
      setBulkUploadRows([]);
      toast.error(errorInfo.message);
    } finally {
      setIsPreviewingBulkUpload(false);
    }
  };

  const handleBulkUploadRowChange = (clientRowId, field, value) => {
    setBulkUploadRows((prev) => prev.map((row) => {
      if (row.clientRowId !== clientRowId) {
        return row;
      }

      const nextRow = {
        ...row,
        [field]: value,
        serverErrors: [],
      };

      if (field === 'firstName' || field === 'lastName' || field === 'username') {
        const previousGeneratedPassword = generateBulkStudentPassword(row.firstName, row.username, row.lastName);
        const nextFirstName = field === 'firstName' ? value : nextRow.firstName;
        const nextLastName = field === 'lastName' ? value : nextRow.lastName;
        const nextUsername = field === 'username' ? value : nextRow.username;
        if (!row.password || row.password === previousGeneratedPassword) {
          nextRow.password = generateBulkStudentPassword(nextFirstName, nextUsername, nextLastName);
        }
      }

      return nextRow;
    }));
  };

  const handleRemoveBulkUploadRow = (clientRowId) => {
    setBulkUploadRows((prev) => prev.filter((row) => row.clientRowId !== clientRowId));
  };

  const handleAddBulkUploadRow = () => {
    setStudentCreateMode('upload');
    setBulkUploadRows((prev) => [...prev, createEmptyBulkStudentRow()]);
  };

  const handleConfirmBulkStudentCreate = async () => {
    const invalidRows = bulkUploadRowsWithValidation.filter((row) => !row.isValid);

    if (bulkUploadRowsWithValidation.length === 0) {
      toast.error('Add or upload at least one student row first.');
      return;
    }

    if (invalidRows.length > 0) {
      toast.error('Please fix the highlighted preview rows before creating the student accounts.');
      return;
    }

    try {
      setIsBulkCreating(true);

      const payload = bulkUploadRowsWithValidation.map((row) => ({
        firstName: normalizeBulkStudentName(row.firstName),
        lastName: normalizeBulkStudentName(row.lastName),
        username: normalizeBulkStudentUsername(row.username),
        email: normalizeBulkStudentText(row.email).toLowerCase(),
        section: normalizeBulkStudentText(row.section),
        academicYear: normalizeBulkStudentText(row.academicYear),
        password: normalizeBulkStudentText(row.password),
      }));

      const response = await userAPI.bulkCreateStudents(payload);
      const createdCount = Number(response.data?.summary?.createdCount || payload.length);
      const warningCount = Number(response.data?.summary?.warningCount || 0);

      toast.success(`Created ${createdCount} student account${createdCount === 1 ? '' : 's'}${warningCount > 0 ? ` with ${warningCount} email warning${warningCount === 1 ? '' : 's'}` : ''}.`);

      await refreshAdminData();
      closeCreateStudentModal();
    } catch (error) {
      const rows = error.response?.data?.details?.rows;

      if (Array.isArray(rows)) {
        setBulkUploadRows(rows.map(decorateBulkStudentRow));
      }

      const errorInfo = handleAPIError(error);
      toast.error(errorInfo.message);
    } finally {
      setIsBulkCreating(false);
    }
  };

  // Demo data for system stats
  const systemStats = {
    totalUsers: allUsers.length || 156,
    activeTeachers: teachers.filter(t => !t.isArchived).length || 8,
    totalStudents: allUsers.filter(u => u.role === 'STUDENT').length || 142,
    totalExams: 47,
    systemUptime: '99.8%',
    activeExams: 23
  };

  // Filtering and pagination logic
  const filterUsers = (users, searchTerm) => {
    return users.filter(user =>
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.section?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.academicYear?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filterAllUsers = (users) => {
    let filtered = users;
    
    // Search filter
    if (userSearch) {
      filtered = filterUsers(filtered, userSearch);
    }
    
    // Role filter
    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }
    
    return filtered;
  };

  const paginate = (array, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    return array.slice(startIndex, startIndex + itemsPerPage);
  };

  // Filtered and paginated data
  const filteredTeachers = filterUsers(teachers, teacherSearch).filter(t => 
    teacherViewTab === 'active' ? !t.isArchived : t.isArchived
  );
  // const filteredStudents = filterUsers(students, studentSearch).filter(s => 
  //   studentViewTab === 'active' ? !s.isArchived : s.isArchived
  // );

  const filteredStudents = filterUsers(students, studentSearch)
  .filter(s => studentViewTab === 'active' ? !s.isArchived : s.isArchived)
  .filter((student) => (
    studentSectionFilter === ALL_STUDENT_SECTIONS
      ? true
      : getStudentSectionLabel(student) === studentSectionFilter
  ))
  .filter((student) => (
    studentAcademicYearFilter === ALL_ACADEMIC_YEARS
      ? true
      : getStudentAcademicYearLabel(student) === studentAcademicYearFilter
  ))
  .sort((a, b) => a.lastName.localeCompare(b.lastName)
);

  const studentAcademicYearOptions = useMemo(() => {
    const years = students
      .filter((student) => (studentViewTab === 'active' ? !student.isArchived : student.isArchived))
      .map((student) => getStudentAcademicYearLabel(student))
      .filter(Boolean);

    return [
      ALL_ACADEMIC_YEARS,
      ...Array.from(new Set(years)).sort((left, right) => right.localeCompare(left)),
    ];
  }, [students, studentViewTab]);

  const studentSectionOptions = useMemo(() => {
    const sections = students
      .filter((student) => (studentViewTab === 'active' ? !student.isArchived : student.isArchived))
      .map((student) => getStudentSectionLabel(student))
      .filter(Boolean);

    return [
      ALL_STUDENT_SECTIONS,
      ...Array.from(new Set(sections)).sort((left, right) => left.localeCompare(right)),
    ];
  }, [students, studentViewTab]);

  const filteredAllUsers = filterAllUsers(allUsers).filter(u => 
    userViewTab === 'active' ? !u.isArchived : u.isArchived
  );

  const activeStudents = useMemo(
    () => students.filter((student) => !student.isArchived),
    [students]
  );

  const adminOverview = useMemo(() => {
    const totalStudents = activeStudents.length;
    const totalProgress = activeStudents.reduce(
      (sum, student) => sum + Number(student.metrics?.progressPercent || 0),
      0
    );
    const needsSupportCount = activeStudents.filter((student) => getPerformanceBandKey(student) === 'SUPPORT').length;
    const masteryCount = activeStudents.filter((student) => getPerformanceBandKey(student) === 'MASTERY').length;
    const activeThisWeekCount = activeStudents.filter((student) => {
      if (!student.metrics?.lastAttemptAt) {
        return false;
      }

      const daysSince = Math.floor((Date.now() - new Date(student.metrics.lastAttemptAt).getTime()) / 86400000);
      return daysSince <= 7;
    }).length;

    const persistentSections = activeStudents
      .map((student) => getStudentSectionLabel(student))
      .filter(Boolean);
    const sectionMap = new Map(
      persistentSections.map((section) => [section, {
        section,
        count: 0,
        totalProgress: 0,
        totalStars: 0,
        completedActivities: 0,
        totalActivities: 0,
        masteryCount: 0,
        needsSupportCount: 0,
        activeThisWeekCount: 0,
        students: [],
      }])
    );

    activeStudents.forEach((student) => {
      const section = getStudentSectionLabel(student);
      const existing = sectionMap.get(section) || {
        section,
        count: 0,
        totalProgress: 0,
        totalStars: 0,
        completedActivities: 0,
        totalActivities: 0,
        masteryCount: 0,
        needsSupportCount: 0,
        activeThisWeekCount: 0,
        students: [],
      };

      existing.count += 1;
      existing.totalProgress += Number(student.metrics?.progressPercent || 0);
      existing.totalStars += Number(student.metrics?.totalStars || 0);
      existing.completedActivities += getStudentCompletedActivities(student);
      existing.totalActivities += getStudentTotalActivities(student);

      if (getPerformanceBandKey(student) === 'MASTERY') {
        existing.masteryCount += 1;
      }

      if (getPerformanceBandKey(student) === 'SUPPORT') {
        existing.needsSupportCount += 1;
      }

      if (student.metrics?.lastAttemptAt) {
        const daysSince = Math.floor((Date.now() - new Date(student.metrics.lastAttemptAt).getTime()) / 86400000);
        if (daysSince <= 7) {
          existing.activeThisWeekCount += 1;
        }
      }

      existing.students.push(student);
      sectionMap.set(section, existing);
    });

    const sections = Array.from(sectionMap.values())
      .map((section) => ({
        ...section,
        avgProgress: section.count > 0 ? Math.round(section.totalProgress / section.count) : 0,
        students: [...section.students].sort(compareStudentsByPerformance),
      }))
      .sort((left, right) => {
        if (right.avgProgress !== left.avgProgress) {
          return right.avgProgress - left.avgProgress;
        }

        return left.section.localeCompare(right.section);
      });

    const dashboardInsights = buildStudentDashboardInsights(activeStudents, {
      topLimit: 5,
      attentionLimit: 5,
    });

    return {
      totalStudents,
      totalSections: sections.length,
      averageProgress: totalStudents > 0 ? Math.round(totalProgress / totalStudents) : 0,
      needsSupportCount,
      masteryCount,
      activeThisWeekCount,
      sections,
      topPerformers: dashboardInsights.topStudents,
      needsAttention: dashboardInsights.needsAttention,
    };
  }, [activeStudents]);

  const overviewSectionOptions = useMemo(
    () => [OVERVIEW_ALL_SECTIONS, ...adminOverview.sections.map((section) => section.section)],
    [adminOverview.sections]
  );

  const visibleOverviewSections = useMemo(() => (
    overviewSectionFilter === OVERVIEW_ALL_SECTIONS
      ? adminOverview.sections
      : adminOverview.sections.filter((section) => section.section === overviewSectionFilter)
  ), [adminOverview.sections, overviewSectionFilter]);

  const expandedOverviewSectionData = useMemo(() => {
    if (!expandedOverviewSection) {
      return null;
    }

    return adminOverview.sections.find((section) => section.section === expandedOverviewSection) || null;
  }, [adminOverview.sections, expandedOverviewSection]);

  useEffect(() => {
    if (!overviewSectionOptions.includes(overviewSectionFilter)) {
      setOverviewSectionFilter(OVERVIEW_ALL_SECTIONS);
    }
  }, [overviewSectionFilter, overviewSectionOptions]);

  useEffect(() => {
    if (!visibleOverviewSections.length) {
      setExpandedOverviewSection(null);
      return;
    }

    if (
      expandedOverviewSection
      && visibleOverviewSections.some((section) => section.section === expandedOverviewSection)
    ) {
      return;
    }

    setExpandedOverviewSection(null);
  }, [expandedOverviewSection, visibleOverviewSections]);
  
  const paginatedTeachers = paginate(filteredTeachers, teacherPage);
  const paginatedStudents = paginate(filteredStudents, studentPage);
  const paginatedUsers = paginate(filteredAllUsers, userPage);
  const paginatedActiveStudentIds = useMemo(
    () => (
      studentViewTab === 'active'
        ? paginatedStudents.map((student) => student.id)
        : []
    ),
    [paginatedStudents, studentViewTab]
  );
  const paginatedArchivedStudentIds = useMemo(
    () => (
      studentViewTab === 'archived'
        ? paginatedStudents.map((student) => student.id)
        : []
    ),
    [paginatedStudents, studentViewTab]
  );
  const allVisibleStudentsSelected = paginatedActiveStudentIds.length > 0
    && paginatedActiveStudentIds.every((studentId) => selectedStudentIds.includes(studentId));
  const allVisibleArchivedStudentsSelected = paginatedArchivedStudentIds.length > 0
    && paginatedArchivedStudentIds.every((studentId) => selectedArchivedStudentIds.includes(studentId));
  
  const teacherPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  const studentPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const userPages = Math.ceil(filteredAllUsers.length / itemsPerPage);

  useEffect(() => {
    const activeStudentIdSet = new Set(
      students
        .filter((student) => !student.isArchived)
        .map((student) => student.id)
    );

    setSelectedStudentIds((currentIds) => currentIds.filter((studentId) => activeStudentIdSet.has(studentId)));
    const archivedStudentIdSet = new Set(
      students
        .filter((student) => student.isArchived)
        .map((student) => student.id)
    );
    setSelectedArchivedStudentIds((currentIds) => currentIds.filter((studentId) => archivedStudentIdSet.has(studentId)));
  }, [students]);

  useEffect(() => {
    if (studentViewTab !== 'active') {
      setSelectedStudentIds([]);
    }
    if (studentViewTab !== 'archived') {
      setSelectedArchivedStudentIds([]);
    }
  }, [studentViewTab]);

  useEffect(() => {
    if (!studentAcademicYearOptions.includes(studentAcademicYearFilter)) {
      setStudentAcademicYearFilter(ALL_ACADEMIC_YEARS);
    }
  }, [studentAcademicYearFilter, studentAcademicYearOptions]);

  useEffect(() => {
    if (!studentSectionOptions.includes(studentSectionFilter)) {
      setStudentSectionFilter(ALL_STUDENT_SECTIONS);
    }
  }, [studentSectionFilter, studentSectionOptions]);

  // Edit user handler
  const handleEditUser = async (e) => {
    e.preventDefault();
    
    try {
      setIsEditing(true);
      
      const updateData = {
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        email: editFormData.email,
        ...(selectedUser.role === 'STUDENT' ? {
          section: String(editFormData.section || '').trim() || null,
          academicYear: String(editFormData.academicYear || '').trim() || null
        } : {})
      };
      
      const response = await userAPI.updateUser(selectedUser.id, updateData);
      
      if (response.status === 'success') {
        toast.success('✅ User updated successfully!', {
          duration: 4000,
          style: {
            background: '#10b981',
            color: '#fff',
          },
        });
        
        await refreshAdminData();
        
        setShowEditModal(false);
        setEditFormData(null);
      }
    } catch (error) {
      const errorInfo = handleAPIError(error);
      toast.error(errorInfo.message, {
        duration: 4000,
        style: {
          background: '#ef4444',
          color: '#fff',
        },
      });
    } finally {
      setIsEditing(false);
    }
  };
  
  const openConfirmDialog = (action, userData) => {
    setConfirmDialog({
      isOpen: true,
      action,
      user: userData
    });
  };

  const handleAiControlToggle = async (nextAiEnabled) => {
    try {
      setIsUpdatingAiControl(true);
      const response = await adminAiAPI.updateControlState({
        aiEnabled: Boolean(nextAiEnabled),
      });

      if (response.status === 'success') {
        setAiControlState({
          aiEnabled: response.data?.aiEnabled !== false,
          updatedAt: response.data?.updatedAt || null,
          updatedByUserId: response.data?.updatedByUserId || null,
        });
        toast.success(response.message || 'AI control updated successfully.');
      }
    } catch (error) {
      toast.error(handleAPIError(error).message);
    } finally {
      setIsUpdatingAiControl(false);
    }
  };

  const closeConfirmDialog = () => {
    if (isConfirmingAction) {
      return;
    }

    setConfirmDialog({
      isOpen: false,
      action: null,
      user: null
    });
  };

  // Archive user handler
  const handleArchiveUser = (userId, userName, roleLabel = 'user') => {
    openConfirmDialog('archive', {
      id: userId,
      name: userName,
      roleLabel
    });
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudentIds((currentIds) => (
      currentIds.includes(studentId)
        ? currentIds.filter((id) => id !== studentId)
        : [...currentIds, studentId]
    ));
  };

  const toggleVisibleStudentSelection = () => {
    if (paginatedActiveStudentIds.length === 0) {
      return;
    }

    setSelectedStudentIds((currentIds) => {
      if (allVisibleStudentsSelected) {
        return currentIds.filter((studentId) => !paginatedActiveStudentIds.includes(studentId));
      }

      return [...new Set([...currentIds, ...paginatedActiveStudentIds])];
    });
  };

  const toggleArchivedStudentSelection = (studentId) => {
    setSelectedArchivedStudentIds((currentIds) => (
      currentIds.includes(studentId)
        ? currentIds.filter((id) => id !== studentId)
        : [...currentIds, studentId]
    ));
  };

  const toggleVisibleArchivedStudentSelection = () => {
    if (paginatedArchivedStudentIds.length === 0) {
      return;
    }

    setSelectedArchivedStudentIds((currentIds) => {
      if (allVisibleArchivedStudentsSelected) {
        return currentIds.filter((studentId) => !paginatedArchivedStudentIds.includes(studentId));
      }

      return [...new Set([...currentIds, ...paginatedArchivedStudentIds])];
    });
  };

  const handleArchiveSelectedStudents = () => {
    if (selectedStudentIds.length === 0) {
      return;
    }

    openConfirmDialog('archive', {
      ids: selectedStudentIds,
      count: selectedStudentIds.length,
      name: `${selectedStudentIds.length} selected student${selectedStudentIds.length === 1 ? '' : 's'}`,
      roleLabel: selectedStudentIds.length === 1 ? 'student' : 'student accounts',
      isBulk: true,
    });
  };

  const handleRestoreSelectedStudents = () => {
    if (selectedArchivedStudentIds.length === 0) {
      return;
    }

    openConfirmDialog('restore', {
      ids: selectedArchivedStudentIds,
      count: selectedArchivedStudentIds.length,
      name: `${selectedArchivedStudentIds.length} selected student${selectedArchivedStudentIds.length === 1 ? '' : 's'}`,
      roleLabel: selectedArchivedStudentIds.length === 1 ? 'student' : 'student accounts',
      isBulk: true,
    });
  };

  // Restore user handler
  const handleRestoreUser = (userId, userName, roleLabel = 'user') => {
    openConfirmDialog('restore', {
      id: userId,
      name: userName,
      roleLabel
    });
  };

  // Permanently delete archived user handler
  const handlePermanentDeleteUser = (userId, userName, roleLabel = 'user') => {
    openConfirmDialog('delete', {
      id: userId,
      name: userName,
      roleLabel
    });
  };

  const confirmUserAction = async () => {
    if (!confirmDialog.user || !confirmDialog.action) {
      return;
    }

    const isBulkArchiveAction = confirmDialog.action === 'archive'
      && Array.isArray(confirmDialog.user.ids)
      && confirmDialog.user.ids.length > 0;
    const isBulkRestoreAction = confirmDialog.action === 'restore'
      && Array.isArray(confirmDialog.user.ids)
      && confirmDialog.user.ids.length > 0;

    const actionMap = {
      archive: {
        request: () => (
          isBulkArchiveAction
            ? userAPI.archiveUsers(confirmDialog.user.ids)
            : userAPI.deleteUser(confirmDialog.user.id)
        ),
        successMessage: isBulkArchiveAction
          ? `${confirmDialog.user.ids.length} students archived successfully!`
          : 'User archived successfully!',
        errorDuration: 4000
      },
      restore: {
        request: () => (
          isBulkRestoreAction
            ? userAPI.restoreUsers(confirmDialog.user.ids)
            : userAPI.restoreUser(confirmDialog.user.id)
        ),
        successMessage: isBulkRestoreAction
          ? `${confirmDialog.user.ids.length} students restored successfully!`
          : 'User restored successfully!',
        errorDuration: 6000
      },
      delete: {
        request: () => userAPI.permanentlyDeleteUser(confirmDialog.user.id),
        successMessage: 'User permanently deleted successfully!',
        errorDuration: 6000
      }
    };

    const currentAction = actionMap[confirmDialog.action];

    try {
      setIsConfirmingAction(true);
      await currentAction.request();

      toast.success(currentAction.successMessage, {
        duration: 4000,
        style: {
          background: '#10b981',
          color: '#fff',
        },
      });

      await refreshAdminData();
      if (isBulkArchiveAction) {
        setSelectedStudentIds([]);
      }
      if (isBulkRestoreAction) {
        setSelectedArchivedStudentIds([]);
      }
      closeConfirmDialog();
    } catch (error) {
      const errorInfo = handleAPIError(error);
      toast.error(`Action failed: ${errorInfo.message}`, {
        duration: currentAction.errorDuration,
        style: {
          background: '#ef4444',
          color: '#fff',
          whiteSpace: 'pre-line',
        },
      });
    } finally {
      setIsConfirmingAction(false);
      setConfirmDialog({
        isOpen: false,
        action: null,
        user: null
      });
    }
  };

  const confirmationConfig = {
    archive: {
      title: 'Archive User',
      description: 'This will deactivate the account and move it into the archive.',
      detail: 'The user will no longer be able to log in, but you can still restore the account later.',
      confirmLabel: 'Archive User',
      confirmClass: 'bg-orange-600 hover:bg-orange-700',
      panelClass: 'bg-orange-50 border-orange-200',
      detailClass: 'text-orange-800',
      iconClass: 'bg-orange-100 text-orange-600',
      Icon: Archive
    },
    restore: {
      title: 'Restore User',
      description: 'This will reactivate the archived account.',
      detail: 'The user will be able to sign in again as soon as the restore finishes.',
      confirmLabel: 'Restore User',
      confirmClass: 'bg-green-600 hover:bg-green-700',
      panelClass: 'bg-green-50 border-green-200',
      detailClass: 'text-green-800',
      iconClass: 'bg-green-100 text-green-600',
      Icon: UserCheck
    },
    delete: {
      title: 'Delete User Permanently',
      description: 'This permanently removes the archived account.',
      detail: 'This action cannot be undone and may also remove related records that belong to that archived user.',
      confirmLabel: 'Delete Permanently',
      confirmClass: 'bg-red-600 hover:bg-red-700',
      panelClass: 'bg-red-50 border-red-200',
      detailClass: 'text-red-800',
      iconClass: 'bg-red-100 text-red-600',
      Icon: Trash2
    }
  };

  const activeConfirmation = confirmDialog.action ? confirmationConfig[confirmDialog.action] : null;
  const ConfirmationIcon = activeConfirmation?.Icon;
  const isBulkArchiveDialog = confirmDialog.action === 'archive' && confirmDialog.user?.isBulk;
  const isBulkRestoreDialog = confirmDialog.action === 'restore' && confirmDialog.user?.isBulk;
  const confirmationTitle = isBulkArchiveDialog
    ? 'Archive Students'
    : isBulkRestoreDialog
      ? 'Restore Students'
      : activeConfirmation?.title;
  const confirmationDescription = isBulkArchiveDialog
    ? confirmDialog.user?.academicYear
      ? `This will deactivate every active student account in school year ${confirmDialog.user.academicYear} and move them into the archive.`
      : 'This will deactivate the selected student accounts and move them into the archive.'
    : isBulkRestoreDialog
      ? 'This will reactivate the selected archived student accounts.'
    : activeConfirmation?.description;
  const confirmationConfirmLabel = isBulkArchiveDialog
    ? 'Archive Students'
    : isBulkRestoreDialog
      ? 'Restore Students'
      : activeConfirmation?.confirmLabel;
  const confirmationTargetLabel = (isBulkArchiveDialog || isBulkRestoreDialog)
    ? `${confirmDialog.user.count} student account${confirmDialog.user.count === 1 ? '' : 's'}`
    : `${confirmDialog.user?.roleLabel} account: ${confirmDialog.user?.name}`;

  const StatCard = ({ title, value, subtitle, icon: Icon, color = "blue" }) => {
    const colorClasses = {
      blue: { text: 'text-blue-600', bg: 'bg-blue-50' },
      green: { text: 'text-green-600', bg: 'bg-green-50' },
      purple: { text: 'text-purple-600', bg: 'bg-purple-50' },
      orange: { text: 'text-orange-600', bg: 'bg-orange-50' }
    };
    
    const colors = colorClasses[color] || colorClasses.blue;
    
    return (
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-3xl font-bold mt-2 ${colors.text}`}>{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg border-2 border-[var(--ui-border-soft)] ${colors.bg}`}>
            <Icon className={`h-8 w-8 ${colors.text}`} />
          </div>
        </div>
      </div>
    );
  };

  const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    
    return (
      <div className="flex items-center justify-center space-x-2 mt-6">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        
        {pages.map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-2">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`btn ${
                currentPage === page
                  ? 'btn-primary'
                  : 'btn-secondary'
              }`}
            >
              {page}
            </button>
          )
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Layout title="System Administration">
        <div className="flex justify-center py-8">
          <LoadingSpinner size="xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="System Administration">
      <div className="game-main-grid">
        <aside className="game-sidebar overflow-y-auto">
          <div>
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2 rounded-lg border-2 border-[var(--ui-border)] bg-[var(--ui-panel-strong)]">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Admin Panel</h2>
                <p className="text-xs text-gray-500">System Control</p>
              </div>
            </div>

            <nav className="space-y-2">
              {[ 
                { id: 'overview', name: 'Overview', icon: Shield },
                { id: 'teachers', name: 'Teachers', icon: UserCheck },
                { id: 'students', name: 'Students', icon: GraduationCap },
                { id: 'users', name: 'All Users', icon: Users },
                { id: 'control', name: 'Control', icon: Power },
                { id: 'system', name: 'System', icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg border-2 transition-all ${
                      activeTab === tab.id
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-700'
                        : 'text-gray-700 border-[var(--ui-border-soft)] bg-white/80 hover:bg-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Quick Actions</p>
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    resetTeacherBatchUploadState();
                    setShowCreateTeacher(true);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4 text-purple-600" />
                  <span>Add Teacher</span>
                </button>
                <button 
                  onClick={() => {
                    resetStudentBulkUploadState();
                    setShowCreateStudent(true);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span>Add Student</span>
                </button>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-gray-200">
              <button 
                onClick={async () => {
                  try {
                    await logout();
                    toast.success('Logged out successfully');
                  } catch (error) {
                    toast.error('Logout failed');
                  }
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-700 border-2 border-red-200 hover:bg-red-50 rounded-lg transition-colors font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="game-content">

        {/* Tab Content */}
        <div className="pixel-panel-muted">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Section Overview</h3>
                    <p className="text-sm text-gray-600">
                      Admin overview is grouped by section first and reflects combined game plus assessment progress. Open any section to see the students inside it.
                    </p>
                  </div>

                  <div className="w-full md:w-64">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Section Filter
                    </label>
                    <select
                      value={overviewSectionFilter}
                      onChange={(e) => setOverviewSectionFilter(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value={OVERVIEW_ALL_SECTIONS}>All Sections</option>
                      {overviewSectionOptions
                        .filter((section) => section !== OVERVIEW_ALL_SECTIONS)
                        .map((section) => (
                          <option key={section} value={section}>{section}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <StatCard title="Students" value={adminOverview.totalStudents} subtitle="Active student accounts" icon={Users} color="blue" />
                  <StatCard title="Sections" value={adminOverview.totalSections} subtitle="Groups with enrolled students" icon={Shield} color="purple" />
                  <StatCard title="Avg. Progress" value={`${adminOverview.averageProgress}%`} subtitle="Games + assessments across all active students" icon={Activity} color="green" />
                  <StatCard title="On Target" value={adminOverview.masteryCount} subtitle="Students at 80%+ combined progress" icon={Trophy} color="orange" />
                  <StatCard title="Needs Support" value={adminOverview.needsSupportCount} subtitle="Students below 40% combined progress" icon={ShieldCheck} color="blue" />
                </div>

                {visibleOverviewSections.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                    No sections are available for the current filter yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visibleOverviewSections.map((section) => {
                      return (
                        <div key={section.section} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-emerald-600" />
                                <h4 className="text-base font-bold text-slate-900">{section.section}</h4>
                              </div>
                              <p className="mt-1 text-sm text-slate-500">
                                {section.count} student{section.count === 1 ? '' : 's'} in this section
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setExpandedOverviewSection(section.section)}
                              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              View students
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                            <div className="rounded-lg bg-slate-50 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Avg. Progress</p>
                              <p className="mt-1 text-xl font-black text-emerald-700">{section.avgProgress}%</p>
                              <p className="mt-1 text-[11px] text-slate-500">Games + assessments</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">On Target</p>
                              <p className="mt-1 text-xl font-black text-amber-600">{section.masteryCount}</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Support</p>
                              <p className="mt-1 text-xl font-black text-rose-600">{section.needsSupportCount}</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 p-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Active This Week</p>
                              <p className="mt-1 text-xl font-black text-blue-700">{section.activeThisWeekCount}</p>
                              <p className="mt-1 text-[11px] text-slate-500">Latest game or assessment activity</p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700">Section progress</span>
                              <span className="font-bold text-slate-800">{section.avgProgress}%</span>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${section.avgProgress}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h4 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      Top Performers
                    </h4>
                    {adminOverview.topPerformers.length === 0 ? (
                      <p className="text-sm text-slate-500">No student performance data is available yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {adminOverview.topPerformers.map((student, index) => (
                          <div key={student.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                            <span className="w-6 text-center text-xs font-black text-slate-400">#{index + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-900">{getStudentDisplayName(student)}</p>
                              <p className="text-xs text-slate-500">{getStudentSectionLabel(student)}</p>
                            </div>
                            <div className="w-16 shrink-0 text-right">
                              <p className={`w-full text-sm font-black tabular-nums ${getProgressPercentTextClass(getStudentDashboardPerformancePercent(student))}`}>
                                {getStudentDashboardPerformancePercent(student)}%
                              </p>
                              {/* <p className="text-xs text-slate-500">
                                {getStudentDashboardMetric(student, 'completedModules')}/{getStudentDashboardMetric(student, 'totalModules')} modules
                              </p> */}
                              {/* <p className="text-xs text-slate-500">{getStudentDashboardMetric(student, 'assessmentAverageScore')}% assessment</p> */}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h4 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
                      <Flag className="h-4 w-4 text-rose-500" />
                      Needs Attention
                    </h4>
                    {adminOverview.needsAttention.length === 0 ? (
                      <p className="text-sm text-slate-500">No students currently meet the intervention criteria.</p>
                    ) : (
                      <div className="space-y-2">
                        {adminOverview.needsAttention.map((student) => (
                          <div key={student.id} className="flex items-center gap-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-900">{getStudentDisplayName(student)}</p>
                              <p className="text-xs text-slate-500">{getStudentSectionLabel(student)}</p>
                            </div>
                            <div className="w-16 shrink-0 text-right">
                              <p className={`w-full text-sm font-black tabular-nums ${getProgressPercentTextClass(getStudentDashboardPerformancePercent(student))}`}>
                                {getStudentDashboardPerformancePercent(student)}%
                              </p>
                              {/* <p className="text-xs text-slate-500">
                                {getStudentDashboardMetric(student, 'completedModules')}/{getStudentDashboardMetric(student, 'totalModules')} modules
                              </p> */}
                              {/* <p className="text-xs text-slate-500">Last active {getStudentDashboardLatestActivityAt(student) ? getStudentActivityStatusLabel(student) : 'No activity yet'}</p> */}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Teachers Tab */}
            {activeTab === 'teachers' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Teacher Management</h3>
                  <div className="flex space-x-2">
                    <div className="relative flex-1 min-w-[300px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search teachers..."
                        value={teacherSearch}
                        onChange={(e) => {
                          setTeacherSearch(e.target.value);
                          setTeacherPage(1);
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        resetTeacherBatchUploadState();
                        setShowCreateTeacher(true);
                      }}
                      className="btn btn-primary whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4" />
                      Add Teacher
                    </button>
                  </div>
                </div>

                {/* Active/Archived Tabs for Teachers */}
                <div className="mb-6 border-b border-gray-200">
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setTeacherViewTab('active');
                        setTeacherPage(1);
                      }}
                      className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                        teacherViewTab === 'active'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      onClick={() => {
                        setTeacherViewTab('archived');
                        setTeacherPage(1);
                      }}
                      className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                        teacherViewTab === 'archived'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Archived
                    </button>
                  </div>
                </div>

                {teachers.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No teachers registered yet</p>
                    <button 
                      onClick={() => {
                        resetTeacherBatchUploadState();
                        setShowCreateTeacher(true);
                      }}
                      className="btn btn-primary"
                    >
                      <Plus className="h-4 w-4" />
                      Create First Teacher Account
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-4 py-2 text-left">Name</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Username</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Email</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Students</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedTeachers.map((teacher) => (
                          <tr key={teacher.id}>
                            <td className="border border-gray-200 px-4 py-2">
                              {teacher.firstName} {teacher.lastName}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 font-mono text-sm">
                              {teacher.username}
                            </td>
                            <td className="border border-gray-200 px-4 py-2">
                              {teacher.email}
                            </td>
                            <td className="border border-gray-200 px-4 py-2">
                              {teacher._count?.createdStudents || 0}
                            </td>
                            <td className="border border-gray-200 px-4 py-2">
                              <div className="flex flex-wrap gap-1">
                                <button 
                                  onClick={() => {
                                    setSelectedUser(teacher);
                                    setShowViewModal(true);
                                  }}
                                  className="btn btn-secondary text-xs"
                                >
                                  <Eye className="h-3 w-3" />
                                  View
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedUser(teacher);
                                    setEditFormData({
                                      firstName: teacher.firstName,
                                      lastName: teacher.lastName,
                                      email: teacher.email
                                    });
                                    setShowEditModal(true);
                                  }}
                                  className="btn btn-secondary text-xs"
                                >
                                  <Settings className="h-3 w-3" />
                                  Edit
                                </button>
                                {teacherViewTab === 'active' ? (
                                  <button 
                                    onClick={() => handleArchiveUser(teacher.id, `${teacher.firstName} ${teacher.lastName}`, 'teacher')}
                                    className="btn btn-secondary text-xs text-orange-600 hover:bg-orange-50"
                                  >
                                    <Archive className="h-3 w-3" />
                                    Archive
                                  </button>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => handleRestoreUser(teacher.id, `${teacher.firstName} ${teacher.lastName}`, 'teacher')}
                                      className="btn btn-secondary text-xs text-green-600 hover:bg-green-50"
                                    >
                                      Restore
                                    </button>
                                    <button
                                      onClick={() => handlePermanentDeleteUser(teacher.id, `${teacher.firstName} ${teacher.lastName}`, 'teacher')}
                                      className="btn btn-secondary text-xs text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <Pagination 
                      currentPage={teacherPage}
                      totalPages={teacherPages}
                      onPageChange={setTeacherPage}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Students Tab */}
            {activeTab === 'students' && (
              <div>
                <div className="mb-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-semibold">Student Management</h3>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={studentSectionFilter}
                          onChange={(e) => {
                            setStudentSectionFilter(e.target.value);
                            setStudentPage(1);
                          }}
                          className="min-w-[170px] rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          aria-label="Filter students by section"
                        >
                          <option value={ALL_STUDENT_SECTIONS}>All sections</option>
                          {studentSectionOptions
                            .filter((section) => section !== ALL_STUDENT_SECTIONS)
                            .map((section) => (
                              <option key={section} value={section}>{section}</option>
                            ))}
                        </select>
                        <select
                          value={studentAcademicYearFilter}
                          onChange={(e) => {
                            setStudentAcademicYearFilter(e.target.value);
                            setStudentPage(1);
                          }}
                          className="min-w-[190px] rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          aria-label="Filter students by school year"
                        >
                          <option value={ALL_ACADEMIC_YEARS}>All school years</option>
                          {studentAcademicYearOptions
                            .filter((year) => year !== ALL_ACADEMIC_YEARS)
                            .map((year) => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        <div className="relative w-[320px] min-w-[220px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search students..."
                            value={studentSearch}
                            onChange={(e) => {
                              setStudentSearch(e.target.value);
                              setStudentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            resetStudentBulkUploadState();
                            setShowCreateStudent(true);
                          }}
                          className="btn btn-primary whitespace-nowrap"
                        >
                          <Plus className="h-4 w-4" />
                          Add Student
                        </button>
                      </div>
                      {(studentViewTab === 'active' && selectedStudentIds.length > 0) && (
                        <button
                          type="button"
                          onClick={handleArchiveSelectedStudents}
                          className="btn btn-secondary whitespace-nowrap text-orange-600 hover:bg-orange-50"
                        >
                          <Archive className="h-4 w-4" />
                          Archive Selected ({selectedStudentIds.length})
                        </button>
                      )}
                      {(studentViewTab === 'archived' && selectedArchivedStudentIds.length > 0) && (
                        <button
                          type="button"
                          onClick={handleRestoreSelectedStudents}
                          className="btn btn-secondary whitespace-nowrap text-green-600 hover:bg-green-50"
                        >
                          Restore Selected ({selectedArchivedStudentIds.length})
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Active/Archived Tabs */}
                <div className="mb-6 border-b border-gray-200">
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setStudentViewTab('active');
                        setStudentPage(1);
                      }}
                      className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                        studentViewTab === 'active'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      onClick={() => {
                        setStudentViewTab('archived');
                        setStudentPage(1);
                      }}
                      className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                        studentViewTab === 'archived'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Archived
                    </button>
                  </div>
                </div>

                {students.length === 0 ? (
                  <div className="text-center py-8">
                    <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No students registered yet</p>
                    <button 
                      onClick={() => {
                        resetStudentBulkUploadState();
                        setShowCreateStudent(true);
                      }}
                      className="btn btn-primary"
                    >
                      <Plus className="h-4 w-4" />
                      Create First Student Account
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          {studentViewTab === 'active' && (
                            <th className="border border-gray-200 px-4 py-2 text-center w-12">
                              <input
                                type="checkbox"
                                checked={allVisibleStudentsSelected}
                                onChange={toggleVisibleStudentSelection}
                                aria-label="Select all visible students"
                              />
                            </th>
                          )}
                          {studentViewTab === 'archived' && (
                            <th className="border border-gray-200 px-4 py-2 text-center w-12">
                              <input
                                type="checkbox"
                                checked={allVisibleArchivedStudentsSelected}
                                onChange={toggleVisibleArchivedStudentSelection}
                                aria-label="Select all visible archived students"
                              />
                            </th>
                          )}
                          <th className="border border-gray-200 px-4 py-2 text-left">Name</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Username</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Email</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">School Year</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Section</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedStudents.map((student) => (
                          <tr key={student.id}>
                            {studentViewTab === 'active' && (
                              <td className="border border-gray-200 px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedStudentIds.includes(student.id)}
                                  onChange={() => toggleStudentSelection(student.id)}
                                  aria-label={`Select ${student.firstName} ${student.lastName}`}
                                />
                              </td>
                            )}
                            {studentViewTab === 'archived' && (
                              <td className="border border-gray-200 px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedArchivedStudentIds.includes(student.id)}
                                  onChange={() => toggleArchivedStudentSelection(student.id)}
                                  aria-label={`Select archived ${student.firstName} ${student.lastName}`}
                                />
                              </td>
                            )}
                            <td className="border border-gray-200 px-4 py-2">
                              {student.firstName} {student.lastName}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 font-mono text-sm">
                              {student.username}
                            </td>
                            <td className="border border-gray-200 px-4 py-2">
                              {student.email}
                            </td>
                            <td className="border border-gray-200 px-4 py-2">
                              {student.academicYear || 'Not set'}
                            </td>
                            <td className="border border-gray-200 px-4 py-2">
                              {student.section || 'Unassigned'}
                            </td>
                            <td className="border border-gray-200 px-4 py-2">
                              <div className="flex flex-wrap gap-1">
                                <button 
                                  onClick={() => {
                                    setSelectedUser(student);
                                    setShowViewModal(true);
                                  }}
                                  className="btn btn-secondary text-xs"
                                >
                                  <Eye className="h-3 w-3" />
                                  View
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedUser(student);
                                    setEditFormData({
                                      firstName: student.firstName,
                                      lastName: student.lastName,
                                      email: student.email
                                    });
                                    setShowEditModal(true);
                                  }}
                                  className="btn btn-secondary text-xs"
                                >
                                  <Settings className="h-3 w-3" />
                                  Edit
                                </button>
                                {studentViewTab === 'active' ? (
                                  <button 
                                    onClick={() => handleArchiveUser(student.id, `${student.firstName} ${student.lastName}`, 'student')}
                                    className="btn btn-secondary text-xs text-orange-600 hover:bg-orange-50"
                                  >
                                    <Archive className="h-3 w-3" />
                                    Archive
                                  </button>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => handleRestoreUser(student.id, `${student.firstName} ${student.lastName}`, 'student')}
                                      className="btn btn-secondary text-xs text-green-600 hover:bg-green-50"
                                    >
                                      Restore
                                    </button>
                                    <button
                                      onClick={() => handlePermanentDeleteUser(student.id, `${student.firstName} ${student.lastName}`, 'student')}
                                      className="btn btn-secondary text-xs text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <Pagination 
                      currentPage={studentPage}
                      totalPages={studentPages}
                      onPageChange={setStudentPage}
                    />
                  </div>
                )}
              </div>
            )}

            {/* All Users Tab */}
            {activeTab === 'users' && (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-4">All Platform Users</h3>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => {
                          setUserSearch(e.target.value);
                          setUserPage(1);
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <select
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value);
                        setUserPage(1);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="ALL">All Roles</option>
                      <option value="SUPER_ADMIN">Admin</option>
                      <option value="TEACHER">Teacher</option>
                      <option value="STUDENT">Student</option>
                    </select>
                  </div>
                </div>
                
                {/* Archive Tabs for All Users */}
                <div className="mb-6 border-b border-gray-200">
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setUserViewTab('active');
                        setUserPage(1);
                      }}
                      className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                        userViewTab === 'active'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      onClick={() => {
                        setUserViewTab('archived');
                        setUserPage(1);
                      }}
                      className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                        userViewTab === 'archived'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Archived
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left">Name</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Role</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Email</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map((usr) => (
                        <tr key={usr.id}>
                          <td className="border border-gray-200 px-4 py-2">
                            {usr.firstName} {usr.lastName}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                           <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              usr.role === 'SUPER_ADMIN'
                                ? 'bg-purple-100 text-purple-800'
                                : usr.role === 'TEACHER'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {usr.role === 'SUPER_ADMIN' ? 'ADMIN' : usr.role.replace('_', ' ')}
                          </span>
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            {usr.email}
                          </td> 
                          <td className="border border-gray-200 px-4 py-2">
                            <div className="flex space-x-1">
                              <button 
                                onClick={() => {
                                  setSelectedUser(usr);
                                  setShowViewModal(true);
                                }}
                                className="btn btn-secondary text-xs"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedUser(usr);
                                  setEditFormData({
                                    firstName: usr.firstName,
                                    lastName: usr.lastName,
                                    email: usr.email
                                  });
                                  setShowEditModal(true);
                                }}
                                className="btn btn-secondary text-xs"
                              >
                                <Settings className="h-3 w-3" />
                                Edit
                              </button>
                              {userViewTab === 'active' ? (
                                <button 
                                  onClick={() => handleArchiveUser(usr.id, `${usr.firstName} ${usr.lastName}`)}
                                  className="btn btn-secondary text-xs text-orange-600 hover:bg-orange-50"
                                >
                                  <Archive className="h-3 w-3" />
                                  Archive
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleRestoreUser(usr.id, `${usr.firstName} ${usr.lastName}`)}
                                  className="btn btn-secondary text-xs text-green-600 hover:bg-green-50"
                                >
                                  Restore
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <Pagination 
                    currentPage={userPage}
                    totalPages={userPages}
                    onPageChange={setUserPage}
                  />
                </div>
              </div>
            )}

            {activeTab === 'control' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Control Center</h3>
                    <p className="text-sm text-gray-600">
                      Use this page to temporarily disable live AI generation across admin, teacher, and student flows while testing.
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                    aiControlState.aiEnabled
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    <Power className="h-4 w-4" />
                    {aiControlState.aiEnabled ? 'AI Enabled' : 'AI Disabled'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900">Global AI Switch</h4>
                        <p className="mt-2 text-sm text-gray-600">
                          When disabled, the app uses default placeholder questions, hints, strengths, weaknesses, and other safe fallback values instead of live AI calls.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAiControlToggle(!aiControlState.aiEnabled)}
                        disabled={isAiControlLoading || isUpdatingAiControl}
                        className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          aiControlState.aiEnabled
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : 'border-amber-300 bg-amber-50 text-amber-800'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <span
                          className={`relative h-6 w-11 rounded-full transition ${
                            aiControlState.aiEnabled ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                              aiControlState.aiEnabled ? 'left-5' : 'left-0.5'
                            }`}
                          />
                        </span>
                        <span>
                          {isUpdatingAiControl
                            ? 'Updating...'
                            : (aiControlState.aiEnabled ? 'Turn AI Off' : 'Turn AI On')}
                        </span>
                      </button>
                    </div>

                    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">Current mode</p>
                      <p className="mt-1">
                        {aiControlState.aiEnabled
                          ? 'Live AI responses are active for supported generation features.'
                          : 'Fallback mode is active. Testing will use default content without consuming AI resources.'}
                      </p>
                      <p className="mt-3 text-xs text-slate-500">
                        Last updated:{' '}
                        {aiControlState.updatedAt
                          ? new Date(aiControlState.updatedAt).toLocaleString()
                          : 'Not changed yet'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h4 className="text-base font-semibold text-gray-900">Affected Areas</h4>
                    <div className="mt-4 space-y-3 text-sm text-gray-700">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="font-medium text-gray-900">Student side</p>
                        <p className="mt-1">Game content keeps its default question and hint values instead of requesting fresh AI generation.</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="font-medium text-gray-900">Teacher side</p>
                        <p className="mt-1">Performance insight generation returns stable default strengths, weaknesses, and recommended actions for testing.</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="font-medium text-gray-900">Admin side</p>
                        <p className="mt-1">AI tools remain available, but they respond with deterministic fallback content while the switch is off.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Tab */}
            {activeTab === 'system' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">System Management</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium mb-3">Database Status</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Connection:</span>
                        <span className="text-green-600">Healthy</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Performance:</span>
                        <span className="text-green-600">Optimal</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Backup:</span>
                        <span>2 hours ago</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="font-medium mb-3">Security Status</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>SSL Certificate:</span>
                        <span className="text-green-600">Valid</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Security Scan:</span>
                        <span className="text-green-600">Passed</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Failed Login Attempts:</span>
                        <span>0 today</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        {/* View User Modal */}
        {showViewModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowViewModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">User Details</h3>
                  <button 
                    onClick={() => setShowViewModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">First Name</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedUser.firstName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Last Name</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedUser.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Username</p>
                    <p className="text-lg font-mono text-gray-900">{selectedUser.username}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Email</p>
                    <p className="text-lg text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Role</p>
                    <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                      selectedUser.role === 'SUPER_ADMIN' 
                        ? 'bg-purple-100 text-purple-800'
                        : selectedUser.role === 'TEACHER'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedUser.role === 'SUPER_ADMIN'
                        ? 'ADMIN'
                        : selectedUser.role.replace('_', ' ')
                      }
                    </span>
                  </div>
                  {selectedUser.role === 'STUDENT' && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Section</p>
                        <p className="text-lg text-gray-900">{selectedUser.section || 'Unassigned'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Academic Year</p>
                        <p className="text-lg text-gray-900">{selectedUser.academicYear || 'Not set'}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
                    <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getUserAccountStatusMeta(selectedUser).className}`}>
                      {getUserAccountStatusMeta(selectedUser).label}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Created Date</p>
                    <p className="text-lg text-gray-900">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Last Login</p>
                    <p className="text-lg text-gray-900">
                      {selectedUser.lastLogin 
                        ? new Date(selectedUser.lastLogin).toLocaleDateString()
                        : 'Never logged in'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
                  <button 
                    onClick={() => setShowViewModal(false)}
                    className="btn btn-secondary"
                  >
                    Close
                  </button>
                  <button 
                    onClick={() => {
                      setShowViewModal(false);
                      setShowEditModal(true);
                      setEditFormData({
                        firstName: selectedUser.firstName,
                        lastName: selectedUser.lastName,
                        email: selectedUser.email,
                        section: selectedUser.section || '',
                        academicYear: selectedUser.academicYear || ''
                      });
                    }}
                    className="btn btn-primary"
                  >
                    <Settings className="h-4 w-4" />
                    Edit User
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Edit User</h3>
                  <button 
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                
                <form className="space-y-5" onSubmit={handleEditUser}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={editFormData?.firstName || ''}
                        onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={editFormData?.lastName || ''}
                        onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={editFormData?.email || ''}
                      onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {selectedUser.role === 'STUDENT' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                        <input
                          type="text"
                          value={editFormData?.section || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value })}
                          placeholder="e.g. ICT-1A"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                        <input
                          type="text"
                          value={editFormData?.academicYear || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, academicYear: e.target.value })}
                          placeholder="e.g. 2025-2026"
                          pattern="^\d{4}-\d{4}$"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-500">Use the format `2025-2026`.</p>
                      </div>
                    </>
                  )}
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Username:</strong> {selectedUser.username}
                    </p>
                    <p className="text-sm text-blue-800 mt-1">
                      <strong>Role:</strong> {selectedUser.role.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-blue-600 mt-2">Username and role cannot be changed</p>
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditFormData(null);
                      }}
                      disabled={isEditing}
                      className="btn btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isEditing}
                      className={`btn btn-primary flex-1 ${isEditing ? 'loading' : ''}`}
                    >
                      {isEditing ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Updating...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        {/* Confirmation Modal */}
        {confirmDialog.isOpen && confirmDialog.user && activeConfirmation && ConfirmationIcon && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={closeConfirmDialog}>
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="p-8">
                <div className="flex items-center justify-center mb-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${activeConfirmation.iconClass}`}>
                    <ConfirmationIcon className="h-8 w-8" />
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">{confirmationTitle}</h3>
                <p className="text-gray-600 text-center mb-3">
                  {confirmationDescription}
                </p>
                <p className="text-center text-sm text-gray-900 mb-6">
                  Target <span className="font-semibold">{confirmationTargetLabel}</span>
                </p>
                <div className={`border rounded-lg p-4 mb-6 ${activeConfirmation.panelClass}`}>
                  <p className={`text-sm ${activeConfirmation.detailClass}`}>
                    <strong>Note:</strong> {activeConfirmation.detail}
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={closeConfirmDialog}
                    disabled={isConfirmingAction}
                    className="btn btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmUserAction}
                    disabled={isConfirmingAction}
                    className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${activeConfirmation.confirmClass}`}
                  >
                    {isConfirmingAction ? 'Please wait...' : confirmationConfirmLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {expandedOverviewSectionData && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 pt-24">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-slate-600" />
                  <h3 className="text-lg font-bold text-slate-900">{`${expandedOverviewSectionData.section} Students`}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedOverviewSection(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Back
                </button>
              </div>

              <div className="max-h-[calc(90vh-81px)] overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Students</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{expandedOverviewSectionData.count}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Stars</p>
                    <p className="mt-1 text-xl font-black text-amber-600">{expandedOverviewSectionData.totalStars}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Avg. Progress</p>
                    <p className="mt-1 text-xl font-black text-emerald-700">{expandedOverviewSectionData.avgProgress}%</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Game Progress</p>
                    <p className="mt-1 text-xl font-black text-violet-700">
                      {expandedOverviewSectionData.count > 0
                        ? Math.round(
                          expandedOverviewSectionData.students.reduce(
                            (sum, student) => sum + Number(student.metrics?.gameProgressPercent || 0),
                            0
                          ) / expandedOverviewSectionData.count
                        )
                        : 0}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Avg. Quiz Score</p>
                    <p className="mt-1 text-xl font-black text-sky-700">
                      {expandedOverviewSectionData.students.filter((student) => getStudentAssessmentAverageScore(student) > 0).length > 0
                        ? Math.round(
                          expandedOverviewSectionData.students.reduce(
                            (sum, student) => sum + getStudentAssessmentAverageScore(student),
                            0
                          ) / expandedOverviewSectionData.students.filter((student) => getStudentAssessmentAverageScore(student) > 0).length
                        )
                        : 0}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Active This Week</p>
                    <p className="mt-1 text-xl font-black text-blue-700">{expandedOverviewSectionData.activeThisWeekCount}</p>
                  </div>
                </div>

                <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-150 border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-50 text-left text-sm text-slate-900">
                        <th className="border-b border-slate-200 px-4 py-3 font-black">Student</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-black">Game Progress</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-black">Assessment Progress</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-black">Stars</th>
                        <th className="border-b border-slate-200 px-4 py-3 font-black">Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expandedOverviewSectionData.students.map((student) => (
                        <tr key={student.id} className="border-b border-slate-100 text-sm text-slate-700 last:border-b-0">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-semibold text-slate-900">{getStudentDisplayName(student)}</p>
                              <p className="text-xs text-slate-500">{student.username}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className={`font-bold ${getProgressPercentTextClass(student.metrics?.gameProgressPercent)}`}>
                              {Math.round(Number(student.metrics?.gameProgressPercent || 0))}%
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-violet-700">
                              {Math.round(getStudentAssessmentProgressPercent(student))}%
                            </div>
                            <div className="text-xs text-slate-500">
                              Quiz avg: {Math.round(getStudentAssessmentAverageScore(student))}%
                            </div>
                          </td>
                          <td className="px-4 py-3 font-bold text-amber-600">
                            {Number(student.metrics?.totalStars || 0)}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {getStudentActivityStatusLabel(student)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {showCreateTeacher && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeCreateTeacherModal}>
          <div className={`w-full overflow-hidden rounded-xl bg-white shadow-2xl ${teacherCreateMode === 'upload' ? 'max-w-7xl' : 'max-w-2xl'}`} onClick={(e) => e.stopPropagation()}>
            <div className="max-h-[90vh] overflow-y-auto p-8">
              <input
                ref={teacherBatchUploadInputRef}
                type="file"
                accept={BULK_UPLOAD_ACCEPT}
                className="hidden"
                onChange={handleTeacherBatchFileSelected}
              />

              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Create Teacher Account</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Upload a Excel file to prepare multiple teacher accounts at once.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTeacherCreateMode('upload');
                      teacherBatchUploadInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Excel
                  </button>
                </div>
              </div>

              {teacherCreateMode === 'manual' ? (
                <form onSubmit={handleSubmit(onCreateTeacher)} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      placeholder="John"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                        errors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      {...register('firstName', {
                        required: 'First name is required',
                      })}
                    />
                    {errors.firstName && (
                      <p className="text-red-600 text-sm mt-1">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      placeholder="Doe"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                        errors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      {...register('lastName', {
                        required: 'Last name is required',
                      })}
                    />
                    {errors.lastName && (
                      <p className="text-red-600 text-sm mt-1">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter username"
                      className={`w-full px-4 py-2.5 pr-32 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                        errors.username ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      {...register('username', {
                        required: 'Username is required',
                        pattern: {
                          value: /^[a-zA-Z0-9._-]+$/,
                          message: 'Only letters, numbers, dots, hyphens and underscores allowed'
                        }
                      })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@teacher.com</span>
                  </div>
                  {errors.username && (
                    <p className="text-red-600 text-sm mt-1">{errors.username.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">@teacher.com will be added automatically</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address (for OTP)</label>
                  <input
                    type="email"
                    placeholder="teacher@gmail.com"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                      errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                        message: 'Please enter a valid email address',
                      }
                    })}
                  />
                  {errors.email && (
                    <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Use a real Gmail address for OTP delivery</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      className={`w-full px-4 py-2.5 pr-12 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${
                        errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 8,
                          message: 'Password must be at least 8 characters',
                        },
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    Auto-generated as `firstname_username@_lastname` using the username before `@teacher.com`
                  </p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeCreateTeacherModal}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className={`btn btn-primary flex-1 ${isCreating ? 'loading' : ''}`}
                  >
                    {isCreating ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Creating...
                      </>
                    ) : (
                      'Create Teacher'
                    )}
                  </button>
                </div>
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-3">
                        <FileSpreadsheet className="mt-0.5 h-5 w-5 text-purple-700" />
                        <div>
                          <p className="font-semibold text-purple-900">Teacher Batch Upload Preview</p>
                          <p className="text-sm text-purple-800">
                            Upload `Excel` files. Excel parsing works best when the file uses a clear table with headers like First Name, Last Name, Username, Email, and Password.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => teacherBatchUploadInputRef.current?.click()}
                          className="rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
                        >
                          Choose Another File
                        </button>
                        <button
                          type="button"
                          onClick={handleAddTeacherBatchRow}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Add Row
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
                        File: {teacherBatchUploadFileName || 'No file selected yet'}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-emerald-700">
                        Valid: {teacherBatchSummary.validRows}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-rose-700">
                        Needs review: {teacherBatchSummary.invalidRows}
                      </span>
                    </div>
                  </div>

                  {isPreviewingTeacherBatchUpload ? (
                    <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                      <div className="flex items-center gap-3 text-slate-600">
                        <LoadingSpinner size="sm" />
                        <span className="text-sm font-medium">Reading teacher file and preparing preview...</span>
                      </div>
                    </div>
                  ) : teacherBatchRowsWithValidation.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                      <p className="text-base font-semibold text-slate-800">No batch teacher rows yet</p>
                      <p className="mt-2 text-sm text-slate-500">Upload a PDF or Excel file, or add rows manually to start the batch teacher creation flow.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-[1080px] w-full bg-white text-sm">
                          <thead className="bg-slate-50 text-left text-slate-700">
                            <tr>
                              <th className="px-3 py-3 font-semibold">#</th>
                              <th className="px-3 py-3 font-semibold">First Name</th>
                              <th className="px-3 py-3 font-semibold">Last Name</th>
                              <th className="px-3 py-3 font-semibold">Username</th>
                              <th className="px-3 py-3 font-semibold">Email</th>
                              <th className="px-3 py-3 font-semibold">Password</th>
                              <th className="px-3 py-3 font-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teacherBatchRowsWithValidation.map((row, index) => (
                              <tr key={row.clientRowId} className={`border-t border-slate-200 align-top ${row.isValid ? 'bg-white' : 'bg-rose-50/50'}`}>
                                <td className="px-3 py-3 font-semibold text-slate-500">{row.rowNumber ?? index + 1}</td>
                                <td className="px-3 py-3">
                                  <input type="text" value={row.firstName} onChange={(e) => handleTeacherBatchRowChange(row.clientRowId, 'firstName', e.target.value)} className="w-full min-w-[140px] rounded-lg border border-slate-300 px-3 py-2" />
                                </td>
                                <td className="px-3 py-3">
                                  <input type="text" value={row.lastName} onChange={(e) => handleTeacherBatchRowChange(row.clientRowId, 'lastName', e.target.value)} className="w-full min-w-[140px] rounded-lg border border-slate-300 px-3 py-2" />
                                </td>
                                <td className="px-3 py-3">
                                  <div className="relative min-w-[230px]">
                                    <input type="text" value={row.username} onChange={(e) => handleTeacherBatchRowChange(row.clientRowId, 'username', e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-28" />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">@teacher.com</span>
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <input type="email" value={row.email} onChange={(e) => handleTeacherBatchRowChange(row.clientRowId, 'email', e.target.value)} className="w-full min-w-[220px] rounded-lg border border-slate-300 px-3 py-2" />
                                </td>
                                <td className="px-3 py-3">
                                  <input type="text" value={row.password} onChange={(e) => handleTeacherBatchRowChange(row.clientRowId, 'password', e.target.value)} className="w-full min-w-[220px] rounded-lg border border-slate-300 px-3 py-2" />
                                </td>
                                <td className="px-3 py-3">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTeacherBatchRow(row.clientRowId)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-rose-600 transition hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="space-y-3">
                        {teacherBatchRowsWithValidation.filter((row) => row.allErrors.length > 0 || row.warnings.length > 0).map((row, index) => (
                          <div key={`${row.clientRowId}-messages`} className={`rounded-xl border p-4 ${row.allErrors.length > 0 ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
                            <p className={`text-sm font-semibold ${row.allErrors.length > 0 ? 'text-rose-700' : 'text-amber-700'}`}>
                              Row {row.rowNumber ?? index + 1} {row.allErrors.length > 0 ? 'needs review' : 'warning'}
                            </p>
                            {row.allErrors.map((message, messageIndex) => (
                              <p key={`${row.clientRowId}-error-${messageIndex}`} className="mt-1 text-sm text-rose-700">{message}</p>
                            ))}
                            {row.warnings.map((message, messageIndex) => (
                              <p key={`${row.clientRowId}-warning-${messageIndex}`} className="mt-1 text-sm text-amber-700">{message}</p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-500">
                      Confirm batch create only after the preview rows are correct. You can edit, remove, or add rows before saving.
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={closeCreateTeacherModal} className="btn btn-secondary">
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmTeacherBatchCreate}
                        disabled={isBatchCreatingTeachers || isPreviewingTeacherBatchUpload || teacherBatchRowsWithValidation.length === 0}
                        className={`btn btn-primary ${isBatchCreatingTeachers ? 'loading' : ''}`}
                      >
                        {isBatchCreatingTeachers ? (
                          <>
                            <LoadingSpinner size="sm" />
                            Creating Teachers...
                          </>
                        ) : (
                          `Confirm Batch Create (${teacherBatchRowsWithValidation.length})`
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeCreateStudentModal}>
          <div className={`w-full overflow-hidden rounded-xl bg-white shadow-2xl ${studentCreateMode === 'upload' ? 'max-w-7xl' : 'max-w-2xl'}`} onClick={(e) => e.stopPropagation()}>
            <div className="max-h-[90vh] overflow-y-auto p-8">
              <input
                ref={studentBulkUploadInputRef}
                type="file"
                accept={BULK_UPLOAD_ACCEPT}
                className="hidden"
                onChange={handleBulkUploadFileSelected}
              />

              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Create Student Account</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Upload a Excel file to prepare multiple student accounts at once.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStudentCreateMode('upload');
                      studentBulkUploadInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Excel
                  </button>
                </div>
              </div>

              {studentCreateMode === 'manual' ? (
                <form onSubmit={handleSubmit(onCreateStudent)} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        placeholder="Jane"
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        {...register('firstName', {
                          required: 'First name is required',
                        })}
                      />
                      {errors.firstName && (
                        <p className="text-red-600 text-sm mt-1">{errors.firstName.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        placeholder="Smith"
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        {...register('lastName', {
                          required: 'Last name is required',
                        })}
                      />
                      {errors.lastName && (
                        <p className="text-red-600 text-sm mt-1">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter username"
                        className={`w-full px-4 py-2.5 pr-32 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors.username ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        {...register('username', {
                          required: 'Username is required',
                          pattern: {
                            value: /^[a-zA-Z0-9._-]+$/,
                            message: 'Only letters, numbers, dots, hyphens and underscores allowed'
                          }
                        })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@student.com</span>
                    </div>
                    {errors.username && (
                      <p className="text-red-600 text-sm mt-1">{errors.username.message}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">@student.com will be added automatically</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      placeholder="student@gmail.com"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      {...register('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                          message: 'Please enter a valid email address',
                        }
                      })}
                    />
                    {errors.email && (
                      <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Use a real email address</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
                    <input
                      type="text"
                      placeholder="e.g. ICT-1A"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.section ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      {...register('section', {
                        required: 'Section is required',
                        maxLength: {
                          value: 40,
                          message: 'Section must be 40 characters or fewer'
                        }
                      })}
                    />
                    {errors.section && (
                      <p className="text-red-600 text-sm mt-1">{errors.section.message}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Use this to group students by class section.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                    <input
                      type="text"
                      placeholder="e.g. 2025-2026"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.academicYear ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      {...register('academicYear', {
                        required: 'Academic year is required',
                        pattern: {
                          value: /^\d{4}-\d{4}$/,
                          message: 'Use the format 2025-2026'
                        }
                      })}
                    />
                    {errors.academicYear && (
                      <p className="text-red-600 text-sm mt-1">{errors.academicYear.message}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Use the format `2025-2026`.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 8 characters"
                        className={`w-full px-4 py-2.5 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                          errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        {...register('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 8,
                            message: 'Password must be at least 8 characters',
                          },
                        })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      Auto-generated as `firstname_username@_lastname` using the username before `@student.com`
                    </p>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeCreateStudentModal}
                      className="btn btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating}
                      className={`btn btn-primary flex-1 ${isCreating ? 'loading' : ''}`}
                    >
                      {isCreating ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Creating...
                        </>
                      ) : (
                        'Create Student'
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-3">
                        <FileSpreadsheet className="mt-0.5 h-5 w-5 text-blue-700" />
                        <div>
                          <p className="font-semibold text-blue-900">Bulk Upload Preview</p>
                          <p className="text-sm text-blue-800">
                            Upload `Excel` files. Excel parsing works best when the file uses a clear table with headers like First Name, Last Name, Username, Email, Section, and Academic Year.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => studentBulkUploadInputRef.current?.click()}
                          className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          Choose Another File
                        </button>
                        <button
                          type="button"
                          onClick={handleAddBulkUploadRow}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Add Row
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
                        File: {bulkUploadFileName || 'No file selected yet'}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-emerald-700">
                        Valid: {bulkUploadSummary.validRows}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 font-semibold text-rose-700">
                        Needs review: {bulkUploadSummary.invalidRows}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-blue-800">
                      If a section already has 35 students, any extra rows for that section will be flagged below.
                    </p>
                  </div>

                  {isPreviewingBulkUpload ? (
                    <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                      <div className="flex items-center gap-3 text-slate-600">
                        <LoadingSpinner size="sm" />
                        <span className="text-sm font-medium">Reading student file and preparing preview...</span>
                      </div>
                    </div>
                  ) : bulkUploadRowsWithValidation.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                      <p className="text-base font-semibold text-slate-800">No batch student rows yet</p>
                      <p className="mt-2 text-sm text-slate-500">Upload a PDF or Excel file, or add rows manually to start the batch student creation flow.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-[1280px] w-full bg-white text-sm">
                          <thead className="bg-slate-50 text-left text-slate-700">
                            <tr>
                              <th className="px-3 py-3 font-semibold">#</th>
                              <th className="px-3 py-3 font-semibold">First Name</th>
                              <th className="px-3 py-3 font-semibold">Last Name</th>
                              <th className="px-3 py-3 font-semibold">Username</th>
                              <th className="px-3 py-3 font-semibold">Email</th>
                              <th className="px-3 py-3 font-semibold">Section</th>
                              <th className="px-3 py-3 font-semibold">Academic Year</th>
                              <th className="px-3 py-3 font-semibold">Password</th>
                              <th className="px-3 py-3 font-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bulkUploadRowsWithValidation.map((row, index) => (
                              <tr key={row.clientRowId} className={`border-t border-slate-200 align-top ${row.isValid ? 'bg-white' : 'bg-rose-50/50'}`}>
                                <td className="px-3 py-3 font-semibold text-slate-500">{row.rowNumber ?? index + 1}</td>
                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    value={row.firstName}
                                    onChange={(e) => handleBulkUploadRowChange(row.clientRowId, 'firstName', e.target.value)}
                                    className="w-full min-w-[140px] rounded-lg border border-slate-300 px-3 py-2"
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    value={row.lastName}
                                    onChange={(e) => handleBulkUploadRowChange(row.clientRowId, 'lastName', e.target.value)}
                                    className="w-full min-w-[140px] rounded-lg border border-slate-300 px-3 py-2"
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <div className="relative min-w-[230px]">
                                    <input
                                      type="text"
                                      value={row.username}
                                      onChange={(e) => handleBulkUploadRowChange(row.clientRowId, 'username', e.target.value)}
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-28"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">@student.com</span>
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="email"
                                    value={row.email}
                                    onChange={(e) => handleBulkUploadRowChange(row.clientRowId, 'email', e.target.value)}
                                    className="w-full min-w-[220px] rounded-lg border border-slate-300 px-3 py-2"
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    value={row.section}
                                    onChange={(e) => handleBulkUploadRowChange(row.clientRowId, 'section', e.target.value)}
                                    className="w-full min-w-[150px] rounded-lg border border-slate-300 px-3 py-2"
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    value={row.academicYear}
                                    onChange={(e) => handleBulkUploadRowChange(row.clientRowId, 'academicYear', e.target.value)}
                                    className="w-full min-w-[140px] rounded-lg border border-slate-300 px-3 py-2"
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    value={row.password}
                                    onChange={(e) => handleBulkUploadRowChange(row.clientRowId, 'password', e.target.value)}
                                    className="w-full min-w-[220px] rounded-lg border border-slate-300 px-3 py-2"
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBulkUploadRow(row.clientRowId)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-rose-600 transition hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="space-y-3">
                        {bulkUploadRowsWithValidation.filter((row) => row.allErrors.length > 0 || row.warnings.length > 0).map((row, index) => (
                          <div key={`${row.clientRowId}-messages`} className={`rounded-xl border p-4 ${row.allErrors.length > 0 ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
                            <p className={`text-sm font-semibold ${row.allErrors.length > 0 ? 'text-rose-700' : 'text-amber-700'}`}>
                              Row {row.rowNumber ?? index + 1} {row.allErrors.length > 0 ? 'needs review' : 'warning'}
                            </p>
                            {row.allErrors.map((message, messageIndex) => (
                              <p key={`${row.clientRowId}-error-${messageIndex}`} className="mt-1 text-sm text-rose-700">{message}</p>
                            ))}
                            {row.warnings.map((message, messageIndex) => (
                              <p key={`${row.clientRowId}-warning-${messageIndex}`} className="mt-1 text-sm text-amber-700">{message}</p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-500">
                      Confirm batch create only after the preview rows are correct. You can edit, remove, or add rows before saving.
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={closeCreateStudentModal}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmBulkStudentCreate}
                        disabled={isBulkCreating || isPreviewingBulkUpload || bulkUploadRowsWithValidation.length === 0}
                        className={`btn btn-primary ${isBulkCreating ? 'loading' : ''}`}
                      >
                        {isBulkCreating ? (
                          <>
                            <LoadingSpinner size="sm" />
                            Creating Students...
                          </>
                        ) : (
                          `Confirm Batch Create (${bulkUploadRowsWithValidation.length})`
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SuperAdminPage;
