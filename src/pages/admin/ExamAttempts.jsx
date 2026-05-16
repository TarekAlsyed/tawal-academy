import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiEye, FiCheckCircle, FiAlertCircle, FiCpu, FiBook, FiSearch, FiX, FiClock, FiList } from 'react-icons/fi';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import AdminLayout from '../../components/admin/AdminLayout';

const ExamAttempts = () => {
  const [attempts, setAttempts] = useState([]);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch attempts - the main data for this page
      const attemptsRes = await api.get(API_ENDPOINTS.ADMIN_EXAM_ATTEMPTS);
      if (attemptsRes.data.success) {
        setAttempts(attemptsRes.data.data || []);
      }

      // Try fetching auxiliary data but don't fail if they do
      try {
        const [examsRes, studentsRes] = await Promise.all([
          api.get(API_ENDPOINTS.ADMIN_EXAMS),
          api.get(API_ENDPOINTS.ADMIN_STUDENTS)
        ]);
        
        if (examsRes.data.success) {
          const examsData = examsRes.data.data;
          setExams(Array.isArray(examsData) ? examsData : (examsData?.exams || []));
        }
        if (studentsRes.data.success) setStudents(studentsRes.data.data || []);
      } catch (auxError) {
        console.warn('Could not fetch auxiliary exams/students data:', auxError);
      }

    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('فشل تحميل نتائج الطلاب');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (id) => {
    try {
      const response = await api.get(API_ENDPOINTS.ADMIN_EXAM_ATTEMPT_BY_ID(id));
      if (response.data.success) {
        setSelectedAttempt(response.data.data);
        setShowModal(true);
      }
    } catch (error) {
      toast.error('فشل تحميل تفاصيل المحاولة');
    }
  };

  const filteredAttempts = attempts.filter(a => 
    (a.student_name && a.student_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (a.exam_name && a.exam_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AdminLayout>
      <style>{`
        @media print {
          @page {
            margin: 0 !important;
          }
          /* General Print Fixes */
          html, body, #root, .admin-layout, .admin-main, .app-container {
            height: auto !important; min-height: auto !important; overflow: visible !important;
            margin: 0 !important; padding: 0 !important; background: white !important; width: 100% !important;
            position: static !important;
          }
          .admin-sidebar, .admin-header, .admin-content > :not(.admin-modal-overlay), .admin-modal-footer, .admin-close-btn, .security-watermark-overlay, .dark-mode-toggle, .admin-table-container {
            display: none !important;
          }
          
          /* Modal Overrides */
          .admin-modal-overlay {
            position: static !important; display: block !important; background: transparent !important;
            padding: 1.5cm !important; margin: 0 !important; backdrop-filter: none !important;
            box-sizing: border-box !important;
          }
          .admin-modal {
            display: block !important; position: static !important; width: 100% !important; max-width: 100% !important;
            max-height: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important;
            border: none !important; animation: none !important; overflow: visible !important; background: white !important;
          }
          .admin-modal-body {
            max-height: none !important; overflow: visible !important; padding: 0 !important; margin: 0 !important;
          }
          
          /* Typography & Colors for Print */
          body, p, span, div, h1, h2, h3, h4, h5, h6, label {
            color: #000000 !important;
            text-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Force Question Cards Borders */
          .print-question-card {
            border: 2px solid #000000 !important;
            border-radius: 8px !important;
            margin-bottom: 2rem !important;
            padding: 1.5rem !important;
            page-break-inside: avoid;
            break-inside: avoid;
            background: #ffffff !important;
          }
          .print-answer-box {
            border: 2px solid #000000 !important;
            padding: 1.25rem !important;
            border-radius: 6px !important;
            background: transparent !important;
          }
          .print-answer-box.success {
            border-color: #059669 !important;
            border-width: 3px !important;
          }
          .print-answer-box.danger {
            border-color: #dc2626 !important;
            border-width: 3px !important;
          }
          .print-success-text {
            color: #059669 !important;
            font-weight: 900 !important;
          }
          .print-danger-text {
            color: #dc2626 !important;
            font-weight: 900 !important;
          }
          /* Option Choices styling */
          .print-option-box {
            border: 1px solid #94a3b8 !important;
            background: transparent !important;
          }
          .print-option-box.success {
            border: 2px solid #059669 !important;
            background: #f0fdf4 !important;
            color: #000 !important;
          }
          .print-option-box.danger {
            border: 2px solid #dc2626 !important;
            background: #fef2f2 !important;
            color: #000 !important;
          }
          .print-option-box.success-outline {
            border: 2px dashed #059669 !important;
            background: transparent !important;
          }
          .print-option-letter {
            border: 1px solid #000 !important;
            background: transparent !important;
            color: #000 !important;
          }
          
          /* Print Watermark */
          .print-only-watermark {
            display: block !important;
            position: fixed !important;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: -1;
            pointer-events: none;
            opacity: 0.1 !important;
            overflow: hidden !important;
          }
        }
        @media screen {
          .print-only-watermark {
            display: none !important;
          }
        }
      `}</style>
      
      <div className="print-only-watermark" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="wm" x="0" y="0" width="350" height="250" patternUnits="userSpaceOnUse">
              <text x="40" y="120" fontSize="38" fontWeight="bold" fontFamily="sans-serif" fill="#000000" transform="rotate(-35 40 120)">
                Tawal Academy
              </text>
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#wm)" />
        </svg>
      </div>
      
      <header className="admin-header">
        <div className="admin-header-title">
          <h1>نتائج ومحاولات الطلاب</h1>
          <p>عرض وتحليل نتائج الامتحانات والمحاولات</p>
        </div>
        <div className="admin-header-actions">
          <div className="admin-input-group" style={{ position: 'relative', width: '300px' }}>
            <FiSearch style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
            <input 
              type="text" 
              className="admin-input"
              placeholder="ابحث باسم الطالب أو الامتحان..." 
              style={{ paddingRight: '40px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-card">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div className="loading" style={{ color: 'var(--admin-primary)' }}>جاري التحميل...</div>
            </div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>الامتحان</th>
                    <th>الدرجة</th>
                    <th>الحالة</th>
                    <th>التصحيح الذكي</th>
                    <th>التاريخ</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttempts.length > 0 ? filteredAttempts.map((attempt) => (
                    <tr key={attempt.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--admin-primary-light)', color: 'var(--admin-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                            {attempt.student_name?.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600 }}>{attempt.student_name}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--admin-text-muted)' }}>
                          <FiBook /> {attempt.exam_name}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${attempt.passed ? 'success' : 'danger'}`}>
                          {attempt.score}%
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${
                          attempt.status === 'completed' ? 'success' : 
                          attempt.status === 'violation' ? 'danger' : 'warning'
                        }`}>
                          {attempt.status === 'completed' ? 'مكتمل' : 
                           attempt.status === 'violation' ? 'مخالفة' : 'قيد التصحيح'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {attempt.ai_status === 'completed' ? (
                            <span style={{ color: 'var(--admin-success)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}><FiCheckCircle /> جاهز</span>
                          ) : attempt.ai_status === 'processing' ? (
                            <span style={{ color: 'var(--admin-gold)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}><FiCpu className="spin" /> جارٍ...</span>
                          ) : (
                            <span style={{ color: 'var(--admin-text-light)' }}>-</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>
                          <FiClock /> {new Date(attempt.attempt_date).toLocaleDateString('ar-EG')}
                        </div>
                      </td>
                      <td>
                        <button 
                          className="admin-btn" 
                          onClick={() => handleViewDetails(attempt.id)}
                          style={{ 
                            padding: '0.5rem', 
                            background: 'var(--admin-primary-light)', 
                            color: 'var(--admin-primary)',
                            borderRadius: '8px',
                            minWidth: '40px',
                            justifyContent: 'center'
                          }}
                          title="عرض التفاصيل"
                        >
                          <FiEye />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--admin-text-muted)' }}>
                        لا توجد نتائج مطابقة للبحث
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && selectedAttempt && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">تفاصيل محاولة الطالب: {selectedAttempt.student_name}</h2>
              <button className="admin-close-btn" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <div className="admin-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1rem', background: 'var(--admin-bg-primary)', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '0.5rem' }}>الدرجة النهائية</label>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: selectedAttempt.passed ? 'var(--admin-success)' : 'var(--admin-danger)' }}>
                    {selectedAttempt.score}% {selectedAttempt.passed ? '(ناجح)' : '(راسب)'}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: 'var(--admin-bg-primary)', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '0.5rem' }}>حالة المحاولة</label>
                  <div style={{ fontWeight: 600 }}>
                    {selectedAttempt.status === 'violation' ? (
                      <span style={{ color: 'var(--admin-danger)', display: 'flex', alignItems: 'center', gap: '4px' }}><FiAlertCircle /> مخالفة مراقبة</span>
                    ) : (
                      <span style={{ color: 'var(--admin-success)', display: 'flex', alignItems: 'center', gap: '4px' }}><FiCheckCircle /> محاولة طبيعية</span>
                    )}
                  </div>
                </div>
                {selectedAttempt.ai_suggested_score && (
                  <div style={{ padding: '1rem', background: 'var(--admin-primary-light)', borderRadius: '12px', border: '1px solid var(--admin-primary)', color: 'var(--admin-primary)' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem' }}><FiCpu /> درجة الذكاء الاصطناعي (للمقالي)</label>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selectedAttempt.ai_suggested_score} نقطة</div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--admin-text)' }}>
                  <FiCpu /> تحليل الذكاء الاصطناعي للإجابات المقالية
                </h4>
                {selectedAttempt.ai_grading_data && Object.keys(selectedAttempt.ai_grading_data).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {Object.entries(selectedAttempt.ai_grading_data).map(([qId, data]) => (
                      <div key={qId} style={{ padding: '1.25rem', border: '1px solid var(--admin-border)', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <span style={{ fontWeight: 700 }}>سؤال رقم {qId}</span>
                          <span style={{ background: 'var(--admin-primary-light)', color: 'var(--admin-primary)', padding: '0.2rem 0.75rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 700 }}>
                            {data.score}/100
                          </span>
                        </div>
                        <p style={{ margin: '0 0 1rem 0', color: 'var(--admin-text-muted)', lineHeight: 1.6 }}>{data.feedback}</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {data.strengths?.map((s, i) => (
                            <span key={i} style={{ background: 'var(--admin-success-light)', color: 'var(--admin-success)', padding: '0.1rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{s}</span>
                          ))}
                          {data.weaknesses?.map((w, i) => (
                            <span key={i} style={{ background: 'var(--admin-danger-light)', color: 'var(--admin-danger)', padding: '0.1rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{w}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--admin-bg-primary)', borderRadius: '12px', color: 'var(--admin-text-muted)' }}>
                    لا توجد بيانات تصحيح ذكي لهذه المحاولة.
                  </div>
                )}
              </div>

              <div>
                <h4 style={{ marginBottom: '1.5rem', color: 'var(--admin-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiList /> مراجعة الإجابات التفصيلية
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {selectedAttempt.questions && selectedAttempt.questions.length > 0 ? (
                    selectedAttempt.questions.map((question, index) => {
                      const studentAnswer = selectedAttempt.answers[question.id];
                      const isCorrect = String(studentAnswer).trim().toLowerCase() === String(question.correct_answer).trim().toLowerCase();
                      
                      let options = question.options;
                      try {
                        if (typeof options === 'string') options = JSON.parse(options);
                      } catch (e) {
                        options = {};
                      }
                      
                      const renderAnswerText = (answer) => {
                        if (!answer && answer !== false) return 'لم يقم بالإجابة';
                        if (String(answer) === 'true') return 'صحيح';
                        if (String(answer) === 'false') return 'خطأ';
                        return answer;
                      };

                      const hasOptions = (question.type === 'multiple' || question.type === 'true_false');
                      let parsedOptions = {};
                      if (hasOptions) {
                        try {
                          if (question.type === 'multiple') {
                            parsedOptions = typeof question.options === 'string' ? JSON.parse(question.options || '{}') : (question.options || {});
                          } else if (question.type === 'true_false') {
                            if (question.options && Object.keys(question.options).length > 0) {
                              parsedOptions = typeof question.options === 'string' ? JSON.parse(question.options) : question.options;
                            } else {
                              parsedOptions = { 'true': 'صحيح', 'false': 'خطأ' };
                            }
                          }
                        } catch(e) {
                          console.error("Error parsing options", e);
                        }
                      }

                      return (
                        <div key={question.id} className="print-question-card" style={{ padding: '1.5rem', border: '1px solid var(--admin-border)', borderRadius: '12px', background: 'white' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--admin-text-muted)' }}>سؤال {index + 1} ({question.type})</span>
                            {question.type !== 'essay' && (
                              <span className={`status-badge ${isCorrect ? 'success' : 'danger'}`}>
                                {isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}
                              </span>
                            )}
                          </div>
                          
                          <p style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '1.25rem' }}>{question.question_text}</p>
                          
                          {hasOptions && Object.keys(parsedOptions).length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                              {Object.entries(parsedOptions).map(([key, value]) => {
                                if (!value) return null;
                                let normalizedStudentAnswer = String(studentAnswer).trim().toLowerCase();
                                let normalizedCorrectAnswer = String(question.correct_answer).trim().toLowerCase();
                                
                                if (question.type === 'true_false') {
                                  if (normalizedStudentAnswer === 'a') normalizedStudentAnswer = 'true';
                                  if (normalizedStudentAnswer === 'b') normalizedStudentAnswer = 'false';
                                  if (normalizedCorrectAnswer === 'a') normalizedCorrectAnswer = 'true';
                                  if (normalizedCorrectAnswer === 'b') normalizedCorrectAnswer = 'false';
                                }

                                const isStudentChoice = normalizedStudentAnswer === String(key).trim().toLowerCase();
                                const isCorrectChoice = normalizedCorrectAnswer === String(key).trim().toLowerCase();
                                
                                let boxClass = 'print-option-box';
                                let borderStyle = '1px solid var(--admin-border)';
                                let bgStyle = 'white';
                                let icon = null;
                                
                                if (isStudentChoice && isCorrectChoice) {
                                  boxClass += ' success';
                                  borderStyle = '2px solid var(--admin-success)';
                                  bgStyle = 'var(--admin-success-light)';
                                  icon = '✅ إجابتك (صحيحة)';
                                } else if (isStudentChoice && !isCorrectChoice) {
                                  boxClass += ' danger';
                                  borderStyle = '2px solid var(--admin-danger)';
                                  bgStyle = 'var(--admin-danger-light)';
                                  icon = '❌ إجابتك (خاطئة)';
                                } else if (!isStudentChoice && isCorrectChoice) {
                                  boxClass += ' success-outline';
                                  borderStyle = '2px dashed var(--admin-success)';
                                  bgStyle = 'white';
                                  icon = '✅ الإجابة الصحيحة';
                                }
                                
                                return (
                                  <div key={key} className={boxClass} style={{ display: 'flex', alignItems: 'center', padding: '1rem', border: borderStyle, borderRadius: '8px', background: bgStyle }}>
                                    <div className="print-option-letter" style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--admin-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginLeft: '1rem', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}>
                                      {key.toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, fontWeight: 600, color: 'var(--admin-text)' }}>{value}</div>
                                    {icon && <div className={isCorrectChoice ? "print-success-text" : "print-danger-text"} style={{ fontWeight: 'bold', marginRight: '1rem', color: isCorrectChoice ? 'var(--admin-success)' : 'var(--admin-danger)' }}>{icon}</div>}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                              <div className={`print-answer-box ${isCorrect ? 'success' : 'danger'}`} style={{ padding: '1rem', borderRadius: '8px', background: isCorrect ? 'var(--admin-success-light)' : 'var(--admin-danger-light)', border: `1px solid ${isCorrect ? 'var(--admin-success)' : 'var(--admin-danger)'}` }}>
                                <label className={isCorrect ? 'print-success-text' : 'print-danger-text'} style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', color: isCorrect ? 'var(--admin-success)' : 'var(--admin-danger)' }}>إجابة الطالب</label>
                                <div style={{ fontWeight: 600 }}>
                                  {renderAnswerText(studentAnswer)}
                                </div>
                              </div>
                              
                              <div className="print-answer-box success" style={{ padding: '1rem', borderRadius: '8px', background: 'var(--admin-bg-primary)', border: '1px solid var(--admin-border)' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--admin-text-muted)' }}>الإجابة الصحيحة</label>
                                <div className="print-success-text" style={{ fontWeight: 600, color: 'var(--admin-success)' }}>
                                  {renderAnswerText(question.correct_answer)}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {question.explanation && (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--admin-primary-light)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--admin-primary)' }}>
                              <strong>تفسير:</strong> {question.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--admin-bg-primary)', borderRadius: '12px', color: 'var(--admin-text-muted)' }}>
                      لا توجد أسئلة مرتبطة بهذا الامتحان حالياً.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowModal(false)}>إغلاق</button>
              <button className="admin-btn admin-btn-primary" onClick={() => window.print()}>طباعة التقرير</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ExamAttempts;
