import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { API_ENDPOINTS, API_BASE_URL } from '../../config/api';
import AdminLayout from '../../components/admin/AdminLayout';
import '../../styles/AdminPages.css';

const ManageQuestions = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [addMode, setAddMode] = useState('manual'); // 'manual', 'excel', 'text'
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

  useEffect(() => {
    fetchQuestions();
  }, [examId]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ADMIN_EXAM_BY_ID(examId));
      if (response.data.success) {
        setQuestions(response.data.data.questions || []);
      }
    } catch (error) {
      toast.error('فشل تحميل الأسئلة');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
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
    setShowForm(false);
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
        API_ENDPOINTS.ADMIN_ADD_QUESTIONS_EXCEL(examId),
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
      correct_answer: question.correct_answer,
      explanation: question.explanation || ''
    });
    setEditingQuestion(question);
    setShowForm(true);
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

  if (loading) return <div className="loading">جاري التحميل...</div>;

  return (
    <AdminLayout>
      <div className="admin-content">
        <div className="page-header">
          <h1>إدارة الأسئلة</h1>
          <div className="header-actions">
            <button
              className="btn-primary"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'إخفاء النموذج' : 'إضافة سؤال جديد'}
            </button>
            <button
              className="btn-secondary"
              onClick={() => navigate(-1)}
            >
              العودة
            </button>
          </div>
        </div>

        {showForm && (
          <div className="form-container">
            {!editingQuestion && (
              <div className="mode-selector">
                <button
                  className={`mode-btn ${addMode === 'manual' ? 'active' : ''}`}
                  onClick={() => setAddMode('manual')}
                >
                  إضافة يدوية
                </button>
                <button
                  className={`mode-btn ${addMode === 'excel' ? 'active' : ''}`}
                  onClick={() => setAddMode('excel')}
                >
                  رفع ملف Excel
                </button>
                <button
                  className={`mode-btn ${addMode === 'text' ? 'active' : ''}`}
                  onClick={() => setAddMode('text')}
                >
                  إضافة من نص
                </button>
              </div>
            )}

            {addMode === 'manual' ? (
              <form onSubmit={handleSubmit} className="admin-form">
                <div className="form-group">
                  <label htmlFor="question_text">نص السؤال</label>
                  <textarea
                    id="question_text"
                    name="question_text"
                    value={formData.question_text}
                    onChange={handleChange}
                    required
                    rows="3"
                    placeholder="أدخل نص السؤال"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="type">نوع السؤال</label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      required
                    >
                      <option value="multiple">اختيار من متعدد</option>
                      <option value="true_false">صح أو خطأ</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="correct_answer">الإجابة الصحيحة</label>
                    <select
                      id="correct_answer"
                      name="correct_answer"
                      value={formData.correct_answer}
                      onChange={handleChange}
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
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="option_a">الخيار أ</label>
                      <input
                        type="text"
                        id="option_a"
                        name="option_a"
                        value={formData.option_a}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="option_b">الخيار ب</label>
                      <input
                        type="text"
                        id="option_b"
                        name="option_b"
                        value={formData.option_b}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                )}

                {formData.type === 'multiple' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="option_c">الخيار ج</label>
                      <input
                        type="text"
                        id="option_c"
                        name="option_c"
                        value={formData.option_c}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="option_d">الخيار د</label>
                      <input
                        type="text"
                        id="option_d"
                        name="option_d"
                        value={formData.option_d}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="explanation">الشرح (اختياري)</label>
                  <textarea
                    id="explanation"
                    name="explanation"
                    value={formData.explanation}
                    onChange={handleChange}
                    rows="3"
                    placeholder="أدخل شرح الإجابة الصحيحة (اختياري)"
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                  >
                    {editingQuestion ? 'تحديث السؤال' : 'إضافة السؤال'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={resetForm}
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            ) : addMode === 'excel' ? (
              <form onSubmit={handleExcelUpload} className="admin-form">
                <div className="form-group">
                  <label htmlFor="excel_file">اختر ملف Excel (.xlsx, .xls)</label>
                  <input
                    type="file"
                    id="excel_file"
                    accept=".xlsx, .xls"
                    onChange={(e) => setExcelFile(e.target.files[0])}
                    required
                  />
                  <p className="form-help">يجب أن يحتوي الملف على الأعمدة: نص السؤال، نوع السؤال، الخيار أ، الخيار ب، الخيار ج، الخيار د، الإجابة الصحيحة</p>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={loading || !excelFile}>
                    رفع ومعالجة الملف
                  </button>
                  <button type="button" className="btn-secondary" onClick={resetForm}>
                    إلغاء
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleTextSubmit} className="admin-form">
                <div className="form-group">
                  <label htmlFor="text_input">أدخل الأسئلة بصيغة نصية</label>
                  <textarea
                    id="text_input"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    required
                    rows="10"
                    placeholder="1. ما هو عاصمة مصر؟&#10;أ. القاهرة&#10;ب. الإسكندرية&#10;ج. الجيزة&#10;د. المنصورة&#10;الإجابة: أ"
                  />
                  <p className="form-help">استخدم الترقيم للأسئلة والحروف (أ، ب، ج، د) للخيارات، واكتب "الإجابة: " متبوعة بالحرف الصحيح.</p>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={loading || !textInput.trim()}>
                    تحليل وإضافة الأسئلة
                  </button>
                  <button type="button" className="btn-secondary" onClick={resetForm}>
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="questions-list">
          <h2>قائمة الأسئلة ({questions.length})</h2>
          {questions.length === 0 ? (
            <div className="empty-state">لا توجد أسئلة مضافة</div>
          ) : (
            <div className="questions-grid">
              {questions.map((question, index) => (
                <div key={question.id} className="question-card">
                  <div className="question-header">
                    <span className="question-number">سؤال {index + 1}</span>
                    <span className={`question-type ${question.type}`}>
                      {question.type === 'multiple' ? 'اختيار من متعدد' : 'صح أو خطأ'}
                    </span>
                  </div>
                  
                  <p className="question-text">{question.question_text}</p>
                  
                  {question.type === 'multiple' && question.options && (
                    <div className="options">
                      <div className={`option ${question.correct_answer === 'a' ? 'correct' : ''}`}>
                        أ) {question.options.a}
                      </div>
                      <div className={`option ${question.correct_answer === 'b' ? 'correct' : ''}`}>
                        ب) {question.options.b}
                      </div>
                      <div className={`option ${question.correct_answer === 'c' ? 'correct' : ''}`}>
                        ج) {question.options.c}
                      </div>
                      <div className={`option ${question.correct_answer === 'd' ? 'correct' : ''}`}>
                        د) {question.options.d}
                      </div>
                    </div>
                  )}

                  {question.type === 'true_false' && (
                    <div className="true-false">
                      <div className={`option ${question.correct_answer === 'a' ? 'correct' : ''}`}>
                        صح
                      </div>
                      <div className={`option ${question.correct_answer === 'b' ? 'correct' : ''}`}>
                        خطأ
                      </div>
                    </div>
                  )}

                  <div className="question-actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(question)}
                    >
                      تعديل
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(question.id)}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageQuestions;