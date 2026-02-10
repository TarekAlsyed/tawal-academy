import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import AdminLayout from '../../components/admin/AdminLayout';
import '../../styles/AdminPages.css';

const AddSubject = () => {
  const [terms, setTerms] = useState([]);
  const [formData, setFormData] = useState({
    termId: '',
    name: '',
    description: '',
    status: 'open'
  });
  const [coverImage, setCoverImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN_TERMS);
      if (response.data.success) {
        setTerms(response.data.data.terms);
      }
    } catch (error) {
      toast.error('فشل تحميل الترمات');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجا');
        return;
      }
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

      await api.post(API_ENDPOINTS.ADMIN_SUBJECTS, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('تم إضافة المادة بنجاح');
      navigate('/admin/subjects');
    } catch (error) {
      toast.error(error.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1>إضافة مادة جديدة</h1>
      </div>

      <div className="content-card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>الترم *</label>
              <select name="termId" value={formData.termId} onChange={handleChange} required>
                <option value="">اختر الترم</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>اسم المادة *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="مثال: الرياضيات"
                required
              />
            </div>

            <div className="form-group full-width">
              <label>الوصف</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="وصف المادة (اختياري)"
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>الحالة</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="open">مفتوحة</option>
                <option value="closed">مغلقة</option>
              </select>
            </div>

            <div className="form-group">
              <label>صورة الغلاف (اختياري)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              <small>الحد الأقصى 2 ميجا</small>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'جاري الإضافة...' : 'إضافة المادة'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/admin/subjects')}
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AddSubject;