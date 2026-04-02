import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiCheck, FiX, FiAlertCircle, FiCheckCircle, FiAward } from 'react-icons/fi';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import '../../styles/Exam.css';

const ExamReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const response = await api.get(`${API_ENDPOINTS.EXAMS}/${id}/review`);
        if (response.data.success) {
          setExam(response.data.data.exam);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'فشل تحميل مراجعة الامتحان');
      } finally {
        setLoading(false);
      }
    };
    fetchReview();
  }, [id]);

  if (loading) return (
    <div className="student-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loading">جاري تحميل المراجعة...</div>
    </div>
  );

  if (error) return (
    <div className="student-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card-student" style={{ textAlign: 'center', padding: '3rem', maxWidth: '500px' }}>
        <FiAlertCircle size={48} color="var(--student-danger)" style={{ marginBottom: '1.5rem' }} />
        <h2>عذراً، حدث خطأ</h2>
        <p style={{ margin: '1rem 0', color: 'var(--student-text-secondary)' }}>{error}</p>
        <button className="btn-student btn-student-primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/')}>عودة للرئيسية</button>
      </div>
    </div>
  );

  const { questions, last_attempt } = exam;
  const userAnswers = last_attempt?.answers || {};

  return (
    <div className="student-page exam-container review-page">
      <header className="exam-header">
        <div className="exam-header-content">
          <div className="exam-info">
            <button className="back-btn" onClick={() => navigate(-1)} title="العودة">
              <FiArrowRight />
            </button>
            <div>
              <h1>مراجعة: {exam.name || exam.title}</h1>
              <p>النتيجة النهائية: <span className={`score-badge ${last_attempt?.score >= 50 ? 'passed' : 'failed'}`}>{last_attempt?.score}%</span></p>
            </div>
          </div>
          
          <div className="exam-stats-header">
            <div className="stat-item">
              <FiCheckCircle className="icon" />
              <div className="stat-info">
                <span className="label">الإجابات الصحيحة</span>
                <span className="value">{last_attempt?.correct_answers || 0} / {questions.length}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="exam-progress-wrapper">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(last_attempt?.score || 0)}%`, background: last_attempt?.score >= 50 ? '#10b981' : '#ef4444' }}
            ></div>
          </div>
        </div>
      </header>

      <main className="exam-layout-main">
        <div className="exam-content-area">
          <div className="review-welcome-banner">
            <FiAlertCircle className="icon" />
            <p>يمكنك مراجعة جميع الأسئلة وتفسير الإجابات الصحيحة لتعزيز فهمك.</p>
          </div>

          <div className="questions-review-list">
            {questions.map((question, index) => {
              const userAnswer = userAnswers[question.id];
              const isCorrect = String(userAnswer).toLowerCase() === String(question.correct_answer).toLowerCase();
              
              return (
                <div key={question.id} className={`question-card review-card ${isCorrect ? 'is-correct-border' : 'is-wrong-border'}`}>
                  <div className="question-header">
                    <div className="question-meta">
                      <span className="question-badge">السؤال {index + 1}</span>
                      {userAnswer ? (
                        <span className={`answer-status-badge ${isCorrect ? 'correct' : 'wrong'}`}>
                          {isCorrect ? (
                            <><FiCheckCircle /> إجابة صحيحة</>
                          ) : (
                            <><FiX /> إجابة خاطئة</>
                          )}
                        </span>
                      ) : (
                        <span className="answer-status-badge warning">
                          <FiAlertCircle /> لم يتم الحل
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <h2 className="question-text">{question.question_text}</h2>

                  <div className="question-answer-area">
                    {(question.type === 'multiple' || question.type === 'true_false') && (
                      <div className="options-grid">
                        {(question.type === 'multiple' ? ['a', 'b', 'c', 'd'] : ['a', 'b']).map((optionKey) => {
                          const optionText = question.type === 'true_false' 
                            ? (optionKey === 'a' ? 'صح' : 'خطأ') 
                            : (question.options ? question.options[optionKey] : null);
                          
                          if (!optionText && question.type === 'multiple') return null;
                          
                          const isUserChoice = String(userAnswer).toLowerCase() === optionKey.toLowerCase();
                          const isCorrectAnswer = String(question.correct_answer).toLowerCase() === optionKey.toLowerCase();
                          
                          let optionClass = 'exam-option-card is-disabled';
                          if (isCorrectAnswer) optionClass += ' is-correct';
                          if (isUserChoice && !isCorrect) optionClass += ' is-wrong';
                          if (isUserChoice && isCorrect) optionClass += ' is-selected';

                          return (
                            <div key={optionKey} className={optionClass}>
                              <div className="option-letter">{question.type === 'multiple' ? optionKey.toUpperCase() : (optionKey === 'a' ? '✓' : '✗')}</div>
                              <div className="option-content">{optionText}</div>
                              <div className="option-check">
                                {isCorrectAnswer ? <FiCheck /> : isUserChoice && !isCorrect ? <FiX /> : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {question.type === 'essay' && (
                      <div className="essay-answer-container">
                        <div className="review-answer-box">
                          <label>إجابة الطالب:</label>
                          <div className="answer-text">{userAnswer || 'لم يتم تقديم إجابة'}</div>
                        </div>
                        <div className="review-answer-box correct-reference" style={{ marginTop: '1rem' }}>
                          <label>الإجابة النموذجية (مرجع):</label>
                          <div className="answer-text">{question.correct_answer}</div>
                        </div>
                      </div>
                    )}

                    {(question.type === 'fill_blanks' || question.type === 'matching') && (
                      <div className="other-answer-container">
                        <div className="review-answer-box">
                          <label>إجابة الطالب:</label>
                          <div className={`answer-text ${isCorrect ? 'text-success' : 'text-danger'}`}>{userAnswer || 'لم يتم تقديم إجابة'}</div>
                        </div>
                        {!isCorrect && (
                          <div className="review-answer-box correct-reference" style={{ marginTop: '1rem' }}>
                            <label>الإجابة الصحيحة:</label>
                            <div className="answer-text">{question.correct_answer}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {question.explanation && (
                    <div className="explanation-section">
                      <div className="explanation-header">
                        <FiAlertCircle />
                        <span>تفسير الإجابة الصحيحة</span>
                      </div>
                      <p>{question.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="exam-sidebar">
          <div className="sidebar-card">
            <h3>ملخص المراجعة</h3>
            <div className="review-summary-stats">
              <div className="summary-item">
                <span className="label">الحالة</span>
                <span className={`value ${last_attempt?.score >= 50 ? 'passed' : 'failed'}`}>
                  {last_attempt?.score >= 50 ? 'ناجح' : 'راسب'}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">الوقت المستغرق</span>
                <span className="value">{last_attempt?.time_spent || 'غير محدد'}</span>
              </div>
            </div>
          </div>

          <div className="sidebar-card help-card">
            <FiAward className="icon" />
            <h4>استمر في التقدم!</h4>
            <p>مراجعة الأخطاء هي الخطوة الأولى نحو التميز الدراسي.</p>
            <button className="btn-student btn-student-primary" onClick={() => navigate(-1)} style={{ marginTop: '1rem', width: '100%', background: 'white', color: 'var(--student-primary)' }}>
              العودة للنتائج
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default ExamReview;
