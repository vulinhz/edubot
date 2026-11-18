# Thiết Kế Cơ Sở Dữ Liệu & Sơ Đồ Quan Hệ (EduBot AI)

## 1. Tổng Quan Kiến Trúc Dữ Liệu

EduBot AI áp dụng kiến trúc Hybrid:
- **Cloud Firestore Enterprise** (`firebase-blueprint.json` + `firestore.rules`): Lưu trữ bền vững hồ sơ người dùng, bài nộp, tiến độ bài học, lịch sử trò chuyện AI, lớp học, khung chương trình đã đồng bộ và bản ghi đồng thuận phụ huynh.
- **Express Backend (`server/app.ts` + `server/data.ts`):** Cung cấp API xác thực, chấm điểm server-side, RAG 10 bước (`server/rag.ts`), và nhật ký kiểm toán.

## 2. Chi Tiết Các Collections Chính

| Collection / Path | Mục đích | Quyền truy cập (`firestore.rules`) |
|---|---|---|
| `users/{uid}` | Hồ sơ công khai: `name`, `role`, `teacherApprovalStatus`, `grade`, `school`, `xp`, `streakDays`, `badges`. | Owner đọc được; client KHÔNG được tự sửa `role`, `xp`, `teacherApprovalStatus`. Admin toàn quyền. |
| `users/{uid}/private/info` | PII tách biệt: `email`, `guardianEmail`, `consentVerified` (tuân thủ NĐ 13/2023). | Chỉ chính chủ `uid` hoặc Admin đọc/ghi; giáo viên & học sinh khác bị chặn. |
| `admins/{uid}` | Danh sách Admin được cấp quyền nâng cao. | Chỉ Admin đọc; không cho phép tự ghi từ client chưa có quyền. |
| `academicYears/{yearId}` | Năm học (2025–2026, 2026–2027) và trạng thái kích hoạt. | Đọc công khai; chỉ Admin tạo/sửa. |
| `subjects/{subjectId}` | Danh mục môn học GDPT 2018/2026 (`toan`, `tieng-viet`, `khoa-hoc`, `tin-hoc`, `tieng-anh`, `cong-nghe`, ...). | Đọc công khai; chỉ Admin ghi. |
| `lessons/{lessonId}` | Bài học theo lớp 1–5 kèm `objectives`, `coreKnowledge`, `officialReference`, `status` (`verified`/`VERIFIED`/`NEEDS_REVIEW`/`DRAFT`). | Đọc công khai; chỉ Admin/Giáo viên đã duyệt chỉnh sửa. |
| `exercises/{exerciseId}` | Bộ bài tập trắc nghiệm & tự luận. | Đọc công khai; Giáo viên đã duyệt tạo bài của mình hoặc Admin. |
| `classes/{classId}` & `members/{uid}` | Lớp học theo mã lớp và thành viên tham gia. | Giáo viên chủ nhiệm, thành viên lớp và Admin. |
| `assignments/{assignmentId}` | Giao bài tập cho cả lớp hoặc danh sách `targetStudentIds` cá nhân hóa. | Giáo viên lớp, học sinh lớp và Admin. |
| `submissions/{submissionId}` | Bài nộp của học sinh (`score`, `answers`, `status: 'submitted' | 'graded'`, `teacherFeedback`). | Học sinh chỉ tạo/xem bài của mình; Giáo viên lớp chấm điểm & phản hồi. |
| `learningProgress/{docId}` | Tiến độ hoàn thành bài học (`studentId`, `lessonId`, `completed`, `timeSpentSeconds`). | Chỉ học sinh chính chủ, Giáo viên lớp hoặc Admin. |
| `aiConversations/{uid}/messages/{msgId}` | Lịch sử hỏi đáp Gia sư AI EduBot kèm `citations`. | Chỉ học sinh chính chủ `uid` hoặc Admin. |
| `consentRecords/{recordId}` | Hồ sơ xác minh đồng thuận phụ huynh (Verifiable Parental Consent). | Chính chủ `uid` hoặc Admin. |
| `auditLogs/{logId}` | Nhật ký kiểm toán hành động bảo mật, phân quyền, AI, xóa dữ liệu. | Chỉ Admin đọc; không cho xóa sửa tùy tiện. |
| `systemSettings/{docId}` | Chính sách toàn hệ thống (`childSafetyFilterEnabled`, `parentalConsentRequired`, `leaderboardEnabled`, `dataRetentionDays`). | `public_policy` đọc công khai; cấu hình quản trị chỉ Admin. |

## 3. Quan Hệ Chính (ER Summary)

- `User (1) ─── (N) Submission`: Mỗi học sinh có nhiều bài nộp; điểm số và XP được tính phía server.
- `User (1) ─── (N) LearningProgress`: Ghi nhận tiến độ và thời gian học từng bài (`lessonId`).
- `ClassRoom (1) ─── (N) Assignment`: Giáo viên giao bài tập (`ExerciseSet`) cho cả lớp hoặc nhóm học sinh mục tiêu.
- `Lesson (1) ─── (N) RagChunk`: Chỉ các bài học/tài liệu có trạng thái đã thẩm định (`verified`, `VERIFIED`, `APPROVED`, `PUBLISHED`) mới được đưa vào ngữ cảnh trả lời học sinh.
