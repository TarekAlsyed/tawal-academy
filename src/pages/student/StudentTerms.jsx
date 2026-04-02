import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getStudentTerms } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FiCalendar, FiLogOut, FiBookOpen, FiArrowLeft } from 'react-icons/fi';
import '../../styles/StudentTerms.css';

const StudentTerms = () => {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      const response = await getStudentTerms();
      if (response.data.success) {
        setTerms(response.data.data.terms);
      }
    } catch (error) {
      toast.error('فشل تحميل الترمات');
    } finally {
      setLoading(false);
    }
  };

  const handleTermSelect = (termId) => {
    navigate(`/?termId=${termId}`);
  };

  const handleLogout = () => {
    logout();
    toast.success('تم تسجيل الخروج بنجاح');
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
      <header className="terms-header">
        <div className="terms-header-content">
          <div className="brand-section">
            <h1>
              <FiBookOpen size={32} />
              Tawal Academy
            </h1>
          </div>
          
          <div className="user-profile">
            <div className="user-meta">
              <span className="welcome-text">أهلاً بك</span>
              <span className="name-text">{user?.name}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="تسجيل الخروج">
              <FiLogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="terms-main">
        <div className="intro-card">
          <h2>اختر الترم الدراسي</h2>
          <p>يرجى اختيار الترم الذي ترغب في متابعة مواده الدراسية واختباراته للبدء في رحلة التعلم</p>
        </div>

        {terms.length === 0 ? (
          <div className="empty-terms-state">
            <FiCalendar size={60} color="var(--student-text-muted)" />
            <h3>لا توجد ترمات متاحة حالياً</h3>
            <p>سيقوم فريق العمل بإضافة الترمات الدراسية قريباً، ابقَ على اطلاع!</p>
          </div>
        ) : (
          <div className="terms-grid">
            {terms.map((term) => (
              <div
                key={term.id}
                className="term-glass-card"
                onClick={() => handleTermSelect(term.id)}
              >
                <div className="term-icon-wrapper">
                  <FiBookOpen />
                </div>
                
                <h3 className="term-name">{term.name}</h3>
                <span className="term-badge">متاح الآن</span>
                
                <div className="action-trigger">
                  <span>تصفح المواد</span>
                  <FiArrowLeft />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentTerms;
