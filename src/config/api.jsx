const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://tawal-academy.alwaysdata.net/api';

export const getFileUrl = (path, addWatermark = true) => {
  if (!path) return '';
  
  // 1. Handle full URLs (Cloudinary)
  if (path.startsWith('http') || path.includes('res.cloudinary.com')) {
    let fullUrl = path.startsWith('http') ? path : `https://${path}`;
    
    // Inject Cloudinary dynamic watermark if it's a Cloudinary URL and not an admin asset
    // We only apply it to PDF files (either .pdf extension or /raw/upload/ path)
    const isPDF = fullUrl.toLowerCase().includes('.pdf') || fullUrl.includes('/raw/upload/');
    
        if (addWatermark && isPDF && fullUrl.includes('res.cloudinary.com') && !fullUrl.includes('/admin/')) {
      // Standard Cloudinary PDF Watermark: Arial 60 bold, centered, 20% opacity, all pages
      // Improved robust transformation string
      const watermark = 'l_text:Arial_60_bold:Tawal%20Academy,co_black,o_20/fl_layer_apply,g_center,a_-45/pg_all';
      
      if (fullUrl.includes('/upload/')) {
        const parts = fullUrl.split('/upload/');
        const versionPart = parts[1].split('/');
        
        // Inject watermark correctly before version or public ID
        let transformedUrl;
        if (versionPart[0].startsWith('v') && !isNaN(versionPart[0].substring(1))) {
          transformedUrl = `${parts[0]}/upload/${watermark}/${parts[1]}`;
        } else {
          transformedUrl = `${parts[0]}/upload/${watermark}/${parts[1]}`;
        }
        
        // Ensure .pdf extension is preserved to prevent white screen
        if (!transformedUrl.toLowerCase().endsWith('.pdf')) {
          if (transformedUrl.includes('?')) {
            const [urlPart, queryPart] = transformedUrl.split('?');
            transformedUrl = `${urlPart}.pdf?${queryPart}`;
          } else {
            transformedUrl = `${transformedUrl}.pdf`;
          }
        }
        return transformedUrl;
      }
    }
    return fullUrl;
  }
  
  // 2. Handle local paths (Backend uploads)
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`.replace(/([^:]\/)\/+/g, '$1');
};

export const API_ENDPOINTS = {
  // Global Upload (Cloudinary)
  UPLOAD: '/upload',

  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_PROFILE: '/auth/profile',
  
  // Admin Auth
  ADMIN_LOGIN: '/admin/login',
  ADMIN_LOGOUT: '/admin/logout',
  
  // Admin Management
  ADMIN_GET_ALL_ADMINS: '/admin/admins',
  ADMIN_CREATE_ADMIN: '/admin/create-admin',
  ADMIN_UPDATE_ADMIN: (id) => `/admin/admins/${id}`,
  ADMIN_DELETE_ADMIN: (id) => `/admin/admins/${id}`,
  ADMIN_UPDATE_PERMISSIONS: (id) => `/admin/update-permissions/${id}`,
  ADMIN_TOGGLE_SUPER_ADMIN: (id) => `/admin/admins/${id}/toggle-super`,
  
  // Subjects (Student)
  SUBJECTS: '/subjects',
  SUBJECT_BY_ID: (id) => `/subjects/${id}`,
  GET_CERTIFICATE: (id) => `/subjects/${id}/certificate`,
  DOWNLOAD_PDF: (subjectId, pdfId) => `/subjects/${subjectId}/pdfs/${pdfId}/download`,
  VIEW_IMAGE: (subjectId, imageId) => `/subjects/${subjectId}/images/${imageId}/view`,
  RATE_SUBJECT: (id) => `/subjects/${id}/rate`,
  
  // Exams (Student)
  EXAMS: '/exams',
  EXAM_BY_ID: (id) => `/exams/${id}`,
  SUBMIT_EXAM: (id) => `/exams/${id}/submit`,
  EXAM_PROGRESS: (id) => `/exams/${id}/progress`,
  REPORT_VIOLATION: '/exams/violations',
  PERSONAL_BANK: '/exams/personal-bank',
  
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
  ADMIN_UPDATE_PDF_WATERMARK: (subjectId, pdfId) => `/admin/subjects/${subjectId}/pdfs/${pdfId}/watermark`,
  ADMIN_DELETE_IMAGE: (subjectId, imageId) => `/admin/subjects/${subjectId}/images/${imageId}`,
  
  // Bulk Delete
  ADMIN_DELETE_ALL_PDFS: (id) => `/admin/subjects/${id}/pdfs/all`,
  ADMIN_DELETE_ALL_IMAGES: (id) => `/admin/subjects/${id}/images/all`,
  ADMIN_DELETE_ALL_EXAMS: (id) => `/admin/subjects/${id}/exams/all`,
  ADMIN_DELETE_ALL_QUESTIONS: (id) => `/admin/exams/${id}/questions/all`,
  
  // Admin - Exams
  ADMIN_EXAMS: '/admin/exams',
  ADMIN_EXAM_BY_ID: (id) => `/admin/exams/${id}`,
  ADMIN_EXAM_ANALYTICS: (id) => `/admin/exams/${id}/analytics`,
  ADMIN_EXAM_STATS: (id) => `/admin/exams/${id}/stats`,
  ADMIN_EXAM_ATTEMPTS: '/admin/exams/attempts/all',
  ADMIN_EXAM_ATTEMPT_BY_ID: (id) => `/admin/exams/attempts/${id}`,
  ADMIN_IMPORT_QUESTIONS: (id) => `/admin/exams/${id}/import-questions`,
  ADMIN_ADD_QUESTIONS_MANUAL: (id) => `/admin/exams/${id}/questions/manual`,
  ADMIN_ADD_QUESTIONS_EXCEL: (id) => `/admin/exams/${id}/questions/excel`,
  ADMIN_ADD_QUESTIONS_TEXT: (id) => `/admin/exams/${id}/questions/text`,
  ADMIN_UPDATE_QUESTION: (examId, questionId) => `/admin/exams/${examId}/questions/${questionId}`,
  ADMIN_DELETE_QUESTION: (examId, questionId) => `/admin/exams/${examId}/questions/${questionId}`,
  
  // Admin - Question Bank
  ADMIN_QUESTION_BANK: '/admin/question-bank',
  ADMIN_QUESTION_BANK_ITEM: (id) => `/admin/question-bank/${id}`,
  ADMIN_ADD_FROM_BANK: (examId) => `/admin/exams/${examId}/question-bank/add`,
  
  // Admin - Students
  ADMIN_STUDENTS: '/admin/students',
  ADMIN_SEARCH_STUDENTS: '/admin/students/search',
  ADMIN_BLOCK_STUDENT: (id) => `/admin/students/${id}/block`,
  ADMIN_UNBLOCK_STUDENT: (id) => `/admin/students/${id}/unblock`,
  ADMIN_UNBLOCK_DEVICE: '/admin/students/unblock-device',
  ADMIN_UNBLOCK_EMAIL: '/admin/students/unblock-email',
  ADMIN_DELETE_STUDENT: (id) => `/admin/students/${id}`,
  ADMIN_RESET_DEVICE: (id) => `/admin/students/${id}/reset-device`,
  ADMIN_STUDENTS_EXPORT: '/admin/students/export',
  
  // Admin - Stats
  ADMIN_STATS: '/admin/stats/dashboard',
  ADMIN_ACTIVITY_LOGS: '/admin/stats/activity',
  ADMIN_PREDICTIVE_STATS: '/admin/stats/predictive',
  ADMIN_SECURITY_AUDIT: '/admin/security/audit-logs',
  
  // Admin - Security & Monitoring
  ADMIN_SECURITY_STATS: '/admin/security/stats',
  ADMIN_SYSTEM_ERRORS: '/admin/security/errors',
  ADMIN_SECURITY_SCANS: '/admin/security/scans',
  ADMIN_RESOLVE_ERROR: (id) => `/admin/security/errors/${id}/resolve`,
  ADMIN_SECURITY_REPORT: '/admin/security/report',
  ADMIN_RESOLVE_SCAN: (id) => `/admin/security/scans/${id}/resolve`,
  ADMIN_RUN_SCAN: '/admin/security/scans/run',
  
  // Admin - Questions Reply
  ADMIN_QUESTIONS: '/admin/questions',
  ADMIN_REPLY_QUESTION: (id) => `/admin/questions/${id}/reply`,
  ADMIN_DELETE_STUDENT_QUESTION: (id) => `/admin/questions/${id}`,

  // Admin - Notifications
  ADMIN_SEND_NOTIFICATION: '/admin/notifications',
  
  // Admin - Approvals
  ADMIN_PENDING_APPROVALS: '/admin/approvals',
  ADMIN_MY_APPROVALS: '/admin/my-approvals',
  ADMIN_APPROVE_REQUEST: (id) => `/admin/approvals/${id}/approve`,
  ADMIN_REJECT_REQUEST: (id) => `/admin/approvals/${id}/reject`,
  ADMIN_DELETE_REQUEST: (id) => `/admin/approvals/${id}`,
};

export default API_BASE_URL;
