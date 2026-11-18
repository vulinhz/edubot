/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  User,
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
  AcademicYear
} from '../src/types/index.ts';
import {
  fullCurriculumSubjects,
  extendedTopics,
  extendedLessons,
  extendedExercises,
} from './curriculumData.ts';

export const initialUsers: User[] = [
  {
    id: 'user-admin-1',
    name: 'Quản trị viên Hệ thống',
    email: 'admin@edubot.edu.vn',
    role: 'admin',
    school: 'Sở GD&ĐT / EduBot Platform',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'user-teacher-1',
    name: 'Cô Nguyễn Mai',
    email: 'comai@edubot.edu.vn',
    role: 'teacher',
    teacherApprovalStatus: 'approved',
    school: 'Trường Tiểu học Thăng Long (Hà Nội)',
    createdAt: '2026-01-15T09:30:00Z',
  },
  {
    id: 'user-student-1',
    name: 'Em Hoàng Tuấn',
    email: 'tuan.nh@edubot.edu.vn',
    role: 'student',
    grade: 4,
    school: 'Lớp 4A1 - TH Thăng Long',
    classCode: 'EDU-4A1',
    xp: 850,
    streakDays: 7,
    badges: ['Nhà thám hiểm sao', 'Toán học thần tốc', 'Trợ thủ EduBot'],
    createdAt: '2026-02-01T14:00:00Z',
  },
  {
    id: 'user-student-2',
    name: 'Em Bảo Lan',
    email: 'lan.tran@edubot.edu.vn',
    role: 'student',
    grade: 3,
    school: 'Lớp 3B - TH Chu Văn An',
    classCode: 'EDU-3B',
    xp: 620,
    streakDays: 4,
    badges: ['Vua Tiếng Việt', 'Chăm chỉ mỗi ngày'],
    createdAt: '2026-02-05T10:15:00Z',
  },
  {
    id: 'user-student-3',
    name: 'Em Minh Đức',
    email: 'duc.minh@edubot.edu.vn',
    role: 'student',
    grade: 5,
    school: 'Lớp 5C - TH Thăng Long',
    classCode: 'EDU-5C',
    xp: 1240,
    streakDays: 12,
    badges: ['Nhà thông thái nhí', 'Toán học thần tốc'],
    createdAt: '2026-01-20T08:00:00Z',
  },
  {
    id: 'user-student-4',
    name: 'Em Tuệ An',
    email: 'an.tue@edubot.edu.vn',
    role: 'student',
    grade: 1,
    school: 'Lớp 1A - TH Kim Đồng',
    classCode: 'EDU-1A',
    xp: 320,
    streakDays: 3,
    badges: ['Mầm non EduBot'],
    createdAt: '2026-02-10T08:00:00Z',
  },
  {
    id: 'user-student-5',
    name: 'Em Quang Huy',
    email: 'huy.quang@edubot.edu.vn',
    role: 'student',
    grade: 2,
    school: 'Lớp 2B - TH Lê Quý Đôn',
    classCode: 'EDU-2B',
    xp: 510,
    streakDays: 5,
    badges: ['Vua Tiếng Việt'],
    createdAt: '2026-02-08T08:00:00Z',
  }
];

export const initialSubjects: CurriculumSubject[] = fullCurriculumSubjects;

export const initialTopics: CurriculumTopic[] = [
  // Grade 1
  { id: 'topic-math-g1-1', subjectId: 'toan', grade: 1, semester: 1, title: 'Các số từ 0 đến 10 và phép cộng trừ', order: 1, lessonCount: 4 },
  { id: 'topic-viet-g1-1', subjectId: 'tieng-viet', grade: 1, semester: 1, title: 'Làm quen âm chữ và dấu thanh', order: 1, lessonCount: 5 },
  { id: 'topic-tnxh-g1-1', subjectId: 'tu-nhien-xa-hoi', grade: 1, semester: 1, title: 'Cơ thể và các giác quan của em', order: 1, lessonCount: 3 },

  // Grade 2
  { id: 'topic-math-g2-1', subjectId: 'toan', grade: 2, semester: 1, title: 'Phép cộng trừ có nhớ trong phạm vi 100', order: 1, lessonCount: 4 },
  { id: 'topic-viet-g2-1', subjectId: 'tieng-viet', grade: 2, semester: 1, title: 'Mở rộng vốn từ và câu kể sự vật', order: 1, lessonCount: 4 },

  // Grade 3
  { id: 'topic-math-g3-1', subjectId: 'toan', grade: 3, semester: 1, title: 'Bảng nhân, bảng chia và hình phẳng', order: 1, lessonCount: 4 },
  { id: 'topic-inf-g3-1', subjectId: 'tin-hoc', grade: 3, semester: 1, title: 'Máy tính - Người bạn mới của em', order: 1, lessonCount: 3 },

  // Grade 4
  { id: 'topic-math-g4-1', subjectId: 'toan', grade: 4, semester: 1, title: 'Số có nhiều chữ số và bốn phép tính', order: 1, lessonCount: 4 },
  { id: 'topic-math-g4-2', subjectId: 'toan', grade: 4, semester: 2, title: 'Phân số và các phép tính với phân số', order: 2, lessonCount: 5 },
  { id: 'topic-sci-g4-1', subjectId: 'khoa-hoc', grade: 4, semester: 1, title: 'Chất và sự biến đổi: Nước & Không khí', order: 1, lessonCount: 3 },
  { id: 'topic-viet-g4-1', subjectId: 'tieng-viet', grade: 4, semester: 1, title: 'Luyện từ và câu: Danh từ, Động từ, Tính từ', order: 1, lessonCount: 4 },

  // Grade 5
  { id: 'topic-math-g5-1', subjectId: 'toan', grade: 5, semester: 1, title: 'Số thập phân và các phép tính', order: 1, lessonCount: 4 },
  { id: 'topic-viet-g5-1', subjectId: 'tieng-viet', grade: 5, semester: 1, title: 'Từ đồng nghĩa, từ trái nghĩa và liên kết câu', order: 1, lessonCount: 4 },
  { id: 'topic-sci-g5-1', subjectId: 'khoa-hoc', grade: 5, semester: 1, title: 'Sự sinh sản và phát triển của thực vật, động vật', order: 1, lessonCount: 3 },
  ...extendedTopics
];

