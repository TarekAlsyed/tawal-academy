import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import AdminLayout from '../../components/admin/AdminLayout';
import '../../styles/AdminPages.css';

const ManageQuestions = () => {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
  }, [subjectId]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ADMIN_QUESTIONS(subjectId));
      if (response.data.success) {
        setQuestions(response.data.data.questions);
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
        response = await api.put(
          API_ENDPOINTS.ADMIN_UPDATE_QUESTION(subjectId, editingQuestion.id),
          formData
        );
      } else {
        response = await api.post(API_ENDPOINTS.ADMIN_QUESTIONS(subjectId), formData);
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
      question_text: question.question_text,
      type: question.type,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
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
        API_ENDPOINTS.ADMIN_DELETE_QUESTION(subjectId, questionId)
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
              onClick={() => navigate(`/admin/subjects/${subjectId}`)}
            >
              العودة للمادة
            </button>
          </div>
        </div>

        {showForm && (
          <div className="form-container">
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
                  
                  {question.type === 'multiple' && (
                    <div className="options">
                      <div className={`option ${question.correct_answer === 'a' ? 'correct' : ''}`}>
                        أ) {question.option_a}
                      </div>
                      <div className={`option ${question.correct_answer === 'b' ? 'correct' : ''}`}>
                        ب) {question.option_b}
                      </div>
                      <div className={`option ${question.correct_answer === 'c' ? 'correct' : ''}`}>
                        ج) {question.option_c}
                      </div>
                      <div className={`option ${question.correct_answer === 'd' ? 'correct' : ''}`}>
                        د) {question.option_d}
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