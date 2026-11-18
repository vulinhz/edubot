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
  Lock
} from 'lucide-react';

interface ExerciseRunnerProps {
  exercise: ExerciseSet;
  assignmentId?: string;
  existingGradedSubmission?: StudentSubmission | null;
  studentId: string;
  studentName: string;
  grade: number;
  authToken?: string | null;
  onRequireAuth?: () => void;
  onBack: () => void;
  onSubmittedSuccess: (submission: StudentSubmission, xpEarned: number) => void;
}

function evaluateQuestionCorrectness(q: Question, studentAns: any): boolean {
  if (q.type === 'single_choice') {
    return studentAns !== undefined && studentAns !== null && Number(studentAns) === Number(q.correctAnswer);
  }
  if (q.type === 'multi_choice') {
    if (!Array.isArray(studentAns) || !Array.isArray(q.correctAnswer)) return false;
    const sSorted = [...studentAns].map(Number).sort((a, b) => a - b);
    const cSorted = [...q.correctAnswer].map(Number).sort((a, b) => a - b);
    return sSorted.length === cSorted.length && sSorted.every((v, i) => v === cSorted[i]);
  }
  if (q.type === 'true_false') {
    return typeof studentAns === 'boolean' && studentAns === Boolean(q.correctAnswer);
  }
  if (q.type === 'fill_blank' || q.type === 'step_math' || q.type === 'short_answer') {
    const cleanStudent = String(studentAns || '').trim().toLowerCase().replace(/\s+/g, '');
    const cleanCorrect = String(q.correctAnswer || '').trim().toLowerCase().replace(/\s+/g, '');
    return cleanStudent.length > 0 && cleanStudent === cleanCorrect;
  }
  if (q.type === 'essay') {
    return String(studentAns || '').trim().length >= 5;
  }
  if (q.type === 'matching') {
    if (typeof studentAns !== 'object' || studentAns === null) return false;
    const correctMap = q.correctAnswer as Record<string, string>;
    return Object.keys(correctMap).every((k) => studentAns[k] === correctMap[k]);
  }
  return false;
}

function formatStudentAnswer(q: Question, studentAns: any): string {
  if (studentAns === undefined || studentAns === null || studentAns === '') {
    return 'Chưa trả lời';
  }
  if (q.type === 'single_choice' && q.options) {
    return q.options[Number(studentAns)] || 'Chưa trả lời';
  }
  if (q.type === 'multi_choice' && q.options && Array.isArray(studentAns)) {
    return studentAns.map((idx) => q.options?.[Number(idx)]).filter(Boolean).join(', ') || 'Chưa chọn';
  }
  if (q.type === 'true_false') {
    return studentAns ? 'ĐÚNG' : 'SAI';
  }
  if (q.type === 'matching' && typeof studentAns === 'object') {
    return Object.entries(studentAns).map(([k, v]) => `${k} → ${v || '?'}`).join('; ');
  }
  return String(studentAns);
}

