const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://tawal-academy-backend.fly.dev/api';

export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  AUTH_LOGOUT: `${API_BASE_URL}/auth/logout`,
  AUTH_PROFILE: `${API_BASE_URL}/auth/profile`,
  
  // Admin Auth
  ADMIN_LOGIN: `${API_BASE_URL}/admin/login`,
  ADMIN_LOGOUT: `${API_BASE_URL}/admin/logout`,
  
  // Subjects
  SUBJECTS: `${API_BASE_URL}/subjects`,
  SUBJECT_BY_ID: (id) => `${API_BASE_URL}/subjects/${id}`,
  DOWNLOAD_PDF: (subjectId, pdfId) => `${API_BASE_URL}/subjects/${subjectId}/pdfs/${pdfId}/download`,
  VIEW_IMAGE: (subjectId, imageId) => `${API_BASE_URL}/subjects/${subjectId}/images/${imageId}/view`,
  RATE_SUBJECT: (id) => `${API_BASE_URL}/subjects/${id}/rate`,
  
  // Exams
  EXAM_BY_ID: (id) => `${API_BASE_URL}/exams/${id}`,
  SUBMIT_EXAM: (id) => `${API_BASE_URL}/exams/${id}/submit`,
  
  // Profile
  PROFILE: `${API_BASE_URL}/profile`,
  EXAM_HISTORY: `${API_BASE_URL}/profile/exams`,
  POINTS_HISTORY: `${API_BASE_URL}/profile/points`,
  LEADERBOARD: `${API_BASE_URL}/profile/leaderboard`,
  
  // Questions
  ASK_QUESTION: `${API_BASE_URL}/questions/ask`,
  MY_QUESTIONS: `${API_BASE_URL}/questions/my-questions`,
  
  // Notifications
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
  MARK_READ: (id) => `${API_BASE_URL}/notifications/${id}/read`,
  MARK_ALL_READ: `${API_BASE_URL}/notifications/read-all`,
  
  // Admin - Terms
  ADMIN_TERMS: `${API_BASE_URL}/admin/terms`,
  ADMIN_TERM_BY_ID: (id) => `${API_BASE_URL}/admin/terms/${id}`,
  
  // Admin - Subjects
  ADMIN_SUBJECTS: `${API_BASE_URL}/admin/subjects`,
  ADMIN_SUBJECT_BY_ID: (id) => `${API_BASE_URL}/admin/subjects/${id}`,
  ADMIN_UPLOAD_PDFS: (id) => `${API_BASE_URL}/admin/subjects/${id}/pdfs`,
  ADMIN_UPLOAD_IMAGES: (id) => `${API_BASE_URL}/admin/subjects/${id}/images`,
  ADMIN_DELETE_PDF: (subjectId, pdfId) => `${API_BASE_URL}/admin/subjects/${subjectId}/pdfs/${pdfId}`,
  ADMIN_DELETE_IMAGE: (subjectId, imageId) => `${API_BASE_URL}/admin/subjects/${subjectId}/images/${imageId}`,
  
  // Admin - Exams
  ADMIN_EXAMS: `${API_BASE_URL}/admin/exams`,
  ADMIN_EXAM_BY_ID: (id) => `${API_BASE_URL}/admin/exams/${id}`,
  ADMIN_EXAM_STATS: (id) => `${API_BASE_URL}/admin/exams/${id}/stats`,
  ADMIN_ADD_QUESTIONS_MANUAL: (id) => `${API_BASE_URL}/admin/exams/${id}/questions/manual`,
  ADMIN_ADD_QUESTIONS_EXCEL: (id) => `${API_BASE_URL}/admin/exams/${id}/questions/excel`,
  ADMIN_ADD_QUESTIONS_TEXT: (id) => `${API_BASE_URL}/admin/exams/${id}/questions/text`,
  ADMIN_DELETE_QUESTION: (examId, questionId) => `${API_BASE_URL}/admin/exams/${examId}/questions/${questionId}`,
  
  // Admin - Students
  ADMIN_STUDENTS: `${API_BASE_URL}/admin/students`,
  ADMIN_SEARCH_STUDENTS: `${API_BASE_URL}/admin/students/search`,
  ADMIN_BLOCK_STUDENT: (id) => `${API_BASE_URL}/admin/students/${id}/block`,
  ADMIN_UNBLOCK_STUDENT: (id) => `${API_BASE_URL}/admin/students/${id}/unblock`,
  ADMIN_DELETE_STUDENT: (id) => `${API_BASE_URL}/admin/students/${id}`,
  ADMIN_EXPORT_STUDENTS: `${API_BASE_URL}/admin/students/export`,
  
  // Admin - Stats
  ADMIN_STATS: `${API_BASE_URL}/admin/stats/dashboard`,
  
  // Admin - Student Questions
  ADMIN_STUDENT_QUESTIONS: `${API_BASE_URL}/admin/student-questions`,
  ADMIN_REPLY_QUESTION: (id) => `${API_BASE_URL}/admin/student-questions/${id}/reply`,
  ADMIN_DELETE_STUDENT_QUESTION: (id) => `${API_BASE_URL}/admin/student-questions/${id}`,
  
  // Admin - Notifications
  ADMIN_SEND_NOTIFICATION: `${API_BASE_URL}/admin/notifications/send`
};

export default API_BASE_URL;
