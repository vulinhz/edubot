# Tài Liệu API Backend (EduBot AI)

- **Base URL:** `/api` (chạy trên Express `server/app.ts` ở dev và `/api/index.ts` trên Vercel).
- **Xác thực:** Header `Authorization: Bearer <token>` (hỗ trợ cả HMAC-SHA256 Session Token và Firebase ID Token xác thực qua Google JWKS).
- **Rate Limiting:**
  - Nhóm Auth (`/api/auth/login`, `/register`, `/forgot-password`, `/firebase-sync`): tối đa 30 req / 15 phút.
  - Nhóm AI (`/api/ai/*`): tối đa 40 req / 15 phút.
  - Toàn API: tối đa 300 req / phút.

## 1. Hệ Thống & Chính Sách Công Khai

- `GET /api/health` → Trạng thái server, `firebaseConfigured`, `aiModel`, `aiConfigured`, `ragChunksIndexed`.
- `GET /api/system/public-policy` → Lấy chính sách công khai (`childSafetyFilterEnabled`, `parentalConsentRequired`, `leaderboardEnabled`, `curriculumStandard`).
- `GET /api/analytics/overview` → Thống kê tổng quan (`totalStudents`, `totalTeachers`, `pendingTeachers`, `totalLessons`, `persistenceMode`, `aiStatus`).

## 2. Xác Thực, Phân Quyền & Duyệt Giáo Viên

- `POST /api/auth/register` → Đăng ký `student` hoặc `teacher` (tài khoản giáo viên mới luôn khởi tạo `teacherApprovalStatus: 'pending'`; chặn tự đăng ký `admin`).
- `POST /api/auth/login` → Đăng nhập email/mật khẩu (băm scrypt + salt).
- `POST /api/auth/firebase-sync` → Xác thực Firebase ID Token (`Bearer`), cấp/đồng bộ user (chỉ email bootstrap hoặc claim admin mới có quyền admin).
- `GET /api/auth/me` → Trả về thông tin người dùng hiện tại từ token.
- `POST /api/auth/logout` → Thu hồi HMAC token hiện tại.
- `POST /api/auth/forgot-password` & `POST /api/auth/reset-password` → Khôi phục mật khẩu bằng mã OTP 6 số (hiệu lực 10 phút).
- `GET /api/auth/users` `[Staff]` → Danh sách tài khoản (hạn chế trường nhạy cảm).
- `PUT /api/auth/users/:id/role` `[Admin]` → Thay đổi vai trò tài khoản.
- `PUT /api/auth/users/:id/approve-teacher` `[Admin]` → Phê duyệt (`approved`) hoặc từ chối (`rejected`) tài khoản giáo viên.

## 3. Chương Trình Học, Năm Học & Tiến Độ

- `GET /api/academic-years` / `POST /api/academic-years` `[Admin]` → Quản lý năm học.
- `GET /api/curriculum/subjects`, `GET /api/curriculum/topics`, `GET /api/curriculum/lessons`, `GET /api/curriculum/lessons/:id` → Dữ liệu GDPT 2018/2026.
- `POST /api/curriculum/lessons` `[Admin]` → Tạo bài học mới (mặc định `NEEDS_REVIEW` hoặc `DRAFT`) và tự động lập chỉ mục RAG.
- `PUT /api/curriculum/lessons/:id/status` `[Admin]` → Cập nhật trạng thái thẩm định (`verified`, `unverified`, `pending`, ...), đồng bộ tức thì trạng thái trong RAG index.
- `GET /api/knowledge-map` → Bản đồ cây kiến thức liên thông.
- `GET /api/learning-progress` & `POST /api/learning-progress` `[Auth]` → Đọc/cập nhật tiến độ hoàn thành bài học (tính XP an toàn trên server).

## 4. Bài Tập, Lớp Học, Giao Bài & Chấm Điểm

- `GET /api/exercises`, `GET /api/exercises/:id`
- `POST /api/exercises` `[Approved Staff]` → Tạo bộ bài tập mới (chặn trùng câu hỏi trong cùng bộ bài tập).
- `POST /api/exercises/submit` `[Auth]` → Chấm điểm tự động trên server; khóa không cho học sinh nộp lại bài đã được giáo viên chấm điểm (`status === 'graded'`).
- `PUT /api/submissions/:id/grade` `[Approved Staff]` → Giáo viên chấm điểm bài tự luận/chỉnh điểm + nhận xét phản hồi.
- `GET /api/classes`, `POST /api/classes` `[Approved Staff]`, `POST /api/classes/join` `[Auth]` → Quản lý lớp học và tham gia bằng mã lớp (trả về lỗi 409 nếu đã tham gia).
- `GET /api/assignments`, `POST /api/assignments` `[Approved Staff]` → Giao bài cả lớp hoặc cá nhân (`targetStudentIds`), kiểm tra quyền sở hữu lớp (IDOR protection).
- `GET /api/students/:id/performance` `[Owner/Teacher of class/Admin]` → Báo cáo năng lực học sinh; `PUT /api/students/:id/teacher-note` `[Approved Staff]`.

## 5. RAG 10 Bước & Dịch Vụ Gemini AI (`gemini-4-hydrogen`)

- `GET /api/rag/documents` `[Approved Staff]` → Liệt kê tài liệu đã lập chỉ mục RAG.
- `POST /api/rag/documents` `[Approved Staff]` → Nạp tài liệu mới theo pipeline chunking & indexing 10 bước.
- `POST /api/rag/query` `[Auth]` → Truy xuất RAG trả về top chunks + `citations` (học sinh chỉ nhận nguồn đã thẩm định).
- `POST /api/ai/student-chat` `[Auth]` → Gia sư AI EduBot kèm bộ lọc an toàn trẻ em, chỉ dẫn nguồn đã thẩm định; `GET/DELETE /api/ai/student-chat/history`.
- `POST /api/ai/teacher/lesson-plan`, `/standardize-knowledge`, `/generate-quiz` `[Approved Staff]` → Sinh bản nháp hỗ trợ giáo viên kèm trích dẫn RAG.
- `GET /api/ai/drafts` & `PUT /api/ai/drafts/:id/review` `[Approved Staff]` → Duyệt/từ chối (bắt buộc lý do)/xuất bản bản nháp có lưu lịch sử phiên bản.

## 6. Bảo Vệ Quyền Riêng Tư Trẻ Em (NĐ 13/2023/NĐ-CP) & Kiểm Toán

- `GET /api/privacy/consent` `[Auth]`
- `POST /api/privacy/consent/request` & `POST /api/privacy/consent/verify` `[Auth]` → Gửi và xác minh mã OTP đồng thuận phụ huynh.
- `GET /api/privacy/export-my-data` `[Auth]` → Xuất toàn bộ dữ liệu cá nhân của học sinh dạng JSON.
- `DELETE /api/privacy/student-data/:id` `[Owner/Admin]` → Xóa tài khoản/dữ liệu học tập và ghi Audit Log.
- `GET /api/audit-logs` `[Admin]` → Hỗ trợ lọc `?search=...&status=success|info|warning`.
- `GET /api/system/settings` & `PUT /api/system/settings` `[Admin]` → Cấu hình hệ thống an toàn trẻ em.
