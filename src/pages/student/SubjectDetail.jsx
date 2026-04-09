import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getSubjectById, downloadPDF, viewImage, rateSubject } from '../../services/api';
import api from '../../services/api';
import { getFileUrl, API_ENDPOINTS } from '../../config/api';
import { FiArrowRight, FiDownload, FiStar, FiLock, FiCheckCircle, FiMessageCircle, FiFileText, FiImage, FiBook, FiX, FiChevronLeft, FiChevronRight, FiAward, FiClock } from 'react-icons/fi';
import '../../styles/StudentSubject.css';

const SubjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState(null);
  const [activeTab, setActiveTab] = useState('pdfs');
  const [rating, setRating] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfHasWatermark, setPdfHasWatermark] = useState(false);

  const fetchSubject = useCallback(async () => {
    try {
      const response = await getSubjectById(id);
      if (response.data.success) {
        setSubject(response.data.data.subject);
        setRating(response.data.data.subject.user_rating || 0);
        
        // التحقق من الشهادة إذا تم إكمال جميع الامتحانات
        try {
          const certResponse = await api.get(API_ENDPOINTS.GET_CERTIFICATE(id));
          if (certResponse.data.success && certResponse.data.data.completed) {
            setCertificate(certResponse.data.data.certificate);
          } else {
            setCertificate(null);
          }
        } catch (certError) {
          console.warn('Certificate check skipped (not completed yet)');
          setCertificate(null);
        }
      }
    } catch (error) {
      console.error('فشل تحميل الشهادة أو المادة', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleDownloadCertificate = () => {
    if (!certificate) return;
    
    // محاكاة تحميل الشهادة كصورة أو PDF
    const certContent = `
      -----------------------------------------
      شهادة إتمام مادة: ${certificate.subject_name}
      -----------------------------------------
      نشهد أن الطالب: ${certificate.user_name}
      قد أتم جميع امتحانات المادة بنجاح.
      تاريخ الإتمام: ${new Date(certificate.completion_date).toLocaleDateString('ar-EG')}
      رقم الشهادة: ${certificate.certificate_id}
      -----------------------------------------
    `;
    
    const element = document.createElement("a");
    const file = new Blob([certContent], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `شهادة-${certificate.subject_name}.txt`;
    document.body.appendChild(element);
    element.click();
    toast.success('تم تحميل بيانات الشهادة بنجاح');
  };

  useEffect(() => {
    fetchSubject();
  }, [fetchSubject]);

  const handleDownloadPDF = async (pdfId) => {
    try {
      const response = await downloadPDF(id, pdfId);
      if (response.data.success) {
        // Always open in modal for secure view with watermark support
        const url = response.data.data.full_url;
        setPdfUrl(url);
        setPdfHasWatermark(response.data.data.has_watermark || false);
        setShowPdfModal(true);
        
        toast.success(response.data.message);
        fetchSubject();
      }
    } catch (error) {
      toast.error('فشل تحميل الملف');
    }
  };

  const handleViewImage = async (imageId) => {
    const index = subject.images.findIndex(img => img.id === imageId);
    if (index !== -1) {
      setCurrentImageIndex(index);
      setShowImageModal(true);
      try {
        await viewImage(id, imageId);
        fetchSubject();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleNextImage = useCallback((e) => {
    if (e) e.stopPropagation();
    if (!subject?.images || subject.images.length === 0) return;
    
    const newIndex = (currentImageIndex + 1) % subject.images.length;
    setCurrentImageIndex(newIndex);
    viewImage(id, subject.images[newIndex].id).then(() => fetchSubject());
  }, [subject, currentImageIndex, id, fetchSubject]);

  const handlePrevImage = useCallback((e) => {
    if (e) e.stopPropagation();
    if (!subject?.images || subject.images.length === 0) return;
    
    const newIndex = (currentImageIndex - 1 + subject.images.length) % subject.images.length;
    setCurrentImageIndex(newIndex);
    viewImage(id, subject.images[newIndex].id).then(() => fetchSubject());
  }, [subject, currentImageIndex, id, fetchSubject]);

  const handleCloseModal = () => {
    setShowImageModal(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showImageModal || !subject?.images) return;
      
      if (e.key === 'ArrowLeft') {
        handlePrevImage(); // Changed to Prev for RTL/LTR consistency based on UI arrows
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'Escape') {
        setShowImageModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showImageModal, currentImageIndex, subject, handleNextImage, handlePrevImage]);

  const handleRating = async (value) => {
    try {
      const response = await rateSubject(id, value);
      if (response.data.success) {
        setRating(value);
        toast.success(response.data.message);
        fetchSubject();
      }
    } catch (error) {
      toast.error('فشل التقييم');
    }
  };

  if (loading) {
    return (
      <div className="student-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading">جاري التحميل...</div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="student-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading">المادة غير موجودة</div>
      </div>
    );
  }

  return (
    <div className="student-page">
      {/* Header */}
      <header className="student-header">
        <div className="student-header-content">
          <div className="student-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="student-logo-icon">🎓</div>
            <div className="student-logo-text">Tawal Academy</div>
          </div>
          
          <div className="student-user-section">
            <button className="btn-student btn-student-secondary" onClick={() => navigate('/')} style={{ borderRadius: '9999px' }}>
              <FiArrowRight />
              <span>الرئيسية</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="subject-header">
        <div className="header-content">
          <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: '200px', height: '200px', borderRadius: 'var(--student-radius-lg)', overflow: 'hidden', boxShadow: 'var(--student-shadow-lg)', border: '4px solid white' }}>
              {subject.cover_image ? (
                <img 
                  src={getFileUrl(subject.cover_image)} 
                  alt={subject.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: 'var(--student-bg-subtle)', alignItems: 'center', justifyContent: 'center' }}>
                  <FiBook size={64} color="var(--student-text-muted)" />
                </div>
              )}
            </div>
            
            <div className="header-info">
              <h1>{subject.name}</h1>
              {subject.description && <p>{subject.description}</p>}
              
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                <div className="rating-section" style={{ padding: '0.75rem 1.25rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '1rem', borderRadius: '9999px' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.875rem' }}>قيّم المادة:</span>
                  <div className="stars" style={{ marginBottom: 0, gap: '0.375rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FiStar
                        key={star}
                        fill={star <= rating ? "#fbbf24" : "none"}
                        color={star <= rating ? "#fbbf24" : "#e2e8f0"}
                        onClick={() => handleRating(star)}
                        style={{ fontSize: '1.5rem' }}
                      />
                    ))}
                  </div>
                </div>

                <button 
                  className="btn-student btn-student-primary"
                  onClick={() => navigate('/questions')}
                  style={{ borderRadius: '9999px' }}
                >
                  <FiMessageCircle />
                  <span>اسأل المعلم</span>
                </button>
              </div>
            </div>
          </div>

          {subject.progress && (
            <div className="user-points" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderRadius: 'var(--student-radius-lg)', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span>تقدمك في المادة</span>
                <span>{subject.progress.percentage}%</span>
              </div>
              <div style={{ width: '200px', height: '8px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${subject.progress.percentage}%`, 
                    backgroundColor: 'var(--student-primary)', 
                    transition: 'width 0.5s ease' 
                  }} 
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--student-text-secondary)' }}>
                <span>✅ {subject.progress.passed_exams} امتحان</span>
                <span>👁️ {subject.progress.viewed_images} صورة</span>
                <span>⬇️ {subject.progress.downloaded_pdfs} ملف</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="student-subject-container" style={{ paddingTop: 0 }}>
        <div className="subject-tabs">
          <button
            className={activeTab === 'pdfs' ? 'active' : ''}
            onClick={() => setActiveTab('pdfs')}
          >
            <FiFileText />
            <span>الملفات</span>
            <span className="student-tab-badge">{subject.pdfs?.length || 0}</span>
          </button>
          <button
            className={activeTab === 'images' ? 'active' : ''}
            onClick={() => setActiveTab('images')}
          >
            <FiImage />
            <span>الصور</span>
            <span className="student-tab-badge">{subject.images?.length || 0}</span>
          </button>
          <button
            className={activeTab === 'exams' ? 'active' : ''}
            onClick={() => setActiveTab('exams')}
          >
            <FiBook />
            <span>الامتحانات</span>
            <span className="student-tab-badge">{subject.exams?.length || 0}</span>
          </button>
          
          {certificate && (
            <button
              className="btn-student btn-student-primary"
              onClick={handleDownloadCertificate}
              style={{ marginRight: 'auto', borderRadius: '8px', padding: '0.5rem 1rem' }}
            >
              <FiAward />
              <span>تحميل الشهادة</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="subject-content">
          {activeTab === 'pdfs' && (
            <div className="pdfs-grid">
              {subject.pdfs && subject.pdfs.length > 0 ? (
                subject.pdfs.map((pdf) => (
                  <div key={pdf.id} className="pdf-card">
                    <div className="pdf-icon">
                      <FiFileText color="#ef4444" />
                    </div>
                    <h3>{pdf.title}</h3>
                    <p>{pdf.downloads_count} تحميل للملف</p>
                    <button
                      className="btn-download"
                      onClick={() => handleDownloadPDF(pdf.id)}
                    >
                      <FiDownload />
                      <span>تحميل الملف (5 نقاط)</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <FiFileText size={48} />
                  <h3>لا توجد ملفات متاحة حالياً</h3>
                </div>
              )}
            </div>
          )}

          {activeTab === 'images' && (
            <div className="images-grid">
              {subject.images && subject.images.length > 0 ? (
                subject.images.map((image) => (
                  <div
                    key={image.id}
                    className="image-card"
                    onClick={() => handleViewImage(image.id)}
                  >
                    <img src={getFileUrl(image.file_url)} alt={image.title} />
                    <div className="image-info">
                      <p>{image.title}</p>
                      <small>{image.views_count} مشاهدة</small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <FiImage size={48} />
                  <h3>لا توجد صور متاحة حالياً</h3>
                </div>
              )}
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="exams-premium-list">
              {subject.exams && subject.exams.length > 0 ? (
                subject.exams.map((exam) => (
                  <div key={exam.id} className={`exam-premium-card ${!exam.can_access ? 'is-locked' : ''} ${exam.passed ? 'is-passed' : ''}`}>
                    <div className="exam-card-icon">
                      {exam.passed ? <FiCheckCircle className="icon-success" /> : exam.can_access ? <FiBook className="icon-primary" /> : <FiLock className="icon-muted" />}
                    </div>
                    
                    <div className="exam-card-main">
                      <div className="exam-card-header-row">
                        <h3>{exam.name}</h3>
                        <div className="exam-badges">
                          <span className="badge-level">المستوى {exam.level}</span>
                          {exam.best_score !== null && (
                            <span className={`badge-score ${exam.passed ? 'passed' : 'failed'}`}>
                              {exam.best_score}%
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="exam-card-stats">
                        <div className="stat">
                          <FiFileText />
                          <span>{exam.questions_count} سؤال</span>
                        </div>
                        <div className="stat">
                          <FiClock />
                          <span>30 دقيقة</span>
                        </div>
                        <div className="stat">
                          <FiAward />
                          <span>10 نقاط</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="exam-card-action">
                      {exam.can_access ? (
                        <button
                          className={`btn-action ${exam.passed ? 'btn-outline' : 'btn-solid'}`}
                          onClick={() => navigate(`/exam/${exam.id}`)}
                        >
                          {exam.passed ? 'إعادة المحاولة' : 'ابدأ الآن'}
                        </button>
                      ) : (
                        <div className="locked-status">
                          <span>مغلق</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <FiBook size={64} className="empty-icon" />
                  <h3>لا توجد امتحانات حالياً</h3>
                  <p>سيقوم المعلم بإضافة اختبارات قريباً.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && subject?.images && (
        <div className="student-modal-overlay" onClick={handleCloseModal}>
          <div className="image-viewer-container" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={handleCloseModal}>
              <FiX size={24} />
            </button>

            <div className="image-viewer-main">
              <button className="nav-btn prev-btn" onClick={handlePrevImage}>
                <FiChevronRight size={30} />
              </button>

              <div className="image-viewer-content">
                <img 
                    src={getFileUrl(subject.images[currentImageIndex].file_url)} 
                    alt={subject.images[currentImageIndex].title}
                    className="viewer-img"
                />
                <div className="image-viewer-footer">
                    <h4>{subject.images[currentImageIndex].title}</h4>
                    <span className="image-counter">{currentImageIndex + 1} / {subject.images.length}</span>
                </div>
              </div>

              <button className="nav-btn next-btn" onClick={handleNextImage}>
                <FiChevronLeft size={30} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Secure Viewer Modal */}
      {showPdfModal && (
        <div className="student-modal-overlay" onClick={() => setShowPdfModal(false)}>
          <div className="pdf-viewer-container" onClick={e => e.stopPropagation()} style={{
            width: '90%',
            height: '90%',
            backgroundColor: 'white',
            borderRadius: '12px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div className="pdf-viewer-header" style={{
              padding: '1rem',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              <h3 style={{ margin: 0 }}>عرض الملف الآمن</h3>
              <button onClick={() => setShowPdfModal(false)} style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666'
              }}>
                <FiX size={24} />
              </button>
            </div>
            <div className="pdf-viewer-body" style={{ flex: 1, position: 'relative' }}>
              <iframe 
                src={`${pdfUrl}#toolbar=0`} 
                title="Secure PDF Viewer"
                style={{ width: '100%', height: '100%', border: 'none' }}
                onLoad={() => setLoading(false)}
              />
              
              {/* Dynamic Watermark Overlay (Works on all pages of PDF as it stays fixed on top) */}
              {pdfHasWatermark && (
                <div className="pdf-secure-overlay" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  {/* Repeated overlay items */}
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-around',
                      opacity: 0.15,
                      padding: '2rem 0',
                      transform: 'rotate(-25deg)',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      color: '#000',
                      userSelect: 'none'
                    }}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <span key={j} style={{ margin: '0 2rem' }}>Tawal Academy Secure View</span>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Overlay to prevent right-click/selection if possible inside iframe */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 30
              }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectDetail;
