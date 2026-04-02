import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiAlertTriangle, FiBook, FiX } from 'react-icons/fi';
import api from '../../services/api';
import AdminLayout from '../../components/admin/AdminLayout';

const Violations = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [formData, setFormData] = useState({
    user_id: '',
    exam_id: '',
    violation_type: 'cheat',
    description: '',
    evidence_url: '',
    severity: 'medium',
    action_taken: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch violations - this is the core requirement for this page
      const violationsRes = await api.get('/admin/violations');
      if (violationsRes.data.success) {
        setViolations(violationsRes.data.data || []);
      }

      // Try fetching auxiliary data but don't fail if they do (due to permissions)
      try {
        const [studentsRes, examsRes] = await Promise.all([
          api.get('/admin/students'),
          api.get('/admin/exams')
        ]);
        
        if (studentsRes.data.success) setStudents(studentsRes.data.data || []);
        if (examsRes.data.success) setExams(examsRes.data.data || []);
      } catch (auxError) {
        console.warn('Could not fetch auxiliary students/exams data (permission issue?):', auxError);
      }
      
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('فشل تحميل سجل المخالفات');
      setViolations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/violations', formData);
      toast.success('تم تسجيل المخالفة بنجاح');
      setShowModal(false);
      fetchInitialData();
    } catch (error) {
      toast.error('فشل تسجيل المخالفة');
    }
  };

  return (
    <AdminLayout title="سجل مخالفات الطلاب">
      <div className="admin-container">
        <div className="admin-header-actions">
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <FiPlus /> تسجيل مخالفة جديدة
          </button>
        </div>

        <div className="admin-card">
          {loading ? (
            <div className="loading-spinner">جاري التحميل...</div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>الامتحان</th>
                    <th>نوع المخالفة</th>
                    <th>الخطورة</th>
                    <th>المبلغ عنه</th>
                    <th>الإجراء المتخذ</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((violation) => (
                    <tr key={violation.id}>
                      <td>
                        <div className="admin-info">
                          <span className="admin-name">{violation.student_name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex-items">
                          <FiBook className="icon-small" /> {violation.exam_name}
                        </div>
                      </td>
                      <td>
                        <div className="flex-items text-danger">
                          <FiAlertTriangle className="icon-small" /> 
                          {violation.violation_type === 'cheat' ? 'محاولة غش' : 
                           violation.violation_type === 'noise' ? 'إحداث ضوضاء' : 
                           violation.violation_type === 'electronic_device' ? 'استخدام جهاز إلكتروني' : 'أخرى'}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${violation.severity === 'high' || violation.severity === 'critical' ? 'danger' : 'warning'}`}>
                          {violation.severity === 'critical' ? 'حرج' : 
                           violation.severity === 'high' ? 'عالية' : 
                           violation.severity === 'medium' ? 'متوسطة' : 'منخفضة'}
                        </span>
                      </td>
                      <td>{violation.reporter_name}</td>
                      <td>{violation.action_taken || 'قيد المراجعة'}</td>
                    </tr>
                  ))}
                  {violations.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center">لا توجد مخالفات مسجلة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content admin-modal">
            <div className="modal-header">
              <h3>تسجيل مخالفة انضباطية</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>البحث عن الطالب</label>
                <select 
                  required
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                >
                  <option value="">-- اختر الطالب --</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>{student.name} ({student.email})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>الامتحان</label>
                <select 
                  required
                  value={formData.exam_id}
                  onChange={(e) => setFormData({ ...formData, exam_id: e.target.value })}
                >
                  <option value="">-- اختر الامتحان --</option>
                  {exams.map(exam => (
                    <option key={exam.id} value={exam.id}>{exam.title || exam.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>نوع المخالفة</label>
                  <select 
                    value={formData.violation_type}
                    onChange={(e) => setFormData({ ...formData, violation_type: e.target.value })}
                  >
                    <option value="cheat">محاولة غش</option>
                    <option value="noise">إحداث ضوضاء</option>
                    <option value="electronic_device">استخدام جهاز إلكتروني</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>درجة الخطورة</label>
                  <select 
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  >
                    <option value="low">منخفضة</option>
                    <option value="medium">متوسطة</option>
                    <option value="high">عالية</option>
                    <option value="critical">حرجة جداً</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>وصف المخالفة بالتفصيل</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="اشرح ما حدث بدقة..."
                />
              </div>
              <div className="form-group">
                <label>الإجراء المتخذ (اختياري)</label>
                <input
                  type="text"
                  value={formData.action_taken}
                  onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}
                  placeholder="مثال: حرمان من الامتحان، إنذار كتابي..."
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                <button type="submit" className="btn-primary">تسجيل المخالفة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Violations;
