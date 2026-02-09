import React from 'react';
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
  return (
    // استخدامنا HashRouter مرة واحدة هنا (باسم Router كما تم استيراده)
    <Router>
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
        {/* صفحات الطالب العامة */}
        <Route path="/login" element={<StudentLogin />} />
        
        {/* صفحات الطالب المحمية */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <StudentHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/subjects/:id"
          element={
            <ProtectedRoute>
              <StudentSubjectDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/exam/:id"
          element={
            <ProtectedRoute>
              <Exam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/exam/:id/result"
          element={
            <ProtectedRoute>
              <ExamResult />
            </ProtectedRoute>
          }
        />

        {/* صفحات الأدمن العامة */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* صفحات الأدمن المحمية */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/terms"
          element={
            <ProtectedRoute adminOnly>
              <Terms />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subjects"
          element={
            <ProtectedRoute adminOnly>
              <Subjects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subjects/add"
          element={
            <ProtectedRoute adminOnly>
              <AddSubject />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subjects/:id"
          element={
            <ProtectedRoute adminOnly>
              <SubjectDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subjects/:subjectId/exams/add"
          element={
            <ProtectedRoute adminOnly>
              <AddExam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/subjects/:subjectId/questions"
          element={
            <ProtectedRoute adminOnly>
              <ManageQuestions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute adminOnly>
              <Students />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/student-questions"
          element={
            <ProtectedRoute adminOnly>
              <StudentQuestions />
            </ProtectedRoute>
          }
        />

        {/* أي رابط غير موجود يرجع للصفحة الرئيسية */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;