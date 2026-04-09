import React, { useEffect, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import api from './services/api';
import Watermark from './components/Watermark';
import { FiMoon, FiSun } from 'react-icons/fi';

// Student Pages
const StudentLogin = lazy(() => import('./pages/student/Login'));
const StudentHome = lazy(() => import('./pages/student/Home'));
const StudentTerms = lazy(() => import('./pages/student/StudentTerms'));
const StudentQuestionsPage = lazy(() => import('./pages/student/StudentQuestions'));
const StudentSubjectDetail = lazy(() => import('./pages/student/SubjectDetail'));
const Exam = lazy(() => import('./pages/student/Exam'));
const ExamResult = lazy(() => import('./pages/student/ExamResult'));
const ExamReview = lazy(() => import('./pages/student/ExamReview'));
const PersonalBank = lazy(() => import('./pages/student/PersonalBank'));

// Admin Pages
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const Terms = lazy(() => import('./pages/admin/Terms'));
const Subjects = lazy(() => import('./pages/admin/Subjects'));
const AddSubject = lazy(() => import('./pages/admin/AddSubject'));
const SubjectDetail = lazy(() => import('./pages/admin/SubjectDetail'));
const AddExam = lazy(() => import('./pages/admin/AddExam'));
const ManageQuestions = lazy(() => import('./pages/admin/ManageQuestions'));
const QuestionBank = lazy(() => import('./pages/admin/QuestionBank'));
const Students = lazy(() => import('./pages/admin/Students'));
const StudentQuestions = lazy(() => import('./pages/admin/StudentQuestions'));
const Admins = lazy(() => import('./pages/admin/Admins'));
const ActivityLogs = lazy(() => import('./pages/admin/ActivityLogs'));
const PendingApprovals = lazy(() => import('./pages/admin/PendingApprovals'));
const SecurityDashboard = lazy(() => import('./pages/admin/SecurityDashboard'));
const Violations = lazy(() => import('./pages/admin/Violations'));
const ExamAttempts = lazy(() => import('./pages/admin/ExamAttempts'));

const LoadingSpinner = () => (
  <div className="loading-container" style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    flexDirection: 'column',
    gap: '20px'
  }}>
    <div className="spinner" style={{
      width: '50px',
      height: '50px',
      border: '5px solid #f3f3f3',
      borderTop: '5px solid #3498db',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <div style={{ fontSize: '1.2rem', color: '#2c3e50' }}>جاري التحميل...</div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// مكون الحماية (نستخدمه لحماية الصفحات)
const ProtectedRoute = ({ children, adminOnly = false, superAdminOnly = false }) => {
  const { admin, isAuthenticated, isAdminAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  if (adminOnly) {
    if (!isAdminAuthenticated) return <Navigate to="/admin/login" />;
    
    // التحقق المزدوج من صلاحية المدير العام
    const isSuper = admin?.is_super_admin === true || admin?.isSuperAdmin === true;
    if (superAdminOnly && !isSuper) return <Navigate to="/admin/dashboard" />;
    
    return children;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function AppContent() {
  const location = useLocation();
  const [darkMode, setDarkMode] = React.useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  useEffect(() => {
    // Global Error Hunting System (Client-side)
    const reportError = (errorData) => {
      api.post('/monitoring/report-error', errorData)
        .catch(e => console.error('Failed to report global error:', e));
    };

    const handleGlobalError = (event) => {
      reportError({
        errorType: 'WINDOW_ERROR',
        message: event.message,
        stackTrace: event.error?.stack,
        component: 'Frontend Global',
        severity: 'medium',
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          url: window.location.href
        }
      });
    };

    const handleUnhandledRejection = (event) => {
      reportError({
        errorType: 'UNHANDLED_PROMISE',
        message: event.reason?.message || String(event.reason),
        stackTrace: event.reason?.stack,
        component: 'Frontend Promise',
        severity: 'medium',
        details: {
          reason: event.reason,
          url: window.location.href
        }
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    // Handle potential GitHub Pages redirect or direct URL access
    const query = new URLSearchParams(location.search);
    const redirectPath = query.get('/');
    if (redirectPath) {
      console.log('Redirecting to hash path:', redirectPath);
      window.location.replace('/#' + redirectPath);
    }
  }, [location]);

  useEffect(() => {
    // استثناء صفحة دخول المسؤول من القيود لتسهيل العمل
    const isAdminPath = location.pathname.includes('/admin/login');
    if (isAdminPath) return;

    // منع القائمة اليمنى (Right Click)
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // منع النسخ
    const handleCopy = (e) => {
      e.preventDefault();
    };

    // منع اختصارات لوحة المفاتيح (Ctrl+C, Ctrl+V, Ctrl+U, F12, etc.)
    const handleKeyDown = (e) => {
      // Ctrl+C, Ctrl+V, Ctrl+U (view source), Ctrl+Shift+I (inspect)
      if (
        (e.ctrlKey && (e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 85 || (e.shiftKey && e.keyCode === 73))) ||
        e.keyCode === 123 // F12
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [location.pathname]);

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* صفحة تسجيل دخول الطالب */}
          <Route path="/login" element={<StudentLogin />} />
          
          {/* صفحة تسجيل دخول الأدمن منفصلة تماماً */}
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* مسارات الطالب المحمية */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <StudentHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/terms"
            element={
              <ProtectedRoute>
                <StudentTerms />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subjects/:id"
            element={
              <ProtectedRoute>
                <StudentSubjectDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/questions"
            element={
              <ProtectedRoute>
                <StudentQuestionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/:id"
            element={
              <ProtectedRoute>
                <Exam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/:id/review"
            element={
              <ProtectedRoute>
                <ExamReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/personal-bank"
            element={
              <ProtectedRoute>
                <PersonalBank />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam-result/:id"
            element={
              <ProtectedRoute>
                <ExamResult />
              </ProtectedRoute>
            }
          />

          {/* مسارات الأدمن المحمية */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/security"
            element={
              <ProtectedRoute adminOnly={true}>
                <SecurityDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/terms"
            element={
              <ProtectedRoute adminOnly={true}>
                <Terms />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/subjects"
            element={
              <ProtectedRoute adminOnly={true}>
                <Subjects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/subjects/add"
            element={
              <ProtectedRoute adminOnly={true}>
                <AddSubject />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/subjects/edit/:id"
            element={
              <ProtectedRoute adminOnly={true}>
                <AddSubject />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/subjects/:id"
            element={
              <ProtectedRoute adminOnly={true}>
                <SubjectDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/exams/add/:subjectId"
            element={(
              <ProtectedRoute adminOnly={true}>
                <AddExam />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/exams/edit/:id"
            element={(
              <ProtectedRoute adminOnly={true}>
                <AddExam />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/admin/manage-questions/:examId"
            element={
              <ProtectedRoute adminOnly={true}>
                <ManageQuestions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/question-bank"
            element={
              <ProtectedRoute adminOnly={true}>
                <QuestionBank />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute adminOnly={true}>
                <Students />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/student-questions"
            element={
              <ProtectedRoute adminOnly={true}>
                <StudentQuestions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/admins"
            element={
              <ProtectedRoute adminOnly={true} superAdminOnly={true}>
                <Admins />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/activity-logs"
            element={
              <ProtectedRoute adminOnly={true}>
                <ActivityLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/approvals"
            element={
              <ProtectedRoute adminOnly={true} superAdminOnly={true}>
                <PendingApprovals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/violations"
            element={
              <ProtectedRoute adminOnly={true}>
                <Violations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/exam-attempts"
            element={
              <ProtectedRoute adminOnly={true}>
                <ExamAttempts />
              </ProtectedRoute>
            }
          />

          {/* إعادة التوجيه الافتراضي */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
      
      {/* Dark Mode Toggle Button for Students */}
      {!location.pathname.includes('/admin') && (
        <button 
          className="dark-mode-toggle" 
          onClick={toggleDarkMode}
          aria-label="Toggle Dark Mode"
        >
          {darkMode ? <FiSun size={28} /> : <FiMoon size={28} />}
        </button>
      )}
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <AppContent />
          <Watermark />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;