export const ExerciseRunner: React.FC<ExerciseRunnerProps> = ({
  exercise,
  assignmentId,
  existingGradedSubmission,
  studentId,
  studentName,
  grade,
  authToken,
  onRequireAuth,
  onBack,
  onSubmittedSuccess,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showHint, setShowHint] = useState<Record<string, boolean>>({});
  const [secondsSpent, setSecondsSpent] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submissionResult, setSubmissionResult] = useState<{
    submission: StudentSubmission;
    xpEarned: number;
  } | null>(null);

  useEffect(() => {
    setCurrentIdx(0);
    setAnswers({});
    setShowHint({});
    setSecondsSpent(0);
    setSubmitError('');
    setSubmissionResult(null);
  }, [exercise.id]);

  // Timer tick
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
          Bài tập đã được chấm điểm và khóa sổ
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Điểm chính thức: <strong className="text-emerald-600">{existingGradedSubmission.score}/10</strong>
          {existingGradedSubmission.teacherFeedback ? ` — Nhận xét GV: "${existingGradedSubmission.teacherFeedback}"` : ''}
        </p>
        <button
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

  const handleSubmit = async () => {
    if (!authToken) {
      setSubmitError('Vui lòng đăng nhập tài khoản học sinh để nộp bài và lưu điểm XP.');
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
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-lg space-y-4">
          <div className="flex justify-center">
            <EduBotMascot
              size="md"
              expression={sub.score >= 8 ? 'celebrating' : 'happy'}
              message={sub.feedback}
            />
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider font-mono">
              KẾT QUẢ BÀI LÀM
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white font-display">
              {sub.score}/10 Điểm
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Bạn đã trả lời đúng {sub.totalCorrect}/{sub.totalQuestions} câu hỏi trong {formatTimer(sub.timeSpentSeconds)}.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>+{submissionResult.xpEarned} Điểm Kinh Nghiệm (XP) nạp vào EduBot</span>
          </div>

          {sub.misconceptionTags && sub.misconceptionTags.length > 0 && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-left border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span>EduBot lưu ý cho bạn các điểm cần củng cố:</span>
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
              onClick={onBack}
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              Hoàn thành & Quay lại
            </button>
            <button
              onClick={() => {
                setSubmissionResult(null);
                setAnswers({});
                setCurrentIdx(0);
                setSecondsSpent(0);
              }}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Làm lại bài</span>
            </button>
          </div>
        </div>

        {/* Detailed Solutions Section */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
            Lời giải chi tiết từng câu hỏi
          </h3>
          {exercise.questions.map((q, idx) => {
            const studentAns = sub.answers[q.id];
            const isCorrect = evaluateQuestionCorrectness(q, studentAns);
            return (
              <div
                key={q.id}
                className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border space-y-3 ${
                  isCorrect
                    ? 'border-emerald-200 dark:border-emerald-900/60'
                    : 'border-rose-200 dark:border-rose-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 font-mono">Câu {idx + 1}</span>
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Chính xác
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        <XCircle className="w-3.5 h-3.5" />
                        Cần xem lại
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    {q.difficulty === 'nhan_biet'
                      ? 'Nhận biết'
                      : q.difficulty === 'thong_hieu'
                      ? 'Thông hiểu'
                      : 'Vận dụng'}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {q.questionText}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <strong>Câu trả lời của bạn:</strong> {formatStudentAnswer(q, studentAns)}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <strong className="block text-cyan-600 dark:text-cyan-400 mb-1">
                    Giải thích của EduBot:
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
          className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full transition-all duration-300"
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
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
            <span>Dạng bài: {currentQ.type.replace('_', ' ')}</span>
            <span aria-hidden="true">·</span>
            <span>Mức độ: {currentQ.difficulty}</span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
            {currentQ.questionText}
          </h2>
        </div>

        <div className="space-y-3">
          {/* 1. Single Choice */}
          {currentQ.type === 'single_choice' && currentQ.options && (
            <div className="space-y-2.5">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = answers[currentQ.id] === optIdx;
                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSetAnswer(currentQ.id, optIdx)}
                    className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center gap-3.5 ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-semibold shadow-sm'
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
                    onClick={() => handleToggleMultiChoice(currentQ.id, optIdx)}
                    className={`w-full text-left p-4 rounded-xl border text-sm transition-all flex items-center gap-3.5 ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-semibold shadow-sm'
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
                onClick={() => handleSetAnswer(currentQ.id, true)}
                className={`p-4 rounded-2xl border text-center font-bold text-sm transition-all ${
                  answers[currentQ.id] === true
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-200'
                }`}
              >
                ĐÚNG
              </button>
              <button
                onClick={() => handleSetAnswer(currentQ.id, false)}
                className={`p-4 rounded-2xl border text-center font-bold text-sm transition-all ${
                  answers[currentQ.id] === false
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 shadow-sm'
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
                    Các bước tư duy:
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
                  placeholder="Ví dụ: 3/5 hoặc 12"
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleSetAnswer(currentQ.id, e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* 3b. Essay / Tự luận */}
          {currentQ.type === 'essay' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Viết câu trả lời tự luận của em (thầy/cô sẽ chấm và nhận xét):
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
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4"
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
        </div>

        {/* Pedagogical Hint Toggle */}
        <div className="pt-2">
          <button
            onClick={() => setShowHint((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))}
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showHint[currentQ.id] ? 'Ẩn gợi ý' : 'Cần gợi ý từ EduBot?'}</span>
          </button>

          {showHint[currentQ.id] && (
            <div className="mt-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed animate-in fade-in">
              <strong>💡 Gợi ý của EduBot:</strong> {currentQ.pedagogicalHint}
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <button
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Câu trước
          </button>

          {isLast ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-60"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang chấm điểm...' : 'Nộp bài & Xem điểm'}</span>
            </button>
          ) : (
            <button
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
