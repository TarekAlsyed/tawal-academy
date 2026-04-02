import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { API_ENDPOINTS, getFileUrl } from '../../config/api';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiFileText, FiImage, FiBook } from 'react-icons/fi';
import AdminLayout from '../../components/admin/AdminLayout';
// import '../../styles/AdminPages.css'; // Commented out to use COMPLETE-ADMIN-DESIGN.css

const Subjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN_SUBJECTS);
      if (response.data.success) {
        setSubjects(response.data.data.subjects);
      }
    } catch (error) {
      toast.error('فشل تحميل المواد');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المادة؟ سيتم حذف جميع الملفات والامتحانات المرتبطة بها.')) return;

    try {
      const response = await api.delete(API_ENDPOINTS.ADMIN_SUBJECT_BY_ID(id));
      if (response.data.success) {
        toast.success('تم حذف المادة بنجاح');
        fetchSubjects();
      }
    } catch (error) {
      // 403 and network errors are handled by interceptor
      if (error.response?.status !== 403) {
        toast.error('فشل حذف المادة');
      }
    }
  };

  if (loading) return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="loading" style={{ color: 'var(--admin-primary)' }}>جاري التحميل...</div>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout>
      <header className="admin-header">
        <div className="admin-header-title">
          <h1>إدارة المواد</h1>
          <p>إدارة المواد الدراسية والمحتوى</p>
        </div>
        <div className="admin-header-actions">
          <button className="admin-btn admin-btn-primary" onClick={() => navigate('/admin/subjects/add')}>
            <FiPlus /> إضافة مادة جديدة
          </button>
        </div>
      </header>

      <div className="admin-content">
        {subjects.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {subjects.map((subject) => (
              <div key={subject.id} className="admin-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
                <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
                  {subject.cover_image ? (
                    <img 
                      src={getFileUrl(subject.cover_image)} 
                      alt={subject.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                      onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
                      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FiBook size={48} color="white" style={{ opacity: 0.5 }} />
                    </div>
                  )}
                  <div style={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    left: 0, 
                    right: 0, 
                    padding: '1rem', 
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' 
                  }}>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.25rem' }}>{subject.name}</h3>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>{subject.term_name}</span>
                  </div>
                </div>

                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {subject.description && (
                    <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', flex: 1 }}>
                      {subject.description.length > 100 ? subject.description.substring(0, 100) + '...' : subject.description}
                    </p>
                  )}
                  
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-muted)', fontSize: '0.875rem' }}>
                      <FiFileText color="var(--admin-primary)" />
                      <span>{subject.pdfs_count || 0}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-muted)', fontSize: '0.875rem' }}>
                      <FiImage color="var(--admin-gold)" />
                      <span>{subject.images_count || 0}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-muted)', fontSize: '0.875rem' }}>
                      <FiBook color="var(--admin-success)" />
                      <span>{subject.exams_count || 0}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="admin-btn" 
                      onClick={() => navigate(`/admin/subjects/${subject.id}`)}
                      title="عرض التفاصيل"
                      style={{ flex: 1, justifyContent: 'center', background: 'var(--admin-primary-light)', color: 'var(--admin-primary)', fontSize: '0.875rem', padding: '0.5rem' }}
                    >
                      <FiEye /> عرض
                    </button>
                    <button 
                      className="admin-btn" 
                      onClick={() => navigate(`/admin/subjects/edit/${subject.id}`)} 
                      title="تعديل"
                      style={{ flex: 1, justifyContent: 'center', background: 'var(--admin-gold-light)', color: 'var(--admin-gold)', fontSize: '0.875rem', padding: '0.5rem' }}
                    >
                      <FiEdit2 /> تعديل
                    </button>
                    <button 
                      className="admin-btn" 
                      onClick={() => handleDelete(subject.id)}
                      title="حذف"
                      style={{ flex: 1, justifyContent: 'center', background: 'var(--admin-danger-light)', color: 'var(--admin-danger)', fontSize: '0.875rem', padding: '0.5rem' }}
                    >
                      <FiTrash2 /> حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              background: 'var(--admin-bg-primary)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 1.5rem auto' 
            }}>
              <FiBook size={32} style={{ opacity: 0.5, color: 'var(--admin-text-muted)' }} />
            </div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>لا توجد مواد</h3>
            <p style={{ color: 'var(--admin-text-muted)', marginBottom: '2rem' }}>ابدأ بإضافة مواد دراسية للمنصة</p>
            <button className="admin-btn admin-btn-primary" onClick={() => navigate('/admin/subjects/add')}>
              <FiPlus /> إضافة مادة جديدة
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Subjects;
