import axios from 'axios';
import { toast } from 'react-toastify';
import { generateFingerprint } from '../utils/fingerprint';
import { Capacitor } from '@capacitor/core';

const API_URL = import.meta.env.VITE_API_URL || 'https://tawal-academy.alwaysdata.net/api';

// SECURITY: APP_SECRET removed from frontend (v2.2.0)
// HMAC integrity is now fully server-side. Frontend sends timestamp for replay protection only.

// ============================================
// Capacitor Authentication Strategy (Dual-Layer)
// ============================================
// PRIMARY: CapacitorHttp + CapacitorCookies (capacitor.config.ts)
//   → Routes all fetch/XHR through native OkHttp layer
//   → Bypasses CORS entirely + handles cookies natively
//
// SECONDARY (Defense-in-Depth): TokenStore + Authorization header
//   → Stores tokens in localStorage as backup
//   → Attaches Bearer header in case native cookies fail
//
// On web: HttpOnly cookies via withCredentials (unchanged)
// ============================================
const IS_NATIVE = Capacitor.isNativePlatform();

// ✅ M-06 FIX: Use SecureStorage on native platforms (Keychain/Keystore)
// Falls back to localStorage if plugin is not installed
let SecureStoragePlugin = null;
let secureStorageInitialized = false;

const initSecureStorage = async () => {
  if (secureStorageInitialized) return;
  if (IS_NATIVE) {
    try {
      const mod = await import('capacitor-secure-storage-plugin').catch(() => null);
      SecureStoragePlugin = mod?.SecureStoragePlugin || null;
    } catch { /* plugin not installed — fallback to localStorage */ }
  }
  secureStorageInitialized = true;
};

const TokenStore = {
  getAccess: async () => {
    await initSecureStorage();
    if (SecureStoragePlugin) {
      return SecureStoragePlugin.get({ key: 'cap_access_token' }).then(r => r.value).catch(() => null);
    }
    return localStorage.getItem('cap_access_token');
  },
  getRefresh: async () => {
    await initSecureStorage();
    if (SecureStoragePlugin) {
      return SecureStoragePlugin.get({ key: 'cap_refresh_token' }).then(r => r.value).catch(() => null);
    }
    return localStorage.getItem('cap_refresh_token');
  },
  setAccess: async (token) => {
    await initSecureStorage();
    if (SecureStoragePlugin) {
      await SecureStoragePlugin.set({ key: 'cap_access_token', value: token }).catch(() => {});
    }
    localStorage.setItem('cap_access_token', token);
  },
  setRefresh: async (token) => {
    await initSecureStorage();
    if (SecureStoragePlugin) {
      await SecureStoragePlugin.set({ key: 'cap_refresh_token', value: token }).catch(() => {});
    }
    localStorage.setItem('cap_refresh_token', token);
  },
  clear: async () => {
    await initSecureStorage();
    if (SecureStoragePlugin) {
      await SecureStoragePlugin.remove({ key: 'cap_access_token' }).catch(() => {});
      await SecureStoragePlugin.remove({ key: 'cap_refresh_token' }).catch(() => {});
    }
    localStorage.removeItem('cap_access_token');
    localStorage.removeItem('cap_refresh_token');
  }
};

// Create a special instance for public/health checks that doesn't use interceptors if needed
const healthApi = axios.create({
  baseURL: API_URL,
  timeout: 5000
});

// Create axios instance
// On native: withCredentials=false (CapacitorHttp handles cookies at native layer)
// On web: withCredentials=true (browser sends HttpOnly cookies)
const api = axios.create({
  baseURL: API_URL,
  withCredentials: !IS_NATIVE,
  timeout: 600000, // 10 minutes for large file uploads (10-15MB)
  headers: {
    'Content-Type': 'application/json'
  }
});

