import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import '../../styles/Home.css';

const StudentHome = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.SUBJECTS);
      if (response.data.success) {
        setSubjects(response.data.data.subjects);
      }
    } catch (error) {
      toast.error('فشل تحميل المواد');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('تم تسجيل الخروج بنجاح');
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <h1>🎓 Tawal Academy</h1>
          <div className="user-info">
            <span>مرحباً، {user?.name}</span>
            <span className="points">⭐ {user?.totalPoints || 0} نقطة</span>
            <button onClick={handleLogout} className="btn-logout">تسجيل الخروج</button>
          </div>
        </div>
      </header>

      <main className="home-main">
        <div className="subjects-header">
          <h2>المواد الدراسية</h2>
          <p>اختر المادة للوصول إلى المحتوى والامتحانات</p>
        </div>

        {subjects.length === 0 ? (
          <div className="empty-state">
            <p>لا توجد مواد متاحة حالياً</p>
          </div>
        ) : (
          <div className="subjects-grid">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="subject-card"
                onClick={() => navigate(`/subject/${subject.id}`)}
              >
                {subject.cover_image && (
                  <img src={subject.cover_image} alt={subject.name} />
                )}
                <div className="subject-info">
                  <h3>{subject.name}</h3>
                  {subject.description && <p>{subject.description}</p>}
                  <div className="subject-stats">
                    <span>📄 {subject.pdfs_count || 0} ملف</span>
                    <span>🖼️ {subject.images_count || 0} صورة</span>
                    <span>📝 {subject.exams_count || 0} امتحان</span>
                  </div>
                  {subject.avg_rating > 0 && (
                    <div className="subject-rating">
                      ⭐ {Number(subject.avg_rating).toFixed(1)} ({subject.ratings_count})
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentHome;
