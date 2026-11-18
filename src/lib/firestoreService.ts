/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from './firebase.ts';
import {
  User,
  Lesson,
  CurriculumSubject,
  ExerciseSet,
  AcademicYear,
  StudentSubmission,
  LearningProgress,
  AiChatMessage
} from '../types/index.ts';

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || 'doc_default';
}

export async function fetchFirebaseUserProfile(uid: string): Promise<Record<string, any> | null> {
  if (!db || !auth?.currentUser) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

export async function syncFirebaseUserDocs(user: User): Promise<void> {
  if (!db || !auth?.currentUser) return;
  const uid = auth.currentUser.uid;
  const userPath = `users/${uid}`;
  const isVerified = Boolean(auth.currentUser.emailVerified);
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        name: user.name.slice(0, 100),
        role:
          user.role === 'admin' && auth.currentUser.email?.toLowerCase() === 'vulin1000@gmail.com' && isVerified
            ? 'admin'
            : 'student',
        teacherApprovalStatus: user.role === 'teacher' ? 'pending' : 'none',
        grade: user.grade || 4,
        school: (user.school || 'Trường Tiểu học Thăng Long').slice(0, 150),
        xp: Math.max(0, Number(user.xp ?? 0)),
        streakDays: Math.max(0, Number(user.streakDays ?? 0)),
        badges: (user.badges || []).slice(0, 50),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (isVerified) {
      await setDoc(
        ref,
        {
          name: user.name.slice(0, 100),
          grade: user.grade || 4,
          school: (user.school || 'Trường Tiểu học Thăng Long').slice(0, 150),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    const privRef = doc(db, 'users', uid, 'private', 'info');
    const privSnap = await getDoc(privRef);
    if (!privSnap.exists()) {
      await setDoc(privRef, {
        uid,
        email: (auth.currentUser.email || user.email).slice(0, 180),
        consentVerified: Boolean(user.parentalConsentVerified),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    if (user.role === 'teacher' && isVerified) {
      const teacherRef = doc(db, 'teachers', uid);
      const teacherSnap = await getDoc(teacherRef);
      if (!teacherSnap.exists()) {
        await setDoc(teacherRef, {
          uid,
          name: user.name.slice(0, 100),
          school: (user.school || 'Trường Tiểu học Thăng Long').slice(0, 150),
          approvalStatus: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }
}

export async function persistSubmissionToFirestore(sub: StudentSubmission): Promise<void> {
  if (!db || !auth?.currentUser || !auth.currentUser.emailVerified) return;
  const uid = auth.currentUser.uid;
  const docId = sanitizeId(sub.id);
  const path = `submissions/${docId}`;
  try {
    await setDoc(doc(db, 'submissions', docId), {
      id: docId,
      studentId: uid,
      exerciseSetId: sanitizeId(sub.exerciseSetId),
      ...(sub.assignmentId ? { assignmentId: sanitizeId(sub.assignmentId) } : {}),
      score: sub.score,
      status: 'submitted',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function persistProgressToFirestore(prog: LearningProgress): Promise<void> {
  if (!db || !auth?.currentUser || !auth.currentUser.emailVerified) return;
  const uid = auth.currentUser.uid;
  const docId = sanitizeId(`${uid}_${prog.lessonId}`);
  const path = `learningProgress/${docId}`;
  try {
    const ref = doc(db, 'learningProgress', docId);
    const snap = await getDoc(ref);
    await setDoc(
      ref,
      {
        id: docId,
        studentId: uid,
        lessonId: sanitizeId(prog.lessonId),
        completed: prog.completed,
        timeSpentSeconds: Math.min(86400, Math.max(0, Math.round(prog.timeSpentSeconds))),
        createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function persistChatMessageToFirestore(msg: AiChatMessage): Promise<void> {
  if (!db || !auth?.currentUser || !auth.currentUser.emailVerified) return;
  const uid = auth.currentUser.uid;
  const msgId = sanitizeId(msg.id);
  const path = `aiConversations/${uid}/messages/${msgId}`;
  try {
    await setDoc(doc(db, 'aiConversations', uid, 'messages', msgId), {
      id: msgId,
      userId: uid,
      sender: msg.sender,
      text: msg.text.slice(0, 6000),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function fetchUserSubmissionsFromFirestore(limitCount = 20): Promise<any[]> {
  if (!db || !auth?.currentUser) return [];
  const uid = auth.currentUser.uid;
  const path = 'submissions';
  try {
    const q = query(
      collection(db, path),
      where('studentId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

/**
 * Admin-only explicit migration routine: writes curriculum subjects, lessons,
 * exercises, and academic years cleanly in batches without deleting existing records.
 */
export async function migrateCurriculumToFirestore(payload: {
  subjects: CurriculumSubject[];
  lessons: Lesson[];
  exercises: ExerciseSet[];
  academicYears: AcademicYear[];
}): Promise<{ migratedCount: number }> {
  if (!db || !auth?.currentUser) {
    throw new Error('Cần đăng nhập Firebase với tài khoản Quản trị viên để thực hiện migration.');
  }

  const batch = writeBatch(db);
  let count = 0;

  for (const year of payload.academicYears) {
    const ref = doc(db, 'academicYears', sanitizeId(year.id));
    batch.set(ref, {
      id: sanitizeId(year.id),
      name: year.name.slice(0, 40),
      isActive: year.isActive,
      createdAt: serverTimestamp(),
    });
    count++;
  }

  for (const sub of payload.subjects) {
    const ref = doc(db, 'subjects', sanitizeId(sub.id));
    batch.set(ref, {
      id: sanitizeId(sub.id),
      name: sub.name.slice(0, 100),
      code: sub.code.slice(0, 20),
      grades: sub.grades.slice(0, 5),
      description: sub.description.slice(0, 500),
      createdAt: serverTimestamp(),
    });
    count++;
  }

  for (const les of payload.lessons) {
    const ref = doc(db, 'lessons', sanitizeId(les.id));
    batch.set(ref, {
      id: sanitizeId(les.id),
      subjectId: sanitizeId(les.subjectId),
      grade: les.grade,
      title: les.title.slice(0, 200),
      lessonCode: les.lessonCode.slice(0, 40),
      summary: les.summary.slice(0, 1000),
      status: les.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    count++;
  }

  for (const ex of payload.exercises) {
    const ref = doc(db, 'exercises', sanitizeId(ex.id));
    batch.set(ref, {
      id: sanitizeId(ex.id),
      title: ex.title.slice(0, 200),
      subjectId: sanitizeId(ex.subjectId),
      grade: ex.grade,
      createdBy: auth.currentUser.uid,
      questionCount: ex.questions.length,
      createdAt: serverTimestamp(),
    });
    count++;
  }

  try {
    await batch.commit();
    return { migratedCount: count };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'curriculum_migration_batch');
  }
}
