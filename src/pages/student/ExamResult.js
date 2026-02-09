import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiXCircle, FiHome } from 'react-icons/fi';
import '../../styles/ExamResult.css';

const ExamResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;

  if (!result) {
    navigate('/student/home');
    return null;
  }

  const passed = result.passed;
  const score = result.score;
  const pointsEarned = result.points_earned || 0;

  return (
    <div className="result-container">
      <div className={`result-card ${passed ? 'success' : 'failed'}`}>
        <div className="result-icon">
          {passed ? <FiCheckCircle /> : <FiXCircle />}
        </div>

        <h1>{passed ? 'مبروك! نجحت 🎉' : 'للأسف لم تنجح 😔'}</h1>
        
        <div className="score-display">
          <div className="score-circle">
            <span className="score-number">{score}%</span>
          </div>
        </div>

        <div className="result-details">
          <div className="detail-item">
            <span>الدرجة:</span>
            <strong>{score}%</strong>
          </div>
          <div className="detail-item">
            <span>النقاط المكتسبة:</span>
            <strong>⭐ {pointsEarned}</strong>
          </div>
          <div className="detail-item">
            <span>الإجابات الصحيحة:</span>
            <strong>{result.correct_answers} من {result.total_questions}</strong>
          </div>
        </div>

        {!passed && (
          <p className="retry-message">
            حاول مرة أخرى! يمكنك إعادة الامتحان لتحسين درجتك
          </p>
        )}

        <div className="result-actions">
          <button className="btn-primary" onClick={() => navigate('/student/home')}>
            <FiHome /> العودة للرئيسية
          </button>
          {!passed && (
            <button
              className="btn-secondary"
              onClick={() => navigate(`/student/exam/${result.exam_id}`)}
            >
              إعادة المحاولة
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamResult;