/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ExerciseSet, Question, StudentSubmission } from '../../types/index.ts';
import { persistSubmissionToFirestore } from '../../lib/firestoreService.ts';
import { EduBotMascot } from '../EduBotMascot.tsx';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  HelpCircle,
  Timer,
  Sparkles,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  Lock,
  ArrowUp,
  ArrowDown,
  Clock,
  BookOpen,
} from 'lucide-react';

interface RecommendedLessonRef {
  id: string;
  title: string;
  subjectId: string;
  grade: number;
}

interface ExerciseRunnerProps {
  exercise: ExerciseSet;
  assignmentId?: string;
  existingGradedSubmission?: StudentSubmission | null;
  previousAttempts?: StudentSubmission[];
  studentId: string;
  studentName: string;
  grade: number;
  authToken?: string | null;
  onRequireAuth?: () => void;
  onBack: () => void;
  onOpenLesson?: (lessonId: string) => void;
  onSubmittedSuccess: (submission: StudentSubmission, xpEarned: number) => void;
}

function getInitialOrderList(items: string[]): string[] {
  if (items.length <= 1) return [...items];
  // Rotate/reverse deterministically so it is not pre-solved
  const reversed = [...items].reverse();
  if (reversed.every((v, idx) => v === items[idx])) {
    return [...items.slice(1), items[0]];
  }
  return reversed;
}

function evaluateQuestionStatus(
  q: Question,
  studentAns: any
): 'correct' | 'incorrect' | 'pending_review' {
  if (q.type === 'essay') {
    return 'pending_review';
  }
  if (q.type === 'single_choice' || q.type === 'scenario') {
    if (Array.isArray(q.options) && typeof q.correctAnswer === 'number') {
      return studentAns !== undefined &&
        studentAns !== null &&
        studentAns !== '' &&
        Number(studentAns) === Number(q.correctAnswer)
        ? 'correct'
        : 'incorrect';
    }
    const cleanStudent = String(studentAns || '').trim().toLowerCase();
    const cleanCorrect = String(q.correctAnswer || '').trim().toLowerCase();
    return cleanStudent.length > 0 && cleanStudent === cleanCorrect ? 'correct' : 'incorrect';
  }
  if (q.type === 'multi_choice') {
    if (!Array.isArray(studentAns) || !Array.isArray(q.correctAnswer)) return 'incorrect';
    const sSorted = [...studentAns].map(Number).sort((a, b) => a - b);
    const cSorted = [...q.correctAnswer].map(Number).sort((a, b) => a - b);
    return sSorted.length === cSorted.length && sSorted.every((v, i) => v === cSorted[i])
      ? 'correct'
      : 'incorrect';
  }
  if (q.type === 'true_false') {
    return typeof studentAns === 'boolean' && studentAns === Boolean(q.correctAnswer)
      ? 'correct'
      : 'incorrect';
  }
  if (q.type === 'fill_blank' || q.type === 'step_math' || q.type === 'short_answer') {
    const cleanStudent = String(studentAns || '').trim().toLowerCase().replace(/\s+/g, '');
    const cleanCorrect = String(q.correctAnswer || '').trim().toLowerCase().replace(/\s+/g, '');
    return cleanStudent.length > 0 && cleanStudent === cleanCorrect ? 'correct' : 'incorrect';
  }
  if (q.type === 'matching' || q.type === 'drag_drop') {
    if (typeof studentAns !== 'object' || studentAns === null || typeof q.correctAnswer !== 'object' || !q.correctAnswer) {
      return 'incorrect';
    }
    const correctMap = q.correctAnswer as Record<string, string>;
    const keys = Object.keys(correctMap);
    return keys.length > 0 &&
      keys.every((k) => String(studentAns[k] || '').trim() === String(correctMap[k]).trim())
      ? 'correct'
      : 'incorrect';
  }
  if (q.type === 'ordering') {
    const expected = Array.isArray(q.correctAnswer) ? q.correctAnswer : q.items;
    if (!Array.isArray(studentAns) || !Array.isArray(expected) || expected.length === 0) {
      return 'incorrect';
    }
    return studentAns.length === expected.length &&
      expected.every((v, i) => String(studentAns[i] || '').trim() === String(v).trim())
      ? 'correct'
      : 'incorrect';
  }
  return 'incorrect';
}

function formatStudentAnswer(q: Question, studentAns: any): string {
  if (studentAns === undefined || studentAns === null || studentAns === '') {
    return 'Chưa trả lời';
  }
  if ((q.type === 'single_choice' || q.type === 'scenario') && q.options && typeof studentAns === 'number') {
    return q.options[Number(studentAns)] || 'Chưa trả lời';
  }
  if (q.type === 'multi_choice' && q.options && Array.isArray(studentAns)) {
    return studentAns.map((idx) => q.options?.[Number(idx)]).filter(Boolean).join(', ') || 'Chưa chọn';
  }
  if (q.type === 'true_false') {
    return studentAns ? 'Đúng' : 'Sai';
  }
  if (q.type === 'ordering' && Array.isArray(studentAns)) {
    return studentAns.join(' → ');
  }
  if (q.type === 'drag_drop' && typeof studentAns === 'object' && q.dragItems) {
    return q.dragItems
      .map((item) => `${item.label} → ${studentAns[item.id] || '?'}`)
      .join('; ');
  }
  if (q.type === 'matching' && typeof studentAns === 'object') {
    return Object.entries(studentAns).map(([k, v]) => `${k} → ${v || '?'}`).join('; ');
  }
  return String(studentAns);
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: 'Trắc nghiệm một đáp án',
  multi_choice: 'Trắc nghiệm nhiều đáp án',
  true_false: 'Đúng / Sai',
  fill_blank: 'Điền từ / số',
  matching: 'Nối cặp',
  ordering: 'Sắp xếp thứ tự',
  drag_drop: 'Kéo thả phân loại',
  step_math: 'Giải toán từng bước',
  short_answer: 'Trả lời ngắn',
  scenario: 'Bài tập tình huống',
  essay: 'Tự luận (Giáo viên chấm)',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  nhan_biet: 'Nhận biết',
  thong_hieu: 'Thông hiểu',
  van_dung: 'Vận dụng',
  van_dung_cao: 'Vận dụng cao',
};

