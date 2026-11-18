/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'student' | 'teacher' | 'admin';
export type TeacherApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teacherApprovalStatus?: TeacherApprovalStatus;
  authProvider?: 'local' | 'firebase';
  grade?: number; // 1 to 5 for students
  avatar?: string;
  school?: string;
  classCode?: string;
  xp?: number;
  streakDays?: number;
  badges?: string[];
  teacherNote?: string;
  guardianEmail?: string;
  parentalConsentVerified?: boolean;
  createdAt: string;
}

export type ResourceStatus =
  | 'verified'
  | 'pending'
  | 'unverified'
  | 'ai_draft'
  | 'DRAFT'
  | 'NEEDS_REVIEW'
  | 'VERIFIED'
  | 'APPROVED'
  | 'PUBLISHED';

export function isLessonVerified(status: ResourceStatus): boolean {
  return status === 'verified' || status === 'VERIFIED' || status === 'APPROVED' || status === 'PUBLISHED';
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CurriculumSubject {
  id: string;
  name: string;
  code: string;
  grades: number[]; // e.g. [1, 2, 3, 4, 5]
  category: 'compulsory' | 'elective' | 'integrated';
  icon: string;
  color: string;
  description: string;
}

export interface CurriculumTopic {
  id: string;
  subjectId: string;
  grade: number;
  semester: 1 | 2;
  title: string;
  order: number;
  lessonCount: number;
}

export type TextbookSeries = 'kntt' | 'ctst' | 'cd' | 'khac';

export const TEXTBOOK_SERIES_LABELS: Record<TextbookSeries, string> = {
  kntt: 'Kết nối tri thức với cuộc sống',
  ctst: 'Chân trời sáng tạo',
  cd: 'Cánh diều',
  khac: 'Tùy chỉnh theo chương trình nhà trường',
};

export interface LessonWorkedExample {
  title: string;
  problem: string;
  steps: string[];
  answer: string;
}

export interface LessonSubjectModules {
  readingPassage?: { title: string; text: string; author?: string };
  wordAndSentence?: string;
  spellingTip?: string;
  writingTask?: string;
  vocabulary?: { word: string; phonetic?: string; meaning: string; example: string }[];
  sentencePatterns?: string[];
  communicationScenario?: string;
  realLifeScenario?: string;
  labPracticeSteps?: string[];
}

export interface Lesson {
  id: string;
  topicId: string;
  subjectId: string;
  grade: number;
  semester: 1 | 2;
  title: string;
  lessonCode: string;
  order: number;
  curriculum?: TextbookSeries;
  chapter?: string;
  lessonType?: 'lesson' | 'practice' | 'test' | 'review';
  estimatedDuration?: number; // minutes
  difficulty?: 'co_ban' | 'trung_binh' | 'nang_cao';
  sourceBook?: string; // e.g. "Kết nối tri thức với cuộc sống"
  mediaUrl?: string;
  externalResourceUrl?: string;
  visualDiagramKey?: string;
  visualDiagramCaption?: string;
  objectives: string[]; // Yêu cầu cần đạt
  coreKnowledge: string[]; // Kiến thức trọng tâm
  termsAndDefinitions: { term: string; definition: string }[];
  illustrations: string[];
  commonMisconceptions: string[]; // Lỗi sai học sinh thường gặp
  workedExamples?: LessonWorkedExample[];
  subjectModules?: LessonSubjectModules;
  summary: string;
  officialReference: {
    docNumber: string; // e.g. "TT 32/2018/TT-BGDĐT", "TT 17/2025/TT-BGDĐT"
    issueDate: string;
    sourceUrl?: string;
    curriculumVersion: string;
  };
  dataSource?: 'official_curriculum' | 'teacher_authored' | 'ai_generated' | 'seed_demo';
  sourceVerificationNote?: string;
  status: ResourceStatus;
  interactiveContent?: {
    sections: {
      title: string;
      content: string;
      example?: string;
      checkpointQuestion?: {
        question: string;
        options: string[];
        correctAnswer: number;
        explanation: string;
      };
    }[];
  };
}

export type QuestionType =
  | 'single_choice'
  | 'multi_choice'
  | 'true_false'
  | 'fill_blank'
  | 'matching'
  | 'ordering'
  | 'drag_drop'
  | 'step_math'
  | 'short_answer'
  | 'scenario'
  | 'essay';

export interface Question {
  id: string;
  lessonId: string;
  subjectId: string;
  grade: number;
  type: QuestionType;
  difficulty: 'nhan_biet' | 'thong_hieu' | 'van_dung' | 'van_dung_cao';
  points?: number;
  questionText: string;
  options?: string[]; // For single_choice, multi_choice, scenario
  correctAnswer: any; // number | number[] | boolean | string | string[] | Record<string, string>
  explanation: string;
  pedagogicalHint: string;
  learningOutcomeId?: string;
  pairs?: { left: string; right: string }[]; // For matching
  items?: string[]; // For ordering (correct ordered sequence)
  dragItems?: { id: string; label: string; targetZone: string }[]; // For drag_drop
  dropZones?: string[]; // Target zone names for drag_drop
  rubricCriteria?: string[]; // Evaluation criteria for essay
  steps?: { stepNumber: number; instruction: string; formula?: string; solution: string }[]; // For step_math
}

export interface KnowledgeNode {
  id: string;
  title: string;
  subjectId: string;
  grade: number;
  lessonId: string;
  prerequisites: string[]; // ids of prerequisite nodes
  nextNodes: string[];
  status: 'locked' | 'available' | 'mastered';
  masteryPercentage: number;
  description: string;
  order: number;
}

export interface ExerciseSet {
  id: string;
  title: string;
  subjectId: string;
  grade: number;
  lessonId?: string;
  topicId?: string;
  kind?: 'practice' | 'test' | 'review';
  createdBy?: string;
  questions: Question[];
  durationMinutes: number;
  totalPoints: number;
}

export interface ClassRoom {
  id: string;
  code: string;
  name: string;
  grade: number;
  teacherId: string;
  teacherName: string;
  studentCount: number;
  students: { id: string; name: string; email: string; xp: number; progress: number }[];
  academicYear: string;
  assignedLessonIds?: string[];
  textbookSeries?: TextbookSeries;
}

export interface Assignment {
  id: string;
  classId: string;
  className: string;
  teacherId?: string;
  targetStudentIds?: string[];
  exerciseSetId: string;
  title: string;
  subjectId: string;
  grade: number;
  deadline: string;
  assignedBy: string;
  maxAttempts: number;
  status: 'active' | 'closed';
  completedCount: number;
  totalStudents: number;
}

export interface StudentSubmission {
  id: string;
  assignmentId?: string;
  exerciseSetId: string;
  studentId: string;
  studentName: string;
  grade: number;
  answers: Record<string, any>;
  score: number; // 0 - 10
  totalCorrect: number;
  totalQuestions: number;
  autoGradedQuestions?: number;
  pendingEssayReview?: boolean;
  wrongQuestionIds?: string[];
  attemptNumber?: number;
  completedAt: string;
  timeSpentSeconds: number;
  feedback: string;
  teacherFeedback?: string;
  gradedBy?: string;
  gradedAt?: string;
  status?: 'submitted' | 'graded';
  misconceptionTags: string[];
}

export interface WrongQuestionStat {
  questionId: string;
  exerciseSetId: string;
  exerciseTitle: string;
  lessonId: string;
  lessonTitle?: string;
  subjectId: string;
  grade: number;
  questionText: string;
  wrongCount: number;
  attemptCount: number;
  lastWrongAt: string;
}

export interface LearningProgress {
  id: string;
  studentId: string;
  lessonId: string;
  grade: number;
  subjectId: string;
  completed: boolean;
  checkpointPassed: boolean;
  timeSpentSeconds: number;
  completedAt: string;
  lastOpenedAt?: string;
  isFavorite?: boolean;
}

export interface RagCitation {
  chunkId: string;
  documentId: string;
  title: string;
  sourceRef: string;
  status: ResourceStatus | string;
  snippet: string;
  score: number;
}

export interface RagDocumentSummary {
  documentId: string;
  title: string;
  grade: number;
  subjectId: string;
  sourceRef: string;
  status: ResourceStatus | string;
  chunkCount: number;
  ingestedAt: string;
}

export interface AiChatMessage {
  id: string;
  sender: 'student' | 'edubot';
  text: string;
  timestamp: string;
  referencedLessons?: string[];
  citations?: RagCitation[];
  suggestedPrompts?: string[];
  robotExpression?: 'happy' | 'thinking' | 'explaining' | 'celebrating';
}

export interface ContentReviewVersion {
  version: number;
  status: 'draft' | 'approved' | 'rejected' | 'published';
  reviewer: string;
  notes?: string;
  reviewedAt: string;
}

export interface AiDraftItem {
  id: string;
  type: 'lesson_plan' | 'standardized_knowledge' | 'quiz_matrix';
  title: string;
  subjectId: string;
  grade: number;
  createdAt: string;
  createdBy: string;
  authorId?: string;
  status: 'draft' | 'approved' | 'rejected' | 'published';
  content: any;
  teacherNotes?: string;
  citations?: RagCitation[];
  reviewHistory?: ContentReviewVersion[];
}

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  role: string;
  details: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info';
}

export interface ParentConsentRecord {
  id: string;
  studentId: string;
  studentName: string;
  guardianEmail: string;
  relationship: string;
  status: 'pending' | 'verified' | 'revoked';
  requestedAt: string;
  verifiedAt?: string;
}

export interface SystemSettings {
  childSafetyFilterEnabled: boolean;
  parentalConsentRequired: boolean;
  leaderboardEnabled: boolean;
  dataRetentionDays: number;
  aiMaxTokensPerDay: number;
  curriculumStandard: string;
  curriculumVersionYear: number;
  textbookSeries?: TextbookSeries;
  textbookSeriesLabel?: string;
  maintenanceMode: boolean;
}
