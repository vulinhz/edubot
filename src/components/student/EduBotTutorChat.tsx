/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { AiChatMessage, Lesson, isLessonVerified } from '../../types/index.ts';
import { persistChatMessageToFirestore } from '../../lib/firestoreService.ts';
import { EduBotMascot } from '../EduBotMascot.tsx';
import { Send, Bot, BookOpen, ShieldCheck, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';

interface EduBotTutorChatProps {
  grade: number;
  lessons: Lesson[];
  initialLessonTitle?: string;
  initialLessonId?: string;
  authToken?: string | null;
  onRequireAuth?: () => void;
}

export const EduBotTutorChat: React.FC<EduBotTutorChatProps> = ({
  grade,
  lessons,
  initialLessonTitle,
  initialLessonId,
  authToken,
  onRequireAuth,
}) => {
  const buildWelcomeMessage = (targetGrade: number, lessonTitle?: string): AiChatMessage => ({
    id: `init-${targetGrade}`,
    sender: 'edubot',
    text: lessonTitle
      ? `Xin chào bạn nhỏ! 🤖 Tớ là EduBot - gia sư Robot của bạn. Tớ đã sẵn sàng cùng bạn tìm hiểu bài "${lessonTitle}" (Lớp ${targetGrade}). Bạn có thắc mắc gì ở bài này hãy hỏi tớ nhé!`
      : `Xin chào bạn nhỏ! 🤖 Tớ là EduBot - người bạn Robot gia sư của bạn. Tớ có thể giúp bạn giải thích các bài học Lớp ${targetGrade}, gợi ý cách giải bài tập hoặc cùng bạn giải các câu đố vui toán học và khoa học. Hôm nay bạn muốn tìm hiểu điều gì nào?`,
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    robotExpression: 'happy',
    suggestedPrompts: [
      lessonTitle ? `Giải thích trọng tâm bài "${lessonTitle}" giúp tớ với!` : `Đố tớ một câu đố vui Lớp ${targetGrade} đi EduBot!`,
      'EduBot ơi, cho tớ một ví dụ thực tế thật dễ hiểu!',
      'Tớ muốn luyện tư duy từng bước!',
    ],
  });

  const [messages, setMessages] = useState<AiChatMessage[]>([
    buildWelcomeMessage(grade, initialLessonTitle),
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [currentExpression, setCurrentExpression] = useState<'happy' | 'thinking' | 'explaining' | 'celebrating'>('happy');
  const [selectedSubject, setSelectedSubject] = useState('toan');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Sync chat history from backend when authenticated, or reset greeting on grade/lesson change
  useEffect(() => {
    let active = true;
    async function loadHistory() {
      if (!authToken) {
        if (active) setMessages([buildWelcomeMessage(grade, initialLessonTitle)]);
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
        // Keep welcome message if history cannot load
      }
      if (active) {
        setMessages([buildWelcomeMessage(grade, initialLessonTitle)]);
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
    setMessages([buildWelcomeMessage(grade, initialLessonTitle)]);
    setErrorBanner('');
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || isLoading) return;

    if (!authToken) {
      setErrorBanner('Vui lòng đăng nhập tài khoản học sinh để trò chuyện với Gia sư AI EduBot.');
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
          currentLessonId: initialLessonId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorBanner(data.error || 'Không thể nhận phản hồi từ EduBot AI lúc này.');
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
      setErrorBanner('Lỗi kết nối máy chủ AI EduBot. Vui lòng thử lại sau ít giây.');
      setCurrentExpression('happy');
    } finally {
      setIsLoading(false);
    }
  };

  const matchedCount = lessons.filter(
    (l) => l.grade === grade && l.subjectId === selectedSubject && isLessonVerified(l.status)
  ).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-cyan-500/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <EduBotMascot size="sm" expression={currentExpression} interactive={false} />
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-cyan-400">
              <span>Gia sư AI Thông minh (Lớp {grade})</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Không gian an toàn cho trẻ em</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold font-display text-white">
              Phòng trò chuyện cùng EduBot
            </h1>
            <p className="text-xs text-slate-300">
              Đang kết nối {matchedCount} học liệu chuẩn hóa đã thẩm định cho môn này (CTGDPT 2018 & TT 17/2025).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs">
            <span className="text-slate-400 px-2 font-medium">Môn:</span>
            {['toan', 'tieng-viet', 'khoa-hoc'].map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  selectedSubject === sub
                    ? 'bg-cyan-500 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {sub === 'toan' ? 'Toán' : sub === 'tieng-viet' ? 'Tiếng Việt' : 'Khoa học'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleClearHistory}
            title="Làm mới cuộc trò chuyện"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorBanner && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Chat Messages Log */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[520px]">
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
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium'
                  }`}
                >
                  <div className="whitespace-pre-line">{m.text}</div>

                  {m.referencedLessons && m.referencedLessons.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5 text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span>Căn cứ bài học: {m.referencedLessons.join(', ')}</span>
                    </div>
                  )}

                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {m.citations.map((c) => (
                        <div
                          key={c.chunkId}
                          className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                        >
                          <span className="font-semibold text-cyan-700 dark:text-cyan-300">{c.title}</span>{' '}
                          <span className="text-slate-400">({c.sourceRef})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {m.suggestedPrompts && (
                    <div className="mt-3 pt-2 flex flex-wrap gap-1.5">
                      {m.suggestedPrompts.map((p, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleSendMessage(p)}
                          className="text-[11px] bg-white dark:bg-slate-700 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-slate-600 px-2.5 py-1 rounded-lg border border-cyan-200 dark:border-slate-600 transition-colors text-left"
                        >
                          ⚡ {p}
                        </button>
                      ))}
                    </div>
                  )}

                  <div
                    className={`mt-1.5 text-[10px] text-right font-mono ${
                      isBot ? 'text-slate-400' : 'text-cyan-200'
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
              <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-400 flex items-center justify-center animate-pulse">
                <Bot className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-cyan-500 animate-spin" />
                <span>EduBot đang suy nghĩ và tra cứu kiến thức chuẩn...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
          <input
            type="text"
            placeholder="Hỏi EduBot bất kỳ câu hỏi nào về bài học..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            <span>Gửi</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
