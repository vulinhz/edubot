/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { StudentSubmission } from '../../types/index.ts';
import { getFallbackAvatarDataUri } from '../../lib/avatar.ts';
import { X, Zap, AlertCircle, CheckCircle2, Save, MessageSquare } from 'lucide-react';

interface StudentDetailModalProps {
  student: { id: string; name: string; email: string; xp: number; progress: number } | null;
  authToken?: string | null;
  onClose: () => void;
  onSubmissionGraded?: (submission: StudentSubmission) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  authToken,
  onClose,
  onSubmissionGraded,
}) => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [performanceData, setPerformanceData] = useState<any>(null);

  // Teacher support note state
  const [teacherNote, setTeacherNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Inline submission grading state
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState<string>('');
  const [gradeFeedback, setGradeFeedback] = useState<string>('');
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    if (!student) return;
    setLoading(true);
    setErrorMsg('');
    setStatusMsg('');
    setGradingId(null);
    fetch(`/api/students/${student.id}/performance`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Không thể tải dữ liệu học sinh.');
        }
        setPerformanceData(data);
        setTeacherNote(data.teacherNote || '');
      })
      .catch((err: any) => {
        setErrorMsg(err?.message || 'Lỗi tải dữ liệu học sinh.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [student, authToken]);

  if (!student) return null;

  const handleSaveTeacherNote = async () => {
    if (!authToken) return;
    setSavingNote(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/students/${student.id}/teacher-note`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ note: teacherNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Không thể lưu nhận xét.');
      } else {
        setStatusMsg('Đã lưu ghi chú hỗ trợ học sinh.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi lưu nhận xét.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveGrade = async (subId: string) => {
    if (!authToken) return;
    setSavingGrade(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const res = await fetch(`/api/submissions/${subId}/grade`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          score: gradeScore !== '' ? Number(gradeScore) : undefined,
          teacherFeedback: gradeFeedback,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Không thể lưu điểm và nhận xét.');
      } else if (data.submission) {
        setPerformanceData((prev: any) =>
          prev
            ? {
                ...prev,
                recentSubmissions: prev.recentSubmissions.map((s: StudentSubmission) =>
                  s.id === subId ? data.submission : s
                ),
              }
            : prev
        );
        setGradingId(null);
        setStatusMsg('Đã cập nhật điểm số và nhận xét giáo viên thành công.');
        onSubmissionGraded?.(data.submission);
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi lưu điểm.');
    } finally {
      setSavingGrade(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 max-w-2xl w-full rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          aria-label="Đóng hồ sơ học sinh"
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-400/40 p-1 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src={getFallbackAvatarDataUri(student.name)}
              alt={student.name}
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase font-mono">
              HỒ SƠ HỌC TẬP CÁ NHÂN
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-display">
              {student.name}
            </h2>
            <p className="text-xs text-slate-500 font-mono">{student.email}</p>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Đang tải dữ liệu học tập từ máy chủ EduBot...
          </div>
        ) : errorMsg && !performanceData ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <div className="space-y-6">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                  {performanceData?.hasSubmissions ? `${performanceData.avgScore}/10` : 'Chưa có'}
                </div>
                <div className="text-[11px] text-slate-400">Điểm trung bình</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="text-lg font-bold text-amber-500 font-mono">
                  {performanceData?.xp ?? student.xp} XP
                </div>
                <div className="text-[11px] text-slate-400">Năng lượng khám phá</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="text-lg font-bold text-cyan-500 font-mono">
                  {performanceData?.completedLessonsCount ?? 0} Bài học
                </div>
                <div className="text-[11px] text-slate-400">
                  {performanceData?.totalStudyMinutes ?? 0} phút học thực tế
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="text-lg font-bold text-emerald-500 font-mono">
                  {performanceData?.streakDays ?? 0} Ngày
                </div>
                <div className="text-[11px] text-slate-400">Chuỗi học liên tục</div>
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="p-4 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/60 space-y-1.5">
              <div className="text-xs font-bold text-cyan-900 dark:text-cyan-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-600" />
                <span>Gợi ý sư phạm từ EduBot AI:</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {performanceData?.hasSubmissions ? (
                  <>
                    Học sinh <strong>{student.name}</strong> đạt điểm trung bình{' '}
                    <strong>{performanceData.avgScore}/10</strong> qua {performanceData.totalSubmissions} lần nộp bài. Bài học đề xuất tiếp theo:{' '}
                    <strong>{performanceData.recommendedNextLesson}</strong>.
                  </>
                ) : (
                  <>
                    Học sinh <strong>{student.name}</strong> chưa có bài nộp chấm điểm trên hệ thống. Giáo viên có thể giao bài tập đầu tiên hoặc gợi ý em học bài{' '}
                    <strong>{performanceData?.recommendedNextLesson || 'cơ bản'}</strong>.
                  </>
                )}
              </p>
            </div>

            {/* Teacher Personal Note */}
            <div className="space-y-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Ghi chú hỗ trợ của Giáo viên:</span>
                </label>
                <button
                  type="button"
                  onClick={handleSaveTeacherNote}
                  disabled={savingNote}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-60"
                >
                  <Save className="w-3 h-3" />
                  <span>{savingNote ? 'Đang lưu...' : 'Lưu ghi chú'}</span>
                </button>
              </div>
              <textarea
                rows={2}
                value={teacherNote}
                onChange={(e) => setTeacherNote(e.target.value)}
                placeholder="Ghi chú kế hoạch phụ đạo, khen thưởng hoặc lưu ý gửi phụ huynh..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Recent Submissions + Inline Grading */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                Lịch sử làm bài gần đây & Chấm điểm giáo viên
              </h3>

              {performanceData?.recentSubmissions && performanceData.recentSubmissions.length > 0 ? (
                <div className="space-y-2.5">
                  {performanceData.recentSubmissions.map((sub: StudentSubmission) => (
                    <div
                      key={sub.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Bài tập Khối {sub.grade}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {sub.status === 'graded' ? 'Đã chấm' : 'Chờ GV chấm'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(sub.completedAt).toLocaleString('vi-VN')} · {Math.max(1, Math.round(sub.timeSpentSeconds / 60))} phút làm bài
                          </div>
                          {sub.teacherFeedback && (
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                              Nhận xét GV: &ldquo;{sub.teacherFeedback}&rdquo;
                            </div>
                          )}
                        </div>

                        <div className="text-right font-mono flex items-center gap-3">
                          <div>
                            <div
                              className={`text-sm font-bold ${
                                sub.score >= 8 ? 'text-emerald-500' : 'text-amber-500'
                              }`}
                            >
                              {sub.score}/10
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {sub.totalCorrect}/{sub.totalQuestions} đúng
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (gradingId === sub.id) {
                                setGradingId(null);
                              } else {
                                setGradingId(sub.id);
                                setGradeScore(String(sub.score));
                                setGradeFeedback(sub.teacherFeedback || '');
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 font-sans text-[11px] font-semibold"
                          >
                            {gradingId === sub.id ? 'Đóng' : 'Chấm/Nhận xét'}
                          </button>
                        </div>
                      </div>

                      {gradingId === sub.id && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-500">Điểm (0–10):</label>
                            <input
                              type="number"
                              min={0}
                              max={10}
                              step={0.5}
                              value={gradeScore}
                              onChange={(e) => setGradeScore(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[11px] font-semibold text-slate-500">Nhận xét giáo viên:</label>
                            <input
                              type="text"
                              value={gradeFeedback}
                              onChange={(e) => setGradeFeedback(e.target.value)}
                              placeholder="Lời khen và hướng dẫn sửa bài..."
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveGrade(sub.id)}
                            disabled={savingGrade}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
                          >
                            {savingGrade ? 'Đang lưu...' : 'Lưu điểm'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-3 text-center">
                  Học sinh chưa có bài nộp nào được ghi nhận.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl hover:bg-slate-800"
          >
            Đóng hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
};
