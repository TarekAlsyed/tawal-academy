import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import AdminLayout from '../../components/admin/AdminLayout';
import '../../styles/AdminPages.css';

const AddExam = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: 1,
    passing_score: 60,
    duration_minutes: 30,
    max_attempts: 3
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم الامتحان');
      return;
    }

    setLoading(true);

    try {
      // Align with backend expected keys (camelCase and specific names)
      const response = await api.post(API_ENDPOINTS.ADMIN_EXAMS, {
        subjectId: parseInt(subjectId),
        name: formData.name,
        level: formData.level,
        passPercentage: formData.passing_score,
        status: 'open' // Default status
      });
      
      if (response.data.success) {
        toast.success('تم إنشاء الامتحان بنجاح');
        navigate(`/admin/subject/${subjectId}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل إنشاء الامتحان');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-content">
        <div className="page-header">
          <h1>إضافة امتحان جديد</h1>
          <button
            className="btn-back"
            onClick={() => navigate(`/admin/subject/${subjectId}`)}
          >
            العودة
          </button>
        </div>

        <div className="form-container">
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-group">
              <label htmlFor="name">اسم الامتحان</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="أدخل اسم الامتحان"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">الوصف</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="أدخل وصف الامتحان (اختياري)"
                rows="3"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="level">المستوى</label>
                <input
                  type="number"
                  id="level"
                  name="level"
                  min="1"
                  max="10"
                  value={formData.level}
                  onChange={handleChange}
                  required
                />
                <small>المستوى يحدد تسلسل الامتحانات</small>
              </div>

              <div className="form-group">
                <label htmlFor="passing_score">درجة النجاح (%)</label>
                <input
                  type="number"
                  id="passing_score"
                  name="passing_score"
                  min="0"
                  max="100"
                  value={formData.passing_score}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="duration_minutes">المدة (دقائق)</label>
                <input
                  type="number"
                  id="duration_minutes"
                  name="duration_minutes"
                  min="5"
                  max="180"
                  value={formData.duration_minutes}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="max_attempts">عدد المحاولات المسموح</label>
                <input
                  type="number"
                  id="max_attempts"
                  name="max_attempts"
                  min="1"
                  max="10"
                  value={formData.max_attempts}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'جاري الإنشاء...' : 'إنشاء الامتحان'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate(`/admin/subject/${subjectId}`)}
                disabled={loading}
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AddExam;