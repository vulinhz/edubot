/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  CurriculumSubject,
  CurriculumTopic,
  Lesson,
  LearningProgress,
  WrongQuestionStat,
} from '../../types/index.ts';
import {
  Search,
  Clock,
  CheckCircle2,
  Heart,
  BookOpen,
  Play,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';

interface LearningLibraryProps {
  selectedGrade: number;
  onGradeChange: (grade: number) => void;
  subjects: CurriculumSubject[];
  topics: CurriculumTopic[];
  lessons: Lesson[];
  learningProgress: LearningProgress[];
  favoriteLessonIds: string[];
  lastOpenedLessonId: string | null;
  recommendedReviewLessons: { id: string; title: string; subjectId: string; grade: number; estimatedDuration?: number }[];
  wrongQuestions: WrongQuestionStat[];
  textbookSeriesLabel?: string;
  onToggleFavorite: (lessonId: string) => void;
  onOpenLesson: (lessonId: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  all: 'Tất cả dạng',
  lesson: 'Bài giảng',
  practice: 'Luyện tập',
  test: 'Kiểm tra',
  review: 'Ôn tập',
};

const STATUS_LABELS: Record<string, string> = {
  all: 'Tất cả trạng thái',
  uncompleted: 'Chưa học',
  completed: 'Đã học xong',
  favorite: 'Yêu thích',
};

export const LearningLibrary: React.FC<LearningLibraryProps> = ({
  selectedGrade,
  onGradeChange,
  subjects,
  topics,
  lessons,
  learningProgress,
  favoriteLessonIds,
  lastOpenedLessonId,
  recommendedReviewLessons,
  textbookSeriesLabel,
  onToggleFavorite,
  onOpenLesson,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('all');
  const [lessonTypeFilter, setLessonTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const completedSet = useMemo(
    () => new Set(learningProgress.filter((p) => p.completed).map((p) => p.lessonId)),
    [learningProgress]
  );
  const favoriteSet = useMemo(() => new Set(favoriteLessonIds), [favoriteLessonIds]);

  const gradeTopics = useMemo(
    () =>
      topics.filter(
        (t) =>
          t.grade === selectedGrade &&
          (selectedSubject === 'all' || t.subjectId === selectedSubject)
      ),
    [topics, selectedGrade, selectedSubject]
  );

  const subjectNameMap = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [subjects]);

  const lastOpenedLesson = useMemo(
    () => (lastOpenedLessonId ? lessons.find((l) => l.id === lastOpenedLessonId) : undefined),
    [lessons, lastOpenedLessonId]
  );

  const filteredLessons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return lessons.filter((les) => {
      if (les.grade !== selectedGrade) return false;
      if (selectedSubject !== 'all' && les.subjectId !== selectedSubject) return false;
      if (selectedTopicId !== 'all' && les.topicId !== selectedTopicId) return false;
      if (lessonTypeFilter !== 'all' && (les.lessonType || 'lesson') !== lessonTypeFilter) return false;
      const done = completedSet.has(les.id);
      const fav = favoriteSet.has(les.id);
      if (statusFilter === 'completed' && !done) return false;
      if (statusFilter === 'uncompleted' && done) return false;
      if (statusFilter === 'favorite' && !fav) return false;
      if (q && !les.title.toLowerCase().includes(q) && !les.lessonCode.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [
    lessons,
    selectedGrade,
    selectedSubject,
    selectedTopicId,
    lessonTypeFilter,
    statusFilter,
    searchQuery,
    completedSet,
    favoriteSet,
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white font-display">
            Kho Học Liệu Lớp {selectedGrade}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Bộ sách định hướng: {textbookSeriesLabel || 'Kết nối tri thức với cuộc sống'}
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên bài học..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Step 1: Select Grade (1-5) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 mr-1">Chọn lớp:</span>
            {[1, 2, 3, 4, 5].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  onGradeChange(g);
                  setSelectedSubject('all');
                  setSelectedTopicId('all');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  selectedGrade === g
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Lớp {g}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Lọc theo chủ đề"
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
            >
              <option value="all">Tất cả chủ đề</option>
              {gradeTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc theo loại nội dung"
              value={lessonTypeFilter}
              onChange={(e) => setLessonTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
            >
              {Object.entries(TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc theo trạng thái"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
            >
              {Object.entries(STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 2: Subject Selector (strictly filtered for grade) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              setSelectedSubject('all');
              setSelectedTopicId('all');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedSubject === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Tất cả môn ({lessons.filter((l) => l.grade === selectedGrade).length})
          </button>
          {subjects.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => {
                setSelectedSubject(sub.id);
                setSelectedTopicId('all');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedSubject === sub.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      </div>

      {/* Resume & Review Recommendations */}
      {(lastOpenedLesson || recommendedReviewLessons.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lastOpenedLesson && (
            <div className="bg-cyan-50 dark:bg-cyan-950/30 p-4 rounded-2xl border border-cyan-200 dark:border-cyan-800 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">
                  Tiếp tục học bài gần nhất
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {lastOpenedLesson.title}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenLesson(lastOpenedLesson.id)}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shrink-0 flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Học tiếp</span>
              </button>
            </div>
          )}

          {recommendedReviewLessons.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  <span>Gợi ý ôn tập từ câu làm sai</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {recommendedReviewLessons[0].title}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenLesson(recommendedReviewLessons[0].id)}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0"
              >
                Ôn lại ngay
              </button>
            </div>
          )}
        </div>
      )}

      {/* Minimalist Lesson Grid: Only Title, Subject, Duration, Status, Learn Button */}
      {filteredLessons.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Chưa có bài học phù hợp bộ lọc
          </div>
          <p className="text-xs text-slate-500">
            Thử chọn &ldquo;Tất cả môn&rdquo; hoặc đặt lại bộ lọc tìm kiếm.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLessons.map((les) => {
            const isCompleted = completedSet.has(les.id);
            const isFav = favoriteSet.has(les.id);
            const subjectLabel = subjectNameMap.get(les.subjectId) || les.subjectId;
            return (
              <div
                key={les.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-600 transition-colors flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-cyan-600 dark:text-cyan-400 truncate">
                      {subjectLabel}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{les.estimatedDuration || 15} phút</span>
                      </span>
                      <button
                        type="button"
                        aria-label={isFav ? 'Bỏ yêu thích' : 'Lưu yêu thích'}
                        onClick={() => onToggleFavorite(les.id)}
                        className={`p-1 rounded-lg transition-colors ${
                          isFav
                            ? 'text-rose-500 bg-rose-50 dark:bg-rose-950/40'
                            : 'text-slate-400 hover:text-rose-500'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {les.title}
                  </h3>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <span
                    className={`text-xs font-semibold inline-flex items-center gap-1 ${
                      isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isCompleted ? 'Đã học xong' : 'Chưa học'}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => onOpenLesson(les.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>Học ngay</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