export const initialLessons: Lesson[] = [
  // ================= GRADE 1 =================
  {
    id: 'lesson-math-101',
    topicId: 'topic-math-g1-1',
    subjectId: 'toan',
    grade: 1,
    semester: 1,
    title: 'Các số từ 1 đến 10 và so sánh số',
    lessonCode: 'TOAN1-CH1-B01',
    order: 1,
    curriculum: 'kntt',
    chapter: 'Chương 1: Các số từ 0 đến 10',
    lessonType: 'lesson',
    estimatedDuration: 15,
    difficulty: 'co_ban',
    visualDiagramKey: 'clock_numberline',
    visualDiagramCaption: 'Tia số tăng dần từ 0 đến 10 giúp bé so sánh số lớn hơn và bé hơn',
    objectives: [
      'Đếm, đọc, viết được các số từ 1 đến 10.',
      'Nhận biết số lượng các vật trong nhóm và gắn tương ứng với chữ số.',
      'Sử dụng các dấu lớn hơn (>), bé hơn (<), bằng nhau (=) để so sánh hai số trong phạm vi 10.'
    ],
    coreKnowledge: [
      'Các số theo thứ tự tăng dần: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.',
      'Số đứng trước thì bé hơn số đứng sau (ví dụ: 3 < 5).',
      'Số 0 biểu thị không có phần tử nào.'
    ],
    termsAndDefinitions: [
      { term: 'Chữ số', definition: 'Ký hiệu dùng để biểu thị số lượng (1, 2, 3,...).' },
      { term: 'So sánh số', definition: 'Tìm xem số nào lớn hơn, bé hơn hoặc bằng nhau.' }
    ],
    illustrations: [
      'Hình ảnh các quả táo và bút chì được nhóm thành các cụm 3 quả, 5 quả để bé đếm.'
    ],
    commonMisconceptions: [
      'Nhầm lẫn hướng quay của dấu lớn hơn (>) và dấu bé hơn (<). Mẹo: Miệng cá sấu luôn mở về phía số lớn hơn!',
      'Quên đếm số 0 khi biểu thị không có đồ vật nào.'
    ],
    summary: 'Dãy số từ 1 đến 10 giúp bé đếm số lượng sự vật. Dùng dấu >, <, = để so sánh hai số.',
    officialReference: {
      docNumber: 'Thông tư 32/2018/TT-BGDĐT & TT 17/2025/TT-BGDĐT',
      issueDate: '2018-12-26 (TT 17/2025 ngày 22/08/2025)',
      curriculumVersion: 'CTGDPT-2018-TT17-2025'
    },
    dataSource: 'official_curriculum',
    sourceVerificationNote: 'Biên soạn bám sát Yêu cầu cần đạt Toán 1 theo Chương trình GDPT 2018.',
    status: 'verified',
    interactiveContent: {
      sections: [
        {
          title: '1. Cùng EduBot đếm sao không gian',
          content: 'Robot EduBot bay trong vũ trụ và nhìn thấy 5 ngôi sao lấp lánh bên trái và 3 ngôi sao bên phải. 5 ngôi sao nhiều hơn 3 ngôi sao! Ta viết: 5 > 3.',
          example: 'Ví dụ: 4 que kem ít hơn 6 que kem, ta viết 4 < 6.',
          checkpointQuestion: {
            question: 'Số nào sau đây lớn hơn 7?',
            options: ['Số 5', 'Số 7', 'Số 9', 'Số 4'],
            correctAnswer: 2,
            explanation: 'Trong dãy số tự nhiên, số 9 đứng sau số 7 nên 9 > 7.'
          }
        }
      ]
    }
  },

  // ================= GRADE 2 =================
  {
    id: 'lesson-math-201',
    topicId: 'topic-math-g2-1',
    subjectId: 'toan',
    grade: 2,
    semester: 1,
    title: 'Phép cộng có nhớ trong phạm vi 100',
    lessonCode: 'TOAN2-CH1-B01',
    order: 1,
    objectives: [
      'Thực hiện được phép cộng có nhớ trong phạm vi 100 theo cột dọc.',
      'Nhớ quy tắc cộng hàng đơn vị trước, nếu đủ 10 thì nhớ 1 sang hàng chục.',
      'Giải bài toán có lời văn một bước tính bằng phép cộng.'
    ],
    coreKnowledge: [
      'Đặt tính thẳng cột: hàng đơn vị thẳng hàng đơn vị, hàng chục thẳng hàng chục.',
      'Cộng từ phải sang trái (đơn vị cộng đơn vị, chục cộng chục thêm số nhớ).'
    ],
    termsAndDefinitions: [
      { term: 'Số hạng', definition: 'Các số đem cộng lại với nhau trong phép cộng.' },
      { term: 'Tổng', definition: 'Kết quả thu được sau khi thực hiện phép cộng.' },
      { term: 'Số nhớ', definition: 'Số đơn vị chuyển sang hàng chục khi tổng hàng đơn vị từ 10 trở lên.' }
    ],
    illustrations: [
      'Sơ đồ thanh chục và khối đơn vị minh họa việc gộp 10 khối đơn vị thành 1 thanh chục.'
    ],
    commonMisconceptions: [
      'Quên không cộng thêm 1 số nhớ vào hàng chục dẫn đến sai kết quả (ví dụ: 38 + 25 = 53 thay vì 63).'
    ],
    summary: 'Khi cộng có nhớ, cộng hàng đơn vị trước. Nếu kết quả lớn hơn hoặc bằng 10, nhớ 1 sang hàng chục.',
    officialReference: {
      docNumber: 'Thông tư 32/2018/TT-BGDĐT',
      issueDate: '2018-12-26',
      curriculumVersion: 'CTGDPT-2018'
    },
    dataSource: 'official_curriculum',
    sourceVerificationNote: 'Biên soạn bám sát Yêu cầu cần đạt Toán 2 theo Thông tư 32/2018/TT-BGDĐT.',
    status: 'verified',
    interactiveContent: {
      sections: [
        {
          title: '1. Bí quyết nạp năng lượng có nhớ cùng EduBot',
          content: 'EduBot đang có 47 viên pin năng lượng, tàu không gian tiếp thêm 25 viên pin nữa. Tính 47 + 25 = ? Ta lấy 7 + 5 = 12, viết 2 nhớ 1. Lấy 4 + 2 = 6, thêm 1 bằng 7. Vậy 47 + 25 = 72!',
          checkpointQuestion: {
            question: 'Kết quả của phép tính 36 + 18 là:',
            options: ['44', '54', '52', '46'],
            correctAnswer: 1,
            explanation: '6 + 8 = 14 viết 4 nhớ 1. 3 + 1 = 4 thêm 1 nhớ là 5. Kết quả là 54.'
          }
        }
      ]
    }
  },

  // ================= GRADE 3 =================
  {
    id: 'lesson-math-301',
    topicId: 'topic-math-g3-1',
    subjectId: 'toan',
    grade: 3,
    semester: 1,
    title: 'Bảng nhân 7, 8, 9 và bài toán giảm đi một số lần',
    lessonCode: 'TOAN3-CH1-B01',
    order: 1,
    objectives: [
      'Thuộc và vận dụng thành thạo bảng nhân 7, 8, 9 vào tính toán.',
      'Hiểu khái niệm "giảm đi một số lần" tức là thực hiện phép chia.',
      'Phân biệt "giảm đi một số lần" với "giảm đi một số đơn vị".'
    ],
    coreKnowledge: [
      'Bảng nhân 7: 7×1=7, 7×2=14, ..., 7×9=63, 7×10=70.',
      'Muốn giảm một số đi nhiều lần, ta lấy số đó chia cho số lần.'
    ],
    termsAndDefinitions: [
      { term: 'Giảm đi một số lần', definition: 'Lấy số ban đầu chia cho số lần (ví dụ: giảm 24 đi 3 lần là 24 : 3 = 8).' },
      { term: 'Giảm đi một số đơn vị', definition: 'Lấy số ban đầu trừ đi số đơn vị (ví dụ: giảm 24 đi 3 đơn vị là 24 - 3 = 21).' }
    ],
    illustrations: ['Biểu đồ que tính chia đều thành các phần bằng nhau.'],
    commonMisconceptions: [
      'Nhầm lẫn giữa "giảm đi 4 lần" (làm phép chia) và "giảm đi 4 đơn vị" (làm phép trừ).'
    ],
    summary: 'Nhớ kỹ: Giảm một số đi a lần thì làm phép chia cho a. Giảm đi a đơn vị thì làm phép trừ cho a.',
    officialReference: {
      docNumber: 'Thông tư 32/2018/TT-BGDĐT',
      issueDate: '2018-12-26',
      curriculumVersion: 'CTGDPT-2018'
    },
    dataSource: 'official_curriculum',
    sourceVerificationNote: 'Biên soạn bám sát Yêu cầu cần đạt Toán 3 theo Thông tư 32/2018/TT-BGDĐT.',
    status: 'verified'
  },

  // ================= GRADE 4 =================
  {
    id: 'lesson-math-401',
    topicId: 'topic-math-g4-2',
    subjectId: 'toan',
    grade: 4,
    semester: 2,
    title: 'Khái niệm phân số và phân số bằng nhau',
    lessonCode: 'TOAN4-CH2-B01',
    order: 1,
    curriculum: 'kntt',
    chapter: 'Chương 2: Phân số',
    lessonType: 'lesson',
    estimatedDuration: 18,
    difficulty: 'trung_binh',
    visualDiagramKey: 'fraction_model',
    visualDiagramCaption: 'Mô hình trực quan biểu diễn phân số 3/4 và phân số bằng nhau 1/2 = 2/4',
    workedExamples: [
      {
        title: 'Rút gọn phân số về tối giản',
        problem: 'Rút gọn phân số 12/18 về phân số tối giản',
        steps: [
          'Bước 1: Tìm số tự nhiên lớn hơn 1 mà cả 12 và 18 cùng chia hết (số 6).',
          'Bước 2: Chia cả tử số và mẫu số cho 6: (12 : 6) / (18 : 6) = 2/3.',
          'Bước 3: Kiểm tra 2 và 3 không cùng chia hết cho số nào lớn hơn 1 nên 2/3 là tối giản.',
        ],
        answer: '12/18 = 2/3',
      },
    ],
    objectives: [
      'Nhận biết được phân số gồm có tử số và mẫu số (với mẫu số khác 0).',
      'Hiểu ý nghĩa của phân số: tử số chỉ số phần bằng nhau được lấy, mẫu số chỉ tổng số phần bằng nhau chia ra.',
      'Vận dụng tính chất cơ bản của phân số để tìm phân số bằng nhau và rút gọn phân số.'
    ],
    coreKnowledge: [
      'Mỗi phân số gồm tử số (viết trên gạch ngang) và mẫu số (viết dưới gạch ngang, khác 0).',
      'Nếu nhân cả tử số và mẫu số của một phân số với cùng một số tự nhiên khác 0 thì được một phân số bằng phân số đã cho: a/b = (a × m)/(b × m).',
      'Nếu cả tử số và mẫu số của một phân số cùng chia hết cho một số tự nhiên khác 0 thì khi chia cả tử số và mẫu số cho số đó ta được một phân số bằng phân số đã cho: a/b = (a : n)/(b : n).'
    ],
    termsAndDefinitions: [
      { term: 'Tử số', definition: 'Số tự nhiên viết trên dấu gạch ngang, chỉ số phần đã lấy.' },
      { term: 'Mẫu số', definition: 'Số tự nhiên khác 0 viết dưới dấu gạch ngang, chỉ tổng số phần bằng nhau mà đơn vị được chia ra.' },
      { term: 'Phân số tối giản', definition: 'Phân số có tử số và mẫu số không cùng chia hết cho một số tự nhiên nào lớn hơn 1.' }
    ],
    illustrations: [
      'Mô hình chia chiếc bánh pizza tròn thành 4 phần bằng nhau, lấy 3 phần biểu thị 3/4.',
      'Sơ đồ thanh đo phân số trực quan biểu thị 1/2 = 2/4 = 4/8.'
    ],
    commonMisconceptions: [
      'Nhầm lẫn mẫu số bằng 0 (quy tắc bắt buộc: mẫu số luôn khác 0).',
      'Chỉ nhân hoặc chia tử số mà quên nhân hoặc chia mẫu số khi tìm phân số bằng nhau.',
      'Nghĩ rằng phân số có tử số lớn hơn thì luôn lớn hơn, mà không quy đồng mẫu số.'
    ],
    summary: 'Phân số a/b biểu thị thương của phép chia a : b. Để tạo phân số bằng nhau, ta nhân hoặc chia cả tử và mẫu với cùng một số tự nhiên khác 0.',
    officialReference: {
      docNumber: 'Thông tư 32/2018/TT-BGDĐT & TT 17/2025/TT-BGDĐT',
      issueDate: '2018-12-26 (TT 17/2025 ngày 22/08/2025)',
      curriculumVersion: 'CTGDPT-2018-TT17-2025'
    },
    dataSource: 'official_curriculum',
    sourceVerificationNote: 'Biên soạn bám sát Yêu cầu cần đạt Toán 4 về phân số theo Chương trình GDPT 2018.',
    status: 'verified',
    interactiveContent: {
      sections: [
        {
          title: '1. Khám phá cùng EduBot: Phân số là gì?',
          content: 'Robot EduBot có một thanh năng lượng được chia thành 4 phần bằng nhau. EduBot đã nạp năng lượng được 3 phần. Ta nói EduBot đã sạc được 3/4 thanh năng lượng! Số 3 là tử số, số 4 là mẫu số.',
          example: 'Ví dụ: Một quả cam bổ làm 6 miếng đều nhau. Em ăn 2 miếng. Phân số chỉ số cam em đã ăn là 2/6 quả cam.',
          checkpointQuestion: {
            question: 'Trong phân số 5/8, số nào là mẫu số và nó có ý nghĩa gì?',
            options: [
              'Số 5 là mẫu số, chỉ số phần lấy đi',
              'Số 8 là mẫu số, chỉ tổng số phần bằng nhau được chia ra',
              'Cả số 5 và 8 đều là mẫu số'
            ],
            correctAnswer: 1,
            explanation: 'Mẫu số viết dưới dấu gạch ngang (là số 8), chỉ tổng số phần bằng nhau mà vật thể được chia thành.'
          }
        },
        {
          title: '2. Tính chất cơ bản: Bí mật phân số bằng nhau',
          content: 'Khi nhân hoặc chia cả tử số và mẫu số của một phân số với cùng một số tự nhiên khác 0, giá trị của phân số không đổi!',
          example: '1/2 = (1 × 3)/(2 × 3) = 3/6. Giống như ăn 1 nửa chiếc bánh cũng bằng ăn 3 miếng khi bánh chia làm 6 miếng.'
        }
      ]
    }
  },
  {
    id: 'lesson-sci-401',
    topicId: 'topic-sci-g4-1',
    subjectId: 'khoa-hoc',
    grade: 4,
    semester: 1,
    title: 'Nước có những tính chất gì? Vòng tuần hoàn của nước',
    lessonCode: 'KHOAHOC4-CH1-B01',
    order: 1,
    curriculum: 'kntt',
    chapter: 'Chủ đề Chất và Năng lượng',
    lessonType: 'lesson',
    estimatedDuration: 18,
    difficulty: 'co_ban',
    visualDiagramKey: 'water_cycle',
    visualDiagramCaption: 'Sơ đồ vòng tuần hoàn của nước: Bay hơi → Ngưng tụ tạo mây → Mưa rơi',
    objectives: [
      'Nêu được một số tính chất của nước: chất lỏng trong suốt, không màu, không mùi, không vị, không có hình dạng nhất định.',
      'Trình bày được ba thể của nước: thể lỏng, thể khí (hơi) và thể rắn (băng/đá).',
      'Mô tả được sơ đồ vòng tuần hoàn của nước trong tự nhiên.'
    ],
    coreKnowledge: [
      'Nước chảy từ cao xuống thấp, lan ra khắp mọi phía, thấm qua một số vật (vải, giấy) và hòa tan một số chất (đường, muối).',
      'Hiện tượng bay hơi, ngưng tụ, đông đặc và nóng chảy của nước.',
      'Vòng tuần hoàn: Nước mặt bốc hơi → ngưng tụ thành mây → tạo mưa rơi xuống.'
    ],
    termsAndDefinitions: [
      { term: 'Bay hơi', definition: 'Hiện tượng nước từ thể lỏng chuyển sang thể khí (hơi nước).' },
      { term: 'Ngưng tụ', definition: 'Hiện tượng hơi nước từ thể khí gặp lạnh chuyển thành thể lỏng.' }
    ],
    illustrations: [
      'Sơ đồ tương tác chu trình bay hơi và ngưng tụ của nước trong khí quyển.'
    ],
    commonMisconceptions: [
      'Nghĩ rằng mây là hơi nước ở thể khí (thực chất mây là vô số giọt nước li ti ở thể lỏng đã ngưng tụ).',
      'Nghĩ rằng nước có hình dạng cố định như chất rắn.'
    ],
    summary: 'Nước là tài nguyên quý giá tồn tại ở 3 thể: rắn, lỏng, khí và liên tục chuyển động theo vòng tuần hoàn trong tự nhiên.',
    officialReference: {
      docNumber: 'Thông tư 32/2018/TT-BGDĐT',
      issueDate: '2018-12-26',
      curriculumVersion: 'CTGDPT-2018'
    },
    dataSource: 'official_curriculum',
    sourceVerificationNote: 'Biên soạn bám sát Yêu cầu cần đạt môn Khoa học Lớp 4 theo Thông tư 32/2018/TT-BGDĐT.',
    status: 'verified'
  },
  {
    id: 'lesson-viet-401',
    topicId: 'topic-viet-g4-1',
    subjectId: 'tieng-viet',
    grade: 4,
    semester: 1,
    title: 'Luyện từ và câu: Danh từ và các loại danh từ',
    lessonCode: 'TIENGVIET4-TV-B01',
    order: 1,
    objectives: [
      'Hiểu khái niệm: Danh từ là từ chỉ sự vật (người, vật, hiện tượng, khái niệm hoặc đơn vị).',
      'Phân biệt danh từ chung và danh từ riêng.',
      'Biết quy tắc viết hoa danh từ riêng trong Tiếng Việt.'
    ],
    coreKnowledge: [
      'Danh từ chung là tên của một loại sự vật (sông, núi, học sinh, bút mực).',
      'Danh từ riêng là tên riêng của một sự vật cụ thể (Hà Nội, sông Hồng, Nguyễn Du). Danh từ riêng luôn phải viết hoa chữ cái đầu của mỗi tiếng tạo thành tên đó.'
    ],
    termsAndDefinitions: [
      { term: 'Danh từ', definition: 'Từ chỉ người, vật, hiện tượng tự nhiên, thời gian, đơn vị.' },
      { term: 'Danh từ riêng', definition: 'Tên gọi xác định của một đối tượng đơn lẻ, luôn viết hoa.' }
    ],
    illustrations: ['Bảng phân biệt danh từ chung (học sinh) và danh từ riêng (Bạn Tuấn, Trường Thăng Long).'],
    commonMisconceptions: [
      'Quên viết hoa các tiếng trong tên người hoặc tên địa danh Việt Nam.',
      'Nhầm lẫn động từ chỉ hoạt động với danh từ chỉ hiện tượng (mưa rơi vs cơn mưa).'
    ],
    summary: 'Danh từ là từ chỉ sự vật. Danh từ riêng luôn phải viết hoa.',
    officialReference: {
      docNumber: 'Thông tư 32/2018/TT-BGDĐT',
      issueDate: '2018-12-26',
      curriculumVersion: 'CTGDPT-2018'
    },
    dataSource: 'official_curriculum',
    sourceVerificationNote: 'Biên soạn bám sát Yêu cầu cần đạt môn Tiếng Việt Lớp 4 theo Thông tư 32/2018/TT-BGDĐT.',
    status: 'verified'
  },

  // ================= GRADE 5 =================
  {
    id: 'lesson-math-501',
    topicId: 'topic-math-g5-1',
    subjectId: 'toan',
    grade: 5,
    semester: 1,
    title: 'Khái niệm số thập phân và hàng của số thập phân',
    lessonCode: 'TOAN5-CH1-B01',
    order: 1,
    objectives: [
      'Nhận biết được cấu tạo của số thập phân gồm phần nguyên và phần thập phân ngăn cách bởi dấu phẩy.',
      'Đọc, viết đúng các số thập phân và xác định giá trị theo vị trí của từng chữ số ở mỗi hàng.',
      'Chuyển đổi linh hoạt giữa phân số thập phân và số thập phân.'
    ],
    coreKnowledge: [
      'Mỗi số thập phân gồm hai phần: phần nguyên (đứng trước dấu phẩy) và phần thập phân (đứng sau dấu phẩy).',
      'Các hàng phần thập phân lần lượt từ trái sang phải là: hàng phần mười, hàng phần trăm, hàng phần nghìn.',
      'Ví dụ: 15,246 đọc là "Mười lăm phẩy hai trăm bốn mươi sáu".'
    ],
    termsAndDefinitions: [
      { term: 'Phần nguyên', definition: 'Phần đứng bên trái dấu phẩy, có các hàng đơn vị, chục, trăm...' },
      { term: 'Phần thập phân', definition: 'Phần đứng bên phải dấu phẩy, có các hàng phần mười, phần trăm, phần nghìn...' }
    ],
    illustrations: ['Bảng kẻ phân chia giá trị các hàng trong số thập phân.'],
    commonMisconceptions: [
      'Đọc sai hàng phần thập phân (ví dụ nhầm 0,05 là 5 phần mười thay vì 5 phần trăm).',
      'Nghĩ rằng số thập phân có nhiều chữ số hơn ở phần thập phân thì luôn lớn hơn (ví dụ nhầm 0,15 > 0,2).'
    ],
    summary: 'Số thập phân gồm phần nguyên và phần thập phân tách nhau bởi dấu phẩy. Để so sánh số thập phân, ta so sánh phần nguyên trước, sau đó đến từng hàng phần thập phân.',
    officialReference: {
      docNumber: 'Thông tư 32/2018/TT-BGDĐT',
      issueDate: '2018-12-26',
      curriculumVersion: 'CTGDPT-2018'
    },
    dataSource: 'official_curriculum',
    sourceVerificationNote: 'Biên soạn bám sát Yêu cầu cần đạt môn Toán Lớp 5 theo Thông tư 32/2018/TT-BGDĐT.',
    status: 'verified'
  }
];

