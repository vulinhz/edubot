/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Assignment, ClassRoom, ExerciseSet, StudentSubmission, QuestionType } from '../../types/index.ts';
import { Plus, AlertCircle, BookPlus, CheckCircle2 } from 'lucide-react';

interface AssignmentManagerProps {
  classes: ClassRoom[];
  assignments: Assignment[];
  exercises: ExerciseSet[];
  submissions: StudentSubmission[];
  currentUserName: string;
  authToken?: string | null;
  onAssignCreated: (assignment: Assignment) => void;
  onExerciseCreated?: (exercise: ExerciseSet) => void;
}

export const AssignmentManager: React.FC<AssignmentManagerProps> = ({
  classes,
  assignments,
  exercises,
  submissions,
  currentUserName,
  authToken,
  onAssignCreated,
  onExerciseCreated,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedExId, setSelectedExId] = useState(exercises[0]?.id || '');
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('2026-11-20');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Custom Exercise Builder Modal
  const [showExModal, setShowExModal] = useState(false);
  const [exTitle, setExTitle] = useState('');
  const [exGrade, setExGrade] = useState(4);
  const [exSubject, setExSubject] = useState('toan');
  const [exQType, setExQType] = useState<QuestionType>('single_choice');
  const [exQText, setExQText] = useState('');
  const [exOptA, setExOptA] = useState('');
  const [exOptB, setExOptB] = useState('');
  const [exOptC, setExOptC] = useState('');
  const [exCorrectIdx, setExCorrectIdx] = useState(0);
  const [exShortAns, setExShortAns] = useState('');
  const [exExplanation, setExExplanation] = useState('');
  const [creatingEx, setCreatingEx] = useState(false);
  const [exSuccessMsg, setExSuccessMsg] = useState('');

  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (!selectedExId && exercises.length > 0) {
      setSelectedExId(exercises[0].id);
    }
  }, [exercises, selectedExId]);

  const activeClass = classes.find((c) => c.id === selectedClassId);

  const toggleTargetStudent = (sid: string) => {
    setTargetStudentIds((prev) =>
      prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
    );
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !selectedExId) {
      setErrorMsg('Vui lòng chọn lớp học và bộ bài tập hợp lệ.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          classId: selectedClassId,
          exerciseSetId: selectedExId,
          targetStudentIds: targetStudentIds.length > 0 ? targetStudentIds : undefined,
          deadline: new Date(deadline).toISOString(),
          assignedBy: currentUserName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.assignment) {
        onAssignCreated(data.assignment);
        setTargetStudentIds([]);
        setShowModal(false);
      } else {
        setErrorMsg(data.error || 'Không thể giao bài tập lúc này.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ khi giao bài tập.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCustomExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exTitle.trim() || !exQText.trim()) return;
    setCreatingEx(true);
    setErrorMsg('');
    setExSuccessMsg('');
    try {
      const options =
        exQType === 'single_choice'
          ? [exOptA.trim(), exOptB.trim(), exOptC.trim()].filter(Boolean)
          : undefined;
      const correctAnswer =
        exQType === 'single_choice'
          ? exCorrectIdx
          : exQType === 'essay'
          ? ''
          : exShortAns.trim();

      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          title: exTitle.trim(),
          subjectId: exSubject,
          grade: exGrade,
          durationMinutes: 15,
          questions: [
            {
              type: exQType,
              difficulty: 'thong_hieu',
              questionText: exQText.trim(),
              options,
              correctAnswer,
              explanation: exExplanation.trim() || 'Giáo viên biên soạn và giải thích.',
              pedagogicalHint: 'Đọc kỹ đề bài và từng dữ kiện trước khi trả lời.',
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.exercise) {
        setErrorMsg(data.error || 'Không thể tạo bộ bài tập.');
      } else {
        onExerciseCreated?.(data.exercise);
        setSelectedExId(data.exercise.id);
        setExSuccessMsg(`Đã tạo bộ bài tập "${data.exercise.title}".`);
        setExTitle('');
        setExQText('');
        setExOptA('');
        setExOptB('');
        setExOptC('');
        setExShortAns('');
        setExExplanation('');
        setShowExModal(false);
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi tạo bộ bài tập.');
    } finally {
      setCreatingEx(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white font-display">
            Quản lý Bài tập & Chấm điểm
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Tạo bộ câu hỏi riêng, giao bài theo lớp hoặc cá nhân học sinh và theo dõi kết quả thực tế.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setErrorMsg('');
              setShowExModal(true);
            }}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-cyan-500 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <BookPlus className="w-4 h-4 text-cyan-500" />
            <span>Tạo bộ bài tập mới</span>
          </button>

          <button
            onClick={() => {
              setErrorMsg('');
              setShowModal(true);
            }}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Giao bài tập mới</span>
          </button>
        </div>
      </div>

      {exSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{exSuccessMsg}</span>
        </div>
      )}

      {/* Active Assignments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
            Các bài tập đang giao
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {assignments.length} Nhiệm vụ
          </span>
        </div>

        {assignments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Tiêu đề bài tập</th>
                  <th className="px-5 py-3.5">Lớp áp dụng</th>
                  <th className="px-5 py-3.5">Hạn nộp</th>
                  <th className="px-5 py-3.5">Tiến độ nộp</th>
                  <th className="px-5 py-3.5">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assignments.map((a) => {
                  const pct = a.totalStudents > 0 ? Math.min(100, (a.completedCount / a.totalStudents) * 100) : 0;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                        <div>{a.title}</div>
                        {a.targetStudentIds && a.targetStudentIds.length > 0 && (
                          <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-normal">
                            Giao riêng cho {a.targetStudentIds.length} học sinh
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">{a.className}</td>
                      <td className="px-5 py-4 font-mono">
                        {new Date(a.deadline).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-cyan-500 h-full rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px]">
                            {a.completedCount}/{a.totalStudents}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                          {a.status === 'active' ? 'Đang mở' : 'Đã đóng'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            Chưa có bài tập nào được giao. Hãy nhấn &ldquo;Giao bài tập mới&rdquo; ở góc trên.
          </div>
        )}
      </div>

      {/* Submissions & Error Diagnosis Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              Kết quả làm bài học sinh & Chẩn đoán EduBot
            </h2>
            <p className="text-xs text-slate-400">
              Chấm tự động theo thời gian thực kết hợp nhận xét giáo viên.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {submissions.length} Bài nộp
          </span>
        </div>

        {submissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Học sinh</th>
                  <th className="px-5 py-3.5">Điểm số</th>
                  <th className="px-5 py-3.5">Thời gian làm</th>
                  <th className="px-5 py-3.5">Nhận xét & Phản hồi</th>
                  <th className="px-5 py-3.5">Thời điểm nộp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                      {s.studentName}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`font-mono font-bold text-sm ${
                          s.score >= 8 ? 'text-emerald-500' : s.score >= 5 ? 'text-amber-500' : 'text-rose-500'
                        }`}
                      >
                        {s.score}/10
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono">
                      {Math.max(1, Math.round(s.timeSpentSeconds / 60))} phút
                    </td>
                    <td className="px-5 py-4 max-w-xs text-slate-700 dark:text-slate-300">
                      <div>{s.feedback}</div>
                      {s.teacherFeedback && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                          GV: {s.teacherFeedback}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-400">
                      {new Date(s.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })},{' '}
                      {new Date(s.completedAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            Chưa có bài nộp nào từ học sinh.
          </div>
        )}
      </div>

      {/* Modal 1: Giao bài tập (có chọn từng học sinh) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
              Giao bài tập cho Lớp / Học sinh
            </h3>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Chọn Lớp học:
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setTargetStudentIds([]);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-cyan-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {activeClass && activeClass.students.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Giao riêng cho từng học sinh (Bỏ trống = Giao cả lớp):
                  </label>
                  <div className="max-h-32 overflow-y-auto p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
                    {activeClass.students.map((st) => (
                      <label key={st.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={targetStudentIds.includes(st.id)}
                          onChange={() => toggleTargetStudent(st.id)}
                          className="rounded text-cyan-600"
                        />
                        <span>{st.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Chọn Bộ bài tập:
                </label>
                <select
                  value={selectedExId}
                  onChange={(e) => setSelectedExId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-cyan-500"
                >
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} (Khối {ex.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Hạn hoàn thành:
                </label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedClassId || !selectedExId}
                  className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang giao...' : 'Xác nhận giao bài'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Tạo bộ bài tập tự chọn (Single Choice / Short Answer / Essay) */}
      {showExModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
              Tạo Bộ Bài Tập Tùy Chỉnh
            </h3>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCustomExercise} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Tiêu đề bộ bài tập:</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Luyện tập Phân số tuần 18"
                  value={exTitle}
                  onChange={(e) => setExTitle(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Khối lớp:</label>
                  <select
                    value={exGrade}
                    onChange={(e) => setExGrade(Number(e.target.value))}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>Lớp {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Môn học:</label>
                  <select
                    value={exSubject}
                    onChange={(e) => setExSubject(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="toan">Toán</option>
                    <option value="tieng-viet">Tiếng Việt</option>
                    <option value="khoa-hoc">Khoa học</option>
                    <option value="tin-hoc">Tin học</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Loại câu:</label>
                  <select
                    value={exQType}
                    onChange={(e) => setExQType(e.target.value as QuestionType)}
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="single_choice">Trắc nghiệm</option>
                    <option value="short_answer">Điền đáp án</option>
                    <option value="essay">Tự luận</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Nội dung câu hỏi:</label>
                <textarea
                  rows={2}
                  required
                  value={exQText}
                  onChange={(e) => setExQText(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi..."
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              {exQType === 'single_choice' ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" required placeholder="Đáp án A" value={exOptA} onChange={(e) => setExOptA(e.target.value)} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                    <input type="text" required placeholder="Đáp án B" value={exOptB} onChange={(e) => setExOptB(e.target.value)} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                    <input type="text" placeholder="Đáp án C" value={exOptC} onChange={(e) => setExOptC(e.target.value)} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Đáp án đúng:</label>
                    <select
                      value={exCorrectIdx}
                      onChange={(e) => setExCorrectIdx(Number(e.target.value))}
                      className="ml-2 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value={0}>A</option>
                      <option value={1}>B</option>
                      <option value={2}>C</option>
                    </select>
                  </div>
                </div>
              ) : exQType === 'short_answer' ? (
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Đáp án đúng:</label>
                  <input
                    type="text"
                    required
                    value={exShortAns}
                    onChange={(e) => setExShortAns(e.target.value)}
                    placeholder="Ví dụ: 3/4"
                    className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              ) : null}

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Lời giải gợi ý:</label>
                <input
                  type="text"
                  value={exExplanation}
                  onChange={(e) => setExExplanation(e.target.value)}
                  placeholder="Hướng dẫn giải chi tiết cho học sinh..."
                  className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowExModal(false)} className="px-4 py-2 text-slate-500">Hủy</button>
                <button type="submit" disabled={creatingEx} className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-semibold disabled:opacity-60">
                  {creatingEx ? 'Đang tạo...' : 'Lưu bộ bài tập'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