// Advanced Retry Logic for Network Errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config } = error;
    
    // Only retry on network errors or 5xx server errors, AND if online
    if (!config || !config.retry || (error.response && error.response.status < 500) || !navigator.onLine) {
      if (!navigator.onLine) {
        console.log('[Offline] Request failed due to no connection. Skipping retry.');
      }
      return Promise.reject(error);
    }

    config.retryCount = config.retryCount || 0;

    if (config.retryCount >= config.retry) {
      return Promise.reject(error);
    }

    config.retryCount += 1;
    console.warn(`[Network] Retrying request (${config.retryCount}/${config.retry}): ${config.url}`);
    
    // Exponential backoff
    const delay = Math.pow(2, config.retryCount) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return api(config);
  }
);

// Request interceptor - add token and security headers to requests
api.interceptors.request.use(
  async (config) => {
    // Default retry settings
    config.retry = 2; 

    // CRITICAL: Disable retries for heavy upload requests to avoid infinite loops and server load
    if (config.url?.includes('/pdfs') || config.url?.includes('/images') || config.url?.includes('/upload')) {
        config.retry = 0;
        config.timeout = 900000; // 15 minutes for uploads
    }
    
    // Get deviceId from localStorage or generate one
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      // ✅ L-03 FIX: Use cryptographically secure random ID instead of Math.random
      deviceId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? `device-${crypto.randomUUID()}`
        : `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    
    // Add platform identifier + deviceId to headers
    const appSignature = import.meta.env.VITE_APP_SIGNATURE || 'tawal_academy_signature_secure_2026';
    const fingerprint = generateFingerprint();

    // CAPACITOR: Send platform header so backend can tailor responses (e.g. include refreshToken)
    if (IS_NATIVE) {
      if (config.headers.set) {
        config.headers.set('X-Platform', 'capacitor');
      } else {
        config.headers['X-Platform'] = 'capacitor';
      }
    }
    
    if (config.headers.set) {
      config.headers.set('X-Device-Id', deviceId);
      config.headers.set('X-Fingerprint', fingerprint);
      config.headers.set('X-App-Signature', appSignature);
    } else {
      config.headers['X-Device-Id'] = deviceId;
      config.headers['X-Fingerprint'] = fingerprint;
      config.headers['X-App-Signature'] = appSignature;
    }

    // SECURITY v2.2.0: Send timestamp for replay protection (HMAC computed server-side now)
    const method = config.method ? config.method.toLowerCase() : '';
    const isFormData = config.data instanceof FormData;

    // CSRF Protection (M-06)
    if (!IS_NATIVE && method !== 'get' && method !== 'options') {
      const csrfToken = localStorage.getItem('csrf_token');
      if (csrfToken) {
        if (config.headers.set) {
          config.headers.set('x-csrf-token', csrfToken);
        } else {
          config.headers['x-csrf-token'] = csrfToken;
        }
      }
    }

    // CRITICAL: For FormData, we MUST NOT set application/json or Axios won't add the boundary
    if (isFormData) {
        if (config.headers.delete) {
            config.headers.delete('Content-Type');
        } else {
            delete config.headers['Content-Type'];
        }
    }
    
    // Add timestamp for all mutating requests (replay protection layer)
    if (method !== 'get' && method !== 'options') {
        const timestamp = Date.now();
        if (config.headers.set) {
          config.headers.set('X-Request-Timestamp', String(timestamp));
        } else {
          config.headers['X-Request-Timestamp'] = String(timestamp);
        }
    }

    // CAPACITOR (Defense-in-Depth): Attach Bearer header as backup auth
    // Primary auth is via CapacitorHttp native cookies, this is secondary
    if (IS_NATIVE) {
      const accessToken = await TokenStore.getAccess();
      if (accessToken) {
        if (config.headers.set) {
          config.headers.set('Authorization', `Bearer ${accessToken}`);
        } else {
          config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Singleton promise for refresh token to avoid multiple simultaneous calls
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
  refreshSubscribers.map((cb) => cb(token, null));
  refreshSubscribers = [];
};

const onRefreshFailed = (error) => {
  refreshSubscribers.map((cb) => cb(null, error));
  refreshSubscribers = [];
};

// Response interceptor - handle errors and permissions
api.interceptors.response.use(
  async (response) => {
    // CAPACITOR: Capture tokens from login/refresh responses and store locally
    if (IS_NATIVE && response.data?.data?.accessToken) {
      await TokenStore.setAccess(response.data.data.accessToken);
    }
    if (IS_NATIVE && response.data?.data?.refreshToken) {
      await TokenStore.setRefresh(response.data.data.refreshToken);
    }
    if (IS_NATIVE && response.data?.accessToken) {
      await TokenStore.setAccess(response.data.accessToken);
    }

    // Handle Pending Approval (202 Accepted)
    if (response.status === 202 && response.data?.requireApproval) {
        toast.info(response.data.message || 'تم تعليق الإجراء بانتظار موافقة المدير العام', {
            autoClose: 5000,
            position: "top-center"
        });
    }
    return response;
  },
  async (error) => {
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

      if (!isRefreshing) {
        isRefreshing = true;
        // CAPACITOR: Send refresh token in body (cookies won't be available)
        const refreshToken = IS_NATIVE ? await TokenStore.getRefresh() : null;
        const refreshBody = IS_NATIVE ? { refreshToken } : {};
        api.post(refreshEndpoint, refreshBody)
          .then(res => {
            isRefreshing = false;
            if (res.data.success) {
              onRefreshed(res.data.accessToken);
            } else {
              onRefreshFailed(new Error('Refresh failed'));
              handleAuthFailure(isApiAdminRequest);
            }
          })
          .catch(refreshError => {
            isRefreshing = false;
            onRefreshFailed(refreshError);
            handleAuthFailure(isApiAdminRequest);
          });
      }

      const retryOriginalRequest = new Promise((resolve, reject) => {
        subscribeTokenRefresh((token, err) => {
          if (err) {
            reject(err);
          } else {
            // Cookies handle the token now, so we just retry the original request
            resolve(api(originalRequest));
          }
        });
      });

      return retryOriginalRequest;
    }

    // Check if it's a network error (server down or connection lost)
    if (!error.response) {
      console.error('Network Error - Check your connection or server status');
    }

    return Promise.reject(error);
  }
);

// Helper to handle authentication failure and redirect
 const handleAuthFailure = (isAdmin) => {
   // Don't redirect if we're offline - keep the current session in the UI
   if (!navigator.onLine) {
     console.log('Offline: Skipping authentication redirect');
     return;
   }

   const currentHash = window.location.hash;
   const isLoginPage = currentHash.includes('/login');
   
   // Clear state in AuthContext via custom event
    window.dispatchEvent(new CustomEvent('unauthorized'));
    // CAPACITOR: Clear stored tokens on auth failure
    if (IS_NATIVE) TokenStore.clear();
    
    if (!isLoginPage) {
     console.log(`401 Unauthorized [${isAdmin ? 'Admin' : 'Student'}] - Redirecting to login`);
     const loginPath = isAdmin ? 'admin/login' : 'login';
     // Use a flag to avoid multiple redirects in a short time
     if (!window._isRedirecting) {
         window._isRedirecting = true;
         setTimeout(() => {
           window.location.hash = `#/${loginPath}`;
           window._isRedirecting = false;
         }, 100);
     }
   }
 };

// ============================================
// Security Initialization
// ============================================
export const initializeCsrf = async () => {
  if (IS_NATIVE) return; // Native doesn't need CSRF (bypassed in backend)
  try {
    const res = await api.get('/csrf-token');
    if (res.data?.csrfToken) {
      localStorage.setItem('csrf_token', res.data.csrfToken);
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
};

// ============================================
// Authentication
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
export const downloadPDF = (subjectId, pdfId) => api.get(`/subjects/${subjectId}/pdfs/${pdfId}/download`);
export const viewImage = (subjectId, imageId) => api.get(`/subjects/${subjectId}/images/${imageId}/view`);

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
export const adminDeleteAllStudents = () => api.delete('/admin/students/all');
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
export const adminDeleteAllActivityLogs = () => api.delete('/admin/stats/activity/all');
export const adminGetStudentLogs = (studentId, params) => api.get(`/admin/students/${studentId}/activity`, { params });

export const checkServerHealth = async () => {
  try {
    const response = await healthApi.get('/health');
    return response.data;
  } catch (error) {
    console.error('Server Health Check Failed:', error);
    return { status: 'offline' };
  }
};

export default api;
