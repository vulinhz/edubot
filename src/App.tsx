/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  User,
  UserRole,
  CurriculumSubject,
  Lesson,
  ExerciseSet,
  ClassRoom,
  Assignment,
  StudentSubmission,
  AiDraftItem,
  AuditLog,
  ResourceStatus,
  KnowledgeNode,
  LearningProgress,
  CurriculumTopic,
  WrongQuestionStat,
  SystemSettings,
} from './types/index.ts';
import {
  auth,
  testFirestoreConnection,
  signOutFirebase,
  resendFirebaseVerificationEmail,
  mapFirebaseAuthError,
} from './lib/firebase.ts';
import { Navbar } from './components/Navbar.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { StudentDashboard } from './components/student/StudentDashboard.tsx';
import { LearningLibrary } from './components/student/LearningLibrary.tsx';
import { LessonViewer } from './components/student/LessonViewer.tsx';
import { ExerciseRunner } from './components/student/ExerciseRunner.tsx';
import { EduBotTutorChat } from './components/student/EduBotTutorChat.tsx';
import { GamificationJourney } from './components/student/GamificationJourney.tsx';
import { KnowledgeMap } from './components/student/KnowledgeMap.tsx';
import { TeacherDashboard } from './components/teacher/TeacherDashboard.tsx';
import { AiLessonPlanner } from './components/teacher/AiLessonPlanner.tsx';
import { AiKnowledgeStandardizer } from './components/teacher/AiKnowledgeStandardizer.tsx';
import { AiQuizGenerator } from './components/teacher/AiQuizGenerator.tsx';
import { AssignmentManager } from './components/teacher/AssignmentManager.tsx';
import { ContentReviewer } from './components/teacher/ContentReviewer.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { PrivacyCenterModal } from './components/privacy/PrivacyCenterModal.tsx';
import {
  PlayCircle,
  Lock,
  LogIn,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

const TOKEN_STORAGE_KEY = 'edubot_token';
const TOKEN_SOURCE_KEY = 'edubot_auth_source';

const TAB_TO_PATH: Record<string, string> = {
  landing: '/',
  dashboard: '/dashboard',
  lessons: '/lessons',
  exercises: '/exercises',
  tutor: '/tutor',
  journey: '/journey',
  'knowledge-map': '/knowledge-map',
  'teacher-overview': '/teacher',
  'ai-planner': '/teacher/planner',
  'ai-standardize': '/teacher/standardizer',
  'ai-quiz': '/teacher/quiz',
  'assignment-manager': '/teacher/assignments',
  'review-drafts': '/teacher/review',
  'admin-overview': '/admin',
  'curriculum-manager': '/admin/curriculum',
  'learning-resources': '/admin/resources',
  'audit-logs': '/admin/audit',
};

function pathToTab(pathname: string): string {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const found = Object.entries(TAB_TO_PATH).find(([, p]) => p === clean);
  return found ? found[0] : 'landing';
}

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(Boolean(authToken));

  const [selectedGrade, setSelectedGrade] = useState<number>(4);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return pathToTab(window.location.pathname);
    }
    return 'landing';
  });
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  // Backend & Firestore state
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [exercises, setExercises] = useState<ExerciseSet[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [learningProgress, setLearningProgress] = useState<LearningProgress[]>([]);
  const [favoriteLessonIds, setFavoriteLessonIds] = useState<string[]>([]);
  const [lastOpenedLessonId, setLastOpenedLessonId] = useState<string | null>(null);
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestionStat[]>([]);
  const [recommendedReviewLessons, setRecommendedReviewLessons] = useState<
    { id: string; title: string; subjectId: string; grade: number; estimatedDuration?: number }[]
  >([]);
  const [drafts, setDrafts] = useState<AiDraftItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [knowledgeNodes, setKnowledgeNodes] = useState<KnowledgeNode[]>([]);
  const [systemPolicy, setSystemPolicy] = useState<{
    childSafetyFilterEnabled?: boolean;
    parentalConsentRequired: boolean;
    leaderboardEnabled: boolean;
    curriculumStandard: string;
    textbookSeries?: string;
    textbookSeriesLabel?: string;
  } | null>(null);

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [suggestedRole, setSuggestedRole] = useState<UserRole | undefined>(undefined);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [appBannerError, setAppBannerError] = useState<string>('');
  const [verificationNotice, setVerificationNotice] = useState<string>('');
  const [emailUnverifiedBanner, setEmailUnverifiedBanner] = useState<boolean>(false);

  // Navigation targets
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeExerciseSetId, setActiveExerciseSetId] = useState<string | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | undefined>(undefined);
  const [tutorInitialLesson, setTutorInitialLesson] = useState<{ id?: string; title?: string }>({});

  const navigateTab = useCallback((tab: string, updateHistory = true) => {
    setActiveTab(tab);
    if (updateHistory && typeof window !== 'undefined') {
      const targetPath = TAB_TO_PATH[tab];
      if (targetPath && window.location.pathname !== targetPath) {
        try {
          window.history.pushState({ tab }, '', targetPath);
        } catch {
          // ignore history errors in sandboxed iframes
        }
      }
    }
  }, []);

  // Listen to browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(pathToTab(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync dark mode class with root html
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Verify Firestore connection & load public school policy on startup
  useEffect(() => {
    testFirestoreConnection().catch(() => {});
    fetch('/api/system/public-policy')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSystemPolicy(data);
      })
      .catch(() => {});
  }, []);

  // Keep Firebase ID Token fresh if signed in via Firebase Auth
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      let source = 'local';
      try {
        source = localStorage.getItem(TOKEN_SOURCE_KEY) || 'local';
      } catch {
        source = 'local';
      }
      if (firebaseUser && source === 'firebase') {
        setEmailUnverifiedBanner(!firebaseUser.emailVerified);
        try {
          const freshToken = await firebaseUser.getIdToken();
          localStorage.setItem(TOKEN_STORAGE_KEY, freshToken);
          setAuthToken(freshToken);
        } catch {
          // ignore refresh errors
        }
      } else {
        setEmailUnverifiedBanner(false);
      }
    });
    return () => unsub();
  }, []);

  // Restore session safely (waits for Firebase Auth readiness to avoid premature 401 token wipes)
  useEffect(() => {
    if (!authToken) {
      setIsRestoringSession(false);
      return;
    }
    let cancelled = false;
    async function restoreSession() {
      try {
        let tokenToVerify = authToken;
        let source = 'local';
        try {
          source = localStorage.getItem(TOKEN_SOURCE_KEY) || 'local';
        } catch {
          source = 'local';
        }

        if (source === 'firebase' && auth) {
          await auth.authStateReady();
          if (auth.currentUser) {
            setEmailUnverifiedBanner(!auth.currentUser.emailVerified);
            tokenToVerify = await auth.currentUser.getIdToken(true);
            try {
              localStorage.setItem(TOKEN_STORAGE_KEY, tokenToVerify);
            } catch {
              // ignore storage write error
            }
            if (!cancelled) setAuthToken(tokenToVerify);
          } else {
            throw new Error('Phiên Firebase đã kết thúc');
          }
        }

        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${tokenToVerify}` },
        });
        if (!res.ok) {
          throw new Error('Phiên đăng nhập không hợp lệ');
        }
        const data = await res.json();
        if (!cancelled && data.user) {
          setCurrentUser(data.user);
          if (data.user.grade) {
            setSelectedGrade(data.user.grade);
          }
          const currentPathTab = pathToTab(window.location.pathname);
          if (currentPathTab === 'landing') {
            navigateTab(
              data.user.role === 'student'
                ? 'dashboard'
                : data.user.role === 'teacher'
                ? 'teacher-overview'
                : 'admin-overview',
              false
            );
          }
        }
      } catch {
        if (!cancelled) {
          try {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(TOKEN_SOURCE_KEY);
          } catch {
            // ignore storage errors
          }
          setAuthToken(null);
          setCurrentUser(null);
          navigateTab('landing', false);
        }
      } finally {
        if (!cancelled) {
          setIsRestoringSession(false);
        }
      }
    }
    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []); // Run once on mount; login/logout update state explicitly

  // Public curriculum & per-student knowledge map loading
  useEffect(() => {
    const isStaff = currentUser?.role === 'teacher' || currentUser?.role === 'admin';
    const gradeQuery = isStaff ? '' : `?grade=${selectedGrade}`;
    const authHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;

    async function loadPublicData() {
      try {
        const [subRes, topRes, lesRes, exRes, knwRes] = await Promise.all([
          fetch(`/api/curriculum/subjects${gradeQuery}`),
          fetch(`/api/curriculum/topics${gradeQuery}`),
          fetch(`/api/curriculum/lessons${gradeQuery}`),
          fetch(`/api/exercises${gradeQuery}`),
          fetch('/api/knowledge-map', { headers: authHeaders }),
        ]);

        if (subRes.ok) setSubjects(await subRes.json());
        if (topRes.ok) setTopics(await topRes.json());
        if (lesRes.ok) setLessons(await lesRes.json());
        if (exRes.ok) setExercises(await exRes.json());
        if (knwRes.ok) setKnowledgeNodes(await knwRes.json());
      } catch (err) {
        console.error('Failed to load public curriculum data:', err);
      }
    }
    loadPublicData();
  }, [selectedGrade, currentUser?.role, authToken, submissions.length, learningProgress.length]);

  const refreshWrongQuestions = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/analytics/wrong-questions', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWrongQuestions(data.wrongQuestions || []);
        setRecommendedReviewLessons(data.recommendedLessons || []);
      }
    } catch {
      // ignore
    }
  }, [authToken]);

  // Authenticated role-scoped loading
  const loadAuthenticatedData = useCallback(async () => {
    if (!authToken || !currentUser) {
      setClasses([]);
      setAssignments([]);
      setSubmissions([]);
      setLearningProgress([]);
      setFavoriteLessonIds([]);
      setLastOpenedLessonId(null);
      setWrongQuestions([]);
      setRecommendedReviewLessons([]);
      setDrafts([]);
      setAuditLogs([]);
      return;
    }

    const headers = { Authorization: `Bearer ${authToken}` };
    const isStaff = currentUser.role === 'teacher' || currentUser.role === 'admin';
    const assignQuery = isStaff ? '' : `?grade=${selectedGrade}`;

    try {
      const classesP = fetch('/api/classes', { headers });
      const assignmentsP = fetch(`/api/assignments${assignQuery}`, { headers });
      const submissionsP = fetch('/api/submissions', { headers });
      const progressP =
        currentUser.role === 'student'
          ? fetch('/api/learning-progress', { headers })
          : Promise.resolve(null);
      const favoritesP =
        currentUser.role === 'student' ? fetch('/api/favorites', { headers }) : Promise.resolve(null);
      const lastOpenedP =
        currentUser.role === 'student'
          ? fetch('/api/learning-progress/last-opened', { headers })
          : Promise.resolve(null);
      const wrongP = fetch('/api/analytics/wrong-questions', { headers });
      const draftsP = isStaff ? fetch('/api/ai/drafts', { headers }) : Promise.resolve(null);
      const auditP =
        currentUser.role === 'admin' ? fetch('/api/audit-logs', { headers }) : Promise.resolve(null);

      const [classesRes, assignRes, subRes, progRes, favRes, lastRes, wrongRes, draftsRes, auditRes] =
        await Promise.all([
          classesP,
          assignmentsP,
          submissionsP,
          progressP,
          favoritesP,
          lastOpenedP,
          wrongP,
          draftsP,
          auditP,
        ]);

      if (classesRes.ok) setClasses(await classesRes.json());
      if (assignRes.ok) setAssignments(await assignRes.json());
      if (subRes.ok) setSubmissions(await subRes.json());
      if (progRes && progRes.ok) setLearningProgress(await progRes.json());
      if (favRes && favRes.ok) {
        const favData = await favRes.json();
        setFavoriteLessonIds(favData.lessonIds || []);
      }
      if (lastRes && lastRes.ok) {
        const lastData = await lastRes.json();
        setLastOpenedLessonId(lastData?.lessonId || null);
      }
      if (wrongRes && wrongRes.ok) {
        const wrongData = await wrongRes.json();
        setWrongQuestions(wrongData.wrongQuestions || []);
        setRecommendedReviewLessons(wrongData.recommendedLessons || []);
      }
      if (draftsRes && draftsRes.ok) setDrafts(await draftsRes.json());
      else setDrafts([]);
      if (auditRes && auditRes.ok) setAuditLogs(await auditRes.json());
      else setAuditLogs([]);
    } catch (err) {
      console.error('Failed to fetch authenticated data:', err);
    }
  }, [authToken, currentUser, selectedGrade]);

  useEffect(() => {
    loadAuthenticatedData();
  }, [loadAuthenticatedData]);

  const handleOpenAuth = (mode: 'login' | 'register' = 'login', roleHint?: UserRole) => {
    setAuthMode(mode);
    setSuggestedRole(roleHint);
    setShowAuthModal(true);
  };

  const handleAuthSuccess = (user: User, token: string, source: 'local' | 'firebase' = 'local') => {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(TOKEN_SOURCE_KEY, source);
    } catch {
      // ignore storage failure
    }
    setAuthToken(token);
    setCurrentUser(user);
    setAppBannerError('');
    if (user.grade) {
      setSelectedGrade(user.grade);
    }
    if (user.role === 'student') navigateTab('dashboard');
    else if (user.role === 'teacher') navigateTab('teacher-overview');
    else navigateTab('admin-overview');
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        // Proceed with client logout regardless
      }
    }
    try {
      await signOutFirebase();
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_SOURCE_KEY);
    } catch {
      // ignore
    }
    setAuthToken(null);
    setCurrentUser(null);
    setClasses([]);
    setAssignments([]);
    setSubmissions([]);
    setLearningProgress([]);
    setFavoriteLessonIds([]);
    setLastOpenedLessonId(null);
    setWrongQuestions([]);
    setRecommendedReviewLessons([]);
    setDrafts([]);
    setAuditLogs([]);
    navigateTab('landing');
  };

  const handleLandingEnterRole = (role: UserRole, grade?: number) => {
    if (currentUser && currentUser.role === role) {
      if (role === 'student' && grade) {
        setSelectedGrade(grade);
      }
      navigateTab(
        role === 'student' ? 'dashboard' : role === 'teacher' ? 'teacher-overview' : 'admin-overview'
      );
      return;
    }
    if (role === 'student' && grade) {
      setSelectedGrade(grade);
    }
    handleOpenAuth('login', role);
  };

  const handleOpenLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    setLastOpenedLessonId(lessonId);
    setActiveTab('lesson-detail');
  };

  const handleToggleFavorite = async (lessonId: string) => {
    const isFav = favoriteLessonIds.includes(lessonId);
    if (!authToken) {
      setFavoriteLessonIds((prev) =>
        isFav ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
      );
      return;
    }
    try {
      const res = await fetch(isFav ? `/api/favorites/${lessonId}` : '/api/favorites', {
        method: isFav ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: isFav ? undefined : JSON.stringify({ lessonId }),
      });
      if (res.ok) {
        const data = await res.json();
        setFavoriteLessonIds(data.lessonIds || []);
      }
    } catch {
      // fallback gracefully
    }
  };

  const handleOpenExercise = (exerciseSetId: string, assignmentId?: string) => {
    setActiveExerciseSetId(exerciseSetId);
    setActiveAssignmentId(assignmentId);
    setActiveTab('exercise-runner');
  };

  const handleAskAiAboutLesson = (title: string, id: string) => {
    setTutorInitialLesson({ id, title });
    if (!currentUser) {
      handleOpenAuth('login', 'student');
      return;
    }
    navigateTab('tutor');
  };

  const handleCreateClass = async (name: string, grade: number) => {
    if (!authToken) return;
    setAppBannerError('');
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name, grade }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAppBannerError(data.error || 'Không thể tạo lớp học mới.');
        return;
      }
      if (data.success && data.class) {
        setClasses((prev) => [data.class, ...prev]);
      }
    } catch {
      setAppBannerError('Lỗi kết nối máy chủ khi tạo lớp học.');
    }
  };

  const handleUpdateLessonStatus = async (lessonId: string, status: ResourceStatus) => {
    if (!authToken) return;
    setAppBannerError('');
    try {
      const res = await fetch(`/api/curriculum/lessons/${lessonId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAppBannerError(data.error || 'Không thể cập nhật trạng thái bài học.');
        return;
      }
      if (data.success && data.lesson) {
        setLessons((prev) => prev.map((l) => (l.id === lessonId ? data.lesson : l)));
        if (currentUser?.role === 'admin') {
          const audRes = await fetch('/api/audit-logs', {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (audRes.ok) setAuditLogs(await audRes.json());
        }
      }
    } catch {
      setAppBannerError('Lỗi kết nối máy chủ khi thẩm định bài học.');
    }
  };

  const handleDraftStatusChange = async (
    draftId: string,
    status: 'approved' | 'rejected' | 'published',
    notes?: string,
    editedContent?: any
  ) => {
    if (!authToken) return;
    setAppBannerError('');
    try {
      const res = await fetch(`/api/ai/drafts/${draftId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status, teacherNotes: notes, editedContent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAppBannerError(data.error || 'Không thể cập nhật kiểm duyệt bản nháp.');
        return;
      }
      if (data.success && data.draft) {
        setDrafts((prev) => prev.map((d) => (d.id === draftId ? data.draft : d)));
      }
    } catch {
      setAppBannerError('Lỗi kết nối máy chủ khi duyệt bản nháp AI.');
    }
  };

  const refreshAuditLogs = useCallback(async () => {
    if (!authToken || currentUser?.role !== 'admin') return;
    try {
      const res = await fetch('/api/audit-logs', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setAuditLogs(await res.json());
      }
    } catch {
      // ignore
    }
  }, [authToken, currentUser?.role]);

  const activeLesson = lessons.find((l) => l.id === activeLessonId) || lessons[0];
  const activeExercise = exercises.find((e) => e.id === activeExerciseSetId) || exercises[0];
  const activeGradedSubmission =
    activeAssignmentId && currentUser
      ? submissions.find(
          (s) => s.assignmentId === activeAssignmentId && s.studentId === currentUser.id && s.status === 'graded'
        ) || null
      : null;

  const filteredExercises = exercises.filter(
    (ex) => selectedSubjectFilter === 'all' || ex.subjectId === selectedSubjectFilter
  );

  const canViewLearningHub = !currentUser || currentUser.role === 'student';
  const isTeacherRoute = [
    'teacher-overview',
    'ai-planner',
    'ai-standardize',
    'ai-quiz',
    'assignment-manager',
    'review-drafts',
  ].includes(activeTab);
  const isAdminRoute = [
    'admin-overview',
    'curriculum-manager',
    'learning-resources',
    'audit-logs',
  ].includes(activeTab);

  const handleResendVerification = async () => {
    setVerificationNotice('');
    try {
      const sent = await resendFirebaseVerificationEmail();
      setVerificationNotice(
        sent
          ? `Đã gửi lại email xác minh tới ${auth?.currentUser?.email || currentUser?.email}. Vui lòng kiểm tra hộp thư.`
          : 'Email của bạn đã được xác minh.'
      );
      if (!sent) setEmailUnverifiedBanner(false);
    } catch (err) {
      setAppBannerError(mapFirebaseAuthError(err, 'Không thể gửi lại email xác minh.'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Bar Navigation */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={(tab) => {
          navigateTab(tab);
          if (tab === 'lessons') setActiveLessonId(null);
          if (tab === 'exercises') setActiveExerciseSetId(null);
        }}
        selectedGrade={selectedGrade}
        onGradeChange={(g) => setSelectedGrade(g)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {appBannerError && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{appBannerError}</span>
            </div>
            <button
              onClick={() => setAppBannerError('')}
              className="font-semibold underline hover:no-underline"
            >
              Đóng
            </button>
          </div>
        )}

        {currentUser && emailUnverifiedBanner && (
          <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                {verificationNotice ||
                  'Email của bạn chưa được xác minh trên Firebase Auth. Hãy kiểm tra hộp thư để mở khóa đồng bộ Cloud Firestore đầy đủ.'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleResendVerification}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shrink-0 self-start sm:self-auto"
            >
              Gửi lại email xác minh
            </button>
          </div>
        )}

        {isRestoringSession && (
          <div className="py-12 text-center text-xs text-slate-500">
            Đang khôi phục phiên làm việc an toàn...
          </div>
        )}

        {/* ================= LANDING PAGE VIEW ================= */}
        {!isRestoringSession && activeTab === 'landing' && (
          <LandingPage
            onEnterRole={handleLandingEnterRole}
            onOpenAuth={handleOpenAuth}
            onExploreCurriculum={() => {
              setSelectedSubjectFilter('all');
              navigateTab('lessons');
            }}
          />
        )}

        {/* ================= GUEST / STUDENT LEARNING VIEWS ================= */}
        {!isRestoringSession && canViewLearningHub && (
          <>
            {activeTab === 'dashboard' && currentUser && (
              <StudentDashboard
                user={currentUser}
                subjects={subjects}
                assignments={assignments}
                lessons={lessons}
                submissions={submissions}
                learningProgress={learningProgress}
                lastOpenedLessonId={lastOpenedLessonId}
                recommendedReviewLessons={recommendedReviewLessons}
                onSelectSubject={(subId) => {
                  setSelectedSubjectFilter(subId);
                  navigateTab('lessons');
                }}
                onOpenLesson={handleOpenLesson}
                onOpenExercise={handleOpenExercise}
                onOpenTutor={() => navigateTab('tutor')}
                onOpenJourney={() => navigateTab('journey')}
                onOpenKnowledgeMap={() => navigateTab('knowledge-map')}
                onOpenPrivacy={() => setShowPrivacyModal(true)}
              />
            )}

            {activeTab === 'lessons' && (
              <LearningLibrary
                selectedGrade={selectedGrade}
                onGradeChange={(g) => setSelectedGrade(g)}
                subjects={subjects}
                topics={topics}
                lessons={lessons}
                learningProgress={learningProgress}
                favoriteLessonIds={favoriteLessonIds}
                lastOpenedLessonId={lastOpenedLessonId}
                recommendedReviewLessons={recommendedReviewLessons}
                wrongQuestions={wrongQuestions}
                textbookSeriesLabel={systemPolicy?.textbookSeriesLabel}
                onToggleFavorite={handleToggleFavorite}
                onOpenLesson={handleOpenLesson}
              />
            )}

            {activeTab === 'lesson-detail' && activeLesson && (
              <LessonViewer
                lesson={activeLesson}
                subjectName={subjects.find((s) => s.id === activeLesson.subjectId)?.name}
                hasMatchingExercise={Boolean(exercises.find((e) => e.lessonId === activeLesson.id))}
                isCompleted={learningProgress.some((p) => p.lessonId === activeLesson.id && p.completed)}
                isFavorite={favoriteLessonIds.includes(activeLesson.id)}
                authToken={authToken}
                onBack={() => navigateTab('lessons')}
                onOpenExercise={(lId) => {
                  const matched = exercises.find((e) => e.lessonId === lId);
                  if (matched) {
                    handleOpenExercise(matched.id);
                  } else {
                    navigateTab('exercises');
                  }
                }}
                onAskAi={handleAskAiAboutLesson}
                onToggleFavorite={handleToggleFavorite}
                onLessonOpened={(lId) => setLastOpenedLessonId(lId)}
                onProgressUpdated={(lessonId, xpEarned) => {
                  if (xpEarned > 0) {
                    setCurrentUser((u) => (u ? { ...u, xp: (u.xp || 0) + xpEarned } : u));
                  }
                  setLearningProgress((prev) => {
                    const exists = prev.find((p) => p.lessonId === lessonId);
                    if (exists) {
                      return prev.map((p) => (p.lessonId === lessonId ? { ...p, completed: true } : p));
                    }
                    return [
                      ...prev,
                      {
                        id: `lp-${Date.now()}`,
                        studentId: currentUser?.id || 'guest',
                        lessonId,
                        grade: activeLesson.grade,
                        subjectId: activeLesson.subjectId,
                        completed: true,
                        checkpointPassed: true,
                        timeSpentSeconds: 180,
                        completedAt: new Date().toISOString(),
                      },
                    ];
                  });
                }}
              />
            )}

            {activeTab === 'exercises' && (
              <div className="max-w-4xl mx-auto space-y-6 pb-16">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white font-display">
                    Luyện tập & Kiểm tra (Lớp {selectedGrade})
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Chấm điểm tự động các câu hỏi xác định, xem giải thích từng câu và ghi nhận tiến bộ thực tế.
                  </p>
                </div>

                {/* Subject filter strip */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSelectedSubjectFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                      selectedSubjectFilter === 'all'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    Tất cả môn ({exercises.length})
                  </button>
                  {subjects.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSubjectFilter(sub.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        selectedSubjectFilter === sub.id
                          ? 'bg-cyan-600 text-white'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>

                {!currentUser && (
                  <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-cyan-900 dark:text-cyan-200">
                    <span>
                      Bạn có thể xem thử và làm bài, nhưng cần đăng nhập tài khoản Học sinh để nộp bài và lưu điểm XP.
                    </span>
                    <button
                      onClick={() => handleOpenAuth('login', 'student')}
                      className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Đăng nhập Học sinh</span>
                    </button>
                  </div>
                )}

                {filteredExercises.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Chưa có bộ bài tập cho môn hoặc khối lớp đã chọn
                    </div>
                    <p className="text-xs text-slate-500">
                      Hãy chuyển sang khối lớp khác hoặc nhấn &ldquo;Tất cả môn&rdquo;.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredExercises.map((ex) => {
                      const subLabel = subjects.find((s) => s.id === ex.subjectId)?.name || ex.subjectId;
                      return (
                        <div
                          key={ex.id}
                          className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                                {subLabel}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>Lớp {ex.grade}</span>
                              <span aria-hidden="true">·</span>
                              <span>{ex.durationMinutes} phút</span>
                              <span aria-hidden="true">·</span>
                              <span>{ex.questions.length} câu hỏi</span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{ex.title}</h3>
                          </div>

                          <button
                            onClick={() => handleOpenExercise(ex.id)}
                            className="px-5 py-2.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 self-start sm:self-auto"
                          >
                            <PlayCircle className="w-4 h-4" />
                            <span>Bắt đầu làm bài</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'exercise-runner' && activeExercise && (
              <ExerciseRunner
                exercise={activeExercise}
                assignmentId={activeAssignmentId}
                existingGradedSubmission={activeGradedSubmission}
                previousAttempts={submissions.filter((s) => s.exerciseSetId === activeExercise.id)}
                studentId={currentUser?.id || 'guest'}
                studentName={currentUser?.name || 'Khách'}
                grade={selectedGrade}
                authToken={authToken}
                onRequireAuth={() => handleOpenAuth('login', 'student')}
                onBack={() => navigateTab('exercises')}
                onOpenLesson={handleOpenLesson}
                onSubmittedSuccess={(sub, xp) => {
                  setSubmissions((prev) => [sub, ...prev]);
                  setCurrentUser((u) => (u ? { ...u, xp: (u.xp || 0) + xp } : u));
                  refreshWrongQuestions();
                }}
              />
            )}

            {activeTab === 'tutor' && currentUser && (
              <EduBotTutorChat
                grade={selectedGrade}
                subjects={subjects}
                lessons={lessons}
                initialLessonId={tutorInitialLesson.id}
                initialLessonTitle={tutorInitialLesson.title}
                authToken={authToken}
                onRequireAuth={() => handleOpenAuth('login', 'student')}
              />
            )}

            {activeTab === 'journey' && currentUser && (
              <GamificationJourney
                user={currentUser}
                lessons={lessons}
                learningProgress={learningProgress}
                systemPolicy={systemPolicy}
                onStartQuest={(_qId) => navigateTab('exercises')}
              />
            )}

            {activeTab === 'knowledge-map' && (
              <KnowledgeMap
                nodes={knowledgeNodes}
                lessons={lessons}
                onOpenLesson={handleOpenLesson}
                onAskTutor={(title) => handleAskAiAboutLesson(title, '')}
              />
            )}

            {!currentUser && (activeTab === 'dashboard' || activeTab === 'tutor' || activeTab === 'journey') && (
              <div className="max-w-lg mx-auto my-12 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
                <Lock className="w-10 h-10 text-cyan-500 mx-auto" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                  Vui lòng đăng nhập để sử dụng tính năng này
                </h2>
                <p className="text-xs text-slate-500">
                  Hồ sơ học tập, Gia sư AI EduBot và Hành trình XP được bảo vệ và lưu trữ theo từng tài khoản học sinh.
                </p>
                <button
                  onClick={() => handleOpenAuth('login', 'student')}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold inline-flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập ngay</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* ================= TEACHER VIEWS ================= */}
        {!isRestoringSession && currentUser?.role === 'teacher' && (
          <>
            {activeTab === 'teacher-overview' && (
              <TeacherDashboard
                user={currentUser}
                classes={classes}
                assignments={assignments}
                submissions={submissions}
                drafts={drafts}
                authToken={authToken}
                onNavigate={(t) => navigateTab(t)}
                onCreateClass={handleCreateClass}
                onClassUpdated={(updatedClass) =>
                  setClasses((prev) => prev.map((c) => (c.id === updatedClass.id ? updatedClass : c)))
                }
                onSubmissionGraded={(updatedSub) =>
                  setSubmissions((prev) => prev.map((s) => (s.id === updatedSub.id ? updatedSub : s)))
                }
              />
            )}

            {activeTab === 'ai-planner' && (
              <AiLessonPlanner
                authToken={authToken}
                onDraftCreated={(newDraft) => setDrafts((prev) => [newDraft, ...prev])}
              />
            )}

            {activeTab === 'ai-standardize' && (
              <AiKnowledgeStandardizer
                authToken={authToken}
                onDraftCreated={(newDraft) => setDrafts((prev) => [newDraft, ...prev])}
              />
            )}

            {activeTab === 'ai-quiz' && (
              <AiQuizGenerator
                authToken={authToken}
                onDraftCreated={(newDraft) => setDrafts((prev) => [newDraft, ...prev])}
              />
            )}

            {activeTab === 'assignment-manager' && (
              <AssignmentManager
                classes={classes}
                assignments={assignments}
                exercises={exercises}
                submissions={submissions}
                lessons={lessons}
                subjects={subjects}
                currentUserName={currentUser.name}
                authToken={authToken}
                onAssignCreated={(newAssign) => setAssignments((prev) => [newAssign, ...prev])}
                onExerciseCreated={(newEx) => setExercises((prev) => [newEx, ...prev])}
                onClassUpdated={(updatedClass) =>
                  setClasses((prev) => prev.map((c) => (c.id === updatedClass.id ? updatedClass : c)))
                }
              />
            )}

            {activeTab === 'review-drafts' && (
              <ContentReviewer
                drafts={drafts}
                authToken={authToken}
                onDraftStatusChange={handleDraftStatusChange}
                onPublishedToCurriculum={(lesson, updatedDraft) => {
                  setLessons((prev) => [lesson, ...prev]);
                  setDrafts((prev) => prev.map((d) => (d.id === updatedDraft.id ? updatedDraft : d)));
                }}
              />
            )}
          </>
        )}

        {/* ================= ADMIN VIEWS ================= */}
        {!isRestoringSession && currentUser?.role === 'admin' && activeTab !== 'landing' && (
          <AdminDashboard
            lessons={lessons}
            subjects={subjects}
            exercises={exercises}
            auditLogs={auditLogs}
            activeNavbarTab={activeTab}
            authToken={authToken}
            onUpdateLessonStatus={handleUpdateLessonStatus}
            onLessonCreated={(newLesson) => setLessons((prev) => [newLesson, ...prev])}
            onLessonUpdated={(updatedLesson) =>
              setLessons((prev) => prev.map((l) => (l.id === updatedLesson.id ? updatedLesson : l)))
            }
            onSettingsUpdated={(updated: SystemSettings) =>
              setSystemPolicy((prev) =>
                prev
                  ? {
                      ...prev,
                      leaderboardEnabled: updated.leaderboardEnabled,
                      parentalConsentRequired: updated.parentalConsentRequired,
                      curriculumStandard: updated.curriculumStandard,
                      textbookSeries: updated.textbookSeries,
                      textbookSeriesLabel: updated.textbookSeriesLabel,
                    }
                  : null
              )
            }
            onAuditLogsRefresh={refreshAuditLogs}
          />
        )}

        {/* ================= UNAUTHORIZED ROUTE GUARD ================= */}
        {!isRestoringSession &&
          ((isTeacherRoute && currentUser?.role !== 'teacher') ||
            (isAdminRoute && currentUser?.role !== 'admin')) && (
            <div className="max-w-lg mx-auto my-12 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
              <Lock className="w-10 h-10 text-amber-500 mx-auto" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                {currentUser ? 'Bạn không có quyền truy cập khu vực này' : 'Vui lòng đăng nhập đúng vai trò để truy cập'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAdminRoute
                  ? 'Khu vực này dành riêng cho Quản trị viên hệ thống EduBot AI.'
                  : 'Khu vực này dành riêng cho Giáo viên đã đăng nhập hệ thống.'}
              </p>
              <div className="flex items-center justify-center gap-3">
                {!currentUser && (
                  <button
                    onClick={() => handleOpenAuth('login', isAdminRoute ? 'admin' : 'teacher')}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Đăng nhập</span>
                  </button>
                )}
                <button
                  onClick={() =>
                    navigateTab(
                      !currentUser
                        ? 'landing'
                        : currentUser.role === 'student'
                        ? 'dashboard'
                        : currentUser.role === 'teacher'
                        ? 'teacher-overview'
                        : 'admin-overview'
                    )
                  }
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Về trang chính
                </button>
              </div>
            </div>
          )}
      </main>

      {/* Quiet domain-compliant footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white">EduBot AI</span>
            <span>– Future Learning Ecosystem (Lớp 1–5)</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span>Tham chiếu TT 32/2018 & TT 17/2025/TT-BGDĐT</span>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Bảo vệ quyền riêng tư học sinh (NĐ 13/2023)</span>
            </button>
            <span aria-hidden="true">·</span>
            <span>Chương trình Tiểu học Lớp 1–5</span>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authMode}
        suggestedRole={suggestedRole}
      />

      {/* Child Privacy & Parental Consent Center Modal */}
      <PrivacyCenterModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        user={currentUser}
        authToken={authToken}
        onConsentVerified={(updatedUser) => setCurrentUser(updatedUser)}
        onDataDeleted={() => {
          handleLogout();
        }}
      />
    </div>
  );
}
