/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bot, Sparkles, BookOpen, School, ShieldCheck, ArrowRight, Compass, Layers } from 'lucide-react';
import { EduBotMascot } from './EduBotMascot.tsx';
import { UserRole } from '../types/index.ts';
import heroSpaceImage from '../assets/images/future_learning_space_1793780439282.jpg';

interface LandingPageProps {
  onEnterRole: (role: UserRole, grade?: number) => void;
  onOpenAuth: (mode?: 'login' | 'register', suggestedRole?: UserRole) => void;
  onExploreCurriculum: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterRole,
  onOpenAuth,
  onExploreCurriculum,
}) => {
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl bg-slate-900 text-white min-h-[500px] flex flex-col justify-center">
        {!heroImgFailed && (
          <img
            src={heroSpaceImage}
            alt="EduBot Future Learning Ecosystem"
            onError={() => setHeroImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-35"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/40" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 text-center space-y-6">
          <div className="text-cyan-300 text-xs font-semibold uppercase tracking-wider">
            Nền tảng học tập tiểu học Lớp 1–5
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight font-display text-white max-w-4xl mx-auto leading-tight">
            EduBot <span className="text-cyan-400">AI</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Kho bài giảng theo từng khối lớp 1–5, bài tập luyện tập tương tác chấm điểm tự động và gia sư Robot AI gợi mở từng bước cho học sinh tiểu học.
          </p>

          {/* Quick Entry CTAs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onEnterRole('student', 4)}
              className="px-6 py-3.5 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-colors flex items-center gap-2 group"
            >
              <Bot className="w-4 h-4" />
              <span>Vào học cùng EduBot</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onEnterRole('teacher')}
              className="px-6 py-3.5 text-sm font-semibold text-slate-100 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl transition-colors border border-white/10 flex items-center gap-2"
            >
              <School className="w-4 h-4 text-emerald-400" />
              <span>Dành cho Giáo viên (Soạn KHBD AI)</span>
            </button>

            <button
              onClick={() => onOpenAuth('login')}
              className="px-5 py-3.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Đăng nhập / Đăng ký
            </button>
          </div>
        </div>
      </div>

      {/* Mascot Highlight Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-5 flex justify-center">
            <EduBotMascot
              size="lg"
              expression="celebrating"
              message="Chào các bạn nhỏ và quý thầy cô! EduBot sẵn sàng đồng hành trên mọi chặng đường tri thức! 🚀"
            />
          </div>

          <div className="md:col-span-7 space-y-4">
            <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider font-mono">
              MASCOT ĐẠI DIỆN ĐỘC QUYỀN
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display">
              Gặp gỡ EduBot – Người bạn Robot thông minh của trẻ em Việt Nam
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              EduBot được chế tác theo ngôn ngữ thiết kế robot tương lai với thân bạc ánh kim, đôi mắt LED biểu cảm đa trạng thái và trái tim trí tuệ nhân tạo sư phạm. EduBot không chỉ cung cấp đáp án mà áp dụng phương pháp gợi mở từng bước (Socratic), rèn luyện tư duy độc lập và niềm say mê khám phá.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                <strong className="block text-cyan-600 dark:text-cyan-400 mb-1">Gợi mở từng bước</strong>
                Không giải hộ bài tập, giúp học sinh tự tìm ra cách giải qua câu hỏi dẫn dắt.
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                <strong className="block text-emerald-600 dark:text-emerald-400 mb-1">An toàn tuyệt đối</strong>
                Bộ lọc bảo vệ trẻ em, không thu thập dữ liệu riêng tư nhạy cảm.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Pillars Grid */}
      <div className="space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-display">
            Trụ Cột Cốt Lõi Của Hệ Sinh Thái EduBot AI
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Kết hợp chuẩn mực giáo dục phổ thông Việt Nam và công nghệ AI Robotics tiên tiến nhất.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm hover:border-cyan-400 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-500 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Chuẩn GDPT 2018 & TT 17/2025
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Kho học liệu Lớp 1–5 có cấu trúc chặt chẽ từ Yêu cầu cần đạt (YCCĐ), kiến thức cốt lõi, lỗi sai thường gặp đến nguồn thẩm định.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm hover:border-emerald-400 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center">
              <School className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              EduBot Teacher AI Studio
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Soạn Kế hoạch bài dạy (KHBD) theo Công văn 2345/BGDĐT, chuẩn hóa kiến thức, tạo ma trận đề kiểm tra và quản lý lớp học hiệu quả.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm hover:border-purple-400 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-500 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Bản Đồ Tri Thức Liên Khối
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Trực quan hóa mối quan hệ kiến thức tiên quyết từ Lớp 1 đến Lớp 5; tự động đề xuất lộ trình ôn tập khi học sinh chưa nắm vững nền tảng.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm hover:border-amber-400 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Bảo Mật & An Toàn Trẻ Em
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tuân thủ Luật Trẻ em và Nghị định 13/2023/NĐ-CP; quản lý sự đồng ý của phụ huynh, nhật ký kiểm toán hệ thống minh bạch 24/7.
            </p>
          </div>
        </div>
      </div>

      {/* Curriculum Grades Snapshot */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 sm:p-10 border border-indigo-900/60 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider font-mono">
              PHÂN PHỐI CHƯƠNG TRÌNH
            </span>
            <h2 className="text-2xl font-bold font-display text-white mt-1">
              Hệ thống 5 Khối Lớp Tiểu Học Việt Nam
            </h2>
          </div>
          <button
            onClick={onExploreCurriculum}
            className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-colors self-start sm:self-auto flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4" />
            <span>Xem chi tiết môn học</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[
            { grade: 1, title: 'Lớp 1: Khởi đầu', desc: 'Toán, Tiếng Việt, Tự nhiên & Xã hội' },
            { grade: 2, title: 'Lớp 2: Khám phá', desc: 'Cộng trừ có nhớ, vốn từ gia đình' },
            { grade: 3, title: 'Lớp 3: Phát triển', desc: 'Nhân chia, Tin học, Tiếng Anh' },
            { grade: 4, title: 'Lớp 4: Tăng tốc', desc: 'Phân số, Khoa học, Lịch sử Địa lí' },
            { grade: 5, title: 'Lớp 5: Về đích', desc: 'Số thập phân, chuẩn bị chuyển cấp' },
          ].map((item) => (
            <div
              key={item.grade}
              onClick={() => onEnterRole('student', item.grade)}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 cursor-pointer transition-all space-y-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold text-sm flex items-center justify-center font-mono">
                {item.grade}
              </div>
              <div className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                {item.title}
              </div>
              <div className="text-[11px] text-slate-300">
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