// Rich Exercise Bank: Every exercise set has minimum 10 questions with varied types!
export const initialExercises: ExerciseSet[] = [
  // Exercise Set for Grade 4 - Math
  {
    id: 'ex-math-401',
    title: 'Luyện tập toàn diện: Phân Số Bằng Nhau & Rút Gọn (10 Câu)',
    subjectId: 'toan',
    grade: 4,
    lessonId: 'lesson-math-401',
    durationMinutes: 20,
    totalPoints: 10,
    questions: [
      {
        id: 'q1',
        lessonId: 'lesson-math-401',
        subjectId: 'toan',
        grade: 4,
        type: 'single_choice',
        difficulty: 'nhan_biet',
        questionText: 'Trong phân số 7/12, tử số và mẫu số lần lượt là:',
        options: [
          'Tử số là 12, mẫu số là 7',
          'Tử số là 7, mẫu số là 12',
          'Cả hai đều là tử số',
          'Không xác định được'
        ],
        correctAnswer: 1,
        explanation: 'Số viết trên dấu gạch ngang là tử số (7), số viết dưới dấu gạch ngang là mẫu số (12).',
        pedagogicalHint: 'Hãy nhớ: "Tử trên, Mẫu dưới" giống như mẹ cõng con nhé!'
      },
      {
        id: 'q2',
        lessonId: 'lesson-math-401',
        subjectId: 'toan',
        grade: 4,
        type: 'single_choice',
        difficulty: 'thong_hieu',
        questionText: 'Phân số nào dưới đây bằng phân số 3/5?',
        options: ['6/10', '9/12', '5/3', '6/15'],
        correctAnswer: 0,
        explanation: 'Nhân cả tử số và mẫu số của 3/5 với 2: (3 × 2) / (5 × 2) = 6/10.',
        pedagogicalHint: 'Thử nhân cả tử và mẫu của 3/5 với cùng số 2 xem ra phân số nào nhé.'
      },
      {
        id: 'q3',
        lessonId: 'lesson-math-401',
        subjectId: 'toan',
        grade: 4,
        type: 'true_false',
        difficulty: 'nhan_biet',
        questionText: 'Mẫu số của một phân số có thể bằng 0. Đúng hay Sai?',
        correctAnswer: false,
        explanation: 'Sai! Quy tắc bất di bất dịch của toán học: Mẫu số luôn luôn phải khác 0 vì phép chia cho 0 không có nghĩa.',
        pedagogicalHint: 'Có bao giờ ta chia chiếc bánh cho 0 người được không bạn?'
      },
      {
        id: 'q4',
        lessonId: 'lesson-math-401',
        subjectId: 'toan',
        grade: 4,
        type: 'true_false',
        difficulty: 'nhan_biet',
        questionText: 'Phân số 4/6 đã là phân số tối giản. Đúng hay Sai?',
        correctAnswer: false,
        explanation: 'Sai, vì cả 4 và 6 đều cùng chia hết cho 2. Rút gọn ta được 2/3.',
        pedagogicalHint: 'Hãy kiểm tra xem 4 và 6 có cùng chia hết cho số nào lớn hơn 1 không?'
      },
      {
        id: 'q5',
        lessonId: 'lesson-math-401',
        subjectId: 'toan',
        grade: 4,
        type: 'fill_blank',
        difficulty: 'van_dung',
        questionText: 'Rút gọn phân số 15/25 về phân số tối giản ta được kết quả là (viết dạng a/b):',
        correctAnswer: '3/5',
        explanation: 'Chia cả tử số và mẫu số cho 5: 15 : 5 = 3, 25 : 5 = 5. Kết quả là 3/5.',
        pedagogicalHint: 'Cả 15 và 25 đều tận cùng là chữ số 5 nên cùng chia hết cho 5.'
      },
      {
        id: 'q6',
        lessonId: 'lesson-math-401',
        subjectId: 'toan',
        grade: 4,
        type: 'fill_blank',
        difficulty: 'van_dung',
        questionText: 'Tìm số thích hợp điền vào dấu chấm: 2/7 = ... / 28',
        correctAnswer: '8',
        explanation: 'Mẫu số nhân 4 (7 × 4 = 28) nên tử số cũng nhân 4 (2 × 4 = 8).',
        pedagogicalHint: 'Từ 7 biến thành 28 là ta đã nhân với mấy?'
      },
      {
        id: 'q7',
        lessonId: 'lesson-math-401',
        subjectId: 'toan',
        grade: 4,
        type: 'matching',
        difficulty: 'thong_hieu',
        questionText: 'Ghép cặp các phân số bằng nhau ở hai cột:',
        correctAnswer: { '1/2': '4/8', '2/3': '6/9', '3/4': '9/12' },
        pairs: [
          { left: '1/2', right: '4/8' },
          { left: '2/3', right: '6/9' },
          { left: '3/4', right: '9/12' }
        ],
        explanation: '1/2 = 4/8 (nhân 4); 2/3 = 6/9 (nhân 3); 3/4 = 9/12 (nhân 3).',
        pedagogicalHint: 'Rút gọn các phân số ở cột phải xem có ra phân số ở cột trái không nhé.'
      },
      {
        id: 'q8',
        lessonId: 'lesson-math-401',
        subjectId: 'toan',
        grade: 4,
        type: 'step_math',
        difficulty: 'van_dung_cao',
        questionText: 'Giải bài toán từng bước: Tìm x biết x/18 = 2/3',
        correctAnswer: '12',
        explanation: 'Vì mẫu số 18 = 3 × 6, nên tử số x = 2 × 6 = 12.',
        pedagogicalHint: 'Nhìn vào mẫu số: từ 3 làm thế nào để biến thành 18? Ta nhân với mấy?',
        steps: [
          { stepNumber: 1, instruction: 'Quan sát mẫu số', formula: '18 = 3 × 6', solution: 'Mẫu số được nhân với 6' },
          { stepNumber: 2, instruction: 'Áp dụng tính chất cơ bản nhân cả tử với 6', formula: 'x = 2 × 6', solution: 'x = 12' }
        ]
      },
      {
        id: 'q9',
        lessonId: 'lesson-math-401',
        subjectId: 'toan',
        grade: 4,
        type: 'single_choice',
        difficulty: 'thong_hieu',
        questionText: 'Trong các phân số sau, phân số nào là phân số tối giản?',
        options: ['6/8', '9/15', '5/7', '10/20'],
        correctAnswer: 2,
        explanation: '5/7 là phân số tối giản vì 5 và 7 không cùng chia hết cho số tự nhiên nào lớn hơn 1.',
        pedagogicalHint: 'Tìm phân số mà tử và mẫu không thể cùng chia cho số nào lớn hơn 1.'
      },
      {
        id: 'q10',
        lessonId: 'lesson-math-401',
        subjectId: 'toan',
        grade: 4,
        type: 'short_answer',
        difficulty: 'van_dung',
        questionText: 'Mẹ mua một chiếc bánh pizza chia làm 8 miếng bằng nhau. Nam ăn 2 miếng, Mai ăn 3 miếng. Cả hai bạn đã ăn hết bao nhiêu phần chiếc bánh?',
        correctAnswer: '5/8',
        explanation: 'Tổng số miếng hai bạn ăn là 2 + 3 = 5 miếng. Chiếc bánh chia làm 8 miếng nên phân số chỉ số bánh đã ăn là 5/8.',
        pedagogicalHint: 'Cộng số miếng Nam và Mai đã ăn rồi viết dưới dạng phân số có mẫu số là 8 nhé.'
      }
    ]
  },

  // Exercise Set for Grade 1 - Math (10 questions)
  {
    id: 'ex-math-101',
    title: 'Thử Thách Toán 1: Đếm và So Sánh Số Trong Phạm Vi 10',
    subjectId: 'toan',
    grade: 1,
    lessonId: 'lesson-math-101',
    durationMinutes: 15,
    totalPoints: 10,
    questions: [
      {
        id: 'q1-1',
        lessonId: 'lesson-math-101',
        subjectId: 'toan',
        grade: 1,
        type: 'single_choice',
        difficulty: 'nhan_biet',
        questionText: 'Có bao nhiêu ngôi sao ở đây: ⭐ ⭐ ⭐ ⭐ ⭐ ?',
        options: ['3 ngôi sao', '4 ngôi sao', '5 ngôi sao', '6 ngôi sao'],
        correctAnswer: 2,
        explanation: 'Bé đếm: một, hai, ba, bốn, năm. Có tất cả 5 ngôi sao.',
        pedagogicalHint: 'Chỉ tay vào từng ngôi sao và đếm chậm rãi nhé bạn nhỏ!'
      },
      {
        id: 'q1-2',
        lessonId: 'lesson-math-101',
        subjectId: 'toan',
        grade: 1,
        type: 'single_choice',
        difficulty: 'thong_hieu',
        questionText: 'Điền dấu thích hợp vào chỗ chấm: 8 ... 6',
        options: ['>', '<', '=', '+'],
        correctAnswer: 0,
        explanation: 'Vì 8 nhiều hơn 6 nên ta viết 8 > 6.',
        pedagogicalHint: 'Số 8 đứng sau số 6 nên số 8 lớn hơn số 6 đấy.'
      },
      {
        id: 'q1-3',
        lessonId: 'lesson-math-101',
        subjectId: 'toan',
        grade: 1,
        type: 'true_false',
        difficulty: 'nhan_biet',
        questionText: 'Số 0 là số bé nhất trong các số từ 0 đến 10. Đúng hay Sai?',
        correctAnswer: true,
        explanation: 'Đúng! Số 0 biểu thị không có đồ vật nào và đứng đầu dãy số.',
        pedagogicalHint: '0 nghĩa là không có gì cả, bé nhớ nhé!'
      },
      {
        id: 'q1-4',
        lessonId: 'lesson-math-101',
        subjectId: 'toan',
        grade: 1,
        type: 'fill_blank',
        difficulty: 'nhan_biet',
        questionText: 'Số liền sau của số 4 là số mấy?',
        correctAnswer: '5',
        explanation: 'Số liền sau của 4 là 4 + 1 = 5.',
        pedagogicalHint: 'Đếm tiếp sau số 4 là số nào nhỉ?'
      },
      {
        id: 'q1-5',
        lessonId: 'lesson-math-101',
        subjectId: 'toan',
        grade: 1,
        type: 'fill_blank',
        difficulty: 'thong_hieu',
        questionText: 'Số liền trước của số 9 là số mấy?',
        correctAnswer: '8',
        explanation: 'Số liền trước của 9 là 9 - 1 = 8.',
        pedagogicalHint: 'Số nào đứng ngay trước số 9 trong dãy số đếm?'
      },
      {
        id: 'q1-6',
        lessonId: 'lesson-math-101',
        subjectId: 'toan',
        grade: 1,
        type: 'single_choice',
        difficulty: 'thong_hieu',
        questionText: 'Dãy số nào dưới đây được xếp theo thứ tự từ bé đến lớn?',
        options: ['2, 5, 4, 7', '1, 3, 6, 9', '8, 6, 4, 2', '9, 7, 5, 3'],
        correctAnswer: 1,
        explanation: 'Dãy 1, 3, 6, 9 tăng dần theo thứ tự từ bé đến lớn.',
        pedagogicalHint: 'Bé tìm dãy số mà số sau luôn lớn hơn số trước nhé.'
      },
      {
        id: 'q1-7',
        lessonId: 'lesson-math-101',
        subjectId: 'toan',
        grade: 1,
        type: 'true_false',
        difficulty: 'nhan_biet',
        questionText: 'Phép so sánh 7 < 7 là Đúng hay Sai?',
        correctAnswer: false,
        explanation: 'Sai! 7 bằng 7 nên ta phải viết là 7 = 7.',
        pedagogicalHint: 'Hai số giống nhau thì dùng dấu gì nhỉ?'
      },
      {
        id: 'q1-8',
        lessonId: 'lesson-math-101',
        subjectId: 'toan',
        grade: 1,
        type: 'matching',
        difficulty: 'thong_hieu',
        questionText: 'Nối chữ số với cách đọc đúng:',
        correctAnswer: { '3': 'ba', '7': 'bảy', '10': 'mười' },
        pairs: [
          { left: '3', right: 'ba' },
          { left: '7', right: 'bảy' },
          { left: '10', right: 'mười' }
        ],
        explanation: '3 đọc là ba, 7 đọc là bảy, 10 đọc là mười.',
        pedagogicalHint: 'Đọc to từng số lên để ghép đúng nha.'
      },
      {
        id: 'q1-9',
        lessonId: 'lesson-math-101',
        subjectId: 'toan',
        grade: 1,
        type: 'fill_blank',
        difficulty: 'van_dung',
        questionText: 'Lan có 4 bông hoa, Mai có nhiều hơn Lan 2 bông hoa. Mai có mấy bông hoa?',
        correctAnswer: '6',
        explanation: 'Mai có số bông hoa là: 4 + 2 = 6 bông hoa.',
        pedagogicalHint: 'Nhiều hơn 2 nghĩa là lấy 4 cộng thêm 2.'
      },
      {
        id: 'q1-10',
        lessonId: 'lesson-math-101',
        subjectId: 'toan',
        grade: 1,
        type: 'short_answer',
        difficulty: 'van_dung',
        questionText: 'Trong các số 2, 8, 5, 9, số nào là số lớn nhất?',
        correctAnswer: '9',
        explanation: 'Số 9 đứng sau cùng trong dãy số nên 9 là số lớn nhất.',
        pedagogicalHint: 'So sánh 4 số xem số nào nhiều nhất nhé.'
      }
    ]
  },

  // Exercise Set for Grade 2 - Math (10 questions)
  {
    id: 'ex-math-201',
    title: 'Thử Thách Toán 2: Phép Cộng Có Nhớ Trong Phạm Vi 100 (10 Câu)',
    subjectId: 'toan',
    grade: 2,
    lessonId: 'lesson-math-201',
    durationMinutes: 15,
    totalPoints: 10,
    questions: [
      {
        id: 'q2-1',
        lessonId: 'lesson-math-201',
        subjectId: 'toan',
        grade: 2,
        type: 'single_choice',
        difficulty: 'nhan_biet',
        questionText: 'Kết quả của phép tính 28 + 15 là bao nhiêu?',
        options: ['33', '43', '42', '35'],
        correctAnswer: 1,
        explanation: '8 + 5 = 13 viết 3 nhớ 1; 2 + 1 = 3, thêm 1 bằng 4. Kết quả là 43.',
        pedagogicalHint: 'Nhớ cộng thêm 1 vào hàng chục sau khi cộng hàng đơn vị nhé!'
      },
      {
        id: 'q2-2',
        lessonId: 'lesson-math-201',
        subjectId: 'toan',
        grade: 2,
        type: 'fill_blank',
        difficulty: 'nhan_biet',
        questionText: 'Tính nhẩm: 47 + 25 = ...',
        correctAnswer: '72',
        explanation: '7 + 5 = 12 viết 2 nhớ 1; 4 + 2 + 1 = 7. Kết quả là 72.',
        pedagogicalHint: 'Cộng 7 + 5 trước, viết 2 và nhớ 1 sang hàng chục.'
      },
      {
        id: 'q2-3',
        lessonId: 'lesson-math-201',
        subjectId: 'toan',
        grade: 2,
        type: 'true_false',
        difficulty: 'thong_hieu',
        questionText: 'Phép tính 38 + 25 cho kết quả bằng 53. Đúng hay Sai?',
        correctAnswer: false,
        explanation: 'Sai! 8 + 5 = 13 nhớ 1 sang hàng chục, nên 3 + 2 + 1 = 6, kết quả đúng là 63.',
        pedagogicalHint: 'Hãy kiểm tra xem bạn đã cộng thêm số nhớ vào hàng chục chưa!'
      },
      {
        id: 'q2-4',
        lessonId: 'lesson-math-201',
        subjectId: 'toan',
        grade: 2,
        type: 'single_choice',
        difficulty: 'thong_hieu',
        questionText: 'Trong phép cộng 36 + 29 = 65, các số 36 và 29 được gọi là gì?',
        options: ['Tổng', 'Số hạng', 'Số bị trừ', 'Hiệu'],
        correctAnswer: 1,
        explanation: 'Các số đem cộng lại với nhau gọi là số hạng, kết quả gọi là tổng.',
        pedagogicalHint: 'Tên gọi các thành phần trong phép cộng là Số hạng + Số hạng = Tổng.'
      },
      {
        id: 'q2-5',
        lessonId: 'lesson-math-201',
        subjectId: 'toan',
        grade: 2,
        type: 'short_answer',
        difficulty: 'van_dung',
        questionText: 'Lan có 39 viên kẹo, mẹ cho Lan thêm 16 viên nữa. Hỏi Lan có tất cả bao nhiêu viên kẹo?',
        correctAnswer: '55',
        explanation: 'Số kẹo Lan có tất cả là: 39 + 16 = 55 (viên kẹo).',
        pedagogicalHint: 'Thực hiện phép cộng có nhớ 39 + 16.'
      },
      {
        id: 'q2-6',
        lessonId: 'lesson-math-201',
        subjectId: 'toan',
        grade: 2,
        type: 'fill_blank',
        difficulty: 'thong_hieu',
        questionText: 'Điền số thích hợp vào chỗ chấm: 54 + ... = 70',
        correctAnswer: '16',
        explanation: 'Ta lấy 70 - 54 = 16. Kiểm tra lại: 54 + 16 = 70.',
        pedagogicalHint: '4 cộng mấy để được số tròn chục có tận cùng là 0 (tức là 10)?'
      },
      {
        id: 'q2-7',
        lessonId: 'lesson-math-201',
        subjectId: 'toan',
        grade: 2,
        type: 'single_choice',
        difficulty: 'van_dung',
        questionText: 'Tổng nào sau đây lớn nhất?',
        options: ['29 + 18', '35 + 17', '24 + 27', '19 + 30'],
        correctAnswer: 1,
        explanation: '29+18=47; 35+17=52; 24+27=51; 19+30=49. Tổng lớn nhất là 52 (35 + 17).',
        pedagogicalHint: 'Hãy tính cẩn thận từng phép cộng rồi so sánh kết quả.'
      },
      {
        id: 'q2-8',
        lessonId: 'lesson-math-201',
        subjectId: 'toan',
        grade: 2,
        type: 'matching',
        difficulty: 'thong_hieu',
        questionText: 'Nối phép tính với kết quả đúng:',
        correctAnswer: { '18 + 14': '32', '27 + 16': '43', '45 + 19': '64' },
        pairs: [
          { left: '18 + 14', right: '32' },
          { left: '27 + 16', right: '43' },
          { left: '45 + 19', right: '64' }
        ],
        explanation: '18 + 14 = 32; 27 + 16 = 43; 45 + 19 = 64.',
        pedagogicalHint: 'Nhẩm hàng đơn vị trước để loại trừ nhanh các đáp án.'
      },
      {
        id: 'q2-9',
        lessonId: 'lesson-math-201',
        subjectId: 'toan',
        grade: 2,
        type: 'step_math',
        difficulty: 'van_dung_cao',
        questionText: 'Robot EduBot có 28 pin xanh và 37 pin vàng. Tính tổng số pin EduBot có:',
        correctAnswer: '65',
        explanation: '8 + 7 = 15 viết 5 nhớ 1. 2 + 3 = 5, thêm 1 nhớ bằng 6. Tổng là 65.',
        pedagogicalHint: 'Cộng theo hai bước: hàng đơn vị trước rồi hàng chục cộng thêm số nhớ.',
        steps: [
          { stepNumber: 1, instruction: 'Cộng hàng đơn vị: 8 + 7', formula: '8 + 7 = 15', solution: 'Viết 5 nhớ 1' },
          { stepNumber: 2, instruction: 'Cộng hàng chục thêm 1 nhớ', formula: '2 + 3 + 1', solution: '65' }
        ]
      },
      {
        id: 'q2-10',
        lessonId: 'lesson-math-201',
        subjectId: 'toan',
        grade: 2,
        type: 'true_false',
        difficulty: 'nhan_biet',
        questionText: 'Khi đặt tính cộng theo cột dọc, ta phải viết hàng đơn vị thẳng cột với hàng đơn vị. Đúng hay Sai?',
        correctAnswer: true,
        explanation: 'Đúng! Đặt tính thẳng cột giúp tránh nhầm lẫn khi cộng hàng đơn vị và hàng chục.',
        pedagogicalHint: 'Quy tắc vàng đặt tính: thẳng hàng thẳng cột.'
      }
    ]
  },

  // Exercise Set for Grade 3 - Math (10 questions)
  {
    id: 'ex-math-301',
    title: 'Thử Thách Toán 3: Bảng Nhân 7, 8, 9 & Giảm Một Số Lần (10 Câu)',
    subjectId: 'toan',
    grade: 3,
    lessonId: 'lesson-math-301',
    durationMinutes: 15,
    totalPoints: 10,
    questions: [
      {
        id: 'q3-1',
        lessonId: 'lesson-math-301',
        subjectId: 'toan',
        grade: 3,
        type: 'single_choice',
        difficulty: 'nhan_biet',
        questionText: 'Kết quả của phép nhân 7 × 8 là bao nhiêu?',
        options: ['54', '56', '63', '48'],
        correctAnswer: 1,
        explanation: 'Theo bảng nhân 7, 7 × 8 = 56.',
        pedagogicalHint: 'Nhẩm lại bảng nhân 7: 7 × 7 = 49, thêm 7 nữa bằng bao nhiêu?'
      },
      {
        id: 'q3-2',
        lessonId: 'lesson-math-301',
        subjectId: 'toan',
        grade: 3,
        type: 'fill_blank',
        difficulty: 'nhan_biet',
        questionText: 'Tính: 9 × 6 = ...',
        correctAnswer: '54',
        explanation: 'Theo bảng nhân 9: 9 × 6 = 54.',
        pedagogicalHint: 'Mẹo nhân 9: 9 × 6 = 60 - 6.'
      },
      {
        id: 'q3-3',
        lessonId: 'lesson-math-301',
        subjectId: 'toan',
        grade: 3,
        type: 'single_choice',
        difficulty: 'thong_hieu',
        questionText: 'Giảm số 24 đi 3 lần ta được số nào?',
        options: ['21', '8', '72', '27'],
        correctAnswer: 1,
        explanation: 'Muốn giảm một số đi 3 lần, ta lấy số đó chia cho 3: 24 : 3 = 8.',
        pedagogicalHint: 'Phân biệt "giảm đi 3 lần" (phép chia) với "giảm đi 3 đơn vị" (phép trừ)!'
      },
      {
        id: 'q3-4',
        lessonId: 'lesson-math-301',
        subjectId: 'toan',
        grade: 3,
        type: 'true_false',
        difficulty: 'thong_hieu',
        questionText: 'Giảm 32 đi 4 lần thì ta làm phép tính 32 - 4 = 28. Đúng hay Sai?',
        correctAnswer: false,
        explanation: 'Sai! "Giảm đi 4 lần" phải làm phép chia 32 : 4 = 8. Còn 32 - 4 là giảm đi 4 đơn vị.',
        pedagogicalHint: 'Chú ý chữ "lần" hay "đơn vị" ở cuối câu hỏi!'
      },
      {
        id: 'q3-5',
        lessonId: 'lesson-math-301',
        subjectId: 'toan',
        grade: 3,
        type: 'short_answer',
        difficulty: 'van_dung',
        questionText: 'Một băng giấy dài 45cm, người ta cắt giảm độ dài đi 5 lần. Hỏi băng giấy mới dài bao nhiêu cm?',
        correctAnswer: '9',
        explanation: 'Độ dài băng giấy mới là: 45 : 5 = 9 (cm).',
        pedagogicalHint: 'Lấy 45 chia cho 5 nhé!'
      },
      {
        id: 'q3-6',
        lessonId: 'lesson-math-301',
        subjectId: 'toan',
        grade: 3,
        type: 'fill_blank',
        difficulty: 'thong_hieu',
        questionText: 'Điền số thích hợp: 8 × ... = 64',
        correctAnswer: '8',
        explanation: 'Vì 8 × 8 = 64 nên số cần điền là 8.',
        pedagogicalHint: 'Nhẩm bảng nhân 8 xem 8 nhân mấy bằng 64.'
      },
      {
        id: 'q3-7',
        lessonId: 'lesson-math-301',
        subjectId: 'toan',
        grade: 3,
        type: 'matching',
        difficulty: 'thong_hieu',
        questionText: 'Nối phép tính với kết quả đúng:',
        correctAnswer: { '7 × 9': '63', '8 × 7': '56', '9 × 8': '72' },
        pairs: [
          { left: '7 × 9', right: '63' },
          { left: '8 × 7', right: '56' },
          { left: '9 × 8', right: '72' }
        ],
        explanation: '7 × 9 = 63; 8 × 7 = 56; 9 × 8 = 72.',
        pedagogicalHint: 'Kiểm tra hàng đơn vị của từng tích để ghép chính xác.'
      },
      {
        id: 'q3-8',
        lessonId: 'lesson-math-301',
        subjectId: 'toan',
        grade: 3,
        type: 'single_choice',
        difficulty: 'van_dung',
        questionText: 'Mỗi hộp có 8 chiếc bút chì. Hỏi 7 hộp như thế có tất cả bao nhiêu chiếc bút chì?',
        options: ['15 chiếc', '56 chiếc', '48 chiếc', '64 chiếc'],
        correctAnswer: 1,
        explanation: 'Số bút chì trong 7 hộp là: 8 × 7 = 56 (chiếc).',
        pedagogicalHint: 'Lấy số bút trong 1 hộp nhân với số hộp.'
      },
      {
        id: 'q3-9',
        lessonId: 'lesson-math-301',
        subjectId: 'toan',
        grade: 3,
        type: 'step_math',
        difficulty: 'van_dung_cao',
        questionText: 'Mẹ hái được 42 quả cam, sau khi biếu bà thì số cam còn lại giảm đi 6 lần so với ban đầu. Hỏi mẹ còn lại bao nhiêu quả cam?',
        correctAnswer: '7',
        explanation: 'Số cam còn lại = 42 : 6 = 7 (quả).',
        pedagogicalHint: 'Xác định phép chia khi giảm đi 6 lần.',
        steps: [
          { stepNumber: 1, instruction: 'Nhận diện phép tính giảm đi 6 lần', formula: '42 : 6', solution: 'Phép chia' },
          { stepNumber: 2, instruction: 'Tính kết quả theo bảng chia 6', formula: '42 : 6', solution: '7' }
        ]
      },
      {
        id: 'q3-10',
        lessonId: 'lesson-math-301',
        subjectId: 'toan',
        grade: 3,
        type: 'true_false',
        difficulty: 'nhan_biet',
        questionText: 'Kết quả của 9 × 9 lớn hơn 80. Đúng hay Sai?',
        correctAnswer: true,
        explanation: 'Đúng! Vì 9 × 9 = 81 và 81 > 80.',
        pedagogicalHint: 'Tính 9 × 9 bằng bao nhiêu rồi so sánh với 80.'
      }
    ]
  },

  // Exercise Set for Grade 5 - Math (10 questions)
  {
    id: 'ex-math-501',
    title: 'Thử Thách Toán 5: Khái Niệm Số Thập Phân & So Sánh (10 Câu)',
    subjectId: 'toan',
    grade: 5,
    lessonId: 'lesson-math-501',
    durationMinutes: 20,
    totalPoints: 10,
    questions: [
      {
        id: 'q5-1',
        lessonId: 'lesson-math-501',
        subjectId: 'toan',
        grade: 5,
        type: 'single_choice',
        difficulty: 'nhan_biet',
        questionText: 'Trong số thập phân 84,357 chữ số 5 thuộc hàng nào?',
        options: ['Hàng phần mười', 'Hàng phần trăm', 'Hàng phần nghìn', 'Hàng chục'],
        correctAnswer: 1,
        explanation: 'Chữ số 3 là hàng phần mười, chữ số 5 là hàng phần trăm, chữ số 7 là hàng phần nghìn.',
        pedagogicalHint: 'Hàng phần trăm đứng ở vị trí thứ hai sau dấu phẩy.'
      },
      {
        id: 'q5-2',
        lessonId: 'lesson-math-501',
        subjectId: 'toan',
        grade: 5,
        type: 'single_choice',
        difficulty: 'thong_hieu',
        questionText: 'Phân số thập phân 7/100 được viết dưới dạng số thập phân là:',
        options: ['0,7', '0,07', '0,007', '7,0'],
        correctAnswer: 1,
        explanation: '7/100 có 2 chữ số 0 ở mẫu số nên phần thập phân có 2 chữ số: 0,07.',
        pedagogicalHint: 'Chia cho 100 thì dấu phẩy lùi sang trái 2 chữ số.'
      },
      {
        id: 'q5-3',
        lessonId: 'lesson-math-501',
        subjectId: 'toan',
        grade: 5,
        type: 'true_false',
        difficulty: 'thong_hieu',
        questionText: 'Số 4,2 và số 4,20 có giá trị bằng nhau. Đúng hay Sai?',
        correctAnswer: true,
        explanation: 'Đúng! Khi viết thêm hoặc bớt các chữ số 0 ở tận cùng bên phải phần thập phân thì giá trị của số thập phân không đổi.',
        pedagogicalHint: 'Chữ số 0 ở tận cùng bên phải phần thập phân có làm thay đổi giá trị không?'
      },
      {
        id: 'q5-4',
        lessonId: 'lesson-math-501',
        subjectId: 'toan',
        grade: 5,
        type: 'fill_blank',
        difficulty: 'van_dung',
        questionText: 'Viết số thập phân gồm "Năm mươi đơn vị, tám phần mười và hai phần trăm":',
        correctAnswer: '50,82',
        explanation: 'Phần nguyên là 50, phần thập phân là 82: 50,82.',
        pedagogicalHint: 'Phần nguyên viết trước dấu phẩy, 8 phần mười và 2 phần trăm viết sau dấu phẩy.'
      },
      {
        id: 'q5-5',
        lessonId: 'lesson-math-501',
        subjectId: 'toan',
        grade: 5,
        type: 'single_choice',
        difficulty: 'thong_hieu',
        questionText: 'Số thập phân nào lớn nhất trong các số sau: 0,45 ; 0,5 ; 0,405 ; 0,49 ?',
        options: ['0,45', '0,5', '0,405', '0,49'],
        correctAnswer: 1,
        explanation: 'Ta so sánh hàng phần mười: 0,5 có 5 phần mười, lớn hơn 4 phần mười của các số còn lại. (0,5 = 0,500 > 0,490).',
        pedagogicalHint: 'Đừng nhìn số chữ số, hãy so sánh hàng phần mười trước tiên nhé!'
      },
      {
        id: 'q5-6',
        lessonId: 'lesson-math-501',
        subjectId: 'toan',
        grade: 5,
        type: 'true_false',
        difficulty: 'nhan_biet',
        questionText: 'Số 0,15 lớn hơn số 0,2 vì 15 lớn hơn 2. Đúng hay Sai?',
        correctAnswer: false,
        explanation: 'Sai! 0,2 = 0,20. So sánh hàng phần mười thì 2 > 1 nên 0,2 > 0,15.',
        pedagogicalHint: 'Đây là lỗi kinh điển! Hãy quy đổi về cùng số chữ số phần thập phân: 0,20 so với 0,15.'
      },
      {
        id: 'q5-7',
        lessonId: 'lesson-math-501',
        subjectId: 'toan',
        grade: 5,
        type: 'fill_blank',
        difficulty: 'van_dung',
        questionText: 'Tìm số tự nhiên x biết: 8,7 < x < 9,4',
        correctAnswer: '9',
        explanation: 'Số tự nhiên nằm giữa 8,7 và 9,4 chỉ có số 9.',
        pedagogicalHint: 'Số tự nhiên là số không có dấu phẩy: 8, 9, 10...'
      },
      {
        id: 'q5-8',
        lessonId: 'lesson-math-501',
        subjectId: 'toan',
        grade: 5,
        type: 'matching',
        difficulty: 'thong_hieu',
        questionText: 'Nối phân số với số thập phân tương ứng:',
        correctAnswer: { '1/2': '0,5', '1/4': '0,25', '3/4': '0,75' },
        pairs: [
          { left: '1/2', right: '0,5' },
          { left: '1/4', right: '0,25' },
          { left: '3/4', right: '0,75' }
        ],
        explanation: '1/2 = 5/10 = 0,5; 1/4 = 25/100 = 0,25; 3/4 = 75/100 = 0,75.',
        pedagogicalHint: 'Quy đồng mẫu số về 10 hoặc 100 rồi đổi ra số thập phân.'
      },
      {
        id: 'q5-9',
        lessonId: 'lesson-math-501',
        subjectId: 'toan',
        grade: 5,
        type: 'step_math',
        difficulty: 'van_dung_cao',
        questionText: 'Chuyển hỗn số 3 và 4/5 thành số thập phân:',
        correctAnswer: '3,8',
        explanation: 'Phần nguyên là 3. Phân số 4/5 = (4×2)/(5×2) = 8/10 = 0,8. Vậy hỗn số đổi ra số thập phân là 3,8.',
        pedagogicalHint: 'Giữ nguyên phần nguyên 3, đổi phân số 4/5 về mẫu số 10.',
        steps: [
          { stepNumber: 1, instruction: 'Đổi phân số 4/5 về phân số thập phân mẫu 10', formula: '4/5 = 8/10', solution: '0,8' },
          { stepNumber: 2, instruction: 'Cộng phần nguyên 3 với 0,8', formula: '3 + 0,8', solution: '3,8' }
        ]
      },
      {
        id: 'q5-10',
        lessonId: 'lesson-math-501',
        subjectId: 'toan',
        grade: 5,
        type: 'short_answer',
        difficulty: 'van_dung',
        questionText: 'Viết số thập phân thích hợp vào chỗ chấm: 3m 45cm = ... m',
        correctAnswer: '3,45',
        explanation: 'Vì 1m = 100cm nên 45cm = 45/100 m = 0,45m. Do đó 3m 45cm = 3,45m.',
        pedagogicalHint: '1m bằng bao nhiêu cm nhỉ? Lấy 45 chia cho 100 nhé.'
      }
    ]
  }
];

