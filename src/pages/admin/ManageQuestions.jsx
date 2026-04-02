import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { FiTrash2, FiEdit2, FiSave, FiX, FiUpload, FiFileText, FiList, FiCheckCircle, FiDatabase, FiPlus, FiArrowRight } from 'react-icons/fi';
import AdminLayout from '../../components/admin/AdminLayout';

const ManageQuestions = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [subjectId, setSubjectId] = useState(null);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState('manual'); // 'manual', 'excel', 'text', 'bank'
  const [excelFile, setExcelFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    question_text: '',
    type: 'multiple',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: '',
    explanation: ''
  });

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ADMIN_EXAM_BY_ID(examId));
      if (response.data.success) {
        setQuestions(response.data.data.questions || []);
        setSubjectId(response.data.data.subject_id);
        
        // جلب أسئلة البنك المتعلقة بنفس المادة
        const bankRes = await api.get(API_ENDPOINTS.ADMIN_QUESTION_BANK, {
          params: { subject_id: response.data.data.subject_id }
        });
        if (bankRes.data.success) {
          setBankQuestions(bankRes.data.data);
        }
      }
      
      // جلب التحليلات
      const analyticsResponse = await api.get(API_ENDPOINTS.ADMIN_EXAM_ANALYTICS(examId));
      if (analyticsResponse.data.success) {
        const analyticsData = {};
        analyticsResponse.data.data.forEach(item => {
          analyticsData[item.id] = item;
        });
        setAnalytics(analyticsData);
      }
    } catch (error) {
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddToExamFromBank = async (bankQuestionId) => {
    try {
      setLoading(true);
      const response = await api.post(API_ENDPOINTS.ADMIN_ADD_FROM_BANK(examId), {
        question_bank_id: bankQuestionId,
        question_order: questions.length + 1,
        points: 10
      });

      if (response.data.success) {
        toast.success('تم إضافة السؤال من البنك بنجاح');
        fetchQuestions();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل إضافة السؤال من البنك');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      question_text: '',
      type: 'multiple',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: '',
      explanation: ''
    });
    setEditingQuestion(null);
    setAddMode('manual');
    setExcelFile(null);
    setTextInput('');
  };

  const handleExcelUpload = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      toast.error('يرجى اختيار ملف Excel');
      return;
    }

    const formData = new FormData();
    formData.append('excel', excelFile);

    try {
      setLoading(true);
      const response = await api.post(
        API_ENDPOINTS.ADMIN_IMPORT_QUESTIONS(examId),
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        resetForm();
        fetchQuestions();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل رفع ملف Excel');
    } finally {
      setLoading(false);
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textInput.trim()) {
      toast.error('يرجى إدخال النص');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(
        API_ENDPOINTS.ADMIN_ADD_QUESTIONS_TEXT(examId),
        { text: textInput }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        resetForm();
        fetchQuestions();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل إضافة الأسئلة من النص');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.question_text.trim()) {
      toast.error('يرجى إدخال نص السؤال');
      return;
    }

    if (!formData.correct_answer) {
      toast.error('يرجى اختيار الإجابة الصحيحة');
      return;
    }

    try {
      let response;
      if (editingQuestion) {
        // Backend update endpoint: PUT /exams/:examId/questions/:questionId
        response = await api.put(
          API_ENDPOINTS.ADMIN_UPDATE_QUESTION(examId, editingQuestion.id),
          formData
        );
      } else {
        // Backend add endpoint: POST /exams/:id/questions/manual
        response = await api.post(
          API_ENDPOINTS.ADMIN_ADD_QUESTIONS_MANUAL(examId),
          { questions: [formData] }
        );
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
    const options = question.options || {};
    setFormData({
      question_text: question.question_text,
      type: question.type,
      option_a: options.a || '',
      option_b: options.b || '',
      option_c: options.c || '',
      option_d: options.d || '',
      correct_answer: String(question.correct_answer).toLowerCase(),
      explanation: question.explanation || ''
    });
    setEditingQuestion(question);
    setAddMode('manual');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToBank = async (question) => {
    try {
      const bankData = {
        subject_id: subjectId, // We'll need to get this
        question_text: question.question_text,
        type: question.type,
        options: question.options,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        difficulty_level: 3 // Default
      };

      const response = await api.post(API_ENDPOINTS.ADMIN_QUESTION_BANK, bankData);
      if (response.data.success) {
        toast.success('تم نسخ السؤال إلى بنك الأسئلة المركزي بنجاح');
      }
    } catch (error) {
      toast.error('هذا السؤال موجود بالفعل في البنك أو حدث خطأ');
    }
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;

    try {
      const response = await api.delete(
        API_ENDPOINTS.ADMIN_DELETE_QUESTION(examId, questionId)
      );

      if (response.data.success) {
        toast.success('تم حذف السؤال');
        fetchQuestions();
      }
    } catch (error) {
      toast.error('فشل حذف السؤال');
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('⚠️ تحذير: هل أنت متأكد من حذف جميع الأسئلة؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    try {
      setLoading(true);
      const response = await api.delete(API_ENDPOINTS.ADMIN_DELETE_ALL_QUESTIONS(examId));

      if (response.data.success) {
        toast.success('تم حذف جميع الأسئلة بنجاح');
        fetchQuestions();
      }
    } catch (error) {
      toast.error('فشل حذف جميع الأسئلة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header-title">
            <h1>إدارة أسئلة الامتحان</h1>
            <p>إضافة وتعديل الأسئلة للامتحان الحالي</p>
          </div>
          <div className="admin-header-actions">
            <button 
              className="admin-btn admin-btn-secondary" 
              onClick={() => navigate(`/admin/subjects/${subjectId}`)}
            >
              <FiArrowRight /> العودة للمادة
            </button>
          </div>
        </header>

        <div className="admin-content">
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">طرق إضافة الأسئلة</h2>
              <div className="admin-header-actions" style={{ marginTop: '0' }}>
                <button 
                  className={`admin-btn ${addMode === 'manual' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                  onClick={() => setAddMode('manual')}
                >
                  <FiEdit2 /> إضافة يدوي
                </button>
                <button 
                  className={`admin-btn ${addMode === 'excel' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                  onClick={() => setAddMode('excel')}
                >
                  <FiUpload /> رفع Excel
                </button>
                <button 
                  className={`admin-btn ${addMode === 'text' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                  onClick={() => setAddMode('text')}
                >
                  <FiFileText /> نص ذكي
                </button>
                <button 
                  className={`admin-btn ${addMode === 'bank' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
                  onClick={() => setAddMode('bank')}
                >
                  <FiDatabase /> من البنك
                </button>
              </div>
            </div>

            <div className="admin-card-body" style={{ padding: '2rem' }}>
              {addMode === 'manual' && (
                <form onSubmit={handleSubmit} className="admin-form">
                  <div className="admin-form-group">
                    <label className="admin-label">نص السؤال</label>
                    <textarea
                      name="question_text"
                      value={formData.question_text}
                      onChange={handleChange}
                      className="admin-textarea"
                      rows="3"
                      placeholder="أدخل نص السؤال هنا..."
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="admin-form-group">
                      <label className="admin-label">نوع السؤال</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="admin-select"
                      >
                        <option value="multiple">اختيار من متعدد</option>
                        <option value="true_false">صح أو خطأ</option>
                      </select>
                    </div>

                    <div className="admin-form-group">
                      <label className="admin-label">الإجابة الصحيحة</label>
                      <select
                        name="correct_answer"
                        value={formData.correct_answer}
                        onChange={handleChange}
                        className="admin-select"
                        required
                      >
                        <option value="">اختر الإجابة الصحيحة</option>
                        {formData.type === 'multiple' ? (
                          <>
                            <option value="a">أ</option>
                            <option value="b">ب</option>
                            <option value="c">ج</option>
                            <option value="d">د</option>
                          </>
                        ) : (
                          <>
                            <option value="a">صح</option>
                            <option value="b">خطأ</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {formData.type === 'multiple' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                      <div className="admin-form-group">
                        <label className="admin-label">الخيار أ</label>
                        <input
                          type="text"
                          name="option_a"
                          value={formData.option_a}
                          onChange={handleChange}
                          className="admin-input"
                          required
                        />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">الخيار ب</label>
                        <input
                          type="text"
                          name="option_b"
                          value={formData.option_b}
                          onChange={handleChange}
                          className="admin-input"
                          required
                        />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">الخيار ج</label>
                        <input
                          type="text"
                          name="option_c"
                          value={formData.option_c}
                          onChange={handleChange}
                          className="admin-input"
                          required
                        />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">الخيار د</label>
                        <input
                          type="text"
                          name="option_d"
                          value={formData.option_d}
                          onChange={handleChange}
                          className="admin-input"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="admin-form-group">
                    <label className="admin-label">تفسير الإجابة (اختياري)</label>
                    <textarea
                      name="explanation"
                      value={formData.explanation}
                      onChange={handleChange}
                      className="admin-textarea"
                      rows="2"
                      placeholder="شرح لماذا هذه الإجابة هي الصحيحة..."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    {editingQuestion && (
                      <button type="button" className="admin-btn admin-btn-secondary" onClick={resetForm}>
                        <FiX /> إلغاء التعديل
                      </button>
                    )}
                    <button type="submit" className="admin-btn admin-btn-primary">
                      <FiSave /> {editingQuestion ? 'تحديث السؤال' : 'إضافة السؤال'}
                    </button>
                  </div>
                </form>
              )}

              {addMode === 'excel' && (
                <div style={{ textAlign: 'center', padding: '3rem', border: '2px dashed var(--admin-border)', borderRadius: '12px', background: 'var(--admin-bg-primary)' }}>
                  <FiUpload size={48} style={{ color: 'var(--admin-primary)', marginBottom: '1rem' }} />
                  <h3 style={{ marginBottom: '1rem', color: 'var(--admin-text)' }}>رفع ملف Excel</h3>
                  <p style={{ color: 'var(--admin-text-muted)', marginBottom: '2rem' }}>
                    قم برفع ملف Excel يحتوي على الأسئلة بالتنسيق المطلوب (A, B, C, D, الإجابة).
                  </p>
                  <form onSubmit={handleExcelUpload}>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={(e) => setExcelFile(e.target.files[0])}
                      style={{ display: 'none' }}
                      id="excel-upload"
                    />
                    <label 
                      htmlFor="excel-upload" 
                      className="admin-btn admin-btn-secondary" 
                      style={{ display: 'inline-flex', cursor: 'pointer', marginBottom: '1rem' }}
                    >
                      <FiFileText /> {excelFile ? 'تغيير الملف' : 'اختر ملف من جهازك'}
                    </label>
                    {excelFile && (
                      <div style={{ marginTop: '1rem' }}>
                        <p style={{ color: 'var(--admin-primary)', fontWeight: '700', marginBottom: '1rem' }}>الملف المختار: {excelFile.name}</p>
                        <button type="submit" className="admin-btn admin-btn-primary">
                          بدء الرفع والمعالجة
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              )}

              {addMode === 'text' && (
                <form onSubmit={handleTextSubmit}>
                  <div className="admin-form-group">
                    <label className="admin-label">إدخال نصي ذكي</label>
                    <p style={{ fontSize: '0.875rem', color: 'var(--admin-text-muted)', marginBottom: '1rem' }}>
                      اكتب الأسئلة بتنسيق طبيعي (سؤال متبوع بخيارات ثم الإجابة).
                    </p>
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      className="admin-textarea"
                      rows="10"
                      placeholder={`مثال:
1. ما هي عاصمة مصر؟
أ) الإسكندرية
ب) القاهرة
ج) الجيزة
د) أسوان
الإجابة: ب`}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="submit" className="admin-btn admin-btn-primary">
                      <FiSave /> معالجة وإضافة الأسئلة
                    </button>
                  </div>
                </form>
              )}

              {addMode === 'bank' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: 'var(--admin-primary-light)', color: 'var(--admin-primary)', borderRadius: '8px', marginBottom: '1rem' }}>
                    <p>هذه هي الأسئلة المتاحة في بنك الأسئلة المركزي لهذه المادة. يمكنك إضافتها للامتحان الحالي.</p>
                  </div>
                  {bankQuestions.filter(bq => !questions.some(q => q.question_bank_id === bq.id)).length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--admin-text-muted)' }}>لا توجد أسئلة جديدة في البنك لهذه المادة</p>
                  ) : (
                    bankQuestions
                      .filter(bq => !questions.some(q => q.question_bank_id === bq.id))
                      .map(bq => (
                        <div key={bq.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--admin-border)', borderRadius: '8px' }}>
                          <div>
                            <span className="status-badge secondary" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>مستوى {bq.difficulty_level}</span>
                            <p style={{ margin: 0, fontWeight: '700' }}>{bq.question_text}</p>
                          </div>
                          <button 
                            className="admin-btn admin-btn-primary" 
                            onClick={() => handleAddToExamFromBank(bq.id)}
                            disabled={loading}
                          >
                            <FiPlus /> إضافة للامتحان
                          </button>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="admin-card" style={{ marginTop: '2rem' }}>
            <div className="admin-card-header">
              <h2 className="admin-card-title">الأسئلة الحالية ({questions.length})</h2>
              {questions.length > 0 && (
                <button 
                  className="admin-btn admin-btn-danger" 
                  onClick={handleDeleteAll}
                >
                  <FiTrash2 /> حذف الكل
                </button>
              )}
            </div>
            
            <div className="admin-card-body" style={{ padding: '1.5rem' }}>
              {questions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--admin-text-muted)' }}>
                  <FiList size={64} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
                  <h3 style={{ fontSize: '1.5rem' }}>لا توجد أسئلة مضافة</h3>
                  <p>ابدأ بإضافة أسئلة للامتحان باستخدام الطرق المتاحة أعلاه</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {questions.map((question, index) => (
                    <div key={question.id} style={{ 
                      background: 'white', 
                      borderRadius: '16px', 
                      padding: '2rem',
                      border: '1px solid var(--admin-border)',
                      position: 'relative',
                      boxShadow: 'var(--admin-shadow-sm)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                          <span style={{ 
                            background: 'var(--admin-primary)', 
                            color: 'white', 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '8px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '0.9rem',
                            fontWeight: '800',
                            flexShrink: 0
                          }}>{index + 1}</span>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', lineHeight: '1.6', color: 'var(--admin-text)' }}>
                            {question.question_text}
                          </h3>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="admin-btn admin-btn-secondary" 
                            onClick={() => handleAddToBank(question)}
                            style={{ padding: '0.5rem', color: 'var(--admin-primary)', borderColor: 'var(--admin-primary)' }}
                            title="إضافة للبنك المركزي"
                          >
                            <FiDatabase />
                          </button>
                          <button 
                            className="admin-btn admin-btn-secondary" 
                            onClick={() => handleEdit(question)}
                            style={{ padding: '0.5rem' }}
                            title="تعديل"
                          >
                            <FiEdit2 />
                          </button>
                          <button 
                            className="admin-btn admin-btn-danger" 
                            onClick={() => handleDelete(question.id)}
                            style={{ padding: '0.5rem' }}
                            title="حذف"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        {question.type === 'multiple' ? (
                          Object.entries(question.options || {}).map(([key, value]) => (
                            <div key={key} style={{ 
                              padding: '1rem', 
                              background: question.correct_answer === key ? 'var(--admin-success-light)' : 'var(--admin-bg-primary)',
                              color: question.correct_answer === key ? 'var(--admin-success)' : 'var(--admin-text)',
                              borderRadius: '12px',
                              border: question.correct_answer === key ? '2px solid var(--admin-success)' : '1px solid var(--admin-border)',
                              fontSize: '1rem',
                              fontWeight: question.correct_answer === key ? '700' : '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem'
                            }}>
                              <span style={{ 
                                background: question.correct_answer === key ? 'var(--admin-success)' : 'white',
                                color: question.correct_answer === key ? 'white' : 'var(--admin-text-muted)',
                                width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', border: '1px solid var(--admin-border)'
                              }}>{key.toUpperCase()}</span>
                              {value}
                            </div>
                          ))
                        ) : (
                          <div style={{ 
                            padding: '1rem', 
                            background: question.correct_answer === 'a' ? 'var(--admin-success-light)' : 'var(--admin-danger-light)',
                            color: question.correct_answer === 'a' ? 'var(--admin-success)' : 'var(--admin-danger)',
                            borderRadius: '12px',
                            fontWeight: '800',
                            border: `2px solid ${question.correct_answer === 'a' ? 'var(--admin-success)' : 'var(--admin-danger)'}`
                          }}>
                            الإجابة الصحيحة: {question.correct_answer === 'a' ? 'صح' : 'خطأ'}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                        {question.type === 'multiple' && (
                          <div className="status-badge success">
                            <FiCheckCircle /> الإجابة: {question.correct_answer.toUpperCase()}
                          </div>
                        )}
                        
                        {question.explanation && (
                          <div style={{ 
                            flex: 1,
                            padding: '0.75rem 1rem',
                            background: 'var(--admin-primary-light)',
                            color: 'var(--admin-primary)',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            borderRight: '4px solid var(--admin-primary)'
                          }}>
                            <strong>التفسير:</strong> {question.explanation}
                          </div>
                        )}
                      </div>

                      {analytics[question.id] && (
                        <div style={{ 
                          marginTop: '1.5rem', 
                          padding: '1.25rem', 
                          background: 'var(--admin-bg-primary)', 
                          borderRadius: '12px',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '2.5rem',
                          fontSize: '0.9rem',
                          border: '1px solid var(--admin-border)'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', fontWeight: '700' }}>نسبة النجاح</span>
                            <span style={{ color: analytics[question.id].total_answers === 0 ? 'var(--admin-text-muted)' : (analytics[question.id].success_rate >= 50 ? 'var(--admin-success)' : 'var(--admin-danger)'), fontWeight: '800', fontSize: '1.1rem' }}>{analytics[question.id].total_answers === 0 ? '-' : `${analytics[question.id].success_rate}%`}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', fontWeight: '700' }}>إجمالي المحاولات</span>
                            <span style={{ color: 'var(--admin-text)', fontWeight: '800', fontSize: '1.1rem' }}>{analytics[question.id].total_answers}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', fontWeight: '700' }}>توزيع الخيارات</span>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                              {Object.entries(analytics[question.id].options_stats).map(([key, count]) => (
                                <span key={key} style={{ 
                                  background: count > 0 ? 'var(--admin-primary-light)' : 'transparent',
                                  color: count > 0 ? 'var(--admin-primary)' : 'var(--admin-text-light)',
                                  padding: '0.1rem 0.5rem',
                                  borderRadius: '4px',
                                  fontWeight: '700'
                                }}>{key.toUpperCase()}: {count}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageQuestions;
