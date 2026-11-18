# Hướng Dẫn Cấu Hình Firebase & Tạo Tài Khoản Admin An Toàn (EduBot AI)

## 1. Thông Số Dự Án Firebase Đã Cấp Phát

Thông số đã được lưu tại `/firebase-applet-config.json`:
- **Project ID:** `gen-lang-client-0856385601`
- **Auth Domain:** `gen-lang-client-0856385601.firebaseapp.com`
- **Firestore Database ID (Enterprise):** `ai-studio-edubotaifuturele-d205c94b-e2cf-4652-87cf-2a79b157a8e5`
- **Storage Bucket:** `gen-lang-client-0856385601.firebasestorage.app`

> **Lưu ý:** File `src/lib/firebase.ts` tự động truyền `firestoreDatabaseId` vào `getFirestore(appInstance, resolvedConfig.firestoreDatabaseId)` để kết nối đúng database Enterprise đã khởi tạo. Không đổi về `(default)` nếu chưa tạo database mặc định riêng.

## 2. Cấu Hình Cần Hoàn Tất Trong Firebase Console

1. **Authorized Domains (Bắt buộc cho Vercel / Production):**
   - Vào **Firebase Console → Authentication → Settings → Authorized domains**.
   - Thêm domain production **`edubot-u4d6.vercel.app`** và domain preview nếu dùng.
2. **Sign-in Methods:**
   - **Google Sign-In:** Đã hỗ trợ trực tiếp trong `AuthModal` qua `signInWithPopup` + đồng bộ `/api/auth/firebase-sync`.
   - **Email/Password:** Vào **Authentication → Sign-in method**, bật **Email/Password** để kích hoạt đăng nhập, đăng ký và đặt lại mật khẩu trực tiếp trên Firebase Auth (bao gồm môi trường Vercel production).
3. **Security Rules (`firestore.rules`):**
   - Đã kiểm tra bằng `npm run lint:rules` (`0 errors`) và deploy lên Firebase.
   - Quy tắc thực thi **Deny by Default**: cho phép tài khoản mới tạo hồ sơ `users/{uid}` ban đầu (`xp == 0`, `role == 'student'`) ngay khi vừa đăng ký, yêu cầu `email_verified == true` khi cập nhật/nộp bài/lưu tiến độ, và chặn sửa `xp`, `role`, `teacherApprovalStatus` từ client.

## 3. Hướng Dẫn Tạo Tài Khoản Quản Trị Viên (Admin) An Toàn

**Nguyên tắc bảo mật:**
- Không cho phép bất kỳ người dùng nào tự chọn `role: "admin"` ở màn hình đăng ký công khai.
- Backend (`/api/auth/register`) ép mọi đăng ký tự do thành `student` hoặc `teacher` (`teacherApprovalStatus: 'pending'`).

**3 bước kích hoạt Admin chuẩn:**
1. **Bootstrap Admin qua Email hệ thống mặc định (`vulin1000@gmail.com`) hoặc `BOOTSTRAP_ADMIN_EMAIL`:**
   - Khi đăng nhập bằng Google Sign-In (`vulin1000@gmail.com`) trên Firebase Auth, `firestore.rules` công nhận quyền Admin mặc định cho `request.auth.token.email == "vulin1000@gmail.com" && request.auth.token.email_verified == true`, đồng thời server (`/api/auth/firebase-sync`) tự cấp phiên `admin`.
   - Nếu dùng tài khoản cục bộ, thiết lập biến môi trường `BOOTSTRAP_ADMIN_EMAIL` và `DEMO_ADMIN_PASSWORD` trên server (không commit lên Git).
2. **Tạo Admin phụ qua Firestore Console (không mở quyền tự đăng ký):**
   - Lấy `uid` của tài khoản đã xác thực email trong **Authentication → Users**.
   - Mở **Firestore Database** (chọn đúng Database ID `ai-studio-edubotaifuturele-d205c94b-e2cf-4652-87cf-2a79b157a8e5`).
   - Tạo document trong collection `admins/{uid}` với `{ "uid": "<uid>", "role": "admin", "createdAt": <serverTimestamp> }` và cập nhật `users/{uid}.role = "admin"`.
3. **Nâng quyền từ Giao diện Admin:**
   - Đăng nhập bằng tài khoản Admin hiện có → Vào tab **Tài khoản & Phân quyền** → Đổi vai trò hoặc bấm **Duyệt GV** cho giáo viên mới.
