import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { getSubjects } from '../../services/api';
import { getFileUrl } from '../../config/api';
import { FiBook, FiFileText, FiImage, FiAward, FiLogOut, FiArrowRight } from 'react-icons/fi';
import '../../styles/Home.css'; 

const Home = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const termId = queryParams.get('termId');

  useEffect(() => {
    if (!termId) {
      navigate('/terms');
    }
  }, [termId, navigate]);

  const fetchSubjects = useCallback(async () => {
    if (!termId) return;
    
    try {
      setLoading(true);
      const response = await getSubjects(termId);
      if (response.data.success) {
        setSubjects(response.data.data.subjects);
      }
    } catch (error) {
      toast.error('فشل تحميل المواد');
    } finally {
      setLoading(false);
    }
  }, [termId]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

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
      <header className="student-header">
        <div className="student-header-content">
          <div className="student-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="student-logo-icon">🎓</div>
            <div className="student-logo-text">Tawal Academy</div>
          </div>
          
          <div className="student-user-section">
            <button 
              className="btn-student btn-student-secondary" 
              onClick={() => {
                console.log('Navigating to personal bank');
                window.location.hash = '#/personal-bank';
              }}
              style={{ borderRadius: '9999px', marginRight: '1rem', border: '1px solid rgba(79, 70, 229, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <FiBook />
              <span>بنك الأخطاء</span>
            </button>

            <div className="student-points">
              <FiAward className="student-points-icon" />
              <span className="student-points-value">{user?.total_points || 0} نقطة</span>
            </div>
            
            <div className="student-avatar" title={user?.name}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            
            <button className="student-logout-btn" onClick={handleLogout} title="خروج">
              <FiLogOut />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      <main className="student-container">
        <div className="subjects-header">
            <h2>مرحباً، {user?.name}</h2>
            <p>اختر المادة وابدأ رحلة التعلم في بيئة دراسية متكاملة</p>
             {termId && (
              <button 
                className="btn-student btn-student-secondary"
                onClick={() => navigate('/terms')}
                style={{ marginTop: '1.5rem', borderRadius: '9999px' }}
              >
                <FiArrowRight />
                العودة للترمات
              </button>
            )}
        </div>

        {subjects.length === 0 ? (
          <div className="empty-state">
            <FiBook />
            <h3>لا توجد مواد متاحة حالياً</h3>
            <p>سيتم إضافة المواد قريباً لهذا الترم</p>
          </div>
        ) : (
          <div className="student-subjects-grid">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="subject-card"
                onClick={() => navigate(`/subjects/${subject.id}`)}
              >
                <div className="subject-cover">
                  {subject.cover_image ? (
                    <img src={getFileUrl(subject.cover_image)} alt={subject.name} className="subject-img" />
                  ) : (
                    <div className="subject-placeholder">
                      <FiBook size={48} color="var(--student-text-muted)" />
                    </div>
                  )}
                  <div className="student-card-overlay">
                    <h3 className="student-card-title">{subject.name}</h3>
                  </div>
                </div>
                
                <div className="subject-content">
                  <div className="subject-stats">
                    <div className="stat-item">
                      <FiFileText className="stat-icon" />
                      <span>{subject.pdfs_count || 0} ملف</span>
                    </div>
                    <div className="stat-item">
                      <FiImage className="stat-icon" />
                      <span>{subject.images_count || 0} صورة</span>
                    </div>
                    <div className="stat-item">
                      <FiBook className="stat-icon" />
                      <span>{subject.exams_count || 0} امتحان</span>
                    </div>
                  </div>

                  <div className="subject-rating-box">
                    <div className="stars-wrapper">
                       {[1, 2, 3, 4, 5].map((star) => (
                         <span key={star} className={`star ${star <= Math.round(subject.avg_rating || 0) ? 'filled' : ''}`}>
                           ★
                         </span>
                       ))}
                    </div>
                    <span className="rating-text">
                      ({subject.ratings_count || 0} تقييم)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
