import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { FiUsers, FiBook, FiFileText, FiTrendingUp } from 'react-icons/fi';
import AdminLayout from '../../components/admin/AdminLayout';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { admin } = useAuth();

  const isSuper = admin?.is_super_admin === true || admin?.is_super_admin === 'true';
  
  const getPermission = (section, action) => {
      if (isSuper) return true;
      const perm = admin?.permissions_detailed?.[section]?.[action];
      if (perm === true) return true;
      if (typeof perm === 'object' && perm !== null) return perm.allowed === true;
      return false;
  };

  const canViewStudentCount = getPermission('students', 'view_count');

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

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div className="loading" style={{ color: 'var(--admin-primary)', fontSize: '1.2rem', fontWeight: 'bold' }}>جاري التحميل...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <header className="admin-header">
        <div className="admin-header-title">
          <h1>مرحباً، {admin?.name}</h1>
          <p>نظرة عامة على المنصة</p>
        </div>
        <div className="admin-header-actions">
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-stats">
          {canViewStudentCount && (
            <div className="admin-stat-card primary">
              <div className="admin-stat-header">
                <div className="admin-stat-icon">
                  <FiUsers />
                </div>
              </div>
              <div className="admin-stat-body">
                <h3>إجمالي الطلبة</h3>
                <p className="admin-stat-value">{stats?.stats?.total_students || 0}</p>
              </div>
            </div>
          )}

          <div className="admin-stat-card success">
            <div className="admin-stat-header">
              <div className="admin-stat-icon">
                <FiBook />
              </div>
            </div>
            <div className="admin-stat-body">
              <h3>إجمالي المواد</h3>
              <p className="admin-stat-value">{stats?.stats?.total_subjects || 0}</p>
            </div>
          </div>

          <div className="admin-stat-card warning">
            <div className="admin-stat-header">
              <div className="admin-stat-icon">
                <FiFileText />
              </div>
            </div>
            <div className="admin-stat-body">
              <h3>إجمالي الامتحانات</h3>
              <p className="admin-stat-value">{stats?.stats?.total_exams || 0}</p>
            </div>
          </div>

          <div className="admin-stat-card danger">
            <div className="admin-stat-header">
              <div className="admin-stat-icon">
                <FiTrendingUp />
              </div>
            </div>
            <div className="admin-stat-body">
              <h3>محاولات اليوم</h3>
              <p className="admin-stat-value">{stats?.stats?.today_attempts || 0}</p>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">أفضل الطلبة</h3>
          </div>
          <table className="admin-table">
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

        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">الملفات الأكثر تحميلاً</h3>
          </div>
          <table className="admin-table">
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
    </AdminLayout>
  );
};

export default AdminDashboard;