// Knowledge Map: Node graph linking learning prerequisites across elementary math (honest 0% base; runtime computes per student)
export const initialKnowledgeNodes: KnowledgeNode[] = [
  {
    id: 'k-math-1',
    title: 'Số & Đếm 1 - 10',
    subjectId: 'toan',
    grade: 1,
    lessonId: 'lesson-math-101',
    prerequisites: [],
    nextNodes: ['k-math-2'],
    status: 'available',
    masteryPercentage: 0,
    description: 'Nền tảng đếm số lượng, so sánh lớn bé bằng trong phạm vi 10.',
    order: 1
  },
  {
    id: 'k-math-2',
    title: 'Phép cộng trừ có nhớ',
    subjectId: 'toan',
    grade: 2,
    lessonId: 'lesson-math-201',
    prerequisites: ['k-math-1'],
    nextNodes: ['k-math-3'],
    status: 'locked',
    masteryPercentage: 0,
    description: 'Quy tắc cộng trừ có nhớ trong phạm vi 100 theo cột dọc.',
    order: 2
  },
  {
    id: 'k-math-3',
    title: 'Bảng nhân chia 6, 7, 8, 9',
    subjectId: 'toan',
    grade: 3,
    lessonId: 'lesson-math-301',
    prerequisites: ['k-math-2'],
    nextNodes: ['k-math-4'],
    status: 'locked',
    masteryPercentage: 0,
    description: 'Bảng nhân chia cơ bản và bài toán gấp/giảm một số lần.',
    order: 3
  },
  {
    id: 'k-math-4',
    title: 'Phân số & Phân số bằng nhau',
    subjectId: 'toan',
    grade: 4,
    lessonId: 'lesson-math-401',
    prerequisites: ['k-math-3'],
    nextNodes: ['k-math-5'],
    status: 'locked',
    masteryPercentage: 0,
    description: 'Khái niệm tử số, mẫu số, tính chất cơ bản và rút gọn phân số.',
    order: 4
  },
  {
    id: 'k-math-5',
    title: 'Số thập phân & Bốn phép tính',
    subjectId: 'toan',
    grade: 5,
    lessonId: 'lesson-math-501',
    prerequisites: ['k-math-4'],
    nextNodes: [],
    status: 'locked',
    masteryPercentage: 0,
    description: 'Chuyển đổi phân số sang số thập phân, cộng trừ nhân chia số thập phân.',
    order: 5
  }
];

