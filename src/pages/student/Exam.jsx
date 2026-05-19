import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { FiClock, FiAlertTriangle, FiCheckCircle, FiCheck, FiArrowRight, FiX, FiChevronRight, FiChevronLeft } from 'react-icons/fi';
import '../../styles/Exam.css';

const Exam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { admin } = useAuth();
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingTime, setRemainingTime] = useState(null); // بالثواني
  const [violationCount, setViolationCount] = useState(0);

  const [error, setError] = useState(null);

  const fetchExam = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.EXAM_BY_ID(id));
      if (response.data.success) {
        setExam(response.data.data.exam);
        setCurrentIndex(0);
        // Save for offline use
        localStorage.setItem(`exam_cache_${id}`, JSON.stringify(response.data.data.exam));
      }
    } catch (error) {
      if (error.response?.status === 403) {
        setExam(error.response.data.data.exam);
        setError(error.response.data.message);
      } else {
        // Fallback to offline cache
        const cachedExam = localStorage.getItem(`exam_cache_${id}`);
        if (cachedExam) {
          console.log(`[Offline] Using local backup for exam metadata ${id}`);
          setExam(JSON.parse(cachedExam));
          setCurrentIndex(0);
        } else {
          const errorMsg = error.response?.data?.message || 'فشل تحميل الامتحان من الشبكة ولا يوجد نسخة محفوظة';
          toast.error(errorMsg);
          navigate('/');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const loadProgress = useCallback(async () => {
    if (!id || id === 'undefined') return;
    try {
      const response = await api.get(API_ENDPOINTS.EXAM_PROGRESS(id));
      if (response.data.success && response.data.data) {
        const { answers, remaining_seconds } = response.data.data;
        setAnswers(answers || {});
        if (remaining_seconds !== undefined) {
          setRemainingTime(remaining_seconds);
        }
      }
    } catch (error) {
      if (!navigator.onLine) {
        const localProgress = localStorage.getItem(`offline_exam_progress_${id}`);
        if (localProgress) {
          setAnswers(JSON.parse(localProgress));
          console.log('تم استرجاع التقدم المحفوظ محلياً');
        }
      } else {
        console.error('فشل تحميل التقدم المحفوظ', error.response?.data || error.message);
      }
    }
  }, [id]);

  const handleSubmit = useCallback(async (isViolation = false) => {
    // التأكد من أن isViolation هو قيمة منطقية true وليس كائن الحدث
    const actualViolation = isViolation === true;
    
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = exam?.questions?.length || 0;

    if (!actualViolation && answeredCount < totalQuestions) {
      if (!window.confirm(`لقد أجبت على ${answeredCount} من ${totalQuestions} سؤال. هل تريد التسليم؟`)) {
        return;
      }
    }

    setSubmitting(true);

    try {
      const response = await api.post(API_ENDPOINTS.SUBMIT_EXAM(id), { 
        answers,
        status: actualViolation ? 'violation' : 'completed'
      });
      
      if (response.data.success) {
        if (actualViolation) {
          toast.error('تم إنهاء الامتحان تلقائياً بسبب مخالفة قوانين المراقبة الذكية.');
        }
        // Remove local progress
        localStorage.removeItem(`offline_exam_progress_${id}`);
        navigate(`/exam-result/${id}`, {
          state: { 
            result: response.data.data,
            termId: exam.term_id
          }
        });
      }
    } catch (error) {
      if (!navigator.onLine) {
        // Save to offline submissions
        const offlineSubs = JSON.parse(localStorage.getItem('offline_submissions') || '[]');
        offlineSubs.push({
          id, answers, status: actualViolation ? 'violation' : 'completed', timestamp: Date.now(),
          termId: exam.term_id, name: exam.name
        });
        localStorage.setItem('offline_submissions', JSON.stringify(offlineSubs));
        localStorage.removeItem(`offline_exam_progress_${id}`);
        toast.success('أنت في وضع الأوفلاين. تم حفظ إجاباتك محلياً بنجاح وسيتم مزامنتها لاحقاً.');
        navigate('/', { replace: true });
      } else {
        toast.error(error.response?.data?.message || 'حدث خطأ أثناء تسليم الامتحان');
      }
    } finally {
      setSubmitting(false);
    }
  }, [answers, exam, id, navigate]);

  useEffect(() => {
    fetchExam();
    loadProgress();
    // منع النسخ واللصق
    const preventCopy = (e) => {
      e.preventDefault();
      toast.error('النسخ غير مسموح في الامتحان');
    };

    const preventContextMenu = (e) => {
      e.preventDefault();
    };

    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCopy);
    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCopy);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [fetchExam, loadProgress]);

  // إدارة عداد الوقت
  useEffect(() => {
    // إذا كان الوقت المتبقي هو -1 أو null، فهذا يعني وقت غير محدود
    if (remainingTime === null || remainingTime < 0) return;

    if (remainingTime === 0) {
      if (!submitting) {
        toast.warning('انتهى وقت الامتحان! جاري التسليم التلقائي...');
        handleSubmit();
      }
      return;
    }

    const timer = setInterval(() => {
      setRemainingTime(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingTime, submitting, handleSubmit]);

  const formatTime = (seconds) => {
    if (seconds === null || seconds < 0) return 'غير محدود';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = async (questionId, answer) => {
    if (answers[questionId]) return;

    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    
    // Always save locally first
    localStorage.setItem(`offline_exam_progress_${id}`, JSON.stringify(newAnswers));

    try {
      if (navigator.onLine) {
        await api.post(API_ENDPOINTS.EXAM_PROGRESS(id), { answers: newAnswers });
      }
    } catch (error) {
      console.error('فشل حفظ التقدم في السيرفر:', error.response?.data || error.message);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < exam.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // نظام المراقبة الذكي (AI Proctoring)
  useEffect(() => {
    // تعطيل المراقبة إذا كان المستخدم أدمن أو إذا كانت الميزة معطلة في إعدادات الامتحان
    if (!exam || submitting || admin || exam.proctoring_enabled === false) return;

    const handleViolation = async (reason) => {
      // إذا كان المستخدم أدمن لا نسجل مخالفات
      if (admin) return;

      const newCount = violationCount + 1;
      setViolationCount(newCount);

      // تسجيل المخالفة في الخلفية
      try {
        await api.post(API_ENDPOINTS.REPORT_VIOLATION, {
          user_id: 'current',
          exam_id: id,
          violation_type: 'Proctoring',
          description: reason,
          severity: newCount >= 3 ? 'critical' : 'high',
          action_taken: newCount >= 5 ? 'auto_submit' : 'warning'
        });
      } catch (err) {
        console.error('فشل تسجيل المخالفة:', err);
      }

      // إذا تجاوز عدد المخالفات الحد المسموح (مثلاً 5 مرات) يتم إنهاء الامتحان
      if (newCount >= 5) {
        toast.error('تم إنهاء الامتحان تلقائياً بسبب تكرار مخالفة قوانين المراقبة الذكية.', {
          position: "top-center",
          autoClose: 5000
        });
        handleSubmit(true); // إرسال مع وسم مخالفة
      } else {
        toast.warning(`تنبيه (مخالفة رقم ${newCount}/5): ${reason}. سيتم إنهاء الامتحان تلقائياً عند تكرار ذلك.`, {
          position: "top-center",
          autoClose: 4000,
          theme: "colored"
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleViolation('محاولة غش: مغادرة صفحة الامتحان (تبديل التبويب)');
      }
    };

    const handleBlur = () => {
      handleViolation('محاولة غش: فقدان التركيز عن نافذة الامتحان (مغادرة المتصفح)');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [exam, submitting, id, handleSubmit, violationCount, admin]);

  if (loading) return (
    <div className="student-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loading">جاري تحميل الامتحان...</div>
    </div>
  );

  if (exam?.is_locked) {
    return (
      <div className="student-page">
        <header className="exam-header">
          <div className="exam-header-content">
            <div className="exam-info">
              <h1>{exam.name}</h1>
              <p>مغلق حالياً</p>
            </div>
            <button className="btn-student btn-student-secondary" onClick={() => navigate(-1)}>
              <FiArrowRight /> عودة
            </button>
          </div>
        </header>
        <div className="exam-main" style={{ display: 'flex', justifyContent: 'center', paddingTop: '2rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
          <div className="card-student" style={{ textAlign: 'center', padding: '2rem 1.5rem', width: '100%', maxWidth: '500px' }}>
            <FiAlertTriangle size={64} color="var(--student-warning)" style={{ marginBottom: '1.5rem' }} />
            <h2>الامتحان مغلق</h2>
            <p style={{ margin: '1rem 0', color: 'var(--student-text-secondary)' }}>{error}</p>
            {exam.start_time && (
              <div className="status-badge status-wrong" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', marginTop: '1rem' }}>
                موعد البدء: {new Date(exam.start_time).toLocaleString('ar-EG')}
              </div>
            )}
            <button className="btn-student btn-student-primary" onClick={() => navigate(-1)} style={{ marginTop: '2rem', width: '100%' }}>
              العودة للمادة
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!exam || !exam.questions || exam.questions.length === 0) return (
    <div className="student-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card-student" style={{ textAlign: 'center', padding: '3rem', maxWidth: '500px' }}>
        <FiAlertTriangle size={48} color="var(--student-warning)" style={{ marginBottom: '1.5rem' }} />
        <h2>الامتحان لا يحتوي على أسئلة حالياً</h2>
        <p style={{ margin: '1rem 0', color: 'var(--student-text-secondary)' }}>يرجى التواصل مع الإدارة لإضافة أسئلة لهذا الامتحان.</p>
        <button className="btn-student btn-student-primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate(-1)}>عودة للمادة</button>
      </div>
    </div>
  );

  const answeredCount = Object.keys(answers).length;
  const progressPercentage = (answeredCount / exam.questions.length) * 100;
  const currentQuestion = exam.questions[currentIndex];

  if (!currentQuestion) return null;

  return (
    <div className="student-page exam-container">
      <header className="exam-header">
        <div className="exam-header-content">
          <div className="exam-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="back-btn" onClick={() => navigate(-1)} title="العودة">
                <FiArrowRight />
              </button>
              <div>
                <h1>{exam.name}</h1>
                <p>المادة: {exam.subject_name || 'غير محدد'}</p>
              </div>
            </div>
          </div>
          
          <div className="exam-stats-header">
            <div className="stat-item">
              <FiCheckCircle className="icon" />
              <div className="stat-info">
                <span className="label">تمت الإجابة</span>
                <span className="value">{answeredCount} / {exam.questions.length}</span>
              </div>
            </div>
            
            <div className={`stat-item timer ${remainingTime < 300 ? 'timer-warning' : ''}`}>
              <FiClock className="icon" />
              <div className="stat-info">
                <span className="label">الوقت المتبقي</span>
                <span className="value">{formatTime(remainingTime)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="exam-progress-wrapper">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </header>

      <main className="exam-layout-main">
        <div className="exam-content-area">
          <div className="exam-warning-banner">
            <FiAlertTriangle className="warning-icon" />
            <p>بيئة امتحان آمنة: يرجى عدم محاولة النسخ أو مغادرة الصفحة.</p>
          </div>

          <div key={currentIndex} className="question-container-animate">
            <div className="question-card">
              <div className="question-header">
                <div className="question-meta">
                  <span className="question-badge">السؤال {currentIndex + 1}</span>
                  {answers[currentQuestion.id] && (
                    <span className={`answer-status-badge ${
                      (() => {
                        const normalize = (ans) => {
                          if (!ans) return null;
                          const a = String(ans).trim().toLowerCase();
                          if (['a', 'صح', 'true', 'yes', '1', 'أ', 'أ.'].includes(a)) return 'a';
                          if (['b', 'خطأ', 'false', 'no', '2', 'ب', 'ب.'].includes(a)) return 'b';
                          if (['c', '3', 'ج', 'ج.'].includes(a)) return 'c';
                          if (['d', '4', 'د', 'د.'].includes(a)) return 'd';
                          return a;
                        };
                        return normalize(answers[currentQuestion.id]) === normalize(currentQuestion.correct_answer) ? 'correct' : 'wrong';
                      })()
                    }`}>
                      {(() => {
                        const normalize = (ans) => {
                          if (!ans) return null;
                          const a = String(ans).trim().toLowerCase();
                          if (['a', 'صح', 'true', 'yes', '1', 'أ', 'أ.'].includes(a)) return 'a';
                          if (['b', 'خطأ', 'false', 'no', '2', 'ب', 'ب.'].includes(a)) return 'b';
                          if (['c', '3', 'ج', 'ج.'].includes(a)) return 'c';
                          if (['d', '4', 'د', 'د.'].includes(a)) return 'd';
                          return a;
                        };
                        return normalize(answers[currentQuestion.id]) === normalize(currentQuestion.correct_answer) ? (
                          <><FiCheckCircle /> إجابة صحيحة</>
                        ) : (
                          <><FiX /> إجابة خاطئة</>
                        );
                      })()}
                    </span>
                  )}
                </div>
                <div className="points-badge">{currentQuestion.points || 10} نقاط</div>
              </div>
              
              <h2 className="question-text">{currentQuestion.question_text}</h2>

              <div className="question-answer-area">
                {(currentQuestion.type === 'multiple' || currentQuestion.type === 'true_false') && (
                  <div className="options-grid">
                    {(currentQuestion.type === 'multiple' ? ['a', 'b', 'c', 'd'] : ['a', 'b']).map((optionKey) => {
                      const optionText = currentQuestion.type === 'true_false' 
                        ? (optionKey === 'a' ? 'صح' : 'خطأ') 
                        : (currentQuestion.options ? currentQuestion.options[optionKey] : '');
                      
                      if (!optionText && currentQuestion.type === 'multiple') return null;
                      
                      // دالة مساعدة لتوحيد تنسيق الإجابات للمقارنة
                      const normalizeAnswer = (ans) => {
                        if (!ans) return null;
                        const a = String(ans).trim().toLowerCase();
                        if (['a', 'صح', 'true', 'yes', '1', 'أ', 'أ.'].includes(a)) return 'a';
                        if (['b', 'خطأ', 'false', 'no', '2', 'ب', 'ب.'].includes(a)) return 'b';
                        if (['c', '3', 'ج', 'ج.'].includes(a)) return 'c';
                        if (['d', '4', 'د', 'د.'].includes(a)) return 'd';
                        return a;
                      };
                      
                      const studentAnswer = answers[currentQuestion.id] ? normalizeAnswer(answers[currentQuestion.id]) : null;
                      const correctAnswer = currentQuestion.correct_answer ? normalizeAnswer(currentQuestion.correct_answer) : null;
                      const currentOption = normalizeAnswer(optionKey);
                      
                      const isSelected = studentAnswer === currentOption;
                      const isCorrect = correctAnswer === currentOption;
                      const hasAnswered = !!studentAnswer;
                      
                      let optionClass = 'exam-option-card';
                      if (hasAnswered) {
                        if (isCorrect) {
                          optionClass += ' is-correct'; // الإجابة الصحيحة دائماً خضراء بعد الحل
                        } else if (isSelected) {
                          optionClass += ' is-wrong';   // إجابة الطالب خاطئة تظهر بالأحمر
                        } else {
                          optionClass += ' is-disabled'; // الباقي باهت
                        }
                      } else if (isSelected) {
                        optionClass += ' is-selected';
                      }
                      
                      return (
                        <div 
                          key={optionKey}
                          onClick={() => handleAnswerChange(currentQuestion.id, optionKey)}
                          className={optionClass}
                        >
                          <div className="option-letter">{currentQuestion.type === 'multiple' ? optionKey.toUpperCase() : (optionKey === 'a' ? '✓' : '✗')}</div>
                          <div className="option-content">{optionText}</div>
                          <div className="option-check">
                            {hasAnswered ? (
                              isCorrect ? (
                                <FiCheckCircle style={{ color: '#10b981', fontSize: '1.5rem' }} />
                              ) : isSelected ? (
                                <FiX style={{ color: '#ef4444', fontSize: '1.5rem' }} />
                              ) : null
                            ) : isSelected ? (
                              <div className="dot"></div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.type === 'essay' && (
                  <div className="essay-answer-container">
                    <textarea
                      className="admin-textarea"
                      style={{ width: '100%', minHeight: '200px', fontSize: '1.1rem', padding: '1rem' }}
                      placeholder="اكتب إجابتك هنا بالتفصيل..."
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      disabled={!!answers[currentQuestion.id]}
                    />
                    {answers[currentQuestion.id] && (
                      <div className="status-badge info" style={{ marginTop: '1rem' }}>
                        سيتم تصحيح هذا السؤال يدوياً من قبل المعلم.
                      </div>
                    )}
                  </div>
                )}

                {currentQuestion.type === 'fill_blanks' && (
                  <div className="fill-blanks-container">
                    <input
                      type="text"
                      className="admin-input"
                      style={{ maxWidth: '400px', fontSize: '1.2rem', textAlign: 'center' }}
                      placeholder="أدخل الإجابة الصحيحة..."
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      disabled={!!answers[currentQuestion.id]}
                    />
                  </div>
                )}

                {currentQuestion.type === 'matching' && (
                  <div className="matching-container" style={{ padding: '1rem', background: 'var(--admin-bg-primary)', borderRadius: '12px' }}>
                    <p style={{ marginBottom: '1rem', color: 'var(--admin-text-muted)' }}>قم بمطابقة العناصر في القائمتين (سيتم تنفيذ واجهة السحب والإفلات لاحقاً، حالياً أدخل الإجابة بتنسيق JSON).</p>
                    <textarea
                      className="admin-textarea"
                      placeholder='مثال: {"1": "أ", "2": "ب"}'
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      disabled={!!answers[currentQuestion.id]}
                    />
                  </div>
                )}
              </div>

              {answers[currentQuestion.id] && currentQuestion.explanation && (
                <div className="explanation-section">
                  <div className="explanation-header">
                    <FiAlertTriangle />
                    <span>تفسير الإجابة الصحيحة</span>
                  </div>
                  <p>{currentQuestion.explanation}</p>
                </div>
              )}
            </div>

            <div className="exam-navigation-actions">
              <button 
                className="nav-btn prev"
                onClick={prevQuestion}
                disabled={currentIndex === 0}
              >
                <FiChevronRight /> <span>السابق</span>
              </button>
              
              {currentIndex < exam.questions.length - 1 ? (
                <button 
                  className="nav-btn next"
                  onClick={nextQuestion}
                >
                  <span>التالي</span> <FiChevronLeft />
                </button>
              ) : (
                <button 
                  className="nav-btn submit-btn"
                  onClick={() => handleSubmit()}
                  disabled={submitting || answeredCount < exam.questions.length}
                >
                  {submitting ? (
                    <><div className="spinner"></div> <span>جاري...</span></>
                  ) : (
                    <><FiCheckCircle /> <span>تسليم</span></>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="exam-sidebar">
          <div className="sidebar-card">
            <h3>خريطة الأسئلة</h3>
            <div className="questions-nav-grid">
              {exam.questions.map((q, idx) => (
                <button
                  key={q.id}
                  className={`nav-dot ${currentIndex === idx ? 'current' : ''} ${answers[q.id] ? 'answered' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            
            <div className="nav-legend">
              <div className="legend-item">
                <span className="dot current"></span>
                <span>الحالي</span>
              </div>
              <div className="legend-item">
                <span className="dot answered"></span>
                <span>تمت الإجابة</span>
              </div>
              <div className="legend-item">
                <span className="dot"></span>
                <span>لم يتم الحل</span>
              </div>
            </div>
          </div>

          <div className="sidebar-card help-card">
            <FiAlertTriangle className="icon" />
            <h4>تحتاج مساعدة؟</h4>
            <p>تأكد من استقرار اتصال الإنترنت قبل تسليم الامتحان.</p>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default Exam;
