/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, RefreshCw, FileQuestion, AlertCircle, CheckCircle2, Download, BookOpen } from 'lucide-react';
import { AiDraftItem, RagCitation } from '../../types/index.ts';

interface AiQuizGeneratorProps {
  authToken?: string | null;
  onDraftCreated: (draft: AiDraftItem) => void;
}

export const AiQuizGenerator: React.FC<AiQuizGeneratorProps> = ({ authToken, onDraftCreated }) => {
  const [grade, setGrade] = useState(4);
  const [subject, setSubject] = useState('toan');
  const [topic, setTopic] = useState('Phân số bằng nhau, quy đồng và rút gọn phân số');
  const [questionCount, setQuestionCount] = useState(4);
  const [cognitiveLevels, setCognitiveLevels] = useState(['nhan_biet', 'thong_hieu', 'van_dung']);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [quizText, setQuizText] = useState<string | null>(null);
  const [citations, setCitations] = useState<RagCitation[]>([]);

  const toggleLevel = (lvl: string) => {
    if (cognitiveLevels.includes(lvl)) {
      if (cognitiveLevels.length > 1) {
        setCognitiveLevels(cognitiveLevels.filter((l) => l !== lvl));
      }
    } else {
      setCognitiveLevels([...cognitiveLevels, lvl]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/ai/teacher/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          grade,
          subject,
          topic,
          questionCount,
          cognitiveLevels,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.draft) {
        setQuizText(data.draft.content.text);
        setCitations(data.draft.citations || []);
        onDraftCreated(data.draft);
        setSavedSuccess(true);
      } else {
        setErrorMsg(data.error || 'Không thể tạo bộ đề kiểm tra lúc này.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối tới máy chủ AI. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!quizText) return;
    const blob = new Blob([quizText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DeKiemTra-Lop${grade}-${subject}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl border border-purple-800/40 shadow-xl space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
          <FileQuestion className="w-4 h-4" />
          <span>EDUBOT ASSESSMENT & EXAM BUILDER</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display">
          AI Tạo Bộ Câu Hỏi & Ma Trận Đề Kiểm Tra
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
          Tạo ma trận đề và câu hỏi phân hóa theo 4 mức độ nhận thức (Nhận biết · Thông hiểu · Vận dụng · Vận dụng cao), kèm lời giải chi tiết và gợi ý sư phạm.
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
            Ma trận thông số đề thi
          </h2>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Khối lớp:
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-purple-500"
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
                  Môn học:
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="toan">Toán</option>
                  <option value="tieng-viet">Tiếng Việt</option>
                  <option value="khoa-hoc">Khoa học</option>
                  <option value="tin-hoc">Tin học</option>
                  <option value="cong-nghe">Công nghệ</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Chủ đề / Yêu cầu cần đạt:
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Số lượng câu hỏi:
              </label>
              <input
                type="number"
                min={2}
                max={10}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                Mức độ nhận thức yêu cầu:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'nhan_biet', label: '1. Nhận biết' },
                  { id: 'thong_hieu', label: '2. Thông hiểu' },
                  { id: 'van_dung', label: '3. Vận dụng' },
                  { id: 'van_dung_cao', label: '4. Vận dụng cao' },
                ].map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => toggleLevel(lvl.id)}
                    className={`p-2 rounded-xl border font-medium text-left transition-colors ${
                      cognitiveLevels.includes(lvl.id)
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI đang thiết kế ma trận đề...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Tạo bộ câu hỏi & Lời giải AI</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
              <FileQuestion className="w-4 h-4 text-purple-500" />
              <span>Đề kiểm tra & Lời giải chi tiết</span>
            </h3>
            {quizText ? (
              <button
                onClick={handleDownload}
                className="p-1.5 text-xs text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg flex items-center gap-1 font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải .md</span>
              </button>
            ) : (
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                Có thang điểm & Đáp án
              </span>
            )}
          </div>

          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Đã lưu bộ đề vào Hàng đợi duyệt học liệu.</span>
            </div>
          )}

          {citations.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1 text-[11px]">
              <div className="font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Nguồn RAG tham chiếu ({citations.length}):</span>
              </div>
              {citations.map((c) => (
                <div key={c.chunkId} className="text-slate-600 dark:text-slate-300">
                  • <strong>{c.title}</strong> ({c.sourceRef})
                </div>
              ))}
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-mono whitespace-pre-wrap max-h-[500px] overflow-y-auto">
            {quizText ? (
              quizText
            ) : (
              <div className="text-slate-400 py-12 text-center font-sans space-y-2">
                <FileQuestion className="w-8 h-8 mx-auto text-slate-300" />
                <div>Cấu hình thông số và nhấn &ldquo;Tạo bộ câu hỏi & Lời giải AI&rdquo;.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
