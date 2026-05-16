import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getSubjectById, downloadPDF, viewImage, rateSubject } from '../../services/api';
import api from '../../services/api';
import { getFileUrl, API_ENDPOINTS } from '../../config/api';
import { FiArrowRight, FiDownload, FiStar, FiLock, FiCheckCircle, FiMessageCircle, FiFileText, FiImage, FiBook, FiX, FiChevronLeft, FiChevronRight, FiAward, FiClock, FiSave, FiCheck } from 'react-icons/fi';
import { useTheme } from '../../utils/useTheme';
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
  const [cachingPdfs, setCachingPdfs] = useState({});
  const [cachedPdfs, setCachedPdfs] = useState({});
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { isLight, colors: c } = useTheme();

  // 1. Helper Functions (useCallback)
  // ---------------------------------

  // Check if PDFs are in Cache Storage
  const updateCachedStatus = useCallback(async (pdfs) => {
    if (!pdfs) return;
    try {
      const status = {};
      const savedInStorage = JSON.parse(localStorage.getItem('saved_pdfs') || '{}');
      
      for (const pdf of pdfs) {
        status[pdf.id] = !!savedInStorage[pdf.id];
      }
      setCachedPdfs(status);
    } catch (err) {
      console.error('Error checking cache status:', err);
    }
  }, []);

  const fetchSubject = useCallback(async () => {
    try {
      const response = await getSubjectById(id);
      if (response.data.success) {
        const subjectData = response.data.data.subject;
        setSubject(subjectData);
        setRating(subjectData.user_rating || 0);
        
        // Save for offline backup
        localStorage.setItem(`subject_cache_${id}`, JSON.stringify(subjectData));
        console.log(`[Offline] Metadata saved for subject ${id}`);
        
        // Update cached status for PDFs
        if (subjectData.pdfs) {
          updateCachedStatus(subjectData.pdfs);
        }
        
        // التحقق من الشهادة إذا تم إكمال جميع الامتحانات - تخطي إذا كنا أوفلاين
        if (navigator.onLine) {
          try {
            const certResponse = await api.get(API_ENDPOINTS.GET_CERTIFICATE(id));
            if (certResponse.data.success && certResponse.data.data.completed) {
              const certData = certResponse.data.data.certificate;
              setCertificate(certData);
              localStorage.setItem(`cert_${id}`, JSON.stringify(certData));
            } else {
              setCertificate(null);
              localStorage.removeItem(`cert_${id}`);
            }
          } catch (certError) {
            console.warn('Certificate check skipped (not completed yet)');
            setCertificate(null);
          }
        } else {
          // Try to load cached certificate if offline
          const savedCert = localStorage.getItem(`cert_${id}`);
          if (savedCert) {
            setCertificate(JSON.parse(savedCert));
          }
        }
      }
    } catch (error) {
      console.error('فشل تحميل المادة من الشبكة', error);
      
      // CRITICAL: Always try to load from localStorage if anything goes wrong
      const cachedSubject = localStorage.getItem(`subject_cache_${id}`);
      if (cachedSubject) {
        console.log('[Offline] Using local backup for subject metadata after error');
        const parsedData = JSON.parse(cachedSubject);
        setSubject(parsedData);
        
        // Also update PDF cache status from what we have
        if (parsedData.pdfs) {
          updateCachedStatus(parsedData.pdfs);
        }
        
        // Also try to load certificate from cache
        const savedCert = localStorage.getItem(`cert_${id}`);
        if (savedCert) {
          setCertificate(JSON.parse(savedCert));
        }
      } else {
        console.warn('[Offline] No local backup found for this subject');
      }
    } finally {
      setLoading(false);
    }
  }, [id, updateCachedStatus]);

  const saveForOffline = async (pdfId, pdfName) => {
    if (isOffline) {
      toast.warning('يجب أن تكون متصلاً بالإنترنت لحفظ الملف للأوفلاين');
      return;
    }

    try {
      setCachingPdfs(prev => ({ ...prev, [pdfId]: true }));
      const response = await downloadPDF(id, pdfId);
      
      if (response.data.success) {
        const url = response.data.data.full_url;
        
        // Force the browser/SW to cache the actual PDF file
        const fetchOptions = url.includes('cloudinary') ? { mode: 'no-cors' } : {};
        await fetch(url, fetchOptions);

        // Update local state and storage
        const saved = JSON.parse(localStorage.getItem('saved_pdfs') || '{}');
        saved[pdfId] = true;
        localStorage.setItem('saved_pdfs', JSON.stringify(saved));
        
        setCachedPdfs(prev => ({ ...prev, [pdfId]: true }));
        toast.success(`تم حفظ "${pdfName}" بنجاح! متاح الآن بدون إنترنت.`);
        fetchSubject();
      }
    } catch (error) {
      console.error('Save for offline error:', error);
      toast.error('فشل حفظ الملف. قد يكون هناك مشكلة في الاتصال أو الخادم.');
    } finally {
      setCachingPdfs(prev => ({ ...prev, [pdfId]: false }));
    }
  };

  // 2. Effect Hooks
  // ---------------

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchSubject();
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchSubject]);

  useEffect(() => {
    fetchSubject();
    
    // Check cache status on mount (especially useful if offline)
    const cachedSubject = localStorage.getItem(`subject_cache_${id}`);
    if (cachedSubject) {
      const parsed = JSON.parse(cachedSubject);
      if (parsed.pdfs) {
        updateCachedStatus(parsed.pdfs);
      }
    }
  }, [id, fetchSubject, updateCachedStatus]);

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
    
    // Check cache status on mount (especially useful if offline)
    const cachedSubject = localStorage.getItem(`subject_cache_${id}`);
    if (cachedSubject) {
      const parsed = JSON.parse(cachedSubject);
      if (parsed.pdfs) {
        updateCachedStatus(parsed.pdfs);
      }
    }
  }, [id, fetchSubject, updateCachedStatus]);

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
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background: c.pageBg, transition:'background 0.35s ease' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:'48px', height:'48px', border: c.spinnerBorder, borderTopColor:'#3b82f6', borderRightColor:'#f43f5e', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 1rem' }}></div>
          <p style={{ color: c.textSecondary, fontWeight:'600', fontFamily:'Tajawal, sans-serif' }}>جاري التحميل...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!subject) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background: c.pageBg, fontFamily:'Tajawal, sans-serif', transition:'background 0.35s ease' }}>
        <div style={{ textAlign:'center', background: c.cardBg, padding: '3rem', borderRadius: '24px', border: c.cardBorder, transition:'all 0.35s ease' }}>
          <FiBook size={64} color={c.emptyIcon} style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ color: c.textPrimary, fontWeight:'800', marginBottom: '0.5rem', transition:'color 0.35s ease' }}>المادة غير موجودة</h2>
          <p style={{ color: c.textMuted, marginBottom: '2rem' }}>عذراً، لم نتمكن من العثور على المادة المطلوبة.</p>
          <button onClick={() => navigate('/')} style={{ padding:'0.75rem 2rem', background:'linear-gradient(135deg, #3b82f6, #2563eb)', color:'white', border:'none', borderRadius:'12px', fontWeight:'700', fontSize:'1rem', cursor:'pointer', fontFamily:'Tajawal, sans-serif' }}>العودة للرئيسية</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: c.pageBg, minHeight: '100vh', fontFamily: 'Tajawal, sans-serif', color: c.textLabel, paddingBottom: '4rem', transition:'background 0.35s ease, color 0.35s ease' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(25px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .modern-tab {
          padding: 0.8rem 1.5rem;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid transparent;
        }
        .modern-tab.active {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border-color: rgba(59, 130, 246, 0.2);
        }
        .modern-tab:not(.active) {
          background: ${isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.03)'};
          color: ${c.textSecondary};
          border-color: ${c.border};
        }
        .modern-tab:not(.active):hover {
          background: ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.06)'};
          color: ${c.textPrimary};
        }
        .glass-card {
          background: ${c.cardBg};
          border: ${c.cardBorder};
          border-radius: 16px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }
        .glass-card:hover {
          transform: translateY(-5px);
          border-color: ${isLight ? '#93c5fd' : 'rgba(255, 255, 255, 0.12)'};
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, ${isLight ? '0.1' : '0.5'});
        }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      {/* Header */}
      <header style={{
        background: c.headerBg, backdropFilter:'blur(20px)',
        borderBottom: c.headerBorder,
        padding:'0.875rem 1.5rem', position:'sticky', top:0, zIndex:100,
        transition:'background 0.35s ease, border 0.35s ease'
      }}>
        <div style={{ maxWidth:'1200px', margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', cursor:'pointer' }} onClick={() => navigate('/')}>
            <div style={{ width:'42px', height:'42px', background:'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.25rem', boxShadow:'0 4px 15px rgba(59,130,246,0.3)' }}>🎓</div>
            <span style={{ fontSize:'1.375rem', fontWeight:'800', color: c.textPrimary, letterSpacing:'-0.025em', transition:'color 0.35s ease' }}>Tawal Academy</span>
          </div>
          
          <div>
            <button onClick={() => navigate('/')}
              style={{ padding:'0.625rem 1.25rem', background:'rgba(255,255,255,0.06)', color:'#e2e8f0', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', fontWeight:'700', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', transition:'all 0.2s', fontFamily:'Tajawal, sans-serif' }}
              onMouseOver={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; }}
            >
              <FiArrowRight /> الرئيسية
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Hero Section */}
        <div style={{ 
          background: c.cardBg, 
          border: c.cardBorder, 
          borderRadius: '24px', 
          padding: '2rem', 
          marginBottom: '2rem',
          display: 'flex',
          gap: '2rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative blur */}
          <div style={{ position:'absolute', top:'-50%', right:'-10%', width:'300px', height:'300px', background:'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', filter:'blur(40px)', pointerEvents:'none' }}></div>
          
          <div style={{ width: '180px', height: '180px', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
            {subject.cover_image ? (
              <img 
                src={getFileUrl(subject.cover_image)} 
                alt={subject.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <FiBook size={64} color="#475569" />
              </div>
            )}
          </div>
          
          <div style={{ flex: 1, minWidth: '300px', zIndex: 1 }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: '800', marginBottom: '0.75rem', color: c.textPrimary, lineHeight: 1.2 }}>{subject.name}</h1>
            {subject.description && <p style={{ color: c.textSecondary, fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1.5rem', maxWidth: '800px' }}>{subject.description}</p>}
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ background: c.subtleBg, border: c.border, borderRadius: '12px', padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', color: c.textMuted, fontWeight: '600' }}>قيّم المادة:</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FiStar
                      key={star}
                      fill={star <= rating ? "#fbbf24" : "none"}
                      color={star <= rating ? "#fbbf24" : c.textSecondary}
                      onClick={() => handleRating(star)}
                      style={{ fontSize: '1.25rem', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  ))}
                </div>
              </div>

              <button 
                onClick={() => navigate('/questions')}
                style={{ 
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.7rem 1.5rem',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
                  transition: 'all 0.2s',
                  fontFamily: 'Tajawal, sans-serif'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(59,130,246,0.4)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(59,130,246,0.3)'; }}
              >
                <FiMessageCircle /> اسأل المعلم
              </button>
            </div>
          </div>

          {subject.progress && (
            <div style={{ 
              background: c.subtleBg, 
              border: c.border,
              borderRadius: '16px', 
              padding: '1.25rem', 
              width: '100%', 
              maxWidth: '300px',
              marginLeft: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: '700', color: c.textPrimary }}>
                <span>تقدمك في المادة</span>
                <span style={{ color: '#3b82f6' }}>{subject.progress.percentage}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${subject.progress.percentage}%`, 
                    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', 
                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: '4px'
                  }} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.8rem', color: c.textSecondary, fontWeight: '600' }}>
                <span title="امتحانات مجتازة">✅ {subject.progress.passed_exams}</span>
                <span title="صور تمت مشاهدتها">👁️ {subject.progress.viewed_images}</span>
                <span title="ملفات محملة">⬇️ {subject.progress.downloaded_pdfs}</span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }} className="custom-scrollbar">
          <button
            className={`modern-tab ${activeTab === 'pdfs' ? 'active' : ''}`}
            onClick={() => setActiveTab('pdfs')}
          >
            <FiFileText size={18} /> الملفات
            <span style={{ background: activeTab === 'pdfs' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.1)', padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.8rem', marginLeft: '0.25rem' }}>{subject.pdfs?.length || 0}</span>
          </button>
          <button
            className={`modern-tab ${activeTab === 'images' ? 'active' : ''}`}
            onClick={() => setActiveTab('images')}
          >
            <FiImage size={18} /> الصور
            <span style={{ background: activeTab === 'images' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.1)', padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.8rem', marginLeft: '0.25rem' }}>{subject.images?.length || 0}</span>
          </button>
          <button
            className={`modern-tab ${activeTab === 'exams' ? 'active' : ''}`}
            onClick={() => setActiveTab('exams')}
          >
            <FiBook size={18} /> الامتحانات
            <span style={{ background: activeTab === 'exams' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.1)', padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.8rem', marginLeft: '0.25rem' }}>{subject.exams?.length || 0}</span>
          </button>
          
          {certificate && (
            <button
              onClick={handleDownloadCertificate}
              style={{ 
                marginRight: 'auto', 
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '0.8rem 1.5rem',
                fontWeight: '700',
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                transition: 'all 0.2s',
                fontFamily: 'Tajawal, sans-serif'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.4)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(16,185,129,0.3)'; }}
            >
              <FiAward size={18} /> تحميل الشهادة
            </button>
          )}
        </div>

        {/* Content Area */}
        <div style={{ minHeight: '400px' }}>
          {activeTab === 'pdfs' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {subject.pdfs && subject.pdfs.length > 0 ? (
                subject.pdfs.map((pdf, index) => (
                  <div key={pdf.id} className="glass-card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', animation: `fadeUp 0.4s ease ${index * 0.05}s both` }}>
                    {cachedPdfs[pdf.id] && (
                      <div style={{
                        position: 'absolute', top: '-10px', right: '-10px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white', fontSize: '0.7rem', padding: '4px 10px',
                        borderRadius: '12px', fontWeight: 'bold', display: 'flex',
                        alignItems: 'center', gap: '4px', zIndex: 1,
                        boxShadow: '0 4px 10px rgba(16,185,129,0.3)'
                      }}>
                        <FiCheck size={12} /> جاهز للأوفلاين
                      </div>
                    )}
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: isLight ? '#fee2e2' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: '#ef4444' }}>
                      <FiFileText size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', color: c.textPrimary, lineHeight: 1.4 }}>{pdf.title}</h3>
                    <p style={{ color: c.textSecondary, fontSize: '0.85rem', marginBottom: '1.5rem', marginTop: 'auto' }}>{pdf.downloads_count} تحميل للملف</p>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      <button
                        onClick={() => handleDownloadPDF(pdf.id)}
                        style={{ 
                          flex: 1, background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)',
                          padding: '0.6rem', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Tajawal, sans-serif'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; }}
                      >
                        <FiDownload /> فتح الملف
                      </button>
                      <button
                        onClick={() => saveForOffline(pdf.id, pdf.title)}
                        disabled={cachingPdfs[pdf.id] || cachedPdfs[pdf.id]}
                        style={{ 
                          width: '42px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: cachingPdfs[pdf.id] ? (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)') : (cachedPdfs[pdf.id] ? (isLight ? '#d1fae5' : 'rgba(16,185,129,0.1)') : (isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)')),
                          color: cachingPdfs[pdf.id] ? c.textMuted : (cachedPdfs[pdf.id] ? '#10b981' : c.textPrimary),
                          border: `1px solid ${cachedPdfs[pdf.id] ? 'rgba(16,185,129,0.2)' : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)')}`,
                          borderRadius: '10px',
                          cursor: (cachingPdfs[pdf.id] || cachedPdfs[pdf.id]) ? 'default' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => { if(!cachingPdfs[pdf.id] && !cachedPdfs[pdf.id]) e.currentTarget.style.background = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'; }}
                        onMouseOut={(e) => { if(!cachingPdfs[pdf.id] && !cachedPdfs[pdf.id]) e.currentTarget.style.background = isLight ? '#f8fafc' : 'rgba(255,255,255,0.05)'; }}
                        title={cachedPdfs[pdf.id] ? "محفوظ للأوفلاين" : "حفظ للمشاهدة بدون إنترنت"}
                      >
                        {cachingPdfs[pdf.id] ? (
                          <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        ) : (
                          cachedPdfs[pdf.id] ? <FiCheck size={18} /> : <FiSave size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', background: c.subtleBg, borderRadius: '20px', border: `1px dashed ${c.border}` }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: c.textMuted }}>
                    <FiFileText size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', color: c.textPrimary, fontWeight: '700', marginBottom: '0.5rem' }}>لا توجد ملفات متاحة</h3>
                  <p style={{ color: c.textSecondary }}>لم يتم إضافة ملفات PDF لهذه المادة بعد.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'images' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
              {subject.images && subject.images.length > 0 ? (
                subject.images.map((image, index) => (
                  <div
                    key={image.id}
                    className="glass-card"
                    onClick={() => handleViewImage(image.id)}
                    style={{ padding: '0.75rem', cursor: 'pointer', animation: `fadeUp 0.4s ease ${index * 0.05}s both` }}
                  >
                    <div style={{ height: '160px', borderRadius: '10px', overflow: 'hidden', marginBottom: '1rem', background: '#1e293b' }}>
                      <img src={getFileUrl(image.file_url)} alt={image.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }} onMouseOver={e=>e.target.style.transform='scale(1.05)'} onMouseOut={e=>e.target.style.transform='scale(1)'} />
                    </div>
                    <div style={{ padding: '0 0.5rem 0.5rem' }}>
                      <p style={{ fontWeight: '700', fontSize: '1rem', color: c.textPrimary, marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{image.title}</p>
                      <small style={{ color: c.textSecondary, fontSize: '0.8rem' }}>{image.views_count} مشاهدة</small>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', background: c.subtleBg, borderRadius: '20px', border: `1px dashed ${c.border}` }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: c.textMuted }}>
                    <FiImage size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', color: c.textPrimary, fontWeight: '700', marginBottom: '0.5rem' }}>لا توجد صور متاحة</h3>
                  <p style={{ color: c.textSecondary }}>لم يتم إضافة صور توضيحية لهذه المادة بعد.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'exams' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {subject.exams && subject.exams.length > 0 ? (
                subject.exams.map((exam, index) => (
                  <div key={exam.id} className="glass-card" style={{ 
                    position: 'relative', 
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: `fadeUp 0.4s ease ${index * 0.05}s both`,
                    borderColor: exam.passed ? 'rgba(16,185,129,0.3)' : (exam.can_access ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'),
                    opacity: exam.can_access ? 1 : 0.7
                  }}>
                    {exam.passed && (
                      <div style={{ position: 'absolute', top: '0', right: '0', width: '100%', height: '4px', background: 'linear-gradient(90deg, #10b981, #059669)' }}></div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ 
                        width: '50px', height: '50px', borderRadius: '14px', flexShrink: 0,
                        background: exam.passed ? 'rgba(16,185,129,0.1)' : (exam.can_access ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)'),
                        color: exam.passed ? '#34d399' : (exam.can_access ? '#60a5fa' : '#64748b'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {exam.passed ? <FiCheckCircle size={24} /> : (exam.can_access ? <FiBook size={24} /> : <FiLock size={24} />)}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: c.textPrimary, marginBottom: '0.4rem', lineHeight: 1.3 }}>{exam.name}</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{ background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)', color: c.textSecondary, padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>المستوى {exam.level}</span>
                          {exam.best_score !== null && (
                            <span style={{ 
                              background: exam.passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
                              color: exam.passed ? '#34d399' : '#f87171', 
                              padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' 
                            }}>
                              {exam.best_score}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem', marginTop: 'auto', background: isLight ? '#f8fafc' : 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '12px', border: `1px solid ${c.border}` }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                        <FiFileText size={14} color={c.textMuted} />
                        <span style={{ fontSize: '0.75rem', color: c.textSecondary, fontWeight: '600' }}>{exam.questions_count} سؤال</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                        <FiClock size={14} color={c.textMuted} />
                        <span style={{ fontSize: '0.75rem', color: c.textSecondary, fontWeight: '600' }}>30 دقيقة</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                        <FiAward size={14} color={isLight ? '#d97706' : '#fbbf24'} />
                        <span style={{ fontSize: '0.75rem', color: isLight ? '#d97706' : '#fbbf24', fontWeight: '600' }}>10 نقاط</span>
                      </div>
                    </div>
                    
                    {exam.can_access ? (
                      <button
                        onClick={() => navigate(`/exam/${exam.id}`)}
                        style={{ 
                          width: '100%', 
                          background: exam.passed ? 'rgba(16,185,129,0.1)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                          color: exam.passed ? '#34d399' : 'white',
                          border: exam.passed ? '1px solid rgba(16,185,129,0.3)' : 'none',
                          borderRadius: '10px',
                          padding: '0.8rem',
                          fontWeight: '700',
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontFamily: 'Tajawal, sans-serif'
                        }}
                        onMouseOver={(e) => { 
                          if(!exam.passed) { e.currentTarget.style.boxShadow = '0 4px 15px rgba(59,130,246,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }
                          else { e.currentTarget.style.background = 'rgba(16,185,129,0.2)'; }
                        }}
                        onMouseOut={(e) => { 
                          if(!exam.passed) { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }
                          else { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; }
                        }}
                      >
                        {exam.passed ? 'إعادة المحاولة' : 'ابدأ الامتحان الآن'}
                      </button>
                    ) : (
                      <div style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#64748b', borderRadius: '10px', padding: '0.8rem', textAlign: 'center', fontWeight: '700', fontSize: '0.95rem' }}>
                        <FiLock style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} /> مقفل مؤقتاً
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', background: c.subtleBg, borderRadius: '20px', border: `1px dashed ${c.border}` }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: c.textMuted }}>
                    <FiBook size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', color: c.textPrimary, fontWeight: '700', marginBottom: '0.5rem' }}>لا توجد امتحانات حالياً</h3>
                  <p style={{ color: c.textSecondary }}>سيقوم المعلم بإضافة اختبارات قريباً.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Image Modal */}
      {showImageModal && subject?.images && (
        <div onClick={handleCloseModal} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button onClick={handleCloseModal} style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem' }} onMouseOver={e=>e.currentTarget.style.color='white'} onMouseOut={e=>e.currentTarget.style.color='#94a3b8'}>
              <FiX size={32} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button onClick={handlePrevImage} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(5px)' }} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.2)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
                <FiChevronRight size={24} />
              </button>

              <div style={{ background: '#000', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                <img 
                    src={getFileUrl(subject.images[currentImageIndex].file_url)} 
                    alt={subject.images[currentImageIndex].title}
                    style={{ maxWidth: '80vw', maxHeight: '75vh', objectFit: 'contain', display: 'block' }}
                />
                <div style={{ padding: '1rem', background: 'rgba(15,23,42,0.9)', color: 'white', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: '700' }}>{subject.images[currentImageIndex].title}</h4>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{currentImageIndex + 1} / {subject.images.length}</span>
                </div>
              </div>

              <button onClick={handleNextImage} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(5px)' }} onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,0.2)'} onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
                <FiChevronLeft size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Secure Viewer Modal */}
      {showPdfModal && (
        <div onClick={() => setShowPdfModal(false)} style={{ position: 'fixed', inset: 0, background: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '90%', height: '90%', background: c.pageBg, borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: `1px solid ${c.border}`, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: `1px solid ${c.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: c.headerBg }}>
              <h3 style={{ margin: 0, color: c.textPrimary, fontSize: '1.2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiFileText color="#3b82f6" /> عرض الملف الآمن</h3>
              <button onClick={() => setShowPdfModal(false)} style={{ background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)', border: 'none', color: c.textMuted, cursor: 'pointer', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={e=>{e.currentTarget.style.background='rgba(239,68,68,0.1)'; e.currentTarget.style.color='#ef4444';}} onMouseOut={e=>{e.currentTarget.style.background=isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)'; e.currentTarget.style.color=c.textMuted;}}>
                <FiX size={20} />
              </button>
            </div>
            <div style={{ flex: 1, position: 'relative', backgroundColor: isLight ? '#f8fafc' : '#1e293b' }}>
              {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && navigator.onLine ? (
                <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`} title="Secure PDF Viewer Mobile" style={{ width: '100%', height: '100%', border: 'none' }} onLoad={() => setLoading(false)} />
              ) : (
                <iframe src={`${pdfUrl}#toolbar=0`} title="Secure PDF Viewer Desktop/Offline" style={{ width: '100%', height: '100%', border: 'none' }} onLoad={() => setLoading(false)} />
              )}
              {pdfHasWatermark && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-around', opacity: 0.08, padding: '1.5rem 0', transform: 'rotate(-25deg)', fontSize: '1.2rem', fontWeight: 'bold', whiteSpace: 'nowrap', color: '#fff', userSelect: 'none' }}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <span key={j} style={{ margin: '0 1.5rem' }}>Tawal Academy Secure View</span>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30 }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectDetail;
