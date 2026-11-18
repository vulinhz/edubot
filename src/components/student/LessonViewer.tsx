/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Lesson, isLessonVerified } from '../../types/index.ts';
import { persistProgressToFirestore } from '../../lib/firestoreService.ts';
import { LessonVisualDiagram } from './LessonVisualDiagram.tsx';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Bot,
  PlayCircle,
  HelpCircle,
  FileCheck2,
  BookOpen,
  Clock,
  Heart,
  Sparkles,
  Wrench,
  Languages,
} from 'lucide-react';

interface LessonViewerProps {
  lesson: Lesson;
  subjectName?: string;
  hasMatchingExercise?: boolean;
  isCompleted?: boolean;
  isFavorite?: boolean;
  authToken?: string | null;
  onBack: () => void;
  onOpenExercise: (lessonId: string) => void;
  onAskAi: (lessonTitle: string, lessonId: string) => void;
  onToggleFavorite?: (lessonId: string) => void;
  onProgressUpdated?: (lessonId: string, xpEarned: number) => void;
  onLessonOpened?: (lessonId: string) => void;
}

export const LessonViewer: React.FC<LessonViewerProps> = ({
  lesson,
  subjectName,
  hasMatchingExercise = true,
  isCompleted = false,
  isFavorite = false,
  authToken,
  onBack,
  onOpenExercise,
  onAskAi,
  onToggleFavorite,
  onProgressUpdated,
  onLessonOpened,
}) => {
  const [activeCheckpointAnswer, setActiveCheckpointAnswer] = useState<number | null>(null);
  const [showCheckpointFeedback, setShowCheckpointFeedback] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [completedDone, setCompletedDone] = useState(isCompleted);
  const [progressBanner, setProgressBanner] = useState('');

  useEffect(() => {
    setActiveCheckpointAnswer(null);
    setShowCheckpointFeedback(false);
    setCompletedDone(isCompleted);
    setProgressBanner('');
  }, [lesson.id, isCompleted]);

  useEffect(() => {
    onLessonOpened?.(lesson.id);
    if (!authToken) return;
    fetch('/api/learning-progress/open', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ lessonId: lesson.id }),
    }).catch(() => {});
  }, [lesson.id, authToken]);

  const checkpoint = lesson.interactiveContent?.sections[0]?.checkpointQuestion;
  const verified = isLessonVerified(lesson.status);

  const statusBadge = verified
    ? {
        cls: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
        label: 'Đã kiểm duyệt nội dung',
      }
    : lesson.status === 'pending' || lesson.status === 'NEEDS_REVIEW'
    ? {
        cls: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
        label: 'Đang chờ rà soát',
      }
    : {
        cls: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
        label: 'Bản nháp tham khảo',
      };

  const handleMarkCompleted = async () => {
    if (!authToken) {
      setProgressBanner('Hãy đăng nhập tài khoản học sinh để lưu tiến độ và nhận +15 XP.');
      return;
    }
    setMarkingComplete(true);
    setProgressBanner('');
    const checkpointPassed =
      Boolean(checkpoint) && activeCheckpointAnswer === checkpoint?.correctAnswer;
    try {
      const res = await fetch('/api/learning-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          lessonId: lesson.id,
          completed: true,
          checkpointPassed,
          timeSpentSeconds: 180,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCompletedDone(true);
        setProgressBanner(
          data.xpEarned > 0
            ? `Hoàn thành bài học! Bạn nhận được +${data.xpEarned} XP.`
            : 'Đã cập nhật hoàn thành bài học.'
        );
        if (data.progress) {
          persistProgressToFirestore(data.progress).catch(() => {});
        }
        onProgressUpdated?.(lesson.id, data.xpEarned || 0);
      } else {
        setProgressBanner(data.error || 'Không thể lưu tiến độ bài học.');
      }
    } catch {
      setProgressBanner('Lỗi kết nối máy chủ khi lưu tiến độ.');
    } finally {
      setMarkingComplete(false);
    }
  };

  const mods = lesson.subjectModules;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại kho học liệu</span>
        </button>

        <div className="flex items-center gap-2 text-xs">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(lesson.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-semibold transition-colors ${
                isFavorite
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-300'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              <span>{isFavorite ? 'Đã lưu yêu thích' : 'Lưu bài'}</span>
            </button>
          )}
          <span className={`inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg border ${statusBadge.cls}`}>
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>{statusBadge.label}</span>
          </span>
        </div>
      </div>

      {/* 1. Header Card */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-cyan-600 dark:text-cyan-400">
            {subjectName || lesson.subjectId}
          </span>
          <span aria-hidden="true">·</span>
          <span>Lớp {lesson.grade}</span>
          {lesson.chapter && (
            <>
              <span aria-hidden="true">·</span>
              <span>{lesson.chapter}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{lesson.estimatedDuration || 15} phút</span>
          </span>
          {lesson.sourceBook && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-cyan-500" />
                <span>{lesson.sourceBook}</span>
              </span>
            </>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display">
          {lesson.title}
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {lesson.summary}
        </p>

        {lesson.sourceVerificationNote && (
          <div className="text-[11px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            <strong>Nguồn biên soạn:</strong> {lesson.sourceVerificationNote}
          </div>
        )}

        <div className="pt-1 flex flex-wrap items-center gap-3">
          {hasMatchingExercise && (
            <button
              type="button"
              onClick={() => onOpenExercise(lesson.id)}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-colors flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Làm bài luyện tập</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onAskAi(lesson.title, lesson.id)}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-2"
          >
            <Bot className="w-4 h-4 text-cyan-500" />
            <span>Hỏi EduBot về bài này</span>
          </button>

          <button
            type="button"
            onClick={handleMarkCompleted}
            disabled={markingComplete || completedDone}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 ${
              completedDone
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {completedDone
                ? 'Đã hoàn thành'
                : markingComplete
                ? 'Đang lưu...'
                : 'Đánh dấu hoàn thành'}
            </span>
          </button>
        </div>

        {progressBanner && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
            {progressBanner}
          </div>
        )}
      </div>

      {/* 2. Mục tiêu cần đạt */}
      {lesson.objectives.length > 0 && (
        <div className="bg-cyan-50/70 dark:bg-cyan-950/20 p-6 rounded-3xl border border-cyan-100 dark:border-cyan-900/40 space-y-2.5">
          <div className="flex items-center gap-2 text-cyan-900 dark:text-cyan-300 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 text-cyan-600" />
            <span>Mục tiêu cần đạt sau bài học</span>
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm text-cyan-950 dark:text-cyan-200 list-disc list-inside leading-relaxed">
            {lesson.objectives.map((obj, i) => (
              <li key={i}>{obj}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Hình ảnh / Sơ đồ trực quan */}
      {lesson.visualDiagramKey && (
        <LessonVisualDiagram
          diagramKey={lesson.visualDiagramKey}
          caption={lesson.visualDiagramCaption}
        />
      )}

      {/* 4. Kiến thức trọng tâm (short chunked points) */}
      {lesson.coreKnowledge.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
            Kiến thức trọng tâm
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lesson.coreKnowledge.map((k, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed flex items-start gap-2.5"
              >
                <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{k}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Nội dung bài học từng phần */}
      {lesson.interactiveContent?.sections.map((sec, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4"
        >
          <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
            {sec.title}
          </h2>

          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {sec.content}
          </div>

          {sec.example && (
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold mb-0.5">Ví dụ minh họa:</strong>
                {sec.example}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* 6. Ví dụ từng bước (Toán / Logic) */}
      {lesson.workedExamples && lesson.workedExamples.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white font-display">
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span>Ví dụ giải từng bước</span>
          </div>

          <div className="space-y-4">
            {lesson.workedExamples.map((ex, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="text-sm font-bold text-slate-900 dark:text-white">{ex.title}</div>
                <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
                  Đề bài: {ex.problem}
                </div>
                <ol className="space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
                  {ex.steps.map((step, sIdx) => (
                    <li key={sIdx}>{step}</li>
                  ))}
                </ol>
                <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  Đáp án: {ex.answer}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Học phần chuyên biệt theo môn */}
      {mods && (
        <div className="space-y-4">
          {mods.readingPassage && (
            <div className="bg-amber-50/50 dark:bg-amber-950/15 p-6 rounded-3xl border border-amber-200 dark:border-amber-900/40 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                  Văn bản đọc: {mods.readingPassage.title}
                </h2>
                {mods.readingPassage.author && (
                  <span className="text-xs text-slate-500 italic">{mods.readingPassage.author}</span>
                )}
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {mods.readingPassage.text}
              </p>
            </div>
          )}

          {(mods.wordAndSentence || mods.spellingTip || mods.writingTask) && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Luyện từ, chính tả &amp; tập viết
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs sm:text-sm">
                {mods.wordAndSentence && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <strong className="block text-cyan-700 dark:text-cyan-300 mb-1">Luyện từ và câu</strong>
                    <span className="text-slate-700 dark:text-slate-300">{mods.wordAndSentence}</span>
                  </div>
                )}
                {mods.spellingTip && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <strong className="block text-amber-700 dark:text-amber-300 mb-1">Lưu ý chính tả</strong>
                    <span className="text-slate-700 dark:text-slate-300">{mods.spellingTip}</span>
                  </div>
                )}
                {mods.writingTask && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <strong className="block text-emerald-700 dark:text-emerald-300 mb-1">Thực hành viết</strong>
                    <span className="text-slate-700 dark:text-slate-300">{mods.writingTask}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {mods.vocabulary && mods.vocabulary.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white font-display">
                <Languages className="w-4 h-4 text-cyan-500" />
                <span>Từ vựng &amp; Phát âm</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mods.vocabulary.map((v, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-cyan-700 dark:text-cyan-300">{v.word}</span>
                      {v.phonetic && (
                        <span className="font-mono text-xs text-slate-500">{v.phonetic}</span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200">{v.meaning}</div>
                    <div className="text-xs text-slate-500 italic">{v.example}</div>
                  </div>
                ))}
              </div>
              {mods.sentencePatterns && mods.sentencePatterns.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/40 text-xs sm:text-sm space-y-1">
                  <strong className="text-cyan-900 dark:text-cyan-300">Mẫu câu giao tiếp:</strong>
                  <ul className="list-disc list-inside text-slate-700 dark:text-slate-300">
                    {mods.sentencePatterns.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {mods.communicationScenario && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
                  <strong>Tình huống giao tiếp:</strong> {mods.communicationScenario}
                </div>
              )}
            </div>
          )}

          {mods.realLifeScenario && (
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-5 rounded-3xl border border-emerald-200 dark:border-emerald-900/40 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200">
              <strong className="block mb-1">Tình huống thực tế:</strong>
              <span>{mods.realLifeScenario}</span>
            </div>
          )}

          {mods.labPracticeSteps && mods.labPracticeSteps.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white font-display">
                <Wrench className="w-4 h-4 text-cyan-500" />
                <span>Hoạt động thực hành từng bước</span>
              </div>
              <ol className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 list-decimal list-inside">
                {mods.labPracticeSteps.map((step, sIdx) => (
                  <li key={sIdx}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* 8. Câu hỏi kiểm tra nhanh */}
      {checkpoint && (
        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-cyan-500/40 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
            <HelpCircle className="w-4 h-4" />
            <span>Câu hỏi kiểm tra nhanh</span>
          </div>

          <h3 className="text-base font-bold text-white">{checkpoint.question}</h3>

          <div className="space-y-2 pt-1">
            {checkpoint.options.map((opt, oIdx) => (
              <button
                key={oIdx}
                type="button"
                onClick={() => {
                  setActiveCheckpointAnswer(oIdx);
                  setShowCheckpointFeedback(true);
                }}
                className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-colors ${
                  activeCheckpointAnswer === oIdx
                    ? oIdx === checkpoint.correctAnswer
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-semibold'
                      : 'bg-red-500/20 border-red-400 text-red-200 font-semibold'
                    : 'bg-slate-800/80 border-slate-700 hover:border-cyan-400 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs shrink-0">
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                  <span>{opt}</span>
                </div>
              </button>
            ))}
          </div>

          {showCheckpointFeedback && (
            <div
              className={`p-4 rounded-xl text-xs sm:text-sm border ${
                activeCheckpointAnswer === checkpoint.correctAnswer
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-red-950/60 border-red-800 text-red-300'
              }`}
            >
              <strong>
                {activeCheckpointAnswer === checkpoint.correctAnswer ? 'Chính xác!' : 'Gợi ý:'}
              </strong>{' '}
              {checkpoint.explanation}
            </div>
          )}
        </div>
      )}

      {/* 9. Tổng kết & Lưu ý lỗi thường gặp */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
          Tổng kết kiến thức
        </h2>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {lesson.summary}
        </p>

        {lesson.commonMisconceptions.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Lưu ý tránh nhầm lẫn</span>
            </div>
            <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 list-disc list-inside">
              {lesson.commonMisconceptions.map((mis, i) => (
                <li key={i}>{mis}</li>
              ))}
            </ul>
          </div>
        )}

        {lesson.termsAndDefinitions.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Từ khóa cần nhớ
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lesson.termsAndDefinitions.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1"
                >
                  <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                    {item.term}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    {item.definition}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
