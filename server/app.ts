/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import {
  initialUsers,
  initialSubjects,
  initialTopics,
  initialLessons,
  initialExercises,
  initialClasses,
  initialAssignments,
  initialSubmissions,
  initialDrafts,
  initialAuditLogs,
  initialKnowledgeNodes,
  initialAcademicYears
} from './data.ts';
import { RagPipelineEngine } from './rag.ts';
import {
  User,
  UserRole,
  CurriculumSubject,
  CurriculumTopic,
  Lesson,
  ExerciseSet,
  ClassRoom,
  Assignment,
  StudentSubmission,
  AiDraftItem,
  AuditLog,
  KnowledgeNode,
  SystemSettings,
  AiChatMessage,
  AcademicYear,
  LearningProgress,
  ParentConsentRecord,
  TEXTBOOK_SERIES_LABELS,
  TextbookSeries,
  WrongQuestionStat,
  Question,
  isLessonVerified
} from '../src/types/index.ts';

dotenv.config();

// Load Firebase Project & Enterprise Firestore Database ID safely from env or firebase-applet-config.json
function loadFirebaseConfig(): { projectId: string; databaseId: string } {
  let fileCfg: { projectId?: string; firestoreDatabaseId?: string } = {};
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      fileCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    }
  } catch {
    // ignore missing config
  }
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || fileCfg.projectId || '',
    databaseId: process.env.FIRESTORE_DATABASE_ID || fileCfg.firestoreDatabaseId || '(default)',
  };
}

const FIREBASE_CFG = loadFirebaseConfig();
const FIREBASE_PROJECT_ID = FIREBASE_CFG.projectId;
const FIRESTORE_DATABASE_ID = FIREBASE_CFG.databaseId;
const FIREBASE_JWKS = FIREBASE_PROJECT_ID
  ? createRemoteJWKSet(
      new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
    )
  : null;

const BOOTSTRAP_ADMIN_EMAIL = (process.env.BOOTSTRAP_ADMIN_EMAIL || 'vulin1000@gmail.com').toLowerCase();
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const ENABLE_DEMO_SEED =
  process.env.ENABLE_DEMO_SEED === 'true' ||
  (!IS_PRODUCTION && process.env.DISABLE_DEMO_SEED !== 'true');

// ----------------- SECURITY & CRYPTO HELPERS -----------------
const RAW_SESSION_SECRET = process.env.SESSION_SECRET?.trim() || '';
const HAS_SECURE_SESSION_SECRET = RAW_SESSION_SECRET.length >= 16;
const TOKEN_SECRET = RAW_SESSION_SECRET || 'edubot-ai-session-secret-2026-dev-only';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function hashPassword(password: string, salt?: string): string {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return `${usedSalt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

interface TokenPayload {
  sub: string;
  role: UserRole;
  exp: number;
  jti: string;
}

function signToken(user: User): string {
  const payload: TokenPayload = {
    sub: user.id,
    role: user.role,
    exp: Date.now() + TOKEN_TTL_MS,
    jti: crypto.randomUUID(),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

const revokedTokenIds = new Set<string>();

function verifyLocalToken(token: string): TokenPayload | null {
  if (IS_PRODUCTION && !HAS_SECURE_SESSION_SECRET) {
    return null;
  }
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(payloadB64).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as TokenPayload;
    if (!payload.sub || !payload.exp || Date.now() > payload.exp) return null;
    if (revokedTokenIds.has(payload.jti)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function verifyFirebaseIdToken(idToken: string): Promise<{
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
} | null> {
  if (!FIREBASE_PROJECT_ID || !FIREBASE_JWKS) return null;
  try {
    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    const uid = String(payload.user_id || payload.sub || '');
    const email = String(payload.email || '').toLowerCase();
    if (!uid || !email) return null;
    return {
      uid,
      email,
      emailVerified: Boolean(payload.email_verified),
      name: payload.name ? String(payload.name) : undefined,
    };
  } catch {
    return null;
  }
}

function parseFirestoreFieldValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('arrayValue' in val && Array.isArray(val.arrayValue?.values)) {
    return val.arrayValue.values.map(parseFirestoreFieldValue).filter((v: any) => v !== undefined);
  }
  return undefined;
}

async function fetchFirestoreDocWithToken(
  docPath: string,
  idToken: string
): Promise<Record<string, any> | null> {
  if (!FIREBASE_PROJECT_ID || !FIRESTORE_DATABASE_ID) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      FIREBASE_PROJECT_ID
    )}/databases/${encodeURIComponent(FIRESTORE_DATABASE_ID)}/documents/${docPath}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { fields?: Record<string, any> };
    if (!json.fields) return null;
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(json.fields)) {
      out[k] = parseFirestoreFieldValue(v);
    }
    return out;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function sanitizeUser(user: User): User {
  return { ...user };
}

interface AuthenticatedRequest extends Request {
  authUser?: User;
  tokenPayload?: TokenPayload;
  authSource?: 'local' | 'firebase';
}

// Sliding-window rate limiter
function createRateLimiter(opts: { windowMs: number; maxRequests: number; label: string }) {
  const buckets = new Map<string, number[]>();
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || 'local'}:${opts.label}`;
    const now = Date.now();
    const entries = (buckets.get(key) || []).filter((ts) => now - ts < opts.windowMs);
    if (entries.length >= opts.maxRequests) {
      return res.status(429).json({
        error: `Bạn gửi quá nhiều yêu cầu (${opts.label}). Vui lòng thử lại sau ít phút.`,
      });
    }
    entries.push(now);
    buckets.set(key, entries);
    next();
  };
}

// Child Safety Moderation pre-filter
const UNSAFE_CHILD_PATTERNS = [
  /tự\s*tử|tự\s*hại|rạch\s*tay|bom\s*mìn|chế\s*tạo\s*vũ\s*khí/i,
  /khiêu\s*dâm|đồi\s*trụy|18\+/i,
  /ma\s*túy|heroin|thuốc\s*lắc/i,
];

function isChildUnsafePrompt(text: string): boolean {
  return UNSAFE_CHILD_PATTERNS.some((re) => re.test(text));
}

