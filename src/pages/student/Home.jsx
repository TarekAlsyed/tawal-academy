import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { getSubjects } from '../../services/api';
import api from '../../services/api';
import { getFileUrl, API_ENDPOINTS } from '../../config/api';
import { FiBook, FiFileText, FiImage, FiAward, FiLogOut, FiArrowRight, FiGrid } from 'react-icons/fi';
import { useTheme } from '../../utils/useTheme';
import '../../styles/Home.css'; 

const Home = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLight, colors: c } = useTheme();

  const queryParams = new URLSearchParams(location.search);
  const termId = queryParams.get('termId');

  useEffect(() => {
    if (!termId) { navigate('/terms'); }
  }, [termId, navigate]);

  const fetchSubjects = useCallback(async () => {
    if (!termId) return;
    try {
      setLoading(true);
      const response = await getSubjects(termId);
      if (response.data.success) {
        const subjectsData = response.data.data.subjects;
        setSubjects(subjectsData);
        localStorage.setItem(`subjects_cache_${termId}`, JSON.stringify(subjectsData));
      }
    } catch (error) {
      const cachedSubjects = localStorage.getItem(`subjects_cache_${termId}`);
      if (cachedSubjects) { setSubjects(JSON.parse(cachedSubjects)); }
      else { toast.error('فشل تحميل المواد'); }
    } finally { setLoading(false); }
  }, [termId]);

  const syncOfflineSubmissions = useCallback(async () => {
    if (!navigator.onLine) return;
    const offlineSubs = JSON.parse(localStorage.getItem('offline_submissions') || '[]');
    if (offlineSubs.length === 0) return;

    let successCount = 0;
    const remainingSubs = [];

    for (const sub of offlineSubs) {
      try {
        await api.post(API_ENDPOINTS.SUBMIT_EXAM(sub.id), {
          answers: sub.answers,
          status: sub.status
        });
        successCount++;
      } catch (error) {
        console.error('فشل مزامنة امتحان:', sub.name, error);
        remainingSubs.push(sub);
      }
    }

    if (successCount > 0) {
      toast.success(`تمت مزامنة ${successCount} امتحانات كنت قد سلمتها في وضع الأوفلاين!`);
    }
    
    if (remainingSubs.length > 0) {
      localStorage.setItem('offline_submissions', JSON.stringify(remainingSubs));
    } else {
      localStorage.removeItem('offline_submissions');
    }
  }, []);

  useEffect(() => { 
    fetchSubjects(); 
    syncOfflineSubmissions();
    
    const handleOnline = () => {
      syncOfflineSubmissions();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetchSubjects, syncOfflineSubmissions]);

  const handleLogout = () => { logout(); toast.success('تم تسجيل الخروج بنجاح'); };

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background: c.pageBg, transition:'background 0.35s ease' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:'48px', height:'48px', border: c.spinnerBorder, borderTopColor:'#3b82f6', borderRightColor:'#f43f5e', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 1rem' }}></div>
          <p style={{ color: c.textSecondary, fontWeight:'600' }}>جاري التحميل...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: c.pageBg, minHeight:'100vh', fontFamily:'Tajawal, sans-serif', transition:'background 0.35s ease' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(25px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <header style={{
        background: c.headerBg, backdropFilter:'blur(20px)',
        borderBottom: c.headerBorder,
        padding:'0.875rem 1.5rem', position:'sticky', top:0, zIndex:100,
        transition:'background 0.35s ease, border 0.35s ease'
      }}>
        <div style={{ maxWidth:'1400px', margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', cursor:'pointer' }} onClick={() => navigate('/')}>
            <div style={{ width:'42px', height:'42px', background:'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.25rem', boxShadow:'0 4px 15px rgba(59,130,246,0.3)' }}>🎓</div>
            <span style={{ fontSize:'1.375rem', fontWeight:'800', color: c.textPrimary, letterSpacing:'-0.025em', transition:'color 0.35s ease' }}>Tawal Academy</span>
          </div>
          
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <button onClick={() => { window.location.hash = '#/personal-bank'; }}
              style={{ padding:'0.5rem 1rem', background:'rgba(244,63,94,0.1)', color: isLight ? '#e11d48' : '#fb7185', border:'1px solid rgba(244,63,94,0.15)', borderRadius:'10px', fontWeight:'700', fontSize:'0.8125rem', display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer', transition:'all 0.2s', fontFamily:'Tajawal, sans-serif' }}
              onMouseOver={(e) => { e.currentTarget.style.background='rgba(244,63,94,0.2)'; e.currentTarget.style.transform='translateY(-1px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background='rgba(244,63,94,0.1)'; e.currentTarget.style.transform='translateY(0)'; }}
            ><FiBook size={15} /> بنك الأخطاء</button>

            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'rgba(245,158,11,0.1)', padding:'0.5rem 1rem', borderRadius:'10px', border:'1px solid rgba(245,158,11,0.15)' }}>
              <FiAward size={16} style={{ color: isLight ? '#d97706' : '#fbbf24' }} />
              <span style={{ fontWeight:'800', fontSize:'0.9rem', color: isLight ? '#d97706' : '#fbbf24' }}>{user?.total_points || 0}</span>
              <span style={{ fontSize:'0.75rem', color: isLight ? '#d97706' : '#fbbf24', opacity:0.8 }}>نقطة</span>
            </div>

            <div style={{ width:'36px', height:'36px', background:'linear-gradient(135deg, #06b6d4, #0891b2)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:'800', fontSize:'0.85rem', boxShadow:'0 2px 10px rgba(6,182,212,0.3)' }}>{user?.name?.charAt(0)?.toUpperCase()}</div>
            
            <button onClick={handleLogout} title="خروج"
              style={{ width:'36px', height:'36px', background: c.logoutBg, color: c.logoutColor, border: c.logoutBorder, borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.background='#ef4444'; e.currentTarget.style.color='white'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = c.logoutBg; e.currentTarget.style.color = c.logoutColor; }}
            ><FiLogOut size={16} /></button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div style={{ padding:'3.5rem 1.5rem', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, opacity: c.meshOpacity, background: c.meshGradient, filter:'blur(100px)', pointerEvents:'none', transition:'opacity 0.35s ease' }}></div>
        <div style={{ position:'relative', zIndex:2, maxWidth:'700px', margin:'0 auto' }}>
          <h2 style={{ fontSize:'2.75rem', fontWeight:'800', color: c.heroTitle, marginBottom:'0.75rem', letterSpacing:'-0.03em', transition:'color 0.35s ease' }}>مرحباً، {user?.name} 👋</h2>
          <p style={{ color: c.heroSubtitle, fontSize:'1.125rem', fontWeight:'500', marginBottom: termId ? '1.75rem' : '0', transition:'color 0.35s ease' }}>اختر المادة وابدأ رحلة التعلم</p>
          {termId && (
            <button onClick={() => navigate('/terms')}
              style={{ padding:'0.625rem 1.5rem', background: c.subtleBg, backdropFilter:'blur(10px)', border: c.cardBorder, color: c.textPrimary, borderRadius:'12px', fontWeight:'700', fontSize:'0.9rem', cursor:'pointer', transition:'all 0.2s', display:'inline-flex', alignItems:'center', gap:'0.5rem', fontFamily:'Tajawal, sans-serif' }}
              onMouseOver={(e) => { e.currentTarget.style.transform='translateY(-2px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform='translateY(0)'; }}
            ><FiArrowRight size={16} /> العودة للترمات</button>
          )}
        </div>
      </div>

      {/* Subjects Grid */}
      <main style={{ maxWidth:'1400px', margin:'0 auto', padding:'0 1.5rem 4rem' }}>
        {subjects.length === 0 ? (
          <div style={{ textAlign:'center', padding:'5rem 2rem', background: c.emptyBg, borderRadius:'20px', border: c.emptyBorder, maxWidth:'500px', margin:'0 auto', transition:'all 0.35s ease' }}>
            <FiGrid size={56} color={c.emptyIcon} style={{ marginBottom:'1.5rem' }} />
            <h3 style={{ fontSize:'1.5rem', color: c.textPrimary, fontWeight:'800', transition:'color 0.35s ease' }}>لا توجد مواد متاحة</h3>
            <p style={{ color: c.textMuted }}>سيتم إضافة المواد قريباً</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:'1.5rem' }}>
            {subjects.map((subject, index) => (
              <div key={subject.id} onClick={() => navigate(`/subjects/${subject.id}`)}
                style={{
                  background: c.cardBg, borderRadius:'20px', overflow:'hidden',
                  cursor:'pointer', border: c.cardBorder,
                  transition:'all 0.35s cubic-bezier(0.4,0,0.2,1)', position:'relative',
                  animation:`fadeUp 0.4s ease ${index * 0.08}s both`
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform='translateY(-6px)'; e.currentTarget.style.boxShadow='0 20px 50px -10px rgba(59,130,246,0.15)'; e.currentTarget.style.borderColor = c.cardHoverBorder; }}
                onMouseOut={(e) => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor = c.cardBorder; }}
              >
                {/* Cover Image */}
                <div style={{ height:'200px', overflow:'hidden', position:'relative' }}>
                  {subject.cover_image ? (
                    <img src={getFileUrl(subject.cover_image)} alt={subject.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.5s' }}
                      onMouseOver={(e) => e.target.style.transform='scale(1.05)'}
                      onMouseOut={(e) => e.target.style.transform='scale(1)'}
                    />
                  ) : (
                    <div style={{ width:'100%', height:'100%', background: isLight ? 'linear-gradient(135deg, #e2e8f0, #f1f5f9)' : 'linear-gradient(135deg, #1e293b, #334155)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <FiBook size={48} color={c.emptyIcon} />
                    </div>
                  )}
                  {/* Overlay gradient */}
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'60%', background: isLight ? 'linear-gradient(to top, rgba(255,255,255,0.95) 0%, transparent 100%)' : 'linear-gradient(to top, rgba(15,23,42,0.95) 0%, transparent 100%)', pointerEvents:'none' }}></div>
                  <h3 style={{ position:'absolute', bottom:'1rem', right:'1.25rem', left:'1.25rem', color: isLight ? '#1e293b' : 'white', fontSize:'1.25rem', fontWeight:'800', textShadow: isLight ? 'none' : '0 2px 8px rgba(0,0,0,0.4)', margin:0, lineHeight:1.3, transition:'color 0.35s ease' }}>{subject.name}</h3>
                </div>

                {/* Stats */}
                <div style={{ padding:'1.25rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1rem' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.375rem', background:'rgba(59,130,246,0.1)', padding:'0.375rem 0.75rem', borderRadius:'8px' }}>
                      <FiFileText size={14} style={{ color: isLight ? '#2563eb' : '#60a5fa' }} />
                      <span style={{ color: isLight ? '#2563eb' : '#60a5fa', fontWeight:'700', fontSize:'0.8rem' }}>{subject.pdfs_count || 0} ملف</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.375rem', background:'rgba(16,185,129,0.1)', padding:'0.375rem 0.75rem', borderRadius:'8px' }}>
                      <FiImage size={14} style={{ color: isLight ? '#059669' : '#34d399' }} />
                      <span style={{ color: isLight ? '#059669' : '#34d399', fontWeight:'700', fontSize:'0.8rem' }}>{subject.images_count || 0} صورة</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.375rem', background:'rgba(245,158,11,0.1)', padding:'0.375rem 0.75rem', borderRadius:'8px' }}>
                      <FiBook size={14} style={{ color: isLight ? '#d97706' : '#fbbf24' }} />
                      <span style={{ color: isLight ? '#d97706' : '#fbbf24', fontWeight:'700', fontSize:'0.8rem' }}>{subject.exams_count || 0} امتحان</span>
                    </div>
                  </div>

                  {/* Rating */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', padding:'0.5rem', background: c.subtleBg, borderRadius:'10px', border: `1px solid ${c.border}`, transition:'all 0.35s ease' }}>
                    <div style={{ display:'flex', gap:'0.15rem' }}>
                      {[1,2,3,4,5].map((star) => (
                        <span key={star} style={{ color: star <= Math.round(subject.avg_rating || 0) ? '#fbbf24' : (isLight ? '#cbd5e1' : '#334155'), fontSize:'1rem', transition:'color 0.2s', filter: star <= Math.round(subject.avg_rating || 0) ? 'drop-shadow(0 0 4px rgba(251,191,36,0.4))' : 'none' }}>★</span>
                      ))}
                    </div>
                    <span style={{ color: c.textMuted, fontSize:'0.75rem', fontWeight:'700' }}>({subject.ratings_count || 0} تقييم)</span>
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