export const initialClasses: ClassRoom[] = [
  {
    id: 'class-4a1',
    code: 'EDU-4A1',
    name: 'Lớp 4A1 - Công Nghệ & Khám Phá',
    grade: 4,
    teacherId: 'user-teacher-1',
    teacherName: 'Cô Nguyễn Mai',
    studentCount: 4,
    academicYear: '2025 - 2026',
    students: [
      { id: 'user-student-1', name: 'Hoàng Tuấn', email: 'tuan.nh@edubot.edu.vn', xp: 850, progress: 85 },
      { id: 's2', name: 'Lê Minh Anh', email: 'minhanh.le@gmail.com', xp: 910, progress: 92 },
      { id: 's3', name: 'Phạm Gia Huy', email: 'giahuy@gmail.com', xp: 740, progress: 78 },
      { id: 's4', name: 'Nguyễn Thùy Dương', email: 'thuyduong@gmail.com', xp: 820, progress: 88 }
    ]
  },
  {
    id: 'class-3b',
    code: 'EDU-3B',
    name: 'Lớp 3B - Vườn Ươm Tri Thức',
    grade: 3,
    teacherId: 'user-teacher-1',
    teacherName: 'Cô Nguyễn Mai',
    studentCount: 1,
    academicYear: '2025 - 2026',
    students: [
      { id: 'user-student-2', name: 'Trần Bảo Lan', email: 'lan.tran@edubot.edu.vn', xp: 620, progress: 70 }
    ]
  },
  {
    id: 'class-5c',
    code: 'EDU-5C',
    name: 'Lớp 5C - Thủ Khoa Tương Lai',
    grade: 5,
    teacherId: 'user-teacher-1',
    teacherName: 'Cô Nguyễn Mai',
    studentCount: 1,
    academicYear: '2025 - 2026',
    students: [
      { id: 'user-student-3', name: 'Đoàn Minh Đức', email: 'duc.minh@edubot.edu.vn', xp: 1240, progress: 95 }
    ]
  }
];

