/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User, UserRole } from '../types/index.ts';
import { Bot, Moon, Sun, Shield, GraduationCap, School, LogOut, LogIn } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedGrade: number;
  onGradeChange: (grade: number) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAuth: (mode?: 'login' | 'register', suggestedRole?: UserRole) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  selectedGrade,
  onGradeChange,
  darkMode,
  onToggleDarkMode,
  onOpenAuth,
  onLogout,
}) => {
  const getNavLinks = () => {
    if (!currentUser) {
      return [
        { id: 'landing', label: 'Giới thiệu' },
        { id: 'lessons', label: 'Kho bài giảng' },
        { id: 'exercises', label: 'Luyện tập' },
        { id: 'knowledge-map', label: 'Bản đồ tri thức' },
      ];
    }
    if (currentUser.role === 'student') {
      return [
        { id: 'dashboard', label: 'Trang chủ' },
        { id: 'lessons', label: 'Kho bài giảng' },
        { id: 'exercises', label: 'Luyện tập' },
        { id: 'knowledge-map', label: 'Bản đồ tri thức' },
        { id: 'tutor', label: 'Gia sư EduBot' },
        { id: 'journey', label: 'Hành trình' },
        { id: 'landing', label: 'Giới thiệu' },
      ];
    } else if (currentUser.role === 'teacher') {
      return [
        { id: 'teacher-overview', label: 'Tổng quan' },
        { id: 'ai-planner', label: 'Soạn bài AI' },
        { id: 'ai-standardize', label: 'Chuẩn hóa' },
        { id: 'ai-quiz', label: 'Tạo đề thi' },
        { id: 'assignment-manager', label: 'Quản lý bài' },
        { id: 'review-drafts', label: 'Duyệt học liệu' },
        { id: 'landing', label: 'Giới thiệu' },
      ];
    } else {
      return [
        { id: 'admin-overview', label: 'Bảng điều khiển' },
        { id: 'curriculum-manager', label: 'Khung GDPT 2026' },
        { id: 'learning-resources', label: 'Kho thẩm định' },
        { id: 'audit-logs', label: 'Nhật ký bảo mật' },
        { id: 'landing', label: 'Giới thiệu' },
      ];
    }
  };

  const navLinks = getNavLinks();

  const homeTab = !currentUser
    ? 'landing'
    : currentUser.role === 'student'
    ? 'dashboard'
    : currentUser.role === 'teacher'
    ? 'teacher-overview'
    : 'admin-overview';

  return (
    <header className="sticky top-0 z-50 bg-white/85 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 h-16">
        {/* Zone 1: Brand wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            onTabChange(homeTab);
          }}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm shadow-cyan-500/30 group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white font-display">
            EduBot <span className="text-cyan-500">AI</span>
          </span>
        </a>

        {/* Zone 2: Navigation links */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600 dark:text-slate-300 overflow-x-auto no-scrollbar">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => onTabChange(link.id)}
                className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
                  isActive
                    ? 'text-cyan-600 dark:text-cyan-400 font-semibold border-b-2 border-cyan-500'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions, grade selector, auth controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {(!currentUser || currentUser.role === 'student') && (
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {[1, 2, 3, 4, 5].map((g) => (
                <button
                  key={g}
                  onClick={() => onGradeChange(g)}
                  className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    selectedGrade === g
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Lớp {g}
                </button>
              ))}
            </div>
          )}

          {/* Dark / Light Toggle */}
          <button
            onClick={onToggleDarkMode}
            aria-label="Chuyển chế độ sáng/tối"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {currentUser ? (
            <>
              {/* Current Authenticated User Badge */}
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                title="Đổi tài khoản"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
              >
                {currentUser.role === 'student' && <GraduationCap className="w-3.5 h-3.5 text-cyan-500" />}
                {currentUser.role === 'teacher' && <School className="w-3.5 h-3.5 text-emerald-500" />}
                {currentUser.role === 'admin' && <Shield className="w-3.5 h-3.5 text-purple-500" />}
                <span className="hidden lg:inline max-w-[130px] truncate">{currentUser.name}</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                title="Đăng xuất"
                aria-label="Đăng xuất"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-sm shadow-cyan-500/20 whitespace-nowrap flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
          )}

          {/* Primary Role CTA */}
          {currentUser?.role === 'student' && (
            <button
              onClick={() => onTabChange('tutor')}
              className="hidden sm:flex px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-sm shadow-cyan-500/20 whitespace-nowrap shrink-0 items-center gap-1.5"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Hỏi EduBot</span>
            </button>
          )}
          {currentUser?.role === 'teacher' && (
            <button
              onClick={() => onTabChange('ai-planner')}
              className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Soạn bài mới
            </button>
          )}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => onTabChange('learning-resources')}
              className="hidden sm:inline-flex px-3.5 py-2 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap shrink-0"
            >
              Thẩm định học liệu
            </button>
          )}
        </div>
      </div>

      {/* Mobile Nav row */}
      <div className="md:hidden flex items-center overflow-x-auto px-4 py-2 border-t border-slate-100 dark:border-slate-800 gap-4 text-xs font-medium text-slate-600 dark:text-slate-300 no-scrollbar">
        {navLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => onTabChange(link.id)}
            className={`whitespace-nowrap shrink-0 py-1 ${
              activeTab === link.id
                ? 'text-cyan-600 dark:text-cyan-400 font-semibold border-b-2 border-cyan-500'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {link.label}
          </button>
        ))}
      </div>
    </header>
  );
};
