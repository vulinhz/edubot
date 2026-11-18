/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { KnowledgeNode, Lesson } from '../../types/index.ts';
import { Compass, CheckCircle2, Lock, ArrowRight, BookOpen, AlertCircle, Sparkles, Layers } from 'lucide-react';

interface KnowledgeMapProps {
  nodes: KnowledgeNode[];
  lessons: Lesson[];
  onOpenLesson: (lessonId: string) => void;
  onAskTutor: (conceptTitle: string) => void;
}

export const KnowledgeMap: React.FC<KnowledgeMapProps> = ({
  nodes,
  lessons,
  onOpenLesson,
  onAskTutor,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(nodes[3]?.id || nodes[0]?.id || '');

  const activeNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
  const matchedLesson = lessons.find((l) => l.id === activeNode?.lessonId);

  // Find prerequisite node details
  const prerequisiteNodes = activeNode?.prerequisites
    .map((prereqId) => nodes.find((n) => n.id === prereqId))
    .filter(Boolean) as KnowledgeNode[];

  // Find next nodes
  const nextNodes = activeNode?.nextNodes
    .map((nextId) => nodes.find((n) => n.id === nextId))
    .filter(Boolean) as KnowledgeNode[];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-indigo-900/60 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 font-mono">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>BẢN ĐỒ TRI THỨC TOÁN TIỂU HỌC 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white">
            Hành Trình Kiến Thức & Mối Quan Hệ Tiên Quyết
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Sơ đồ mạng lưới các mắt xích kiến thức từ Lớp 1 đến Lớp 5. EduBot theo dõi tiến độ từng mảng để tự động đề xuất bài học nền tảng khi bạn gặp khó khăn.
          </p>
        </div>

        {/* Legend */}
        <div className="bg-black/40 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-xs space-y-1.5 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400" />
            <span className="text-slate-200">Đã tinh thông (≥ 70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400" />
            <span className="text-slate-200">Đang học & Sẵn sàng</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-600" />
            <span className="text-slate-400">Chưa mở khóa (Khóa)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Network Canvas (Left 7 cols) & Node Inspector (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Visual Map Chain (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-500" />
              <span>Chuỗi logic tiến trình toán học</span>
            </h2>
            <span className="text-xs font-mono text-slate-400">5 Mắt xích nền tảng</span>
          </div>

          <div className="space-y-4">
            {nodes.map((node, idx) => {
              const isSelected = node.id === activeNode?.id;
              const isMastered = node.status === 'mastered';
              const isLocked = node.status === 'locked';

              return (
                <div key={node.id} className="space-y-2">
                  <div
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/40 shadow-md ring-2 ring-cyan-500/20'
                        : isMastered
                        ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 hover:border-emerald-400'
                        : isLocked
                        ? 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50 dark:bg-slate-900 cursor-not-allowed'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold font-mono ${
                          isMastered
                            ? 'bg-emerald-500 text-white'
                            : isLocked
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                            : 'bg-cyan-500 text-white shadow-sm'
                        }`}
                      >
                        {isMastered ? <CheckCircle2 className="w-5 h-5" /> : isLocked ? <Lock className="w-4 h-4" /> : idx + 1}
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-slate-400">
                          Khối {node.grade} · Thứ tự {node.order}
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {node.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                          {node.masteryPercentage}%
                        </div>
                        <div className="text-[10px] text-slate-400">Mức thành thạo</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>

                  {/* Flow connector line */}
                  {idx < nodes.length - 1 && (
                    <div className="flex justify-center -my-1">
                      <div className="w-0.5 h-4 bg-gradient-to-b from-cyan-400 to-indigo-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Node Inspector & Recommendation (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 sticky top-24">
          {activeNode ? (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider font-mono">
                    CHI TIẾT CHỦ ĐỀ
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      activeNode.status === 'mastered'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                        : activeNode.status === 'locked'
                        ? 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        : 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40'
                    }`}
                  >
                    {activeNode.status === 'mastered'
                      ? 'ĐÃ TINH THÔNG'
                      : activeNode.status === 'locked'
                      ? 'CHƯA MỞ'
                      : 'ĐANG THỰC HIỆN'}
                  </span>
                </div>

                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 font-display">
                  {activeNode.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {activeNode.description}
                </p>
              </div>

              {/* Mastery bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-500">Tiến độ nắm vững:</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">
                    {activeNode.masteryPercentage}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${activeNode.masteryPercentage}%` }}
                  />
                </div>
              </div>

              {/* Prerequisites warning & linking */}
              {prerequisiteNodes.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Kiến thức nền tảng tiên quyết:</span>
                  </div>
                  <div className="space-y-1.5">
                    {prerequisiteNodes.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedNodeId(p.id)}
                        className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer flex items-center justify-between"
                      >
                        <span>• {p.title} (Khối {p.grade})</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {p.masteryPercentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EduBot Pedagogical Hint */}
              {activeNode.masteryPercentage < 70 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>Lời khuyên từ EduBot:</strong> Bạn chưa đạt 70% mức thành thạo cho chủ đề này. Hãy luyện thêm bài tập hoặc bấm "Ôn tập cùng EduBot" để được Robot hướng dẫn từng bước nhé!
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                {matchedLesson && (
                  <button
                    onClick={() => onOpenLesson(matchedLesson.id)}
                    className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Học bài giảng: {matchedLesson.title}</span>
                  </button>
                )}

                <button
                  onClick={() => onAskTutor(activeNode.title)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-cyan-500" />
                  <span>Ôn tập cùng gia sư EduBot</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">
              Chọn một mắt xích kiến thức bên trái để xem chi tiết.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