export const initialAssignments: Assignment[] = [
  {
    id: 'assign-1',
    classId: 'class-4a1',
    className: 'Lớp 4A1 - Công Nghệ & Khám Phá',
    exerciseSetId: 'ex-math-401',
    title: 'Ôn tập Phân số bằng nhau & Rút gọn phân số (10 Câu)',
    subjectId: 'toan',
    grade: 4,
    deadline: '2026-11-25T23:59:59Z',
    assignedBy: 'Cô Nguyễn Mai',
    maxAttempts: 3,
    status: 'active',
    completedCount: 1,
    totalStudents: 4
  },
  {
    id: 'assign-2',
    classId: 'class-5c',
    className: 'Lớp 5C - Thủ Khoa Tương Lai',
    exerciseSetId: 'ex-math-501',
    title: 'Luyện thi: Số thập phân và so sánh các hàng',
    subjectId: 'toan',
    grade: 5,
    deadline: '2026-11-28T23:59:59Z',
    assignedBy: 'Cô Nguyễn Mai',
    maxAttempts: 3,
    status: 'active',
    completedCount: 0,
    totalStudents: 1
  }
];

export const initialSubmissions: StudentSubmission[] = [
  {
    id: 'sub-1',
    assignmentId: 'assign-1',
    exerciseSetId: 'ex-math-401',
    studentId: 'user-student-1',
    studentName: 'Hoàng Tuấn',
    grade: 4,
    answers: { q1: 1, q2: 0, q3: false, q4: false, q5: '3/5', q6: '8', q8: '12', q9: 2, q10: '5/8' },
    score: 10,
    totalCorrect: 10,
    totalQuestions: 10,
    completedAt: '2026-11-08T16:20:00Z',
    timeSpentSeconds: 420,
    feedback: 'Xuất sắc tuyệt đối 10/10! Em đã nắm rất chắc tính chất cơ bản của phân số và giải toán chuẩn xác.',
    misconceptionTags: []
  }
];

