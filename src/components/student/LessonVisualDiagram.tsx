/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LessonVisualDiagramProps {
  diagramKey?: string;
  caption?: string;
}

export const LessonVisualDiagram: React.FC<LessonVisualDiagramProps> = ({ diagramKey, caption }) => {
  if (!diagramKey) return null;

  const renderSvg = () => {
    switch (diagramKey) {
      case 'fraction_model':
        return (
          <svg viewBox="0 0 520 180" className="w-full h-auto max-h-52" role="img" aria-label="Sơ đồ phân số trực quan">
            <text x="110" y="24" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-xs font-bold">
              Phân số 3/4 hình tròn
            </text>
            <circle cx="110" cy="100" r="56" className="fill-slate-100 dark:fill-slate-800 stroke-slate-400" strokeWidth="2" />
            <path d="M110,100 L110,44 A56,56 0 1,1 54,100 Z" className="fill-cyan-500/85 stroke-white dark:stroke-slate-900" strokeWidth="2" />
            <line x1="110" y1="44" x2="110" y2="156" className="stroke-slate-400" strokeWidth="1.5" />
            <line x1="54" y1="100" x2="166" y2="100" className="stroke-slate-400" strokeWidth="1.5" />

            <text x="365" y="24" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-xs font-bold">
              Băng giấy bằng nhau: 1/2 = 2/4
            </text>
            <rect x="240" y="52" width="125" height="34" className="fill-emerald-500/85 stroke-slate-500" strokeWidth="1.5" />
            <rect x="365" y="52" width="125" height="34" className="fill-slate-100 dark:fill-slate-800 stroke-slate-400" strokeWidth="1.5" />
            <text x="302" y="74" textAnchor="middle" className="fill-white text-xs font-bold">1/2</text>

            <rect x="240" y="106" width="62.5" height="34" className="fill-cyan-500/85 stroke-slate-500" strokeWidth="1.5" />
            <rect x="302.5" y="106" width="62.5" height="34" className="fill-cyan-500/85 stroke-slate-500" strokeWidth="1.5" />
            <rect x="365" y="106" width="62.5" height="34" className="fill-slate-100 dark:fill-slate-800 stroke-slate-400" strokeWidth="1.5" />
            <rect x="427.5" y="106" width="62.5" height="34" className="fill-slate-100 dark:fill-slate-800 stroke-slate-400" strokeWidth="1.5" />
            <text x="302" y="128" textAnchor="middle" className="fill-white text-xs font-bold">2/4 (= 1/2)</text>
          </svg>
        );

      case 'water_cycle':
        return (
          <svg viewBox="0 0 540 190" className="w-full h-auto max-h-56" role="img" aria-label="Vòng tuần hoàn của nước">
            <circle cx="72" cy="44" r="24" className="fill-amber-400" />
            <ellipse cx="265" cy="48" rx="58" ry="22" className="fill-sky-200 dark:fill-sky-700 stroke-sky-400" strokeWidth="2" />
            <ellipse cx="385" cy="52" rx="48" ry="20" className="fill-slate-300 dark:fill-slate-600 stroke-slate-400" strokeWidth="2" />
            <path d="M50,145 Q150,132 260,145 T510,145 L510,180 L30,180 Z" className="fill-cyan-500/80" />

            <path d="M135,134 Q145,86 205,56" fill="none" className="stroke-amber-500" strokeWidth="2.5" strokeDasharray="5 4" />
            <text x="150" y="96" className="fill-amber-700 dark:fill-amber-300 text-[11px] font-bold">1. Bay hơi</text>

            <path d="M322,48 L338,48" fill="none" className="stroke-sky-600" strokeWidth="2.5" />
            <text x="265" y="52" textAnchor="middle" className="fill-slate-800 dark:fill-white text-[11px] font-bold">2. Ngưng tụ (Mây)</text>

            <line x1="365" y1="78" x2="358" y2="122" className="stroke-blue-500" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="388" y1="78" x2="381" y2="122" className="stroke-blue-500" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="410" y1="78" x2="403" y2="122" className="stroke-blue-500" strokeWidth="2" strokeDasharray="4 4" />
            <text x="455" y="102" className="fill-blue-700 dark:fill-blue-300 text-[11px] font-bold">3. Mưa rơi</text>
            <text x="260" y="166" textAnchor="middle" className="fill-white text-xs font-bold">4. Nước sông, hồ, biển lại tiếp tục vòng tuần hoàn</text>
          </svg>
        );

      case 'photosynthesis':
        return (
          <svg viewBox="0 0 520 185" className="w-full h-auto max-h-52" role="img" aria-label="Sơ đồ quang hợp ở lá cây">
            <circle cx="70" cy="40" r="22" className="fill-amber-400" />
            <text x="70" y="76" textAnchor="middle" className="fill-amber-700 dark:fill-amber-300 text-[11px] font-bold">Ánh sáng</text>

            <path d="M260,152 L260,82" className="stroke-amber-800 dark:stroke-amber-600" strokeWidth="8" strokeLinecap="round" />
            <ellipse cx="260" cy="64" rx="68" ry="38" className="fill-emerald-500/85 stroke-emerald-700" strokeWidth="2" />
            <text x="260" y="68" textAnchor="middle" className="fill-white text-xs font-bold">Lá xanh quang hợp</text>

            <text x="152" y="112" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-[11px] font-semibold">Khí CO₂ + Nước</text>
            <line x1="150" y1="95" x2="195" y2="75" className="stroke-cyan-600" strokeWidth="2.5" />

            <text x="415" y="66" textAnchor="middle" className="fill-emerald-700 dark:fill-emerald-300 text-[11px] font-bold">Nhả ra khí Ô-xi (O₂)</text>
            <text x="415" y="88" textAnchor="middle" className="fill-emerald-700 dark:fill-emerald-300 text-[11px] font-semibold">+ Chất dinh dưỡng</text>
            <line x1="330" y1="64" x2="352" y2="64" className="stroke-emerald-600" strokeWidth="2.5" />
          </svg>
        );

      case 'compass_map':
        return (
          <svg viewBox="0 0 500 180" className="w-full h-auto max-h-52" role="img" aria-label="La bàn 4 phương hướng trên bản đồ">
            <circle cx="140" cy="92" r="58" className="fill-slate-50 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" />
            <polygon points="140,42 150,92 130,92" className="fill-rose-500" />
            <polygon points="140,142 150,92 130,92" className="fill-cyan-600" />
            <text x="140" y="26" textAnchor="middle" className="fill-rose-600 dark:fill-rose-400 text-xs font-bold">BẮC (Trên)</text>
            <text x="140" y="168" textAnchor="middle" className="fill-cyan-700 dark:fill-cyan-300 text-xs font-bold">NAM (Dưới)</text>
            <text x="225" y="96" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-xs font-bold">ĐÔNG (Phải)</text>
            <text x="52" y="96" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-xs font-bold">TÂY (Trái)</text>

            <rect x="295" y="34" width="175" height="114" rx="12" className="fill-sky-50 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
            <text x="382" y="56" textAnchor="middle" className="fill-slate-800 dark:fill-white text-xs font-bold">Ghi nhớ đọc bản đồ</text>
            <text x="312" y="80" className="fill-slate-600 dark:fill-slate-300 text-[11px]">• Phía trên luôn là hướng Bắc</text>
            <text x="312" y="102" className="fill-slate-600 dark:fill-slate-300 text-[11px]">• Xem bảng chú giải ký hiệu</text>
            <text x="312" y="124" className="fill-slate-600 dark:fill-slate-300 text-[11px]">• Kiểm tra tỉ lệ thu nhỏ</text>
          </svg>
        );

      case 'computer_parts':
        return (
          <svg viewBox="0 0 520 175" className="w-full h-auto max-h-48" role="img" aria-label="Bốn bộ phận cơ bản của máy tính">
            <rect x="30" y="28" width="135" height="84" rx="10" className="fill-sky-100 dark:fill-sky-900/50 stroke-sky-500" strokeWidth="2" />
            <text x="97" y="75" textAnchor="middle" className="fill-sky-900 dark:fill-sky-200 text-xs font-bold">1. Màn hình</text>
            <text x="97" y="132" textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[11px]">Hiển thị kết quả</text>

            <rect x="190" y="24" width="76" height="96" rx="10" className="fill-cyan-100 dark:fill-cyan-900/50 stroke-cyan-600" strokeWidth="2" />
            <text x="228" y="74" textAnchor="middle" className="fill-cyan-900 dark:fill-cyan-200 text-xs font-bold">2. Thân máy</text>
            <text x="228" y="138" textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[11px]">Xử lý thông tin</text>

            <rect x="295" y="64" width="120" height="44" rx="8" className="fill-emerald-100 dark:fill-emerald-900/50 stroke-emerald-600" strokeWidth="2" />
            <text x="355" y="90" textAnchor="middle" className="fill-emerald-900 dark:fill-emerald-200 text-xs font-bold">3. Bàn phím</text>
            <text x="355" y="132" textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[11px]">Nhập chữ & số</text>

            <ellipse cx="465" cy="86" rx="26" ry="34" className="fill-amber-100 dark:fill-amber-900/50 stroke-amber-600" strokeWidth="2" />
            <text x="465" y="90" textAnchor="middle" className="fill-amber-900 dark:fill-amber-200 text-xs font-bold">4. Chuột</text>
            <text x="465" y="138" textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[11px]">Điều khiển</text>
          </svg>
        );

      case 'electric_safety':
        return (
          <svg viewBox="0 0 520 165" className="w-full h-auto max-h-48" role="img" aria-label="Quy tắc an toàn sử dụng đồ dùng điện">
            <rect x="25" y="24" width="145" height="112" rx="14" className="fill-emerald-50 dark:fill-emerald-950/40 stroke-emerald-500" strokeWidth="2" />
            <text x="97" y="64" textAnchor="middle" className="fill-emerald-700 dark:fill-emerald-300 text-xs font-bold">1. Lau khô tay</text>
            <text x="97" y="88" textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[11px]">Trước khi bật tắt</text>
            <text x="97" y="106" textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[11px]">đèn học, quạt điện</text>

            <rect x="188" y="24" width="145" height="112" rx="14" className="fill-rose-50 dark:fill-rose-950/40 stroke-rose-500" strokeWidth="2" />
            <text x="260" y="64" textAnchor="middle" className="fill-rose-700 dark:fill-rose-300 text-xs font-bold">2. Không chạm ổ</text>
            <text x="260" y="88" textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[11px]">Không chọc vật kim</text>
            <text x="260" y="106" textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[11px]">loại vào ổ cắm điện</text>

            <rect x="351" y="24" width="145" height="112" rx="14" className="fill-sky-50 dark:fill-sky-950/40 stroke-sky-500" strokeWidth="2" />
            <text x="423" y="64" textAnchor="middle" className="fill-sky-700 dark:fill-sky-300 text-xs font-bold">3. Báo người lớn</text>
            <text x="423" y="88" textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[11px]">Khi thấy dây điện</text>
            <text x="423" y="106" textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[11px]">bị hở vỏ nhựa</text>
          </svg>
        );

      case 'plant_parts':
        return (
          <svg viewBox="0 0 500 185" className="w-full h-auto max-h-52" role="img" aria-label="Các bộ phận của cây xanh">
            <rect x="40" y="128" width="220" height="36" rx="8" className="fill-amber-100 dark:fill-amber-900/40 stroke-amber-600" strokeWidth="1.5" />
            <path d="M150,128 L150,48" className="stroke-emerald-700" strokeWidth="7" strokeLinecap="round" />
            <ellipse cx="116" cy="84" rx="28" ry="14" className="fill-emerald-500" />
            <ellipse cx="184" cy="76" rx="28" ry="14" className="fill-emerald-500" />
            <circle cx="150" cy="36" r="14" className="fill-rose-400" />
            <path d="M150,128 L125,152 M150,128 L150,156 M150,128 L175,152" className="stroke-amber-800 dark:stroke-amber-400" strokeWidth="2.5" />

            <text x="295" y="42" className="fill-rose-600 dark:fill-rose-400 text-xs font-bold">• Hoa & Quả: Tạo hạt giống</text>
            <text x="295" y="76" className="fill-emerald-700 dark:fill-emerald-400 text-xs font-bold">• Lá: Quang hợp tạo dinh dưỡng</text>
            <text x="295" y="110" className="fill-slate-700 dark:fill-slate-200 text-xs font-bold">• Thân: Vận chuyển nước lên lá</text>
            <text x="295" y="146" className="fill-amber-800 dark:fill-amber-300 text-xs font-bold">• Rễ: Hút nước và giữ cây đứng</text>
          </svg>
        );

      case 'clock_numberline':
      default:
        return (
          <svg viewBox="0 0 520 175" className="w-full h-auto max-h-48" role="img" aria-label="Tia số 0 đến 10 và đồng hồ chỉ 7 giờ">
            <text x="180" y="34" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-xs font-bold">Tia số tăng dần từ trái sang phải</text>
            <line x1="30" y1="88" x2="330" y2="88" className="stroke-cyan-600" strokeWidth="3" />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num, idx) => {
              const x = 35 + idx * 28;
              return (
                <g key={num}>
                  <line x1={x} y1="81" x2={x} y2="95" className="stroke-cyan-700" strokeWidth="2" />
                  <text x={x} y="114" textAnchor="middle" className="fill-slate-800 dark:fill-slate-200 text-[11px] font-bold">
                    {num}
                  </text>
                </g>
              );
            })}
            <circle cx="432" cy="86" r="50" className="fill-white dark:fill-slate-800 stroke-cyan-600" strokeWidth="3" />
            <text x="432" y="48" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-[10px] font-bold">12</text>
            <text x="432" y="130" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-[10px] font-bold">6</text>
            <line x1="432" y1="86" x2="432" y2="52" className="stroke-slate-700 dark:stroke-slate-200" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="432" y1="86" x2="412" y2="112" className="stroke-rose-500" strokeWidth="3.5" strokeLinecap="round" />
            <text x="432" y="156" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-xs font-bold">7 giờ đúng</text>
          </svg>
        );
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
      <div className="flex justify-center">{renderSvg()}</div>
      {caption && (
        <p className="text-center text-xs text-slate-600 dark:text-slate-300 font-medium">{caption}</p>
      )}
    </div>
  );
};
