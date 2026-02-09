import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { FiDownload, FiStar, FiArrowRight } from 'react-icons/fi';
import '../../styles/StudentSubject.css';

const SubjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { student } = useAuth();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pdfs');
  const [rating, setRating] = useState(0);

  useEffect(() => {
    fetchSubject();
  }, [id]);

  const fetchSubject = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.STUDENT_SUBJECT_DETAIL(id));
      if (response.data.success) {
        setSubject(response.data.data.subject);
        setRating(response.data.data.subject.user_rating || 0);
      }
    } catch (error) {
      toast.error('فشل تحميل المادة');
      navigate('/student/home');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (pdfId) => {
    try {
      await api.post(API_ENDPOINTS.STUDENT_DOWNLOAD_PDF(id, pdfId));
      toast.success('تم إضافة 5 نقاط! 🎉');
      // Refresh subject data to update points
      fetchSubject();
    } catch (error) {
      toast.error('حدث خطأ أثناء تحميل الملف');
    }
  };

  const handleViewImage = async (imageId) => {
    try {
      await api.post(`/api/student/subjects/${id}/images/${imageId}/view`);
      toast.success('تم إضافة 2 نقطة! ⭐');
      fetchSubject();
    } catch (error) {
      toast.error('حدث خطأ أثناء عرض الصورة');
    }
  };

  const handleRating = async (stars) => {
    try {
      await api.post(`/api/student/subjects/${id}/rate`, { rating: stars });
      setRating(stars);
      toast.success('شكراً لتقييمك! تم إضافة 3 نقاط 🌟');
      fetchSubject();
    } catch (error) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء التقييم');
    }
  };

  const canAccessExam = (exam) => {
    if (exam.level === 1) return true;
    
    const previousLevel = subject.exams.find(e => e.level === exam.level - 1);
    if (!previousLevel) return false;
    
    return exam.can_access;
  };

  if (loading) return <div className="loading">جاري التحميل...</div>;
  if (!subject) return <div className="loading">المادة غير موجودة</div>;

  return (
    <div className="student-subject-container">
      <header className="subject-header">
        <div className="header-content">
          <button className="btn-back" onClick={() => navigate('/student/home')}>
            <FiArrowRight /> العودة
          </button>
          <div className="header-info">
            <h1>{subject.name}</h1>
            <p>{subject.description}</p>
          </div>
          <div className="user-points">
            <span>⭐ {student?.totalPoints || 0} نقطة</span>
          </div>
        </div>
      </header>

      <div className="subject-tabs">
        <button
          className={activeTab === 'pdfs' ? 'active' : ''}
          onClick={() => setActiveTab('pdfs')}
        >
          📄 الملفات ({subject.pdfs?.length || 0})
        </button>
        <button
          className={activeTab === 'images' ? 'active' : ''}
          onClick={() => setActiveTab('images')}
        >
          🖼️ الصور ({subject.images?.length || 0})
        </button>
        <button
          className={activeTab === 'exams' ? 'active' : ''}
          onClick={() => setActiveTab('exams')}
        >
          📝 الامتحانات ({subject.exams?.length || 0})
        </button>
      </div>

      <div className="subject-content">
        {activeTab === 'pdfs' && (
          <div className="pdfs-section">
            {subject.pdfs && subject.pdfs.length > 0 ? (
              <div className="pdfs-grid">
                {subject.pdfs.map((pdf) => (
                  <div key={pdf.id} className="pdf-card">
                    <div className="pdf-icon">📄</div>
                    <h3>{pdf.title}</h3>
                    <p>تم التحميل {pdf.downloads_count} مرة</p>
                    <button
                      className="btn-download"
                      onClick={() => handleDownloadPDF(pdf.id)}
                    >
                      <FiDownload /> تحميل (5 نقاط)
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">لا توجد ملفات متاحة</div>
            )}
          </div>
        )}

        {activeTab === 'images' && (
          <div className="images-section">
            {subject.images && subject.images.length > 0 ? (
              <div className="images-grid">
                {subject.images.map((image) => (
                  <div
                    key={image.id}
                    className="image-card"
                    onClick={() => handleViewImage(image.id)}
                  >
                    <img src={image.file_url} alt={image.title} />
                    <div className="image-info">
                      <p>{image.title}</p>
                      <small>تم المشاهدة {image.views_count} مرة</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">لا توجد صور متاحة</div>
            )}
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="exams-section">
            {subject.exams && subject.exams.length > 0 ? (
              <div className="exams-list">
                {subject.exams.map((exam) => (
                  <div key={exam.id} className={`exam-card ${!canAccessExam(exam) ? 'locked' : ''}`}>
                    <div className="exam-info">
                      <h3>{exam.name}</h3>
                      <p>المستوى {exam.level}</p>
                      <span className="questions-count">{exam.questions_count} سؤال</span>
                      {exam.best_score && (
                        <span className="best-score">أفضل نتيجة: {exam.best_score}%</span>
                      )}
                    </div>
                    {canAccessExam(exam) ? (
                      <button
                        className="btn-start-exam"
                        onClick={() => navigate(`/student/exam/${exam.id}`)}
                      >
                        بدء الامتحان
                      </button>
                    ) : (
                      <div className="exam-locked">
                        🔒 مغلق
                        <small>اجتاز المستوى {exam.level - 1} أولاً</small>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">لا توجد امتحانات متاحة</div>
            )}
          </div>
        )}
      </div>

      <div className="rating-section">
        <h3>قيّم هذه المادة</h3>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <FiStar
              key={star}
              className={star <= (rating || subject.user_rating || 0) ? 'filled' : ''}
              onClick={() => handleRating(star)}
            />
          ))}
        </div>
        {subject.avg_rating > 0 && (
          <p>التقييم العام: {Number(subject.avg_rating).toFixed(1)} ⭐ ({subject.ratings_count} تقييم)</p>
        )}
      </div>
    </div>
  );
};

export default SubjectDetail;