export const initialDrafts: AiDraftItem[] = [
  {
    id: 'draft-plan-1',
    type: 'lesson_plan',
    title: 'Kế hoạch bài dạy (Giáo án): Phân số bằng nhau - Toán 4',
    subjectId: 'toan',
    grade: 4,
    createdAt: '2026-11-03T10:00:00Z',
    createdBy: 'Cô Nguyễn Mai (trợ lý EduBot Teacher AI)',
    status: 'draft',
    teacherNotes: 'Cần bổ sung thêm ví dụ gắn với tình huống chia bánh sinh nhật thực tế.',
    content: {
      lessonName: 'Phân số bằng nhau',
      duration: '35 phút (1 tiết)',
      objectives: 'Học sinh nhận biết được tính chất cơ bản của phân số qua mô hình trực quan, thực hiện được rút gọn và quy đồng đơn giản.',
      teachingMethods: 'Phương pháp trực quan, thảo luận nhóm đôi, học qua trò chơi kỹ thuật số.',
      phases: [
        { name: '1. Khởi động (5 phút)', description: 'Robot EduBot kể câu chuyện hai anh em chia thanh sô cô la 4 phần và 8 phần.' },
        { name: '2. Khám phá (12 phút)', description: 'Học sinh gấp giấy màu, tô màu 1/2 và 2/4 tờ giấy để rút ra quy tắc nhân chia.' },
        { name: '3. Luyện tập (13 phút)', description: 'Làm phiếu bài tập tương tác trên EduBot AI.' },
        { name: '4. Vận dụng (5 phút)', description: 'Giải đố toán vui thực tế.' }
      ]
    }
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    action: 'Cập nhật chuẩn chương trình GDPT',
    user: 'admin@edubot.edu.vn',
    role: 'admin',
    details: 'Đã đồng bộ hóa văn bản Thông tư 17/2025/TT-BGDĐT vào cây tri thức Toán và Khoa học Lớp 1-5.',
    timestamp: '2026-11-01T08:00:00Z',
    status: 'success'
  },
  {
    id: 'log-2',
    action: 'Tạo lớp học mới',
    user: 'comai@edubot.edu.vn',
    role: 'teacher',
    details: 'Đã tạo lớp Lớp 4A1 - Công Nghệ & Khám Phá với mã lớp EDU-4A1.',
    timestamp: '2026-11-01T09:15:00Z',
    status: 'info'
  },
  {
    id: 'log-3',
    action: 'Gia sư EduBot kích hoạt',
    user: 'tuan.nh@edubot.edu.vn',
    role: 'student',
    details: 'Học sinh hỏi đáp chủ đề Rút gọn phân số với EduBot AI.',
    timestamp: '2026-11-03T14:22:00Z',
    status: 'info'
  }
];

export const initialAcademicYears: AcademicYear[] = [
  {
    id: 'ay-2025-2026',
    name: 'Năm học 2025 – 2026',
    startDate: '2025-09-05',
    endDate: '2026-05-31',
    isActive: true,
  },
  {
    id: 'ay-2026-2027',
    name: 'Năm học 2026 – 2027',
    startDate: '2026-09-05',
    endDate: '2027-05-31',
    isActive: false,
  }
];

