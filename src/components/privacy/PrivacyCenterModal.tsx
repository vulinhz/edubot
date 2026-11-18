/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, ParentConsentRecord } from '../../types/index.ts';
import {
  X,
  ShieldCheck,
  UserCheck,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Mail,
  FileText,
} from 'lucide-react';

interface PrivacyCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  authToken: string | null;
  onConsentVerified?: (updatedUser: User) => void;
  onDataDeleted?: () => void;
}

export const PrivacyCenterModal: React.FC<PrivacyCenterModalProps> = ({
  isOpen,
  onClose,
  user,
  authToken,
  onConsentVerified,
  onDataDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<'policy' | 'consent' | 'data'>('policy');
  const [guardianEmail, setGuardianEmail] = useState(user?.guardianEmail || '');
  const [relationship, setRelationship] = useState('Phụ huynh');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [consentRecords, setConsentRecords] = useState<ParentConsentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMessage(null);
    setConfirmDelete(false);
    setGuardianEmail(user?.guardianEmail || '');
    if (authToken && user) {
      fetch('/api/privacy/consent', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => {
          if (Array.isArray(list)) setConsentRecords(list);
        })
        .catch(() => {});
    }
  }, [isOpen, authToken, user]);

  if (!isOpen) return null;

  const handleRequestConsentOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) {
      setMessage({ type: 'error', text: 'Vui lòng đăng nhập để thực hiện xác nhận phụ huynh.' });
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/privacy/consent/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ guardianEmail: guardianEmail.trim(), relationship }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Không thể gửi mã xác nhận.' });
      } else {
        setOtpSent(true);
        if (data.consent) {
          setConsentRecords([data.consent]);
        }
        setMessage({ type: 'success', text: data.message });
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ bảo mật.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyConsentOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !otpCode.trim()) return;
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/privacy/consent/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ otpCode: otpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Mã OTP không đúng hoặc đã hết hạn.' });
      } else {
        setOtpSent(false);
        setOtpCode('');
        if (data.consent) setConsentRecords([data.consent]);
        if (data.user && onConsentVerified) onConsentVerified(data.user);
        setMessage({
          type: 'success',
          text: 'Xác thực đồng ý của phụ huynh thành công! Hồ sơ học sinh đã được bảo chứng.',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối khi xác thực OTP.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportMyData = async () => {
    if (!authToken) {
      setMessage({ type: 'error', text: 'Vui lòng đăng nhập để xuất dữ liệu cá nhân.' });
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/privacy/export-my-data', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Không thể xuất dữ liệu.' });
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edubot-privacy-export-${user?.id || 'user'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Đã tải xuống bản sao dữ liệu cá nhân (.json).' });
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối khi xuất dữ liệu cá nhân.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMyData = async () => {
    if (!authToken || !user) return;
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/privacy/student-data/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Không thể xóa dữ liệu học tập.' });
      } else {
        setConfirmDelete(false);
        setConsentRecords([]);
        setMessage({ type: 'success', text: data.message || 'Đã xóa sạch dữ liệu học tập.' });
        onDataDeleted?.();
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối khi xóa dữ liệu.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 max-w-2xl w-full rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Đóng Trung tâm An toàn & Quyền riêng tư"
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white font-display">
              Trung tâm Quyền Riêng Tư & Bảo vệ Trẻ em
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tuân thủ Nghị định 13/2023/NĐ-CP & Luật Trẻ em Việt Nam
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('policy');
              setMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'policy'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Chính sách & Cam kết</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('consent');
              setMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'consent'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Xác nhận Phụ huynh</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('data');
              setMessage(null);
            }}
            className={`flex-1 py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'data'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất & Xóa Dữ liệu</span>
          </button>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* TAB 1: POLICY */}
        {activeTab === 'policy' && (
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white">
                1. Thu thập dữ liệu tối thiểu cho học sinh Tiểu học (Lớp 1–5)
              </h3>
              <p>
                EduBot AI chỉ lưu trữ họ tên hiển thị, khối lớp, kết quả bài tập và hội thoại học tập phục vụ mục đích giảng dạy. Không yêu cầu số CMND/CCCD, số điện thoại trẻ em hoặc định vị GPS.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white">
                2. Bộ lọc Gia sư AI An toàn (Socratic & Child-Safe Guardrail)
              </h3>
              <p>
                Mọi câu hỏi gửi tới Gemini AI đều qua lớp tiền kiểm lọc từ khóa nguy hại và hướng dẫn sư phạm: không giải bài thay hoàn toàn, không hỏi thông tin đời tư, và luôn bám sát học liệu đã thẩm định.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <h3 className="font-bold text-slate-900 dark:text-white">
                3. Quyền kiểm soát của Phụ huynh & Nhà trường
              </h3>
              <p>
                Phụ huynh và chủ tài khoản có quyền xác thực đồng ý qua OTP, xuất toàn bộ dữ liệu học tập dưới dạng JSON, hoặc xóa sạch lịch sử học tập & hội thoại bất kỳ lúc nào.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: VERIFIABLE PARENTAL CONSENT */}
        {activeTab === 'consent' && (
          <div className="space-y-4">
            {!user ? (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-center text-xs text-slate-500">
                Vui lòng đăng nhập tài khoản học sinh để thực hiện xác nhận đồng ý của phụ huynh.
              </div>
            ) : (
              <>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Trạng thái xác thực phụ huynh cho {user.name}:
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {user.guardianEmail ? `Email giám hộ: ${user.guardianEmail}` : 'Chưa liên kết email phụ huynh'}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold border ${
                      user.parentalConsentVerified
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {user.parentalConsentVerified ? 'Đã xác thực OTP' : 'Chưa xác thực'}
                  </span>
                </div>

                {!otpSent ? (
                  <form onSubmit={handleRequestConsentOtp} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Email Phụ huynh / Người giám hộ:
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="email"
                            required
                            placeholder="phuhuynh@gmail.com"
                            value={guardianEmail}
                            onChange={(e) => setGuardianEmail(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Mối quan hệ giám hộ:
                        </label>
                        <select
                          value={relationship}
                          onChange={(e) => setRelationship(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-emerald-500"
                        >
                          <option value="Phụ huynh">Cha / Mẹ (Phụ huynh)</option>
                          <option value="Người giám hộ hợp pháp">Người giám hộ hợp pháp</option>
                          <option value="Giáo viên chủ nhiệm">Giáo viên chủ nhiệm được ủy quyền</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-60"
                    >
                      {isLoading ? 'Đang tạo mã OTP...' : 'Gửi mã xác nhận đồng ý phụ huynh'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyConsentOtp} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Nhập mã OTP 6 chữ số vừa cấp cho phụ huynh:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: 123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono tracking-widest text-center focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-60"
                      >
                        {isLoading ? 'Đang xác thực...' : 'Xác nhận hoàn tất'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-800"
                      >
                        Đổi email khác
                      </button>
                    </div>
                  </form>
                )}

                {consentRecords.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Lịch sử hồ sơ đồng ý</div>
                    {consentRecords.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {rec.relationship}: {rec.guardianEmail}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Yêu cầu lúc {new Date(rec.requestedAt).toLocaleString('vi-VN')}
                          </div>
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                          {rec.status === 'verified' ? 'ĐÃ XÁC THỰC' : 'CHỜ XÁC NHẬN'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: EXPORT & DELETE */}
        {activeTab === 'data' && (
          <div className="space-y-4">
            {!user ? (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-center text-xs text-slate-500">
                Vui lòng đăng nhập để xuất hoặc xóa dữ liệu học tập cá nhân.
              </div>
            ) : (
              <>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Xuất toàn bộ bản sao dữ liệu cá nhân (JSON)
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Bao gồm thông tin tài khoản, lịch sử làm bài, tiến độ bài học, hội thoại gia sư AI và trạng thái xác nhận phụ huynh.
                  </p>
                  <button
                    type="button"
                    onClick={handleExportMyData}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải xuống hồ sơ của tôi (.json)</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
                  <div className="text-xs font-bold text-rose-700 dark:text-rose-300">
                    Xóa lịch sử học tập & hội thoại cá nhân
                  </div>
                  <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
                    Thao tác này sẽ xóa toàn bộ bài nộp, tiến độ học, XP, hội thoại AI và thông tin email giám hộ của tài khoản {user.email}. Không thể hoàn tác.
                  </p>
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yêu cầu xóa dữ liệu học tập</span>
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteMyData}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold disabled:opacity-60"
                      >
                        {isLoading ? 'Đang xóa...' : 'Xác nhận XÓA VĨNH VIỄN dữ liệu'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                      >
                        Hủy bỏ
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
