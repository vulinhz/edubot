# EduBot AI – Firestore Security Architecture & TDD Specification (Eight Pillars)

## 1. Core Data Invariants
1. **Master Gate & Membership:** Access to `/classes/{classId}/members/{studentId}` requires verifying the parent `/classes/{classId}` document's `teacherId` or admin status via `get()`.
2. **Anti-Self-Privilege-Escalation:** A newly registered user in `/users/{userId}` can ONLY create `role == 'student'` and `teacherApprovalStatus in ['none', 'pending']`. Self-assigning `'teacher'` (approved) or `'admin'` is strictly rejected.
3. **PII Isolation:** Emails and guardian contacts are stored in `/users/{userId}/private/info`, accessible strictly to the owner or an admin — never readable by blanket signed-in users.
4. **Immutable Graded Outcomes:** Once a `/submissions/{submissionId}` document reaches terminal status `'graded'`, a student can NEVER modify `score`, `status`, or `studentId`. Only the owning teacher or admin may update `teacherFeedback`.
5. **Strict Timestamps & Key Allowlists:** Every write enforces `isValidId()`, `.size()` bounds on strings/arrays, `hasAll` + `hasOnly` on creates, `affectedKeys().hasOnly(...)` on updates, immutable `createdAt`, and server `request.time`.
6. **Verified Identity:** Standard writes require `request.auth != null && request.auth.token.email_verified == true`.

## 2. The "Dirty Dozen" Adversarial Payloads (Expected: `PERMISSION_DENIED`)
1. **Role Escalation Create:** Creating `/users/{uid}` with `role: "admin"` or `role: "teacher"`.
2. **Self-Role Update:** Updating own `/users/{uid}` changing `role` from `"student"` to `"admin"`.
3. **Shadow Field Injection:** Creating `/classes/{id}` with an extra undocumented `"isOfficial": true` field.
4. **ID Poisoning:** Creating `/submissions/<1500-char-junk-id>` or `/lessons/bad$id`.
5. **Email Spoof Admin:** Authenticating with `email: "vulin1000@gmail.com"` when `email_verified == false` and trying to read `/auditLogs`.
6. **PII Cross-Read:** Student A reading `/users/{studentB}/private/info`.
7. **Unverified Teacher Class Create:** Teacher with `approvalStatus: "pending"` creating `/classes/{id}`.
8. **IDOR Assignment Hijack:** Teacher A creating `/assignments/{id}` referencing Teacher B's `classId`.
9. **Score Tampering After Grading:** Student updating `/submissions/{id}` changing `score` from `6` to `10` when `status == "graded"`.
10. **Blanket Collection Scrape:** Unfiltered `list` query on `/submissions` without `where("studentId", "==", uid)` as a student.
11. **Backdated Timestamp:** Creating `/consentRecords/{id}` with client-forged `createdAt` instead of `request.time`.
12. **Ghost Audit Deletion:** Non-admin attempting `delete` on `/auditLogs/{id}`.
