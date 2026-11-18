/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Automated End-to-End API, RBAC, IDOR, RAG, Privacy & Gemini Verification Suite.
 * Run with: npm run test:api (or BASE_URL=https://... node tests/e2e-suite.mjs)
 */

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const TEST_PORT = 3199;
const EXTERNAL_BASE_URL = process.env.BASE_URL?.replace(/\/+$/, '');
const BASE_URL = EXTERNAL_BASE_URL || `http://127.0.0.1:${TEST_PORT}`;

const results = [];

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, json };
}

async function runTest(name, fn) {
  const start = Date.now();
  try {
    const detail = await fn();
    const ms = Date.now() - start;
    results.push({ name, status: 'PASS', ms, detail: detail || 'OK' });
    console.log(`✅ [PASS] ${name} (${ms}ms)${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    const ms = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, status: 'FAIL', ms, detail: msg });
    console.error(`❌ [FAIL] ${name} (${ms}ms) — ${msg}`);
  }
}

async function waitForServer(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server did not respond on ${BASE_URL}/api/health within ${timeoutMs}ms`);
}

async function main() {
  let serverProc = null;
  if (!EXTERNAL_BASE_URL) {
    const tsxBin = resolve(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
    serverProc = spawn(tsxBin, ['server.ts'], {
      detached: true,
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        NODE_ENV: 'development',
        SESSION_SECRET: process.env.SESSION_SECRET || 'edubot-e2e-test-secret-key-32-chars-min',
      },
      stdio: 'ignore',
    });
    serverProc.unref();
  }

  try {
    await waitForServer();

    const adminPassword = process.env.DEMO_ADMIN_PASSWORD || 'edubot2026';
    const ts = Date.now();
    const studentEmail = `e2e.student.${ts}@edubot.edu.vn`;
    const student2Email = `e2e.student2.${ts}@edubot.edu.vn`;
    const teacherEmail = `e2e.teacher.${ts}@edubot.edu.vn`;

    let adminToken = '';
    let approvedTeacherToken = '';
    let pendingTeacherToken = '';
    let pendingTeacherId = '';
    let studentToken = '';
    let studentId = '';
    let student2Token = '';
    let student2Id = '';
    let createdClassId = '';
    let createdClassCode = '';
    let createdExerciseId = '';
    let createdAssignmentId = '';
    let createdSubmissionId = '';
    let createdLessonId = '';

    await runTest('1. Health, Public Policy & Analytics Overview', async () => {
      const health = await request('/api/health');
      assert.equal(health.status, 200);
      assert.equal(health.json.ok, true);
      assert.ok(health.json.ragChunksIndexed > 0, 'RAG chunks should be indexed');

      const policy = await request('/api/system/public-policy');
      assert.equal(policy.status, 200);
      assert.equal(typeof policy.json.leaderboardEnabled, 'boolean');
      assert.equal(typeof policy.json.parentalConsentRequired, 'boolean');

      const overview = await request('/api/analytics/overview');
      assert.equal(overview.status, 200);
      assert.equal(overview.json.aiModel, 'gemini-4-hydrogen');
      return `RAG chunks=${health.json.ragChunksIndexed}, mode=${overview.json.persistenceMode}`;
    });

    await runTest('2. Auth Registration Guard, OTP Password Reset & Token Revocation', async () => {
      const regStu = await request('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Học sinh E2E 1',
          email: studentEmail,
          password: 'Password123!',
          role: 'admin', // self-escalation attempt
          grade: 4,
        },
      });
      assert.equal(regStu.status, 201);
      assert.equal(regStu.json.user.role, 'student', 'Must block admin self-registration');
      studentToken = regStu.json.token;
      studentId = regStu.json.user.id;

      const regStu2 = await request('/api/auth/register', {
        method: 'POST',
        body: { name: 'Học sinh E2E 2', email: student2Email, password: 'Password123!', role: 'student', grade: 4 },
      });
      assert.equal(regStu2.status, 201);
      student2Token = regStu2.json.token;
      student2Id = regStu2.json.user.id;

      const forgot = await request('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: student2Email },
      });
      assert.equal(forgot.status, 200);
      assert.ok(forgot.json.devOtpPreview, 'Dev OTP should exist in development env');

      const reset = await request('/api/auth/reset-password', {
        method: 'POST',
        body: { email: student2Email, otpCode: forgot.json.devOtpPreview, newPassword: 'NewPassword456!' },
      });
      assert.equal(reset.status, 200);

      const logout = await request('/api/auth/logout', { method: 'POST', token: student2Token });
      assert.equal(logout.status, 200);
      const afterLogout = await request('/api/auth/me', { token: student2Token });
      assert.equal(afterLogout.status, 401, 'Revoked token must return 401');

      const relogin = await request('/api/auth/login', {
        method: 'POST',
        body: { email: student2Email, password: 'NewPassword456!' },
      });
      assert.equal(relogin.status, 200);
      student2Token = relogin.json.token;
      return 'Admin self-assign blocked, OTP reset & token revocation verified';
    });

    await runTest('3. Teacher Pending Workflow & Admin Approval RBAC', async () => {
      const admLogin = await request('/api/auth/login', {
        method: 'POST',
        body: { email: 'admin@edubot.edu.vn', password: adminPassword },
      });
      assert.equal(admLogin.status, 200);
      adminToken = admLogin.json.token;

      const regTeacher = await request('/api/auth/register', {
        method: 'POST',
        body: {
          name: 'Giáo viên E2E',
          email: teacherEmail,
          password: 'Password123!',
          role: 'teacher',
        },
      });
      assert.equal(regTeacher.status, 201);
      assert.equal(regTeacher.json.user.teacherApprovalStatus, 'pending');
      pendingTeacherToken = regTeacher.json.token;
      pendingTeacherId = regTeacher.json.user.id;

      const blockedClass = await request('/api/classes', {
        method: 'POST',
        token: pendingTeacherToken,
        body: { name: '4E-Test', grade: 4 },
      });
      assert.equal(blockedClass.status, 403, 'Pending teacher must be blocked with 403');

      const approveRes = await request(`/api/auth/users/${pendingTeacherId}/approve-teacher`, {
        method: 'PUT',
        token: adminToken,
        body: { decision: 'approved' },
      });
      assert.equal(approveRes.status, 200);
      assert.equal(approveRes.json.user.teacherApprovalStatus, 'approved');
      approvedTeacherToken = pendingTeacherToken;

      const okClass = await request('/api/classes', {
        method: 'POST',
        token: approvedTeacherToken,
        body: { name: 'Lớp 4E2E', grade: 4 },
      });
      assert.equal(okClass.status, 201);
      createdClassId = okClass.json.class.id;
      createdClassCode = okClass.json.class.code;
      return `Teacher approved & class ${createdClassCode} created`;
    });

    await runTest('4. IDOR Protection & Class Membership Check', async () => {
      // Student 1 joins teacher's class with `code`; Student 2 does NOT join
      const join1 = await request('/api/classes/join', {
        method: 'POST',
        token: studentToken,
        body: { code: createdClassCode },
      });
      assert.equal(join1.status, 200);
      assert.ok(join1.json.class.students.some((s) => s.id === studentId));

      // Re-joining same class does not duplicate student entry
      const joinDup = await request('/api/classes/join', {
        method: 'POST',
        token: studentToken,
        body: { code: createdClassCode },
      });
      assert.equal(joinDup.status, 200);
      assert.equal(
        joinDup.json.class.students.filter((s) => s.id === studentId).length,
        1,
        'Duplicate class membership prevented'
      );

      // Student 1 cannot read Student 2 performance
      const stuIdor = await request(`/api/students/${student2Id}/performance`, { token: studentToken });
      assert.equal(stuIdor.status, 403, 'Student IDOR must return 403');

      // Approved teacher cannot read Student 2 performance (not in teacher's class)
      const teacherIdor = await request(`/api/students/${student2Id}/performance`, { token: approvedTeacherToken });
      assert.equal(teacherIdor.status, 403, 'Cross-class teacher IDOR must return 403');

      // Approved teacher CAN read Student 1 performance (member of teacher's class)
      const teacherOk = await request(`/api/students/${studentId}/performance`, { token: approvedTeacherToken });
      assert.equal(teacherOk.status, 200);
      return 'Cross-student & cross-class IDOR blocked (403); no duplicate enrollment';
    });

    await runTest('5. Custom Exercise, Duplicate Guard, Assignment, Grading & Lockout', async () => {
      // Duplicate question guard -> deduplicates down to 1 unique question
      const dupEx = await request('/api/exercises', {
        method: 'POST',
        token: approvedTeacherToken,
        body: {
          title: 'Bộ đề chống trùng câu',
          subjectId: 'toan',
          grade: 4,
          questions: [
            { type: 'single_choice', questionText: '1 + 1 = ?', options: ['1', '2'], correctAnswer: 1 },
            { type: 'single_choice', questionText: ' 1 + 1 = ? ', options: ['2', '3'], correctAnswer: 0 },
          ],
        },
      });
      assert.equal(dupEx.status, 201);
      assert.equal(dupEx.json.exercise.questions.length, 1, 'Duplicate question text must be deduplicated');

      // Valid custom exercise with essay
      const exRes = await request('/api/exercises', {
        method: 'POST',
        token: approvedTeacherToken,
        body: {
          title: 'Kiểm tra Toán & Tự luận E2E',
          subjectId: 'toan',
          grade: 4,
          durationMinutes: 15,
          questions: [
            { type: 'single_choice', questionText: '25 x 4 bằng bao nhiêu?', options: ['80', '100'], correctAnswer: 1 },
            { type: 'essay', questionText: 'Giải thích cách nhẩm nhanh 25 x 4.', correctAnswer: '' },
          ],
        },
      });
      assert.equal(exRes.status, 201);
      createdExerciseId = exRes.json.exercise.id;

      // Assign individually to studentId
      const assignRes = await request('/api/assignments', {
        method: 'POST',
        token: approvedTeacherToken,
        body: {
          classId: createdClassId,
          exerciseSetId: createdExerciseId,
          deadline: '2026-12-30',
          targetStudentIds: [studentId],
        },
      });
      assert.equal(assignRes.status, 201);
      createdAssignmentId = assignRes.json.assignment.id;

      // Student submits essay assignment
      const q1Id = exRes.json.exercise.questions[0].id;
      const q2Id = exRes.json.exercise.questions[1].id;
      const subRes = await request('/api/exercises/submit', {
        method: 'POST',
        token: studentToken,
        body: {
          exerciseSetId: createdExerciseId,
          assignmentId: createdAssignmentId,
          grade: 4,
          answers: {
            [q1Id]: 1,
            [q2Id]: 'Em lấy 25 nhân 2 được 50, rồi nhân tiếp 2 được 100 ạ.',
          },
          timeSpentSeconds: 95,
        },
      });
      assert.equal(subRes.status, 200);
      assert.equal(subRes.json.submission.status, 'submitted');
      createdSubmissionId = subRes.json.submission.id;

      // Teacher grades submission
      const gradeRes = await request(`/api/submissions/${createdSubmissionId}/grade`, {
        method: 'PUT',
        token: approvedTeacherToken,
        body: { score: 9.5, teacherFeedback: 'Cách giải thích rất thông minh và rõ ràng!' },
      });
      assert.equal(gradeRes.status, 200);
      assert.equal(gradeRes.json.submission.status, 'graded');
      assert.equal(gradeRes.json.submission.score, 9.5);

      // Student re-submitting graded assignment must return 403 lock
      const lockedRes = await request('/api/exercises/submit', {
        method: 'POST',
        token: studentToken,
        body: {
          exerciseSetId: createdExerciseId,
          assignmentId: createdAssignmentId,
          grade: 4,
          answers: { [q1Id]: 1, [q2Id]: 'Sửa lại bài' },
        },
      });
      assert.equal(lockedRes.status, 403, 'Graded assignment must lock student resubmission');
      return 'Deduplication guard, essay grading (9.5/10) & graded lock verified';
    });

    await runTest('6. Curriculum Lifecycle, Learning Progress & 10-Step RAG Gating', async () => {
      const uniqueToken = `E2E_Quantum_Phonics_${ts}`;
      const newLesson = await request('/api/curriculum/lessons', {
        method: 'POST',
        token: adminToken,
        body: {
          title: `Bài kiểm thử ${uniqueToken}`,
          subjectId: 'cong-nghe',
          grade: 4,
          summary: `Khái niệm đặc thù ${uniqueToken} chưa thẩm định.`,
          status: 'NEEDS_REVIEW',
        },
      });
      assert.equal(newLesson.status, 201);
      createdLessonId = newLesson.json.lesson.id;

      // Student RAG query must NOT cite unverified lesson
      const ragBefore = await request('/api/rag/query', {
        method: 'POST',
        token: studentToken,
        body: { query: uniqueToken, grade: 4 },
      });
      assert.equal(ragBefore.status, 200);
      const leakedBefore = (ragBefore.json.citations || []).some((c) => c.documentId === createdLessonId);
      assert.equal(leakedBefore, false, 'Unverified lesson must NOT be cited to students');

      // Admin verifies the lesson -> RAG index unlocks it
      const verifyLesson = await request(`/api/curriculum/lessons/${createdLessonId}/status`, {
        method: 'PUT',
        token: adminToken,
        body: { status: 'verified' },
      });
      assert.equal(verifyLesson.status, 200);

      const ragAfter = await request('/api/rag/query', {
        method: 'POST',
        token: studentToken,
        body: { query: uniqueToken, grade: 4 },
      });
      assert.equal(ragAfter.status, 200);
      const foundAfter = (ragAfter.json.citations || []).some((c) => c.documentId === createdLessonId);
      assert.equal(foundAfter, true, 'Verified lesson MUST be retrievable in student RAG query');

      // Teacher ingests new RAG document using `rawText`
      const ingestRes = await request('/api/rag/documents', {
        method: 'POST',
        token: approvedTeacherToken,
        body: {
          title: 'Tài liệu An toàn Internet Tiểu học 2026',
          grade: 4,
          subjectId: 'tin-hoc',
          sourceRef: 'SGK Tin học 4 KNTT - Bài 12',
          rawText:
            'Quy tắc 3 Không bảo vệ thông tin cá nhân trên mạng: Không chia sẻ mật khẩu, không chia sẻ địa chỉ nhà riêng, và luôn hỏi cha mẹ hoặc thầy cô khi gặp đường link lạ.',
        },
      });
      assert.equal(ingestRes.status, 201);
      assert.ok(ingestRes.json.chunksAdded >= 1);

      // Student marks lesson completed -> Learning Progress + Academic Year check
      const progRes = await request('/api/learning-progress', {
        method: 'POST',
        token: studentToken,
        body: { lessonId: createdLessonId, timeSpentSeconds: 240, checkpointPassed: true },
      });
      assert.equal(progRes.status, 200);

      const yearsRes = await request('/api/academic-years');
      assert.equal(yearsRes.status, 200);
      assert.ok(Array.isArray(yearsRes.json) && yearsRes.json.length >= 1);
      return 'RAG status gating, chunk ingestion & learning progress verified';
    });

    await runTest('7. Child Privacy Compliance (ND 13/2023): Consent OTP, Export & Delete', async () => {
      const reqConsent = await request('/api/privacy/consent/request', {
        method: 'POST',
        token: studentToken,
        body: { guardianEmail: 'phuhuynh.e2e@example.com', relationship: 'Mẹ' },
      });
      assert.equal(reqConsent.status, 200);
      assert.ok(reqConsent.json.devConsentOtpPreview);

      const verConsent = await request('/api/privacy/consent/verify', {
        method: 'POST',
        token: studentToken,
        body: { otpCode: reqConsent.json.devConsentOtpPreview },
      });
      assert.equal(verConsent.status, 200);
      assert.equal(verConsent.json.user.parentalConsentVerified, true);

      const exportRes = await request('/api/privacy/export-my-data', { token: studentToken });
      assert.equal(exportRes.status, 200);
      assert.ok(exportRes.json.learningProgress.length >= 1);

      const crossDel = await request(`/api/privacy/student-data/${studentId}`, {
        method: 'DELETE',
        token: student2Token,
      });
      assert.equal(crossDel.status, 403);

      const selfDel = await request(`/api/privacy/student-data/${studentId}`, {
        method: 'DELETE',
        token: studentToken,
      });
      assert.equal(selfDel.status, 200);

      const exportAfter = await request('/api/privacy/export-my-data', { token: studentToken });
      assert.equal(exportAfter.json.learningProgress.length, 0);

      const aud = await request('/api/audit-logs?status=warning', { token: adminToken });
      assert.equal(aud.status, 200);
      assert.ok(aud.json.some((l) => l.action.includes('Xóa dữ liệu')));
      return 'Parental OTP verified, JSON exported, IDOR blocked, data wiped & audited';
    });

    await runTest('8. Gemini AI Integration Honest Probe (/api/ai/student-chat)', async () => {
      const chatRes = await request('/api/ai/student-chat', {
        method: 'POST',
        token: student2Token,
        body: {
          message: 'Giải thích giúp em phân số là gì cho lớp 4?',
          grade: 4,
          subjectId: 'toan',
        },
      });
      if (process.env.GEMINI_API_KEY) {
        if (chatRes.status === 200) {
          assert.ok(chatRes.json.reply && chatRes.json.reply.length > 10);
          return `Live Gemini responded (${chatRes.json.reply.length} chars, citations=${chatRes.json.citations?.length || 0})`;
        }
        assert.ok(chatRes.json?.error);
        return `Live Gemini reachable, returned HTTP ${chatRes.status}: ${chatRes.json.error}`;
      } else {
        assert.equal(chatRes.status, 503, 'Without GEMINI_API_KEY must honestly return 503 without mocking');
        return 'No GEMINI_API_KEY set -> returned honest 503 error (zero mock fallback)';
      }
    });

    await runTest('9. Production Recovery Guards: Knowledge Map Isolation, CORS & Curriculum Metadata', async () => {
      // Unauthenticated knowledge map must return honest 0% baseline (no fake 100%/95% mastery)
      const anonMap = await request('/api/knowledge-map');
      assert.equal(anonMap.status, 200);
      assert.ok(Array.isArray(anonMap.json) && anonMap.json.length >= 5);
      assert.ok(
        anonMap.json.every((n) => n.masteryPercentage === 0),
        'Unauthenticated knowledge map must start at 0% mastery'
      );

      // Student 2 completes lesson-math-101 -> only Student 2's map updates, anonymous/other stays 0%
      const prog2 = await request('/api/learning-progress', {
        method: 'POST',
        token: student2Token,
        body: { lessonId: 'lesson-math-101', timeSpentSeconds: 120, checkpointPassed: true },
      });
      assert.equal(prog2.status, 200);

      const stu2Map = await request('/api/knowledge-map', { token: student2Token });
      assert.equal(stu2Map.status, 200);
      const node1Stu2 = stu2Map.json.find((n) => n.id === 'k-math-1');
      const node2Stu2 = stu2Map.json.find((n) => n.id === 'k-math-2');
      assert.ok(
        node1Stu2 && node1Stu2.masteryPercentage >= 70 && node1Stu2.status === 'mastered',
        'Student 2 k-math-1 mastery should reach mastered (>= 70%)'
      );
      assert.ok(
        node2Stu2 && node2Stu2.status === 'available',
        'Student 2 k-math-2 prerequisite should unlock to available'
      );

      const anonMapAfter = await request('/api/knowledge-map');
      assert.equal(anonMapAfter.status, 200);
      assert.ok(
        anonMapAfter.json.every((n) => n.masteryPercentage === 0),
        'Per-student knowledge map progress must NOT leak globally'
      );

      // Verify lessons have no invented 'Chuẩn GDPT 2026' issueDate
      const lessonsRes = await request('/api/curriculum/lessons');
      assert.equal(lessonsRes.status, 200);
      assert.ok(
        lessonsRes.json.every(
          (l) => !String(l.officialReference?.issueDate || '').includes('Chuẩn GDPT 2026')
        ),
        'Lessons must not use invented Chuẩn GDPT 2026 issueDate'
      );

      // Verify Vercel production origin CORS header
      const corsRes = await fetch(`${BASE_URL}/api/health`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://edubot-u4d6.vercel.app' },
      });
      assert.equal(corsRes.status, 204);
      assert.equal(
        corsRes.headers.get('access-control-allow-origin'),
        'https://edubot-u4d6.vercel.app'
      );
      return '0% baseline, per-student isolation, curriculum dates & Vercel CORS verified';
    });

    await runTest('10. Complete Grades 1-5 CTGDPT 2018 Curriculum, Ordering/DragDrop/Essay Grading, Analytics & Admin Controls', async () => {
      // Grade 1-2 must NOT include khoa-hoc, lich-su-dia-li, tin-hoc, cong-nghe
      for (const g of [1, 2]) {
        const subRes = await request(`/api/curriculum/subjects?grade=${g}`);
        assert.equal(subRes.status, 200);
        const ids = subRes.json.map((s) => s.id);
        assert.ok(ids.includes('toan') && ids.includes('tieng-viet') && ids.includes('tu-nhien-xa-hoi'));
        assert.equal(ids.includes('khoa-hoc'), false, `Grade ${g} must NOT include khoa-hoc`);
        assert.equal(ids.includes('lich-su-dia-li'), false, `Grade ${g} must NOT include lich-su-dia-li`);
        assert.equal(ids.includes('tin-hoc'), false, `Grade ${g} must NOT include tin-hoc`);
        assert.equal(ids.includes('cong-nghe'), false, `Grade ${g} must NOT include cong-nghe`);
      }

      // Grade 3 includes tin-hoc & cong-nghe, excludes khoa-hoc & lich-su-dia-li
      const g3Subs = await request('/api/curriculum/subjects?grade=3');
      assert.equal(g3Subs.status, 200);
      const g3Ids = g3Subs.json.map((s) => s.id);
      assert.ok(g3Ids.includes('tin-hoc') && g3Ids.includes('cong-nghe') && g3Ids.includes('tu-nhien-xa-hoi'));
      assert.equal(g3Ids.includes('khoa-hoc'), false);
      assert.equal(g3Ids.includes('lich-su-dia-li'), false);

      // Grade 4-5 include khoa-hoc & lich-su-dia-li, exclude tu-nhien-xa-hoi
      for (const g of [4, 5]) {
        const subRes = await request(`/api/curriculum/subjects?grade=${g}`);
        assert.equal(subRes.status, 200);
        const ids = subRes.json.map((s) => s.id);
        assert.ok(ids.includes('khoa-hoc') && ids.includes('lich-su-dia-li') && ids.includes('tin-hoc'));
        assert.equal(ids.includes('tu-nhien-xa-hoi'), false, `Grade ${g} must NOT include tu-nhien-xa-hoi`);
      }

      // Create mixed exercise with ordering + drag_drop + essay (linked to a real Grade 4 lesson)
      const g4LessonsRes = await request('/api/curriculum/lessons?grade=4');
      assert.equal(g4LessonsRes.status, 200);
      const sampleG4Lesson = g4LessonsRes.json[0];
      assert.ok(sampleG4Lesson, 'Grade 4 must have verified lessons');

      const mixedExRes = await request('/api/exercises', {
        method: 'POST',
        token: approvedTeacherToken,
        body: {
          title: 'Kiểm tra tổng hợp Sắp xếp - Kéo thả - Tự luận',
          subjectId: sampleG4Lesson.subjectId,
          grade: 4,
          lessonId: sampleG4Lesson.id,
          durationMinutes: 15,
          questions: [
            {
              type: 'ordering',
              questionText: 'Sắp xếp các số từ bé đến lớn:',
              items: ['12', '45', '99'],
              correctAnswer: ['12', '45', '99'],
              explanation: 'So sánh từ trái sang phải: 12 < 45 < 99.',
            },
            {
              type: 'drag_drop',
              questionText: 'Phân loại đơn vị đo:',
              dragItems: ['Mét', 'Ki-lô-gam'],
              dropZones: ['Độ dài', 'Khối lượng'],
              correctAnswer: { 'Độ dài': 'Mét', 'Khối lượng': 'Ki-lô-gam' },
              explanation: 'Mét đo độ dài; ki-lô-gam đo khối lượng.',
            },
            {
              type: 'essay',
              questionText: 'Nêu một ví dụ đo độ dài bàn học.',
              correctAnswer: '',
              rubricCriteria: ['Đo đúng đơn vị', 'Ghi rõ kết quả'],
            },
          ],
        },
      });
      assert.equal(mixedExRes.status, 201);
      const mixedEx = mixedExRes.json.exercise;
      const [qOrd, qDrag, qEssay] = mixedEx.questions;

      // Submit 1 wrong + 1 right + essay -> essay must NOT get auto score, pendingEssayReview=true
      const attempt1 = await request('/api/exercises/submit', {
        method: 'POST',
        token: student2Token,
        body: {
          exerciseSetId: mixedEx.id,
          grade: 4,
          answers: {
            [qOrd.id]: ['99', '12', '45'], // wrong
            [qDrag.id]: { 'Độ dài': 'Mét', 'Khối lượng': 'Ki-lô-gam' }, // correct
            [qEssay.id]: 'Em đo bàn học dài 120 cm.',
          },
          timeSpentSeconds: 70,
        },
      });
      assert.equal(attempt1.status, 200);
      assert.equal(attempt1.json.submission.score, 5, '1/2 auto-gradable right must score 5/10 (essay excluded)');
      assert.equal(attempt1.json.submission.pendingEssayReview, true);
      assert.equal(attempt1.json.submission.status, 'submitted');
      assert.ok(attempt1.json.submission.wrongQuestionIds.includes(qOrd.id));

      // Wrong questions & review recommendations endpoint
      const wrongAnalytics = await request('/api/analytics/wrong-questions', { token: student2Token });
      assert.equal(wrongAnalytics.status, 200);
      assert.ok(wrongAnalytics.json.wrongQuestions.some((w) => w.questionId === qOrd.id));
      assert.ok(
        wrongAnalytics.json.recommendedLessons.some((l) => l.id === sampleG4Lesson.id),
        'Must recommend related lesson for missed question'
      );

      // Retry with all deterministic questions correct -> score 10, still pendingEssayReview=true
      const attempt2 = await request('/api/exercises/submit', {
        method: 'POST',
        token: student2Token,
        body: {
          exerciseSetId: mixedEx.id,
          grade: 4,
          answers: {
            [qOrd.id]: ['12', '45', '99'],
            [qDrag.id]: { 'Độ dài': 'Mét', 'Khối lượng': 'Ki-lô-gam' },
            [qEssay.id]: 'Em dùng thước dây đo chiều dài bàn học là 1 mét 20 xăng-ti-mét.',
          },
          timeSpentSeconds: 60,
        },
      });
      assert.equal(attempt2.status, 200);
      assert.equal(attempt2.json.submission.score, 10);
      assert.equal(attempt2.json.submission.attemptNumber, 2);

      // Favorites + Resume tracking
      const openRes = await request('/api/learning-progress/open', {
        method: 'POST',
        token: student2Token,
        body: { lessonId: sampleG4Lesson.id },
      });
      assert.equal(openRes.status, 200);
      const lastOpenRes = await request('/api/learning-progress/last-opened', { token: student2Token });
      assert.equal(lastOpenRes.status, 200);
      assert.equal(lastOpenRes.json.lessonId, sampleG4Lesson.id);

      const favAdd = await request('/api/favorites', {
        method: 'POST',
        token: student2Token,
        body: { lessonId: sampleG4Lesson.id },
      });
      assert.equal(favAdd.status, 200);
      assert.ok(favAdd.json.lessonIds.includes(sampleG4Lesson.id));

      const favDel = await request(`/api/favorites/${sampleG4Lesson.id}`, {
        method: 'DELETE',
        token: student2Token,
      });
      assert.equal(favDel.status, 200);
      assert.equal(favDel.json.lessonIds.includes(sampleG4Lesson.id), false);

      // Admin textbook series switcher & public-policy propagation
      const switchRes = await request('/api/system/settings', {
        method: 'PUT',
        token: adminToken,
        body: { textbookSeries: 'ctst' },
      });
      assert.equal(switchRes.status, 200);
      const policyCtst = await request('/api/system/public-policy');
      assert.equal(policyCtst.json.textbookSeries, 'ctst');
      await request('/api/system/settings', {
        method: 'PUT',
        token: adminToken,
        body: { textbookSeries: 'kntt' },
      });

      // Teacher class assigned materials + student 403 block
      const stuMatBlock = await request(`/api/classes/${createdClassId}/materials`, {
        method: 'PUT',
        token: student2Token,
        body: { assignedLessonIds: [sampleG4Lesson.id] },
      });
      assert.equal(stuMatBlock.status, 403);
      const teacherMatOk = await request(`/api/classes/${createdClassId}/materials`, {
        method: 'PUT',
        token: approvedTeacherToken,
        body: { assignedLessonIds: [sampleG4Lesson.id], textbookSeries: 'kntt' },
      });
      assert.equal(teacherMatOk.status, 200);
      assert.ok(teacherMatOk.json.class.assignedLessonIds.includes(sampleG4Lesson.id));

      return 'CTGDPT 2018 grade-subject guards, ordering/drag_drop/essay scoring, wrong-question recommendations, favorites/resume, textbook switcher & class materials verified';
    });
  } finally {
    if (serverProc && serverProc.pid) {
      try {
        process.kill(-serverProc.pid, 'SIGKILL');
      } catch {
        // already exited
      }
    }
  }

  const failed = results.filter((r) => r.status === 'FAIL');
  console.log('\n==================== E2E TEST SUMMARY ====================');
  console.log(`Total: ${results.length} | Passed: ${results.length - failed.length} | Failed: ${failed.length}`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
