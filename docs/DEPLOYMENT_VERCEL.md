# Hướng Dẫn Triển Khai EduBot AI Lên Vercel

## 1. Kiến Trúc Triển Khai

- **Frontend (SPA):** Vite + React 19 + Tailwind CSS v4, build ra thư mục `dist/`.
- **Backend API (`/api/*`):** Express app trong `server/app.ts` được export qua Serverless Function `/api/index.ts`.
- **Định tuyến (`vercel.json`):**
  - `/api/(.*)` → `/api/index.ts` (Node.js Serverless Function, `maxDuration: 30s`).
  - Các route SPA (`/lessons`, `/tutor`, `/teacher`, `/admin`, ...) → fallback về `/index.html`.
- **Bảo mật key:** Toàn bộ lời gọi Gemini (`GEMINI_API_KEY`) chỉ thực hiện ở `server/app.ts`; bản build `dist/` hoàn toàn không chứa secret server.

## 2. Biến Môi Trường Cần Thiết Trên Vercel (Project Settings → Environment Variables)

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `GEMINI_API_KEY` | Bắt buộc cho AI | API key Google Gemini để chạy Gia sư AI & Trợ lý Giáo viên (`gemini-4-hydrogen`). |
| `SESSION_SECRET` | Khuyến nghị (>= 32 ký tự) | Chuỗi bí mật để ký token phiên HMAC-SHA256 (`openssl rand -hex 32`) cho đăng nhập cục bộ/dự phòng. |
| `NODE_ENV` | Khuyến nghị | Đặt `production`. |
| `APP_URL` | Bắt buộc (Production) | URL thật trên Vercel: `https://edubot-u4d6.vercel.app`. |
| `ALLOWED_ORIGIN` | Khuyến nghị | Danh sách origin được phép CORS (phân tách dấu phẩy), ví dụ: `https://edubot-u4d6.vercel.app`. |
| `FIREBASE_PROJECT_ID` | Bắt buộc | `gen-lang-client-0856385601` để server xác thực Firebase ID Token qua JWKS. |
| `FIRESTORE_DATABASE_ID` | Bắt buộc | `ai-studio-edubotaifuturele-d205c94b-e2cf-4652-87cf-2a79b157a8e5` để serverless hydrate đúng database Firestore Enterprise. |
| `BOOTSTRAP_ADMIN_EMAIL` | Khuyến nghị | Email Admin hệ thống (mặc định `vulin1000@gmail.com`). |
| `VITE_ENABLE_DEMO_LOGIN` | Production = `false` | Tắt nút điền nhanh tài khoản demo trên giao diện đăng nhập production. |
| `ENABLE_DEMO_SEED` | Production = `false` | Không nạp dữ liệu học sinh/lớp học/bài nộp giả lập khi chạy production. |

> **Lưu ý về Server-side State trên Vercel Serverless:** Các request serverless không giữ bộ nhớ RAM vô hạn giữa các cold start. Đăng nhập chính trên production chạy trực tiếp qua **Firebase Auth (Email/Mật khẩu hoặc Google Sign-In)** kết hợp gửi Bearer Firebase ID Token lên `/api/auth/firebase-sync` và `/api/auth/me`, tự động hydrate hồ sơ thật từ **Cloud Firestore** theo token người dùng (stateless).

## 3. Quy Trình Deploy

1. Chạy kiểm tra trước khi deploy:
   ```bash
   npm run typecheck
   npm run lint:rules
   npm run build
   npm run test:api
   ```
2. Đẩy mã nguồn lên GitHub và kết nối repo với Vercel, hoặc deploy trực tiếp bằng Vercel CLI:
   ```bash
   vercel --prod
   ```
3. Hoàn tất cấu hình **Firebase Console**:
   - Vào **Firebase Console → Authentication → Settings → Authorized domains** → thêm `edubot-u4d6.vercel.app` (và các preview domain nếu cần).
   - Vào **Firebase Console → Authentication → Sign-in method** → bật **Email/Password** và **Google**.
   - Kiểm tra `/api/health` trả về `200 OK`, `firebaseProjectId: "gen-lang-client-0856385601"`, `aiConfigured: true`.
