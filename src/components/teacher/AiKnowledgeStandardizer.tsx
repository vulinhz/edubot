/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, FileCheck, RefreshCw, Layers, AlertCircle, CheckCircle2, Download, Database, BookOpen } from 'lucide-react';
import { AiDraftItem, RagCitation, RagDocumentSummary } from '../../types/index.ts';

interface AiKnowledgeStandardizerProps {
  authToken?: string | null;
  onDraftCreated: (draft: AiDraftItem) => void;
}

export const AiKnowledgeStandardizer: React.FC<AiKnowledgeStandardizerProps> = ({
  authToken,
  onDraftCreated,
}) => {
  const [grade, setGrade] = useState(4);
  const [subject, setSubject] = useState('toan');
  const [lessonTitle, setLessonTitle] = useState('Rút gọn phân số và phân số tối giản');
  const [rawContent, setRawContent] = useState(
    'Rút gọn phân số là chia tử và mẫu cho một ước chung để phân số nhỏ đi. Phân số tối giản là phân số không chia được nữa.'
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [citations, setCitations] = useState<RagCitation[]>([]);

  // 10-Step RAG Ingestion State
  const [ragDocs, setRagDocs] = useState<RagDocumentSummary[]>([]);
  const [ragTitle, setRagTitle] = useState('');
  const [ragSourceRef, setRagSourceRef] = useState('TT 32/2018/TT-BGDĐT');
  const [ragRawText, setRagRawText] = useState('');
  const [ragSubmitting, setRagSubmitting] = useState(false);
  const [ragBanner, setRagBanner] = useState('');

  useEffect(() => {
    if (!authToken) return;
    fetch('/api/rag/documents', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (Array.isArray(list)) setRagDocs(list);
      })
      .catch(() => {});
  }, [authToken]);

  const handleStandardize = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/ai/teacher/standardize-knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          rawContent,
          grade,
          subject,
          lessonTitle,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.draft) {
        setAnalysisResult(data.draft.content.analysis);
        setCitations(data.draft.citations || []);
        onDraftCreated(data.draft);
        setSavedSuccess(true);
      } else {
        setErrorMsg(data.error || 'Không thể chuẩn hóa kiến thức lúc này.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối tới máy chủ AI. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIngestRag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    setRagSubmitting(true);
    setRagBanner('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/rag/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: ragTitle.trim(),
          grade,
          subjectId: subject,
          sourceRef: ragSourceRef.trim(),
          rawText: ragRawText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Không thể nạp tài liệu RAG.');
      } else {
        setRagBanner(`Đã nạp và tách thành ${data.chunksAdded} phân đoạn vào kho RAG.`);
        if (data.summary) {
          setRagDocs((prev) => [data.summary, ...prev]);
        }
        setRagTitle('');
        setRagRawText('');
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi nạp tài liệu RAG.');
    } finally {
      setRagSubmitting(false);
    }
  };

  const handleDownload = () => {
    if (!analysisResult) return;
    const blob = new Blob([analysisResult], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ChuanHoa-Lop${grade}-${subject}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl border border-blue-800/40 shadow-xl space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
          <FileCheck className="w-4 h-4" />
          <span>EDUBOT KNOWLEDGE AUDIT & 10-STEP RAG</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display">
          AI Chuẩn Hóa Tri Thức & Kho Tri Thức RAG
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
          Đối chiếu học liệu tự biên soạn với chuẩn CTGDPT 2018 (TT 32/2018 & TT 17/2025/TT-BGDĐT) và nạp tài liệu chuẩn hóa vào quy trình RAG 10 bước.
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
            Nội dung cần thẩm định
          </h2>

          <form onSubmit={handleStandardize} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Khối lớp:
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-cyan-500"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-cyan-500"
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
                Tên bài học / Chủ đề:
              </label>
              <input
                type="text"
                required
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Văn bản gốc cần kiểm tra & chuẩn hóa:
              </label>
              <textarea
                rows={6}
                required
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                placeholder="Dán nội dung giáo viên tự soạn hoặc trích dẫn vào đây..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI đang thẩm định văn bản...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Chuẩn hóa & Báo cáo đối chiếu</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-500" />
              <span>Báo cáo đối chiếu chuẩn hóa EduBot AI</span>
            </h3>
            {analysisResult ? (
              <button
                onClick={handleDownload}
                className="p-1.5 text-xs text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 rounded-lg flex items-center gap-1 font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải .md</span>
              </button>
            ) : (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                CTGDPT 2018 - 2026
              </span>
            )}
          </div>

          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Đã lưu báo cáo vào Hàng đợi duyệt học liệu.</span>
            </div>
          )}

          {citations.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1 text-[11px]">
              <div className="font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Nguồn RAG đã kiểm chứng ({citations.length}):</span>
              </div>
              {citations.map((c) => (
                <div key={c.chunkId} className="text-slate-600 dark:text-slate-300">
                  • <strong>{c.title}</strong> ({c.sourceRef})
                </div>
              ))}
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-mono whitespace-pre-wrap max-h-[500px] overflow-y-auto">
            {analysisResult ? (
              analysisResult
            ) : (
              <div className="text-slate-400 py-12 text-center font-sans space-y-2">
                <FileCheck className="w-8 h-8 mx-auto text-slate-300" />
                <div>Nhập nội dung vào form bên trái để AI tiến hành đối chiếu và xuất báo cáo.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RAG Document Ingestion Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-500" />
              <span>Nạp tài liệu vào Kho tri thức RAG 10 bước</span>
            </h2>
            <p className="text-xs text-slate-500">
              Văn bản nạp lên được chuẩn hóa Unicode, tách đoạn và đánh chỉ mục từ khóa cho AI tra cứu.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{ragDocs.length} tài liệu đã nạp</span>
        </div>

        {ragBanner && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
            {ragBanner}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleIngestRag} className="lg:col-span-6 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Tiêu đề tài liệu:</label>
                <input
                  type="text"
                  required
                  value={ragTitle}
                  onChange={(e) => setRagTitle(e.target.value)}
                  placeholder="Ví dụ: Chuyên đề Hình học Lớp 4"
                  className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300">Nguồn trích dẫn:</label>
                <input
                  type="text"
                  required
                  value={ragSourceRef}
                  onChange={(e) => setRagSourceRef(e.target.value)}
                  placeholder="SGK Kết nối tri thức"
                  className="w-full mt-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300">Nội dung văn bản nguồn:</label>
              <textarea
                rows={4}
                required
                minLength={30}
                value={ragRawText}
                onChange={(e) => setRagRawText(e.target.value)}
                placeholder="Dán đoạn kiến thức chuẩn (tối thiểu 30 ký tự) để tách chunk và đánh chỉ mục..."
                className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <button
              type="submit"
              disabled={ragSubmitting}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold disabled:opacity-60"
            >
              {ragSubmitting ? 'Đang tách chunk & đánh chỉ mục...' : 'Nạp vào Kho RAG'}
            </button>
          </form>

          <div className="lg:col-span-6 space-y-2 max-h-60 overflow-y-auto">
            {ragDocs.slice(0, 8).map((docItem) => (
              <div
                key={docItem.documentId}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white truncate">{docItem.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Lớp {docItem.grade} · {docItem.sourceRef} · {docItem.chunkCount} phân đoạn
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 shrink-0">
                  {docItem.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
