import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { FiUsers, FiBook, FiFileText, FiTrendingUp, FiLogOut } from 'react-icons/fi';
import '../../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { admin, adminLogout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN_STATS);
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      toast.error('فشل تحميل الإحصائيات');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
    toast.success('تم تسجيل الخروج بنجاح');
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>🎓 Tawal Academy</h2>
          <p>لوحة التحكم</p>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item active" onClick={() => navigate('/admin/dashboard')}>
            <FiTrendingUp /> الإحصائيات
          </button>
          <button className="nav-item" onClick={() => navigate('/admin/terms')}>
            <FiBook /> إدارة الترمات
          </button>
          <button className="nav-item" onClick={() => navigate('/admin/subjects')}>
            <FiBook /> إدارة المواد
          </button>
          <button className="nav-item" onClick={() => navigate('/admin/students')}>
            <FiUsers /> إدارة الطلبة
          </button>
          <button className="nav-item" onClick={() => navigate('/admin/questions')}>
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
        <header className="admin-header">
          <h1>مرحباً، {admin?.name}</h1>
          <p>نظرة عامة على المنصة</p>
        </header>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <FiUsers />
            </div>
            <div className="stat-info">
              <h3>{stats?.stats?.total_students || 0}</h3>
              <p>إجمالي الطلبة</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <FiBook />
            </div>
            <div className="stat-info">
              <h3>{stats?.stats?.total_subjects || 0}</h3>
              <p>إجمالي المواد</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <FiFileText />
            </div>
            <div className="stat-info">
              <h3>{stats?.stats?.total_exams || 0}</h3>
              <p>إجمالي الامتحانات</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">
              <FiTrendingUp />
            </div>
            <div className="stat-info">
              <h3>{stats?.stats?.today_attempts || 0}</h3>
              <p>محاولات اليوم</p>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="content-section">
            <h2>أفضل الطلبة</h2>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الترتيب</th>
                    <th>الاسم</th>
                    <th>النقاط</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.top_students?.length > 0 ? (
                    stats.top_students.map((student, index) => (
                      <tr key={student.id}>
                        <td>{index + 1}</td>
                        <td>{student.name}</td>
                        <td>⭐ {student.total_points}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center' }}>
                        لا توجد بيانات
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="content-section">
            <h2>الملفات الأكثر تحميلاً</h2>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>اسم الملف</th>
                    <th>المادة</th>
                    <th>التحميلات</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.top_downloaded_pdfs?.length > 0 ? (
                    stats.top_downloaded_pdfs.map((pdf) => (
                      <tr key={pdf.id}>
                        <td>{pdf.title}</td>
                        <td>{pdf.subject_name}</td>
                        <td>{pdf.downloads_count}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center' }}>
                        لا توجد بيانات
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
