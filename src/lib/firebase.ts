/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import appletFirebaseConfig from '../../firebase-applet-config.json';

const resolvedConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletFirebaseConfig.appId,
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || appletFirebaseConfig.firestoreDatabaseId,
};

export const firebaseProjectId = resolvedConfig.projectId;
export const firestoreDatabaseId = resolvedConfig.firestoreDatabaseId;
export const isFirebaseConfigured = Boolean(resolvedConfig.apiKey && resolvedConfig.projectId);

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured) {
  appInstance = getApps().length > 0 ? getApps()[0] : initializeApp(resolvedConfig);
  authInstance = getAuth(appInstance);
  /* CRITICAL: Pass firestoreDatabaseId to bind to the provisioned Enterprise Firestore instance */
  dbInstance = resolvedConfig.firestoreDatabaseId
    ? getFirestore(appInstance, resolvedConfig.firestoreDatabaseId)
    : getFirestore(appInstance);
}

export const firebaseApp = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export type FirestoreConnectionState = 'connected' | 'offline' | 'unconfigured' | 'error';

export async function testFirestoreConnection(): Promise<{
  state: FirestoreConnectionState;
  detail?: string;
}> {
  if (!db) {
    return { state: 'unconfigured', detail: 'Chưa cấu hình Firebase Client SDK.' };
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { state: 'connected' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return { state: 'offline', detail: msg };
    }
    return { state: 'connected', detail: msg };
  }
}

export function getFirebaseErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string' && code) return code;
  const msg = String((error as { message?: unknown }).message || '');
  const match = msg.match(/\((auth\/[a-z0-9-]+|permission-denied)\)/i);
  return match ? match[1] : '';
}

export function mapFirebaseAuthError(error: unknown, fallback = 'Không thể xác thực tài khoản.'): string {
  const code = getFirebaseErrorCode(error);
  const raw = error instanceof Error ? error.message : String(error || '');

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
    case 'auth/user-not-found':
      return 'Không tìm thấy tài khoản tương ứng với email này trên Firebase Auth.';
    case 'auth/email-already-in-use':
      return 'Email này đã được sử dụng cho một tài khoản khác. Vui lòng đăng nhập.';
    case 'auth/invalid-email':
      return 'Định dạng email không hợp lệ.';
    case 'auth/weak-password':
      return 'Mật khẩu quá yếu. Vui lòng sử dụng ít nhất 6 ký tự.';
    case 'auth/too-many-requests':
      return 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi vài phút rồi thử lại.';
    case 'auth/network-request-failed':
      return 'Lỗi kết nối mạng tới dịch vụ xác thực Firebase. Vui lòng kiểm tra Internet.';
    case 'auth/invalid-api-key':
      return 'Cấu hình Firebase API Key (VITE_FIREBASE_API_KEY) chưa hợp lệ. Vui lòng liên hệ Quản trị viên.';
    case 'auth/unauthorized-domain': {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'tên miền hiện tại';
      return `Tên miền "${host}" chưa được cấp phép trong Firebase Console -> Authentication -> Settings -> Authorized domains.`;
    }
    case 'auth/operation-not-allowed':
      return 'Phương thức đăng nhập Email/Mật khẩu chưa được bật trong Firebase Console (Sign-in method). Vui lòng dùng Google hoặc liên hệ Quản trị viên.';
    case 'auth/popup-closed-by-user':
      return 'Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.';
    case 'auth/popup-blocked':
      return 'Trình duyệt đang chặn popup đăng nhập Google. Vui lòng cho phép popup cho trang này.';
    case 'auth/user-disabled':
      return 'Tài khoản này đã bị tạm khóa. Vui lòng liên hệ Quản trị viên.';
    case 'permission-denied':
      return 'Bạn chưa có quyền truy cập hoặc chưa xác minh email cho thao tác Cloud Firestore này.';
    default:
      if (raw.includes('permission-denied') || raw.includes('PERMISSION_DENIED')) {
        return 'Không có quyền thực hiện thao tác dữ liệu trên Cloud Firestore.';
      }
      if (raw.includes('Failed to fetch') || raw.includes('NetworkError')) {
        return 'Không thể kết nối tới máy chủ API. Vui lòng thử lại sau.';
      }
      return raw || fallback;
  }
}

export async function signInWithFirebaseGoogle(): Promise<{
  firebaseUser: FirebaseUser;
  idToken: string;
}> {
  if (!auth) {
    throw new Error('Firebase Auth chưa được khởi tạo.');
  }
  const cred = await signInWithPopup(auth, googleProvider);
  const idToken = await cred.user.getIdToken(true);
  return { firebaseUser: cred.user, idToken };
}

export async function signInWithFirebaseEmail(
  email: string,
  password: string
): Promise<{ firebaseUser: FirebaseUser; idToken: string }> {
  if (!auth) throw new Error('Firebase Auth chưa được khởi tạo.');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await cred.user.getIdToken(true);
  return { firebaseUser: cred.user, idToken };
}

export async function registerWithFirebaseEmail(
  name: string,
  email: string,
  password: string
): Promise<{ firebaseUser: FirebaseUser; idToken: string; verificationSent: boolean }> {
  if (!auth) throw new Error('Firebase Auth chưa được khởi tạo.');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name.trim()) {
    await updateProfile(cred.user, { displayName: name.trim() });
  }
  let verificationSent = false;
  if (!cred.user.emailVerified) {
    try {
      await sendEmailVerification(cred.user);
      verificationSent = true;
    } catch {
      verificationSent = false;
    }
  }
  const idToken = await cred.user.getIdToken(true);
  return { firebaseUser: cred.user, idToken, verificationSent };
}

export async function resendFirebaseVerificationEmail(): Promise<boolean> {
  if (!auth?.currentUser || auth.currentUser.emailVerified) return false;
  await sendEmailVerification(auth.currentUser);
  return true;
}

export async function sendFirebasePasswordReset(email: string): Promise<void> {
  if (!auth) throw new Error('Firebase Auth chưa được khởi tạo.');
  await sendPasswordResetEmail(auth, email);
}

export async function signOutFirebase(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}
