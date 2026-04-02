import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { 
  FiTrash2, FiEdit2, FiSave, FiX, FiPlus, FiFilter, FiBook, 
  FiSearch, FiCheckCircle, FiChevronDown, FiChevronUp, FiInfo,
  FiHelpCircle, FiActivity, FiArrowRight
} from 'react-icons/fi';
import AdminLayout from '../../components/admin/AdminLayout';

const QuestionBank = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    subject_id: '',
    type: '',
    difficulty_level: ''
  });
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    subject_id: '',
    question_text: '',
    type: 'multiple',
    options: { a: '', b: '', c: '', d: '' },
    correct_answer: '',
    explanation: '',
    difficulty_level: 1,
    tags: []
  });

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ADMIN_QUESTION_BANK, { params: filters });
      if (response.data.success) {
        setQuestions(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (error) {
      toast.error('فشل تحميل بنك الأسئلة');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN_SUBJECTS);
      if (response.data.success) {
        setSubjects(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (error) {
      console.error('فشل تحميل المواد');
      setSubjects([]);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
    fetchSubjects();
  }, [fetchQuestions, fetchSubjects]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('option_')) {
      const optionKey = name.split('_')[1];
      setFormData(prev => ({
        ...prev,
        options: { ...prev.options, [optionKey]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      subject_id: '',
      question_text: '',
      type: 'multiple',
      options: { a: '', b: '', c: '', d: '' },
      correct_answer: '',
      explanation: '',
      difficulty_level: 1,
      tags: []
    });
    setEditingQuestion(null);
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (editingQuestion) {
        response = await api.put(API_ENDPOINTS.ADMIN_QUESTION_BANK_ITEM(editingQuestion.id), formData);
      } else {
        response = await api.post(API_ENDPOINTS.ADMIN_QUESTION_BANK, formData);
      }

      if (response.data.success) {
        toast.success(editingQuestion ? 'تم تحديث السؤال' : 'تم إضافة السؤال');
        resetForm();
        fetchQuestions();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل حفظ السؤال');
    }
  };

  const handleEdit = (question) => {
    setFormData({
      subject_id: question.subject_id || '',
      question_text: question.question_text,
      type: question.type,
      options: question.options || { a: '', b: '', c: '', d: '' },
      correct_answer: question.correct_answer,
      explanation: question.explanation || '',
      difficulty_level: question.difficulty_level || 1,
      tags: question.tags || []
    });
    setEditingQuestion(question);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السؤال من البنك؟')) return;
    try {
      const response = await api.delete(API_ENDPOINTS.ADMIN_QUESTION_BANK_ITEM(id));
      if (response.data.success) {
        toast.success('تم حذف السؤال');
        fetchQuestions();
      }
    } catch (error) {
      toast.error('فشل حذف السؤال');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('⚠️ تحذير: هل أنت متأكد من حذف جميع الأسئلة في البنك؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
      setLoading(true);
      const response = await api.delete('/admin/question-bank/all');
      if (response.data.success) {
        toast.success('تم تفريغ بنك الأسئلة بالكامل');
        fetchQuestions();
      }
    } catch (error) {
      toast.error('فشل حذف الأسئلة');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter(q => 
    q.question_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDifficultyColor = (level) => {
    if (level <= 2) return 'success';
    if (level <= 3) return 'warning';
    return 'danger';
  };

  return (
    <AdminLayout>
      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header-title">
            <h1>بنك الأسئلة المركزي</h1>
            <p>إدارة وتحرير مكتبة الأسئلة الشاملة وتصنيفها</p>
          </div>
          <div className="admin-header-actions">
            <button className="admin-btn admin-btn-secondary" onClick={() => navigate('/admin/subjects')}>
              <FiArrowRight /> رجوع للمواد
            </button>
            {questions.length > 0 && (
              <button className="admin-btn admin-btn-danger" onClick={handleDeleteAll}>
                <FiTrash2 /> حذف جميع الأسئلة
              </button>
            )}
            <button className="admin-btn admin-btn-primary" onClick={() => setShowModal(true)}>
              <FiPlus /> إضافة سؤال جديد
            </button>
          </div>
        </header>

        {/* Stats Summary */}
        <div className="admin-stats">
          <div className="admin-stat-card primary">
            <div className="admin-stat-header">
              <div className="admin-stat-icon"><FiHelpCircle /></div>
            </div>
            <div className="admin-stat-body">
              <h3>إجمالي الأسئلة</h3>
              <p className="admin-stat-value">{questions.length}</p>
            </div>
          </div>
          <div className="admin-stat-card success">
            <div className="admin-stat-header">
              <div className="admin-stat-icon"><FiBook /></div>
            </div>
            <div className="admin-stat-body">
              <h3>المواد المشمولة</h3>
              <p className="admin-stat-value">{(Array.isArray(questions) ? new Set(questions.map(q => q.subject_id)) : new Set()).size}</p>
            </div>
          </div>
          <div className="admin-stat-card warning">
            <div className="admin-stat-header">
              <div className="admin-stat-icon"><FiActivity /></div>
            </div>
            <div className="admin-stat-body">
              <h3>متوسط الصعوبة</h3>
              <p className="admin-stat-value">
                {(Array.isArray(questions) && questions.length > 0 ? (questions.reduce((acc, q) => acc + (q.difficulty_level || 1), 0) / questions.length) : 0).toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="admin-card" style={{ marginBottom: '2rem' }}>
          <div className="admin-card-header">
            <h2 className="admin-card-title"><FiFilter /> تصفية وبحث</h2>
          </div>
          <div className="admin-card-body" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <div style={{ position: 'relative' }}>
                  <FiSearch style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-light)' }} />
                  <input 
                    type="text" 
                    placeholder="بحث في نص السؤال..." 
                    className="admin-input" 
                    style={{ paddingRight: '40px' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <select name="subject_id" value={filters.subject_id} onChange={handleFilterChange} className="admin-select">
                  <option value="">جميع المواد</option>
                  {Array.isArray(subjects) && subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <select name="type" value={filters.type} onChange={handleFilterChange} className="admin-select">
                  <option value="">جميع الأنواع</option>
                  <option value="multiple">اختيار من متعدد</option>
                  <option value="true_false">صح أو خطأ</option>
                  <option value="essay">سؤال مقالي</option>
                </select>
              </div>
              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <select name="difficulty_level" value={filters.difficulty_level} onChange={handleFilterChange} className="admin-select">
                  <option value="">جميع المستويات</option>
                  {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>مستوى {l}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="admin-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>جاري التحميل...</div>
          ) : filteredQuestions.length === 0 ? (
            <div className="admin-card" style={{ padding: '4rem', textAlign: 'center' }}>
              <FiInfo size={48} color="var(--admin-text-light)" style={{ marginBottom: '1rem' }} />
              <h3>لا توجد أسئلة تطابق البحث</h3>
              <p color="var(--admin-text-muted)">حاول تغيير معايير التصفية أو أضف سؤالاً جديداً</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredQuestions.map((q) => (
                <div key={q.id} className="admin-card" style={{ transition: 'all 0.3s ease' }}>
                  <div 
                    style={{ 
                      padding: '1.25rem 1.5rem', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: expandedId === q.id ? 'var(--admin-primary-light)' : 'white'
                    }}
                    onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                        <span className="status-badge info">
                          {subjects.find(s => s.id === q.subject_id)?.name || 'بدون مادة'}
                        </span>
                        <span className={`status-badge ${getDifficultyColor(q.difficulty_level)}`}>
                          مستوى {q.difficulty_level}
                        </span>
                        <span className="status-badge secondary">
                          {q.type === 'multiple' ? 'اختيار من متعدد' : q.type === 'true_false' ? 'صح/خطأ' : 'مقالي'}
                        </span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--admin-text)' }}>{q.question_text}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <button 
                        className="admin-btn admin-btn-secondary" 
                        onClick={(e) => { e.stopPropagation(); handleEdit(q); }} 
                        style={{ padding: '0.5rem', borderRadius: '6px' }}
                        title="تعديل"
                      >
                        <FiEdit2 />
                      </button>
                      <button 
                        className="admin-btn admin-btn-danger" 
                        onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }} 
                        style={{ padding: '0.5rem', borderRadius: '6px' }}
                        title="حذف"
                      >
                        <FiTrash2 />
                      </button>
                      {expandedId === q.id ? <FiChevronUp /> : <FiChevronDown />}
                    </div>
                  </div>

                  {expandedId === q.id && (
                    <div style={{ padding: '1.5rem', borderTop: '1px solid var(--admin-border)', background: '#fafafa' }}>
                      {q.type === 'multiple' && q.options && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                          {Object.entries(q.options).map(([key, val]) => (
                            <div 
                              key={key} 
                              style={{ 
                                padding: '0.75rem 1rem', 
                                borderRadius: '8px', 
                                border: '1px solid var(--admin-border)',
                                background: q.correct_answer === key ? 'var(--admin-success-light)' : 'white',
                                borderColor: q.correct_answer === key ? 'var(--admin-success)' : 'var(--admin-border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                              }}
                            >
                              <span style={{ 
                                width: '24px', 
                                height: '24px', 
                                borderRadius: '50%', 
                                background: q.correct_answer === key ? 'var(--admin-success)' : 'var(--admin-bg-primary)',
                                color: q.correct_answer === key ? 'white' : 'var(--admin-text)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                fontWeight: 'bold'
                              }}>
                                {key.toUpperCase()}
                              </span>
                              <span>{val}</span>
                              {q.correct_answer === key && <FiCheckCircle style={{ marginRight: 'auto', color: 'var(--admin-success)' }} />}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'true_false' && (
                        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                          <div className={`status-badge ${q.correct_answer === 'true' ? 'success' : 'secondary'}`} style={{ padding: '0.5rem 1.5rem' }}>صح</div>
                          <div className={`status-badge ${q.correct_answer === 'false' ? 'danger' : 'secondary'}`} style={{ padding: '0.5rem 1.5rem' }}>خطأ</div>
                        </div>
                      )}

                      {q.explanation && (
                        <div style={{ padding: '1rem', background: 'var(--admin-primary-light)', borderRadius: '8px', borderRight: '4px solid var(--admin-primary)' }}>
                          <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--admin-primary)' }}><FiInfo /> التفسير التعليمي:</strong>
                          <p style={{ margin: 0, color: 'var(--admin-text)' }}>{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal for Add/Edit */}
        {showModal && (
          <div className="admin-modal-overlay">
            <div className="admin-modal" style={{ maxWidth: '800px' }}>
              <div className="admin-modal-header">
                <h2 className="admin-modal-title">{editingQuestion ? 'تعديل سؤال' : 'إضافة سؤال جديد'}</h2>
                <button className="admin-close-btn" onClick={resetForm}><FiX /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="admin-modal-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="admin-form-group">
                      <label className="admin-label">المادة التعليمية</label>
                      <select name="subject_id" value={formData.subject_id} onChange={handleChange} className="admin-select" required>
                        <option value="">اختر المادة</option>
                        {Array.isArray(subjects) && subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">نوع السؤال</label>
                      <select name="type" value={formData.type} onChange={handleChange} className="admin-select">
                        <option value="multiple">اختيار من متعدد</option>
                        <option value="true_false">صح أو خطأ</option>
                        <option value="essay">سؤال مقالي</option>
                      </select>
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">نص السؤال</label>
                    <textarea 
                      name="question_text" 
                      value={formData.question_text} 
                      onChange={handleChange} 
                      className="admin-textarea" 
                      rows="4" 
                      placeholder="اكتب نص السؤال هنا بشكل واضح..."
                      required 
                    />
                  </div>

                  {formData.type === 'multiple' && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label className="admin-label">خيارات الإجابة</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        {['a', 'b', 'c', 'd'].map(opt => (
                          <div key={opt} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--admin-primary)' }}>{opt.toUpperCase()}.</span>
                            <input 
                              type="text" 
                              name={`option_${opt}`} 
                              value={formData.options[opt]} 
                              onChange={handleChange} 
                              className="admin-input" 
                              placeholder={`الخيار ${opt.toUpperCase()}`}
                              required 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="admin-form-group">
                      <label className="admin-label">الإجابة الصحيحة</label>
                      {formData.type === 'multiple' ? (
                        <select name="correct_answer" value={formData.correct_answer} onChange={handleChange} className="admin-select" required>
                          <option value="">حدد الإجابة الصحيحة</option>
                          <option value="a">الخيار A</option>
                          <option value="b">الخيار B</option>
                          <option value="c">الخيار C</option>
                          <option value="d">الخيار D</option>
                        </select>
                      ) : formData.type === 'true_false' ? (
                        <select name="correct_answer" value={formData.correct_answer} onChange={handleChange} className="admin-select" required>
                          <option value="">حدد الحالة الصحيحة</option>
                          <option value="true">صح</option>
                          <option value="false">خطأ</option>
                        </select>
                      ) : (
                        <textarea 
                          name="correct_answer" 
                          value={formData.correct_answer} 
                          onChange={handleChange} 
                          className="admin-textarea" 
                          rows="2" 
                          placeholder="الكلمات المفتاحية للإجابة النموذجية..." 
                          required 
                        />
                      )}
                    </div>
                    <div className="admin-form-group">
                      <label className="admin-label">مستوى الصعوبة</label>
                      <select name="difficulty_level" value={formData.difficulty_level} onChange={handleChange} className="admin-select">
                        {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>مستوى {l} {l <= 2 ? '(سهل)' : l <= 3 ? '(متوسط)' : '(صعب)'}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-label">التفسير التعليمي (يظهر للطالب بعد الإجابة)</label>
                    <textarea 
                      name="explanation" 
                      value={formData.explanation} 
                      onChange={handleChange} 
                      className="admin-textarea" 
                      rows="3" 
                      placeholder="اشرح لماذا هذه الإجابة صحيحة..."
                    />
                  </div>
                </div>
                <div className="admin-modal-footer">
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={resetForm}>إلغاء</button>
                  <button type="submit" className="admin-btn admin-btn-primary">
                    <FiSave /> {editingQuestion ? 'حفظ التعديلات' : 'إضافة لبنك الأسئلة'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default QuestionBank;

