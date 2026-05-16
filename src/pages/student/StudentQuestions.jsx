import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiMessageSquare, FiSend, FiClock, FiCheckCircle, FiArrowRight, FiInfo, FiUser } from 'react-icons/fi';
import { getMyQuestions, submitQuestion } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../utils/useTheme';
import '../../styles/StudentQuestions.css';

const StudentQuestions = () => {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [remainingQuestions, setRemainingQuestions] = useState(3);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isLight, colors: c } = useTheme();

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: c.pageBg, transition: 'background 0.35s ease' }}>
        <div className="loading" style={{ color: c.textPrimary }}>جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div style={{ background: c.pageBg, minHeight: '100vh', color: c.textPrimary, fontFamily: 'Tajawal, sans-serif', transition: 'background 0.35s ease, color 0.35s ease' }}>
      <div className="questions-container">
        <header className="questions-header" style={{ background: c.headerBg, border: c.headerBorder }}>
          <div className="header-left">
            <button onClick={() => navigate(-1)} className="btn-back-circle" title="رجوع" style={{ borderColor: c.border, color: c.textSecondary }}>
              <FiArrowRight size={20} />
            </button>
            <h1 style={{ color: c.textPrimary }}>أسئلة الطلبة</h1>
          </div>
          <div className="user-badge" style={{ background: c.subtleBg, borderColor: c.border }}>
            <div className="user-avatar-mini">
              <FiUser />
            </div>
            <span>{user?.name}</span>
          </div>
        </header>

        <main className="questions-layout">
          {/* Ask New Question Section */}
          <section className="ask-section" style={{ background: c.cardBg, borderColor: c.cardBorder }}>
            <h2 style={{ color: c.textPrimary }}>اسأل المعلم</h2>
            <p style={{ color: c.textSecondary }}>يمكنك طرح أسئلتك حول المواد الدراسية وسيقوم المعلم بالرد عليك في أقرب وقت ممكن.</p>
            
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
            <h2 style={{ color: c.textPrimary }}>
              <FiMessageSquare />
              أسئلتي السابقة
            </h2>
            
            {questions.length === 0 ? (
              <div className="no-questions" style={{ background: c.cardBg, borderColor: c.cardBorder, color: c.textMuted }}>
                <FiMessageSquare />
                <h3 style={{ color: c.textPrimary }}>لا توجد أسئلة بعد</h3>
                <p>لم تقم بطرح أي أسئلة حتى الآن. ابدأ بطرح سؤالك الأول!</p>
              </div>
            ) : (
              <div className="questions-list">
                {questions.map((q) => (
                  <div key={q.id} className="question-card-item" style={{ background: c.cardBg, borderColor: c.cardBorder }}>
                    <div className="card-header">
                      <div className="timestamp" style={{ color: c.textMuted }}>
                        <FiClock />
                        {new Date(q.created_at).toLocaleDateString('ar-SA')}
                      </div>
                      <div className={`status-badge ${q.is_replied ? 'status-answered' : 'status-pending'}`}>
                        {q.is_replied ? <><FiCheckCircle /> تم الرد</> : <><FiClock /> قيد الانتظار</>}
                      </div>
                    </div>
                    
                    <div className="question-body">
                      <p className="question-text-content" style={{ color: c.textPrimary }}>{q.question_text}</p>
                    </div>
                    
                    {q.is_replied && (
                      <div className="reply-section" style={{ background: c.subtleBg, borderRightColor: '#3b82f6' }}>
                        <div className="reply-header" style={{ color: '#3b82f6' }}>
                          <FiCheckCircle /> رد المعلم:
                        </div>
                        <p className="reply-text" style={{ color: c.textSecondary }}>{q.admin_reply}</p>
                        <div className="timestamp" style={{ marginTop: '1rem', justifyContent: 'flex-end', color: c.textMuted }}>
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
