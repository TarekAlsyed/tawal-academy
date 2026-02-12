import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';

import StudentLogin from './pages/student/Login';
import StudentHome from './pages/student/Home';
import StudentSubjectDetail from './pages/student/SubjectDetail';
import Exam from './pages/student/Exam';
import ExamResult from './pages/student/ExamResult';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/Dashboard';
import Terms from './pages/admin/Terms';
import Subjects from './pages/admin/Subjects';
import AddSubject from './pages/admin/AddSubject';
import SubjectDetail from './pages/admin/SubjectDetail';
import AddExam from './pages/admin/AddExam';
import ManageQuestions from './pages/admin/ManageQuestions';
import Students from './pages/admin/Students';
import StudentQuestions from './pages/admin/StudentQuestions';

// مكون الحماية (نستخدمه لحماية الصفحات)
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdminAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  if (adminOnly) {
    return isAdminAuthenticated ? children : <Navigate to="/admin/login" />;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function AppContent() {
  useEffect(() => {
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
  }, []);

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
          path="/subjects/:id"
          element={
            <ProtectedRoute>
              <StudentSubjectDetail />
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
          path="/admin/add-subject"
          element={
            <ProtectedRoute adminOnly={true}>
              <AddSubject />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subject/:id"
          element={
            <ProtectedRoute adminOnly={true}>
              <SubjectDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/add-exam/:subjectId"
          element={
            <ProtectedRoute adminOnly={true}>
              <AddExam />
            </ProtectedRoute>
          }
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

        {/* إعادة توجيه أي رابط غير معروف */}
        <Route 
          path="*" 
          element={
            window.location.hash.includes('/admin') 
              ? <Navigate to="/admin/login" replace /> 
              : <Navigate to="/login" replace />
          } 
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;