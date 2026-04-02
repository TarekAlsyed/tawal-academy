import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import moment from 'moment';
import { FiArrowRight, FiSave, FiClock, FiAward, FiEdit2 } from 'react-icons/fi';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import AdminLayout from '../../components/admin/AdminLayout';
// import '../../styles/AdminPages.css'; // Commented out to use global COMPLETE-ADMIN-DESIGN.css

const AddExam = () => {
  const { subjectId, id } = useParams(); // id is used for editing
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 1,
    passing_score: 50,
    time_limit: 30,
    points: 10,
    start_date: '',
    end_date: '',
    is_published: true
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [actualSubjectId, setActualSubjectId] = useState(subjectId);

  const fetchExamData = useCallback(async () => {
    if (!isEditMode) return;
    
    try {
      setFetching(true);
      const response = await api.get(`/admin/exams/${id}`);
      if (response.data.success) {
        const exam = response.data.data;
        
        // Helper to format date string to local datetime-local input format using moment
        const formatDateForInput = (dateString) => {
          if (!dateString) return '';
          // Using moment ensures we handle the incoming date consistently
          return moment(dateString).format('YYYY-MM-DDTHH:mm');
        };

        setFormData({
          title: exam.title || exam.name || '',
          description: exam.description || '',
          level: exam.level || 1,
          passing_score: exam.passing_score || 50,
          time_limit: exam.time_limit || 30,
          points: exam.points || 10,
          start_date: formatDateForInput(exam.start_date),
          end_date: formatDateForInput(exam.end_date),
          is_published: exam.is_published !== false
        });
        setActualSubjectId(exam.subject_id);
      }
    } catch (error) {
      toast.error('فشل تحميل بيانات الامتحان');
      navigate(-1);
    } finally {
      setFetching(false);
    }
  }, [id, isEditMode, navigate]);

  useEffect(() => {
    fetchExamData();
  }, [fetchExamData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : (name === 'level' || name === 'passing_score' || name === 'time_limit' || name === 'points') ? parseInt(value) || 0 : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('يرجى إدخال عنوان الامتحان');
      return;
    }

    setLoading(true);

    try {
      let response;
      // We send the date as a full ISO string (UTC)
      // This ensures that regardless of where the server or user is, the time is consistent
      const payload = {
        subject_id: parseInt(actualSubjectId),
        level: formData.level,
        title: formData.title,
        description: formData.description,
        time_limit: formData.time_limit,
        passing_score: formData.passing_score,
        points: formData.points,
        start_date: formData.start_date ? moment(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? moment(formData.end_date).toISOString() : null,
        is_published: formData.is_published
      };

      if (isEditMode) {
        response = await api.put(`/admin/exams/${id}`, payload);
      } else {
        response = await api.post(API_ENDPOINTS.ADMIN_EXAMS, payload);
      }
      
      if (response.data.success) {
        toast.success(isEditMode ? 'تم تحديث الامتحان بنجاح' : 'تم إنشاء الامتحان بنجاح');
        navigate(`/admin/subjects/${actualSubjectId}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || (isEditMode ? 'فشل تحديث الامتحان' : 'فشل إنشاء الامتحان'));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <AdminLayout>
        <div className="admin-main">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'white' }}>
            جاري تحميل بيانات الامتحان...
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header-title">
            <h1>{isEditMode ? 'تعديل الامتحان' : 'إضافة امتحان جديد'}</h1>
            <p>{isEditMode ? `تعديل إعدادات ${formData.title}` : 'قم بإنشاء وتخصيص اختبار جديد لطلابك'}</p>
          </div>
          <div className="admin-header-actions">
            <button
              className="admin-btn admin-btn-secondary"
              onClick={() => navigate(`/admin/subjects/${actualSubjectId}`)}
            >
              <FiArrowRight />
              العودة للمادة
            </button>
          </div>
        </header>

        <div className="admin-content">
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">إعدادات الامتحان الأساسية</h2>
            </div>
            
            <div className="admin-card-body" style={{ padding: '2rem' }}>
              <form onSubmit={handleSubmit} className="admin-form">
                <div className="admin-form-group">
                  <label htmlFor="title" className="admin-label">عنوان الامتحان</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    className="admin-input"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    placeholder="مثال: الاختبار الفتري الأول - مادة الرياضيات"
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="description" className="admin-label">وصف الاختبار</label>
                  <textarea
                    id="description"
                    name="description"
                    className="admin-textarea"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="أدخل تعليمات الاختبار أو وصفاً موجزاً..."
                    rows="3"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                  <div className="admin-form-group">
                    <label htmlFor="level" className="admin-label">مستوى الامتحان (1: سهل، 2: متوسط، 3: صعب)</label>
                    <select
                      id="level"
                      name="level"
                      className="admin-input"
                      value={formData.level}
                      onChange={handleChange}
                      required
                    >
                      <option value={1}>1 - سهل</option>
                      <option value={2}>2 - متوسط</option>
                      <option value={3}>3 - صعب</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="passing_score" className="admin-label">درجة النجاح المطلوبة (%)</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        id="passing_score"
                        name="passing_score"
                        className="admin-input"
                        min="0"
                        max="100"
                        value={formData.passing_score}
                        onChange={handleChange}
                        required
                      />
                      <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)', fontWeight: '700' }}>%</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginTop: '0.5rem' }}>
                  <div className="admin-form-group">
                    <label htmlFor="time_limit" className="admin-label">
                      المدة الزمنية (بالدقائق)
                    </label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <FiClock style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-primary)' }} />
                        <input
                          type="number"
                          id="time_limit"
                          name="time_limit"
                          className="admin-input"
                          style={{ paddingRight: '2.5rem' }}
                          min="0"
                          value={formData.time_limit}
                          onChange={handleChange}
                          disabled={formData.time_limit === 0}
                          required={formData.time_limit !== 0}
                        />
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', color: 'var(--admin-text)' }}>
                        <input 
                          type="checkbox" 
                          checked={formData.time_limit === 0} 
                          onChange={(e) => setFormData({...formData, time_limit: e.target.checked ? 0 : 30})}
                          style={{ width: '1.1rem', height: '1.1rem' }}
                        />
                        وقت غير محدود
                      </label>
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="points" className="admin-label">النقاط الإجمالية للامتحان</label>
                    <div style={{ position: 'relative' }}>
                      <FiAward style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-gold)' }} />
                      <input
                        type="number"
                        id="points"
                        name="points"
                        className="admin-input"
                        style={{ paddingRight: '2.5rem' }}
                        min="0"
                        value={formData.points}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginTop: '0.5rem' }}>
                  <div className="admin-form-group">
                    <label htmlFor="start_date" className="admin-label">موعد بدء الاختبار (اختياري)</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="datetime-local"
                        id="start_date"
                        name="start_date"
                        className="admin-input"
                        value={formData.start_date}
                        onChange={handleChange}
                        style={{ paddingRight: '1rem' }}
                      />
                      {/* Note: Native datetime-local inputs have arrows in most browsers (Chrome/Edge) */}
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="end_date" className="admin-label">موعد انتهاء الاختبار (اختياري)</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="datetime-local"
                        id="end_date"
                        name="end_date"
                        className="admin-input"
                        value={formData.end_date}
                        onChange={handleChange}
                        style={{ paddingRight: '1rem' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="admin-form-group" style={{ marginTop: '1rem', background: 'var(--admin-bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--admin-border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="is_published"
                      checked={formData.is_published}
                      onChange={handleChange}
                      style={{ width: '1.25rem', height: '1.25rem', accentColor: 'var(--admin-primary)' }}
                    />
                    <span style={{ fontWeight: '700', color: 'var(--admin-text)' }}>تفعيل ونشر الاختبار للطلاب فوراً</span>
                  </label>
                </div>

                <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => navigate(`/admin/subjects/${actualSubjectId}`)}
                    disabled={loading}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary"
                    disabled={loading}
                    style={{ padding: '0.75rem 2.5rem' }}
                  >
                    {isEditMode ? <FiEdit2 /> : <FiSave />}
                    {loading ? 'جاري الحفظ...' : (isEditMode ? 'حفظ التغييرات' : 'إنشاء الاختبار')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AddExam;
