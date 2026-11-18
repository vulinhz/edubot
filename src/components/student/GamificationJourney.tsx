/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User, Lesson, LearningProgress, isLessonVerified } from '../../types/index.ts';
import { EduBotMascot } from '../EduBotMascot.tsx';
import {
  Award,
  Star,
  CheckCircle2,
  Lock,
  Compass,
  Layers,
  ShieldCheck,
} from 'lucide-react';

interface GamificationJourneyProps {
  user: User;
  lessons?: Lesson[];
  learningProgress?: LearningProgress[];
  systemPolicy?: { leaderboardEnabled: boolean } | null;
  onStartQuest: (questId: string) => void;
}

export const GamificationJourney: React.FC<GamificationJourneyProps> = ({
  user,
  lessons = [],
  learningProgress = [],
  systemPolicy,
  onStartQuest,
}) => {
  const userGrade = user.grade || 4;
  const currentXp = user.xp ?? 0;
  const currentLevel = Math.floor(currentXp / 200) + 1;
  const currentLevelXp = currentXp % 200;

  const completedIds = new Set(learningProgress.filter((p) => p.completed).map((p) => p.lessonId));
  const gradeLessons = lessons.filter((l) => l.grade === userGrade);

  const milestones =
    gradeLessons.length > 0
      ? gradeLessons.slice(0, 5).map((les, idx) => {
          const isCompleted = completedIds.has(les.id);
          const prevCompleted = idx === 0 || completedIds.has(gradeLessons[idx - 1].id);
          const status = isCompleted ? 'completed' : prevCompleted ? 'active' : 'locked';
          return {
            id: les.id,
            title: les.title,
            grade: `Lớp ${userGrade} · ${les.subjectId.toUpperCase()}`,
            verified: isLessonVerified(les.status),
            status,
            stars: isCompleted ? 3 : status === 'active' ? 1 : 0,
          };
        })
      : [
          {
            id: `m-${userGrade}-1`,
            title: `Khởi động kiến thức nền tảng Lớp ${userGrade}`,
            grade: `Lớp ${userGrade}`,
            verified: true,
            status: 'active',
            stars: 1,
          },
        ];

  const badgesList = [
    {
      id: 'b1',
      title: 'Khởi đầu thám hiểm',
      description: 'Đạt tối thiểu 100 XP đầu tiên trên hệ thống EduBot.',
      unlocked: currentXp >= 100,
      color: 'from-cyan-400 to-blue-500',
    },
    {
      id: 'b2',
      title: 'Nhà thám hiểm sao',
      description: 'Duy trì chuỗi học tập 3 ngày liên tục không nghỉ.',
      unlocked: (user.streakDays ?? 0) >= 3,
      color: 'from-amber-400 to-orange-500',
    },
    {
      id: 'b3',
      title: 'Người chinh phục bài giảng',
      description: 'Hoàn thành ít nhất 1 bài học tương tác trong kho chuẩn hóa.',
      unlocked: completedIds.size >= 1,
      color: 'from-emerald-400 to-teal-500',
    },
    {
      id: 'b4',
      title: 'Chiến binh tri thức Cấp 3',
      description: 'Tích lũy đạt mốc 400 XP từ bài tập và học liệu.',
      unlocked: currentXp >= 400,
      color: 'from-purple-400 to-pink-500',
    },
    {
      id: 'b5',
      title: 'Ngôi sao kỷ luật',
      description: 'Hoàn thành 3 bài học chuẩn hóa và giữ chuỗi học 7 ngày.',
      unlocked: completedIds.size >= 3 && (user.streakDays ?? 0) >= 7,
      color: 'from-indigo-400 to-violet-500',
    },
  ];

  const unlockedCount = badgesList.filter((b) => b.unlocked).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header Profile Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-indigo-900/60 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-semibold text-cyan-300">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>HÀNH TRÌNH KHÁM PHÁ VŨ TRỤ TRI THỨC · LỚP {userGrade}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-display">
            Thuyền trưởng <span className="text-cyan-400">{user.name}</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300">
            Cấp bậc hiện tại: <strong className="text-amber-400">Nhà thám hiểm Cấp {currentLevel}</strong>
          </p>

          {/* XP Progress Bar */}
          <div className="space-y-1.5 pt-2 max-w-md">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-cyan-300 font-semibold">{currentXp} XP</span>
              <span className="text-slate-400">Mục tiêu cấp tiếp theo: {currentLevel * 200} XP</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${(currentLevelXp / 200) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Mascot */}
        <EduBotMascot
          size="md"
          expression="celebrating"
          message={`Bạn đã mở khóa ${unlockedCount}/${badgesList.length} huy hiệu chiến công!`}
        />
      </div>

      {/* School Leaderboard Privacy Notice */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>
          {systemPolicy?.leaderboardEnabled
            ? 'Bảng xếp hạng lớp học đang được Nhà trường bật trong chế độ khích lệ tích cực.'
            : 'Chế độ bảo vệ tâm lý tiểu học: Bảng xếp hạng công khai toàn trường đang TẮT mặc định để bạn nhỏ tập trung tiến bộ cá nhân.'}
        </span>
      </div>

      {/* Constellation Milestones Roadmap */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-500" />
            <span>Các chặng học tập Lớp {userGrade}</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">Lộ trình từng bước</span>
        </div>

        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-8">
          {milestones.map((m, idx) => {
            const isCompleted = m.status === 'completed';
            const isActive = m.status === 'active';
            return (
              <div key={m.id} className="relative group">
                <div
                  className={`absolute -left-[35px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-400 text-white'
                      : isActive
                      ? 'bg-cyan-500 border-cyan-300 text-white ring-4 ring-cyan-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : isActive ? idx + 1 : <Lock className="w-3.5 h-3.5" />}
                </div>

                <div
                  onClick={() => isActive && onStartQuest(m.id)}
                  className={`p-5 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-300 dark:border-cyan-800 shadow-sm cursor-pointer'
                      : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-400">
                        {m.grade} · {isCompleted ? 'Đã chinh phục' : isActive ? 'Đang mở khóa' : 'Chờ hoàn thành chặng trước'}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {m.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 text-amber-400">
                      {[1, 2, 3].map((starIdx) => (
                        <Star
                          key={starIdx}
                          className={`w-4 h-4 ${
                            starIdx <= m.stars ? 'fill-amber-400' : 'text-slate-300 dark:text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges Showcase */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>Huy hiệu chiến công đã đạt</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {unlockedCount}/{badgesList.length} Huy hiệu
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {badgesList.map((badge) => (
            <div
              key={badge.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                badge.unlocked
                  ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 shadow-sm'
                  : 'bg-slate-100/50 dark:bg-slate-800/20 border-slate-200/60 dark:border-slate-800/60 opacity-60'
              }`}
            >
              <div className="space-y-3">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${badge.color} text-white flex items-center justify-center shadow-md ${
                    badge.unlocked ? '' : 'grayscale'
                  }`}
                >
                  <Award className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {badge.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] font-semibold">
                {badge.unlocked ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Đã sở hữu</span>
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Cần hoàn thành nhiệm vụ</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
