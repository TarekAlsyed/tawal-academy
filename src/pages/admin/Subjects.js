import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import API_BASE_URL, { API_ENDPOINTS } from '../../config/api';
import { FiPlus, FiEdit2, FiTrash2, FiEye } from 'react-icons/fi';
import AdminLayout from '../../components/admin/AdminLayout';
import '../../styles/AdminPages.css';

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
      await api.delete(API_ENDPOINTS.ADMIN_SUBJECT_BY_ID(id));
      toast.success('تم حذف المادة بنجاح');
      fetchSubjects();
    } catch (error) {
      toast.error('فشل حذف المادة');
    }
  };

  if (loading) return <AdminLayout><div className="loading">جاري التحميل...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1>إدارة المواد</h1>
        <button className="btn-primary" onClick={() => navigate('/admin/add-subject')}>
          <FiPlus /> إضافة مادة جديدة
        </button>
      </div>

      <div className="content-card">
        {subjects.length > 0 ? (
          <div className="subjects-admin-grid">
            {subjects.map((subject) => (
              <div key={subject.id} className="subject-admin-card">
                {subject.cover_image && (
                  <img src={`${API_BASE_URL.replace('/api', '')}${subject.cover_image}`} alt={subject.name} />
                )}
                <div className="subject-admin-info">
                  <h3>{subject.name}</h3>
                  <p className="subject-term">{subject.term_name}</p>
                  {subject.description && <p className="subject-desc">{subject.description}</p>}
                  
                  <div className="subject-admin-stats">
                    <span>📄 {subject.pdfs_count || 0} ملف</span>
                    <span>🖼️ {subject.images_count || 0} صورة</span>
                    <span>📝 {subject.exams_count || 0} امتحان</span>
                  </div>

                  <div className="subject-admin-actions">
                    <button 
                      className="btn-icon view" 
                      onClick={() => navigate(`/admin/subject/${subject.id}`)}
                      title="عرض التفاصيل"
                    >
                      <FiEye /> عرض
                    </button>
                    <button 
                      className="btn-icon edit" 
                      onClick={() => navigate(`/admin/subject/${subject.id}`)}
                      title="تعديل"
                    >
                      <FiEdit2 /> تعديل
                    </button>
                    <button 
                      className="btn-icon delete" 
                      onClick={() => handleDelete(subject.id)}
                      title="حذف"
                    >
                      <FiTrash2 /> حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>لا توجد مواد</p>
            <button className="btn-primary" onClick={() => navigate('/admin/add-subject')}>
              <FiPlus /> إضافة مادة جديدة
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Subjects;
