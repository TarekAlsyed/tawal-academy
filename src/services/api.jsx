import axios from 'axios';
import { toast } from 'react-toastify';
import CryptoJS from 'crypto-js';

const API_URL = import.meta.env.VITE_API_URL || 'https://tawal-academy.alwaysdata.net/api';
const APP_SECRET = import.meta.env.VITE_APP_APP_SECRET || 'tawal-elite-secret-2026-key';

// HMAC Generation Helper - Final, most robust version
const generateHMAC = (body, timestamp, secret) => {
    try {
        // Create a new object with sorted keys to guarantee canonical representation
        const canonicalObject = {};
        Object.keys(body || {}).sort().forEach(key => {
            canonicalObject[key] = body[key];
        });

        // Use a stable stringification without any spaces or hidden characters
        const dataString = JSON.stringify(canonicalObject);
        const payload = `${timestamp}.${dataString}`;

        // This log is critical for any future debugging
        if (import.meta.env.DEV) {
            console.log(`[Security Debug] Frontend Payload: "${payload}"`);
        }

        return CryptoJS.HmacSHA256(payload, secret).toString(CryptoJS.enc.Hex);
    } catch (e) {
        console.error('HMAC Generation Error:', e);
        return '';
    }
};

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 600000, // Increased to 10 minutes for stable large file uploads (10-15MB)
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add token and security headers to requests
api.interceptors.request.use(
  (config) => {
    // Get deviceId from localStorage or generate one
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    
    // Add deviceId to headers
    const appSignature = import.meta.env.VITE_APP_SIGNATURE || 'tawal_academy_signature_secure_2026';
    if (config.headers.set) {
      config.headers.set('X-Device-Id', deviceId);
      config.headers.set('X-App-Signature', appSignature);
    } else {
      config.headers['X-Device-Id'] = deviceId;
      config.headers['X-App-Signature'] = appSignature;
    }

    // Add Request Integrity (HMAC) for POST, PUT, DELETE
    const method = config.method ? config.method.toLowerCase() : '';
    const isFormData = config.data instanceof FormData;

    // CRITICAL: For FormData, we MUST NOT set application/json or Axios won't add the boundary
    if (isFormData) {
        if (config.headers.delete) {
            config.headers.delete('Content-Type');
        } else {
            delete config.headers['Content-Type'];
        }
    }
    
    if (method !== 'get' && method !== 'options' && !isFormData) {
        const timestamp = Date.now();
        
        // CRITICAL FIX: Ensure data is an object for HMAC calculation
        // Axios might have already stringified it in some versions or configurations
        let requestData = config.data;
        if (typeof requestData === 'string') {
            try {
                requestData = JSON.parse(requestData);
            } catch (e) {
                // Not JSON, keep as is
            }
        }
        
        const hmac = generateHMAC(requestData, timestamp, APP_SECRET);
        
        if (config.headers.set) {
          config.headers.set('X-Request-Integrity', hmac);
          config.headers.set('X-Request-Timestamp', String(timestamp));
        } else {
          config.headers['X-Request-Integrity'] = hmac;
          config.headers['X-Request-Timestamp'] = String(timestamp);
        }
        
        // Add console log for production debugging if needed
        if (import.meta.env.DEV) {
            console.log(`[Security] Integrity headers added for ${method.toUpperCase()} ${config.url}`);
        }
    }

    // Add token to headers (Only if we still have it in localStorage for transition, 
    // but we prefer relying on HttpOnly cookies now)
    const url = config.url || '';
    const isAdminRoute = url.startsWith('/admin') || url.includes('/admin/');
    const token = localStorage.getItem('accessToken');
    const adminToken = localStorage.getItem('adminAccessToken');
    
    if (isAdminRoute && adminToken) {
      if (config.headers.set) {
        config.headers.set('Authorization', `Bearer ${adminToken}`);
      } else {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
    } else if (!isAdminRoute && token) {
      if (config.headers.set) {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and permissions
api.interceptors.response.use(
  (response) => {
    // Handle Pending Approval (202 Accepted)
    if (response.status === 202 && response.data?.requireApproval) {
        toast.info(response.data.message || 'تم تعليق الإجراء بانتظار موافقة المدير العام', {
            autoClose: 5000,
            position: "top-center"
        });
    }
    return response;
  },
  (error) => {
    // Handle Permission Denied (403 Forbidden)
    if (error.response?.status === 403) {
        toast.error(error.response.data.message || 'ليس لديك صلاحية لهذا الإجراء', {
            position: "top-center"
        });
        return Promise.reject(error);
    }

    const originalRequest = error.config;

    // Check if it's a 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const url = originalRequest.url || '';
      const isApiAdminRequest = url.startsWith('/admin') || url.includes('/admin/');
      const refreshEndpoint = isApiAdminRequest ? '/admin/refresh-token' : '/auth/refresh-token';

      // Don't retry refresh token itself
      if (url === refreshEndpoint) {
        return Promise.reject(error);
      }

      return api.post(refreshEndpoint)
        .then(res => {
          if (res.data.success) {
            const newAccessToken = res.data.accessToken;
            const tokenKey = isApiAdminRequest ? 'adminAccessToken' : 'accessToken';
            localStorage.setItem(tokenKey, newAccessToken);
            
            // Retry the original request with new token
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
          return Promise.reject(error);
        })
        .catch(refreshError => {
          // Refresh failed, logout user
          console.log(`401 Unauthorized [${isApiAdminRequest ? 'Admin' : 'Student'}] - Handling...`);
          
          if (isApiAdminRequest) {
            localStorage.removeItem('adminAccessToken');
            localStorage.removeItem('admin');
          } else {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
          }

          // Only redirect if we're not already on the login page
          const currentHash = window.location.hash;
          const isLoginPage = currentHash.includes('/login');
          const isAdminSection = currentHash.includes('/admin');
          
          if (!isLoginPage) {
            if (!isApiAdminRequest && isAdminSection) {
              console.log('Student session expired while in Admin section - ignoring redirect');
              return Promise.reject(error);
            }

            console.log('Redirecting to login page');
            setTimeout(() => {
              const loginPath = isApiAdminRequest ? 'admin/login' : 'login';
              window.location.hash = `#/${loginPath}`;
            }, 100);
          }
          return Promise.reject(refreshError);
        });
    }

    // Check if it's a network error (server down or connection lost)
    if (!error.response) {
      console.error('Network Error - Check your connection or server status');
      
      // Special message for large file uploads
      const isUpload = error.config?.data instanceof FormData || 
                       error.config?.headers?.['Content-Type']?.includes('multipart/form-data');
      
      if (isUpload) {
          toast.error('فشل رفع الملف الكبير. قد يكون حجم الملف أكبر من المسموح به على الخادم أو أن اتصال الإنترنت ضعيف.', {
              position: "top-center",
              autoClose: 10000
          });
      } else {
          toast.error('خطأ في الاتصال بالسيرفر. يرجى التحقق من اتصالك بالإنترنت.', {
              position: "top-center"
          });
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// ============================================
// Student API
// ============================================

// Auth
export const studentLogin = (data) => api.post('/auth/login', data);
export const getProfile = () => api.get('/auth/profile');
export const logout = () => api.post('/auth/logout');

// Subjects
export const getSubjects = (termId) => api.get('/subjects', { params: { term_id: termId } });
export const getStudentTerms = () => api.get('/subjects/terms');
export const getSubjectById = (id) => api.get(`/subjects/${id}`);
export const rateSubject = (id, rating) => api.post(`/subjects/${id}/rate`, { rating });
export const downloadPDF = (subjectId, pdfId) => api.post(`/subjects/${subjectId}/pdfs/${pdfId}/download`);
export const viewImage = (subjectId, imageId) => api.post(`/subjects/${subjectId}/images/${imageId}/view`);

// Exams
export const getExamsBySubject = (subjectId) => api.get(`/exams/subject/${subjectId}`);
export const getExamById = (id) => api.get(`/exams/${id}`);
export const submitExam = (id, answers) => api.post(`/exams/${id}/submit`, { answers });
export const saveExamProgress = (id, answers) => api.post(`/exams/${id}/progress`, { answers });
export const getExamProgress = (id) => api.get(`/exams/${id}/progress`);
export const getExamResult = (attemptId) => api.get(`/exams/attempts/${attemptId}`);

// Profile
export const getExamHistory = () => api.get('/profile/exam-history');
export const getLeaderboard = () => api.get('/profile/leaderboard');

// Questions
export const submitQuestion = (question) => api.post('/questions', { question_text: question });
export const getMyQuestions = () => api.get('/questions');

// Notifications
export const getNotifications = () => api.get('/notifications');
export const markNotificationAsRead = (id) => api.put(`/notifications/${id}/read`);
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);

// ============================================
// Admin API
// ============================================

// Auth
export const adminLogin = (data) => api.post('/admin/login', data);
export const adminLogout = () => api.post('/admin/logout');
export const createAdmin = (data) => api.post('/admin/create-admin', data);
export const updateAdminPermissions = (adminId, permissions) => api.put(`/admin/update-permissions/${adminId}`, { permissions });

// Terms
export const getTerms = () => api.get('/admin/terms');
export const createTerm = (data) => api.post('/admin/terms', data);
export const deleteTerm = (id) => api.delete(`/admin/terms/${id}`);

// Subjects
export const adminGetSubjects = () => api.get('/admin/subjects');
export const adminGetSubjectById = (id) => api.get(`/admin/subjects/${id}`);
export const adminCreateSubject = (formData) => api.post('/admin/subjects', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const adminUpdateSubject = (id, formData) => api.put(`/admin/subjects/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const adminDeleteSubject = (id) => api.delete(`/admin/subjects/${id}`);
export const adminAddPDF = (subjectId, formData) => api.post(`/admin/subjects/${subjectId}/pdfs`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const adminDeletePDF = (subjectId, pdfId) => api.delete(`/admin/subjects/${subjectId}/pdfs/${pdfId}`);
export const adminAddImages = (subjectId, formData) => api.post(`/admin/subjects/${subjectId}/images`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const adminDeleteImage = (subjectId, imageId) => api.delete(`/admin/subjects/${subjectId}/images/${imageId}`);

// Exams
export const adminGetExams = () => api.get('/admin/exams');
export const adminCreateExam = (data) => api.post('/admin/exams', data);
export const adminAddQuestionsManually = (examId, questions) => api.post(`/admin/exams/${examId}/questions/manual`, { questions });
export const adminAddQuestionsFromExcel = (examId, formData) => api.post(`/admin/exams/${examId}/questions/excel`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const adminAddQuestionsFromText = (examId, text) => api.post(`/admin/exams/${examId}/questions/text`, { text });
export const adminUpdateQuestion = (examId, questionId, data) => api.put(`/admin/exams/${examId}/questions/${questionId}`, data);
export const adminDeleteQuestion = (examId, questionId) => api.delete(`/admin/exams/${examId}/questions/${questionId}`);

// Students
export const adminGetStudents = (params) => api.get('/admin/students', { params });
export const adminSearchStudents = (query) => api.get('/admin/students/search', { params: { query } });
export const adminBlockStudent = (id, reason) => api.post(`/admin/students/${id}/block`, { reason });
export const adminUnblockStudent = (id) => api.post(`/admin/students/${id}/unblock`);
export const adminDeleteStudent = (id) => api.delete(`/admin/students/${id}`);
export const adminExportStudentsPDF = () => api.get('/admin/students/export', { responseType: 'blob' });

// Questions
export const adminGetQuestions = (status) => api.get('/admin/questions', { params: { status } });
export const adminReplyToQuestion = (id, reply) => api.post(`/admin/questions/${id}/reply`, { admin_reply: reply });

// Notifications
export const adminSendNotification = (data) => api.post('/admin/notifications', data);

// Stats
export const adminGetDashboardStats = () => api.get('/admin/stats/dashboard');

// Activity Logs
export const adminGetActivityLogs = (params) => api.get('/admin/stats/activity', { params });
export const adminGetStudentLogs = (studentId, params) => api.get(`/admin/students/${studentId}/activity`, { params });

export default api;
