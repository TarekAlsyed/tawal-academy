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
        <Route path="/login" element={<StudentLogin />} />
        <Route
          path="/"
          element={
            <HashRouter>
              <StudentHome />
            </HashRouter>
          }
        />
        <Route
          path="/student/subjects/:id"
          element={
            <HashRouter>
              <StudentSubjectDetail />
            </HashRouter>
          }
        />
        <Route
          path="/student/exam/:id"
          element={
            <HashRouter>
              <Exam />
            </HashRouter>
          }
        />
        <Route
          path="/student/exam/:id/result"
          element={
            <HashRouter>
              <ExamResult />
            </HashRouter>
          }
        />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <HashRouter adminOnly>
              <AdminDashboard />
            </HashRouter>
          }
        />
        <Route
          path="/admin/terms"
          element={
            <HashRouter adminOnly>
              <Terms />
            </HashRouter>
          }
        />
        <Route
          path="/admin/subjects"
          element={
            <HashRouter adminOnly>
              <Subjects />
            </HashRouter>
          }
        />
        <Route
          path="/admin/subjects/add"
          element={
            <HashRouter adminOnly>
              <AddSubject />
            </HashRouter>
          }
        />
        <Route
          path="/admin/subjects/:id"
          element={
            <HashRouter adminOnly>
              <SubjectDetail />
            </HashRouter>
          }
        />
        <Route
          path="/admin/subjects/:subjectId/exams/add"
          element={
            <HashRouter adminOnly>
              <AddExam />
            </HashRouter>
          }
        />
        <Route
          path="/admin/subjects/:subjectId/questions"
          element={
            <HashRouter adminOnly>
              <ManageQuestions />
            </HashRouter>
          }
        />
        <Route
          path="/admin/students"
          element={
            <HashRouter adminOnly>
              <Students />
            </HashRouter>
          }
        />
        <Route
          path="/admin/student-questions"
          element={
            <HashRouter adminOnly>
              <StudentQuestions />
            </HashRouter>
          }
        />
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
