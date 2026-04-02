import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowRight, FiSave, FiBook, FiImage, FiEdit2, FiLayers } from 'react-icons/fi';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import AdminLayout from '../../components/admin/AdminLayout';
// import '../../styles/AdminPages.css'; // Commented out to use global COMPLETE-ADMIN-DESIGN.css

const AddSubject = () => {
  const { id } = useParams();
  const [terms, setTerms] = useState([]);
  const [formData, setFormData] = useState({
    termId: '',
    name: '',
    description: '',
    status: 'open'
  });
  const [coverImage, setCoverImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const navigate = useNavigate();

  const fetchTerms = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN_TERMS);
      if (response.data.success) {
        setTerms(response.data.data.terms);
      }
    } catch (error) {
      toast.error('فشل تحميل الترمات');
    }
  }, []);

  const fetchSubject = useCallback(async () => {
    try {
      setInitialLoading(true);
      const response = await api.get(API_ENDPOINTS.ADMIN_SUBJECT_BY_ID(id));
      if (response.data.success) {
        const subject = response.data.data.subject;
        setFormData({
          termId: subject.term_id,
          name: subject.name,
          description: subject.description || '',
          status: subject.status || 'open'
        });
      }
    } catch (error) {
      toast.error('فشل تحميل بيانات المادة');
      navigate('/admin/subjects');
    } finally {
      setInitialLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchTerms();
    if (id) {
      fetchSubject();
    }
  }, [id, fetchTerms, fetchSubject]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverImage(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.termId) {
      toast.error('اسم المادة والترم مطلوبان');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('termId', formData.termId);
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('status', formData.status);
      if (coverImage) {
        data.append('cover', coverImage);
      }

      if (id) {
        await api.put(API_ENDPOINTS.ADMIN_SUBJECT_BY_ID(id), data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('تم تحديث المادة بنجاح');
      } else {
        await api.post(API_ENDPOINTS.ADMIN_SUBJECTS, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('تم إضافة المادة بنجاح');
      }

      navigate('/admin/subjects');
    } catch (error) {
      toast.error(error.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <div className="loading" style={{ color: 'var(--admin-primary)' }}>جاري التحميل...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-header">
        <div className="header-title">
          <h1>
            {id ? <FiEdit2 className="header-icon" /> : <FiBook className="header-icon" />}
            {id ? 'تعديل المادة' : 'إضافة مادة جديدة'}
          </h1>
          <p className="header-subtitle">
            {id ? 'تعديل بيانات المادة الدراسية الحالية' : 'إضافة مادة دراسية جديدة وتعيينها لترم محدد'}
          </p>
        </div>
        <button
          className="admin-btn-secondary"
          onClick={() => navigate('/admin/subjects')}
        >
          <FiArrowRight />
          العودة للمواد
        </button>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2 className="admin-card-title">{id ? 'بيانات المادة' : 'بيانات المادة الجديدة'}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="admin-form">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="admin-label">
                <FiLayers style={{ marginLeft: '0.5rem' }} />
                الترم *
              </label>
              <select 
                name="termId" 
                value={formData.termId} 
                onChange={handleChange} 
                className="admin-select"
                required
              >
                <option value="">اختر الترم</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="admin-label">
                <FiBook style={{ marginLeft: '0.5rem' }} />
                اسم المادة *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="admin-input"
                placeholder="مثال: الرياضيات"
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label className="admin-label">الوصف</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="admin-textarea"
              placeholder="وصف المادة (اختياري)"
              rows="3"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
            <div className="form-group">
              <label className="admin-label">الحالة</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange}
                className="admin-select"
              >
                <option value="open">مفتوحة</option>
                <option value="closed">مغلقة</option>
              </select>
            </div>

            <div className="form-group">
              <label className="admin-label">
                <FiImage style={{ marginLeft: '0.5rem' }} />
                صورة الغلاف (اختياري)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="admin-input"
                  style={{ paddingTop: '0.5rem' }}
                />
              </div>
              <small style={{ color: 'var(--admin-text-muted)', display: 'block', marginTop: '0.5rem' }}>
                يتم الحفظ تلقائياً عند الرفع
              </small>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() => navigate('/admin/subjects')}
              disabled={loading}
            >
              إلغاء
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
              <FiSave style={{ marginLeft: '0.5rem' }} />
              {loading ? (id ? 'جاري التحديث...' : 'جاري الإضافة...') : (id ? 'حفظ التعديلات' : 'إضافة المادة')}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AddSubject;
