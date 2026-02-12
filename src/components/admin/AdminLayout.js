import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { FiTrendingUp, FiBook, FiUsers, FiFileText, FiLogOut, FiLayers } from 'react-icons/fi';
import '../../styles/AdminDashboard.css';

const AdminLayout = ({ children }) => {
  const { admin, adminLogout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
    toast.success('تم تسجيل الخروج بنجاح');
  };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>🎓 Tawal Academy</h2>
          <p>لوحة التحكم</p>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item" onClick={() => navigate('/admin/dashboard')}>
            <FiTrendingUp /> الإحصائيات
          </button>
          <button className="nav-item" onClick={() => navigate('/admin/terms')}>
            <FiLayers /> إدارة الترمات
          </button>
          <button className="nav-item" onClick={() => navigate('/admin/subjects')}>
            <FiBook /> إدارة المواد
          </button>
          <button className="nav-item" onClick={() => navigate('/admin/students')}>
            <FiUsers /> إدارة الطلبة
          </button>
          <button className="nav-item" onClick={() => navigate('/admin/student-questions')}>
            <FiFileText /> أسئلة الطلبة
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="admin-info">
            <p>{admin?.name}</p>
            <small>{admin?.email}</small>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <FiLogOut /> تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
