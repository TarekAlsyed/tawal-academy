import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://tawal-academy-backend.fly.dev/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add token to requests
api.interceptors.request.use(
  (config) => {
    // Get deviceId from localStorage or generate one
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    
    // Add deviceId to headers
    config.headers['X-Device-Id'] = deviceId;

    // Get token from localStorage
    const token = localStorage.getItem('token');
    const adminToken = localStorage.getItem('adminToken');
    
    // Add token to headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('user');
      localStorage.removeItem('admin');
      
      // Redirect to login
      const isAdmin = window.location.pathname.includes('/admin');
      window.location.href = isAdmin ? '/#/admin/login' : '/#/login';
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
export const getSubjects = () => api.get('/subjects');
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

export default api;
