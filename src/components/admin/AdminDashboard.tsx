/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Lesson,
  AuditLog,
  ResourceStatus,
  CurriculumSubject,
  ExerciseSet,
  AcademicYear,
  User,
  UserRole,
  SystemSettings,
  isLessonVerified,
} from '../../types/index.ts';
import {
  testFirestoreConnection,
  FirestoreConnectionState,
  firebaseProjectId,
} from '../../lib/firebase.ts';
import { migrateCurriculumToFirestore } from '../../lib/firestoreService.ts';
import {
  Shield,
  FileCheck2,
  AlertTriangle,
  History,
  Database,
  Lock,
  Cpu,
  Layers,
  Users,
  Settings,
  RefreshCw,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Save,
  Plus,
  Search,
  UserCheck,
  UserX,
  CloudUpload,
  Calendar,
  X,
} from 'lucide-react';

interface AdminDashboardProps {
  lessons: Lesson[];
  subjects: CurriculumSubject[];
  exercises?: ExerciseSet[];
  auditLogs: AuditLog[];
  activeNavbarTab?: string;
  authToken?: string | null;
  onUpdateLessonStatus: (lessonId: string, status: ResourceStatus) => Promise<void> | void;
  onLessonCreated?: (lesson: Lesson) => void;
  onAuditLogsRefresh?: () => Promise<void> | void;
}

type AdminTab = 'curriculum' | 'framework' | 'users' | 'audit' | 'security';

