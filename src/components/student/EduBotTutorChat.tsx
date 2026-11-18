/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  AiChatMessage,
  CurriculumSubject,
  Lesson,
  isLessonVerified,
} from '../../types/index.ts';
import { persistChatMessageToFirestore } from '../../lib/firestoreService.ts';
import { EduBotMascot } from '../EduBotMascot.tsx';
import { Send, Bot, BookOpen, ShieldCheck, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';

interface EduBotTutorChatProps {
  grade: number;
  subjects: CurriculumSubject[];
  lessons: Lesson[];
  initialLessonTitle?: string;
  initialLessonId?: string;
  authToken?: string | null;
  onRequireAuth?: () => void;
}

export const EduBotTutorChat: React.FC<EduBotTutorChatProps> = ({
  grade,
  subjects,
  lessons,
  initialLessonTitle,
  initialLessonId,
  authToken,
  onRequireAuth,
}) => {
  const gradeSubjects = useMemo(() => {
    const filtered = subjects.filter((s) => s.grades.includes(grade));
    return filtered.length > 0 ? filtered : [{ id: 'toan', name: 'Toán' } as CurriculumSubject];
  }, [subjects, grade]);

  const initialLessonObj = useMemo(
    () => lessons.find((l) => l.id === initialLessonId),
    [lessons, initialLessonId]
  );

  const [selectedSubject, setSelectedSubject] = useState<string>(
    initialLessonObj?.subjectId || gradeSubjects[0]?.id || 'toan'
  );
  const [selectedLessonId, setSelectedLessonId] = useState<string>(initialLessonId || '');

  useEffect(() => {
    if (!gradeSubjects.some((s) => s.id === selectedSubject)) {
      setSelectedSubject(gradeSubjects[0]?.id || 'toan');
      setSelectedLessonId('');
    }
  }, [grade, gradeSubjects, selectedSubject]);

  useEffect(() => {
    if (initialLessonId) {
      setSelectedLessonId(initialLessonId);
      const found = lessons.find((l) => l.id === initialLessonId);
      if (found) setSelectedSubject(found.subjectId);
    }
  }, [initialLessonId, lessons]);

  const subjectLessons = useMemo(
    () => lessons.filter((l) => l.grade === grade && l.subjectId === selectedSubject),
    [lessons, grade, selectedSubject]
  );

  const activeLesson = useMemo(
    () => lessons.find((l) => l.id === selectedLessonId),
    [lessons, selectedLessonId]
  );

  const buildWelcomeMessage = (targetGrade: number, lessonTitle?: string): AiChatMessage => ({
    id: `init-${targetGrade}`,
    sender: 'edubot',
    text: lessonTitle
      ? `Chào bạn nhỏ! Tớ là EduBot. Tớ đã sẵn sàng cùng bạn tìm hiểu bài "${lessonTitle}" (Lớp ${targetGrade}). Bạn muốn hỏi phần nào ở bài này?`
      : `Chào bạn nhỏ! Tớ là EduBot. Bạn có thể chọn môn học và bài học đang xem để tớ giải thích dễ hiểu và gợi ý từng bước nhé.`,
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    robotExpression: 'happy',
    suggestedPrompts: [
      lessonTitle
        ? `Giải thích trọng tâm bài "${lessonTitle}" giúp tớ với!`
        : `Đố tớ một câu hỏi vui Lớp ${targetGrade} đi EduBot!`,
      'Cho tớ một ví dụ gần gũi dễ hiểu!',
      'Hướng dẫn tớ làm từng bước nhé!',
    ],
  });

  const [messages, setMessages] = useState<AiChatMessage[]>([
    buildWelcomeMessage(grade, activeLesson?.title || initialLessonTitle),
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [currentExpression, setCurrentExpression] = useState<
    'happy' | 'thinking' | 'explaining' | 'celebrating'
  >('happy');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function loadHistory() {
      if (!authToken) {
        if (active) {
          setMessages([buildWelcomeMessage(grade, activeLesson?.title || initialLessonTitle)]);
        }
        return;
      }
      try {
        const res = await fetch('/api/ai/student-chat/history', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data.history) && data.history.length > 0) {
            setMessages(data.history);
            return;
          }
        }
      } catch {
        // Keep welcome message
      }
      if (active) {
        setMessages([buildWelcomeMessage(grade, activeLesson?.title || initialLessonTitle)]);
      }
    }
    loadHistory();
    return () => {
      active = false;
    };
  }, [authToken, grade, initialLessonTitle]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleClearHistory = async () => {
    if (authToken) {
      await fetch('/api/ai/student-chat/history', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    }
    setMessages([buildWelcomeMessage(grade, activeLesson?.title || initialLessonTitle)]);
    setErrorBanner('');
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || isLoading) return;

    if (!authToken) {
      setErrorBanner('Vui lòng đăng nhập tài khoản học sinh để trò chuyện với EduBot.');
      onRequireAuth?.();
      return;
    }

    const userMsg: AiChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'student',
      text,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsLoading(true);
    setErrorBanner('');
    setCurrentExpression('thinking');

    try {
      const response = await fetch('/api/ai/student-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          message: text,
          grade,
          subject: selectedSubject,
          currentLessonId: selectedLessonId || initialLessonId || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorBanner(data.error || 'Không thể nhận phản hồi từ EduBot lúc này.');
        setCurrentExpression('happy');
        return;
      }

      const botReply: AiChatMessage = {
        id: data.botMessage?.id || `msg-${Date.now() + 1}`,
        sender: 'edubot',
        text: data.text,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        referencedLessons: data.referencedLessons,
        citations: data.citations,
        suggestedPrompts: data.suggestedPrompts,
        robotExpression: data.robotExpression || 'explaining',
      };

      setMessages((prev) => [...prev, botReply]);
      setCurrentExpression(data.robotExpression || 'happy');
      persistChatMessageToFirestore(userMsg).catch(() => {});
      persistChatMessageToFirestore(botReply).catch(() => {});
    } catch {
      setErrorBanner('Lỗi kết nối máy chủ EduBot. Vui lòng thử lại sau ít giây.');
      setCurrentExpression('happy');
    } finally {
      setIsLoading(false);
    }
  };

  const matchedCount = subjectLessons.filter((l) => isLessonVerified(l.status)).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <EduBotMascot size="sm" expression={currentExpression} interactive={false} />
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-cyan-400">
                <span>Gia sư EduBot · Lớp {grade}</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>An toàn cho trẻ em</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold font-display text-white">
                Hỏi đáp bài học cùng EduBot
              </h1>
              <p className="text-xs text-slate-300">
                Đã kết nối {matchedCount} bài học môn đang chọn cho Lớp {grade}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearHistory}
            title="Làm mới cuộc trò chuyện"
            className="self-start sm:self-auto px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Cuộc trò chuyện mới</span>
          </button>
        </div>

        {/* Grade-eligible Subject & Lesson Context Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Môn học Lớp {grade}</label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedLessonId('');
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
            >
              {gradeSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Bài học đang tìm hiểu</label>
            <select
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="">Tất cả bài học trong môn</option>
              {subjectLessons.map((les) => (
                <option key={les.id} value={les.id}>
                  {les.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {errorBanner && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Chat Messages Log */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[500px]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m) => {
            const isBot = m.sender === 'edubot';
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}
              >
                {isBot && (
                  <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-400 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-lg rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isBot
                      ? 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                      : 'bg-cyan-600 text-white font-medium'
                  }`}
                >
                  <div className="whitespace-pre-line">{m.text}</div>

                  {m.referencedLessons && m.referencedLessons.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5 text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span>Bài học liên quan: {m.referencedLessons.join(', ')}</span>
                    </div>
                  )}

                  {m.suggestedPrompts && (
                    <div className="mt-3 pt-2 flex flex-wrap gap-1.5">
                      {m.suggestedPrompts.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => handleSendMessage(p)}
                          className="text-[11px] bg-white dark:bg-slate-700 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-slate-600 px-2.5 py-1 rounded-lg border border-cyan-200 dark:border-slate-600 transition-colors text-left"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}

                  <div
                    className={`mt-1.5 text-[10px] text-right font-mono ${
                      isBot ? 'text-slate-400' : 'text-cyan-100'
                    }`}
                  >
                    {m.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 items-center text-xs text-slate-500">
              <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-400 flex items-center justify-center">
                <Bot className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-cyan-500 animate-spin" />
                <span>EduBot đang suy nghĩ gợi ý cho bạn...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
          <input
            type="text"
            placeholder="Hỏi EduBot câu hỏi về bài học..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
          />

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            <span>Gửi</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