// Bổ sung khung học liệu mẫu cho các môn ưu tiên Lớp 1–5 (trạng thái NEEDS_REVIEW / DRAFT chờ đối chiếu SGK Kết nối tri thức)
initialLessons.push(
  {
    id: 'lesson-viet-101-draft',
    topicId: 'topic-viet-g1-1',
    subjectId: 'tieng-viet',
    grade: 1,
    semester: 1,
    title: '[Mẫu] Nhận biết âm chữ, dấu thanh và ghép vần cơ bản',
    lessonCode: 'TV1-CH1-DRAFT',
    order: 2,
    sourceBook: 'Kết nối tri thức với cuộc sống (Chờ đối chiếu số trang SGK bản in)',
    objectives: [
      'Nhận diện đúng mặt chữ, phát âm chuẩn âm đầu và các thanh điệu tiếng Việt.',
      'Ghép vần đơn giản và đọc trơn từ khóa quen thuộc.'
    ],
    coreKnowledge: [
      'Tiếng Việt có 6 thanh điệu: thanh ngang, huyền, sắc, hỏi, ngã, nặng.',
      'Mỗi tiếng gồm âm đầu (hoặc khuyết), vần và thanh điệu.'
    ],
    termsAndDefinitions: [
      { term: 'Thanh điệu', definition: 'Độ cao thấp của giọng khi phát âm một tiếng (sắc, huyền, hỏi, ngã, nặng, ngang).' }
    ],
    illustrations: ['Thẻ chữ cái kèm hình minh họa đồ vật gần gũi lứa tuổi Lớp 1.'],
    commonMisconceptions: ['Nhầm dấu hỏi (?) và dấu ngã (~) khi viết chính tả.'],
    summary: 'Khung bài học mẫu môn Tiếng Việt Lớp 1 đang ở trạng thái chờ giáo viên/quản trị viên đối chiếu sách giáo khoa.',
    officialReference: {
      docNumber: 'TT 32/2018/TT-BGDĐT (Dự thảo đối chiếu)',
      issueDate: '2018-12-26',
      curriculumVersion: 'GDPT-2018'
    },
    status: 'NEEDS_REVIEW'
  },
  {
    id: 'lesson-tnxh-201-draft',
    topicId: 'topic-math-g2-1',
    subjectId: 'tu-nhien-xa-hoi',
    grade: 2,
    semester: 1,
    title: '[Mẫu] Gia đình, trường học và giữ gìn vệ sinh môi trường sống',
    lessonCode: 'TNXH2-CH1-DRAFT',
    order: 2,
    sourceBook: 'Kết nối tri thức với cuộc sống (Chờ đối chiếu bản in SGK)',
    objectives: [
      'Nêu được việc làm thể hiện tình cảm gắn bó, trách nhiệm với người thân và lớp học.',
      'Thực hành giữ vệ sinh trường lớp, bỏ rác đúng nơi quy định.'
    ],
    coreKnowledge: [
      'Các thành viên trong gia đình cùng chia sẻ công việc phù hợp lứa tuổi.',
      'Giữ lớp học sạch sẽ giúp bảo vệ sức khỏe và học tập vui vẻ.'
    ],
    termsAndDefinitions: [
      { term: 'Môi trường lớp học', definition: 'Không gian học tập chung cần được giữ gìn gọn gàng, sạch sẽ.' }
    ],
    illustrations: ['Tranh minh họa học sinh trực nhật lớp và phân loại rác thải.'],
    commonMisconceptions: ['Cho rằng việc giữ vệ sinh trường lớp chỉ là nhiệm vụ của cô lao công.'],
    summary: 'Nội dung mẫu Tự nhiên và Xã hội Lớp 2 chờ đối chiếu chuyên môn.',
    officialReference: {
      docNumber: 'TT 32/2018/TT-BGDĐT (Dự thảo đối chiếu)',
      issueDate: '2018-12-26',
      curriculumVersion: 'GDPT-2018'
    },
    status: 'NEEDS_REVIEW'
  },
  {
    id: 'lesson-eth-201-draft',
    topicId: 'topic-math-g2-1',
    subjectId: 'dao-duc',
    grade: 2,
    semester: 1,
    title: '[Mẫu] Kính trọng thầy giáo, cô giáo và yêu quý bạn bè',
    lessonCode: 'DD2-CH1-DRAFT',
    order: 3,
    sourceBook: 'Kết nối tri thức với cuộc sống (Chờ đối chiếu bản in SGK)',
    objectives: [
      'Biết nói lời lễ phép, lắng nghe thầy cô và giúp đỡ bạn bè trong học tập.',
      'Thực hiện hành vi ứng xử lịch sự, thân thiện.'
    ],
    coreKnowledge: [
      'Chào hỏi lễ phép khi gặp thầy cô, người lớn.',
      'Không trêu chọc, nói lời gây tổn thương bạn bè.'
    ],
    termsAndDefinitions: [
      { term: 'Tôn trọng', definition: 'Biết lắng nghe, cư xử đúng mực và không xâm phạm quyền của người khác.' }
    ],
    illustrations: ['Tình huống giao tiếp trong sân trường tiểu học.'],
    commonMisconceptions: ['Nghĩ rằng trêu đùa quá mức chỉ là trò vui bình thường.'],
    summary: 'Học liệu mẫu môn Đạo đức Lớp 2 ở trạng thái DRAFT chờ thẩm định.',
    officialReference: {
      docNumber: 'TT 32/2018/TT-BGDĐT (Dự thảo đối chiếu)',
      issueDate: '2018-12-26',
      curriculumVersion: 'GDPT-2018'
    },
    status: 'DRAFT'
  },
  {
    id: 'lesson-inf-301-draft',
    topicId: 'topic-inf-g3-1',
    subjectId: 'tin-hoc',
    grade: 3,
    semester: 1,
    title: '[Mẫu] Thông tin, quyết định và làm quen với bàn phím máy tính',
    lessonCode: 'TIN3-CH1-DRAFT',
    order: 2,
    sourceBook: 'Kết nối tri thức với cuộc sống (Chờ đối chiếu bản in SGK)',
    objectives: [
      'Nhận biết được ba dạng thông tin thường gặp: văn bản, âm thanh, hình ảnh.',
      'Ngồi đúng tư thế và gõ đúng hàng phím cơ sở bằng 10 ngón.'
    ],
    coreKnowledge: [
      'Con người tiếp nhận thông tin để đưa ra quyết định.',
      'Hàng phím cơ sở gồm các phím A, S, D, F, G, H, J, K, L, ;.'
    ],
    termsAndDefinitions: [
      { term: 'Thông tin', definition: 'Những gì con người tiếp nhận được từ thế giới xung quanh qua các giác quan.' }
    ],
    illustrations: ['Sơ đồ bàn phím chuẩn và tư thế ngồi máy tính đúng cho trẻ nhỏ.'],
    commonMisconceptions: ['Nhìn bàn phím và gõ bằng hai ngón trỏ thay vì đặt tay ở hàng cơ sở.'],
    summary: 'Khung bài học mẫu môn Tin học Lớp 3 cần thẩm định trước khi giảng dạy đại trà.',
    officialReference: {
      docNumber: 'TT 32/2018/TT-BGDĐT (Dự thảo đối chiếu)',
      issueDate: '2018-12-26',
      curriculumVersion: 'GDPT-2018'
    },
    status: 'NEEDS_REVIEW'
  },
  {
    id: 'lesson-tech-301-draft',
    topicId: 'topic-inf-g3-1',
    subjectId: 'cong-nghe',
    grade: 3,
    semester: 1,
    title: '[Mẫu] Tự nhiên, công nghệ và sử dụng đồ dùng điện an toàn',
    lessonCode: 'CN3-CH1-DRAFT',
    order: 3,
    sourceBook: 'Kết nối tri thức với cuộc sống (Chờ đối chiếu bản in SGK)',
    objectives: [
      'Phân biệt được đối tượng tự nhiên và sản phẩm công nghệ quanh em.',
      'Nêu được quy tắc sử dụng đèn học, quạt điện an toàn trong gia đình.'
    ],
    coreKnowledge: [
      'Sản phẩm công nghệ do con người tạo ra nhằm phục vụ đời sống.',
      'Không chạm tay ướt vào ổ cắm điện hoặc công tắc điện.'
    ],
    termsAndDefinitions: [
      { term: 'Sản phẩm công nghệ', definition: 'Vật dụng do con người thiết kế, chế tạo (quạt điện, ti vi, đèn học...).' }
    ],
    illustrations: ['Bảng so sánh cây xanh (tự nhiên) và đèn học (công nghệ).'],
    commonMisconceptions: ['Chạm tay vào phích cắm khi tay còn ướt nước.'],
    summary: 'Khung bài học mẫu môn Công nghệ Lớp 3 trạng thái DRAFT.',
    officialReference: {
      docNumber: 'TT 32/2018/TT-BGDĐT (Dự thảo đối chiếu)',
      issueDate: '2018-12-26',
      curriculumVersion: 'GDPT-2018'
    },
    status: 'DRAFT'
  },
  {
    id: 'lesson-hgi-401-draft',
    topicId: 'topic-math-g4-1',
    subjectId: 'lich-su-dia-li',
    grade: 4,
    semester: 1,
    title: '[Mẫu] Làm quen với bản đồ, phương hướng và địa phương em',
    lessonCode: 'LSDL4-CH1-DRAFT',
    order: 4,
    sourceBook: 'Kết nối tri thức với cuộc sống (Chờ đối chiếu bản in SGK)',
    objectives: [
      'Đọc được tên bản đồ, bảng chú giải, tỉ lệ và xác định 4 phương hướng chính trên bản đồ.',
      'Giới thiệu được một số nét tiêu biểu về thiên nhiên và văn hóa địa phương em.'
    ],
    coreKnowledge: [
      'Quy ước chung trên bản đồ: phía trên là hướng Bắc, phía dưới là hướng Nam, bên phải là hướng Đông, bên trái là hướng Tây.'
    ],
    termsAndDefinitions: [
      { term: 'Bảng chú giải', definition: 'Phần giải thích ý nghĩa các ký hiệu màu sắc, đường nét trên bản đồ.' }
    ],
    illustrations: ['La bàn chỉ hướng Bắc – Nam – Đông – Tây và ký hiệu bản đồ cơ bản.'],
    commonMisconceptions: ['Đảo ngược hướng Đông và hướng Tây khi xác định vị trí trên bản đồ.'],
    summary: 'Bài học mẫu Lịch sử và Địa lí Lớp 4 chờ giáo viên đối chiếu tư liệu.',
    officialReference: {
      docNumber: 'TT 32/2018/TT-BGDĐT (Dự thảo đối chiếu)',
      issueDate: '2018-12-26',
      curriculumVersion: 'GDPT-2018'
    },
    status: 'NEEDS_REVIEW'
  },
  {
    id: 'lesson-sci-501-draft',
    topicId: 'topic-sci-g5-1',
    subjectId: 'khoa-hoc',
    grade: 5,
    semester: 1,
    title: '[Mẫu] Đất, nguồn năng lượng sạch và bảo vệ môi trường',
    lessonCode: 'KH5-CH1-DRAFT',
    order: 2,
    sourceBook: 'Kết nối tri thức với cuộc sống (Chờ đối chiếu bản in SGK)',
    objectives: [
      'Trình bày được vai trò của đất và nguyên nhân gây ô nhiễm đất.',
      'Nêu được ví dụ về năng lượng tái tạo (mặt trời, gió) trong đời sống.'
    ],
    coreKnowledge: [
      'Đất chứa chất khoáng, mùn, nước và không khí cần thiết cho cây trồng.',
      'Sử dụng năng lượng mặt trời, năng lượng gió giúp giảm phát thải bảo vệ môi trường.'
    ],
    termsAndDefinitions: [
      { term: 'Năng lượng tái tạo', definition: 'Nguồn năng lượng tự nhiên được bổ sung liên tục như ánh sáng mặt trời, gió.' }
    ],
    illustrations: ['Mô hình pin năng lượng mặt trời và tuabin gió tại Việt Nam.'],
    commonMisconceptions: ['Nhầm lẫn rác thải nhựa có thể tự phân hủy nhanh như lá cây.'],
    summary: 'Bài học mẫu Khoa học Lớp 5 trạng thái NEEDS_REVIEW.',
    officialReference: {
      docNumber: 'TT 32/2018/TT-BGDĐT (Dự thảo đối chiếu)',
      issueDate: '2018-12-26',
      curriculumVersion: 'GDPT-2018'
    },
    status: 'NEEDS_REVIEW'
  }
);

for (const les of extendedLessons) {
  if (!initialLessons.some((existing) => existing.id === les.id)) {
    initialLessons.push(les);
  }
}

for (const ex of extendedExercises) {
  if (!initialExercises.some((existing) => existing.id === ex.id)) {
    initialExercises.push(ex);
  }
}
