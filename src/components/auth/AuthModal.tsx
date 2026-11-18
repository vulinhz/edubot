/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types/index.ts';
import {
  isFirebaseConfigured,
  signInWithFirebaseGoogle,
  signInWithFirebaseEmail,
  registerWithFirebaseEmail,
  sendFirebasePasswordReset,
  mapFirebaseAuthError,
  getFirebaseErrorCode,
} from '../../lib/firebase.ts';
import { syncFirebaseUserDocs } from '../../lib/firestoreService.ts';
import { Bot, X, Lock, Mail, User as UserIcon, ShieldCheck } from 'lucide-react';

const SHOW_DEMO_LOGIN = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User, token: string, source?: 'local' | 'firebase') => void;
  initialMode?: 'login' | 'register' | 'forgot';
  suggestedRole?: UserRole;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
  suggestedRole,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [grade, setGrade] = useState<number>(4);
  const [school, setSchool] = useState('Trường Tiểu học Thăng Long');
  const [parentConsent, setParentConsent] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // OTP step for local dev forgot password fallback
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
      setOtpStep(false);
      if (suggestedRole === 'teacher' || suggestedRole === 'student') {
        setRole(suggestedRole);
      }
    }
  }, [isOpen, initialMode, suggestedRole]);

  if (!isOpen) return null;

  const syncWithBackendFirebase = async (
    idToken: string,
    payload: {
      requestedRole?: UserRole;
      grade?: number;
      school?: string;
      name?: string;
      parentalConsentVerified?: boolean;
    }
  ): Promise<User> => {
    const res = await fetch('/api/auth/firebase-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || !data.user) {
      throw new Error(data.error || `Không thể đồng bộ tài khoản với máy chủ (HTTP ${res.status}).`);
    }
    return data.user as User;
  };

  const handleGoogleSignIn = async () => {
    if (!isFirebaseConfigured) {
      setErrorMsg('Chưa cấu hình Firebase Client SDK trong biến môi trường.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { idToken } = await signInWithFirebaseGoogle();
      const syncedUser = await syncWithBackendFirebase(idToken, {
        requestedRole: mode === 'register' && role === 'teacher' ? 'teacher' : undefined,
        grade,
        school: school.trim() || undefined,
      });
      syncFirebaseUserDocs(syncedUser).catch((syncErr) => {
        console.warn('Firestore user profile sync note:', syncErr?.message || syncErr);
      });
      onAuthSuccess(syncedUser, idToken, 'firebase');
      onClose();
    } catch (err: unknown) {
      setErrorMsg(mapFirebaseAuthError(err, 'Không thể đăng nhập bằng Google qua Firebase Auth.'));
    } finally {
      setIsLoading(false);
    }
  };

  const tryLocalLogin = async (cleanEmail: string, rawPassword: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: rawPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.user && data.token) {
      onAuthSuccess(data.user, data.token, 'local');
      onClose();
      return;
    }
    throw new Error(data.error || `Email hoặc mật khẩu không chính xác (HTTP ${res.status}).`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (isFirebaseConfigured) {
        try {
          const { idToken } = await signInWithFirebaseEmail(cleanEmail, password);
          const syncedUser = await syncWithBackendFirebase(idToken, {});
          syncFirebaseUserDocs(syncedUser).catch((syncErr) => {
            console.warn('Firestore user profile sync note:', syncErr?.message || syncErr);
          });
          onAuthSuccess(syncedUser, idToken, 'firebase');
          onClose();
          return;
        } catch (firebaseErr: unknown) {
          const code = getFirebaseErrorCode(firebaseErr);
          const canFallbackDemo =
            SHOW_DEMO_LOGIN &&
            (code === 'auth/user-not-found' ||
              code === 'auth/invalid-credential' ||
              code === 'auth/operation-not-allowed');
          if (canFallbackDemo) {
            await tryLocalLogin(cleanEmail, password);
            return;
          }
          setErrorMsg(mapFirebaseAuthError(firebaseErr, 'Email hoặc mật khẩu không chính xác.'));
          return;
        }
      }

      await tryLocalLogin(cleanEmail, password);
    } catch (err: unknown) {
      setErrorMsg(mapFirebaseAuthError(err, 'Lỗi kết nối máy chủ xác thực.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!cleanName || !cleanEmail) {
      setErrorMsg('Vui lòng nhập đầy đủ họ tên và email hợp lệ.');
      return;
    }
    if (role === 'student' && !parentConsent) {
      setErrorMsg('Vui lòng xác nhận sự đồng ý của cha mẹ hoặc người giám hộ hợp pháp theo Luật Trẻ em.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (isFirebaseConfigured) {
        const { idToken, verificationSent } = await registerWithFirebaseEmail(cleanName, cleanEmail, password);
        const syncedUser = await syncWithBackendFirebase(idToken, {
          requestedRole: role === 'teacher' ? 'teacher' : 'student',
          grade: role === 'student' ? grade : undefined,
          school: school.trim() || undefined,
          name: cleanName,
          parentalConsentVerified: role === 'student' ? parentConsent : false,
        });
        syncFirebaseUserDocs(syncedUser).catch((syncErr) => {
          console.warn('Firestore user profile sync note:', syncErr?.message || syncErr);
        });
        if (verificationSent) {
          setSuccessMsg(`Đã tạo tài khoản và gửi email xác minh tới ${cleanEmail}.`);
        }
        onAuthSuccess(syncedUser, idToken, 'firebase');
        onClose();
        return;
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
          role,
          grade: role === 'student' ? grade : undefined,
          school: school.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.user && data.token) {
        onAuthSuccess(data.user, data.token, 'local');
        onClose();
      } else {
        setErrorMsg(data.error || `Đăng ký không thành công (HTTP ${res.status}).`);
      }
    } catch (err: unknown) {
      setErrorMsg(mapFirebaseAuthError(err, 'Không thể hoàn tất đăng ký tài khoản.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Vui lòng nhập email tài khoản.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (isFirebaseConfigured) {
        try {
          await sendFirebasePasswordReset(cleanEmail);
          setSuccessMsg(`Đã gửi email đặt lại mật khẩu Firebase tới ${cleanEmail}. Vui lòng kiểm tra hộp thư (kể cả mục Spam).`);
          return;
        } catch (firebaseErr: unknown) {
          const code = getFirebaseErrorCode(firebaseErr);
          if (!(SHOW_DEMO_LOGIN && code === 'auth/user-not-found')) {
            setErrorMsg(mapFirebaseAuthError(firebaseErr, 'Không thể gửi email đặt lại mật khẩu.'));
            return;
          }
        }
      }

      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setSuccessMsg(data.message);
        setOtpStep(true);
      } else {
        setErrorMsg(data.error || 'Không tìm thấy tài khoản.');
      }
    } catch (err: unknown) {
      setErrorMsg(mapFirebaseAuthError(err, 'Lỗi kết nối khôi phục mật khẩu.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || !newPassword) {
      setErrorMsg('Vui lòng nhập mã OTP và mật khẩu mới.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otpCode: otpCode.trim(),
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
        setOtpStep(false);
        setOtpCode('');
        setPassword('');
        setNewPassword('');
        setMode('login');
      } else {
        setErrorMsg(data.error || 'Mã OTP không chính xác hoặc đã hết hạn.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ đặt lại mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  function handleQuickDemoFill(targetRole: UserRole) {
    if (!SHOW_DEMO_LOGIN) return;
    setErrorMsg('');
    setPassword('edubot2026');
    if (targetRole === 'student') {
      setEmail('tuan.nh@edubot.edu.vn');
      setRole('student');
    } else if (targetRole === 'teacher') {
      setEmail('comai@edubot.edu.vn');
      setRole('teacher');
    } else {
      setEmail('admin@edubot.edu.vn');
      setRole('admin');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Đóng hộp thoại đăng nhập"
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Brand Lockup */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
              EduBot AI Authentication
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mode === 'login'
                ? 'Đăng nhập vào hệ thống học tập'
                : mode === 'register'
                ? 'Đăng ký tài khoản giáo dục mới'
                : 'Khôi phục mật khẩu tài khoản'}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-lg transition-colors ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-lg transition-colors ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Đăng ký
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('forgot');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 rounded-lg transition-colors ${
              mode === 'forgot'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Quên mật khẩu
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-300 leading-relaxed">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
            {successMsg}
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email tài khoản:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="ten.ban@truonghoc.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mật khẩu:
                </label>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            {/* Quick Demo Account Helpers — ONLY shown in development / explicit demo preview */}
            {SHOW_DEMO_LOGIN && (
              <div className="pt-1 space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Tài khoản thử nghiệm nội bộ (Dev Demo):
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoFill('student')}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-cyan-500 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-center"
                  >
                    Học sinh (Lớp 4)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoFill('teacher')}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-center"
                  >
                    Giáo viên
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoFill('admin')}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-purple-500 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-center"
                  >
                    Quản trị viên
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl transition-all shadow-md shadow-cyan-500/20 disabled:opacity-60"
            >
              {isLoading ? 'Đang xác thực...' : 'Đăng nhập vào EduBot'}
            </button>

            {isFirebaseConfigured && (
              <div className="space-y-2 pt-1">
                <div className="relative flex items-center justify-center text-[10px] text-slate-400 uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 z-10">Hoặc qua Firebase Auth</span>
                  <div className="absolute inset-x-0 h-px bg-slate-200 dark:bg-slate-800" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Đăng nhập bằng Google (Firebase Auth)</span>
                </button>
              </div>
            )}
          </form>
        )}

        {/* TAB 2: REGISTER */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Họ và tên người dùng:
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Hoàng Nam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email liên hệ:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="nam.nguyen@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mật khẩu (tối thiểu 6 ký tự):
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Vai trò tài khoản:
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="student">Học sinh</option>
                  <option value="teacher">Giáo viên (chờ Admin duyệt)</option>
                </select>
              </div>

              {role === 'student' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Khối lớp:
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    {[1, 2, 3, 4, 5].map((g) => (
                      <option key={g} value={g}>
                        Lớp {g}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {role === 'teacher' && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
                Lưu ý bảo mật: Tài khoản Giáo viên đăng ký mới sẽ ở trạng thái <strong>chờ Quản trị viên phê duyệt</strong> trước khi được mở lớp hoặc tạo học liệu.
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Trường học:
              </label>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Child Protection & Parental Consent Checkbox */}
            {role === 'student' && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="consent"
                  checked={parentConsent}
                  onChange={(e) => setParentConsent(e.target.checked)}
                  className="mt-0.5 rounded text-cyan-600 focus:ring-0"
                />
                <label htmlFor="consent" className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Tôi là phụ huynh/người đại diện hợp pháp, xác nhận đồng ý cho con tham gia học tập trên nền tảng EduBot AI theo quy định bảo vệ trẻ em trên môi trường mạng.
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-all shadow-md disabled:opacity-60"
            >
              {isLoading ? 'Đang tạo tài khoản...' : 'Hoàn tất Đăng ký'}
            </button>
          </form>
        )}

        {/* TAB 3: FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            {!otpStep ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Nhập email đăng ký của bạn. Hệ thống EduBot sẽ tạo mã OTP bảo mật 6 chữ số để xác minh quyền sở hữu tài khoản.
                </p>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email đăng ký:
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tuan.nh@edubot.edu.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl transition-all disabled:opacity-60"
                >
                  {isLoading ? 'Đang tạo mã OTP...' : 'Gửi mã xác nhận OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordWithOtp} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Mã OTP (6 chữ số):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập 6 chữ số OTP..."
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono tracking-widest text-center text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Mật khẩu mới (tối thiểu 6 ký tự):
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Nhập mật khẩu mới..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md disabled:opacity-60"
                >
                  {isLoading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