export function createApp() {
  const app = express();
  const startedAt = Date.now();

  app.use(express.json({ limit: '1mb' }));

  // CORS middleware supporting Vercel multi-origin / comma-separated ALLOWED_ORIGIN cleanly
  const allowedOriginSet = new Set(
    [
      ...(process.env.ALLOWED_ORIGIN || '').split(','),
      process.env.APP_URL || '',
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
      'https://edubot-u4d6.vercel.app',
    ]
      .map((s) => s.trim().replace(/\/+$/, ''))
      .filter(Boolean)
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    const rawOrigin = req.headers.origin;
    const normalizedOrigin = rawOrigin ? rawOrigin.replace(/\/+$/, '') : '';
    const isExplicitProdAllowlist = IS_PRODUCTION && Boolean(process.env.ALLOWED_ORIGIN?.trim());

    if (
      rawOrigin &&
      (!isExplicitProdAllowlist || allowedOriginSet.has(normalizedOrigin) || allowedOriginSet.has('*'))
    ) {
      res.setHeader('Access-Control-Allow-Origin', rawOrigin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // Safe request logging for /api/* (excludes credentials/PII)
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const t0 = Date.now();
    res.on('finish', () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - t0}ms)`);
      }
    });
    next();
  });

  const apiLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 250, label: 'api' });
  const authLimiter = createRateLimiter({ windowMs: 300_000, maxRequests: 35, label: 'auth' });
  const aiLimiter = createRateLimiter({ windowMs: 300_000, maxRequests: 30, label: 'ai' });

  app.use('/api', apiLimiter);

  // ----------------- DATA STORE & RAG INITIALIZATION -----------------
  const users: User[] = ENABLE_DEMO_SEED ? initialUsers.map((u) => ({ ...u })) : [];
  const passwordHashes = new Map<string, string>();
  if (ENABLE_DEMO_SEED) {
    const DEFAULT_DEMO_PASSWORDS: Record<string, string> = {
      'admin@edubot.edu.vn': process.env.DEMO_ADMIN_PASSWORD || 'edubot2026',
      'comai@edubot.edu.vn': process.env.DEMO_TEACHER_PASSWORD || 'edubot2026',
      'tuan.nh@edubot.edu.vn': process.env.DEMO_STUDENT_PASSWORD || 'edubot2026',
    };
    for (const u of users) {
      const initialPw = DEFAULT_DEMO_PASSWORDS[u.email.toLowerCase()] || 'edubot2026';
      passwordHashes.set(u.id, hashPassword(initialPw));
    }
  }

  const otpStore = new Map<string, { code: string; expiresAt: number }>();
  const consentOtpStore = new Map<string, { code: string; expiresAt: number }>();
  const studentChatHistories = new Map<string, AiChatMessage[]>();
  const favoriteLessonsStore = new Map<string, Set<string>>();
  const lastOpenedLessonStore = new Map<string, { lessonId: string; openedAt: string }>();
  const wrongQuestionStatsStore = new Map<string, Map<string, WrongQuestionStat>>();

  const subjects: CurriculumSubject[] = [...initialSubjects];
  const topics: CurriculumTopic[] = [...initialTopics];
  const lessons: Lesson[] = [...initialLessons];
  const exercises: ExerciseSet[] = [...initialExercises];
  const classes: ClassRoom[] = ENABLE_DEMO_SEED
    ? initialClasses.map((c) => ({
        ...c,
        students: [...c.students],
        studentCount: c.students.length,
      }))
    : [];
  const assignments: Assignment[] = ENABLE_DEMO_SEED ? [...initialAssignments] : [];
  const submissions: StudentSubmission[] = ENABLE_DEMO_SEED ? [...initialSubmissions] : [];
  const aiDrafts: AiDraftItem[] = ENABLE_DEMO_SEED ? [...initialDrafts] : [];
  const auditLogs: AuditLog[] = ENABLE_DEMO_SEED ? [...initialAuditLogs] : [];
  const knowledgeNodes: KnowledgeNode[] = initialKnowledgeNodes.map((n) => ({ ...n }));
  const academicYears: AcademicYear[] = [...initialAcademicYears];
  const learningProgress: LearningProgress[] = [];
  const consentRecords: ParentConsentRecord[] = [];

  let systemSettings: SystemSettings = {
    childSafetyFilterEnabled: true,
    parentalConsentRequired: true,
    leaderboardEnabled: false,
    dataRetentionDays: 365,
    aiMaxTokensPerDay: 50000,
    curriculumStandard: 'Thông tư 32/2018/TT-BGDĐT & TT 17/2025/TT-BGDĐT',
    curriculumVersionYear: 2026,
    textbookSeries: 'kntt',
    textbookSeriesLabel: TEXTBOOK_SERIES_LABELS.kntt,
    maintenanceMode: false,
  };

  // Initialize 10-Step RAG Engine
  const ragEngine = new RagPipelineEngine();
  ragEngine.seedFromLessons(lessons);

  function addAuditLog(
    action: string,
    user: string,
    role: string,
    details: string,
    status: 'success' | 'warning' | 'info' = 'info'
  ) {
    auditLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action,
      user,
      role,
      details,
      timestamp: new Date().toISOString(),
      status,
    });
  }

  async function findOrProvisionFirebaseUser(
    claims: {
      uid: string;
      email: string;
      emailVerified: boolean;
      name?: string;
    },
    idToken?: string
  ): Promise<User> {
    let existing = users.find((u) => u.id === claims.uid || u.email.toLowerCase() === claims.email);
    if (existing) {
      if (claims.email === BOOTSTRAP_ADMIN_EMAIL && claims.emailVerified) {
        existing.role = 'admin';
      }
      return existing;
    }

    // Hydrate profile & role from Cloud Firestore across serverless cold starts
    const [fsUser, fsAdmin, fsTeacher] = idToken
      ? await Promise.all([
          fetchFirestoreDocWithToken(`users/${claims.uid}`, idToken),
          fetchFirestoreDocWithToken(`admins/${claims.uid}`, idToken),
          fetchFirestoreDocWithToken(`teachers/${claims.uid}`, idToken),
        ])
      : [null, null, null];

    const isBootstrapAdmin = claims.email === BOOTSTRAP_ADMIN_EMAIL && claims.emailVerified;
    const isAdminDoc = Boolean(fsAdmin) || isBootstrapAdmin;
    const fsTeacherStatus = fsTeacher?.approvalStatus || fsUser?.teacherApprovalStatus;

    let resolvedRole: UserRole = 'student';
    let resolvedApproval: User['teacherApprovalStatus'] = 'none';
    if (isAdminDoc) {
      resolvedRole = 'admin';
    } else if (fsTeacher || fsUser?.role === 'teacher' || fsTeacherStatus === 'pending' || fsTeacherStatus === 'approved') {
      resolvedRole = 'teacher';
      resolvedApproval =
        fsTeacherStatus === 'approved' || fsTeacherStatus === 'rejected' ? fsTeacherStatus : 'pending';
    }

    const newUser: User = {
      id: claims.uid,
      name: String(fsUser?.name || claims.name || claims.email.split('@')[0]).slice(0, 100),
      email: claims.email,
      role: resolvedRole,
      teacherApprovalStatus: resolvedApproval,
      authProvider: 'firebase',
      grade:
        resolvedRole === 'student'
          ? Math.min(5, Math.max(1, Number(fsUser?.grade) || 4))
          : undefined,
      school: String(fsUser?.school || 'Trường Tiểu học Thăng Long').slice(0, 150),
      xp: resolvedRole === 'student' ? Math.max(0, Number(fsUser?.xp ?? 0)) : undefined,
      streakDays: resolvedRole === 'student' ? Math.max(0, Number(fsUser?.streakDays ?? 0)) : undefined,
      badges: resolvedRole === 'student' && Array.isArray(fsUser?.badges) ? fsUser.badges : [],
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    return newUser;
  }

  // Soft optional auth for per-student read views (e.g. /api/knowledge-map)
  async function authenticateOptionalUser(req: Request): Promise<User | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    const localPayload = verifyLocalToken(token);
    if (localPayload) {
      return users.find((u) => u.id === localPayload.sub) || null;
    }
    const firebaseClaims = await verifyFirebaseIdToken(token);
    if (firebaseClaims) {
      return findOrProvisionFirebaseUser(firebaseClaims, token);
    }
    return null;
  }

  // Dual Authentication Middleware (Local HMAC Bearer OR Firebase ID Token)
  async function authenticateRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để truy cập tài nguyên này.' });
    }
    const token = authHeader.slice(7).trim();

    // 1. Try local HMAC token first
    const localPayload = verifyLocalToken(token);
    if (localPayload) {
      const user = users.find((u) => u.id === localPayload.sub);
      if (!user) {
        return res.status(401).json({ error: 'Tài khoản không tồn tại trong hệ thống.' });
      }
      req.authUser = user;
      req.tokenPayload = localPayload;
      req.authSource = 'local';
      return next();
    }

    // 2. Try verifying cryptographic Firebase Auth ID Token
    const firebaseClaims = await verifyFirebaseIdToken(token);
    if (firebaseClaims) {
      req.authUser = await findOrProvisionFirebaseUser(firebaseClaims, token);
      req.authSource = 'firebase';
      return next();
    }

    return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.' });
  }

  function requireRole(...allowedRoles: UserRole[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.authUser) {
        return res.status(401).json({ error: 'Chưa xác thực người dùng.' });
      }
      if (!allowedRoles.includes(req.authUser.role)) {
        return res.status(403).json({
          error: `Bạn không có quyền thực hiện thao tác này (Yêu cầu vai trò: ${allowedRoles.join(', ')}).`,
        });
      }
      next();
    };
  }

  function requireApprovedStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Chưa xác thực người dùng.' });
    }
    if (req.authUser.role === 'admin') return next();
    if (req.authUser.role === 'teacher') {
      if (req.authUser.teacherApprovalStatus && req.authUser.teacherApprovalStatus !== 'approved') {
        return res.status(403).json({
          error:
            req.authUser.teacherApprovalStatus === 'rejected'
              ? 'Tài khoản giáo viên của bạn chưa được chấp thuận. Vui lòng liên hệ Quản trị viên.'
              : 'Tài khoản giáo viên đang chờ Quản trị viên phê duyệt trước khi quản lý lớp và tạo học liệu.',
        });
      }
      return next();
    }
    return res.status(403).json({ error: 'Chức năng dành riêng cho Giáo viên được duyệt hoặc Quản trị viên.' });
  }

  // Gemini AI Client Initialization (Server-side only)
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // ----------------- HEALTH CHECK -----------------
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'edubot-ai-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      firebaseProjectId: FIREBASE_PROJECT_ID || null,
      aiModel: 'gemini-4-hydrogen',
      aiConfigured: Boolean(process.env.GEMINI_API_KEY),
      ragChunksIndexed: ragEngine.listDocuments().reduce((acc, d) => acc + d.chunkCount, 0),
    });
  });

  // ----------------- AUTHENTICATION ROUTES -----------------
  app.post('/api/auth/firebase-sync', authLimiter, async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Thiếu Firebase ID Token.' });
    }
    const idToken = authHeader.slice(7).trim();
    const claims = await verifyFirebaseIdToken(idToken);
    if (!claims) {
      return res.status(401).json({ error: 'Firebase ID Token không hợp lệ hoặc đã hết hạn.' });
    }

    const { requestedRole, grade, school, name, parentalConsentVerified } = req.body || {};
    const user = await findOrProvisionFirebaseUser(claims, idToken);

    if (name && String(name).trim()) {
      user.name = String(name).trim().slice(0, 100);
    }
    if (school && String(school).trim()) {
      user.school = String(school).trim().slice(0, 150);
    }
    if (requestedRole === 'teacher' && user.role === 'student') {
      user.role = 'teacher';
      user.teacherApprovalStatus = 'pending';
    } else if (user.role === 'student' && grade) {
      user.grade = Math.min(5, Math.max(1, Number(grade) || 4));
    }
    if (typeof parentalConsentVerified === 'boolean' && user.role === 'student') {
      user.parentalConsentVerified = parentalConsentVerified;
    }

    addAuditLog(
      'Đăng nhập Firebase Auth',
      user.email,
      user.role,
      `Đồng bộ phiên Firebase Auth thành công (${user.role}).`,
      'info'
    );
    res.json({ success: true, user: sanitizeUser(user) });
  });

  app.post('/api/auth/login', authLimiter, (req: Request, res: Response) => {
    if (IS_PRODUCTION && !HAS_SECURE_SESSION_SECRET) {
      return res.status(503).json({
        error:
          'Đăng nhập cục bộ chưa được cấu hình SESSION_SECRET trên môi trường production. Vui lòng sử dụng Đăng nhập Firebase (Email/Mật khẩu hoặc Google) hoặc cấu hình SESSION_SECRET (>= 16 ký tự).',
      });
    }
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ email và mật khẩu.' });
    }

    const user = users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
    }

    const storedHash = passwordHashes.get(user.id);
    if (!storedHash || !verifyPassword(String(password), storedHash)) {
      addAuditLog('Đăng nhập thất bại', user.email, user.role, 'Nhập sai mật khẩu khi đăng nhập.', 'warning');
      return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
    }

    const token = signToken(user);
    addAuditLog('Đăng nhập hệ thống', user.email, user.role, `Người dùng ${user.name} đăng nhập thành công.`, 'info');
    res.json({ success: true, user: sanitizeUser(user), token });
  });

  app.post('/api/auth/register', authLimiter, (req: Request, res: Response) => {
    if (IS_PRODUCTION && !HAS_SECURE_SESSION_SECRET) {
      return res.status(503).json({
        error:
          'Chức năng đăng ký cục bộ tạm tắt trên production vì thiếu SESSION_SECRET. Vui lòng đăng ký qua Firebase Auth.',
      });
    }
    const { name, email, password, role, grade, school } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ họ tên, email và mật khẩu.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }

    // Never allow self-registration as admin or pre-approved teacher
    const safeRole: UserRole = role === 'teacher' ? 'teacher' : 'student';
    const approvalStatus = safeRole === 'teacher' ? 'pending' : 'none';

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Email này đã được đăng ký tài khoản.' });
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: String(name).trim().slice(0, 100),
      email: normalizedEmail,
      role: safeRole,
      teacherApprovalStatus: approvalStatus,
      authProvider: 'local',
      grade: safeRole === 'student' ? Math.min(5, Math.max(1, Number(grade) || 4)) : undefined,
      school: school ? String(school).trim().slice(0, 150) : 'Trường Tiểu học Thăng Long',
      xp: safeRole === 'student' ? 0 : undefined,
      streakDays: safeRole === 'student' ? 0 : undefined,
      badges: safeRole === 'student' ? [] : undefined,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    passwordHashes.set(newUser.id, hashPassword(String(password)));

    const token = signToken(newUser);
    addAuditLog(
      'Đăng ký tài khoản mới',
      newUser.email,
      newUser.role,
      `Người dùng ${newUser.name} đã đăng ký vai trò ${newUser.role} (trạng thái duyệt GV: ${approvalStatus})`,
      'success'
    );

    res.status(201).json({ success: true, user: sanitizeUser(newUser), token });
  });

  app.post('/api/auth/logout', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    if (req.tokenPayload?.jti) {
      revokedTokenIds.add(req.tokenPayload.jti);
    }
    if (req.authUser) {
      addAuditLog('Đăng xuất hệ thống', req.authUser.email, req.authUser.role, 'Đã kết thúc phiên làm việc an toàn.', 'info');
    }
    res.json({ success: true });
  });

  app.get('/api/auth/me', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, user: sanitizeUser(req.authUser!), authSource: req.authSource });
  });

  app.post('/api/auth/forgot-password', authLimiter, (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Vui lòng nhập email tài khoản.' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản với email này trong hệ thống.' });
    }

    const code = String(crypto.randomInt(100000, 999999));
    otpStore.set(normalizedEmail, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

    addAuditLog('Yêu cầu đặt lại mật khẩu', user.email, user.role, `Đã tạo mã OTP đặt lại mật khẩu.`, 'info');

    res.json({
      success: true,
      message:
        process.env.NODE_ENV !== 'production'
          ? `Đã tạo mã OTP xác thực cho ${normalizedEmail}. (Môi trường thử nghiệm: ${code})`
          : `Đã tạo mã OTP xác thực cho ${normalizedEmail}. Vui lòng kiểm tra email hoặc liên hệ quản trị viên.`,
      devOtpPreview: process.env.NODE_ENV !== 'production' ? code : undefined,
    });
  });

  app.post('/api/auth/reset-password', authLimiter, (req: Request, res: Response) => {
    const { email, otpCode, newPassword } = req.body;
    if (!email || !otpCode || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ email, mã OTP và mật khẩu mới.' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const record = otpStore.get(normalizedEmail);
    if (!record || Date.now() > record.expiresAt || record.code !== String(otpCode).trim()) {
      return res.status(400).json({ error: 'Mã OTP không chính xác hoặc đã hết hạn.' });
    }

    const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: 'Tài khoản không tồn tại.' });
    }

    passwordHashes.set(user.id, hashPassword(String(newPassword)));
    otpStore.delete(normalizedEmail);

    addAuditLog('Đặt lại mật khẩu thành công', user.email, user.role, `Đặt lại mật khẩu bằng OTP hợp lệ.`, 'success');
    res.json({ success: true, message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại bằng mật khẩu mới.' });
  });

  app.get('/api/auth/users', authenticateRequest, requireApprovedStaff, (req: AuthenticatedRequest, res: Response) => {
    const { search, role } = req.query;
    let list = req.authUser!.role === 'teacher' ? users.filter((u) => u.role === 'student') : users;
    if (role && req.authUser!.role === 'admin') {
      list = list.filter((u) => u.role === role);
    }
    if (search) {
      const q = String(search).toLowerCase().trim();
      list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    res.json(list.map(sanitizeUser));
  });

  app.put('/api/auth/users/:id/role', authenticateRequest, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { role, grade } = req.body;
    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Vai trò không hợp lệ.' });
    }
    const target = users.find((u) => u.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }
    if (target.id === req.authUser!.id && role !== 'admin') {
      return res.status(400).json({ error: 'Không thể tự hạ quyền tài khoản Quản trị viên đang đăng nhập.' });
    }

    const prevRole = target.role;
    target.role = role;
    if (role === 'teacher') {
      target.teacherApprovalStatus = 'approved';
    } else if (role === 'student') {
      target.teacherApprovalStatus = 'none';
      target.grade = Math.min(5, Math.max(1, Number(grade) || target.grade || 4));
      target.xp = target.xp ?? 100;
      target.streakDays = target.streakDays ?? 1;
    }

    addAuditLog(
      'Phân quyền tài khoản',
      req.authUser!.email,
      'admin',
      `Thay đổi vai trò của ${target.email} từ "${prevRole}" sang "${role}".`,
      'warning'
    );
    res.json({ success: true, user: sanitizeUser(target) });
  });

  app.put('/api/auth/users/:id/approve-teacher', authenticateRequest, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { decision } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Quyết định duyệt giáo viên phải là approved hoặc rejected.' });
    }
    const target = users.find((u) => u.id === id);
    if (!target || target.role !== 'teacher') {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản giáo viên cần duyệt.' });
    }

    target.teacherApprovalStatus = decision;
    addAuditLog(
      decision === 'approved' ? 'Phê duyệt giáo viên' : 'Từ chối giáo viên',
      req.authUser!.email,
      'admin',
      `Quản trị viên đã ${decision === 'approved' ? 'phê duyệt' : 'từ chối'} tài khoản giáo viên ${target.email}.`,
      decision === 'approved' ? 'success' : 'warning'
    );
    res.json({ success: true, user: sanitizeUser(target) });
  });

  // ----------------- ACADEMIC YEARS -----------------
  app.get('/api/academic-years', (_req: Request, res: Response) => {
    res.json(academicYears);
  });

  app.post('/api/academic-years', authenticateRequest, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
    const { name, startDate, endDate, isActive } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tên năm học.' });
    }
    if (isActive) {
      academicYears.forEach((y) => (y.isActive = false));
    }
    const newYear: AcademicYear = {
      id: `ay-${Date.now()}`,
      name: String(name).trim(),
      startDate: startDate || '2026-09-05',
      endDate: endDate || '2027-05-31',
      isActive: Boolean(isActive),
    };
    academicYears.unshift(newYear);
    addAuditLog('Quản lý năm học', req.authUser!.email, 'admin', `Tạo năm học "${newYear.name}".`, 'info');
    res.status(201).json({ success: true, academicYear: newYear });
  });

  // ----------------- KNOWLEDGE MAP & PROGRESS -----------------
  function computeStudentKnowledgeNodes(studentId?: string): KnowledgeNode[] {
    const baseNodes = knowledgeNodes.map((k) => ({
      ...k,
      masteryPercentage: 0,
      status: (k.prerequisites.length === 0 ? 'available' : 'locked') as KnowledgeNode['status'],
    }));

    if (!studentId) return baseNodes;

    const studentSubs = submissions.filter((s) => s.studentId === studentId);
    const studentProg = learningProgress.filter((p) => p.studentId === studentId);

    for (const node of baseNodes) {
      let mastery = 0;
      const matchedProg = studentProg.find((p) => p.lessonId === node.lessonId);
      if (matchedProg?.completed) {
        mastery = Math.max(mastery, matchedProg.checkpointPassed ? 75 : 50);
      }
      const linkedExercises = exercises.filter((e) => e.lessonId === node.lessonId).map((e) => e.id);
      for (const sub of studentSubs) {
        if (linkedExercises.includes(sub.exerciseSetId)) {
          mastery = Math.max(mastery, Math.min(100, Math.round(sub.score * 10)));
        }
      }
      node.masteryPercentage = mastery;
      if (mastery >= 70) {
        node.status = 'mastered';
      } else if (mastery > 0) {
        node.status = 'available';
      }
    }

    // Unlock downstream nodes once all prerequisites are mastered
    for (const node of baseNodes) {
      if (node.status === 'locked' && node.prerequisites.length > 0) {
        const prereqsMet = node.prerequisites.every((pid) => {
          const pre = baseNodes.find((n) => n.id === pid);
          return pre?.status === 'mastered';
        });
        if (prereqsMet) node.status = 'available';
      }
    }

    return baseNodes;
  }

  app.get('/api/knowledge-map', async (req: Request, res: Response) => {
    const { grade, subjectId } = req.query;
    const optionalUser = await authenticateOptionalUser(req);
    let list = computeStudentKnowledgeNodes(optionalUser?.id);
    if (grade) list = list.filter((k) => k.grade === Number(grade));
    if (subjectId) list = list.filter((k) => k.subjectId === subjectId);
    res.json(list);
  });

  app.get('/api/learning-progress', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const { studentId } = req.query;
    if (req.authUser!.role === 'student') {
      return res.json(learningProgress.filter((p) => p.studentId === req.authUser!.id));
    }
    if (studentId) {
      return res.json(learningProgress.filter((p) => p.studentId === String(studentId)));
    }
    res.json(learningProgress);
  });

  app.post('/api/learning-progress', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const { lessonId, completed = true, checkpointPassed = false, timeSpentSeconds = 60 } = req.body;
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) {
      return res.status(404).json({ error: 'Bài học không tồn tại.' });
    }
    const studentId = req.authUser!.id;
    const clampedSeconds = Math.min(3600, Math.max(5, Number(timeSpentSeconds) || 60));

    let record = learningProgress.find((p) => p.studentId === studentId && p.lessonId === lessonId);
    let xpBonus = 0;

    if (!record) {
      record = {
        id: `prog-${Date.now()}`,
        studentId,
        lessonId: lesson.id,
        grade: lesson.grade,
        subjectId: lesson.subjectId,
        completed: Boolean(completed),
        checkpointPassed: Boolean(checkpointPassed),
        timeSpentSeconds: clampedSeconds,
        completedAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
      };
      learningProgress.unshift(record);
      if (req.authUser!.role === 'student') {
        xpBonus = checkpointPassed ? 25 : 15;
        req.authUser!.xp = (req.authUser!.xp || 0) + xpBonus;
      }
    } else {
      record.completed = record.completed || Boolean(completed);
      record.checkpointPassed = record.checkpointPassed || Boolean(checkpointPassed);
      record.timeSpentSeconds += clampedSeconds;
      record.completedAt = new Date().toISOString();
      record.lastOpenedAt = new Date().toISOString();
    }

    res.json({ success: true, progress: record, xpEarned: xpBonus, updatedXp: req.authUser!.xp });
  });

  // Track recent opened lesson for "Tiếp tục học bài gần nhất" without falsifying completion
  app.post('/api/learning-progress/open', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const { lessonId } = req.body;
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) {
      return res.status(404).json({ error: 'Bài học không tồn tại.' });
    }
    const openedAt = new Date().toISOString();
    lastOpenedLessonStore.set(req.authUser!.id, { lessonId: lesson.id, openedAt });
    res.json({ success: true, lessonId: lesson.id, openedAt });
  });

  app.get('/api/learning-progress/last-opened', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const last = lastOpenedLessonStore.get(req.authUser!.id) || null;
    res.json(last);
  });

  // Favorites per student/user
  app.get('/api/favorites', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const favSet = favoriteLessonsStore.get(req.authUser!.id) || new Set<string>();
    res.json({ lessonIds: Array.from(favSet) });
  });

  app.post('/api/favorites', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const { lessonId } = req.body;
    if (!lessonId || !lessons.some((l) => l.id === lessonId)) {
      return res.status(404).json({ error: 'Bài học không tồn tại.' });
    }
    let favSet = favoriteLessonsStore.get(req.authUser!.id);
    if (!favSet) {
      favSet = new Set<string>();
      favoriteLessonsStore.set(req.authUser!.id, favSet);
    }
    favSet.add(String(lessonId));
    res.json({ success: true, lessonIds: Array.from(favSet) });
  });

  app.delete('/api/favorites/:lessonId', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const favSet = favoriteLessonsStore.get(req.authUser!.id);
    if (favSet) {
      favSet.delete(req.params.lessonId);
    }
    res.json({ success: true, lessonIds: Array.from(favSet || []) });
  });

  // ----------------- SYSTEM SETTINGS & PRIVACY -----------------
  app.get('/api/system/settings', authenticateRequest, requireRole('admin'), (_req: Request, res: Response) => {
    res.json(systemSettings);
  });

  app.get('/api/system/public-policy', (_req: Request, res: Response) => {
    res.json({
      leaderboardEnabled: systemSettings.leaderboardEnabled,
      parentalConsentRequired: systemSettings.parentalConsentRequired,
      dataRetentionDays: systemSettings.dataRetentionDays,
      curriculumStandard: systemSettings.curriculumStandard,
      textbookSeries: systemSettings.textbookSeries || 'kntt',
      textbookSeriesLabel: systemSettings.textbookSeriesLabel || TEXTBOOK_SERIES_LABELS.kntt,
    });
  });

  app.put('/api/system/settings', authenticateRequest, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
    const allowedKeys: (keyof SystemSettings)[] = [
      'childSafetyFilterEnabled',
      'parentalConsentRequired',
      'leaderboardEnabled',
      'dataRetentionDays',
      'aiMaxTokensPerDay',
      'curriculumStandard',
      'curriculumVersionYear',
      'textbookSeries',
      'textbookSeriesLabel',
      'maintenanceMode',
    ];

    const updates: Partial<SystemSettings> = {};
    for (const key of allowedKeys) {
      if (req.body[key] !== undefined) {
        (updates as any)[key] = req.body[key];
      }
    }

    if (updates.textbookSeries && TEXTBOOK_SERIES_LABELS[updates.textbookSeries as TextbookSeries]) {
      updates.textbookSeriesLabel =
        updates.textbookSeriesLabel || TEXTBOOK_SERIES_LABELS[updates.textbookSeries as TextbookSeries];
    }

    systemSettings = { ...systemSettings, ...updates };
    addAuditLog(
      'Cập nhật cấu hình hệ thống',
      req.authUser!.email,
      'admin',
      `Đã cập nhật chính sách hệ thống (${Object.keys(updates).join(', ') || 'không đổi'}).`,
      'warning'
    );
    res.json({ success: true, settings: systemSettings });
  });

  // Verifiable Parental Consent & Child Data Lifecycle
  app.get('/api/privacy/consent', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    if (req.authUser!.role === 'admin') {
      return res.json(consentRecords);
    }
    res.json(consentRecords.filter((c) => c.studentId === req.authUser!.id));
  });

  app.post('/api/privacy/consent/request', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const { guardianEmail, relationship = 'Phụ huynh' } = req.body;
    if (!guardianEmail || !String(guardianEmail).includes('@')) {
      return res.status(400).json({ error: 'Vui lòng nhập email hợp lệ của phụ huynh/người giám hộ.' });
    }
    const cleanEmail = String(guardianEmail).trim().toLowerCase();
    const code = String(crypto.randomInt(100000, 999999));
    consentOtpStore.set(req.authUser!.id, { code, expiresAt: Date.now() + 15 * 60 * 1000 });

    const existing = consentRecords.find((c) => c.studentId === req.authUser!.id);
    const record: ParentConsentRecord = existing || {
      id: `consent-${Date.now()}`,
      studentId: req.authUser!.id,
      studentName: req.authUser!.name,
      guardianEmail: cleanEmail,
      relationship: String(relationship).slice(0, 50),
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
    record.guardianEmail = cleanEmail;
    record.relationship = String(relationship).slice(0, 50);
    record.status = 'pending';
    record.requestedAt = new Date().toISOString();
    if (!existing) consentRecords.unshift(record);

    req.authUser!.guardianEmail = cleanEmail;
    addAuditLog(
      'Yêu cầu xác nhận phụ huynh',
      req.authUser!.email,
      req.authUser!.role,
      `Gửi mã xác nhận đồng ý phụ huynh tới ${cleanEmail}.`,
      'info'
    );

    res.json({
      success: true,
      consent: record,
      message:
        process.env.NODE_ENV !== 'production'
          ? `Đã tạo mã xác nhận phụ huynh gửi tới ${cleanEmail}. (Mã thử nghiệm: ${code})`
          : `Đã gửi mã xác nhận tới email phụ huynh ${cleanEmail}.`,
      devConsentOtpPreview: process.env.NODE_ENV !== 'production' ? code : undefined,
    });
  });

  app.post('/api/privacy/consent/verify', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const { otpCode } = req.body;
    const otpEntry = consentOtpStore.get(req.authUser!.id);
    if (!otpEntry || Date.now() > otpEntry.expiresAt || otpEntry.code !== String(otpCode || '').trim()) {
      return res.status(400).json({ error: 'Mã xác nhận phụ huynh không đúng hoặc đã hết hạn.' });
    }

    const record = consentRecords.find((c) => c.studentId === req.authUser!.id);
    if (!record) {
      return res.status(404).json({ error: 'Chưa có yêu cầu đồng ý phụ huynh nào.' });
    }
    record.status = 'verified';
    record.verifiedAt = new Date().toISOString();
    req.authUser!.parentalConsentVerified = true;
    consentOtpStore.delete(req.authUser!.id);

    addAuditLog(
      'Xác nhận đồng ý phụ huynh',
      req.authUser!.email,
      req.authUser!.role,
      `Phụ huynh (${record.guardianEmail}) đã xác thực đồng ý cho học sinh ${req.authUser!.name}.`,
      'success'
    );
    res.json({ success: true, consent: record, user: sanitizeUser(req.authUser!) });
  });

  app.get('/api/privacy/export-my-data', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const uid = req.authUser!.id;
    addAuditLog('Xuất dữ liệu cá nhân', req.authUser!.email, req.authUser!.role, 'Người dùng tải bản sao dữ liệu cá nhân.', 'info');
    res.json({
      exportedAt: new Date().toISOString(),
      policy: 'Nghị định 13/2023/NĐ-CP & Luật Trẻ em Việt Nam',
      user: sanitizeUser(req.authUser!),
      submissions: submissions.filter((s) => s.studentId === uid),
      learningProgress: learningProgress.filter((p) => p.studentId === uid),
      chatHistory: studentChatHistories.get(uid) || [],
      consentRecords: consentRecords.filter((c) => c.studentId === uid),
    });
  });

  app.delete('/api/privacy/student-data/:id', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    if (req.authUser!.role !== 'admin' && req.authUser!.id !== id) {
      return res.status(403).json({ error: 'Chỉ chủ tài khoản hoặc Quản trị viên mới có quyền xóa dữ liệu học sinh.' });
    }
    const target = users.find((u) => u.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Không tìm thấy học sinh cần xóa dữ liệu.' });
    }

    // Remove learning submissions, progress, chat history, consent records
    for (let i = submissions.length - 1; i >= 0; i--) {
      if (submissions[i].studentId === id) submissions.splice(i, 1);
    }
    for (let i = learningProgress.length - 1; i >= 0; i--) {
      if (learningProgress[i].studentId === id) learningProgress.splice(i, 1);
    }
    for (let i = consentRecords.length - 1; i >= 0; i--) {
      if (consentRecords[i].studentId === id) consentRecords.splice(i, 1);
    }
    studentChatHistories.delete(id);
    target.xp = 0;
    target.badges = [];
    target.teacherNote = undefined;
    target.guardianEmail = undefined;
    target.parentalConsentVerified = false;

    addAuditLog(
      'Xóa dữ liệu cá nhân trẻ em',
      req.authUser!.email,
      req.authUser!.role,
      `Đã xóa toàn bộ lịch sử học tập, chat AI và thông tin giám hộ của tài khoản ${target.email}.`,
      'warning'
    );
    res.json({ success: true, message: 'Đã xóa sạch dữ liệu học tập và hội thoại theo yêu cầu.' });
  });

  // ----------------- STUDENT PERFORMANCE DETAIL (STRICT IDOR CHECK) -----------------
  app.get('/api/students/:id/performance', authenticateRequest, requireRole('student', 'teacher', 'admin'), (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    if (req.authUser!.role === 'student' && req.authUser!.id !== id) {
      return res.status(403).json({ error: 'Học sinh chỉ có quyền xem hồ sơ học tập của chính mình.' });
    }
    if (req.authUser!.role === 'teacher') {
      const teacherOwnsStudent = classes.some(
        (c) => c.teacherId === req.authUser!.id && c.students.some((s) => s.id === id)
      );
      if (!teacherOwnsStudent) {
        return res.status(403).json({ error: 'Giáo viên chỉ được xem hồ sơ học sinh thuộc lớp mình phụ trách.' });
      }
    }

    const student = users.find((u) => u.id === id);
    const rosterStudent = classes.flatMap((c) => c.students).find((s) => s.id === id);

    if (!student && !rosterStudent) {
      return res.status(404).json({ error: 'Không tìm thấy học sinh' });
    }

    const studentSubmissions = submissions.filter((s) => s.studentId === id);
    const studentProgress = learningProgress.filter((p) => p.studentId === id);
    const avgScore =
      studentSubmissions.length > 0
        ? Number((studentSubmissions.reduce((a, b) => a + b.score, 0) / studentSubmissions.length).toFixed(1))
        : null;

    const totalStudySeconds =
      studentSubmissions.reduce((a, b) => a + (b.timeSpentSeconds || 0), 0) +
      studentProgress.reduce((a, b) => a + (b.timeSpentSeconds || 0), 0);

    const studentNodes = computeStudentKnowledgeNodes(id);
    const masteredNodes = studentNodes.filter((k) => k.status === 'mastered');
    const availableNodes = studentNodes.filter((k) => k.status === 'available');
    const studentGrade = student?.grade || 4;

    res.json({
      student: student ? sanitizeUser(student) : rosterStudent,
      totalSubmissions: studentSubmissions.length,
      completedLessonsCount: studentProgress.filter((p) => p.completed).length,
      totalStudyMinutes: Math.round(totalStudySeconds / 60),
      avgScore: avgScore ?? 0,
      hasSubmissions: studentSubmissions.length > 0,
      xp: student?.xp ?? rosterStudent?.xp ?? 0,
      streakDays: student?.streakDays ?? 0,
      badges: student?.badges ?? [],
      teacherNote: student?.teacherNote || '',
      masteredNodesCount: masteredNodes.length,
      inProgressNodesCount: availableNodes.length,
      recentSubmissions: studentSubmissions.slice(0, 8),
      recommendedNextLesson: lessons.find((l) => l.grade === studentGrade && isLessonVerified(l.status))?.title || 'Chưa có bài học gợi ý',
    });
  });

  app.put('/api/students/:id/teacher-note', authenticateRequest, requireApprovedStaff, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { note } = req.body;
    if (req.authUser!.role === 'teacher') {
      const owns = classes.some((c) => c.teacherId === req.authUser!.id && c.students.some((s) => s.id === id));
      if (!owns) {
        return res.status(403).json({ error: 'Giáo viên chỉ được ghi nhận xét cho học sinh trong lớp phụ trách.' });
      }
    }
    const target = users.find((u) => u.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản học sinh.' });
    }
    target.teacherNote = String(note || '').slice(0, 1000);
    addAuditLog('Cập nhật nhận xét học sinh', req.authUser!.email, req.authUser!.role, `Cập nhật nhận xét cho ${target.name}.`, 'info');
    res.json({ success: true, teacherNote: target.teacherNote });
  });

  // ----------------- CURRICULUM ROUTES -----------------
  app.get('/api/curriculum/subjects', (req: Request, res: Response) => {
    const grade = req.query.grade ? Number(req.query.grade) : null;
    if (grade) {
      return res.json(subjects.filter((s) => s.grades.includes(grade)));
    }
    res.json(subjects);
  });

  app.get('/api/curriculum/topics', (req: Request, res: Response) => {
    const { subjectId, grade, semester } = req.query;
    let list = topics;
    if (subjectId && subjectId !== 'all') list = list.filter((t) => t.subjectId === subjectId);
    if (grade) list = list.filter((t) => t.grade === Number(grade));
    if (semester) list = list.filter((t) => t.semester === Number(semester));
    res.json(list);
  });

  app.get('/api/curriculum/lessons', (req: Request, res: Response) => {
    const { subjectId, grade, status, search, lessonType, topicId, curriculum } = req.query;
    let list = lessons;
    if (subjectId && subjectId !== 'all') list = list.filter((l) => l.subjectId === subjectId);
    if (grade) list = list.filter((l) => l.grade === Number(grade));
    if (status && status !== 'all') list = list.filter((l) => l.status === status);
    if (lessonType && lessonType !== 'all') list = list.filter((l) => (l.lessonType || 'lesson') === lessonType);
    if (topicId && topicId !== 'all') list = list.filter((l) => l.topicId === topicId);
    if (curriculum && curriculum !== 'all') list = list.filter((l) => (l.curriculum || 'kntt') === curriculum);
    if (search) {
      const q = String(search).toLowerCase().trim();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.lessonCode.toLowerCase().includes(q) ||
          l.summary.toLowerCase().includes(q)
      );
    }
    res.json(list);
  });

  app.get('/api/curriculum/lessons/:id', (req: Request, res: Response) => {
    const lesson = lessons.find((l) => l.id === req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: 'Không tìm thấy bài học' });
    }
    res.json(lesson);
  });

  app.post('/api/curriculum/lessons', authenticateRequest, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
    const {
      title,
      subjectId,
      grade,
      summary,
      sourceBook,
      docNumber,
      coreKnowledge,
      objectives,
      status,
      curriculum,
      chapter,
      lessonType,
      estimatedDuration,
      workedExamples,
      subjectModules,
    } = req.body;
    if (!title || !subjectId || !grade) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tên bài học, môn học và khối lớp.' });
    }
    const safeStatus = status === 'DRAFT' || status === 'NEEDS_REVIEW' ? status : 'NEEDS_REVIEW';
    const newLesson: Lesson = {
      id: `lesson-${Date.now()}`,
      topicId: `topic-${subjectId}-g${grade}-1`,
      subjectId: String(subjectId),
      grade: Math.min(5, Math.max(1, Number(grade))),
      semester: 1,
      title: String(title).trim(),
      lessonCode: `${String(subjectId).toUpperCase().slice(0, 4)}${grade}-${String(lessons.length + 1).padStart(2, '0')}`,
      order: lessons.length + 1,
      curriculum: (curriculum as TextbookSeries) || systemSettings.textbookSeries || 'kntt',
      chapter: chapter ? String(chapter) : undefined,
      lessonType: lessonType || 'lesson',
      estimatedDuration: Number(estimatedDuration) || 15,
      sourceBook: sourceBook || `${systemSettings.textbookSeriesLabel || 'Kết nối tri thức với cuộc sống'} (Chờ đối chiếu)`,
      objectives: Array.isArray(objectives) && objectives.length ? objectives : ['Hoàn thành mục tiêu bài học theo CTGDPT 2018.'],
      coreKnowledge: Array.isArray(coreKnowledge) && coreKnowledge.length ? coreKnowledge : [summary || title],
      termsAndDefinitions: [],
      illustrations: [],
      commonMisconceptions: [],
      workedExamples: Array.isArray(workedExamples) ? workedExamples : undefined,
      subjectModules: subjectModules && typeof subjectModules === 'object' ? subjectModules : undefined,
      summary: String(summary || title),
      officialReference: {
        docNumber: docNumber || 'Chờ đối chiếu văn bản/SGK',
        issueDate: new Date().toISOString().slice(0, 10),
        curriculumVersion: 'GDPT-2018',
      },
      dataSource: 'teacher_authored',
      status: safeStatus,
    };
    lessons.unshift(newLesson);
    ragEngine.seedFromLessons([newLesson]);
    addAuditLog('Tạo bài học mới', req.authUser!.email, 'admin', `Tạo bài "${newLesson.title}" (${safeStatus}).`, 'info');
    res.status(201).json({ success: true, lesson: newLesson });
  });

  app.put('/api/curriculum/lessons/:id', authenticateRequest, requireApprovedStaff, (req: AuthenticatedRequest, res: Response) => {
    const lessonIndex = lessons.findIndex((l) => l.id === req.params.id);
    if (lessonIndex === -1) {
      return res.status(404).json({ error: 'Bài học không tồn tại' });
    }
    const existing = lessons[lessonIndex];
    const updatableFields = [
      'title',
      'summary',
      'chapter',
      'curriculum',
      'lessonType',
      'estimatedDuration',
      'sourceBook',
      'objectives',
      'coreKnowledge',
      'workedExamples',
      'subjectModules',
    ] as const;
    for (const key of updatableFields) {
      if (req.body[key] !== undefined) {
        (existing as any)[key] = req.body[key];
      }
    }
    ragEngine.seedFromLessons([existing]);
    addAuditLog('Cập nhật nội dung bài học', req.authUser!.email, req.authUser!.role, `Chỉnh sửa bài "${existing.title}".`, 'info');
    res.json({ success: true, lesson: existing });
  });

  app.put('/api/curriculum/lessons/:id/status', authenticateRequest, requireRole('admin'), (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['verified', 'pending', 'unverified', 'ai_draft', 'DRAFT', 'NEEDS_REVIEW', 'VERIFIED', 'APPROVED', 'PUBLISHED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Trạng thái bài học không hợp lệ.' });
    }
    const lessonIndex = lessons.findIndex((l) => l.id === id);
    if (lessonIndex === -1) {
      return res.status(404).json({ error: 'Bài học không tồn tại' });
    }
    lessons[lessonIndex].status = status;
    ragEngine.updateDocumentStatus(lessons[lessonIndex].id, status);
    addAuditLog(
      'Thẩm định bài học',
      req.authUser!.email,
      'admin',
      `Đổi trạng thái bài học "${lessons[lessonIndex].title}" thành "${status}"`,
      'success'
    );
    res.json({ success: true, lesson: lessons[lessonIndex] });
  });

  // ----------------- EXERCISES & SUBMISSIONS -----------------
  function evaluateQuestionDeterministic(q: Question, studentAns: any): boolean {
    if (q.type === 'single_choice' || q.type === 'scenario') {
      if (Array.isArray(q.options) && typeof q.correctAnswer === 'number') {
        return studentAns !== undefined && studentAns !== null && studentAns !== '' && Number(studentAns) === Number(q.correctAnswer);
      }
      const cleanStudent = String(studentAns || '').trim().toLowerCase();
      const cleanCorrect = String(q.correctAnswer || '').trim().toLowerCase();
      return cleanStudent.length > 0 && cleanStudent === cleanCorrect;
    }
    if (q.type === 'multi_choice') {
      if (Array.isArray(studentAns) && Array.isArray(q.correctAnswer)) {
        const sSorted = [...studentAns].map(Number).sort((a, b) => a - b);
        const cSorted = [...q.correctAnswer].map(Number).sort((a, b) => a - b);
        return sSorted.length === cSorted.length && sSorted.every((v, idx) => v === cSorted[idx]);
      }
      return false;
    }
    if (q.type === 'true_false') {
      return typeof studentAns === 'boolean' && studentAns === Boolean(q.correctAnswer);
    }
    if (q.type === 'fill_blank' || q.type === 'step_math' || q.type === 'short_answer') {
      const cleanStudent = String(studentAns || '').trim().toLowerCase().replace(/\s+/g, '');
      const cleanCorrect = String(q.correctAnswer || '').trim().toLowerCase().replace(/\s+/g, '');
      return cleanStudent.length > 0 && cleanStudent === cleanCorrect;
    }
    if (q.type === 'matching' || q.type === 'drag_drop') {
      if (typeof studentAns === 'object' && studentAns !== null && typeof q.correctAnswer === 'object' && q.correctAnswer !== null) {
        const correctMap = q.correctAnswer as Record<string, string>;
        const keys = Object.keys(correctMap);
        return keys.length > 0 && keys.every((key) => String(studentAns[key] || '').trim() === String(correctMap[key]).trim());
      }
      return false;
    }
    if (q.type === 'ordering') {
      const expected = Array.isArray(q.correctAnswer) ? q.correctAnswer : q.items;
      if (Array.isArray(studentAns) && Array.isArray(expected) && expected.length > 0) {
        return studentAns.length === expected.length && expected.every((v, idx) => String(studentAns[idx] || '').trim() === String(v).trim());
      }
      return false;
    }
    return false;
  }

  app.get('/api/exercises', (req: Request, res: Response) => {
    const { subjectId, grade, lessonId, kind } = req.query;
    let list = exercises;
    if (subjectId && subjectId !== 'all') list = list.filter((e) => e.subjectId === subjectId);
    if (grade) list = list.filter((e) => e.grade === Number(grade));
    if (lessonId) list = list.filter((e) => e.lessonId === lessonId);
    if (kind && kind !== 'all') list = list.filter((e) => (e.kind || 'practice') === kind);
    res.json(list);
  });

  app.get('/api/exercises/:id', (req: Request, res: Response) => {
    const exercise = exercises.find((e) => e.id === req.params.id);
    if (!exercise) {
      return res.status(404).json({ error: 'Không tìm thấy bài tập' });
    }
    res.json(exercise);
  });

  app.post('/api/exercises', authenticateRequest, requireApprovedStaff, (req: AuthenticatedRequest, res: Response) => {
    const { title, subjectId, grade, durationMinutes = 15, questions, lessonId, topicId, kind } = req.body;
    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Bộ bài tập cần có tiêu đề và ít nhất 1 câu hỏi.' });
    }

    // Duplicate question guard
    const seenTexts = new Set<string>();
    const dedupedQuestions = questions
      .filter((q: any) => {
        const key = String(q.questionText || '').trim().toLowerCase();
        if (!key || seenTexts.has(key)) return false;
        seenTexts.add(key);
        return true;
      })
      .map((q: any, idx: number) => ({
        id: q.id || `q-custom-${Date.now()}-${idx}`,
        lessonId: q.lessonId || lessonId || '',
        subjectId: String(subjectId || 'toan'),
        grade: Number(grade) || 4,
        type: q.type || 'single_choice',
        difficulty: q.difficulty || 'thong_hieu',
        points: Number(q.points) || 1,
        questionText: String(q.questionText).trim(),
        options: Array.isArray(q.options) ? q.options : undefined,
        pairs: Array.isArray(q.pairs) ? q.pairs : undefined,
        items: Array.isArray(q.items) ? q.items : undefined,
        dragItems: Array.isArray(q.dragItems) ? q.dragItems : undefined,
        dropZones: Array.isArray(q.dropZones) ? q.dropZones : undefined,
        rubricCriteria: Array.isArray(q.rubricCriteria) ? q.rubricCriteria : undefined,
        correctAnswer: q.correctAnswer ?? '',
        explanation: q.explanation || 'Giáo viên biên soạn.',
        pedagogicalHint: q.pedagogicalHint || 'Hãy đọc kỹ đề bài trước khi trả lời nhé!',
      }));

    const newExercise: ExerciseSet = {
      id: `ex-custom-${Date.now()}`,
      title: String(title).trim(),
      subjectId: String(subjectId || 'toan'),
      grade: Math.min(5, Math.max(1, Number(grade) || 4)),
      lessonId: lessonId ? String(lessonId) : undefined,
      topicId: topicId ? String(topicId) : undefined,
      kind: kind || 'practice',
      createdBy: req.authUser!.id,
      questions: dedupedQuestions,
      durationMinutes: Math.max(5, Number(durationMinutes) || 15),
      totalPoints: 10,
    };

    exercises.unshift(newExercise);
    addAuditLog('Tạo bộ bài tập', req.authUser!.email, req.authUser!.role, `Tạo bộ bài tập "${newExercise.title}" (${dedupedQuestions.length} câu).`, 'success');
    res.status(201).json({ success: true, exercise: newExercise });
  });

  app.post('/api/exercises/submit', authenticateRequest, requireRole('student', 'teacher', 'admin'), (req: AuthenticatedRequest, res: Response) => {
    const { exerciseSetId, grade, answers, timeSpentSeconds, assignmentId } = req.body;
    if (!exerciseSetId || !answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Dữ liệu bài nộp không hợp lệ.' });
    }

    const exercise = exercises.find((e) => e.id === exerciseSetId);
    if (!exercise) {
      return res.status(404).json({ error: 'Bài tập không hợp lệ' });
    }

    const actualStudentId = req.authUser!.id;
    const actualStudentName = req.authUser!.name;

    // Prevent tampering if an assignment submission already has status 'graded'
    if (assignmentId) {
      const gradedExists = submissions.some(
        (s) => s.assignmentId === assignmentId && s.studentId === actualStudentId && s.status === 'graded'
      );
      if (gradedExists && req.authUser!.role === 'student') {
        return res.status(403).json({ error: 'Bài tập này đã được giáo viên chấm điểm khóa sổ, không thể tự sửa kết quả.' });
      }
    }

    let totalCorrect = 0;
    let autoGradedQuestions = 0;
    let earnedAutoPoints = 0;
    let totalAutoPoints = 0;
    let essayCount = 0;
    const wrongQuestionIds: string[] = [];
    const misconceptionTags: string[] = [];

    let userWrongMap = wrongQuestionStatsStore.get(actualStudentId);
    if (!userWrongMap) {
      userWrongMap = new Map<string, WrongQuestionStat>();
      wrongQuestionStatsStore.set(actualStudentId, userWrongMap);
    }

    exercise.questions.forEach((q) => {
      const studentAns = answers[q.id];
      const qPoints = Number(q.points) || 1;

      if (q.type === 'essay') {
        // Essay questions are NEVER auto-scored arbitrarily; deferred to teacher rubric review
        essayCount += 1;
        return;
      }

      autoGradedQuestions += 1;
      totalAutoPoints += qPoints;
      const isCorrect = evaluateQuestionDeterministic(q, studentAns);

      const statKey = `${exercise.id}:${q.id}`;
      const existingStat = userWrongMap!.get(statKey);
      const linkedLesson = lessons.find((l) => l.id === (q.lessonId || exercise.lessonId));

      if (isCorrect) {
        totalCorrect += 1;
        earnedAutoPoints += qPoints;
        if (existingStat) {
          existingStat.attemptCount += 1;
        }
      } else {
        wrongQuestionIds.push(q.id);
        misconceptionTags.push(
          q.difficulty === 'van_dung' || q.difficulty === 'van_dung_cao'
            ? `Vận dụng quy tắc: ${q.pedagogicalHint}`
            : `Khái niệm cơ bản: ${q.pedagogicalHint}`
        );
        userWrongMap!.set(statKey, {
          questionId: q.id,
          exerciseSetId: exercise.id,
          exerciseTitle: exercise.title,
          lessonId: q.lessonId || exercise.lessonId || '',
          lessonTitle: linkedLesson?.title,
          subjectId: q.subjectId || exercise.subjectId,
          grade: q.grade || exercise.grade,
          questionText: q.questionText,
          wrongCount: (existingStat?.wrongCount || 0) + 1,
          attemptCount: (existingStat?.attemptCount || 0) + 1,
          lastWrongAt: new Date().toISOString(),
        });
      }
    });

    const totalQuestions = exercise.questions.length;
    const hasEssay = essayCount > 0;
    const score =
      autoGradedQuestions > 0 && totalAutoPoints > 0
        ? Number(((earnedAutoPoints / totalAutoPoints) * 10).toFixed(1))
        : hasEssay
        ? 0
        : 10;

    // Server-computed XP strictly derived from verified deterministic correctness
    const xpEarned = totalCorrect * 20 + (autoGradedQuestions > 0 ? 20 : 15);

    const student = users.find((u) => u.id === actualStudentId);
    if (student) {
      student.xp = (student.xp || 0) + xpEarned;
      for (const cls of classes) {
        const member = cls.students.find((s) => s.id === actualStudentId);
        if (member) member.xp = student.xp;
      }
    }

    if (assignmentId) {
      const alreadySubmitted = submissions.some(
        (s) => s.assignmentId === assignmentId && s.studentId === actualStudentId
      );
      const assign = assignments.find((a) => a.id === assignmentId);
      if (assign && !alreadySubmitted && assign.completedCount < assign.totalStudents) {
        assign.completedCount += 1;
      }
    }

    const priorAttempts = submissions.filter(
      (s) => s.studentId === actualStudentId && s.exerciseSetId === exerciseSetId
    ).length;

    let feedback = 'Làm bài rất tốt!';
    if (hasEssay && autoGradedQuestions === 0) {
      feedback = 'Đã nộp bài tự luận thành công. Thầy/cô giáo sẽ chấm theo tiêu chí đánh giá và phản hồi cho em.';
    } else if (hasEssay) {
      feedback = `Đã chấm ${totalCorrect}/${autoGradedQuestions} câu trắc nghiệm/tương tác (${score}/10). Phần tự luận đang chờ thầy/cô giáo chấm theo tiêu chí.`;
    } else if (score === 10) {
      feedback = 'Tuyệt đối 10/10! Em đã nắm rất vững kiến thức bài học này.';
    } else if (score >= 8) {
      feedback = `Khá xuất sắc (${score}/10)! Em hãy xem lại giải thích các câu còn nhầm nhé.`;
    } else if (score >= 5) {
      feedback = `Cố gắng lắm (${score}/10)! Hãy ôn lại phần bài giảng gợi ý bên dưới rồi làm lại nhé.`;
    } else {
      feedback = `Không sao cả (${score}/10), hãy đọc lại bài giảng gợi ý và thử làm lại từng bước một.`;
    }

    const submission: StudentSubmission = {
      id: `sub-${Date.now()}`,
      assignmentId,
      exerciseSetId,
      studentId: actualStudentId,
      studentName: actualStudentName,
      grade: Number(grade) || exercise.grade,
      answers,
      score,
      totalCorrect,
      totalQuestions,
      autoGradedQuestions,
      pendingEssayReview: hasEssay,
      wrongQuestionIds,
      attemptNumber: priorAttempts + 1,
      completedAt: new Date().toISOString(),
      timeSpentSeconds: Math.min(7200, Math.max(5, Number(timeSpentSeconds) || 60)),
      feedback,
      status: hasEssay ? 'submitted' : 'graded',
      misconceptionTags,
    };

    submissions.unshift(submission);
    const recommendedLessonIds = Array.from(
      new Set(
        exercise.questions
          .filter((q) => wrongQuestionIds.includes(q.id))
          .map((q) => q.lessonId || exercise.lessonId || '')
          .filter(Boolean)
      )
    );
    const recommendedReviewLessons = recommendedLessonIds
      .map((lid) => lessons.find((l) => l.id === lid))
      .filter((l): l is Lesson => Boolean(l))
      .map((l) => ({ id: l.id, title: l.title, subjectId: l.subjectId, grade: l.grade }));

    addAuditLog(
      'Nộp bài tập',
      req.authUser!.email,
      req.authUser!.role,
      `Hoàn thành bài tập "${exercise.title}" (Lần ${submission.attemptNumber}) - Điểm tự động: ${score}/10, nhận +${xpEarned} XP.`,
      'success'
    );

    res.json({
      success: true,
      submission,
      xpEarned,
      updatedXp: student?.xp,
      recommendedReviewLessons,
    });
  });

  app.put('/api/submissions/:id/grade', authenticateRequest, requireApprovedStaff, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { score, teacherFeedback } = req.body;
    const sub = submissions.find((s) => s.id === id);
    if (!sub) {
      return res.status(404).json({ error: 'Không tìm thấy bài nộp.' });
    }
    if (req.authUser!.role === 'teacher') {
      const owns = classes.some(
        (c) => c.teacherId === req.authUser!.id && c.students.some((s) => s.id === sub.studentId)
      );
      if (!owns) {
        return res.status(403).json({ error: 'Giáo viên chỉ được chấm bài của học sinh thuộc lớp mình phụ trách.' });
      }
    }
    if (score !== undefined) {
      const numScore = Number(score);
      if (Number.isNaN(numScore) || numScore < 0 || numScore > 10) {
        return res.status(400).json({ error: 'Điểm số phải nằm trong khoảng từ 0 đến 10.' });
      }
      sub.score = Number(numScore.toFixed(1));
    }
    if (teacherFeedback !== undefined) {
      sub.teacherFeedback = String(teacherFeedback).slice(0, 1500);
    }
    sub.status = 'graded';
    sub.gradedBy = req.authUser!.name;
    sub.gradedAt = new Date().toISOString();

    addAuditLog(
      'Giáo viên chấm và nhận xét bài',
      req.authUser!.email,
      req.authUser!.role,
      `Chấm bài ${sub.id} của ${sub.studentName}: ${sub.score}/10.`,
      'success'
    );
    res.json({ success: true, submission: sub });
  });

  // ----------------- CLASS & ASSIGNMENTS ROUTES (STRICT OWNERSHIP) -----------------
  app.get('/api/classes', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const role = req.authUser!.role;
    if (role === 'admin') {
      return res.json(classes);
    }
    if (role === 'teacher') {
      return res.json(classes.filter((c) => c.teacherId === req.authUser!.id));
    }
    return res.json(classes.filter((c) => c.students.some((s) => s.id === req.authUser!.id)));
  });

  app.post('/api/classes', authenticateRequest, requireApprovedStaff, (req: AuthenticatedRequest, res: Response) => {
    const { name, grade, academicYear } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập tên lớp học.' });
    }
    const numericGrade = Math.min(5, Math.max(1, Number(grade) || 4));
    const newClass: ClassRoom = {
      id: `class-${Date.now()}`,
      code: `EDU-${numericGrade}${String.fromCharCode(65 + Math.floor(Math.random() * 4))}${Math.floor(Math.random() * 9 + 1)}`,
      name: String(name).trim().slice(0, 100),
      grade: numericGrade,
      teacherId: req.authUser!.id,
      teacherName: req.authUser!.name,
      studentCount: 0,
      academicYear: academicYear || academicYears.find((y) => y.isActive)?.name || '2025 - 2026',
      students: [],
    };
    classes.unshift(newClass);
    addAuditLog('Tạo lớp học', req.authUser!.email, req.authUser!.role, `Đã tạo lớp ${newClass.name} (Mã: ${newClass.code})`, 'success');
    res.status(201).json({ success: true, class: newClass });
  });

  app.post('/api/classes/join', authenticateRequest, requireRole('student', 'teacher', 'admin'), (req: AuthenticatedRequest, res: Response) => {
    const { code, classId, studentId, studentEmail } = req.body;
    const targetClass = classes.find(
      (c) => (classId && c.id === classId) || (code && c.code.toUpperCase() === String(code).trim().toUpperCase())
    );
    if (!targetClass) {
      return res.status(404).json({ error: 'Mã lớp hoặc lớp học không hợp lệ.' });
    }

    if (req.authUser!.role === 'teacher') {
      if (req.authUser!.teacherApprovalStatus && req.authUser!.teacherApprovalStatus !== 'approved') {
        return res.status(403).json({ error: 'Tài khoản giáo viên chưa được duyệt.' });
      }
      if (targetClass.teacherId !== req.authUser!.id) {
        return res.status(403).json({ error: 'Bạn chỉ được thêm học sinh vào lớp do mình phụ trách.' });
      }
    }

    let targetStudent: User | undefined;
    if (req.authUser!.role === 'student') {
      targetStudent = req.authUser!;
    } else if (studentId) {
      targetStudent = users.find((u) => u.id === studentId && u.role === 'student');
    } else if (studentEmail) {
      targetStudent = users.find((u) => u.email.toLowerCase() === String(studentEmail).trim().toLowerCase() && u.role === 'student');
    }

    if (!targetStudent) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản học sinh để thêm vào lớp.' });
    }

    const alreadyIn = targetClass.students.some((s) => s.id === targetStudent!.id);
    if (!alreadyIn) {
      targetClass.students.push({
        id: targetStudent.id,
        name: targetStudent.name,
        email: targetStudent.email,
        xp: targetStudent.xp || 100,
        progress: 0,
      });
      targetClass.studentCount = Math.max(targetClass.studentCount, targetClass.students.length);
      addAuditLog(
        'Thêm học sinh vào lớp',
        req.authUser!.email,
        req.authUser!.role,
        `Học sinh ${targetStudent.name} đã tham gia lớp ${targetClass.name}.`,
        'info'
      );
    }

    res.json({ success: true, class: targetClass });
  });

  app.put('/api/classes/:id/materials', authenticateRequest, requireApprovedStaff, (req: AuthenticatedRequest, res: Response) => {
    const targetClass = classes.find((c) => c.id === req.params.id);
    if (!targetClass) {
      return res.status(404).json({ error: 'Không tìm thấy lớp học.' });
    }
    if (req.authUser!.role === 'teacher' && targetClass.teacherId !== req.authUser!.id) {
      return res.status(403).json({ error: 'Bạn chỉ được quản lý học liệu của lớp mình phụ trách.' });
    }
    const { assignedLessonIds, textbookSeries } = req.body;
    if (Array.isArray(assignedLessonIds)) {
      const validLessonIds = assignedLessonIds
        .map(String)
        .filter((lid) => lessons.some((l) => l.id === lid));
      targetClass.assignedLessonIds = Array.from(new Set(validLessonIds));
    }
    if (textbookSeries && TEXTBOOK_SERIES_LABELS[textbookSeries as TextbookSeries]) {
      targetClass.textbookSeries = textbookSeries as TextbookSeries;
    }
    addAuditLog(
      'Cập nhật học liệu lớp học',
      req.authUser!.email,
      req.authUser!.role,
      `Gán ${targetClass.assignedLessonIds?.length || 0} bài học cho lớp ${targetClass.name}.`,
      'info'
    );
    res.json({ success: true, class: targetClass });
  });

  app.get('/api/assignments', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const { classId, grade } = req.query;
    let list = assignments;
    if (req.authUser!.role === 'teacher') {
      const ownedClassIds = new Set(classes.filter((c) => c.teacherId === req.authUser!.id).map((c) => c.id));
      list = list.filter((a) => a.teacherId === req.authUser!.id || ownedClassIds.has(a.classId));
    } else if (req.authUser!.role === 'student') {
      const enrolledIds = new Set(
        classes.filter((c) => c.students.some((s) => s.id === req.authUser!.id)).map((c) => c.id)
      );
      list = list.filter((a) => {
        const matchClassOrGrade = enrolledIds.has(a.classId) || a.grade === (req.authUser!.grade || 4);
        const matchTarget = !a.targetStudentIds?.length || a.targetStudentIds.includes(req.authUser!.id);
        return matchClassOrGrade && matchTarget;
      });
    }
    if (classId) list = list.filter((a) => a.classId === classId);
    if (grade) list = list.filter((a) => a.grade === Number(grade));
    res.json(list);
  });

  app.post('/api/assignments', authenticateRequest, requireApprovedStaff, (req: AuthenticatedRequest, res: Response) => {
    const { classId, exerciseSetId, title, deadline, targetStudentIds } = req.body;
    const targetClass = classes.find((c) => c.id === classId);
    const exercise = exercises.find((e) => e.id === exerciseSetId);

    if (!targetClass || !exercise) {
      return res.status(400).json({ error: 'Thông tin lớp hoặc bộ bài tập không hợp lệ' });
    }
    if (req.authUser!.role === 'teacher' && targetClass.teacherId !== req.authUser!.id) {
      return res.status(403).json({ error: 'Bạn không thể giao bài tập cho lớp không thuộc quyền quản lý của mình.' });
    }

    const targets = Array.isArray(targetStudentIds) && targetStudentIds.length > 0 ? targetStudentIds.map(String) : undefined;
    const newAssignment: Assignment = {
      id: `assign-${Date.now()}`,
      classId: targetClass.id,
      className: targetClass.name,
      teacherId: req.authUser!.id,
      targetStudentIds: targets,
      exerciseSetId: exercise.id,
      title: title || exercise.title,
      subjectId: exercise.subjectId,
      grade: exercise.grade,
      deadline: deadline || new Date(Date.now() + 7 * 86400000).toISOString(),
      assignedBy: req.authUser!.name,
      maxAttempts: 3,
      status: 'active',
      completedCount: 0,
      totalStudents: targets ? targets.length : targetClass.studentCount,
    };

    assignments.unshift(newAssignment);
    addAuditLog('Giao bài tập', req.authUser!.email, req.authUser!.role, `Giao bài "${newAssignment.title}" cho lớp ${targetClass.name}`, 'info');
    res.status(201).json({ success: true, assignment: newAssignment });
  });

  app.get('/api/submissions', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const { studentId, assignmentId } = req.query;
    let list = submissions;
    if (req.authUser!.role === 'student') {
      list = list.filter((s) => s.studentId === req.authUser!.id);
    } else if (req.authUser!.role === 'teacher') {
      const studentIdsInOwnedClasses = new Set(
        classes.filter((c) => c.teacherId === req.authUser!.id).flatMap((c) => c.students.map((s) => s.id))
      );
      list = list.filter((s) => studentIdsInOwnedClasses.has(s.studentId));
      if (studentId) list = list.filter((s) => s.studentId === studentId);
    } else if (studentId) {
      list = list.filter((s) => s.studentId === studentId);
    }
    if (assignmentId) list = list.filter((s) => s.assignmentId === assignmentId);
    res.json(list);
  });

  // Wrong-question analytics & recommended review lessons (role-scoped)
  app.get('/api/analytics/wrong-questions', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const aggregated = new Map<string, WrongQuestionStat>();
    const allowedStudentIds = new Set<string>();

    if (req.authUser!.role === 'student') {
      allowedStudentIds.add(req.authUser!.id);
    } else if (req.authUser!.role === 'teacher') {
      classes
        .filter((c) => c.teacherId === req.authUser!.id)
        .forEach((c) => c.students.forEach((s) => allowedStudentIds.add(s.id)));
    } else if (req.authUser!.role === 'admin') {
      wrongQuestionStatsStore.forEach((_val, sid) => allowedStudentIds.add(sid));
    }

    for (const sid of allowedStudentIds) {
      const m = wrongQuestionStatsStore.get(sid);
      if (!m) continue;
      for (const [k, stat] of m.entries()) {
        const cur = aggregated.get(k);
        if (!cur) {
          aggregated.set(k, { ...stat });
        } else {
          cur.wrongCount += stat.wrongCount;
          cur.attemptCount += stat.attemptCount;
          if (stat.lastWrongAt > cur.lastWrongAt) cur.lastWrongAt = stat.lastWrongAt;
        }
      }
    }

    const wrongQuestions = Array.from(aggregated.values())
      .sort((a, b) => b.wrongCount - a.wrongCount)
      .slice(0, 12);

    const recommendedLessonIds = Array.from(
      new Set(wrongQuestions.map((w) => w.lessonId).filter(Boolean))
    );
    const recommendedLessons = recommendedLessonIds
      .map((lid) => lessons.find((l) => l.id === lid))
      .filter((l): l is Lesson => Boolean(l))
      .map((l) => ({
        id: l.id,
        title: l.title,
        subjectId: l.subjectId,
        grade: l.grade,
        estimatedDuration: l.estimatedDuration || 15,
      }));

    res.json({ wrongQuestions, recommendedLessons });
  });

  // ----------------- AI DRAFTS & CONTENT REVIEW (WITH VERSION HISTORY) -----------------
  app.get('/api/ai/drafts', authenticateRequest, requireApprovedStaff, (req: AuthenticatedRequest, res: Response) => {
    if (req.authUser!.role === 'admin') return res.json(aiDrafts);
    res.json(aiDrafts.filter((d) => !d.authorId || d.authorId === req.authUser!.id));
  });

  app.put('/api/ai/drafts/:id/review', authenticateRequest, requireApprovedStaff, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status, teacherNotes, editedContent } = req.body;
    if (!['draft', 'approved', 'rejected', 'published'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái kiểm duyệt không hợp lệ.' });
    }
    const draft = aiDrafts.find((d) => d.id === id);
    if (!draft) {
      return res.status(404).json({ error: 'Bản nháp không tồn tại' });
    }
    if (status === 'rejected' && (!teacherNotes || !String(teacherNotes).trim())) {
      return res.status(400).json({ error: 'Vui lòng ghi rõ lý do từ chối để lưu lịch sử kiểm duyệt.' });
    }

    draft.status = status;
    if (teacherNotes !== undefined) draft.teacherNotes = String(teacherNotes);
    if (editedContent !== undefined) draft.content = editedContent;

    const prevHistory = draft.reviewHistory || [];
    draft.reviewHistory = [
      {
        version: prevHistory.length + 1,
        status,
        reviewer: req.authUser!.name,
        notes: teacherNotes ? String(teacherNotes) : undefined,
        reviewedAt: new Date().toISOString(),
      },
      ...prevHistory,
    ];

    addAuditLog(
      'Kiểm duyệt nội dung AI',
      req.authUser!.email,
      req.authUser!.role,
      `Cập nhật trạng thái "${status}" (phiên bản v${draft.reviewHistory.length}) cho "${draft.title}"`,
      status === 'rejected' ? 'warning' : 'success'
    );
    res.json({ success: true, draft });
  });

  app.post('/api/ai/drafts/:id/publish-to-curriculum', authenticateRequest, requireApprovedStaff, (req: AuthenticatedRequest, res: Response) => {
    const draft = aiDrafts.find((d) => d.id === req.params.id);
    if (!draft) {
      return res.status(404).json({ error: 'Bản nháp không tồn tại' });
    }
    const rawText =
      typeof draft.content?.text === 'string'
        ? draft.content.text
        : typeof draft.content?.analysis === 'string'
        ? draft.content.analysis
        : JSON.stringify(draft.content || {});

    const publishedStatus = req.authUser!.role === 'admin' ? 'verified' : 'NEEDS_REVIEW';
    const newLesson: Lesson = {
      id: `lesson-ai-${Date.now()}`,
      topicId: `topic-${draft.subjectId}-g${draft.grade}-1`,
      subjectId: draft.subjectId || 'toan',
      grade: Math.min(5, Math.max(1, Number(draft.grade) || 4)),
      semester: 1,
      title: draft.title.replace(/^Kế hoạch bài dạy:\s*/i, '').trim(),
      lessonCode: `${String(draft.subjectId || 'TOAN').toUpperCase().slice(0, 4)}${draft.grade}-GV-${String(lessons.length + 1).padStart(2, '0')}`,
      order: lessons.length + 1,
      curriculum: systemSettings.textbookSeries || 'kntt',
      lessonType: draft.type === 'quiz_matrix' ? 'review' : 'lesson',
      estimatedDuration: 18,
      sourceBook: `Biên soạn bởi ${req.authUser!.name} (${systemSettings.textbookSeriesLabel || 'Kết nối tri thức với cuộc sống'})`,
      objectives: [
        draft.content?.objectives
          ? String(draft.content.objectives)
          : `Nắm vững nội dung trọng tâm của bài "${draft.title}".`,
      ],
      coreKnowledge: String(rawText)
        .split('\n')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 12)
        .slice(0, 5),
      termsAndDefinitions: [],
      illustrations: [],
      commonMisconceptions: [],
      summary: rawText.slice(0, 220) + (rawText.length > 220 ? '...' : ''),
      officialReference: {
        docNumber: 'Học liệu giáo viên kiểm duyệt',
        issueDate: new Date().toISOString().slice(0, 10),
        curriculumVersion: 'CTGDPT-2018',
      },
      dataSource: 'ai_generated',
      sourceVerificationNote: `Chuyển từ bản nháp giáo viên ${req.authUser!.name} kiểm duyệt (${publishedStatus}).`,
      status: publishedStatus,
      interactiveContent: {
        sections: [
          {
            title: 'Nội dung học tập do Giáo viên kiểm duyệt',
            content: rawText.slice(0, 2000),
          },
        ],
      },
    };

    lessons.unshift(newLesson);
    ragEngine.seedFromLessons([newLesson]);
    draft.status = 'published';
    draft.reviewHistory = [
      {
        version: (draft.reviewHistory?.length || 0) + 1,
        status: 'published',
        reviewer: req.authUser!.name,
        notes: `Xuất bản thành bài học mã ${newLesson.lessonCode}`,
        reviewedAt: new Date().toISOString(),
      },
      ...(draft.reviewHistory || []),
    ];

    addAuditLog(
      'Xuất bản học liệu từ bản nháp AI',
      req.authUser!.email,
      req.authUser!.role,
      `Đã đưa "${newLesson.title}" vào kho học liệu (${publishedStatus}).`,
      'success'
    );
    res.status(201).json({ success: true, draft, lesson: newLesson });
  });

  // ----------------- RAG DOCUMENT INGESTION & RETRIEVAL API -----------------
  app.get('/api/rag/documents', authenticateRequest, requireApprovedStaff, (_req: Request, res: Response) => {
    res.json(ragEngine.listDocuments());
  });

  app.post('/api/rag/documents', authenticateRequest, requireApprovedStaff, (req: AuthenticatedRequest, res: Response) => {
    const { title, grade = 4, subjectId = 'toan', sourceRef, rawText } = req.body;
    if (!title || !sourceRef || !rawText) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tiêu đề, nguồn trích dẫn và nội dung tài liệu.' });
    }
    try {
      const result = ragEngine.ingestDocument({
        title: String(title),
        grade: Number(grade),
        subjectId: String(subjectId),
        sourceRef: String(sourceRef),
        status: req.authUser!.role === 'admin' ? 'VERIFIED' : 'NEEDS_REVIEW',
        rawText: String(rawText),
      });
      addAuditLog(
        'Nạp tài liệu RAG',
        req.authUser!.email,
        req.authUser!.role,
        `Đã trích xuất và chia ${result.chunksAdded} phân đoạn cho tài liệu "${result.summary.title}".`,
        'success'
      );
      res.status(201).json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Không thể xử lý tài liệu RAG.' });
    }
  });

  app.post('/api/rag/query', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const { query, grade, subjectId, onlyVerified = true } = req.body;
    if (!query || !String(query).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập từ khóa truy vấn RAG.' });
    }
    const retrieval = ragEngine.retrieveContext({
      query: String(query),
      grade: grade ? Number(grade) : undefined,
      subjectId: subjectId ? String(subjectId) : undefined,
      onlyVerified: Boolean(onlyVerified),
    });
    res.json(retrieval);
  });

  // ----------------- AUDIT LOGS -----------------
  app.get('/api/audit-logs', authenticateRequest, requireRole('admin'), (req: Request, res: Response) => {
    const { search, status } = req.query;
    let list = auditLogs;
    if (status && status !== 'all') list = list.filter((l) => l.status === status);
    if (search) {
      const q = String(search).toLowerCase().trim();
      list = list.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.user.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q)
      );
    }
    res.json(list);
  });

  // ----------------- REAL GEMINI AI INTEGRATION -----------------
  const GEMINI_TEXT_MODEL = 'gemini-4-hydrogen';

  async function callGeminiSafe(params: { model: string; contents: any; config?: any }): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
      const err: any = new Error('Chưa cấu hình GEMINI_API_KEY trên máy chủ.');
      err.statusCode = 503;
      err.isMissingKey = true;
      throw err;
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => {
        const timeoutErr: any = new Error('Kết nối tới Gemini AI quá thời gian phản hồi.');
        timeoutErr.statusCode = 504;
        reject(timeoutErr);
      }, 25000)
    );

    const geminiPromise = (async () => {
      const res = await ai.models.generateContent(params);
      if (!res.text) {
        const emptyErr: any = new Error('Gemini AI không trả về nội dung văn bản.');
        emptyErr.statusCode = 502;
        throw emptyErr;
      }
      return res.text;
    })();

    return Promise.race([geminiPromise, timeoutPromise]);
  }

  function mapGeminiError(error: any): { status: number; message: string } {
    const status = error?.status || error?.statusCode || 502;
    const raw = String(error?.message || '');
    if (error?.isMissingKey) {
      return {
        status: 503,
        message: 'Máy chủ chưa được cấu hình GEMINI_API_KEY. Vui lòng thiết lập khóa trong Settings > Secrets.',
      };
    }
    if (status === 503 || raw.includes('UNAVAILABLE')) {
      return {
        status: 503,
        message: 'Dịch vụ Gemini AI tạm thời quá tải hoặc chưa khả dụng (503). Vui lòng thử lại sau ít giây.',
      };
    }
    if (status === 504) {
      return { status: 504, message: 'Hệ thống AI phản hồi chậm (timeout). Vui lòng thử lại sau ít giây.' };
    }
    if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID') || status === 400 || status === 403) {
      return { status: 502, message: 'Khóa API Gemini không hợp lệ hoặc bị từ chối quyền.' };
    }
    if (raw.includes('RESOURCE_EXHAUSTED') || status === 429) {
      return { status: 429, message: 'Đã vượt giới hạn lượt gọi Gemini AI hiện tại. Vui lòng thử lại sau ít phút.' };
    }
    return { status: 502, message: `Lỗi dịch vụ AI Gemini: ${raw || 'Không thể xử lý yêu cầu lúc này.'}` };
  }

  // 1. EduBot Student Tutor AI with 10-Step RAG + Safety Guard
  app.get('/api/ai/student-chat/history', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    const history = studentChatHistories.get(req.authUser!.id) || [];
    res.json({ history });
  });

  app.delete('/api/ai/student-chat/history', authenticateRequest, (req: AuthenticatedRequest, res: Response) => {
    studentChatHistories.delete(req.authUser!.id);
    addAuditLog('Xóa lịch sử hỏi đáp AI', req.authUser!.email, req.authUser!.role, 'Người dùng đã xóa lịch sử hội thoại với EduBot.', 'info');
    res.json({ success: true });
  });

  app.post('/api/ai/student-chat', authenticateRequest, aiLimiter, async (req: AuthenticatedRequest, res: Response) => {
    const { message, grade = 4, subject = 'toan', currentLessonId } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập câu hỏi gửi EduBot.' });
    }

    const cleanMessage = String(message).trim();
    if (systemSettings.childSafetyFilterEnabled && isChildUnsafePrompt(cleanMessage)) {
      addAuditLog('Bộ lọc an toàn trẻ em kích hoạt', req.authUser!.email, req.authUser!.role, 'Chặn nội dung nhạy cảm trước khi gửi AI.', 'warning');
      return res.json({
        text: '🤖 EduBot nhận thấy câu hỏi này có nội dung chưa phù hợp với lứa tuổi tiểu học. Bạn nhỏ hãy hỏi EduBot về Toán, Tiếng Việt, Khoa học hoặc tâm sự với bố mẹ và thầy cô nhé!',
        robotExpression: 'thinking',
        referencedLessons: [],
        citations: [],
        suggestedPrompts: [`Đố tớ một bài tập vui Lớp ${grade} nhé!`, 'Cùng ôn lại bài học hôm nay nào!'],
      });
    }

    // Step 7-8 of RAG Pipeline: Context Retrieval strictly from VERIFIED chunks
    const retrieval = ragEngine.retrieveContext({
      query: cleanMessage,
      grade: Number(grade),
      subjectId: subject,
      onlyVerified: true,
      preferredDocumentId: currentLessonId,
      topK: 4,
    });

    const currentLesson = currentLessonId ? lessons.find((l) => l.id === currentLessonId) : undefined;
    const gradeSubjects = subjects
      .filter((s) => s.grades.includes(Number(grade)))
      .map((s) => s.name)
      .join(', ');
    const recentWrongMap = wrongQuestionStatsStore.get(req.authUser!.id);
    const weakTopics = recentWrongMap
      ? Array.from(recentWrongMap.values())
          .sort((a, b) => b.wrongCount - a.wrongCount)
          .slice(0, 3)
          .map((w) => w.questionText.slice(0, 80))
      : [];

    const safetyRule = systemSettings.childSafetyFilterEnabled
      ? `4. BẢO MẬT & AN TOÀN TRẺ EM (BẮT BUỘC):
   - Nghiêm cấm hỏi thông tin cá nhân nhạy cảm (họ tên phụ huynh, SĐT, địa chỉ, mật khẩu).
   - Từ chối lịch sự mọi chủ đề bạo lực, nguy hại hoặc không phù hợp trẻ em.`
      : '';

    const systemInstruction = `Bạn là EduBot - Mascot Robot gia sư thân thiện dành cho học sinh tiểu học Việt Nam (Lớp ${grade}).
THÔNG TIN HỌC TẬP HIỆN TẠI:
- Khối lớp: Lớp ${grade} (Các môn thuộc chương trình: ${gradeSubjects})
- Bộ sách định hướng hiện tại: ${systemSettings.textbookSeriesLabel || TEXTBOOK_SERIES_LABELS.kntt}
${currentLesson ? `- Bài học đang mở: "${currentLesson.title}". Kiến thức trọng tâm: ${currentLesson.coreKnowledge.join(' | ')}` : ''}
${weakTopics.length > 0 ? `- Lưu ý các câu hỏi học sinh vừa làm sai gần đây: ${weakTopics.join(' ; ')}` : ''}

QUY TẮC SƯ PHẠM BẮT BUỘC:
1. Xưng hô: "EduBot" / "tớ" và gọi học sinh là "bạn nhỏ" thân mật (dùng từ ngữ ngắn gọn, dễ hiểu đúng độ tuổi Lớp ${grade}).
2. PHƯƠNG PHÁP SOCRATIC GỢI MỞ: Khi học sinh hỏi bài tập, KHÔNG đưa ngay đáp số cuối! Hãy:
   - Khen ngợi tinh thần ham học.
   - Đưa 1 ví dụ đời sống quen thuộc (chiếc bánh, cái kẹo, quyển vở).
   - Đặt 1 câu hỏi gợi ý nhỏ để bé tự suy nghĩ bước tiếp theo.
3. TRUNG THỰC TÀI LIỆU: Chỉ bám sát các nguồn kiến thức bài học bên dưới. Tuyệt đối KHÔNG tự bịa tên sách, số trang hoặc trích dẫn giả. Nếu tài liệu bên dưới ghi "KHÔNG TÌM THẤY TÀI LIỆU PHÙ HỢP", hãy nói rõ đây là giải thích tổng quát của trợ lý và khuyên bạn nhỏ hỏi thêm thầy cô giáo.
${safetyRule}
5. CĂN CỨ KIẾN THỨC BÀI HỌC:
${retrieval.contextText}`;

    const priorHistory = studentChatHistories.get(req.authUser!.id) || [];
    const recentTurns = priorHistory
      .slice(-6)
      .map((m) => `${m.sender === 'student' ? 'Học sinh' : 'EduBot'}: ${m.text}`)
      .join('\n');
    const fullPrompt = recentTurns
      ? `Lịch sử trò chuyện gần đây:\n${recentTurns}\n\nCâu hỏi mới của học sinh Lớp ${grade}:\n${cleanMessage}`
      : cleanMessage;

    try {
      const replyText = await callGeminiSafe({
        model: GEMINI_TEXT_MODEL,
        contents: fullPrompt,
        config: { systemInstruction },
      });

      const userMsg: AiChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'student',
        text: cleanMessage,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      const referencedLessons = Array.from(new Set(retrieval.citations.map((c) => c.title)));
      const suggestedPrompts =
        referencedLessons.length > 0
          ? [
              `Giải thích đơn giản hơn về "${referencedLessons[0]}" đi EduBot!`,
              'Cho tớ một câu hỏi luyện tập nhỏ nhé!',
              'Tớ cần thêm một ví dụ trực quan!',
            ]
          : ['EduBot gợi ý bước đầu tiên giúp tớ nhé!', 'Cho tớ một ví dụ thực tế đi EduBot!'];

      const botMsg: AiChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'edubot',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        robotExpression: 'happy',
        referencedLessons,
        citations: retrieval.citations,
        suggestedPrompts,
      };

      studentChatHistories.set(req.authUser!.id, [...priorHistory, userMsg, botMsg]);

      addAuditLog(
        'Hỏi đáp Gia sư EduBot',
        req.authUser!.email,
        req.authUser!.role,
        `Hỏi đáp môn ${subject} Lớp ${grade} (${retrieval.citations.length} nguồn RAG)`,
        'info'
      );

      res.json({
        text: replyText,
        robotExpression: 'happy',
        referencedLessons,
        citations: retrieval.citations,
        hasSufficientContext: retrieval.hasSufficientContext,
        suggestedPrompts,
        userMessage: userMsg,
        botMessage: botMsg,
      });
    } catch (error: any) {
      console.error('Gemini error in student-chat:', error?.message);
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 2. EduBot Teacher AI - Lesson Plan Generator with RAG Citations
  app.post('/api/ai/teacher/lesson-plan', authenticateRequest, requireApprovedStaff, aiLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        grade = 4,
        subject = 'toan',
        lessonName,
        duration = '35 phút',
        teachingMethod = 'Dạy học tích cực & Bàn tay nặn bột',
        objectives,
      } = req.body;

      if (!lessonName || !String(lessonName).trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập tên bài dạy.' });
      }

      const retrieval = ragEngine.retrieveContext({
        query: `${lessonName} ${objectives || ''}`,
        grade: Number(grade),
        subjectId: String(subject),
        onlyVerified: false,
        topK: 4,
      });

      const systemInstruction = `Bạn là Chuyên gia Phương pháp Dạy học Tiểu học và Trợ lý AI Giáo viên Việt Nam (EduBot Teacher AI).
Nhiệm vụ: Soạn Kế hoạch bài dạy (Giáo án) theo chuẩn Thông tư 32/2018/TT-BGDĐT và Công văn số 2345/BGDĐT-GDTH.
Cấu trúc: I. YÊU CẦU CẦN ĐẠT; II. ĐỒ DÙNG DẠY HỌC; III. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU (Khởi động, Khám phá, Luyện tập, Vận dụng); IV. CÂU HỎI ĐÁNH GIÁ & ĐIỀU CHỈNH SAU BÀI DẠY.
QUY TẮC: Đánh dấu rõ đây là BẢN NHÁP DO AI HỖ TRỢ SOẠN, không tự bịa số trang sách giáo khoa nếu không có trong nguồn RAG bên dưới.
TÀI LIỆU RAG THAM CHIẾU:
${retrieval.contextText}`;

      const prompt = `Soạn Kế hoạch bài dạy chi tiết cho:
- Môn học: ${subject}, Khối: Lớp ${grade}, Tên bài dạy: ${lessonName}, Thời lượng: ${duration}
- Phương pháp: ${teachingMethod}
- Yêu cầu cần đạt: ${objectives || 'Chuẩn CTGDPT 2018/2026'}`;

      const generatedPlan = await callGeminiSafe({
        model: GEMINI_TEXT_MODEL,
        contents: prompt,
        config: { systemInstruction },
      });

      const newDraft: AiDraftItem = {
        id: `draft-plan-${Date.now()}`,
        type: 'lesson_plan',
        title: `Kế hoạch bài dạy: ${lessonName} - Khối ${grade}`,
        subjectId: subject,
        grade: Number(grade),
        createdAt: new Date().toISOString(),
        createdBy: `${req.authUser!.name} (EduBot Teacher AI)`,
        authorId: req.authUser!.id,
        status: 'draft',
        citations: retrieval.citations,
        content: {
          text: generatedPlan,
          lessonName,
          grade,
          duration,
          teachingMethod,
        },
      };

      aiDrafts.unshift(newDraft);
      addAuditLog('AI Soạn bài giảng', req.authUser!.email, req.authUser!.role, `AI tạo bản nháp KHBD "${newDraft.title}" (${retrieval.citations.length} nguồn RAG)`, 'success');
      res.json({ success: true, draft: newDraft });
    } catch (error: any) {
      console.error('Error generating lesson plan:', error?.message);
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 3. EduBot Teacher AI - Knowledge Standardization with RAG Citations
  app.post('/api/ai/teacher/standardize-knowledge', authenticateRequest, requireApprovedStaff, aiLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { rawContent, grade = 4, subject = 'toan', lessonTitle } = req.body;
      if (!rawContent || !String(rawContent).trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập nội dung cần chuẩn hóa.' });
      }

      const retrieval = ragEngine.retrieveContext({
        query: `${lessonTitle || ''} ${rawContent}`,
        grade: Number(grade),
        subjectId: String(subject),
        onlyVerified: true,
        topK: 4,
      });

      const systemInstruction = `Bạn là Chuyên gia Thẩm định Chương trình Giáo dục Tiểu học Việt Nam.
Đối chiếu văn bản kiến thức do giáo viên cung cấp với Chương trình GDPT 2018 và các nguồn học liệu đã thẩm định dưới đây.
Trả về: 1. Thuật ngữ cốt lõi chuẩn hóa; 2. Mâu thuẫn hoặc điểm thiếu căn cứ sư phạm; 3. Bảng đối chiếu; 4. Bản tóm tắt chuẩn cho học sinh.
NGUỒN RAG ĐÃ THẨM ĐỊNH:
${retrieval.contextText}`;

      const prompt = `Đối chiếu nội dung bài "${lessonTitle || 'Kiến thức chung'}" (Môn ${subject}, Lớp ${grade}):\n"${rawContent}"`;

      const standardizedResult = await callGeminiSafe({
        model: GEMINI_TEXT_MODEL,
        contents: prompt,
        config: { systemInstruction },
      });

      const newDraft: AiDraftItem = {
        id: `draft-std-${Date.now()}`,
        type: 'standardized_knowledge',
        title: `Chuẩn hóa kiến thức: ${lessonTitle || 'Tài liệu học tập'}`,
        subjectId: subject,
        grade: Number(grade),
        createdAt: new Date().toISOString(),
        createdBy: `${req.authUser!.name} (EduBot Standardizer)`,
        authorId: req.authUser!.id,
        status: 'draft',
        citations: retrieval.citations,
        content: {
          rawContent,
          analysis: standardizedResult,
          statusLabel: 'Bản nháp AI – Chờ giáo viên duyệt áp dụng',
        },
      };

      aiDrafts.unshift(newDraft);
      addAuditLog('AI Chuẩn hóa kiến thức', req.authUser!.email, req.authUser!.role, `AI tạo báo cáo chuẩn hóa "${newDraft.title}"`, 'success');
      res.json({ success: true, draft: newDraft });
    } catch (error: any) {
      console.error('Error in standardize-knowledge:', error?.message);
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // 4. EduBot Teacher AI - Question & Exam Matrix Generator with RAG
  app.post('/api/ai/teacher/generate-quiz', authenticateRequest, requireApprovedStaff, aiLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        grade = 4,
        subject = 'toan',
        topic = 'Phân số',
        questionCount = 4,
        cognitiveLevels = ['nhan_biet', 'thong_hieu', 'van_dung'],
      } = req.body;

      if (!topic || !String(topic).trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập chủ đề đề kiểm tra.' });
      }

      const retrieval = ragEngine.retrieveContext({
        query: String(topic),
        grade: Number(grade),
        subjectId: String(subject),
        onlyVerified: false,
        topK: 4,
      });

      const systemInstruction = `Bạn là Trợ lý Khảo thí & Đánh giá Giáo dục Tiểu học EduBot.
Tạo ma trận đề và bộ câu hỏi đánh giá theo chuẩn 4 mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao) bám sát CTGDPT Việt Nam và không trùng lặp câu hỏi.
NGUỒN RAG THAM CHIẾU:
${retrieval.contextText}`;

      const prompt = `Tạo bộ ${questionCount} câu hỏi không trùng lặp cho Môn: ${subject}, Lớp ${grade}, Chủ đề: ${topic}.
Mức độ: ${Array.isArray(cognitiveLevels) ? cognitiveLevels.join(', ') : cognitiveLevels}.
Kèm đáp án, lời giải chi tiết và gợi ý sư phạm.`;

      const generatedQuizText = await callGeminiSafe({
        model: GEMINI_TEXT_MODEL,
        contents: prompt,
        config: { systemInstruction },
      });

      const newDraft: AiDraftItem = {
        id: `draft-quiz-${Date.now()}`,
        type: 'quiz_matrix',
        title: `Bộ đề & Ma trận kiểm tra: ${topic} - Lớp ${grade}`,
        subjectId: subject,
        grade: Number(grade),
        createdAt: new Date().toISOString(),
        createdBy: `${req.authUser!.name} (EduBot Exam Generator)`,
        authorId: req.authUser!.id,
        status: 'draft',
        citations: retrieval.citations,
        content: {
          text: generatedQuizText,
          questionCount,
          topic,
        },
      };

      aiDrafts.unshift(newDraft);
      addAuditLog('AI Tạo đề kiểm tra', req.authUser!.email, req.authUser!.role, `AI tạo bộ đề "${newDraft.title}"`, 'success');
      res.json({ success: true, draft: newDraft });
    } catch (error: any) {
      console.error('Error in generate-quiz:', error?.message);
      const mapped = mapGeminiError(error);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // ----------------- ANALYTICS & OVERVIEW -----------------
  app.get('/api/analytics/overview', (_req: Request, res: Response) => {
    const totalStudents = users.filter((u) => u.role === 'student').length;
    const totalTeachers = users.filter((u) => u.role === 'teacher').length;
    const pendingTeachers = users.filter((u) => u.role === 'teacher' && u.teacherApprovalStatus === 'pending').length;
    const totalLessons = lessons.length;
    const totalSubmissions = submissions.length;
    const avgScore =
      submissions.length > 0
        ? Number((submissions.reduce((acc, s) => acc + s.score, 0) / submissions.length).toFixed(1))
        : 0;
    const pendingReviews = aiDrafts.filter((d) => d.status === 'draft').length;

    res.json({
      totalStudents,
      totalTeachers,
      pendingTeachers,
      totalLessons,
      totalSubmissions,
      avgScore,
      pendingReviews,
      curriculumVersion: 'CTGDPT-2018 (TT 32/2018 & TT 17/2025/TT-BGDĐT)',
      aiModel: GEMINI_TEXT_MODEL,
      aiStatus: process.env.GEMINI_API_KEY ? 'active' : 'unconfigured',
      firebaseConfigured: Boolean(FIREBASE_PROJECT_ID),
      firebaseProjectId: FIREBASE_PROJECT_ID || null,
      persistenceMode: FIREBASE_PROJECT_ID ? 'hybrid_firestore_and_api' : 'in_memory',
      ragDocumentsCount: ragEngine.listDocuments().length,
    });
  });

  return app;
}
