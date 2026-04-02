import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiMessageSquare, FiSend, FiClock, FiCheckCircle, FiArrowRight, FiInfo, FiUser } from 'react-icons/fi';
import { getMyQuestions, submitQuestion } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import '../../styles/StudentQuestions.css';

const StudentQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [remainingQuestions, setRemainingQuestions] = useState(3);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await getMyQuestions();
      if (response.data.success) {
        setQuestions(response.data.data.questions);
        setRemainingQuestions(response.data.data.remainingQuestions);
      }
    } catch (error) {
      toast.error('فشل تحميل الأسئلة');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    if (remainingQuestions <= 0) {
      return toast.error('لقد وصلت للحد الأقصى من الأسئلة هذا الشهر');
    }

    try {
      setSubmitting(true);
      const response = await submitQuestion(newQuestion);
      if (response.data.success) {
        toast.success('تم إرسال سؤالك بنجاح');
        setNewQuestion('');
        fetchQuestions();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل إرسال السؤال');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="student-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="student-page">
      <div className="questions-container">
        <header className="questions-header">
          <div className="header-left">
            <button onClick={() => navigate(-1)} className="btn-back-circle" title="رجوع">
              <FiArrowRight size={20} />
            </button>
            <h1>أسئلة الطلبة</h1>
          </div>
          <div className="user-badge">
            <div className="user-avatar-mini">
              <FiUser />
            </div>
            <span>{user?.name}</span>
          </div>
        </header>

        <main className="questions-layout">
          {/* Ask New Question Section */}
          <section className="ask-section">
            <h2>اسأل المعلم</h2>
            <p>يمكنك طرح أسئلتك حول المواد الدراسية وسيقوم المعلم بالرد عليك في أقرب وقت ممكن.</p>
            
            <div className="remaining-counter">
              <FiInfo className="counter-icon" />
              <div className="counter-text">
                متاح لك <span className="counter-number">{remainingQuestions}</span> أسئلة إضافية هذا الشهر
              </div>
            </div>

            <form onSubmit={handleSubmit} className="question-form">
              <textarea
                className="textarea-student"
                placeholder="اكتب سؤالك هنا بوضوح..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                required
              />
              <button 
                type="submit" 
                className="btn-send" 
                disabled={submitting || remainingQuestions <= 0}
              >
                <FiSend /> 
                {submitting ? 'جاري الإرسال...' : 'إرسال السؤال'}
              </button>
            </form>
          </section>

          {/* Previous Questions List */}
          <section className="list-section">
            <h2>
              <FiMessageSquare />
              أسئلتي السابقة
            </h2>
            
            {questions.length === 0 ? (
              <div className="no-questions">
                <FiMessageSquare />
                <h3>لا توجد أسئلة بعد</h3>
                <p>لم تقم بطرح أي أسئلة حتى الآن. ابدأ بطرح سؤالك الأول!</p>
              </div>
            ) : (
              <div className="questions-list">
                {questions.map((q) => (
                  <div key={q.id} className="question-card-item">
                    <div className="card-header">
                      <div className="timestamp">
                        <FiClock />
                        {new Date(q.created_at).toLocaleDateString('ar-SA')}
                      </div>
                      <div className={`status-badge ${q.is_replied ? 'status-answered' : 'status-pending'}`}>
                        {q.is_replied ? <><FiCheckCircle /> تم الرد</> : <><FiClock /> قيد الانتظار</>}
                      </div>
                    </div>
                    
                    <div className="question-body">
                      <p className="question-text-content">{q.question_text}</p>
                    </div>
                    
                    {q.is_replied && (
                      <div className="reply-section">
                        <div className="reply-header">
                          <FiCheckCircle /> رد المعلم:
                        </div>
                        <p className="reply-text">{q.admin_reply}</p>
                        <div className="timestamp" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                          تم الرد في: {new Date(q.replied_at).toLocaleDateString('ar-SA')}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default StudentQuestions;
