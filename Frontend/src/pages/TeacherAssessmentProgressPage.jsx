import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Download,
  Loader2,
  LogOut,
  Pencil,
  Settings2,
  Trophy,
  Users,
} from 'lucide-react';
import { examAPI, handleAPIError } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

const hashString = (value = '') => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getStudentDisplayName = (student) => {
  if (!student) {
    return 'Unknown Student';
  }

  const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
  return fullName || student.username || student.email || 'Student';
};

const getStudentInitials = (student) => {
  const first = String(student?.firstName || '').trim().charAt(0);
  const last = String(student?.lastName || '').trim().charAt(0);
  const initials = `${first}${last}`.toUpperCase();
  return initials || String(student?.username || 'ST').slice(0, 2).toUpperCase();
};

const getSectionLabel = (student) => String(student?.section || '').trim() || 'No Section';
const ALL_SECTIONS_OPTION = 'ALL_SECTIONS';
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatPercent = (value) => `${Math.round(Number(value || 0))}%`;

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
};

const getBandLabel = (value) => {
  const percent = Number(value || 0);
  if (percent >= 80) {
    return { label: 'Mastery Band', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  }
  if (percent >= 40) {
    return { label: 'Progress Band', className: 'border-amber-200 bg-amber-50 text-amber-700' };
  }
  return { label: 'Support Band', className: 'border-rose-200 bg-rose-50 text-rose-700' };
};

const getScoreColorClass = (value) => {
  const score = Number(value || 0);
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-500';
  return 'text-rose-500';
};

const getStatusBadge = (status) => {
  if (status === 'Completed') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (status === 'Failed') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  return 'border-slate-200 bg-slate-100 text-slate-600';
};

const TeacherAssessmentProgressPage = () => {
  const navigate = useNavigate();
  const { viewMode = 'student', studentId } = useParams();
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [roster, setRoster] = useState([]);
  const [selectedSection, setSelectedSection] = useState(ALL_SECTIONS_OPTION);
  const [isExportingReport, setIsExportingReport] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const response = await examAPI.getTeacherAssessmentProgress();

        if (cancelled) {
          return;
        }

        setRoster(Array.isArray(response.data?.students) ? response.data.students : []);
        setMaterials(Array.isArray(response.data?.materials) ? response.data.materials : []);
      } catch (error) {
        if (!cancelled) {
          const errorInfo = handleAPIError(error);
          setRoster([]);
          setMaterials([]);
          console.error(errorInfo.message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const assessments = useMemo(() => materials, [materials]);

  const sectionOptions = useMemo(() => {
    const uniqueSections = Array.from(new Set(
      roster
        .map((student) => getSectionLabel(student))
        .filter(Boolean)
    )).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));

    return [
      { value: ALL_SECTIONS_OPTION, label: 'All Sections' },
      ...uniqueSections.map((section) => ({ value: section, label: section })),
    ];
  }, [roster]);

  const filteredRoster = useMemo(() => {
    if (selectedSection === ALL_SECTIONS_OPTION) {
      return roster;
    }

    return roster.filter((student) => getSectionLabel(student) === selectedSection);
  }, [roster, selectedSection]);

  const studentRows = useMemo(() => (
    filteredRoster.map((student) => {
      const rows = Array.isArray(student.assessmentRows) ? student.assessmentRows : [];
      const completedRows = rows.filter((row) => row.status === 'Completed');
      const attemptedRows = rows.filter((row) => row.status !== 'Not Attempted');
      const averageScore = attemptedRows.length > 0
        ? Math.round(attemptedRows.reduce((sum, row) => sum + row.percentage, 0) / attemptedRows.length)
        : 0;
      const highest = completedRows.reduce((best, row) => (row.percentage > best.percentage ? row : best), completedRows[0] || null);
      const lowest = completedRows.reduce((worst, row) => (row.percentage < worst.percentage ? row : worst), completedRows[0] || null);
      return {
        student,
        rows,
        completedCount: completedRows.length,
        averageScore,
        highest,
        lowest,
      };
    })
  ), [assessments, filteredRoster]);

  const assessmentRows = useMemo(() => (
    assessments.map((assessment) => {
      const results = studentRows.map((entry) => entry.rows.find((row) => row.id === assessment.id)).filter(Boolean);
      const completed = results.filter((row) => row.status === 'Completed');
      const attempted = results.filter((row) => row.status !== 'Not Attempted');
      const averageScore = attempted.length > 0
        ? Math.round(attempted.reduce((sum, row) => sum + row.percentage, 0) / attempted.length)
        : 0;
      const topResult = completed.reduce((best, row) => (row.percentage > (best?.percentage ?? -1) ? row : best), null);
      const topStudent = topResult
        ? studentRows.find((entry) => entry.rows.some((row) => row.id === assessment.id && row.percentage === topResult.percentage))?.student
        : null;

      return {
        id: assessment.id,
        title: assessment.title,
        module: assessment.module,
        questionCount: assessment.questionCount,
        completedCount: completed.length,
        averageScore,
        topStudent,
      };
    })
  ), [assessments, studentRows]);

  const overviewStats = useMemo(() => {
    const totalAssessments = assessments.length;
    const completedStudents = studentRows.filter((entry) => entry.completedCount > 0).length;
    const averageScore = studentRows.length > 0
      ? Math.round(studentRows.reduce((sum, entry) => sum + entry.averageScore, 0) / studentRows.length)
      : 0;
    const needsSupport = studentRows.filter((entry) => entry.averageScore > 0 && entry.averageScore < 60).length;

    return {
      totalAssessments,
      averageScore,
      completedStudents,
      needsSupport,
    };
  }, [assessments.length, studentRows]);

  const selectedStudentEntry = useMemo(() => (
    studentRows.find((entry) => entry.student.id === studentId) || null
  ), [studentId, studentRows]);

  const sidebarStudents = useMemo(() => (
    [...filteredRoster].sort((left, right) => getStudentDisplayName(left).localeCompare(getStudentDisplayName(right), undefined, { sensitivity: 'base' }))
  ), [filteredRoster]);

  const sidebarSummary = useMemo(() => {
    const totalStudents = filteredRoster.length;
    const averageProgress = totalStudents > 0
      ? Math.round(filteredRoster.reduce((sum, student) => sum + Number(student.metrics?.progressPercent || 0), 0) / totalStudents)
      : 0;
    const needsSupportCount = filteredRoster.filter((student) => Number(student.metrics?.progressPercent || 0) < 40).length;
    return { totalStudents, averageProgress, needsSupportCount };
  }, [filteredRoster]);

  const backToTeacherProgress = () => {
    navigate('/teacher', { state: { activeTab: 'difficulty' } });
  };

  const onExportAssessmentReport = () => {
    const hasData = selectedStudentEntry
      ? selectedStudentEntry.rows.length > 0
      : (viewMode === 'assessment' ? assessmentRows.length > 0 : studentRows.length > 0);

    if (!hasData) {
      toast.error('No assessment data is available to export.');
      return;
    }

    try {
      setIsExportingReport(true);

      const reportWindow = window.open('', '_blank', 'width=980,height=1080');
      if (!reportWindow) {
        toast.error('Please allow pop-ups to download the PDF report.');
        return;
      }

      const generatedAt = formatDateTime(new Date().toISOString());
      const sectionLabel = selectedSection === ALL_SECTIONS_OPTION ? 'All Sections' : selectedSection;
      const reportTitle = selectedStudentEntry
        ? `${getStudentDisplayName(selectedStudentEntry.student)} - Assessment Details Report`
        : `Assessment Progress Report - ${viewMode === 'assessment' ? 'By Assessment' : 'By Student'}`;

      const tableMarkup = selectedStudentEntry
        ? selectedStudentEntry.rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.assessmentTitle)}</td>
              <td>${escapeHtml(row.score)}/${escapeHtml(row.totalQuestions)}</td>
              <td>${escapeHtml(row.percentage)}%</td>
              <td>${escapeHtml(row.stars)}</td>
              <td>${escapeHtml(row.status)}</td>
              <td>${escapeHtml(formatDateTime(row.attemptedAt))}</td>
            </tr>
          `).join('')
        : (viewMode === 'assessment'
          ? assessmentRows.map((assessment) => `
              <tr>
                <td>${escapeHtml(assessment.title)}</td>
                <td>${escapeHtml(assessment.module)}</td>
                <td>${escapeHtml(assessment.questionCount)}</td>
                <td>${escapeHtml(assessment.completedCount)}/${escapeHtml(filteredRoster.length)}</td>
                <td>${escapeHtml(assessment.averageScore)}%</td>
                <td>${escapeHtml(assessment.topStudent ? getStudentDisplayName(assessment.topStudent) : '--')}</td>
              </tr>
            `).join('')
          : studentRows.map((entry) => `
              <tr>
                <td>${escapeHtml(getStudentDisplayName(entry.student))}</td>
                <td>${escapeHtml(getSectionLabel(entry.student))}</td>
                <td>${escapeHtml(entry.completedCount)}/${escapeHtml(assessments.length)}</td>
                <td>${escapeHtml(entry.averageScore)}%</td>
                <td>${escapeHtml(entry.highest?.percentage ?? 0)}%</td>
                <td>${escapeHtml(entry.lowest?.percentage ?? 0)}%</td>
              </tr>
            `).join(''));

      const summaryCardsMarkup = selectedStudentEntry
        ? `
          <div class="summary-grid">
            <div class="card">
              <div class="card-label">Student</div>
              <div class="card-value card-value-sm">${escapeHtml(getStudentDisplayName(selectedStudentEntry.student))}</div>
            </div>
            <div class="card">
              <div class="card-label">Section</div>
              <div class="card-value card-value-sm">${escapeHtml(getSectionLabel(selectedStudentEntry.student))}</div>
            </div>
            <div class="card">
              <div class="card-label">Completed</div>
              <div class="card-value">${escapeHtml(selectedStudentEntry.completedCount)}</div>
            </div>
            <div class="card">
              <div class="card-label">Average Score</div>
              <div class="card-value">${escapeHtml(selectedStudentEntry.averageScore)}%</div>
            </div>
          </div>
        `
        : `
          <div class="summary-grid">
            <div class="card">
              <div class="card-label">View</div>
              <div class="card-value card-value-sm">${escapeHtml(viewMode === 'assessment' ? 'By Assessment' : 'By Student')}</div>
            </div>
            <div class="card">
              <div class="card-label">Section</div>
              <div class="card-value card-value-sm">${escapeHtml(sectionLabel)}</div>
            </div>
            <div class="card">
              <div class="card-label">Assessments</div>
              <div class="card-value">${escapeHtml(overviewStats.totalAssessments)}</div>
            </div>
            <div class="card">
              <div class="card-label">Average Score</div>
              <div class="card-value">${escapeHtml(overviewStats.averageScore)}%</div>
            </div>
          </div>
          <div class="summary-grid summary-grid-secondary">
            <div class="card">
              <div class="card-label">Students Completed</div>
              <div class="card-value">${escapeHtml(overviewStats.completedStudents)}</div>
            </div>
            <div class="card">
              <div class="card-label">Needs Support</div>
              <div class="card-value">${escapeHtml(overviewStats.needsSupport)}</div>
            </div>
            <div class="card">
              <div class="card-label">Visible Students</div>
              <div class="card-value">${escapeHtml(filteredRoster.length)}</div>
            </div>
            <div class="card">
              <div class="card-label">Materials</div>
              <div class="card-value">${escapeHtml(materials.length)}</div>
            </div>
          </div>
        `;

      const tableHeaders = selectedStudentEntry
        ? '<th>Assessment</th><th>Score</th><th>Percentage</th><th>Stars</th><th>Status</th><th>Attempted On</th>'
        : (viewMode === 'assessment'
          ? '<th>Assessment</th><th>Module</th><th>Questions</th><th>Completed</th><th>Average Score</th><th>Top Performer</th>'
          : '<th>Student</th><th>Section</th><th>Assessments Completed</th><th>Average Score</th><th>Highest Score</th><th>Lowest Score</th>');

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
      .page { padding: 32px; }
      .header {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        align-items: flex-start;
        border-bottom: 2px solid var(--line);
        padding-bottom: 18px;
        margin-bottom: 24px;
      }
      h1, h2, p { margin: 0; }
      h1 { font-size: 28px; margin-bottom: 6px; }
      .subtitle { color: var(--muted); font-size: 14px; }
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
      .section { margin-top: 22px; }
      .section h2 { font-size: 16px; margin-bottom: 12px; }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      .summary-grid-secondary { margin-top: 12px; }
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
      .card-value-sm { font-size: 18px; }
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
      tr:last-child td { border-bottom: none; }
      @media print {
        .page { padding: 18px; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="header">
        <div>
          <h1>${escapeHtml(reportTitle)}</h1>
          <p class="subtitle">Generated on ${escapeHtml(generatedAt)}</p>
          <div class="pill">${escapeHtml(selectedStudentEntry ? 'Assessment Details' : 'Teacher Assessment Progress')}</div>
        </div>
        <div>
          <p class="subtitle">Teacher Dashboard Report</p>
        </div>
      </section>

      <section class="section">
        <h2>Summary</h2>
        ${summaryCardsMarkup}
      </section>

      <section class="section">
        <h2>${escapeHtml(selectedStudentEntry ? 'Assessment Results' : (viewMode === 'assessment' ? 'Assessment Overview' : 'Student Performance'))}</h2>
        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>${tableMarkup}</tbody>
        </table>
      </section>
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
      setIsExportingReport(false);
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
            Loading assessment progress...
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbModeLabel = viewMode === 'assessment' ? 'By Assessment' : 'By Student';

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
              <Pencil className="mr-2 h-4 w-4" />
              Edit Level
            </button>
            <button type="button" onClick={onSignOut} className="btn btn-secondary">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </button>
          </div>
        </header>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="grid min-h-[72vh] lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">
              <div className="border-b border-slate-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Navigation</p>
              </div>

              <nav className="divide-y divide-slate-200 border-b border-slate-200">
                {[
                  { label: 'Overview', icon: Users, tab: 'roster' },
                  { label: 'Progress', icon: Activity, tab: 'difficulty', active: true },
                  { label: 'Ranking', icon: Trophy, tab: 'leaderboard' },
                  { label: 'Materials', icon: BookOpen, tab: 'materials' },
                  { label: 'Settings', icon: Settings2, tab: 'policy' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => navigate('/teacher', { state: { activeTab: item.tab } })}
                      className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold transition ${
                        item.active ? 'bg-white text-emerald-800' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="border-b border-slate-200 px-4 py-3 text-xs text-slate-600">
                <div className="flex items-center justify-between"><span>Students</span><span className="font-bold text-slate-900">{sidebarSummary.totalStudents}</span></div>
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
                      onClick={() => navigate(`/teacher/assessments/progress/student/${student.id}`)}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left text-xs ${
                        student.id === studentId ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate pr-2 font-semibold">{getStudentDisplayName(student)}</span>
                      <span className="font-bold">{Number(student.metrics?.progressPercent || 0)}%</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <main className="min-w-0 bg-white p-5">
              <div className="mb-4 flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-sky-600">
                    <button type="button" onClick={backToTeacherProgress}>Progress</button>
                    <span>›</span>
                    <span>Assessment Progress</span>
                    <span>›</span>
                    <span>{breadcrumbModeLabel}</span>
                    {selectedStudentEntry && (
                      <>
                        <span>›</span>
                        <span>Student Details</span>
                      </>
                    )}
                  </div>
                  <h2 className="mt-2 text-4xl font-black text-slate-900">
                    {selectedStudentEntry ? 'Assessment Details' : 'Assessment Progress'}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedStudentEntry
                      ? `Detailed performance for ${getStudentDisplayName(selectedStudentEntry.student)} across all assessments.`
                      : 'Track student performance across all assessments in this class.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {selectedStudentEntry ? (
                    <>
                      <button type="button" onClick={() => navigate('/teacher/assessments/progress/student')} className="btn btn-secondary">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to By Student
                      </button>
                      <button type="button" onClick={onExportAssessmentReport} disabled={isExportingReport} className="btn btn-secondary">
                        {isExportingReport ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Export Student Report
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={backToTeacherProgress} className="btn btn-secondary">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </button>
                      <button type="button" onClick={onExportAssessmentReport} disabled={isExportingReport} className="btn btn-secondary">
                        {isExportingReport ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Export Report
                      </button>
                      <div className="min-w-[220px]">
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Section
                        </label>
                        <select
                          value={selectedSection}
                          onChange={(event) => setSelectedSection(event.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-lg text-slate-700 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        >
                          {sectionOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {!selectedStudentEntry && (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-500">Total Assessments</p>
                      <p className="mt-2 text-4xl font-black text-slate-900">{overviewStats.totalAssessments}</p>
                      <p className="mt-2 text-sm text-slate-500">Across all modules</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-500">Class Average Score</p>
                      <p className="mt-2 text-4xl font-black text-slate-900">{overviewStats.averageScore}%</p>
                      <p className="mt-2 text-sm text-slate-500">Average performance</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-500">Students Completed</p>
                      <p className="mt-2 text-4xl font-black text-slate-900">{overviewStats.completedStudents}</p>
                      <p className="mt-2 text-sm text-slate-500">Completed at least 1 assessment</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-500">Students Needing Support</p>
                      <p className="mt-2 text-4xl font-black text-slate-900">{overviewStats.needsSupport}</p>
                      <p className="mt-2 text-sm text-slate-500">Below 60% average score</p>
                    </div>
                  </div>

                  <div className="mt-6 border-b border-slate-200">
                    <div className="flex gap-6">
                      <button
                        type="button"
                        onClick={() => navigate('/teacher/assessments/progress/assessment')}
                        className={`border-b-2 pb-3 text-sm font-bold ${viewMode === 'assessment' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500'}`}
                      >
                        By Assessment
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/teacher/assessments/progress/student')}
                        className={`border-b-2 pb-3 text-sm font-bold ${viewMode !== 'assessment' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500'}`}
                      >
                        By Student
                      </button>
                    </div>
                  </div>

                  {viewMode === 'assessment' ? (
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full min-w-140 border-collapse bg-white">
                        <thead>
                          <tr className="bg-slate-50 text-left text-sm text-slate-900">
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Assessment</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Module</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Questions</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Completed</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Average Score</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Top Performer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assessmentRows.map((assessment) => (
                            <tr key={assessment.id} className="border-b border-slate-100 last:border-b-0">
                              <td className="px-4 py-3 font-bold text-slate-900">{assessment.title}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{assessment.module}</td>
                              <td className="px-4 py-3 text-sm font-bold text-slate-900">{assessment.questionCount}</td>
                              <td className="px-4 py-3 text-sm font-bold text-slate-900">{assessment.completedCount}/{filteredRoster.length}</td>
                              <td className={`px-4 py-3 text-sm font-black ${getScoreColorClass(assessment.averageScore)}`}>{assessment.averageScore}%</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{assessment.topStudent ? getStudentDisplayName(assessment.topStudent) : '--'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full min-w-150 border-collapse bg-white">
                        <thead>
                          <tr className="bg-slate-50 text-left text-sm text-slate-900">
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Student</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Assessments Completed</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Average Score</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Highest Score</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Lowest Score</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-black">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentRows.map((entry) => (
                            <tr key={entry.student.id} className="border-b border-slate-100 last:border-b-0">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700">
                                    {getStudentInitials(entry.student)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900">{getStudentDisplayName(entry.student)}</p>
                                    <p className="text-xs text-slate-500">{entry.student.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-900">{entry.completedCount}/{assessments.length} ({assessments.length > 0 ? Math.round((entry.completedCount / assessments.length) * 100) : 0}%)</td>
                              <td className={`px-4 py-3 font-black ${getScoreColorClass(entry.averageScore)}`}>{entry.averageScore}%</td>
                              <td className="px-4 py-3 text-sm text-slate-900">
                                <p className="font-black">{entry.highest?.percentage ?? 0}%</p>
                                <p className="text-xs text-slate-500">{entry.highest?.assessmentTitle || '--'}</p>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-900">
                                <p className="font-black">{entry.lowest?.percentage ?? 0}%</p>
                                <p className="text-xs text-slate-500">{entry.lowest?.assessmentTitle || '--'}</p>
                              </td>
                              <td className="px-4 py-3">
                                <button type="button" onClick={() => navigate(`/teacher/assessments/progress/student/${entry.student.id}`)} className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-sky-600 hover:bg-slate-50">
                                  View Details
                                  <ChevronRight className="ml-2 h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {selectedStudentEntry && (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-black text-emerald-700">
                          {getStudentInitials(selectedStudentEntry.student)}
                        </div>
                        <div>
                          <p className="text-2xl font-black text-slate-900">{getStudentDisplayName(selectedStudentEntry.student)}</p>
                          <p className="text-sm text-slate-500">{selectedStudentEntry.student.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">{getSectionLabel(selectedStudentEntry.student)}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getBandLabel(selectedStudentEntry.student.metrics?.progressPercent).className}`}>
                          {getBandLabel(selectedStudentEntry.student.metrics?.progressPercent).label}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-4 px-4 py-4 md:grid-cols-2 xl:grid-cols-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Total Assessments</p>
                        <p className="mt-2 text-4xl font-black text-slate-900">{assessments.length}</p>
                        <p className="mt-2 text-sm text-slate-500">Across all modules</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Completed</p>
                        <p className="mt-2 text-4xl font-black text-slate-900">{selectedStudentEntry.completedCount} ({assessments.length > 0 ? Math.round((selectedStudentEntry.completedCount / assessments.length) * 100) : 0}%)</p>
                        <p className="mt-2 text-sm text-slate-500">{formatPercent(selectedStudentEntry.student.metrics?.progressPercent)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Average Score</p>
                        <p className={`mt-2 text-4xl font-black ${getScoreColorClass(selectedStudentEntry.averageScore)}`}>{selectedStudentEntry.averageScore}%</p>
                        <p className="mt-2 text-sm text-slate-500">Across completed</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Highest Score</p>
                        <p className="mt-2 text-4xl font-black text-slate-900">{selectedStudentEntry.highest?.percentage ?? 0}%</p>
                        <p className="mt-2 text-sm text-slate-500">{selectedStudentEntry.highest?.assessmentTitle || '--'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lowest Score</p>
                        <p className="mt-2 text-4xl font-black text-slate-900">{selectedStudentEntry.lowest?.percentage ?? 0}%</p>
                        <p className="mt-2 text-sm text-slate-500">{selectedStudentEntry.lowest?.assessmentTitle || '--'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full min-w-140 border-collapse bg-white">
                      <thead>
                        <tr className="bg-slate-50 text-left text-sm text-slate-900">
                          <th className="border-b border-slate-200 px-4 py-3 font-black">Assessment</th>
                          <th className="border-b border-slate-200 px-4 py-3 font-black">Score</th>
                          <th className="border-b border-slate-200 px-4 py-3 font-black">Percentage</th>
                          <th className="border-b border-slate-200 px-4 py-3 font-black">Stars</th>
                          <th className="border-b border-slate-200 px-4 py-3 font-black">Status</th>
                          <th className="border-b border-slate-200 px-4 py-3 font-black">Attempted On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStudentEntry.rows.map((row) => (
                          <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                            <td className="px-4 py-3 font-bold text-slate-900">{row.assessmentTitle}</td>
                            <td className="px-4 py-3 font-bold text-slate-900">{row.score}/{row.totalQuestions}</td>
                            <td className={`px-4 py-3 font-black ${getScoreColorClass(row.percentage)}`}>{row.percentage}%</td>
                            <td className="px-4 py-3 text-amber-500">{'★'.repeat(row.stars)}{'☆'.repeat(Math.max(0, 5 - row.stars))}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusBadge(row.status)}`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{formatDateTime(row.attemptedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherAssessmentProgressPage;
