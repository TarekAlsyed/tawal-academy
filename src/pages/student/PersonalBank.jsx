import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiArrowRight, FiCheck, FiX, FiAlertCircle, FiBookOpen, 
  FiHelpCircle, FiAward, FiFilter
} from 'react-icons/fi';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import '../../styles/COMPLETE-STUDENT-DESIGN.css';

const PersonalBank = () => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchBank = async () => {
      try {
        const response = await api.get(API_ENDPOINTS.PERSONAL_BANK);
        if (response.data.success) {
          setQuestions(response.data.data.questions);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'فشل تحميل بنك الأسئلة الشخصي');
      } finally {
        setLoading(false);
      }
    };
    fetchBank();
  }, []);

  const subjects = [...new Set(questions.map(q => q.subject_name))];
  const filteredQuestions = filter === 'all' 
    ? questions 
    : questions.filter(q => q.subject_name === filter);

  if (loading) return (
    <div className="student-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loading">جاري تحميل بنك الأسئلة...</div>
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

  return (
    <div className="student-page">
      <header className="student-header">
        <div className="student-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn-student btn-student-secondary" onClick={() => navigate(-1)} style={{ padding: '0.5rem' }}>
              <FiArrowRight size={20} />
            </button>
            <div className="student-logo">
              <div className="student-logo-icon"><FiBookOpen /></div>
              <h1 className="student-logo-text">بنك الأسئلة الشخصي</h1>
            </div>
          </div>
          <div className="student-points">
            <FiAward className="student-points-icon" />
            <span>{questions.length} سؤال للمراجعة</span>
          </div>
        </div>
      </header>

      <main className="student-container">
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>مكتبة أخطائك الذكية</h2>
              <p style={{ color: 'var(--student-text-secondary)', fontSize: '1.1rem' }}>هنا تجد جميع الأسئلة التي تعثرت فيها سابقاً. مراجعتها هي طريقك للتميز!</p>
            </div>
            {subjects.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FiFilter color="var(--student-text-muted)" />
                <select 
                  className="input-student" 
                  style={{ width: '200px' }}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">جميع المواد</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          {questions.length === 0 ? (
            <div className="card-student" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                background: 'var(--student-bg-app)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                color: 'var(--student-success)'
              }}>
                <FiCheck size={40} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>بنك الأسئلة فارغ!</h2>
              <p style={{ color: 'var(--student-text-secondary)', maxWidth: '400px', margin: '0.5rem auto 1.5rem' }}>
                أنت تبلي بلاءً حسناً جداً. لم تخطئ في أي سؤال حتى الآن أو أنك قمت بتصحيح جميع أخطائك.
              </p>
              <button className="btn-student btn-student-primary" onClick={() => navigate('/')}>ابدأ اختباراً جديداً</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              {filteredQuestions.map((question, index) => (
                <div key={question.id} className="card-student" style={{ borderRight: '5px solid var(--student-danger)' }}>
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <span style={{ 
                          background: 'var(--student-bg-app)', 
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '99px', 
                          fontSize: '0.85rem', 
                          fontWeight: 700,
                          color: 'var(--student-primary)'
                        }}>
                          سؤال {index + 1}
                        </span>
                        <span style={{ 
                          background: '#fee2e2', 
                          color: '#dc2626',
                          padding: '0.25rem 0.75rem', 
                          borderRadius: '99px', 
                          fontSize: '0.85rem', 
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <FiX /> محاولة خاطئة
                        </span>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <span style={{ color: 'var(--student-text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>{question.subject_name}</span>
                        <div style={{ color: 'var(--student-text-secondary)', fontSize: '0.9rem', fontWeight: 700 }}>{question.exam_title}</div>
                      </div>
                    </div>
                    
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem', lineHeight: 1.6 }}>{question.question_text}</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                      {Object.entries(question.options || {}).map(([key, value]) => {
                        const isCorrectAnswer = String(question.correct_answer).toLowerCase() === key.toLowerCase();
                        return (
                          <div 
                            key={key} 
                            style={{ 
                              padding: '1rem', 
                              borderRadius: 'var(--student-radius-md)', 
                              border: '2px solid',
                              borderColor: isCorrectAnswer ? 'var(--student-success)' : 'var(--student-border)',
                              background: isCorrectAnswer ? 'rgba(16, 185, 129, 0.05)' : 'white',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1rem',
                              transition: 'var(--student-transition)'
                            }}
                          >
                            <span style={{ 
                              width: '32px', 
                              height: '32px', 
                              borderRadius: '8px', 
                              background: isCorrectAnswer ? 'var(--student-success)' : 'var(--student-bg-app)',
                              color: isCorrectAnswer ? 'white' : 'var(--student-text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.9rem'
                            }}>
                              {key.toUpperCase()}
                            </span>
                            <span style={{ fontWeight: 600, color: isCorrectAnswer ? 'var(--student-success)' : 'var(--student-text-primary)' }}>{value}</span>
                            {isCorrectAnswer && <FiCheck style={{ marginRight: 'auto', color: 'var(--student-success)', fontSize: '1.2rem' }} />}
                          </div>
                        );
                      })}
                    </div>

                    {question.explanation && (
                      <div style={{ 
                        marginTop: '2rem', 
                        padding: '1.25rem', 
                        background: 'var(--student-bg-subtle)', 
                        borderRadius: 'var(--student-radius-lg)',
                        borderRight: '4px solid var(--student-primary)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--student-primary)' }}>
                          <FiHelpCircle size={20} />
                          <strong style={{ fontWeight: 800 }}>التفسير التعليمي:</strong>
                        </div>
                        <p style={{ color: 'var(--student-text-secondary)', lineHeight: 1.6, margin: 0 }}>{question.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PersonalBank;