interface AnalyticsOverview {
  totalStudents: number;
  totalTeachers: number;
  pendingTeachers?: number;
  totalLessons: number;
  totalSubmissions: number;
  avgScore: number;
  pendingReviews: number;
  curriculumVersion: string;
  aiModel: string;
  aiStatus: 'active' | 'unconfigured';
  firebaseConfigured?: boolean;
  firebaseProjectId?: string | null;
  persistenceMode: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lessons,
  subjects,
  exercises = [],
  auditLogs,
  activeNavbarTab,
  authToken,
  onUpdateLessonStatus,
  onLessonCreated,
  onAuditLogsRefresh,
}) => {
  const [selectedTab, setSelectedTab] = useState<AdminTab>('curriculum');
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [firestoreState, setFirestoreState] = useState<FirestoreConnectionState>('unconfigured');

  const [usersList, setUsersList] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [lessonFilterGrade, setLessonFilterGrade] = useState<number | 'all'>('all');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create Lesson Modal
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonSubject, setNewLessonSubject] = useState('toan');
  const [newLessonGrade, setNewLessonGrade] = useState(4);
  const [newLessonBook, setNewLessonBook] = useState('Kết nối tri thức với cuộc sống');
  const [newLessonDocNum, setNewLessonDocNum] = useState('TT 32/2018/TT-BGDĐT');
  const [newLessonSummary, setNewLessonSummary] = useState('');
  const [newLessonStatus, setNewLessonStatus] = useState<'DRAFT' | 'NEEDS_REVIEW'>('NEEDS_REVIEW');
  const [creatingLesson, setCreatingLesson] = useState(false);

  // Academic Years & Firestore Sync
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [newYearName, setNewYearName] = useState('2026 - 2027');
  const [newYearStart, setNewYearStart] = useState('2026-09-05');
  const [newYearEnd, setNewYearEnd] = useState('2027-05-31');
  const [newYearActive, setNewYearActive] = useState(false);
  const [creatingYear, setCreatingYear] = useState(false);
  const [migratingFirestore, setMigratingFirestore] = useState(false);

  // Audit log filter
  const [auditSearch, setAuditSearch] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState<'all' | 'success' | 'warning' | 'info'>('all');
  const [filteredAuditLogs, setFilteredAuditLogs] = useState<AuditLog[]>(auditLogs);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    setFilteredAuditLogs(auditLogs);
  }, [auditLogs]);

  // Sync top navbar tab selection with internal Admin panel
  useEffect(() => {
    if (activeNavbarTab === 'curriculum-manager') {
      setSelectedTab('framework');
    } else if (activeNavbarTab === 'learning-resources') {
      setSelectedTab('curriculum');
    } else if (activeNavbarTab === 'audit-logs') {
      setSelectedTab('audit');
    } else if (activeNavbarTab === 'admin-overview') {
      setSelectedTab('curriculum');
    }
  }, [activeNavbarTab]);

  // Load real analytics overview & Firestore status
  const fetchOverview = useCallback(async () => {
    try {
      const [overviewRes, fsStatus] = await Promise.all([
        fetch('/api/analytics/overview'),
        testFirestoreConnection(),
      ]);
      if (overviewRes.ok) {
        setAnalytics(await overviewRes.json());
      }
      setFirestoreState(fsStatus.state);
    } catch {
      // Keep graceful state
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview, lessons.length]);

  const fetchAcademicYears = useCallback(async () => {
    try {
      const res = await fetch('/api/academic-years');
      if (res.ok) {
        setAcademicYears(await res.json());
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!authToken) return;
    setUsersLoading(true);
    setUsersError('');
    try {
      const res = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setUsersError(data.error || 'Không thể tải danh sách tài khoản.');
      } else {
        setUsersList(data);
      }
    } catch {
      setUsersError('Lỗi kết nối khi tải danh sách tài khoản.');
    } finally {
      setUsersLoading(false);
    }
  }, [authToken]);

  const fetchSettings = useCallback(async () => {
    if (!authToken) return;
    setSettingsLoading(true);
    setSettingsMessage(null);
    try {
      const res = await fetch('/api/system/settings', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setSettingsMessage({ type: 'error', text: data.error || 'Không thể tải cấu hình hệ thống.' });
      } else {
        setSettings(data);
      }
    } catch {
      setSettingsMessage({ type: 'error', text: 'Lỗi kết nối khi tải cấu hình hệ thống.' });
    } finally {
      setSettingsLoading(false);
    }
  }, [authToken]);

  const fetchFilteredAuditLogs = useCallback(async () => {
    if (!authToken) return;
    setLoadingAudit(true);
    try {
      const params = new URLSearchParams();
      if (auditSearch.trim()) params.set('search', auditSearch.trim());
      if (auditStatusFilter !== 'all') params.set('status', auditStatusFilter);
      const res = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setFilteredAuditLogs(await res.json());
      }
    } catch {
      // fallback silently to existing prop logs
    } finally {
      setLoadingAudit(false);
    }
  }, [authToken, auditSearch, auditStatusFilter]);

  useEffect(() => {
    if (selectedTab === 'users') {
      fetchUsers();
    } else if (selectedTab === 'framework') {
      fetchAcademicYears();
    } else if (selectedTab === 'security') {
      fetchSettings();
    } else if (selectedTab === 'audit') {
      fetchFilteredAuditLogs();
    }
  }, [selectedTab, fetchUsers, fetchAcademicYears, fetchSettings, fetchFilteredAuditLogs]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!authToken) return;
    setUpdatingUserId(userId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ type: 'error', text: data.error || 'Không thể cập nhật vai trò.' });
      } else if (data.user) {
        setUsersList((prev) => prev.map((u) => (u.id === userId ? data.user : u)));
        setActionMessage({ type: 'success', text: `Đã cập nhật vai trò của ${data.user.email} thành "${newRole}".` });
        fetchOverview();
        if (onAuditLogsRefresh) onAuditLogsRefresh();
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Lỗi kết nối máy chủ khi phân quyền.' });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleTeacherApproval = async (userId: string, decision: 'approved' | 'rejected') => {
    if (!authToken) return;
    setUpdatingUserId(userId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/auth/users/${userId}/approve-teacher`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ type: 'error', text: data.error || 'Không thể cập nhật phê duyệt giáo viên.' });
      } else if (data.user) {
        setUsersList((prev) => prev.map((u) => (u.id === userId ? data.user : u)));
        setActionMessage({
          type: 'success',
          text:
            decision === 'approved'
              ? `Đã phê duyệt tài khoản giáo viên ${data.user.email}.`
              : `Đã từ chối quyền giáo viên cho ${data.user.email}.`,
        });
        fetchOverview();
        if (onAuditLogsRefresh) onAuditLogsRefresh();
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Lỗi kết nối máy chủ khi duyệt giáo viên.' });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !newLessonTitle.trim()) return;
    setCreatingLesson(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/curriculum/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: newLessonTitle.trim(),
          subjectId: newLessonSubject,
          grade: newLessonGrade,
          sourceBook: newLessonBook.trim(),
          docNumber: newLessonDocNum.trim(),
          summary: newLessonSummary.trim() || newLessonTitle.trim(),
          status: newLessonStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ type: 'error', text: data.error || 'Không thể tạo bài học mới.' });
      } else if (data.lesson) {
        onLessonCreated?.(data.lesson);
        setShowCreateLessonModal(false);
        setNewLessonTitle('');
        setNewLessonSummary('');
        setActionMessage({
          type: 'success',
          text: `Đã tạo bài học "${data.lesson.title}" (${data.lesson.status}) và lập chỉ mục vào kho RAG.`,
        });
        fetchOverview();
        if (onAuditLogsRefresh) onAuditLogsRefresh();
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Lỗi kết nối máy chủ khi tạo bài học.' });
    } finally {
      setCreatingLesson(false);
    }
  };

  const handleCreateAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !newYearName.trim()) return;
    setCreatingYear(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/academic-years', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: newYearName.trim(),
          startDate: newYearStart,
          endDate: newYearEnd,
          isActive: newYearActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionMessage({ type: 'error', text: data.error || 'Không thể thêm năm học.' });
      } else if (data.academicYear) {
        await fetchAcademicYears();
        setActionMessage({ type: 'success', text: `Đã tạo năm học "${data.academicYear.name}".` });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Lỗi kết nối máy chủ khi thêm năm học.' });
    } finally {
      setCreatingYear(false);
    }
  };

  const handleMigrateToFirestore = async () => {
    setMigratingFirestore(true);
    setActionMessage(null);
    try {
      const result = await migrateCurriculumToFirestore({
        subjects,
        lessons,
        exercises,
        academicYears,
      });
      setActionMessage({
        type: 'success',
        text: `Đã đồng bộ thành công ${result.migratedCount} bản ghi (Môn học, Bài học, Bài tập, Năm học) lên Cloud Firestore.`,
      });
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text:
          err?.message ||
          'Không thể đồng bộ lên Cloud Firestore. Vui lòng đăng nhập qua Google với tài khoản Quản trị viên (vulin1000@gmail.com).',
      });
    } finally {
      setMigratingFirestore(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !settings) return;
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const res = await fetch('/api/system/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        setSettingsMessage({ type: 'error', text: data.error || 'Không thể lưu cấu hình hệ thống.' });
      } else {
        setSettings(data.settings);
        setSettingsMessage({ type: 'success', text: 'Đã lưu cấu hình an toàn trẻ em và hệ thống thành công!' });
        if (onAuditLogsRefresh) onAuditLogsRefresh();
      }
    } catch {
      setSettingsMessage({ type: 'error', text: 'Lỗi kết nối máy chủ khi lưu cấu hình.' });
    } finally {
      setSettingsSaving(false);
    }
  };

  const verifiedCount = lessons.filter((l) => isLessonVerified(l.status)).length;
  const pendingCount = lessons.filter((l) => l.status === 'pending' || l.status === 'NEEDS_REVIEW').length;
  const unverifiedCount = lessons.filter(
    (l) => !isLessonVerified(l.status) && l.status !== 'pending' && l.status !== 'NEEDS_REVIEW'
  ).length;
  const filteredLessons =
    lessonFilterGrade === 'all' ? lessons : lessons.filter((l) => l.grade === lessonFilterGrade);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Admin Cockpit Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-purple-800/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
            <Shield className="w-4 h-4" />
            <span>HỆ THỐNG QUẢN TRỊ TRUNG ƯƠNG EDUBOT AI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display">
            Quản Trị Chương Trình GDPT & An Toàn Dữ Liệu
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Căn cứ pháp lý: Thông tư 32/2018/TT-BGDĐT, Thông tư 17/2025/TT-BGDĐT và chuẩn thẩm định học liệu số Lớp 1–5 năm 2026.
          </p>
        </div>

        {/* Real AI & System Status */}
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2 text-xs font-mono min-w-[290px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">AI Gateway:</span>
            {analytics?.aiStatus === 'active' ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Sẵn sàng ({analytics.aiModel})
              </span>
            ) : (
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {analytics ? 'Chưa cấu hình API Key' : 'Đang kiểm tra...'}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Cloud Firestore:</span>
            <span
              className={`font-bold ${
                firestoreState === 'connected'
                  ? 'text-emerald-400'
                  : firestoreState === 'offline'
                  ? 'text-amber-300'
                  : 'text-slate-300'
              }`}
            >
              {analytics?.persistenceMode === 'hybrid_firestore_and_api'
                ? firestoreState === 'connected'
                  ? `Đã kết nối (${firebaseProjectId})`
                  : `Hybrid (${firestoreState})`
                : 'In-Memory'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Tài khoản hệ thống:</span>
            <span className="text-cyan-300 font-bold">
              {analytics
                ? `${analytics.totalStudents} HS · ${analytics.totalTeachers} GV${
                    analytics.pendingTeachers ? ` (${analytics.pendingTeachers} chờ)` : ''
                  }`
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Navigation segmented buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedTab('curriculum')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            selectedTab === 'curriculum'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Thẩm định học liệu ({lessons.length})</span>
        </button>

        <button
          onClick={() => setSelectedTab('framework')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            selectedTab === 'framework'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Khung GDPT 2026 ({subjects.length} môn)</span>
        </button>

        <button
          onClick={() => setSelectedTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            selectedTab === 'users'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Tài khoản & Phân quyền</span>
        </button>

        <button
          onClick={() => setSelectedTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            selectedTab === 'audit'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Nhật ký kiểm toán ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setSelectedTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            selectedTab === 'security'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Cấu hình & An toàn Trẻ em</span>
        </button>
      </div>

      {/* Tab 1: Curriculum & Resource Verification */}
      {selectedTab === 'curriculum' && (
        <div className="space-y-6">
          {/* Stats strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                  {verifiedCount} Bài
                </div>
                <div className="text-xs text-slate-500">Đã thẩm định chính thức</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                  {pendingCount + unverifiedCount} Bài
                </div>
                <div className="text-xs text-slate-500">
                  {pendingCount} chờ duyệt · {unverifiedCount} chưa xác minh/nháp
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                  {subjects.length} Môn học
                </div>
                <div className="text-xs text-slate-500">Kho dữ liệu GDPT 2026</div>
              </div>
            </div>
          </div>

          {/* Lessons Table with Status Modification */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  Danh sách bài học trong Kho dữ liệu chuẩn GDPT
                </h2>
                <span className="text-xs text-slate-400">Quyền Admin: Tạo mới và cập nhật tình trạng thẩm định pháp lý</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  {(['all', 1, 2, 3, 4, 5] as const).map((g) => (
                    <button
                      key={String(g)}
                      onClick={() => setLessonFilterGrade(g)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        lessonFilterGrade === g
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {g === 'all' ? 'Tất cả' : `Lớp ${g}`}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowCreateLessonModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo bài học mới</span>
                </button>
              </div>
            </div>

            {filteredLessons.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                Chưa có bài học nào thuộc bộ lọc đã chọn.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Mã & Tên bài</th>
                      <th className="px-5 py-3.5">Khối & Môn</th>
                      <th className="px-5 py-3.5">Văn bản căn cứ</th>
                      <th className="px-5 py-3.5">Trạng thái thẩm định</th>
                      <th className="px-5 py-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLessons.map((l) => {
                      const verified = isLessonVerified(l.status);
                      const pending = l.status === 'pending' || l.status === 'NEEDS_REVIEW';
                      const draft = l.status === 'DRAFT' || l.status === 'ai_draft';
                      return (
                        <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-900 dark:text-white">{l.title}</div>
                            <div className="font-mono text-[10px] text-cyan-600 dark:text-cyan-400">{l.lessonCode}</div>
                          </td>
                          <td className="px-5 py-4">
                            Lớp {l.grade} · {l.subjectId.toUpperCase()}
                          </td>
                          <td className="px-5 py-4">
                            <div>{l.officialReference.docNumber}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{l.officialReference.curriculumVersion}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold inline-block ${
                                verified
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800'
                                  : pending
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 border border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {verified
                                ? 'Đã thẩm định'
                                : pending
                                ? 'Chờ duyệt'
                                : draft
                                ? 'Bản nháp'
                                : 'Chưa xác minh – cần bổ sung nguồn'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex gap-1.5">
                              {!verified && (
                                <button
                                  onClick={() => onUpdateLessonStatus(l.id, 'verified')}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors"
                                >
                                  Thẩm định
                                </button>
                              )}
                              {l.status !== 'unverified' && (
                                <button
                                  onClick={() => onUpdateLessonStatus(l.id, 'unverified')}
                                  className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-colors"
                                >
                                  Gắn nhãn chưa xác minh
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Curriculum Framework (GDPT 2026) & Academic Years & Firestore Sync */}
      {selectedTab === 'framework' && (
        <div className="space-y-6">
          {/* Cloud Firestore Migration Bar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CloudUpload className="w-4 h-4 text-cyan-600" />
                <span>Đồng bộ Kho học liệu GDPT lên Cloud Firestore</span>
              </div>
              <p className="text-xs text-slate-500">
                Ghi danh mục Môn học ({subjects.length}), Bài học ({lessons.length}), Bài tập ({exercises.length}) và Năm học ({academicYears.length}) vào cơ sở dữ liệu Firebase Enterprise.
              </p>
            </div>
            <button
              onClick={handleMigrateToFirestore}
              disabled={migratingFirestore}
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
            >
              <CloudUpload className="w-4 h-4" />
              <span>{migratingFirestore ? 'Đang đồng bộ...' : 'Đồng bộ Cloud Firestore'}</span>
            </button>
          </div>

          {/* Academic Years Management */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Quản lý Năm học (Academic Years)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                {academicYears.length === 0 ? (
                  <p className="text-xs text-slate-500">Đang tải danh sách năm học...</p>
                ) : (
                  academicYears.map((ay) => (
                    <div
                      key={ay.id}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{ay.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {ay.startDate} → {ay.endDate}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          ay.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {ay.isActive ? 'Đang áp dụng' : 'Lưu trữ'}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={handleCreateAcademicYear}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs"
              >
                <div className="font-semibold text-slate-900 dark:text-white">Thêm năm học mới</div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={newYearName}
                    onChange={(e) => setNewYearName(e.target.value)}
                    placeholder="2026 - 2027"
                    className="col-span-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                  <input
                    type="date"
                    value={newYearStart}
                    onChange={(e) => setNewYearStart(e.target.value)}
                    className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                  <input
                    type="date"
                    value={newYearEnd}
                    onChange={(e) => setNewYearEnd(e.target.value)}
                    className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newYearActive}
                      onChange={(e) => setNewYearActive(e.target.checked)}
                    />
                    <span>Kích hoạt</span>
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={creatingYear}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold"
                >
                  {creatingYear ? 'Đang tạo...' : 'Thêm năm học'}
                </button>
              </form>
            </div>
          </div>

          {/* Subjects Matrix */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Cấu trúc Môn học & Phân bổ Khối lớp (CTGDPT 2018 / Cập nhật 2026)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Danh mục các môn học chính thức trong kho dữ liệu học liệu tiểu học (Lớp 1 đến Lớp 5).
              </p>
            </div>

            {subjects.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Chưa tải được danh mục môn học từ máy chủ.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((sub) => {
                  const subLessonsCount = lessons.filter((l) => l.subjectId === sub.id).length;
                  return (
                    <div
                      key={sub.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{sub.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold">
                          {sub.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{sub.description}</p>
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Khối: Lớp {sub.grades.join(', ')}</span>
                        <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                          {subLessonsCount} bài học
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Users & RBAC Management */}
      {selectedTab === 'users' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Quản lý Tài khoản, Duyệt Giáo viên & Phân quyền (RBAC)
              </h2>
              <p className="text-xs text-slate-400">
                Phê duyệt tài khoản giáo viên mới và kiểm soát vai trò Học sinh, Giáo viên, Quản trị viên.
              </p>
            </div>
            <button
              onClick={fetchUsers}
              disabled={usersLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>

          {usersError && (
            <div className="m-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
              {usersError}
            </div>
          )}

          {usersLoading ? (
            <div className="p-10 text-center text-xs text-slate-500">Đang tải danh sách tài khoản...</div>
          ) : usersList.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">Chưa có tài khoản nào trong hệ thống.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Họ tên & Email</th>
                    <th className="px-5 py-3.5">Trường / Khối</th>
                    <th className="px-5 py-3.5">Vai trò & Duyệt GV</th>
                    <th className="px-5 py-3.5 text-right">Phân quyền & Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{u.name}</div>
                        <div className="font-mono text-[11px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div>{u.school || '—'}</div>
                        {u.role === 'student' && u.grade && (
                          <div className="text-[11px] text-cyan-600 dark:text-cyan-400">
                            Lớp {u.grade} · {u.xp || 0} XP
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 space-y-1">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase inline-block ${
                            u.role === 'admin'
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800'
                              : u.role === 'teacher'
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800'
                              : 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800'
                          }`}
                        >
                          {u.role === 'admin' ? 'Admin' : u.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                        </span>
                        {u.role === 'teacher' && (
                          <div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold inline-block ${
                                u.teacherApprovalStatus === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                                  : u.teacherApprovalStatus === 'rejected'
                                  ? 'bg-red-50 text-red-700 dark:bg-red-950/40'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40'
                              }`}
                            >
                              {u.teacherApprovalStatus === 'approved'
                                ? 'Đã duyệt GV'
                                : u.teacherApprovalStatus === 'rejected'
                                ? 'Bị từ chối'
                                : 'Chờ duyệt GV'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-2">
                          {u.role === 'teacher' && u.teacherApprovalStatus !== 'approved' && (
                            <button
                              onClick={() => handleTeacherApproval(u.id, 'approved')}
                              disabled={updatingUserId === u.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Duyệt GV</span>
                            </button>
                          )}
                          {u.role === 'teacher' && u.teacherApprovalStatus !== 'rejected' && (
                            <button
                              onClick={() => handleTeacherApproval(u.id, 'rejected')}
                              disabled={updatingUserId === u.id}
                              className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Từ chối</span>
                            </button>
                          )}
                          <select
                            aria-label={`Đổi vai trò cho ${u.email}`}
                            value={u.role}
                            disabled={updatingUserId === u.id}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-purple-500"
                          >
                            <option value="student">Học sinh</option>
                            <option value="teacher">Giáo viên</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {selectedTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Nhật ký kiểm toán hoạt động hệ thống (Audit Trail)
              </h2>
              <span className="text-xs text-slate-400">
                Lưu vết mọi thao tác xác thực, phân quyền, AI và học liệu
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Lọc hành động, email..."
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>
              <select
                value={auditStatusFilter}
                onChange={(e) => setAuditStatusFilter(e.target.value as 'all' | 'success' | 'warning' | 'info')}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              >
                <option value="all">Tất cả mức</option>
                <option value="success">Success</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
              </select>
              <button
                onClick={fetchFilteredAuditLogs}
                disabled={loadingAudit}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {filteredAuditLogs.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Không tìm thấy bản ghi nhật ký kiểm toán phù hợp.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Hành động</th>
                    <th className="px-5 py-3.5">Người thực hiện</th>
                    <th className="px-5 py-3.5">Vai trò</th>
                    <th className="px-5 py-3.5">Chi tiết</th>
                    <th className="px-5 py-3.5">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">{log.action}</td>
                      <td className="px-5 py-4">{log.user}</td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400">{log.role}</span>
                      </td>
                      <td className="px-5 py-4 max-w-sm text-slate-700 dark:text-slate-300">{log.details}</td>
                      <td className="px-5 py-4 font-mono text-slate-400">
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Security & Child Safety Policy + Live Settings */}
      {selectedTab === 'security' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveSettings}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-500" />
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                    Cấu hình Hệ thống & Bộ lọc An toàn Trẻ em
                  </h2>
                  <p className="text-xs text-slate-400">Áp dụng trực tiếp lên luồng AI Gia sư và chính sách lưu trữ.</p>
                </div>
              </div>
              <button
                type="submit"
                disabled={settingsSaving || !settings}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{settingsSaving ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
              </button>
            </div>

            {settingsMessage && (
              <div
                className={`p-3 rounded-xl border text-xs ${
                  settingsMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                }`}
              >
                {settingsMessage.text}
              </div>
            )}

            {settingsLoading || !settings ? (
              <div className="py-6 text-center text-xs text-slate-500">Đang tải cấu hình hệ thống...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.childSafetyFilterEnabled}
                    onChange={(e) => setSettings({ ...settings, childSafetyFilterEnabled: e.target.checked })}
                    className="mt-0.5 rounded text-purple-600"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      Bộ lọc An toàn Trẻ em (Child Safety Guardrail)
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      Cảnh báo và từ chối nội dung không phù hợp lứa tuổi tiểu học, không thu thập PII nhạy cảm.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.parentalConsentRequired}
                    onChange={(e) => setSettings({ ...settings, parentalConsentRequired: e.target.checked })}
                    className="mt-0.5 rounded text-purple-600"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      Yêu cầu xác nhận của Phụ huynh khi đăng ký
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      Tuân thủ Nghị định 13/2023/NĐ-CP bảo vệ dữ liệu cá nhân trẻ em.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer md:col-span-2">
                  <input
                    type="checkbox"
                    checked={settings.leaderboardEnabled}
                    onChange={(e) => setSettings({ ...settings, leaderboardEnabled: e.target.checked })}
                    className="mt-0.5 rounded text-purple-600"
                  />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      Cho phép Bảng xếp hạng học sinh (mặc định tắt để tránh áp lực thi đua)
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      Khi tắt, học sinh chỉ tập trung tiến bộ cá nhân (XP, chuỗi ngày học và huy hiệu cá nhân).
                    </div>
                  </div>
                </label>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Chuẩn chương trình đang áp dụng
                  </label>
                  <input
                    type="text"
                    value={settings.curriculumStandard}
                    onChange={(e) => setSettings({ ...settings, curriculumStandard: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Thời hạn lưu trữ (ngày)
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={3650}
                      value={settings.dataRetentionDays}
                      onChange={(e) => setSettings({ ...settings, dataRetentionDays: Number(e.target.value) || 365 })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Năm phiên bản GDPT
                    </label>
                    <input
                      type="number"
                      min={2018}
                      max={2035}
                      value={settings.curriculumVersionYear}
                      onChange={(e) => setSettings({ ...settings, curriculumVersionYear: Number(e.target.value) || 2026 })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>
              </div>
            )}
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white font-display">
                <Lock className="w-4 h-4 text-purple-500" />
                <span>Chính sách Bảo vệ Dữ liệu Cá nhân Trẻ em</span>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 leading-relaxed list-disc list-inside">
                <li>Tuân thủ Luật Trẻ em Việt Nam và Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.</li>
                <li>Mật khẩu người dùng được băm bằng thuật toán scrypt kèm salt ngẫu nhiên, không lưu dạng thô.</li>
                <li>Bộ lọc AI nhắc nhở an toàn lứa tuổi và chặn hỏi thông tin cá nhân nhạy cảm của học sinh.</li>
                <li>
                  Dữ liệu vận hành theo kiến trúc Hybrid: Cloud Firestore Enterprise kết hợp Express API có RBAC/Security Rules và nút đồng bộ kho học liệu cho Admin.
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white font-display">
                <Cpu className="w-4 h-4 text-cyan-500" />
                <span>Kiến trúc RAG 10 bước & Giới hạn Thẩm định</span>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 leading-relaxed list-disc list-inside">
                <li>Gia sư AI EduBot truy xuất ngữ cảnh ưu tiên từ kho bài học có trạng thái đã thẩm định (verified/APPROVED).</li>
                <li>Nếu không tìm thấy tài liệu phù hợp trong kho kiến thức chuẩn, AI thông báo giới hạn và hướng dẫn hỏi thầy cô.</li>
                <li>Mọi thao tác phân quyền, thẩm định học liệu và gọi AI đều được ghi vào Nhật ký kiểm toán.</li>
                <li>Không trả về câu trả lời AI giả mạo khi dịch vụ Gemini gặp lỗi hoặc thiếu API Key.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Lesson */}
      {showCreateLessonModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                Thêm Bài Học Mới vào Kho GDPT
              </h3>
              <button
                onClick={() => setShowCreateLessonModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Tên bài học *</label>
                <input
                  type="text"
                  required
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder="Ví dụ: Phép cộng trong phạm vi 100 000"
                  className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Môn học</label>
                  <select
                    value={newLessonSubject}
                    onChange={(e) => setNewLessonSubject(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Khối lớp</label>
                  <select
                    value={newLessonGrade}
                    onChange={(e) => setNewLessonGrade(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>
                        Lớp {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Bộ sách / Nguồn</label>
                  <input
                    type="text"
                    value={newLessonBook}
                    onChange={(e) => setNewLessonBook(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Văn bản căn cứ</label>
                  <input
                    type="text"
                    value={newLessonDocNum}
                    onChange={(e) => setNewLessonDocNum(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Tóm tắt kiến thức trọng tâm</label>
                <textarea
                  rows={3}
                  value={newLessonSummary}
                  onChange={(e) => setNewLessonSummary(e.target.value)}
                  placeholder="Mô tả ngắn gọn nội dung bài học..."
                  className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Trạng thái ban đầu</label>
                <select
                  value={newLessonStatus}
                  onChange={(e) => setNewLessonStatus(e.target.value as 'DRAFT' | 'NEEDS_REVIEW')}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <option value="NEEDS_REVIEW">NEEDS_REVIEW (Chờ đối chiếu thẩm định)</option>
                  <option value="DRAFT">DRAFT (Bản nháp)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateLessonModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingLesson}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold"
                >
                  {creatingLesson ? 'Đang tạo...' : 'Tạo bài học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
