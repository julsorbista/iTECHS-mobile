import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Download,
  FileText,
  Flag,
  Film,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  UserRound,
  Users
} from 'lucide-react';
import { authAPI, userAPI, handleAPIError } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTeacherDashboardData } from '../features/teacher/useTeacherDashboardData';
import { GAME_TYPE_ORDER, getGameTrackLabel, normalizeGameType, sortByGameType } from '../utils/gameTracks';
import {
  buildStudentDashboardInsights,
  getStudentDashboardPerformancePercent,
} from '../utils/studentDashboardInsights';
import logo from '../assets/logo.png';
import { ProgressDistributionChart } from '../components/ProgressDistributionLegend';

const CLASS_SECTION_ALL = 'ALL';
const PDF_REPORT_SECTIONS = Object.freeze([
  { id: 'studentInformation', label: 'Student Information' },
  { id: 'progressSummary', label: 'Progress Summary' },
  { id: 'recentAttempts', label: 'Recent Attempts' },
  { id: 'performanceAnalytics', label: 'Performance Analytics' },
]);

const PERFORMANCE_BAND_META = {
  SUPPORT: {
    label: 'Support Band',
    badgeClass: 'bg-rose-100 text-rose-700 border-rose-300'
  },
  PROGRESS: {
    label: 'Progress Band',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  MASTERY: {
    label: 'On Target Band',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-300'
  }
};

const getStudentDisplayName = (student) => {
  if (!student) {
    return 'No student selected';
  }

  const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
  return fullName || student.username || student.email || 'Unnamed student';
};

const getStudentSectionLabel = (student) => String(student?.section || '').trim();
const clampValue = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const getSectionLabelSet = (labels = []) => new Set(
  labels
    .map((label) => String(label || '').trim())
    .filter(Boolean)
);
const getStudentCompletedActivities = (student) => Number(student?.metrics?.completedActivities ?? student?.metrics?.completedLevels ?? 0);

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

const getLatestStudentActivityMeta = (student) => {
  const candidates = [
    { label: 'Game', value: student?.metrics?.lastGameAttemptAt },
    { label: 'Module', value: student?.metrics?.lastModuleActivityAt },
    { label: 'Assessment', value: student?.metrics?.lastAssessmentAttemptAt },
  ]
    .map((item) => ({
      ...item,
      timestamp: item.value ? new Date(item.value).getTime() : Number.NaN,
    }))
    .filter((item) => Number.isFinite(item.timestamp))
    .sort((left, right) => right.timestamp - left.timestamp);

  return candidates[0] || null;
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

const getPerformanceBandMeta = (student) => PERFORMANCE_BAND_META[getPerformanceBandKey(student)] || PERFORMANCE_BAND_META.SUPPORT;

const getProgressPercentTextClass = (value) => {
  const progressPercent = Number(value || 0);

  if (progressPercent >= 70) {
    return 'text-emerald-600';
  }

  if (progressPercent >= 40) {
    return 'text-amber-500';
  }

  return 'text-rose-600';
};

const formatDateTime = (value) => {
  if (!value) {
    return 'No activity yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
};

const formatFileSize = (value) => {
  const size = Number(value || 0);
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${size} B`;
};

const createDraftId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const LESSON_IMAGE_PLACEMENTS = Object.freeze([
  { value: 'top', label: 'Top' },
  { value: 'right', label: 'Right' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
]);
const normalizeLessonMedia = (media = null) => {
  if (!media || typeof media !== 'object') {
    return null;
  }

  const src = String(media.src || media.url || '').trim();
  if (!src) {
    return null;
  }

  const placement = String(media.placement || 'right').trim().toLowerCase();
  const supportedPlacement = LESSON_IMAGE_PLACEMENTS.some((option) => option.value === placement)
    ? placement
    : 'right';

  return {
    src,
    alt: String(media.alt || ''),
    caption: String(media.caption || ''),
    name: String(media.name || ''),
    placement: supportedPlacement,
    width: clampValue(Number(media.width || 34), 18, 70),
    position: {
      x: clampValue(Number(media?.position?.x ?? media.x ?? 8), 0, 82),
      y: clampValue(Number(media?.position?.y ?? media.y ?? 8), 0, 82),
    },
  };
};
const normalizeLessonVideo = (video = null) => {
  const src = String(video?.src || video?.url || '').trim();
  return src ? {
    src,
    name: String(video?.name || ''),
    caption: String(video?.caption || ''),
    mimeType: String(video?.mimeType || 'video/mp4'),
  } : null;
};
const createSubtopicDraft = (title = '', content = '') => ({
  id: createDraftId(),
  title,
  content,
});
const normalizeLessonSubtopics = (subtopics = []) => (
  (Array.isArray(subtopics) ? subtopics : [])
    .map((subtopic, subtopicIndex) => {
      if (typeof subtopic === 'string') {
        const title = subtopic.trim();
        if (!title) {
          return null;
        }

        return createSubtopicDraft(title, '');
      }

      const resolvedTitle = subtopic?.title ?? subtopic?.label ?? `Subtopic ${subtopicIndex + 1}`;
      const resolvedContent = subtopic?.content ?? subtopic?.body ?? subtopic?.description ?? '';
      const title = String(resolvedTitle);
      const content = String(resolvedContent);

      const hasExistingIdentity = Boolean(subtopic?.id);
      const hasMedia = Boolean(subtopic?.media);

      if (!hasExistingIdentity && !hasMedia && !title.trim() && !content.trim()) {
        return null;
      }

      return {
        id: String(subtopic?.id || `subtopic-${subtopicIndex + 1}`),
        title,
        content,
        media: normalizeLessonMedia(subtopic?.media),
      };
    })
    .filter(Boolean)
);
const createLessonDraft = (title = '', content = '') => ({
  id: createDraftId(),
  title,
  content,
  subtopics: [],
  media: null,
  video: null,
});
const createSectionDraft = (title = 'New Module Section', items = [createLessonDraft('Introduction', '')]) => ({
  id: createDraftId(),
  title,
  items,
});
const normalizeModuleSectionsFromOutline = (outline = []) => {
  if (!Array.isArray(outline) || outline.length === 0) {
    return [createSectionDraft()];
  }

  const sections = outline.map((section, sectionIndex) => ({
    id: String(section?.id || `section-${sectionIndex + 1}`),
    title: String(section?.title || `Section ${sectionIndex + 1}`).trim(),
    items: Array.isArray(section?.items) && section.items.length > 0
      ? section.items.map((item, itemIndex) => ({
        id: String(item?.id || `item-${sectionIndex + 1}-${itemIndex + 1}`),
        title: String(item?.title || item?.label || `Lesson ${itemIndex + 1}`).trim(),
        content: String(item?.content || item?.body || item?.description || '').trim(),
        subtopics: normalizeLessonSubtopics(item?.subtopics),
        media: normalizeLessonMedia(item?.media),
        video: normalizeLessonVideo(item?.video),
      }))
      : [createLessonDraft(`Lesson ${sectionIndex + 1}.1`, '')],
  })).filter((section) => section.title);

  return sections.length > 0 ? sections : [createSectionDraft()];
};
const serializeModuleSectionsForRequest = (sections = []) => (
  sections
    .map((section, sectionIndex) => ({
      id: String(section?.id || `section-${sectionIndex + 1}`),
      title: String(section?.title || '').trim(),
      items: (Array.isArray(section?.items) ? section.items : [])
        .map((item, itemIndex) => ({
          id: String(item?.id || `item-${sectionIndex + 1}-${itemIndex + 1}`),
          title: String(item?.title || '').trim(),
          content: String(item?.content || '').trim(),
          subtopics: normalizeLessonSubtopics(item?.subtopics)
            .map((subtopic) => ({
              id: String(subtopic.id || createDraftId()),
              title: String(subtopic.title || '').trim(),
              content: String(subtopic.content || '').trim(),
              media: normalizeLessonMedia(subtopic.media),
            }))
            .filter((subtopic) => subtopic.title || subtopic.content || subtopic.media),
          media: normalizeLessonMedia(item?.media),
          video: normalizeLessonVideo(item?.video),
          contentType: 'lesson',
          order: itemIndex,
          pageLabel: `${sectionIndex + 1}.${itemIndex + 1}`,
        }))
        .filter((item) => item.title),
    }))
    .filter((section) => section.title && section.items.length > 0)
);
const resolveModulePublishTitle = (materialForm, serializedModuleSections = []) => {
  const explicitTitle = String(materialForm?.title || '').trim();
  if (explicitTitle) {
    return explicitTitle;
  }

  const firstSectionTitle = String(serializedModuleSections[0]?.title || '').trim();
  if (firstSectionTitle) {
    return firstSectionTitle;
  }

  const firstSlideTitle = String(serializedModuleSections[0]?.items?.[0]?.title || '').trim();
  if (firstSlideTitle) {
    return firstSlideTitle;
  }

  return '';
};

const LessonImageEditor = ({
  media,
  title,
  description,
  onImport,
  onChange,
  onRemove,
}) => {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700">
          <Plus className="h-4 w-4" />
          {media?.src ? 'Replace Image' : 'Add Image'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null;
              if (nextFile) {
                onImport(nextFile);
              }
              event.target.value = '';
            }}
          />
        </label>
      </div>

      {media?.src ? (
        <>
          <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50/80">
            <div
              className="mx-auto"
              style={{
                width: `${media.width || 34}%`,
              }}
            >
              <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.18)]">
                <img
                  src={media.src}
                  alt={media.alt || 'Lesson visual'}
                  className="max-h-[240px] w-full object-contain bg-slate-50 select-none"
                />
                {media.caption ? (
                  <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-600">{media.caption}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <input
              className="input-field"
              value={media.alt || ''}
              onChange={(event) => onChange({
                ...media,
                alt: event.target.value,
              })}
              placeholder="Image alt text"
            />
            <input
              className="input-field"
              value={media.caption || ''}
              onChange={(event) => onChange({
                ...media,
                caption: event.target.value,
              })}
              placeholder="Image caption"
            />
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Width</span>
              <input
                type="range"
                min="18"
                max="70"
                value={media.width || 34}
                onChange={(event) => onChange({
                  ...media,
                  width: clampValue(Number(event.target.value || 34), 18, 70),
                })}
                className="h-2 w-full accent-emerald-600"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onRemove}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700"
          >
            <Trash2 className="h-4 w-4" />
            Remove Image
          </button>
        </>
      ) : null}
    </div>
  );
};

const LessonVideoEditor = ({ video, uploading, onImport, onChange, onRemove }) => (
  <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Main Topic Video</p>
        <p className="mt-1 text-sm text-slate-500">Upload a video students can play directly in this lesson.</p>
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
        {uploading ? 'Uploading...' : video?.src ? 'Replace Video' : 'Add Video'}
        <input type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" className="hidden" disabled={uploading}
          onChange={(event) => { const file = event.target.files?.[0]; if (file) onImport(file); event.target.value = ''; }} />
      </label>
    </div>
    {video?.src ? <>
      <video className="mt-4 max-h-[360px] w-full rounded-[20px] bg-black" controls controlsList="nodownload" preload="metadata">
        <source src={video.src} type={video.mimeType || 'video/mp4'} />
      </video>
      <input className="input-field mt-4" value={video.caption || ''} onChange={(event) => onChange({ ...video, caption: event.target.value })} placeholder="Video caption (optional)" />
      <button type="button" onClick={onRemove} className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
        <Trash2 className="h-4 w-4" /> Remove Video
      </button>
    </> : null}
  </div>
);

const canOpenMaterial = (material) => Boolean(material?.hasSourceFile) && ['PDF', 'VIDEO'].includes(String(material?.materialType || '').toUpperCase());

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const getRecentActivityLabel = (value) => {
  if (!value) {
    return 'No activity yet';
  }

  const daysSince = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);

  if (daysSince <= 0) {
    return 'Active today';
  }

  if (daysSince === 1) {
    return 'Active yesterday';
  }

  if (daysSince < 7) {
    return `Active ${daysSince} days ago`;
  }

  return `Inactive for ${daysSince} days`;
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

const TeacherPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('roster');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState(CLASS_SECTION_ALL);
  const [pdfSectionFilters, setPdfSectionFilters] = useState(() => ({
    studentInformation: true,
    progressSummary: true,
    recentAttempts: true,
    performanceAnalytics: true,
  }));
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [teacherCourseCode, setTeacherCourseCode] = useState('');
  const [isLoadingCourseCode, setIsLoadingCourseCode] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDownloadingProgressPdf, setIsDownloadingProgressPdf] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    difficultyPreset: 'STANDARD',
    freeMistakes: 3,
    hintStarCost: 1,
    notes: ''
  });
  const [flagForm, setFlagForm] = useState({
    gameType: 'GAME_ONE',
    levelNumber: 1,
    reason: ''
  });
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
  const [uploadingLessonVideoId, setUploadingLessonVideoId] = useState('');
  const [materialActionId, setMaterialActionId] = useState('');
  const [materialFileInputKey, setMaterialFileInputKey] = useState(0);
  const [editingMaterialId, setEditingMaterialId] = useState('');
  const [materialForm, setMaterialForm] = useState({
    title: '',
    section: '',
    subject: '',
    description: '',
    moduleSections: [createSectionDraft()],
  });
  const [selectedModuleSectionId, setSelectedModuleSectionId] = useState('');
  const [selectedModuleLessonId, setSelectedModuleLessonId] = useState('');
  const [moduleOutlineSearch, setModuleOutlineSearch] = useState('');
  const [materialInspectorTab, setMaterialInspectorTab] = useState('settings');
  const [materialFile, setMaterialFile] = useState(null);
  const [materialWorkspaceView, setMaterialWorkspaceView] = useState('editor');
  const [materialLibrarySearch, setMaterialLibrarySearch] = useState('');
  const [materialLibrarySection, setMaterialLibrarySection] = useState(CLASS_SECTION_ALL);
  const {
    isLoading,
    roster,
    leaderboard,
    flags,
    loadDashboard,
  } = useTeacherDashboardData(selectedStudentId, setSelectedStudentId);

  const selectedStudent = useMemo(
    () => roster.find((item) => item.id === selectedStudentId) || null,
    [roster, selectedStudentId]
  );

  const materialLibrarySections = useMemo(() => [
    CLASS_SECTION_ALL,
    ...Array.from(new Set(materials.map((material) => String(material.section || '').trim()).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right)),
  ], [materials]);

  const filteredMaterialLibrary = useMemo(() => {
    const query = materialLibrarySearch.trim().toLowerCase();
    return materials.filter((material) => {
      const matchesSection = materialLibrarySection === CLASS_SECTION_ALL
        || String(material.section || '').trim() === materialLibrarySection;
      const matchesSearch = !query || [material.title, material.subject, material.section, material.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
      return matchesSection && matchesSearch;
    });
  }, [materialLibrarySearch, materialLibrarySection, materials]);

  useEffect(() => {
    const requestedTab = location.state?.activeTab;
    if (typeof requestedTab === 'string' && requestedTab.trim()) {
      setActiveTab(requestedTab);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const sectionOptions = useMemo(() => {
    const rosterSections = roster
      .map((student) => getStudentSectionLabel(student))
      .filter(Boolean);

    return [
      CLASS_SECTION_ALL,
      ...new Set(
        rosterSections
          .filter(Boolean)
          .sort((left, right) => left.localeCompare(right))
      )
    ];
  }, [roster]);

  const filteredRoster = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return roster.filter((student) => {
      const studentSection = getStudentSectionLabel(student);
      const matchesSection = selectedSection === CLASS_SECTION_ALL || studentSection === selectedSection;

      if (!matchesSection) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        student.firstName,
        student.lastName,
        student.username,
        student.email,
        studentSection,
        getStudentDisplayName(student)
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [roster, searchTerm, selectedSection]);

  const filteredLeaderboard = useMemo(() => {
    const visibleStudentIds = new Set(filteredRoster.map((student) => student.id));
    return leaderboard.filter((entry) => visibleStudentIds.has(entry.studentId));
  }, [leaderboard, filteredRoster]);

  const sidebarStudents = useMemo(() => (
    [...filteredRoster].sort((left, right) => {
      const leftLastName = String(left.lastName || '').trim();
      const rightLastName = String(right.lastName || '').trim();
      const lastNameComparison = leftLastName.localeCompare(rightLastName, undefined, { sensitivity: 'base' });

      if (lastNameComparison !== 0) {
        return lastNameComparison;
      }

      const leftFirstName = String(left.firstName || '').trim();
      const rightFirstName = String(right.firstName || '').trim();
      const firstNameComparison = leftFirstName.localeCompare(rightFirstName, undefined, { sensitivity: 'base' });

      if (firstNameComparison !== 0) {
        return firstNameComparison;
      }

      return getStudentDisplayName(left).localeCompare(getStudentDisplayName(right), undefined, { sensitivity: 'base' });
    })
  ), [filteredRoster]);

  const rosterSummary = useMemo(() => {
    const totalStudents = filteredRoster.length;
    const totalProgress = filteredRoster.reduce((sum, student) => sum + Number(student.metrics?.progressPercent || 0), 0);
    const needsSupportCount = filteredRoster.filter((student) => getPerformanceBandKey(student) === 'SUPPORT').length;
    const masteryCount = filteredRoster.filter((student) => getPerformanceBandKey(student) === 'MASTERY').length;
    const activeThisWeekCount = filteredRoster.filter((student) => {
      const latestActivity = getLatestStudentActivityMeta(student);
      if (!latestActivity?.value) {
        return false;
      }

      const daysSince = Math.floor((Date.now() - new Date(latestActivity.value).getTime()) / 86400000);
      return daysSince <= 7;
    }).length;
    const sectionCount = new Set(filteredRoster.map((student) => getStudentSectionLabel(student))).size;

    return {
      totalStudents,
      averageProgress: totalStudents > 0 ? Math.round(totalProgress / totalStudents) : 0,
      needsSupportCount,
      masteryCount,
      activeThisWeekCount,
      sectionCount
    };
  }, [filteredRoster]);

  const overviewAnalytics = useMemo(() => {
    const bandCounts = { SUPPORT: 0, PROGRESS: 0, MASTERY: 0 };
    const progressBuckets = [
      { label: '0–20%', count: 0 },
      { label: '21–40%', count: 0 },
      { label: '41–60%', count: 0 },
      { label: '61–80%', count: 0 },
      { label: '81–100%', count: 0 },
    ];
    const activityCounts = { today: 0, week: 0, month: 0, inactive: 0 };

    filteredRoster.forEach((student) => {
      bandCounts[getPerformanceBandKey(student)]++;

      const progress = Number(student.metrics?.progressPercent || 0);
      if (progress <= 20) progressBuckets[0].count++;
      else if (progress <= 40) progressBuckets[1].count++;
      else if (progress <= 60) progressBuckets[2].count++;
      else if (progress <= 80) progressBuckets[3].count++;
      else progressBuckets[4].count++;

      const latestActivity = getLatestStudentActivityMeta(student);
      if (!latestActivity?.value) {
        activityCounts.inactive++;
      } else {
        const daysSince = Math.floor((Date.now() - new Date(latestActivity.value).getTime()) / 86400000);
        if (daysSince <= 0) activityCounts.today++;
        else if (daysSince <= 7) activityCounts.week++;
        else if (daysSince <= 30) activityCounts.month++;
        else activityCounts.inactive++;
      }
    });

    const dashboardInsights = buildStudentDashboardInsights(filteredRoster, {
      topLimit: 5,
      attentionLimit: 5,
    });

    const persistentSections = Array.from(
      getSectionLabelSet(
        sectionOptions.filter((section) => section !== CLASS_SECTION_ALL)
      )
    );
    const sectionMap = Object.fromEntries(
      persistentSections.map((section) => [section, { count: 0, totalProgress: 0 }])
    );
    filteredRoster.forEach((student) => {
      const section = getStudentSectionLabel(student);
      if (!sectionMap[section]) sectionMap[section] = { count: 0, totalProgress: 0 };
      sectionMap[section].count++;
      sectionMap[section].totalProgress += Number(student.metrics?.progressPercent || 0);
    });
    const sectionData = Object.entries(sectionMap)
      .map(([section, data]) => ({
        section,
        count: data.count,
        avgProgress: data.count > 0 ? Math.round(data.totalProgress / data.count) : 0,
      }))
      .sort((a, b) => {
        if (b.avgProgress !== a.avgProgress) {
          return b.avgProgress - a.avgProgress;
        }

        return a.section.localeCompare(b.section);
      });

    return {
      bandCounts,
      progressBuckets,
      activityCounts,
      topPerformers: dashboardInsights.topStudents,
      needsAttention: dashboardInsights.needsAttention,
      sectionData,
    };
  }, [filteredRoster, sectionOptions]);

  const performanceOverview = useMemo(() => {
    if (!filteredRoster.length) {
      return {
        strongestSignal: 'No students in the current filter yet.',
        weakestSignal: 'Add students to start tracking performance.',
      };
    }

    const sortedByStars = [...filteredRoster].sort(compareStudentsByPerformance);
    const sortedByCompletion = [...filteredRoster].sort(
      (left, right) => getStudentCompletedActivities(right) - getStudentCompletedActivities(left)
    );
    const sortedByNeeds = [...filteredRoster].sort((left, right) => {
      return compareStudentsByPerformance(right, left);
    });

    const topStarStudent = sortedByStars[0];
    const topCompletionStudent = sortedByCompletion[0];
    const supportStudent = sortedByNeeds[0];

    return {
      strongestSignal: `${getStudentDisplayName(topStarStudent)} leads star collection with ${topStarStudent?.metrics?.totalStars || 0} stars.`,
      strongestCompletion: `${getStudentDisplayName(topCompletionStudent)} has completed ${getStudentCompletedActivities(topCompletionStudent)} learning activities.`,
      weakestSignal: `${getStudentDisplayName(supportStudent)} may need support with ${getStudentCompletedActivities(supportStudent)} completed activities and ${supportStudent?.metrics?.totalStars || 0} stars.`,
    };
  }, [filteredRoster]);

  const totalModuleSections = materialForm.moduleSections.length;
  const totalModuleLessons = useMemo(
    () => materialForm.moduleSections.reduce((count, section) => count + (Array.isArray(section.items) ? section.items.length : 0), 0),
    [materialForm.moduleSections]
  );
  const activeEditingMaterial = useMemo(
    () => materials.find((material) => material.id === editingMaterialId) || null,
    [materials, editingMaterialId]
  );

  const activeModuleSection = useMemo(
    () => materialForm.moduleSections.find((section) => section.id === selectedModuleSectionId) || materialForm.moduleSections[0] || null,
    [materialForm.moduleSections, selectedModuleSectionId]
  );

  const activeModuleLesson = useMemo(() => {
    const availableLessons = Array.isArray(activeModuleSection?.items) ? activeModuleSection.items : [];
    return availableLessons.find((item) => item.id === selectedModuleLessonId) || availableLessons[0] || null;
  }, [activeModuleSection, selectedModuleLessonId]);
  const currentSectionSlides = useMemo(
    () => (Array.isArray(activeModuleSection?.items) ? activeModuleSection.items : []),
    [activeModuleSection]
  );
  const activeLessonSubtopics = useMemo(
    () => normalizeLessonSubtopics(activeModuleLesson?.subtopics),
    [activeModuleLesson?.subtopics]
  );
  const currentSlideIndex = useMemo(
    () => currentSectionSlides.findIndex((item) => item.id === activeModuleLesson?.id),
    [currentSectionSlides, activeModuleLesson]
  );

  const filteredModuleSections = useMemo(() => {
    const query = moduleOutlineSearch.trim().toLowerCase();
    if (!query) {
      return materialForm.moduleSections;
    }

    return materialForm.moduleSections
      .map((section) => ({
        ...section,
        items: (Array.isArray(section.items) ? section.items : []).filter((item) => {
          const sectionTitle = String(section?.title || '').toLowerCase();
          const itemTitle = String(item?.title || '').toLowerCase();
          const itemContent = String(item?.content || '').toLowerCase();
          const subtopicText = normalizeLessonSubtopics(item?.subtopics)
            .flatMap((subtopic) => [subtopic.title, subtopic.content])
            .join(' ')
            .toLowerCase();
          return sectionTitle.includes(query) || itemTitle.includes(query) || itemContent.includes(query) || subtopicText.includes(query);
        }),
      }))
      .filter((section) => String(section?.title || '').toLowerCase().includes(query) || section.items.length > 0);
  }, [materialForm.moduleSections, moduleOutlineSearch]);

  useEffect(() => {
    const firstSection = materialForm.moduleSections[0] || null;
    if (!firstSection) {
      if (selectedModuleSectionId) {
        setSelectedModuleSectionId('');
      }
      if (selectedModuleLessonId) {
        setSelectedModuleLessonId('');
      }
      return;
    }

    const resolvedSection = materialForm.moduleSections.find((section) => section.id === selectedModuleSectionId) || firstSection;
    const firstLesson = Array.isArray(resolvedSection.items) ? resolvedSection.items[0] || null : null;
    const resolvedLesson = (Array.isArray(resolvedSection.items) ? resolvedSection.items : []).find((item) => item.id === selectedModuleLessonId) || firstLesson;

    if (resolvedSection.id !== selectedModuleSectionId) {
      setSelectedModuleSectionId(resolvedSection.id);
    }

    if ((resolvedLesson?.id || '') !== selectedModuleLessonId) {
      setSelectedModuleLessonId(resolvedLesson?.id || '');
    }
  }, [materialForm.moduleSections, selectedModuleLessonId, selectedModuleSectionId]);

  const studentInsights = useMemo(() => {
    if (!selectedStudent || !studentDetail) {
      return null;
    }

    const completedLevels = studentDetail.levelProgress.filter((level) => level.status === 'COMPLETED');
    const totalLevels = studentDetail.summary?.totalLevels || studentDetail.levelProgress.length || 1;
    const recentAttempts = studentDetail.timeline.slice(0, 5);
    const recentWins = recentAttempts.filter((attempt) => attempt.completed).length;
    const recentWinRate = recentAttempts.length > 0
      ? Math.round((recentWins / recentAttempts.length) * 100)
      : 0;

    const rankedLevels = [...studentDetail.levelProgress]
      .filter((level) => Number(level.bestScore || 0) > 0)
      .sort((a, b) => Number(b.bestScore || 0) - Number(a.bestScore || 0));

    const strongestLevel = rankedLevels[0] || null;
    const focusLevel = studentDetail.levelProgress.find((level) => level.status !== 'COMPLETED')
      || studentDetail.levelProgress[studentDetail.levelProgress.length - 1]
      || null;

    const leaderboardEntry = leaderboard.find((entry) => entry.studentId === selectedStudent.id) || null;
    const completionRate = Math.round((Number(studentDetail.summary?.totalLevelsCompleted || 0) / totalLevels) * 100);
    const averageStars = completedLevels.length > 0
      ? (Number(studentDetail.summary?.totalStars || 0) / completedLevels.length).toFixed(1)
      : '0.0';

    let recommendedAction = 'Maintain the current pace and keep checking recent attempts.';
    if (getPerformanceBandKey(selectedStudent) === 'SUPPORT') {
      recommendedAction = 'Review early levels, add more guidance notes, and consider a lighter preset.';
    } else if (getPerformanceBandKey(selectedStudent) === 'MASTERY') {
      recommendedAction = 'Keep momentum high with tougher pacing and leaderboard goals.';
    }

    const averageStarsValue = Number(averageStars);
    const strengths = [];
    const weaknesses = [];

    if (completionRate >= 70) {
      strengths.push(`Strong completion pace with ${completionRate}% of assigned levels cleared.`);
    } else if (completionRate <= 40) {
      weaknesses.push(`Only ${completionRate}% of assigned levels are completed so far.`);
    }

    if (averageStarsValue >= 2.4) {
      strengths.push(`High star efficiency with an average of ${averageStars} stars on completed levels.`);
    } else if (averageStarsValue > 0 && averageStarsValue < 1.8) {
      weaknesses.push(`Average star gain is ${averageStars}, so replay support may help improve results.`);
    }

    if ((leaderboardEntry?.totalStars || 0) >= 15) {
      strengths.push(`Collected ${leaderboardEntry.totalStars} total stars across completed work.`);
    }

    if ((leaderboardEntry?.completedActivities || 0) <= 2) {
      weaknesses.push('Very few game and assessment activities have been fully cleared yet.');
    }

    if (recentWinRate >= 60) {
      strengths.push(`Recent attempt quality is solid with a ${recentWinRate}% win rate.`);
    } else if (recentAttempts.length > 0 && recentWinRate < 50) {
      weaknesses.push(`Recent attempts show a ${recentWinRate}% win rate and may need reinforcement.`);
    }

    if (!strengths.length) {
      strengths.push('The student is building momentum and has room to strengthen star collection.');
    }

    if (!weaknesses.length) {
      weaknesses.push('No immediate weakness stands out from stars earned and completed levels.');
    }

    return {
      completionRate,
      averageStars,
      recentAttempts,
      recentWinRate,
      strongestLevel,
      focusLevel,
      leaderboardEntry,
      activityLabel: getRecentActivityLabel(selectedStudent.metrics?.lastAttemptAt),
      recommendedAction,
      classSection: getStudentSectionLabel(selectedStudent),
      performanceBand: getPerformanceBandMeta(selectedStudent),
      strengths,
      weaknesses
    };
  }, [selectedStudent, studentDetail, leaderboard]);

  const loadStudentDetail = async (studentId) => {
    if (!studentId) {
      setStudentDetail(null);
      return;
    }

    try {
      setDetailLoading(true);
      setStudentDetail(null);
      const response = await userAPI.getStudentProgress(studentId);
      if (response.status === 'success') {
        setStudentDetail(response.data);
        const policy = response.data.policy || {};
        setPolicyForm({
          difficultyPreset: policy.difficultyPreset || 'STANDARD',
          freeMistakes: policy.freeMistakes ?? 3,
          hintStarCost: policy.hintStarCost ?? 1,
          notes: policy.notes || ''
        });
      }
    } catch (error) {
      const errorInfo = handleAPIError(error);
      toast.error(errorInfo.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const onDownloadStudentProgressPdf = () => {
    if (!selectedStudent || !studentDetail || !studentInsights) {
      toast.error('Select a student with loaded progress first.');
      return;
    }

    const enabledSections = Object.entries(pdfSectionFilters).filter(([, isEnabled]) => isEnabled);
    if (enabledSections.length === 0) {
      toast.error('Select at least one report section to export.');
      return;
    }

    try {
      setIsDownloadingProgressPdf(true);

      const reportWindow = window.open('', '_blank', 'width=960,height=1080');
      if (!reportWindow) {
        toast.error('Please allow pop-ups to download the PDF report.');
        return;
      }

      const reportTitle = `${getStudentDisplayName(selectedStudent)} - Progress Report`;
      const completedLevels = Number(studentDetail.summary?.totalLevelsCompleted || 0);
      const totalLevels = Number(studentDetail.summary?.totalLevels || studentDetail.levelProgress.length || 0);
      const totalStars = Number(studentDetail.summary?.totalStars || 0);
      const totalAttempts = Number(studentDetail.summary?.totalAttempts || studentDetail.timeline.length || 0);
      const recentAttemptsMarkup = studentInsights.recentAttempts.length > 0
        ? studentInsights.recentAttempts.map((attempt) => `
            <tr>
              <td>${escapeHtml(getGameTrackLabel(normalizeGameType(attempt.gameType)))}</td>
              <td>Level ${escapeHtml(attempt.levelNumber)}</td>
              <td>${escapeHtml(attempt.completed ? 'Completed' : 'In progress')}</td>
              <td>${escapeHtml(attempt.finalScore || 0)}</td>
              <td>${escapeHtml(attempt.starsEarned || 0)}</td>
              <td>${escapeHtml(formatDateTime(attempt.completedAt || attempt.updatedAt || attempt.createdAt))}</td>
            </tr>
          `).join('')
        : `
            <tr>
              <td colspan="6" class="empty-cell">No attempts recorded.</td>
            </tr>
          `;
      const strengthsMarkup = (studentDetail.performanceInsight?.strengths?.length
        ? studentDetail.performanceInsight.strengths
        : studentInsights.strengths
      ).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
      const weaknessesMarkup = (studentDetail.performanceInsight?.weaknesses?.length
        ? studentDetail.performanceInsight.weaknesses
        : studentInsights.weaknesses
      ).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
      const recommendedAction = studentDetail.performanceInsight?.recommendedAction || studentInsights.recommendedAction;
      const selectedSectionMarkup = [
        pdfSectionFilters.studentInformation ? `
      <section class="section">
        <h2>Student Information</h2>
        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-label">Student Name</div>
            <div class="meta-value">${escapeHtml(getStudentDisplayName(selectedStudent))}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Section</div>
            <div class="meta-value">${escapeHtml(studentInsights.classSection || 'Not assigned')}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Email / Username</div>
            <div class="meta-value">${escapeHtml(selectedStudent.email || selectedStudent.username || 'N/A')}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Last Attempt</div>
            <div class="meta-value">${escapeHtml(formatDateTime(selectedStudent.metrics?.lastAttemptAt))}</div>
          </div>
        </div>
      </section>` : '',
        pdfSectionFilters.progressSummary ? `
      <section class="section">
        <h2>Progress Summary</h2>
        <div class="summary-grid">
          <div class="card">
            <div class="card-label">Completion</div>
            <div class="card-value">${escapeHtml(studentInsights.completionRate)}%</div>
          </div>
          <div class="card">
            <div class="card-label">Completed Levels</div>
            <div class="card-value">${escapeHtml(completedLevels)}/${escapeHtml(totalLevels)}</div>
          </div>
          <div class="card">
            <div class="card-label">Total Stars</div>
            <div class="card-value">${escapeHtml(totalStars)}</div>
          </div>
          <div class="card">
            <div class="card-label">Win Rate</div>
            <div class="card-value">${escapeHtml(studentInsights.recentWinRate)}%</div>
          </div>
        </div>
        <div class="summary-grid" style="margin-top: 12px;">
          <div class="card">
            <div class="card-label">Average Stars</div>
            <div class="card-value">${escapeHtml(studentInsights.averageStars)}</div>
          </div>
          <div class="card">
            <div class="card-label">Leaderboard Rank</div>
            <div class="card-value">${escapeHtml(studentInsights.leaderboardEntry ? `#${studentInsights.leaderboardEntry.rank}` : '--')}</div>
          </div>
          <div class="card">
            <div class="card-label">Total Attempts</div>
            <div class="card-value">${escapeHtml(totalAttempts)}</div>
          </div>
          <div class="card">
            <div class="card-label">Activity</div>
            <div class="card-value" style="font-size: 18px;">${escapeHtml(studentInsights.activityLabel)}</div>
          </div>
        </div>
      </section>` : '',
        pdfSectionFilters.recentAttempts ? `
      <section class="section">
        <h2>Recent Attempts</h2>
        <table>
          <thead>
            <tr>
              <th>Game</th>
              <th>Level</th>
              <th>Status</th>
              <th>Score</th>
              <th>Stars</th>
              <th>Attempt Date</th>
            </tr>
          </thead>
          <tbody>${recentAttemptsMarkup}</tbody>
        </table>
      </section>` : '',
        pdfSectionFilters.performanceAnalytics ? `
      <section class="section">
        <h2>Performance Analytics</h2>
        <div class="insight-grid">
          <div class="card">
            <div class="card-label">Strengths</div>
            <ul>${strengthsMarkup}</ul>
          </div>
          <div class="card">
            <div class="card-label">Weaknesses</div>
            <ul>${weaknessesMarkup}</ul>
          </div>
        </div>
        <div class="recommendation" style="margin-top: 14px;">
          <strong>Recommended action:</strong> ${escapeHtml(recommendedAction)}
        </div>
      </section>` : '',
      ].join('');

      reportWindow.document.open();
      reportWindow.document.write(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(reportTitle)}</title>
    <style>
      :root {
        color-scheme: light;
        --brand: #16876d;
        --ink: #0f172a;
        --muted: #475569;
        --line: #d9e2ec;
        --panel: #f8fafc;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        color: var(--ink);
        background: #ffffff;
      }
      .page {
        padding: 32px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        align-items: flex-start;
        border-bottom: 2px solid var(--line);
        padding-bottom: 18px;
        margin-bottom: 24px;
      }
      h1, h2, h3, p { margin: 0; }
      h1 {
        font-size: 28px;
        margin-bottom: 6px;
      }
      .subtitle {
        color: var(--muted);
        font-size: 14px;
      }
      .pill {
        display: inline-block;
        border: 1px solid #bcd7cf;
        background: #edf9f5;
        color: var(--brand);
        border-radius: 999px;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 700;
        margin-top: 8px;
      }
      .section {
        margin-top: 22px;
      }
      .section h2 {
        font-size: 16px;
        margin-bottom: 12px;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      .card {
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 14px;
        padding: 14px;
      }
      .card-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--muted);
        margin-bottom: 6px;
      }
      .card-value {
        font-size: 24px;
        font-weight: 800;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px 18px;
      }
      .meta-item {
        border-bottom: 1px solid var(--line);
        padding-bottom: 8px;
      }
      .meta-label {
        font-size: 12px;
        color: var(--muted);
        margin-bottom: 4px;
      }
      .meta-value {
        font-size: 15px;
        font-weight: 700;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid var(--line);
        border-radius: 14px;
        overflow: hidden;
      }
      th, td {
        border-bottom: 1px solid var(--line);
        padding: 10px 12px;
        text-align: left;
        font-size: 13px;
        vertical-align: top;
      }
      th {
        background: #f1f5f9;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      tr:last-child td {
        border-bottom: none;
      }
      .empty-cell {
        text-align: center;
        color: var(--muted);
        font-style: italic;
      }
      .insight-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }
      ul {
        margin: 0;
        padding-left: 18px;
      }
      li {
        margin-bottom: 8px;
      }
      .recommendation {
        border-left: 4px solid var(--brand);
        background: #effaf6;
        padding: 14px 16px;
        border-radius: 12px;
        font-size: 14px;
      }
      @media print {
        .page {
          padding: 18px;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="header">
        <div>
          <h1>${escapeHtml(reportTitle)}</h1>
          <p class="subtitle">Generated on ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
          <div class="pill">${escapeHtml(studentInsights.performanceBand.label)}</div>
        </div>
        <div>
          <p class="subtitle">Teacher Dashboard Report</p>
        </div>
      </section>
${selectedSectionMarkup}
    </main>
  </body>
</html>`);
      reportWindow.document.close();

      reportWindow.onload = () => {
        reportWindow.focus();
        reportWindow.print();
      };
    } catch (error) {
      console.error(error);
      toast.error('Unable to generate the PDF report.');
    } finally {
      setIsDownloadingProgressPdf(false);
    }
  };

  useEffect(() => {
    setProfileForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || ''
    });
  }, [user]);

  useEffect(() => {
    if (filteredRoster.length === 0) {
      setSelectedStudentId(null);
      setStudentDetail(null);
      return;
    }

    if (!filteredRoster.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(filteredRoster[0].id);
    }
  }, [filteredRoster, selectedStudentId]);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentDetail(selectedStudentId);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    const availableSections = sectionOptions.filter((section) => section !== CLASS_SECTION_ALL);
    if (availableSections.length === 0) {
      setMaterialForm((current) => (
        current.section === ''
          ? current
          : { ...current, section: '' }
      ));
      return;
    }

    if (!availableSections.includes(materialForm.section)) {
      setMaterialForm((current) => ({ ...current, section: availableSections[0] }));
    }
  }, [materialForm.section, sectionOptions]);

  useEffect(() => {
    let isCancelled = false;

    const loadTeacherCourseCode = async () => {
      if (user?.role !== 'TEACHER') {
        setTeacherCourseCode('');
        return;
      }

      try {
        setIsLoadingCourseCode(true);
        const response = await userAPI.getMyCourseCode();
        if (!isCancelled && response.status === 'success') {
          setTeacherCourseCode(response.data.courseCode || '');
        }
      } catch (error) {
        if (!isCancelled) {
          const errorInfo = handleAPIError(error);
          toast.error(errorInfo.message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingCourseCode(false);
        }
      }
    };

    loadTeacherCourseCode();

    return () => {
      isCancelled = true;
    };
  }, [user?.role]);

  useEffect(() => {
    let isCancelled = false;

    const loadLearningMaterials = async () => {
      try {
        setMaterialsLoading(true);
        const response = await userAPI.getMyLearningMaterials();
        if (!isCancelled && response.status === 'success') {
          setMaterials(Array.isArray(response.data?.materials) ? response.data.materials : []);
        }
      } catch (error) {
        if (!isCancelled) {
          toast.error(handleAPIError(error).message);
        }
      } finally {
        if (!isCancelled) {
          setMaterialsLoading(false);
        }
      }
    };

    loadLearningMaterials();

    return () => {
      isCancelled = true;
    };
  }, []);

  const onSaveProfile = async () => {
    const trimmedEmail = profileForm.email.trim();
    if (!trimmedEmail) {
      toast.error('Email is required');
      return;
    }

    try {
      setIsSavingProfile(true);
      const response = await authAPI.updateProfile({
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        email: trimmedEmail
      });

      if (response.status === 'success') {
        updateUser(response.data);
        setProfileForm({
          firstName: response.data.firstName || '',
          lastName: response.data.lastName || '',
          email: response.data.email || ''
        });
        toast.success('Teacher profile updated');
      }
    } catch (error) {
      const errorInfo = handleAPIError(error);
      toast.error(errorInfo.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Complete all password fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation must match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    try {
      setIsChangingPassword(true);
      const response = await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword
      });

      if (response.status === 'success') {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success('Password changed successfully');
      }
    } catch (error) {
      const errorInfo = handleAPIError(error);
      toast.error(errorInfo.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const onSavePolicy = async () => {
    if (!selectedStudentId) {
      return;
    }

    try {
      const payload = {
        ...policyForm,
        freeMistakes: Number(policyForm.freeMistakes),
        hintStarCost: Number(policyForm.hintStarCost)
      };

      const response = await userAPI.updateStudentPolicy(selectedStudentId, payload);
      if (response.status === 'success') {
        toast.success('Student policy updated');
        await loadStudentDetail(selectedStudentId);
      }
    } catch (error) {
      const errorInfo = handleAPIError(error);
      toast.error(errorInfo.message);
    }
  };

  const onRequestRegeneration = async () => {
    if (!selectedStudentId) {
      return;
    }

    if (!flagForm.reason || flagForm.reason.trim().length < 10) {
      toast.error('Please provide at least 10 characters for the reason');
      return;
    }

    try {
      const payload = {
        gameType: flagForm.gameType,
        levelNumber: Number(flagForm.levelNumber),
        reason: flagForm.reason.trim()
      };

      const response = await userAPI.requestContentRegeneration(selectedStudentId, payload);
      if (response.status === 'success') {
        toast.success('Regeneration request submitted');
        setFlagForm({ gameType: 'GAME_ONE', levelNumber: 1, reason: '' });
        await loadDashboard();
      }
    } catch (error) {
      const errorInfo = handleAPIError(error);
      toast.error(errorInfo.message);
    }
  };

  const onGeneratePerformanceInsight = async () => {
    if (!selectedStudentId || isGeneratingInsight) {
      return;
    }

    try {
      setIsGeneratingInsight(true);
      const response = await userAPI.generateStudentPerformanceInsight(selectedStudentId);
      if (response.status === 'success') {
        const performanceInsight = response.data?.performanceInsight || null;
        setStudentDetail((current) => current ? { ...current, performanceInsight } : current);
        toast.success('AI performance analytics generated');
      }
    } catch (error) {
      const errorInfo = handleAPIError(error);
      toast.error(errorInfo.message);
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const refreshLearningMaterials = async () => {
    const response = await userAPI.getMyLearningMaterials();
    if (response.status === 'success') {
      setMaterials(Array.isArray(response.data?.materials) ? response.data.materials : []);
    }
  };

  const openAssessmentEditor = (material) => {
    if (!material?.id) {
      toast.error('Publish the module first before editing its quiz.');
      return;
    }

    navigate(`/teacher/assessments/edit/${material.id}`, {
      state: {
        material,
      },
    });
  };

  const loadPublishedMaterialForEditing = (material) => {
    if (!material?.id) {
      toast.error('This module cannot be opened for editing yet.');
      return;
    }

    const nextSections = normalizeModuleSectionsFromOutline(material.outline || []);
    const firstSection = nextSections[0] || createSectionDraft();
    const firstLesson = firstSection.items?.[0] || createLessonDraft('Introduction', '');

    setEditingMaterialId(material.id);
    setMaterialForm({
      title: String(material.title || ''),
      section: String(material.section || ''),
      subject: String(material.subject || ''),
      description: String(material.description || ''),
      moduleSections: nextSections,
    });
    setSelectedModuleSectionId(firstSection.id);
    setSelectedModuleLessonId(firstLesson.id);
    setMaterialFile(null);
    setMaterialFileInputKey((current) => current + 1);
    setMaterialInspectorTab('settings');
    toast.success(`Editing "${material.title || 'module'}".`);
  };

  const resetMaterialEditor = () => {
    const nextSection = createSectionDraft();
    setEditingMaterialId('');
    setMaterialForm((current) => ({
      title: '',
      section: current.section,
      subject: '',
      description: '',
      moduleSections: [nextSection],
    }));
    setSelectedModuleSectionId(nextSection.id);
    setSelectedModuleLessonId(nextSection.items[0]?.id || '');
    setMaterialFile(null);
    setMaterialFileInputKey((current) => current + 1);
  };

  const updateModuleSection = (sectionId, patch) => {
    setMaterialForm((current) => ({
      ...current,
      moduleSections: current.moduleSections.map((section) => (
        section.id === sectionId ? { ...section, ...patch } : section
      )),
    }));
  };

  const updateModuleLesson = (sectionId, lessonId, patch) => {
    setMaterialForm((current) => ({
      ...current,
      moduleSections: current.moduleSections.map((section) => (
        section.id !== sectionId
          ? section
          : {
            ...section,
            items: section.items.map((item) => (item.id === lessonId ? { ...item, ...patch } : item)),
          }
      )),
    }));
  };
  const updateModuleLessonSubtopic = (sectionId, lessonId, subtopicId, patch) => {
    setMaterialForm((current) => ({
      ...current,
      moduleSections: current.moduleSections.map((section) => (
        section.id !== sectionId
          ? section
          : {
            ...section,
            items: section.items.map((item) => (
              item.id !== lessonId
                ? item
                : {
                  ...item,
                  subtopics: normalizeLessonSubtopics(item.subtopics).map((subtopic) => (
                    subtopic.id === subtopicId ? { ...subtopic, ...patch } : subtopic
                  )),
                }
            )),
          }
      )),
    }));
  };
  const addModuleLessonSubtopic = (sectionId, lessonId) => {
    setMaterialForm((current) => ({
      ...current,
      moduleSections: current.moduleSections.map((section) => (
        section.id !== sectionId
          ? section
          : {
            ...section,
            items: section.items.map((item) => (
              item.id !== lessonId
                ? item
                : {
                  ...item,
                  subtopics: [
                    ...normalizeLessonSubtopics(item.subtopics),
                    createSubtopicDraft(`Subtopic ${(normalizeLessonSubtopics(item.subtopics).length || 0) + 1}`, ''),
                  ],
                }
            )),
          }
      )),
    }));
  };
  const removeModuleLessonSubtopic = (sectionId, lessonId, subtopicId) => {
    setMaterialForm((current) => ({
      ...current,
      moduleSections: current.moduleSections.map((section) => (
        section.id !== sectionId
          ? section
          : {
            ...section,
            items: section.items.map((item) => (
              item.id !== lessonId
                ? item
                : {
                  ...item,
                  subtopics: normalizeLessonSubtopics(item.subtopics).filter((subtopic) => subtopic.id !== subtopicId),
                }
            )),
          }
      )),
    }));
  };
  const onModuleLessonImageSelected = async (sectionId, lessonId, file) => {
    if (!file) {
      return;
    }

    if (!String(file.type || '').startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }

    const fileToDataUrl = (imageFile) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Unable to read the selected image.'));
      reader.readAsDataURL(imageFile);
    });

    try {
      const dataUrl = await fileToDataUrl(file);
      updateModuleLesson(sectionId, lessonId, {
        media: {
          src: dataUrl,
          alt: file.name.replace(/\.[^.]+$/, ''),
          caption: '',
          name: file.name,
          placement: activeModuleLesson?.media?.placement || 'right',
        },
      });
    } catch (error) {
      toast.error(error.message || 'Unable to import that image.');
    }
  };
  const onModuleLessonVideoSelected = async (sectionId, lessonId, file) => {
    if (!file) return;
    if (!String(file.type || '').startsWith('video/')) {
      toast.error('Please choose a supported video file.');
      return;
    }

    setUploadingLessonVideoId(lessonId);
    try {
      const response = await userAPI.uploadLearningMaterialAsset(file);
      const asset = response?.data || response;
      updateModuleLesson(sectionId, lessonId, {
        video: normalizeLessonVideo({ ...asset, caption: '' }),
      });
      toast.success('Video added to this lesson.');
    } catch (error) {
      toast.error(handleAPIError(error));
    } finally {
      setUploadingLessonVideoId('');
    }
  };
  const onModuleLessonSubtopicImageSelected = async (sectionId, lessonId, subtopicId, file) => {
    if (!file) {
      return;
    }

    if (!String(file.type || '').startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }

    const fileToDataUrl = (imageFile) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Unable to read the selected image.'));
      reader.readAsDataURL(imageFile);
    });

    try {
      const dataUrl = await fileToDataUrl(file);
      updateModuleLessonSubtopic(sectionId, lessonId, subtopicId, {
        media: {
          src: dataUrl,
          alt: file.name.replace(/\.[^.]+$/, ''),
          caption: '',
          name: file.name,
          placement: 'right',
          width: 34,
          position: { x: 8, y: 8 },
        },
      });
    } catch (error) {
      toast.error(error.message || 'Unable to import that image.');
    }
  };

  const addModuleSection = () => {
    const nextSection = createSectionDraft(`Module ${materialForm.moduleSections.length + 1}`, [createLessonDraft('New Lesson', '')]);
    setMaterialForm((current) => ({
      ...current,
      moduleSections: [
        ...current.moduleSections,
        nextSection,
      ],
    }));
    setSelectedModuleSectionId(nextSection.id);
    setSelectedModuleLessonId(nextSection.items[0]?.id || '');
  };

  const removeModuleSection = (sectionId) => {
    setMaterialForm((current) => {
      const nextSections = current.moduleSections.filter((section) => section.id !== sectionId);
      return {
        ...current,
        moduleSections: nextSections.length > 0 ? nextSections : [createSectionDraft()],
      };
    });
  };

  const addModuleLesson = (sectionId) => {
    const nextLesson = createLessonDraft(
      `Lesson ${(materialForm.moduleSections.find((section) => section.id === sectionId)?.items?.length || 0) + 1}`,
      ''
    );
    setMaterialForm((current) => ({
      ...current,
      moduleSections: current.moduleSections.map((section) => (
        section.id !== sectionId
          ? section
          : {
            ...section,
            items: [
              ...section.items,
              nextLesson,
            ],
          }
      )),
    }));
    setSelectedModuleSectionId(sectionId);
    setSelectedModuleLessonId(nextLesson.id);
  };

  const removeModuleLesson = (sectionId, lessonId) => {
    setMaterialForm((current) => ({
      ...current,
      moduleSections: current.moduleSections.map((section) => {
        if (section.id !== sectionId) {
          return section;
        }

        const nextItems = section.items.filter((item) => item.id !== lessonId);
        return {
          ...section,
          items: nextItems.length > 0 ? nextItems : [createLessonDraft('New Lesson', '')],
        };
      }),
    }));
  };

  const openMaterialFile = async (material, shouldDownload = false) => {
    try {
      setMaterialActionId(material.id);
      const response = await userAPI.downloadLearningMaterialFile(material.id, { download: shouldDownload });
      const mimeType = response.headers?.['content-type'] || material.mimeType || 'application/octet-stream';
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);

      if (shouldDownload) {
        const link = document.createElement('a');
        link.href = url;
        link.download = material?.originalFileName || `${material?.title || 'learning-material'}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      }
    } catch (error) {
      toast.error(handleAPIError(error).message);
    } finally {
      setMaterialActionId('');
    }
  };

  const onUploadLearningMaterial = async (event) => {
    event.preventDefault();

    const serializedModuleSections = serializeModuleSectionsForRequest(materialForm.moduleSections);
    const resolvedModuleTitle = resolveModulePublishTitle(materialForm, serializedModuleSections);

    if (!resolvedModuleTitle) {
      toast.error('Add a module title, section title, or first slide title before publishing.');
      return;
    }

    if (!materialForm.section.trim()) {
      toast.error('Select a section first.');
      return;
    }

    if (serializedModuleSections.length === 0) {
      toast.error('Add at least one module section with one lesson.');
      return;
    }

    const formData = new FormData();
    formData.append('title', resolvedModuleTitle);
    formData.append('section', materialForm.section.trim());
    formData.append('subject', materialForm.subject.trim());
    formData.append('description', materialForm.description.trim());
    formData.append('moduleStructureJson', JSON.stringify(serializedModuleSections));
    if (materialFile) {
      formData.append('file', materialFile);
    }

    try {
      setIsUploadingMaterial(true);
      const response = editingMaterialId
        ? await userAPI.updateLearningMaterial(editingMaterialId, formData)
        : await userAPI.uploadLearningMaterial(formData);
      if (response.status === 'success') {
        const savedMaterial = response.data?.material || null;
        if (!String(materialForm.title || '').trim() && resolvedModuleTitle) {
          setMaterialForm((current) => ({ ...current, title: resolvedModuleTitle }));
        }
        await refreshLearningMaterials();
        if (editingMaterialId) {
          if (savedMaterial?.id) {
            setEditingMaterialId(savedMaterial.id);
          }
          toast.success(response.message || 'Learning material updated successfully.');
        } else {
          toast.success(response.message || 'Learning material uploaded successfully.');
          if (savedMaterial?.id) {
            resetMaterialEditor();
            openAssessmentEditor(savedMaterial);
            return;
          }
          resetMaterialEditor();
        }
      }
    } catch (error) {
      toast.error(handleAPIError(error).message);
    } finally {
      setIsUploadingMaterial(false);
    }
  };

  const onDeleteLearningMaterial = async (materialId) => {
    if (!window.confirm('Delete this published module? This will also remove its linked quiz.')) {
      return;
    }

    try {
      setMaterialActionId(materialId);
      const response = await userAPI.deleteLearningMaterial(materialId);
      if (response.status === 'success') {
        setMaterials((current) => current.filter((material) => material.id !== materialId));
        if (editingMaterialId === materialId) {
          resetMaterialEditor();
        }
        toast.success(response.message || 'Learning material deleted successfully.');
      }
    } catch (error) {
      toast.error(handleAPIError(error).message);
    } finally {
      setMaterialActionId('');
    }
  };

  if (isLoading) {
    return (
      <div className="landscape-shell flex min-h-screen items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-7 text-center shadow-sm">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (activeTab === 'materials' && materialWorkspaceView === 'library') {
    return (
      <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
        <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6">
          <header className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('roster')}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                  aria-label="Back to teacher dashboard"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Teacher Resources</p>
                  <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Learning Materials</h1>
                  <p className="mt-1 max-w-2xl text-sm text-slate-500">
                    Create, organize, and update the modules assigned to your classes.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMaterialWorkspaceView('editor')}
                  className="btn btn-secondary"
                  title="Open the original materials editor"
                >
                  Classic Editor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetMaterialEditor();
                    setMaterialWorkspaceView('editor');
                  }}
                  className="btn btn-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Module
                </button>
              </div>
            </div>
          </header>

          <section className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Published Modules</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{materials.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Assigned Sections</p>
              <p className="mt-2 text-3xl font-black text-emerald-700">{Math.max(0, materialLibrarySections.length - 1)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">With Attachments</p>
              <p className="mt-2 text-3xl font-black text-blue-700">{materials.filter((material) => material.hasSourceFile).length}</p>
            </div>
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Module Library</h2>
                <p className="mt-1 text-sm text-slate-500">Select a module to continue editing its lessons or quiz.</p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:min-w-72">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    value={materialLibrarySearch}
                    onChange={(event) => setMaterialLibrarySearch(event.target.value)}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                    placeholder="Search title, subject, or section"
                  />
                </label>
                <select
                  value={materialLibrarySection}
                  onChange={(event) => setMaterialLibrarySection(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
                  aria-label="Filter materials by section"
                >
                  {materialLibrarySections.map((section) => (
                    <option key={section} value={section}>{section === CLASS_SECTION_ALL ? 'All Sections' : section}</option>
                  ))}
                </select>
              </div>
            </div>

            {materialsLoading ? (
              <div className="py-16 text-center text-sm font-semibold text-slate-500">Loading learning materials...</div>
            ) : filteredMaterialLibrary.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-4 text-lg font-black text-slate-800">
                  {materials.length === 0 ? 'No modules published yet' : 'No matching modules'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {materials.length === 0 ? 'Create your first module and assign it to a class.' : 'Try another search or section filter.'}
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredMaterialLibrary.map((material) => {
                  const sections = normalizeModuleSectionsFromOutline(material.outline || []);
                  const topicCount = sections.reduce((count, section) => count + (section.items?.length || 0), 0);
                  return (
                    <article key={material.id} className="flex min-h-72 flex-col rounded-3xl border border-slate-200 bg-slate-50/60 p-5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                          Published
                        </span>
                      </div>
                      <h3 className="mt-4 line-clamp-2 text-lg font-black text-slate-900">{material.title || 'Untitled module'}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{material.subject || 'No subject specified'}</p>
                      <p className="mt-3 line-clamp-2 text-sm text-slate-500">{material.description || 'No module overview has been added.'}</p>

                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-white px-2 py-2">
                          <p className="text-base font-black text-slate-900">{sections.length}</p>
                          <p className="text-[10px] font-semibold uppercase text-slate-400">Sections</p>
                        </div>
                        <div className="rounded-xl bg-white px-2 py-2">
                          <p className="text-base font-black text-slate-900">{topicCount}</p>
                          <p className="text-[10px] font-semibold uppercase text-slate-400">Topics</p>
                        </div>
                        <div className="rounded-xl bg-white px-2 py-2">
                          <p className="truncate text-sm font-black text-slate-900">{material.section || '—'}</p>
                          <p className="text-[10px] font-semibold uppercase text-slate-400">Class</p>
                        </div>
                      </div>

                      <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            loadPublishedMaterialForEditing(material);
                            setMaterialWorkspaceView('editor');
                          }}
                          className="btn btn-primary flex-1"
                        >
                          Edit Module
                        </button>
                        <button type="button" onClick={() => openAssessmentEditor(material)} className="btn btn-secondary">
                          Quiz
                        </button>
                        {canOpenMaterial(material) ? (
                          <button
                            type="button"
                            onClick={() => openMaterialFile(material)}
                            disabled={materialActionId === material.id}
                            className="btn btn-secondary"
                            title="Open attached material"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onDeleteLearningMaterial(material.id)}
                          disabled={materialActionId === material.id}
                          className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                          aria-label={`Delete ${material.title || 'module'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  if (activeTab === 'materials') {
    return (
      <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
        <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
          <form className="space-y-5" onSubmit={onUploadLearningMaterial}>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('roster')}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-light tracking-tight text-slate-900">{materialForm.title || 'New learning module'}</h1>
                  <p className="text-sm text-slate-500">{totalModuleSections} sections • {totalModuleLessons} lesson pages</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {editingMaterialId ? (
                  <button className="btn btn-secondary" type="button" onClick={resetMaterialEditor} disabled={isUploadingMaterial}>
                    Cancel Editing
                  </button>
                ) : null}
                {editingMaterialId ? (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => openAssessmentEditor({
                      id: editingMaterialId,
                      title: materialForm.title || resolveModulePublishTitle(materialForm, serializeModuleSectionsForRequest(materialForm.moduleSections)),
                    })}
                    disabled={isUploadingMaterial}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Edit Quiz
                  </button>
                ) : null}
                <button className="btn btn-primary" type="submit" disabled={isUploadingMaterial}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  {isUploadingMaterial ? (editingMaterialId ? 'Saving...' : 'Publishing...') : (editingMaterialId ? 'Save Module Changes' : 'Publish Module')}
                </button>
              </div>
            </div>

            <div className="grid gap-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm xl:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="border-b border-slate-200 bg-[#fbfcfe] xl:border-b-0 xl:border-r">
                <div className="border-b border-slate-200 bg-white">
                  <div className="grid grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setMaterialInspectorTab('settings')}
                      className={`px-5 py-4 text-left text-sm font-bold transition ${
                        materialInspectorTab === 'settings'
                          ? 'border-b-2 border-emerald-500 text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      Course Outline
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaterialInspectorTab('resources')}
                      className={`px-5 py-4 text-left text-sm font-bold transition ${
                        materialInspectorTab === 'resources'
                          ? 'border-b-2 border-emerald-500 text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      Materials
                    </button>
                  </div>
                </div>

                {materialInspectorTab === 'resources' ? (
                  <div className="space-y-4 p-5">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-900">Supporting Material</label>
                      <input
                        key={materialFileInputKey}
                        className="input-field"
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,video/*"
                        onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Optional only. Attach a reference file or video while keeping the main lesson written inside the module.
                      </p>
                    </div>
                    {materialFile ? (
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                        Selected file: <span className="font-semibold text-slate-900">{materialFile.name}</span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="border-b border-slate-200 px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Course Outline</p>
                          <h3 className="mt-1 text-xl font-black text-slate-900">{materialForm.title || 'Untitled Module'}</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={addModuleSection}
                            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"
                          >
                            <Plus className="h-4 w-4" />
                            Add Section
                          </button>
                        </div>
                      </div>

                      <label className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        <Search className="h-4 w-4" />
                        <input
                          className="w-full bg-transparent outline-none placeholder:text-slate-400"
                          value={moduleOutlineSearch}
                          onChange={(e) => setModuleOutlineSearch(e.target.value)}
                          placeholder="Search course outline"
                        />
                      </label>

                      {materials.length > 0 ? (
                        <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Published Modules</p>
                              <p className="mt-1 text-xs text-slate-500">Click a module to reopen it here.</p>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
                              {materials.length}
                            </span>
                          </div>

                          <div className="mt-3 space-y-2">
                            {materials.map((material) => {
                              const isEditingThisMaterial = editingMaterialId === material.id;
                              return (
                                <div
                                  key={material.id}
                                  className={`rounded-2xl border px-3 py-3 transition ${
                                    isEditingThisMaterial
                                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                      : 'border-slate-200 bg-white text-slate-700'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => loadPublishedMaterialForEditing(material)}
                                    className="w-full text-left"
                                  >
                                    <p className="truncate text-sm font-black">{material.title || 'Untitled module'}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {material.section || 'No section'}{material.subject ? ` • ${material.subject}` : ''}
                                    </p>
                                  </button>
                                  <div className="mt-3 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => onDeleteLearningMaterial(material.id)}
                                      disabled={materialActionId === material.id}
                                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      {materialActionId === material.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="max-h-[calc(100vh-280px)] space-y-3 overflow-y-auto p-4">
                      {filteredModuleSections.map((section, sectionIndex) => {
                        const isSectionActive = activeModuleSection?.id === section.id;
                        return (
                          <button
                            key={section.id}
                            type="button"
                            onClick={() => {
                              setSelectedModuleSectionId(section.id);
                              setSelectedModuleLessonId(section.items[0]?.id || '');
                            }}
                            className={`w-full rounded-3xl border p-4 text-left transition ${
                              isSectionActive ? 'border-emerald-200 bg-emerald-50/80 shadow-sm' : 'border-slate-200 bg-slate-50/80'
                            } hover:border-emerald-300 hover:bg-emerald-50/60`}
                          >
                            <div className="flex w-full items-start justify-between gap-3">
                              <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Section {sectionIndex + 1}</p>
                                <p className="mt-1 text-base font-black text-slate-900">{section.title || `Module ${sectionIndex + 1}`}</p>
                                <p className="mt-1 text-xs text-slate-500">{section.items.length} topic{section.items.length === 1 ? '' : 's'}</p>
                              </div>
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
                                {section.items.length}
                              </span>
                            </div>

                            <div className="mt-4 space-y-2 border-t border-slate-200/80 pt-4">
                              {section.items.map((item, itemIndex) => {
                                const isLessonActive = activeModuleLesson?.id === item.id && activeModuleSection?.id === section.id;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedModuleSectionId(section.id);
                                      setSelectedModuleLessonId(item.id);
                                    }}
                                    className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition ${
                                      isLessonActive ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200' : 'text-slate-600 hover:bg-white'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-black uppercase tracking-[0.14em]">Topic {sectionIndex + 1}.{itemIndex + 1}</p>
                                      <p className="truncate text-sm font-semibold">{item.title || 'Untitled topic'}</p>
                                    </div>
                                    <BookOpen className="h-4 w-4 shrink-0" />
                                  </button>
                                );
                              })}
                            </div>
                          </button>
                        );
                      })}

                      {filteredModuleSections.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                          No matching sections or lesson pages.
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </aside>

              <section className="min-w-0 bg-white">
                <div className="border-b border-slate-200 px-6 py-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Topic Editor</p>
                      <h3 className="mt-1 text-2xl font-black text-slate-900">
                        {activeModuleLesson?.title || 'Topic Page'}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (editingMaterialId) {
                            openAssessmentEditor({
                              id: editingMaterialId,
                              title: materialForm.title || resolveModulePublishTitle(materialForm, serializeModuleSectionsForRequest(materialForm.moduleSections)),
                            });
                            return;
                          }

                          toast.error('Publish the module first before editing its quiz.');
                        }}
                        className="inline-flex min-w-[132px] shrink-0 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700"
                      >
                        <Sparkles className="h-4 w-4" />
                        Edit Quiz
                      </button>
                      <button
                        type="button"
                        onClick={() => addModuleLesson(activeModuleSection?.id)}
                        disabled={!activeModuleSection}
                        className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Plus className="h-4 w-4" />
                        Add Topic
                      </button>
                      <button
                        type="button"
                        onClick={() => activeModuleLesson && removeModuleLesson(activeModuleSection.id, activeModuleLesson.id)}
                        disabled={!activeModuleSection || !activeModuleLesson}
                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove Topic
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 bg-[#fcfdff] p-6">
                  <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-white p-5 lg:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-semibold">Module Title</label>
                      <input
                        className="input-field"
                        value={materialForm.title}
                        onChange={(e) => setMaterialForm((current) => ({ ...current, title: e.target.value }))}
                        placeholder="Introduction to Networking"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold">Section / Class</label>
                      <select
                        className="input-field"
                        value={materialForm.section}
                        onChange={(e) => setMaterialForm((current) => ({ ...current, section: e.target.value }))}
                      >
                        {sectionOptions.filter((section) => section !== CLASS_SECTION_ALL).length === 0 ? (
                          <option value="" disabled>No sections available</option>
                        ) : (
                          sectionOptions
                            .filter((section) => section !== CLASS_SECTION_ALL)
                            .map((section) => (
                              <option key={section} value={section}>{section}</option>
                            ))
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold">Subject</label>
                      <input
                        className="input-field"
                        value={materialForm.subject}
                        onChange={(e) => setMaterialForm((current) => ({ ...current, subject: e.target.value }))}
                        placeholder="Computer Systems"
                      />
                    </div>
                    <div className="lg:col-span-3">
                      <label className="mb-1 block text-sm font-semibold">Overview / Instructions</label>
                      <textarea
                        className="input-field min-h-32"
                        value={materialForm.description}
                        onChange={(e) => setMaterialForm((current) => ({ ...current, description: e.target.value }))}
                        placeholder="Add the course overview, directions, and what students should learn before they start the lesson pages."
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="space-y-5">
                      <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Page Composer</p>
                            <p className="mt-1 text-sm text-slate-500">Each lesson page works like a topic page in your module deck.</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">Title block</span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">Body block</span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">Topic page</span>
                          </div>
                        </div>

                        <div className="space-y-4 border-b border-slate-200 px-5 py-4">
                          <div>
                            <label className="mb-1 block text-sm font-semibold">Section Title</label>
                            <input
                              className="input-field"
                              value={activeModuleSection?.title || ''}
                              onChange={(e) => activeModuleSection && updateModuleSection(activeModuleSection.id, { title: e.target.value })}
                              placeholder="Module 1: Communication in a Connected World"
                            />
                          </div>
                        </div>

                        <div className="bg-[radial-gradient(circle_at_top,#f8fbff_0%,#edf3f8_62%,#e7eef5_100%)] px-6 py-8 lg:px-10">
                          <div className="mx-auto max-w-[920px] rounded-[28px] border border-slate-300 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
                            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Topic Canvas</p>
                                <p className="mt-1 text-sm text-slate-500">Teachers build the lesson topic, subtopics, and visuals here.</p>
                              </div>
                              <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                {activeModuleSection?.title || 'Section'} / {activeModuleLesson?.title || 'Topic'}
                              </div>
                            </div>

                            <div className="space-y-6 px-6 py-8 lg:px-10 lg:py-10">
                              <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-5">
                                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Title Block</p>
                                <input
                                  className="w-full border-0 bg-transparent p-0 text-3xl font-black tracking-tight text-slate-900 outline-none placeholder:text-slate-300"
                                  value={activeModuleLesson?.title || ''}
                                  onChange={(e) => activeModuleSection && activeModuleLesson && updateModuleLesson(activeModuleSection.id, activeModuleLesson.id, { title: e.target.value })}
                                  placeholder="Type the topic title here"
                                />
                              </div>

                              <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
                                  <span className="rounded-full bg-slate-100 px-3 py-1">Text area</span>
                                  <span className="rounded-full bg-slate-100 px-3 py-1">Main topic</span>
                                  <span className="rounded-full bg-slate-100 px-3 py-1">Subtopics</span>
                                </div>
                                <textarea
                                  className="min-h-[240px] w-full resize-none border-0 bg-transparent p-0 text-[16px] leading-8 text-slate-700 outline-none placeholder:text-slate-300"
                                  value={activeModuleLesson?.content || ''}
                                  onChange={(e) => activeModuleSection && activeModuleLesson && updateModuleLesson(activeModuleSection.id, activeModuleLesson.id, { content: e.target.value })}
                                  placeholder={`Write the lesson the way students should read it on-screen.

Start with an introduction, then add key ideas, examples, steps, or short activities.

This area is the actual module page, not just a file description.`}
                                />

                                <div className="mt-6 border-t border-slate-200 pt-5">
                                  <LessonImageEditor
                                    title="Main Topic Image"
                                    description="Add an image directly to the main topic."
                                    media={activeModuleLesson?.media || null}
                                    onImport={(file) => activeModuleSection && activeModuleLesson && onModuleLessonImageSelected(activeModuleSection.id, activeModuleLesson.id, file)}
                                    onChange={(nextMedia) => activeModuleSection && activeModuleLesson && updateModuleLesson(activeModuleSection.id, activeModuleLesson.id, { media: nextMedia })}
                                    onRemove={() => activeModuleSection && activeModuleLesson && updateModuleLesson(activeModuleSection.id, activeModuleLesson.id, { media: null })}
                                  />
                                </div>

                                <div className="mt-6 border-t border-slate-200 pt-5">
                                  <LessonVideoEditor
                                    video={activeModuleLesson?.video || null}
                                    uploading={uploadingLessonVideoId === activeModuleLesson?.id}
                                    onImport={(file) => activeModuleSection && activeModuleLesson && onModuleLessonVideoSelected(activeModuleSection.id, activeModuleLesson.id, file)}
                                    onChange={(video) => activeModuleSection && activeModuleLesson && updateModuleLesson(activeModuleSection.id, activeModuleLesson.id, { video })}
                                    onRemove={() => activeModuleSection && activeModuleLesson && updateModuleLesson(activeModuleSection.id, activeModuleLesson.id, { video: null })}
                                  />
                                </div>

                                <div className="mt-6 border-t border-slate-200 pt-5">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Subtopics</p>
                                      <p className="mt-1 text-sm text-slate-500">Add smaller topics under this lesson page.</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => activeModuleSection && activeModuleLesson && addModuleLessonSubtopic(activeModuleSection.id, activeModuleLesson.id)}
                                      className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"
                                    >
                                      <Plus className="h-4 w-4" />
                                      Add Subtopic
                                    </button>
                                  </div>

                                  <div className="mt-4 space-y-3">
                                    {activeLessonSubtopics.length === 0 ? (
                                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                                        No subtopics yet. Add one to break this slide into smaller lesson chunks.
                                      </div>
                                    ) : activeLessonSubtopics.map((subtopic, subtopicIndex) => (
                                      <div key={subtopic.id} className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                                            Subtopic {`${Math.max(currentSlideIndex + 1, 1)}.${subtopicIndex + 1}`}
                                          </p>
                                          <button
                                            type="button"
                                            onClick={() => activeModuleSection && activeModuleLesson && removeModuleLessonSubtopic(activeModuleSection.id, activeModuleLesson.id, subtopic.id)}
                                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Remove
                                          </button>
                                        </div>
                                        <input
                                          className="input-field"
                                          value={subtopic.title}
                                          onChange={(e) => activeModuleSection && activeModuleLesson && updateModuleLessonSubtopic(activeModuleSection.id, activeModuleLesson.id, subtopic.id, { title: e.target.value })}
                                          placeholder="Subtopic title"
                                        />
                                        <textarea
                                          className="input-field mt-3 min-h-[220px]"
                                          value={subtopic.content}
                                          onChange={(e) => activeModuleSection && activeModuleLesson && updateModuleLessonSubtopic(activeModuleSection.id, activeModuleLesson.id, subtopic.id, { content: e.target.value })}
                                          placeholder="Write the explanation, examples, or activity for this subtopic."
                                        />
                                        <div className="mt-4">
                                          <LessonImageEditor
                                            title="Subtopic Image"
                                            description="Add an image for this subtopic."
                                            media={subtopic.media || null}
                                            onImport={(file) => activeModuleSection && activeModuleLesson && onModuleLessonSubtopicImageSelected(activeModuleSection.id, activeModuleLesson.id, subtopic.id, file)}
                                            onChange={(nextMedia) => activeModuleSection && activeModuleLesson && updateModuleLessonSubtopic(activeModuleSection.id, activeModuleLesson.id, subtopic.id, { media: nextMedia })}
                                            onRemove={() => activeModuleSection && activeModuleLesson && updateModuleLessonSubtopic(activeModuleSection.id, activeModuleLesson.id, subtopic.id, { media: null })}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => activeModuleSection && removeModuleSection(activeModuleSection.id)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove Section
                      </button>
                      <button
                        type="button"
                        onClick={() => setMaterialInspectorTab('resources')}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                      >
                        Open Materials
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="landscape-shell page-enter">
      <header className="rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-sm md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black text-slate-900 md:text-2xl">
              <img src={logo} alt="iTECHS Logo" className="h-8 w-8 object-contain md:h-9 md:w-9" />
              Teacher Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600">{user?.firstName || user?.username}</p>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === 'TEACHER' && (
              <button onClick={() => navigate('/teacher/level-editor')} className="btn btn-primary inline-flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Edit Level
              </button>
            )}
            <button onClick={logout} className="btn btn-secondary">Sign Out</button>
          </div>
        </div>
      </header>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <div className="grid min-h-[72vh] lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Navigation</p>
            </div>

            <nav className="divide-y divide-slate-200 border-b border-slate-200">
              {[
                { id: 'roster', label: 'Overview', icon: Users },
                { id: 'difficulty', label: 'Progress', icon: Activity },
                { id: 'leaderboard', label: 'Ranking', icon: Trophy },
                { id: 'materials', label: 'Materials', icon: BookOpen },
                { id: 'policy', label: 'Settings', icon: Settings2 }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold transition ${
                      activeTab === item.id
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
              <div className="flex items-center justify-between"><span>Students</span><span className="font-bold text-slate-900">{rosterSummary.totalStudents}</span></div>
              <div className="mt-1 flex items-center justify-between"><span>Avg. Progress</span><span className="font-bold text-slate-900">{rosterSummary.averageProgress}%</span></div>
              <div className="mt-1 flex items-center justify-between"><span>Needs Support</span><span className="font-bold text-rose-700">{rosterSummary.needsSupportCount}</span></div>
            </div>

            <div>
              <div className="border-b border-slate-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Student List</p>
              </div>
              <div className="max-h-75 divide-y divide-slate-200 overflow-y-auto">
                {sidebarStudents.slice(0, 12).map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-xs ${selectedStudentId === student.id ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    <span className="truncate pr-2 font-semibold">{getStudentDisplayName(student)}</span>
                    <span className="font-bold">{student.metrics?.progressPercent || 0}%</span>
                  </button>
                ))}
                {sidebarStudents.length === 0 && (
                  <p className="px-4 py-3 text-xs text-slate-500">No students found.</p>
                )}
              </div>
            </div>
          </aside>

          <div className="min-w-0 overflow-y-auto bg-white">
          {activeTab === 'roster' && (
            <div>
              <div className="border-b border-slate-200 p-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <label className="relative">
                    <span className="sr-only">Search students</span>
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      className="input-field pl-10"
                      placeholder="Filter by name, username, or email"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </label>
                  <label>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Section</span>
                    <select
                      className="input-field"
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                    >
                      <option value={CLASS_SECTION_ALL}>All Sections</option>
                      {sectionOptions
                        .filter((section) => section !== CLASS_SECTION_ALL)
                        .map((section) => (
                          <option key={section} value={section}>{section}</option>
                        ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="space-y-4 p-4">
                  {filteredRoster.length === 0 && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                      Dashboard data will appear here after students join your course and begin making progress.
                    </div>
                  )}
                  {/* KPI cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5">
                    {[
                      { label: 'Students', value: rosterSummary.totalStudents, color: 'text-slate-900' },
                      { label: 'Avg. Progress', value: `${rosterSummary.averageProgress}%`, color: 'text-blue-700' },
                      { label: 'On Target', value: rosterSummary.masteryCount, color: 'text-emerald-700' },
                      { label: 'Needs Support', value: rosterSummary.needsSupportCount, color: 'text-rose-600' },
                      { label: 'Active This Week', value: rosterSummary.activeThisWeekCount, color: 'text-amber-600' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{kpi.label}</p>
                        <p className={`mt-1 text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    {/* Performance Band Distribution */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
                        <BarChart3 className="h-4 w-4 text-[#16876d]" />
                        Performance Bands
                      </h3>
                      <div className="space-y-3">
                        {[
                          { key: 'MASTERY', label: 'On Target (≥80%)', barClass: 'bg-emerald-500', textClass: 'text-emerald-700' },
                          { key: 'PROGRESS', label: 'Progress (40–79%)', barClass: 'bg-amber-400', textClass: 'text-amber-700' },
                          { key: 'SUPPORT', label: 'Support (<40%)', barClass: 'bg-rose-400', textClass: 'text-rose-700' },
                        ].map(({ key, label, barClass, textClass }) => {
                          const count = overviewAnalytics.bandCounts[key];
                          const pct = rosterSummary.totalStudents > 0 ? Math.round((count / rosterSummary.totalStudents) * 100) : 0;
                          return (
                            <div key={key}>
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-700">{label}</span>
                                <span className={`font-black ${textClass}`}>{count} <span className="font-semibold text-slate-500">({pct}%)</span></span>
                              </div>
                              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                                <div className={`h-full rounded-full transition-all ${barClass}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Progress Distribution */}
                    <ProgressDistributionChart students={filteredRoster} />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    {/* Activity Breakdown */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
                        <Flag className="h-4 w-4 text-amber-500" />
                        Activity Breakdown
                      </h3>
                      <div className="space-y-2">
                        {[
                          { label: 'Active today', count: overviewAnalytics.activityCounts.today, barClass: 'bg-emerald-500' },
                          { label: 'Active this week', count: overviewAnalytics.activityCounts.week, barClass: 'bg-blue-400' },
                          { label: 'Active this month', count: overviewAnalytics.activityCounts.month, barClass: 'bg-amber-400' },
                          { label: 'Inactive', count: overviewAnalytics.activityCounts.inactive, barClass: 'bg-slate-300' },
                        ].map(({ label, count, barClass }) => {
                          const pct = rosterSummary.totalStudents > 0 ? Math.round((count / rosterSummary.totalStudents) * 100) : 0;
                          return (
                            <div key={label}>
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-700">{label}</span>
                                <span className="font-bold text-slate-800">{count}</span>
                              </div>
                              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section Performance */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
                        <Users className="h-4 w-4 text-slate-500" />
                        Section Avg. Progress
                      </h3>
                      {overviewAnalytics.sectionData.length === 0 ? (
                        <p className="text-xs text-slate-500">No section data.</p>
                      ) : (
                        <div className="space-y-2">
                          {overviewAnalytics.sectionData.map(({ section, count, avgProgress }) => (
                            <div key={section}>
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-700">{section} <span className="text-slate-400">({count})</span></span>
                                <span className="font-bold text-slate-800">{avgProgress}%</span>
                              </div>
                              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-[#16876d]" style={{ width: `${avgProgress}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    {/* Top Performers */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        Top Performers
                      </h3>
                      {overviewAnalytics.topPerformers.length === 0 ? (
                        <p className="text-sm text-slate-500">No student performance data is available yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {overviewAnalytics.topPerformers.map((student, idx) => (
                            <div key={student.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                              <span className="w-6 text-center text-xs font-black text-slate-400">#{idx + 1}</span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-slate-900">{getStudentDisplayName(student)}</p>
                                <p className="text-xs text-slate-500">{getStudentSectionLabel(student)}</p>
                              </div>
                              <div className="w-16 shrink-0 text-right">
                                <p className={`w-full text-sm font-black tabular-nums ${getProgressPercentTextClass(getStudentDashboardPerformancePercent(student))}`}>
                                  {getStudentDashboardPerformancePercent(student)}%
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Needs Attention */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900">
                        <Flag className="h-4 w-4 text-rose-500" />
                        Needs Attention
                      </h3>
                      {overviewAnalytics.needsAttention.length === 0 ? (
                        <p className="text-sm text-slate-500">No students currently meet the intervention criteria.</p>
                      ) : (
                        <div className="space-y-2">
                          {overviewAnalytics.needsAttention.map((student) => (
                            <div key={student.id} className="flex items-center gap-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-slate-900">{getStudentDisplayName(student)}</p>
                                <p className="text-xs text-slate-500">{getStudentSectionLabel(student)}</p>
                              </div>
                              <div className="w-16 shrink-0 text-right">
                                <p className={`w-full text-sm font-black tabular-nums ${getProgressPercentTextClass(getStudentDashboardPerformancePercent(student))}`}>
                                  {getStudentDashboardPerformancePercent(student)}%
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
            </div>
          )}

          {activeTab === 'difficulty' && (
            <div>
              <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Progress</h2>
                  <p className="mt-1 text-sm text-gray-600">Detailed progress for every student assigned to this class.</p>
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                  <button
                    type="button"
                    onClick={() => navigate('/teacher/assessments/progress/student')}
                    className="btn btn-secondary"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Assessment Progress
                  </button>
                  <button
                    type="button"
                    onClick={onDownloadStudentProgressPdf}
                    disabled={!selectedStudent || !studentDetail || detailLoading || isDownloadingProgressPdf}
                    className="btn btn-secondary"
                    title={selectedStudent ? 'Download the selected student progress as PDF' : 'Select a student first'}
                  >
                    {isDownloadingProgressPdf ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download PDF
                  </button>
                  <div className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Report Sections</p>
                    <div className="mt-2 space-y-1.5">
                      {PDF_REPORT_SECTIONS.map((section) => (
                        <label key={section.id} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={Boolean(pdfSectionFilters[section.id])}
                            onChange={(event) => {
                              const { checked } = event.target;
                              setPdfSectionFilters((current) => ({
                                ...current,
                                [section.id]: checked,
                              }));
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>{section.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="min-w-55">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Section</span>
                    <select
                      className="input-field"
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                    >
                      <option value={CLASS_SECTION_ALL}>All Sections</option>
                      {sectionOptions
                        .filter((section) => section !== CLASS_SECTION_ALL)
                        .map((section) => (
                          <option key={section} value={section}>{section}</option>
                        ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="grid xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)]">
                  <div className="overflow-hidden border-b border-slate-200 xl:border-b-0 xl:border-r">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                      <h3 className="text-base font-black text-slate-900">Student Progress</h3>
                      <span className="text-xs font-bold text-slate-600">{filteredRoster.length} students</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-150 border-collapse bg-white">
                        <thead>
                          <tr className="bg-slate-50 text-left text-sm text-slate-900">
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Student</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Section</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Completion</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Stars</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRoster.map((student) => {
                            const isSelected = selectedStudentId === student.id;
                            const progressPercent = Number(student.metrics?.progressPercent || 0);
                            const completedLevels = Number(student.metrics?.completedLevels || 0);
                            const totalLevels = Number(student.metrics?.totalLevels || 1);
                            const totalStars = Number(student.metrics?.totalStars || 0);

                            return (
                              <tr
                                key={student.id}
                                onClick={() => setSelectedStudentId(student.id)}
                                className={`cursor-pointer border-b border-slate-100 last:border-b-0 ${isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'}`}
                              >
                                <td className="px-4 py-3 align-top">
                                  <p className="font-bold text-slate-900">{getStudentDisplayName(student)}</p>
                                  <p className="text-xs text-slate-600">{student.username}</p>
                                </td>
                                <td className="px-4 py-3 align-top text-sm font-semibold text-slate-700">
                                  {getStudentSectionLabel(student)}
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="flex items-center gap-3">
                                    <div className="h-2.5 w-full max-w-36 overflow-hidden rounded-full bg-slate-200">
                                      <div className="h-full rounded-full bg-[#16876d]" style={{ width: `${progressPercent}%` }} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-900">{completedLevels}/{totalLevels}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 align-top text-sm font-bold text-amber-600">
                                  {totalStars}
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedStudentId(student.id);
                                    }}
                                    className="text-left text-xs font-semibold text-[#16876d] underline-offset-2 hover:underline"
                                  >
                                    View details
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredRoster.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                                No students available yet. Student progress will appear here after they join your course.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="self-start p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="text-base font-black text-slate-900">Student Details</h3>
                      {studentInsights && (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {studentInsights.classSection && (
                            <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                              {studentInsights.classSection}
                            </span>
                          )}
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${studentInsights.performanceBand.badgeClass}`}>
                            {studentInsights.performanceBand.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {!selectedStudent && (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                        <p className="text-sm font-bold text-slate-700">
                          {filteredRoster.length === 0 ? 'No student details yet' : 'Select a student to view details'}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {filteredRoster.length === 0
                            ? 'Details, completion, attempts, and performance analytics will appear here after a student joins.'
                            : 'Choose a student from the progress table.'}
                        </p>
                      </div>
                    )}
                    {selectedStudent && detailLoading && <p className="text-sm text-slate-600">Loading student details...</p>}

                    {selectedStudent && !detailLoading && studentDetail && studentInsights && (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-sm font-bold text-slate-900">{getStudentDisplayName(selectedStudent)}</p>
                          <p className="mt-1 text-xs text-slate-600">{selectedStudent.email}</p>
                          {studentInsights.classSection && (
                            <p className="mt-1 text-xs text-slate-600">Section: {studentInsights.classSection}</p>
                          )}
                          <p className="mt-1 text-xs text-slate-600">Last attempt: {formatDateTime(selectedStudent.metrics?.lastAttemptAt)}</p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Completion</p>
                            <p className="mt-1 text-xl font-black text-slate-900">{studentInsights.completionRate}%</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Win Rate</p>
                            <p className="mt-1 text-xl font-black text-slate-900">{studentInsights.recentWinRate}%</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Average Stars</p>
                            <p className="mt-1 text-xl font-black text-amber-600">{studentInsights.averageStars}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Rank</p>
                            <p className="mt-1 text-xl font-black text-emerald-700">{studentInsights.leaderboardEntry ? `#${studentInsights.leaderboardEntry.rank}` : '--'}</p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <h4 className="text-sm font-black text-slate-900">Recent Attempts</h4>
                          <div className="mt-2 space-y-2">
                            {studentInsights.recentAttempts.slice(0, 3).map((attempt) => (
                              <div key={attempt.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                                  <span>Level {attempt.levelNumber}</span>
                                  <span>{attempt.completed ? 'Completed' : 'In progress'}</span>
                                </div>
                                <p className="mt-1 text-xs text-slate-600">Score {attempt.finalScore} | Stars {attempt.starsEarned}</p>
                              </div>
                            ))}
                            {studentInsights.recentAttempts.length === 0 && <p className="text-xs text-slate-500">No attempts recorded.</p>}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-[#16876d]" />
                              <h4 className="text-sm font-black text-slate-900">Performance Analytics</h4>
                            </div>
                            <button
                              type="button"
                              onClick={onGeneratePerformanceInsight}
                              disabled={isGeneratingInsight}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                              title="Generate AI analytics"
                              aria-label="Generate AI analytics"
                            >
                              {isGeneratingInsight ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          {studentDetail.performanceInsight ? (
                            <>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Strengths</p>
                                  <div className="mt-2 space-y-2 text-sm text-emerald-950">
                                    {studentDetail.performanceInsight.strengths.map((item) => (
                                      <p key={item}>{item}</p>
                                    ))}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Weaknesses</p>
                                  <div className="mt-2 space-y-2 text-sm text-amber-950">
                                    {studentDetail.performanceInsight.weaknesses.map((item) => (
                                      <p key={item}>{item}</p>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                <span className="font-bold text-slate-900">Recommended action:</span>{' '}
                                {studentDetail.performanceInsight.recommendedAction}
                              </div>
                            </>
                          ) : (
                            <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                              Click the sparkle button to generate AI strengths, weaknesses, and a recommended action from this student&apos;s records.
                            </div>
                          )}
                          {isGeneratingInsight && studentDetail.performanceInsight && (
                            <p className="mt-2 text-xs font-semibold text-slate-500">Refreshing saved AI analytics...</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveTab('policy')}
                          className="btn btn-primary w-full"
                        >
                          Open Settings
                        </button>
                      </div>
                    )}
                  </div>
                </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div>
              <div className="flex flex-col gap-2 border-b border-slate-200 p-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Ranking</h2>
                  <p className="text-sm text-gray-600 mt-1">Uses combined game and assessment progress with the same filters from Overview.</p>
                </div>
                <div className="flex flex-col gap-2 md:items-end">
                  <label className="min-w-55">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Section</span>
                    <select
                      className="input-field"
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                    >
                      <option value={CLASS_SECTION_ALL}>All Sections</option>
                      {sectionOptions
                        .filter((section) => section !== CLASS_SECTION_ALL)
                        .map((section) => (
                          <option key={section} value={section}>{section}</option>
                        ))}
                    </select>
                  </label>
                  <div className="rounded-full border border-amber-300 bg-[#fff8e8] px-4 py-2 text-sm font-bold text-amber-800">
                    {filteredLeaderboard.length} students ranked
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto p-4">
                <table className="pixel-table min-w-170">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Student Name</th>
                      <th>Total Stars</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaderboard.map((row) => {
                      return (
                        <tr key={row.studentId}>
                          <td>#{row.rank}</td>
                          <td>{row.studentName}</td>
                          <td>{row.totalStars}</td>
                        </tr>
                      );
                    })}
                    {filteredLeaderboard.length === 0 && (
                      <tr>
                        <td colSpan={3}>No students available for the current filter.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'materials' && (
            <div>
              <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f7fbff_0%,#f2faf5_100%)] p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">Course Builder</p>
                    <h2 className="mt-2 text-3xl font-black text-slate-900">Design the module inside the platform</h2>
                    <p className="mt-2 max-w-3xl text-sm text-slate-600">
                      Build the outline first, then open each lesson page and write what students will actually read. Supporting files stay optional.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
                      {totalModuleSections} sections
                    </div>
                    <div className="rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
                      {totalModuleLessons} lesson pages
                    </div>
                    <div className="rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
                      {editingMaterialId ? 'Editing existing module' : 'Draft mode'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-200 p-5">
                <form className="space-y-5" onSubmit={onUploadLearningMaterial}>
                  <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_280px]">
                    <aside className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 px-5 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Course Outline</p>
                            <h3 className="mt-1 text-xl font-black text-slate-900">{editingMaterialId ? 'Editing Module' : 'New Module'}</h3>
                          </div>
                          <button
                            type="button"
                            onClick={addModuleSection}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
                          >
                            <Plus className="h-4 w-4" />
                            Add Section
                          </button>
                        </div>
                        <label className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                          <Search className="h-4 w-4" />
                          <input
                            className="w-full bg-transparent outline-none placeholder:text-slate-400"
                            value={moduleOutlineSearch}
                            onChange={(e) => setModuleOutlineSearch(e.target.value)}
                            placeholder="Search outline"
                          />
                        </label>
                      </div>

                      <div className="space-y-3 p-4">
                        {filteredModuleSections.map((section, sectionIndex) => {
                          const isSectionActive = activeModuleSection?.id === section.id;
                          return (
                            <div
                              key={section.id}
                              className={`rounded-2xl border p-3 transition ${
                                isSectionActive ? 'border-emerald-200 bg-emerald-50/80 shadow-sm' : 'border-slate-200 bg-slate-50/70'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedModuleSectionId(section.id);
                                  setSelectedModuleLessonId(section.items[0]?.id || '');
                                }}
                                className="flex w-full items-start justify-between gap-3 text-left"
                              >
                                <div>
                                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Section {sectionIndex + 1}</p>
                                  <p className="mt-1 text-sm font-black text-slate-900">{section.title || `Module ${sectionIndex + 1}`}</p>
                                  <p className="mt-1 text-xs text-slate-500">{section.items.length} lesson page{section.items.length === 1 ? '' : 's'}</p>
                                </div>
                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-sm">
                                  {section.items.length}
                                </span>
                              </button>

                              <div className="mt-3 space-y-2 border-t border-slate-200/80 pt-3">
                                {section.items.map((item, itemIndex) => {
                                  const isLessonActive = activeModuleLesson?.id === item.id && activeModuleSection?.id === section.id;
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedModuleSectionId(section.id);
                                        setSelectedModuleLessonId(item.id);
                                      }}
                                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition ${
                                        isLessonActive ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200' : 'text-slate-600 hover:bg-white'
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate text-xs font-bold uppercase tracking-[0.14em]">Lesson {sectionIndex + 1}.{itemIndex + 1}</p>
                                        <p className="truncate text-sm font-semibold">{item.title || 'Untitled lesson'}</p>
                                      </div>
                                      <BookOpen className="h-4 w-4 shrink-0" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        {filteredModuleSections.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                            No matching sections or lessons.
                          </div>
                        ) : null}
                      </div>
                    </aside>

                    <div className="space-y-5">
                      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 px-5 py-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Lesson Editor</p>
                              <h3 className="mt-1 text-xl font-black text-slate-900">
                                {activeModuleSection?.title || 'Module Section'} / {activeModuleLesson?.title || 'Lesson Page'}
                              </h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => addModuleLesson(activeModuleSection?.id)}
                                disabled={!activeModuleSection}
                                className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Plus className="h-4 w-4" />
                                Add Lesson Page
                              </button>
                              <button
                                type="button"
                                onClick={() => activeModuleLesson && removeModuleLesson(activeModuleSection.id, activeModuleLesson.id)}
                                disabled={!activeModuleSection || !activeModuleLesson}
                                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove Lesson
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                          <div className="space-y-4">
                            <div>
                              <label className="mb-1 block text-sm font-semibold">Section Title</label>
                              <div className="flex flex-col gap-3 md:flex-row">
                                <input
                                  className="input-field"
                                  value={activeModuleSection?.title || ''}
                                  onChange={(e) => activeModuleSection && updateModuleSection(activeModuleSection.id, { title: e.target.value })}
                                  placeholder="Module 1: Communication in a Connected World"
                                />
                                <button
                                  type="button"
                                  onClick={() => activeModuleSection && removeModuleSection(activeModuleSection.id)}
                                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Remove Section
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-sm font-semibold">Lesson Page Title</label>
                              <input
                                className="input-field"
                                value={activeModuleLesson?.title || ''}
                                onChange={(e) => activeModuleSection && activeModuleLesson && updateModuleLesson(activeModuleSection.id, activeModuleLesson.id, { title: e.target.value })}
                                placeholder="1.1 Introduction to Networking"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-sm font-semibold">Lesson Page Content</label>
                              <textarea
                                className="input-field min-h-[320px]"
                                value={activeModuleLesson?.content || ''}
                                onChange={(e) => activeModuleSection && activeModuleLesson && updateModuleLesson(activeModuleSection.id, activeModuleLesson.id, { content: e.target.value })}
                                placeholder="Write the actual lesson page here. This is what students will read inside the LMS module."
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Authoring Notes</p>
                              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                <li>Write each topic as a separate lesson page.</li>
                                <li>Use the section title as the module name students see in the outline.</li>
                                <li>Keep uploads optional so the module itself is the lesson.</li>
                              </ul>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <label className="mb-1 block text-sm font-semibold">Supporting File</label>
                              <input
                                key={materialFileInputKey}
                                className="input-field"
                                type="file"
                                accept=".pdf,.doc,.docx,.ppt,.pptx,video/*"
                                onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                              />
                              <p className="mt-2 text-xs text-slate-500">
                                Optional only. Use this for downloadable references or videos, not as the main lesson content.
                              </p>
                            </div>

                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                              <p className="font-bold">Student Experience</p>
                              <p className="mt-1">
                                Learners will see an LMS-style module with a course outline, lesson pages, progress, and quiz flow. The file is only support.
                              </p>
                            </div>
                          </div>
                        </div>
                      </section>

                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
                        <div>
                          <p className="text-sm font-black text-slate-900">{editingMaterialId ? 'Ready to update this module?' : 'Ready to publish this module?'}</p>
                          <p className="mt-1 text-sm text-slate-500">The lesson pages you wrote above will become the module students open inside the platform.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {editingMaterialId ? (
                            <button className="btn btn-secondary" type="button" onClick={resetMaterialEditor} disabled={isUploadingMaterial}>
                              Cancel Editing
                            </button>
                          ) : null}
                          <button className="btn btn-primary" type="submit" disabled={isUploadingMaterial}>
                            <BookOpen className="mr-2 h-4 w-4" />
                            {isUploadingMaterial ? (editingMaterialId ? 'Saving...' : 'Publishing...') : (editingMaterialId ? 'Save Module Changes' : 'Publish Module')}
                          </button>
                        </div>
                      </div>
                    </div>

                    <aside className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 px-5 py-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Module Details</p>
                        <h3 className="mt-1 text-xl font-black text-slate-900">{materialForm.title || 'Untitled learning module'}</h3>
                        <p className="mt-1 text-sm text-slate-500">Set the course information first, then write each lesson page inside the builder.</p>
                      </div>

                      <div className="space-y-4 p-5">
                        <div>
                          <label className="mb-1 block text-sm font-semibold">Module Title</label>
                          <input
                            className="input-field"
                            value={materialForm.title}
                            onChange={(e) => setMaterialForm((current) => ({ ...current, title: e.target.value }))}
                            placeholder="Introduction to Networking"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold">Section / Class</label>
                          <select
                            className="input-field"
                            value={materialForm.section}
                            onChange={(e) => setMaterialForm((current) => ({ ...current, section: e.target.value }))}
                          >
                            {sectionOptions.filter((section) => section !== CLASS_SECTION_ALL).length === 0 ? (
                              <option value="" disabled>No sections available</option>
                            ) : (
                              sectionOptions
                                .filter((section) => section !== CLASS_SECTION_ALL)
                                .map((section) => (
                                  <option key={section} value={section}>{section}</option>
                                ))
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold">Subject</label>
                          <input
                            className="input-field"
                            value={materialForm.subject}
                            onChange={(e) => setMaterialForm((current) => ({ ...current, subject: e.target.value }))}
                            placeholder="Computer Systems"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-semibold">Overview / Instructions</label>
                          <textarea
                            className="input-field min-h-28"
                            value={materialForm.description}
                            onChange={(e) => setMaterialForm((current) => ({ ...current, description: e.target.value }))}
                            placeholder="Add the course overview, directions, and what students should learn before they start the lesson pages."
                          />
                        </div>
                      </div>
                    </aside>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'policy' && (
            <div>
              <div className="border-b border-slate-200 p-4">
                <h2 className="text-2xl font-black text-gray-900">Settings</h2>
                <p className="text-sm text-gray-600 mt-1">Profile, security, and student configuration.</p>
              </div>

              <div className="grid border-b border-slate-200 xl:grid-cols-2 xl:divide-x xl:divide-slate-200">
                <div className="pixel-panel-muted space-y-4">
                  <div className="flex items-center gap-2 text-gray-900">
                    <UserRound className="w-5 h-5 text-[#16876d]" />
                    <h3 className="text-xl font-black">Profile Settings</h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold mb-1">First Name</label>
                      <input
                        className="input-field"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Teacher first name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Last Name</label>
                      <input
                        className="input-field"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Teacher last name"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Email Address</label>
                    <input
                      className="input-field"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="teacher@school.com"
                    />
                  </div>
                  <div className="rounded-xl border border-amber-300 bg-[#fff8e8] px-4 py-3 text-sm text-gray-700">
                    <p className="font-bold text-gray-900">Account identity</p>
                    <p className="mt-1">Username: <span className="font-mono font-bold">{user?.username}</span></p>
                    <p className="mt-1">Role: <span className="font-bold">{user?.role}</span></p>
                    <p className="mt-1">
                      Course Code:{' '}
                      <span className="font-mono font-bold">{isLoadingCourseCode ? 'Loading...' : (teacherCourseCode || '--')}</span>
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={onSaveProfile} disabled={isSavingProfile}>
                    <Save className="w-4 h-4 mr-2" />
                    {isSavingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>

                <div className="pixel-panel-muted space-y-4">
                  <div className="flex items-center gap-2 text-gray-900">
                    <ShieldCheck className="w-5 h-5 text-[#16876d]" />
                    <h3 className="text-xl font-black">Security</h3>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Current Password</label>
                    <input
                      className="input-field"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold mb-1">New Password</label>
                      <input
                        className="input-field"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="At least 8 characters"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Confirm Password</label>
                      <input
                        className="input-field"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Repeat new password"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
                    Password updates apply to your next sign-in.
                  </div>
                  <button className="btn btn-secondary" onClick={onChangePassword} disabled={isChangingPassword}>
                    <KeyRound className="w-4 h-4 mr-2" />
                    {isChangingPassword ? 'Updating...' : 'Change Password'}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};

export default TeacherPage;
