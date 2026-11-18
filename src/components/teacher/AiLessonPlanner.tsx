/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, FileText, CheckCircle2, Copy, RefreshCw, Check, AlertCircle, Download, BookOpen } from 'lucide-react';
import { AiDraftItem, RagCitation } from '../../types/index.ts';

interface AiLessonPlannerProps {
  authToken?: string | null;
  onDraftCreated: (draft: AiDraftItem) => void;
}

export const AiLessonPlanner: React.FC<AiLessonPlannerProps> = ({ authToken, onDraftCreated }) => {
  const [grade, setGrade] = useState(4);
  const [subject, setSubject] = useState('toan');
  const [lessonName, setLessonName] = useState('Phân số bằng nhau và tính chất cơ bản của phân số');
  const [duration, setDuration] = useState('35 phút (1 tiết)');
  const [teachingMethod, setTeachingMethod] = useState('Phương pháp trực quan, dạy học hợp tác nhóm & Bàn tay nặn bột');
  const [objectives, setObjectives] = useState('Học sinh nhận biết được phân số bằng nhau qua trực quan hình học, nắm vững quy tắc nhân chia tử và mẫu.');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [citations, setCitations] = useState<RagCitation[]>([]);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSavedSuccess(false);
    setErrorMsg('');

    try {
      const res = await fetch('/api/ai/teacher/lesson-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          grade,
          subject,
          lessonName,
          duration,
          teachingMethod,
          objectives,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.draft) {
        setGeneratedResult(data.draft.content.text);
        setCitations(data.draft.citations || []);
        onDraftCreated(data.draft);
        setSavedSuccess(true);
      } else {
        setErrorMsg(data.error || 'Không thể tạo bản nháp giáo án từ Gemini AI.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối tới máy chủ AI. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedResult) return;
    navigator.clipboard.writeText(generatedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generatedResult) return;
    const blob = new Blob([generatedResult], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KHBD-Lop${grade}-${subject}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl border border-emerald-800/40 shadow-xl space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
          <Sparkles className="w-4 h-4" />
          <span>EDUBOT TEACHER AI STUDIO</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display">
          Trợ lý Soạn Kế Hoạch Bài Dạy (KHBD / Giáo Án)
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
          Tự động thiết kế tiến trình dạy học 4 bước (Khởi động · Khám phá · Luyện tập · Vận dụng) chuẩn hóa theo
          <strong> Công văn 2345/BGDĐT</strong> và <strong>Thông tư 32/2018/TT-BGDĐT</strong>.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
            Thông số kế hoạch tiết dạy
          </h2>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Khối lớp
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-emerald-500"
                >
                  {[1, 2, 3, 4, 5].map((g) => (
                    <option key={g} value={g}>
                      Lớp {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Môn học
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="toan">Toán</option>
                  <option value="tieng-viet">Tiếng Việt</option>
                  <option value="khoa-hoc">Khoa học</option>
                  <option value="tin-hoc">Tin học</option>
                  <option value="dao-duc">Đạo đức</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tên bài dạy:
              </label>
              <input
                type="text"
                required
                value={lessonName}
                onChange={(e) => setLessonName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Thời lượng tiết học:
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Phương pháp dạy học ưu tiên:
              </label>
              <textarea
                rows={2}
                value={teachingMethod}
                onChange={(e) => setTeachingMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Yêu cầu cần đạt dự kiến:
              </label>
              <textarea
                rows={2}
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI đang biên soạn KHBD...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Tạo bản nháp Giáo án AI</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                  Văn bản Kế hoạch bài dạy
                </h3>
              </div>

              {generatedResult && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="p-1.5 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors flex items-center gap-1 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải .md</span>
                  </button>
                </div>
              )}
            </div>

            {savedSuccess && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  Đã tự động lưu vào <strong>Hàng đợi duyệt bản nháp</strong> (Trạng thái: Bản nháp AI chờ thầy cô phê duyệt).
                </span>
              </div>
            )}

            {citations.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1 text-[11px]">
                <div className="font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Nguồn RAG đã trích dẫn ({citations.length}):</span>
                </div>
                {citations.map((c) => (
                  <div key={c.chunkId} className="text-slate-600 dark:text-slate-300">
                    • <strong>{c.title}</strong> ({c.sourceRef})
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-mono whitespace-pre-wrap max-h-[500px] overflow-y-auto">
              {generatedResult ? (
                generatedResult
              ) : (
                <div className="text-slate-400 py-12 text-center font-sans space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <div>Chưa có giáo án nào được tạo. Hãy điền thông tin và bấm &ldquo;Tạo bản nháp Giáo án AI&rdquo;.</div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
            * Nguyên tắc bắt buộc: Giáo viên kiểm tra lại sản phẩm AI trước khi đưa vào giảng dạy trên lớp.
          </div>
        </div>
      </div>
    </div>
  );
};
