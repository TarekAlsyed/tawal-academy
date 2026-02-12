const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://tawal-academy-backend.fly.dev/api';

export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_PROFILE: '/auth/profile',
  
  // Admin Auth
  ADMIN_LOGIN: '/admin/login',
  ADMIN_LOGOUT: '/admin/logout',
  
  // Subjects (Student)
  SUBJECTS: '/subjects',
  SUBJECT_BY_ID: (id) => `/subjects/${id}`,
  DOWNLOAD_PDF: (subjectId, pdfId) => `/subjects/${subjectId}/pdfs/${pdfId}/download`,
  VIEW_IMAGE: (subjectId, imageId) => `/subjects/${subjectId}/images/${imageId}/view`,
  RATE_SUBJECT: (id) => `/subjects/${id}/rate`,
  
  // Exams (Student)
  EXAM_BY_ID: (id) => `/exams/${id}`,
  SUBMIT_EXAM: (id) => `/exams/${id}/submit`,
  EXAM_PROGRESS: (id) => `/exams/${id}/progress`,
  
  // Profile
  PROFILE: '/profile',
  EXAM_HISTORY: '/profile/exams',
  POINTS_HISTORY: '/profile/points',
  LEADERBOARD: '/profile/leaderboard',
  
  // Questions (Student)
  ASK_QUESTION: '/questions',
  MY_QUESTIONS: '/questions',
  
  // Notifications
  NOTIFICATIONS: '/notifications',
  MARK_READ: (id) => `/notifications/${id}/read`,
  MARK_ALL_READ: '/notifications/read-all',
  
  // Admin - Terms
  ADMIN_TERMS: '/admin/terms',
  ADMIN_TERM_BY_ID: (id) => `/admin/terms/${id}`,
  
  // Admin - Subjects
  ADMIN_SUBJECTS: '/admin/subjects',
  ADMIN_SUBJECT_BY_ID: (id) => `/admin/subjects/${id}`,
  ADMIN_UPLOAD_PDFS: (id) => `/admin/subjects/${id}/pdfs`,
  ADMIN_UPLOAD_IMAGES: (id) => `/admin/subjects/${id}/images`,
  ADMIN_DELETE_PDF: (subjectId, pdfId) => `/admin/subjects/${subjectId}/pdfs/${pdfId}`,
  ADMIN_DELETE_IMAGE: (subjectId, imageId) => `/admin/subjects/${subjectId}/images/${imageId}`,
  
  // Admin - Exams
  ADMIN_EXAMS: '/admin/exams',
  ADMIN_EXAM_BY_ID: (id) => `/admin/exams/${id}`,
  ADMIN_EXAM_STATS: (id) => `/admin/exams/${id}/stats`,
  ADMIN_ADD_QUESTIONS_MANUAL: (id) => `/admin/exams/${id}/questions/manual`,
  ADMIN_ADD_QUESTIONS_EXCEL: (id) => `/admin/exams/${id}/questions/excel`,
  ADMIN_ADD_QUESTIONS_TEXT: (id) => `/admin/exams/${id}/questions/text`,
  ADMIN_UPDATE_QUESTION: (examId, questionId) => `/admin/exams/${examId}/questions/${questionId}`,
  ADMIN_DELETE_QUESTION: (examId, questionId) => `/admin/exams/${examId}/questions/${questionId}`,
  
  // Admin - Students
  ADMIN_STUDENTS: '/admin/students',
  ADMIN_SEARCH_STUDENTS: '/admin/students/search',
  ADMIN_BLOCK_STUDENT: (id) => `/admin/students/${id}/block`,
  ADMIN_UNBLOCK_STUDENT: (id) => `/admin/students/${id}/unblock`,
  ADMIN_DELETE_STUDENT: (id) => `/admin/students/${id}`,
  ADMIN_STUDENTS_EXPORT: '/admin/students/export',
  
  // Admin - Stats
  ADMIN_STATS: '/admin/stats/dashboard',
  
  // Admin - Student Questions
  ADMIN_STUDENT_QUESTIONS: '/admin/questions',
  ADMIN_REPLY_QUESTION: (id) => `/admin/questions/${id}/reply`,
  ADMIN_DELETE_STUDENT_QUESTION: (id) => `/admin/questions/${id}`,
  
  // Admin - Notifications
  ADMIN_SEND_NOTIFICATION: '/admin/notifications/send'
};

export default API_BASE_URL;