export const ExerciseRunner: React.FC<ExerciseRunnerProps> = ({
  exercise,
  assignmentId,
  existingGradedSubmission,
  previousAttempts = [],
  studentId,
  studentName,
  grade,
  authToken,
  onRequireAuth,
  onBack,
  onOpenLesson,
  onSubmittedSuccess,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showHint, setShowHint] = useState<Record<string, boolean>>({});
  const [secondsSpent, setSecondsSpent] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [selectedDragItemId, setSelectedDragItemId] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    submission: StudentSubmission;
    xpEarned: number;
    recommendedReviewLessons: RecommendedLessonRef[];
  } | null>(null);

  useEffect(() => {
    setCurrentIdx(0);
    setAnswers({});
    setShowHint({});
    setSecondsSpent(0);
    setSubmitError('');
    setSelectedDragItemId(null);
    setSubmissionResult(null);
  }, [exercise.id]);

  // Seed initial order state when viewing an ordering question for the first time
  useEffect(() => {
    const q = exercise.questions?.[currentIdx];
    if (q && q.type === 'ordering' && q.items && !Array.isArray(answers[q.id])) {
      setAnswers((prev) => ({
        ...prev,
        [q.id]: getInitialOrderList(q.items!),
      }));
    }
  }, [currentIdx, exercise.id]);

  useEffect(() => {
    if (submissionResult || existingGradedSubmission) return;
    const interval = setInterval(() => {
      setSecondsSpent((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [submissionResult, existingGradedSubmission]);

  if (existingGradedSubmission && !submissionResult) {
    return (
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <Lock className="w-8 h-8 text-emerald-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
          Bài tập đã được giáo viên chấm điểm
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Điểm chính thức: <strong className="text-emerald-600">{existingGradedSubmission.score}/10</strong>
          {existingGradedSubmission.teacherFeedback ? ` — Nhận xét GV: "${existingGradedSubmission.teacherFeedback}"` : ''}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl"
        >
          Quay lại
        </button>
      </div>
    );
  }

  if (!exercise.questions || exercise.questions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
        <p className="text-sm text-slate-500">Bộ bài tập này chưa có câu hỏi nào.</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 rounded-xl"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const currentQ: Question = exercise.questions[currentIdx];
  const totalQ = exercise.questions.length;
  const isLast = currentIdx === totalQ - 1;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSetAnswer = (qId: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const handleToggleMultiChoice = (qId: string, optIdx: number) => {
    const current: number[] = Array.isArray(answers[qId]) ? answers[qId] : [];
    const next = current.includes(optIdx)
      ? current.filter((i) => i !== optIdx)
      : [...current, optIdx];
    handleSetAnswer(qId, next);
  };

  const handleMoveOrderItem = (q: Question, idx: number, direction: -1 | 1) => {
    const list: string[] = Array.isArray(answers[q.id])
      ? [...answers[q.id]]
      : getInitialOrderList(q.items || []);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    [list[idx], list[targetIdx]] = [list[targetIdx], list[idx]];
    handleSetAnswer(q.id, list);
  };

  const handleAssignDragItem = (qId: string, itemId: string, zoneName: string) => {
    const currentMap = typeof answers[qId] === 'object' && answers[qId] !== null ? { ...answers[qId] } : {};
    if (zoneName) {
      currentMap[itemId] = zoneName;
    } else {
      delete currentMap[itemId];
    }
    handleSetAnswer(qId, currentMap);
    setSelectedDragItemId(null);
  };

  const handleSubmit = async () => {
    if (!authToken) {
      setSubmitError('Vui lòng đăng nhập tài khoản học sinh để nộp bài và lưu kết quả.');
      onRequireAuth?.();
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/exercises/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          exerciseSetId: exercise.id,
          assignmentId,
          studentId,
          studentName,
          grade,
          answers,
          timeSpentSeconds: secondsSpent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmissionResult({
          submission: data.submission,
          xpEarned: data.xpEarned,
          recommendedReviewLessons: Array.isArray(data.recommendedReviewLessons)
            ? data.recommendedReviewLessons
            : [],
        });
        persistSubmissionToFirestore(data.submission).catch(() => {});
        onSubmittedSuccess(data.submission, data.xpEarned);
      } else {
        setSubmitError(data.error || 'Không thể nộp bài lúc này. Vui lòng thử lại.');
      }
    } catch {
      setSubmitError('Lỗi kết nối tới máy chủ chấm điểm. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionResult) {
    const sub = submissionResult.submission;
    const autoCount = sub.autoGradedQuestions ?? sub.totalQuestions;
    const isEssayOnly = sub.pendingEssayReview && autoCount === 0;

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="flex justify-center">
            <EduBotMascot
              size="md"
              expression={isEssayOnly ? 'happy' : sub.score >= 8 ? 'celebrating' : 'happy'}
              message={sub.feedback}
            />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider font-mono">
              KẾT QUẢ BÀI LÀM {sub.attemptNumber ? `· LẦN ${sub.attemptNumber}` : ''}
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white font-display">
              {isEssayOnly ? 'Đã nộp phần tự luận' : `${sub.score}/10 Điểm`}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isEssayOnly
                ? `Hoàn thành trong ${formatTimer(sub.timeSpentSeconds)}. Thầy/cô giáo sẽ chấm theo tiêu chí đánh giá.`
                : `Đúng ${sub.totalCorrect}/${autoCount} câu chấm tự động trong ${formatTimer(sub.timeSpentSeconds)}.${
                    sub.pendingEssayReview ? ' Câu tự luận đang chờ giáo viên chấm.' : ''
                  }`}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>+{submissionResult.xpEarned} XP</span>
          </div>

          {submissionResult.recommendedReviewLessons.length > 0 && (
            <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 text-left border border-amber-200 dark:border-amber-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                <BookOpen className="w-4 h-4" />
                <span>Bài học gợi ý nên ôn lại từ các câu vừa làm sai:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {submissionResult.recommendedReviewLessons.map((les) => (
                  <button
                    key={les.id}
                    type="button"
                    onClick={() => onOpenLesson?.(les.id)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:border-cyan-500 transition-colors"
                  >
                    Ôn lại: {les.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sub.misconceptionTags && sub.misconceptionTags.length > 0 && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-left border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span>Điểm cần lưu ý thêm:</span>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                {sub.misconceptionTags.map((tag, tIdx) => (
                  <li key={tIdx}>{tag}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              Quay lại danh sách
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmissionResult(null);
                setAnswers({});
                setCurrentIdx(0);
                setSecondsSpent(0);
                setSelectedDragItemId(null);
              }}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Làm lại bài</span>
            </button>
          </div>
        </div>

        {/* Attempt history */}
        {previousAttempts.length > 0 && (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
              Lịch sử các lần làm bài ({previousAttempts.length} lần)
            </h3>
            <div className="space-y-2 text-xs">
              {previousAttempts.slice(0, 5).map((att, idx) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    Lần {att.attemptNumber || previousAttempts.length - idx} ·{' '}
                    {new Date(att.completedAt).toLocaleString('vi-VN')}
                  </span>
                  <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    {att.pendingEssayReview && (att.autoGradedQuestions ?? 1) === 0
                      ? 'Chờ GV chấm'
                      : `${att.score}/10`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Solutions Section */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
            Giải thích từng câu hỏi
          </h3>
          {exercise.questions.map((q, idx) => {
            const studentAns = sub.answers[q.id];
            const status = evaluateQuestionStatus(q, studentAns);
            const borderCls =
              status === 'correct'
                ? 'border-emerald-200 dark:border-emerald-900/60'
                : status === 'pending_review'
                ? 'border-amber-200 dark:border-amber-900/60'
                : 'border-rose-200 dark:border-rose-900/60';

            return (
              <div
                key={q.id}
                className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border space-y-3 ${borderCls}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 font-mono">Câu {idx + 1}</span>
                    {status === 'correct' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Chính xác
                      </span>
                    ) : status === 'pending_review' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        <Clock className="w-3.5 h-3.5" />
                        Chờ giáo viên chấm theo tiêu chí
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        <XCircle className="w-3.5 h-3.5" />
                        Cần xem lại
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
                  </span>
                </div>

                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {q.questionText}
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <strong>Câu trả lời của bạn:</strong> {formatStudentAnswer(q, studentAns)}
                </div>

                {q.type === 'essay' && q.rubricCriteria && q.rubricCriteria.length > 0 && (
                  <div className="text-xs text-amber-900 dark:text-amber-200 bg-amber-50/70 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-1">
                    <strong className="block">Tiêu chí giáo viên dùng để đánh giá:</strong>
                    <ul className="list-disc list-inside space-y-0.5">
                      {q.rubricCriteria.map((rc, rIdx) => (
                        <li key={rIdx}>{rc}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <strong className="block text-cyan-600 dark:text-cyan-400 mb-1">
                    Giải thích:
                  </strong>
                  {q.explanation}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Thoát ra</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
            <Timer className="w-3.5 h-3.5 text-cyan-500" />
            <span>{formatTimer(secondsSpent)}</span>
          </div>

          <span className="text-xs font-mono text-slate-400">
            Câu {currentIdx + 1}/{totalQ}
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
        <div
          className="bg-cyan-600 h-full transition-all duration-300"
          style={{ width: `${((currentIdx + 1) / totalQ) * 100}%` }}
        />
      </div>

      {submitError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Question Card */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
            <span>{QUESTION_TYPE_LABELS[currentQ.type] || currentQ.type}</span>
            <span aria-hidden="true">·</span>
            <span>{DIFFICULTY_LABELS[currentQ.difficulty] || currentQ.difficulty}</span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
            {currentQ.questionText}
          </h2>
        </div>

        <div className="space-y-3">
          {/* 1. Single Choice or Scenario with options */}
          {(currentQ.type === 'single_choice' || currentQ.type === 'scenario') &&
            Array.isArray(currentQ.options) &&
            currentQ.options.length > 0 && (
              <div className="space-y-2.5">
                {currentQ.options.map((opt, optIdx) => {
                  const isSelected = answers[currentQ.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSetAnswer(currentQ.id, optIdx)}
                      className={`w-full text-left p-4 rounded-xl border text-sm transition-colors flex items-center gap-3.5 ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                          isSelected
                            ? 'bg-cyan-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

          {/* Scenario without options -> short text */}
          {currentQ.type === 'scenario' && (!currentQ.options || currentQ.options.length === 0) && (
            <input
              type="text"
              placeholder="Nhập cách xử lý của em..."
              value={answers[currentQ.id] || ''}
              onChange={(e) => handleSetAnswer(currentQ.id, e.target.value)}
              className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            />
          )}

          {/* 1b. Multi Choice */}
          {currentQ.type === 'multi_choice' && currentQ.options && (
            <div className="space-y-2.5">
              <div className="text-xs text-slate-500">Chọn tất cả các đáp án đúng:</div>
              {currentQ.options.map((opt, optIdx) => {
                const selectedList: number[] = Array.isArray(answers[currentQ.id]) ? answers[currentQ.id] : [];
                const isSelected = selectedList.includes(optIdx);
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleToggleMultiChoice(currentQ.id, optIdx)}
                    className={`w-full text-left p-4 rounded-xl border text-sm transition-colors flex items-center gap-3.5 ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-semibold shrink-0 ${
                        isSelected
                          ? 'bg-cyan-500 border-cyan-500 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. True / False */}
          {currentQ.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleSetAnswer(currentQ.id, true)}
                className={`p-4 rounded-2xl border text-center font-bold text-sm transition-colors ${
                  answers[currentQ.id] === true
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-200'
                }`}
              >
                ĐÚNG
              </button>
              <button
                type="button"
                onClick={() => handleSetAnswer(currentQ.id, false)}
                className={`p-4 rounded-2xl border text-center font-bold text-sm transition-colors ${
                  answers[currentQ.id] === false
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-200'
                }`}
              >
                SAI
              </button>
            </div>
          )}

          {/* 3. Fill in the blank, Step math or Short answer */}
          {(currentQ.type === 'fill_blank' || currentQ.type === 'step_math' || currentQ.type === 'short_answer') && (
            <div className="space-y-4">
              {currentQ.steps && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                    Các bước gợi ý:
                  </div>
                  {currentQ.steps.map((st) => (
                    <div key={st.stepNumber} className="text-xs text-slate-600 dark:text-slate-300 flex gap-2">
                      <span className="font-semibold text-slate-400">Bước {st.stepNumber}:</span>
                      <span>{st.instruction}</span>
                      {st.formula && <span className="font-mono text-cyan-500">({st.formula})</span>}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Nhập câu trả lời của bạn:
                </label>
                <input
                  type="text"
                  placeholder="Nhập đáp án..."
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleSetAnswer(currentQ.id, e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* 3b. Essay / Tự luận */}
          {currentQ.type === 'essay' && (
            <div className="space-y-3">
              {currentQ.rubricCriteria && currentQ.rubricCriteria.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <strong className="block">Tiêu chí đánh giá (Giáo viên sẽ chấm theo các ý này):</strong>
                  <ul className="list-disc list-inside space-y-0.5">
                    {currentQ.rubricCriteria.map((rc, rIdx) => (
                      <li key={rIdx}>{rc}</li>
                    ))}
                  </ul>
                </div>
              )}
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                Viết câu trả lời tự luận của em:
              </label>
              <textarea
                rows={5}
                placeholder="Trình bày suy nghĩ hoặc bài làm của em rõ ràng..."
                value={answers[currentQ.id] || ''}
                onChange={(e) => handleSetAnswer(currentQ.id, e.target.value)}
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 leading-relaxed"
              />
            </div>
          )}

          {/* 4. Matching */}
          {currentQ.type === 'matching' && currentQ.pairs && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500">
                Hãy chọn mục tương ứng cho từng từ bên dưới:
              </div>
              {currentQ.pairs.map((p, pIdx) => {
                const currentSelection = (answers[currentQ.id] || {})[p.left] || '';
                return (
                  <div
                    key={pIdx}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {p.left}
                    </span>
                    <select
                      value={currentSelection}
                      onChange={(e) => {
                        const prevObj = answers[currentQ.id] || {};
                        handleSetAnswer(currentQ.id, { ...prevObj, [p.left]: e.target.value });
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">-- Chọn nhóm tương ứng --</option>
                      {currentQ.pairs?.map((item, i) => (
                        <option key={i} value={item.right}>
                          {item.right}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}

          {/* 5. Ordering */}
          {currentQ.type === 'ordering' && currentQ.items && (
            <div className="space-y-2.5">
              <div className="text-xs text-slate-500">
                Dùng nút Lên / Xuống để sắp xếp các thẻ theo đúng thứ tự yêu cầu:
              </div>
              {(Array.isArray(answers[currentQ.id])
                ? (answers[currentQ.id] as string[])
                : getInitialOrderList(currentQ.items)
              ).map((item, idx, arr) => (
                <div
                  key={`${item}-${idx}`}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {item}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label={`Đưa ${item} lên trên`}
                      disabled={idx === 0}
                      onClick={() => handleMoveOrderItem(currentQ, idx, -1)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-35 hover:border-cyan-500"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Đưa ${item} xuống dưới`}
                      disabled={idx === arr.length - 1}
                      onClick={() => handleMoveOrderItem(currentQ, idx, 1)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-35 hover:border-cyan-500"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 6. Drag & Drop (with click-to-assign fallback for mobile/keyboard) */}
          {currentQ.type === 'drag_drop' && currentQ.dragItems && currentQ.dropZones && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500">
                Kéo thẻ vào nhóm đúng (hoặc bấm chọn thẻ rồi bấm vào nhóm đích):
              </div>

              {/* Unassigned items */}
              <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 min-h-[54px]">
                {currentQ.dragItems
                  .filter((it) => !(answers[currentQ.id] || {})[it.id])
                  .map((it) => {
                    const isPicked = selectedDragItemId === it.id;
                    return (
                      <button
                        key={it.id}
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', it.id);
                          setSelectedDragItemId(it.id);
                        }}
                        onClick={() => setSelectedDragItemId(isPicked ? null : it.id)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-grab transition-colors ${
                          isPicked
                            ? 'bg-cyan-600 text-white border-cyan-600'
                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 hover:border-cyan-500'
                        }`}
                      >
                        {it.label}
                      </button>
                    );
                  })}
                {currentQ.dragItems.every((it) => Boolean((answers[currentQ.id] || {})[it.id])) && (
                  <span className="text-xs text-slate-400">Tất cả thẻ đã được xếp vào nhóm.</span>
                )}
              </div>

              {/* Target Zones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQ.dropZones.map((zone) => {
                  const zoneItems = currentQ.dragItems!.filter(
                    (it) => (answers[currentQ.id] || {})[it.id] === zone
                  );
                  return (
                    <div
                      key={zone}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const itemId = e.dataTransfer.getData('text/plain') || selectedDragItemId;
                        if (itemId) handleAssignDragItem(currentQ.id, itemId, zone);
                      }}
                      onClick={() => {
                        if (selectedDragItemId) {
                          handleAssignDragItem(currentQ.id, selectedDragItemId, zone);
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 border-dashed min-h-[110px] space-y-2 transition-colors ${
                        selectedDragItemId
                          ? 'border-cyan-400 bg-cyan-50/40 dark:bg-cyan-950/20 cursor-pointer'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{zone}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {zoneItems.map((it) => (
                          <button
                            key={it.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignDragItem(currentQ.id, it.id, '');
                            }}
                            title="Bấm để gỡ thẻ ra"
                            className="px-2.5 py-1 rounded-lg bg-cyan-600 text-white text-xs font-semibold hover:bg-rose-600 transition-colors"
                          >
                            {it.label} ×
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pedagogical Hint Toggle */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowHint((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))}
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showHint[currentQ.id] ? 'Ẩn gợi ý' : 'Xem gợi ý cách làm'}</span>
          </button>

          {showHint[currentQ.id] && (
            <div className="mt-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <strong>Gợi ý:</strong> {currentQ.pedagogicalHint}
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Câu trước
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang chấm điểm...' : 'Nộp bài & Xem kết quả'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentIdx((i) => Math.min(totalQ - 1, i + 1))}
              className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <span>Câu tiếp</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
