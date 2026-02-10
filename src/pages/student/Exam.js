import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import '../../styles/Exam.css';

const Exam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { student } = useAuth();
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExam();
    loadProgress();
    // منع النسخ واللصق
    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCopy);
    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCopy);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [id]);

  const preventCopy = (e) => {
    e.preventDefault();
    toast.error('النسخ غير مسموح في الامتحان');
  };

  const preventContextMenu = (e) => {
    e.preventDefault();
  };

  const fetchExam = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.STUDENT_EXAM_DETAIL(id));
      if (response.data.success) {
        setExam(response.data.data.exam);
      }
    } catch (error) {
      toast.error('فشل تحميل الامتحان');
      navigate('/student/home');
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const response = await api.get(`/exams/${id}/progress`);
      if (response.data.success && response.data.data.answers) {
        setAnswers(response.data.data.answers);
      }
    } catch (error) {
      console.error('فشل تحميل التقدم المحفوظ');
    }
  };

  const handleAnswerChange = async (questionId, answer) => {
    const newAnswers = {
      ...answers,
      [questionId]: answer
    };
    setAnswers(newAnswers);

    // حفظ التقدم تلقائياً
    try {
      await api.post(`/exams/${id}/progress`, { answers: newAnswers });
    } catch (error) {
      console.error('فشل حفظ التقدم');
    }
  };

  const handleSubmit = async () => {
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = exam.questions.length;

    if (answeredCount < totalQuestions) {
      if (!window.confirm(`لقد أجبت على ${answeredCount} من ${totalQuestions} سؤال. هل تريد التسليم؟`)) {
        return;
      }
    }

    setSubmitting(true);

    try {
      const response = await api.post(API_ENDPOINTS.STUDENT_SUBMIT_EXAM(id), { answers });
      
      if (response.data.success) {
        navigate(`/student/exam/${id}/result`, {
          state: { result: response.data.data }
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء تسليم الامتحان');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">جاري تحميل الامتحان...</div>;
  if (!exam) return <div className="loading">الامتحان غير موجود</div>;

  return (
    <div className="exam-container">
      <div className="exam-header">
        <h1>{exam.name}</h1>
        <p>عدد الأسئلة: {exam.questions.length}</p>
        <div className="exam-warning">
          ⚠️ لا يمكن النسخ أو اللصق أثناء الامتحان
        </div>
      </div>

      <div className="questions-container">
        {exam.questions.map((question, index) => (
          <div key={question.id} className="question-card">
            <h3>السؤال {index + 1}</h3>
            <p className="question-text">{question.question_text}</p>

            <div className="options">
              {question.type === 'multiple' ? (
                // اختيار من متعدد
                Object.entries(question.options).map(([key, value]) => (
                  <label key={key} className="option">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={key}
                      checked={answers[question.id] === key}
                      onChange={() => handleAnswerChange(question.id, key)}
                    />
                    <span>{key}) {value}</span>
                  </label>
                ))
              ) : (
                // صح أو خطأ
                <>
                  <label className="option">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value="a"
                      checked={answers[question.id] === 'a'}
                      onChange={() => handleAnswerChange(question.id, 'a')}
                    />
                    <span>صح</span>
                  </label>
                  <label className="option">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value="b"
                      checked={answers[question.id] === 'b'}
                      onChange={() => handleAnswerChange(question.id, 'b')}
                    />
                    <span>خطأ</span>
                  </label>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="exam-footer">
        <div className="progress">
          تم الإجابة على {Object.keys(answers).length} من {exam.questions.length} سؤال
        </div>
        <button
          className="btn-submit"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'جاري التسليم...' : 'تسليم الامتحان'}
        </button>
      </div>
    </div>
  );
};

export default Exam;