import React, { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiCheckCircle, FiXCircle, FiHome, FiRefreshCw, FiAward, FiEye } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import '../../styles/ExamResult.css';

const ExamResult = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();
  const result = location.state?.result;
  const termId = location.state?.termId;

  useEffect(() => {
    if (result && result.points_earned > 0) {
      refreshUser();
    }
  }, [result, refreshUser]);

  if (!result) {
    return (
      <div className="student-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card-student" style={{ textAlign: 'center', padding: '3rem', maxWidth: '500px' }}>
          <h2>عذراً، لا توجد نتائج لعرضها</h2>
          <button className="btn-student btn-student-primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/')}>عودة للرئيسية</button>
        </div>
      </div>
    );
  }

  const passed = result.passed;
  const score = result.score;
  const pointsEarned = result.awarded_points || result.points_earned || 0;
  const examId = id || result.exam_id || result.attempt?.exam_id;

  const handleGoHome = () => {
    if (termId) {
      navigate(`/?termId=${termId}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="student-page result-page-wrapper">
      <header className="student-header">
        <div className="student-header-content">
          <div className="student-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="student-logo-icon">🎓</div>
            <div className="student-logo-text">Tawal Academy</div>
          </div>
          
          <div className="student-user-section">
            <div className="user-stats-mini">
              <div className="points-badge-result">
                <FiAward className="icon" />
                <span>{user?.total_points || 0} نقطة</span>
              </div>
              <div className="user-avatar-mini">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="result-main-content">
        <div className={`result-card-premium ${passed ? 'is-success' : 'is-failed'}`}>
          <div className="result-header-deco">
            <div className="status-icon-wrapper">
              {passed ? <FiCheckCircle className="status-icon" /> : <FiXCircle className="status-icon" />}
            </div>
          </div>

          <div className="result-body">
            <h1 className="result-title">
              {passed ? 'تهانينا! لقد اجتزت الاختبار' : 'حظاً موفقاً في المرة القادمة'}
            </h1>
            <p className="result-subtitle">
              {passed 
                ? 'لقد أديت عملاً رائعاً، استمر في هذا المستوى المتميز!' 
                : 'لا تقلق، يمكنك مراجعة أخطائك وإعادة المحاولة لتحسين درجتك.'}
            </p>

            <div className="score-visualization">
              <div className="score-ring">
                <svg viewBox="0 0 100 100">
                  <circle className="ring-bg" cx="50" cy="50" r="45" />
                  <circle 
                    className="ring-fill" 
                    cx="50" cy="50" r="45" 
                    style={{ strokeDashoffset: 283 - (283 * score) / 100 }}
                  />
                </svg>
                <div className="score-text">
                  <span className="number">{score}%</span>
                  <span className="label">الدرجة النهائية</span>
                </div>
              </div>
            </div>

            <div className="points-celebration">
              <div className="points-earned-card">
                <FiAward className="award-icon" />
                <div className="points-info">
                  <span className="label">النقاط المكتسبة</span>
                  <span className="value">+{pointsEarned} نقطة</span>
                </div>
              </div>
            </div>

            <div className="stats-summary-grid">
              <div className="stat-box correct">
                <span className="stat-label">صح</span>
                <span className="stat-value">{result.correct_answers || 0}</span>
              </div>
              <div className="stat-box wrong">
                <span className="stat-label">خطأ</span>
                <span className="stat-value">{(result.gradable_questions || result.total_questions || 0) - (result.correct_answers || 0)}</span>
              </div>
              <div className="stat-box total">
                <span className="stat-label">الكل</span>
                <span className="stat-value">{result.gradable_questions || result.total_questions || 0}</span>
              </div>
            </div>

            {result.has_manual_grading && (
              <div className="status-badge info" style={{ margin: '1rem auto', width: 'fit-content' }}>
                ملاحظة: النتيجة أعلاه مبدئية، الامتحان يحتوي على أسئلة مقالية سيتم تصحيحها لاحقاً.
              </div>
            )}

            <div className="result-action-buttons">
              <button 
                className="action-btn primary-btn"
                onClick={handleGoHome}
              >
                <FiHome /> العودة للرئيسية
              </button>
              
              <div className="secondary-actions">
                <button
                  className="action-btn outline-btn"
                  onClick={() => navigate(`/exam/${examId}/review`)}
                >
                  <FiEye /> مراجعة الإجابات
                </button>
                <button
                  className="action-btn outline-btn"
                  onClick={() => navigate(`/exam/${examId}`)}
                >
                  <FiRefreshCw /> إعادة الاختبار
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExamResult;
