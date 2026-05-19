import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getStudentTerms } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FiCalendar, FiLogOut, FiBookOpen, FiArrowLeft, FiAward } from 'react-icons/fi';
import { useTheme } from '../../utils/useTheme';
import '../../styles/StudentTerms.css';

const termColors = [
  { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', light: '#eff6ff', text: '#1d4ed8', shadow: 'rgba(59,130,246,0.3)' },
  { bg: 'linear-gradient(135deg, #f43f5e, #e11d48)', light: '#fff1f2', text: '#be123c', shadow: 'rgba(244,63,94,0.3)' },
  { bg: 'linear-gradient(135deg, #10b981, #059669)', light: '#ecfdf5', text: '#047857', shadow: 'rgba(16,185,129,0.3)' },
  { bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', light: '#f5f3ff', text: '#6d28d9', shadow: 'rgba(139,92,246,0.3)' },
  { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', light: '#fffbeb', text: '#b45309', shadow: 'rgba(245,158,11,0.3)' },
  { bg: 'linear-gradient(135deg, #06b6d4, #0891b2)', light: '#ecfeff', text: '#0e7490', shadow: 'rgba(6,182,212,0.3)' },
];

const StudentTerms = () => {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isLight, colors: c } = useTheme();

  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); fetchTerms(); };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const fetchTerms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getStudentTerms();
      if (response.data.success) {
        const termsData = response.data.data.terms;
        setTerms(termsData);
        localStorage.setItem('terms_cache', JSON.stringify(termsData));
      }
    } catch (error) {
      const cachedTerms = localStorage.getItem('terms_cache');
      if (cachedTerms) { setTerms(JSON.parse(cachedTerms)); }
      else { toast.error('فشل تحميل الترمات'); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTerms(); }, [fetchTerms]);

  const handleTermSelect = (termId) => navigate(`/?termId=${termId}`);
  const handleLogout = () => { logout(); toast.success('تم تسجيل الخروج بنجاح'); };

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background: c.pageBg, transition:'background 0.35s ease' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:'48px', height:'48px', border: c.spinnerBorder, borderTopColor: c.spinnerColor, borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 1rem' }}></div>
          <p style={{ color: c.textSecondary, fontWeight:'600' }}>جاري التحميل...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: c.pageBg, minHeight:'100vh', fontFamily:'Tajawal, sans-serif', transition:'background 0.35s ease' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <header style={{
        background: c.headerBg, backdropFilter:'blur(20px)',
        borderBottom: c.headerBorder,
        padding:'0.875rem 1.5rem', position:'sticky', top:0, zIndex:100,
        transition:'background 0.35s ease, border 0.35s ease'
      }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', cursor:'pointer' }} onClick={() => navigate('/')}>
            <div style={{ width:'42px', height:'42px', background:'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.25rem', boxShadow:'0 4px 15px rgba(59,130,246,0.3)' }}>🎓</div>
            <span style={{ fontSize:'1.375rem', fontWeight:'800', color: c.textPrimary, letterSpacing:'-0.025em', transition:'color 0.35s ease' }}>Tawal Academy</span>
          </div>
          
          <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.625rem', background: c.subtleBg, padding:'0.5rem 1rem', borderRadius:'12px', border: c.cardBorder, transition:'all 0.35s ease' }}>
              <div style={{ width:'32px', height:'32px', background:'linear-gradient(135deg, #f43f5e, #ec4899)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:'800', fontSize:'0.85rem' }}>{user?.name?.charAt(0)?.toUpperCase()}</div>
              <span style={{ fontWeight:'700', fontSize:'0.9rem', color: c.textPrimary, transition:'color 0.35s ease' }}>{user?.name}</span>
            </div>
            <button onClick={handleLogout} title="خروج"
              style={{ width:'38px', height:'38px', background: c.logoutBg, color: c.logoutColor, border: c.logoutBorder, borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.background='#ef4444'; e.currentTarget.style.color='white'; e.currentTarget.style.transform='scale(1.05)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = c.logoutBg; e.currentTarget.style.color = c.logoutColor; e.currentTarget.style.transform='scale(1)'; }}
            ><FiLogOut size={17} /></button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div style={{
        padding:'4rem 1.5rem', textAlign:'center', position:'relative', overflow:'hidden'
      }}>
        <div style={{ position:'absolute', inset:0, opacity: c.meshOpacity, background: c.meshGradient, filter:'blur(100px)', pointerEvents:'none', transition:'opacity 0.35s ease' }}></div>
        <div style={{ position:'relative', zIndex:2, maxWidth:'700px', margin:'0 auto' }}>
          <span style={{ display:'inline-block', padding:'0.375rem 1rem', background: c.badgeBg, color: c.badgeColor, borderRadius:'9999px', fontSize:'0.8125rem', fontWeight:'700', marginBottom:'1.5rem', border: c.badgeBorder, transition:'all 0.35s ease' }}>📚 اختيار الترم</span>
          <h2 style={{ fontSize:'3rem', fontWeight:'800', color: c.heroTitle, marginBottom:'0.75rem', letterSpacing:'-0.03em', lineHeight:1.2, transition:'color 0.35s ease' }}>اختر الترم الدراسي</h2>
          <p style={{ color: c.heroSubtitle, fontSize:'1.125rem', fontWeight:'500', lineHeight:1.6, transition:'color 0.35s ease' }}>يرجى اختيار الترم الذي ترغب في متابعة مواده الدراسية واختباراته</p>
        </div>
      </div>

      {/* Terms Grid */}
      <main style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 1.5rem 4rem' }}>
        {terms.length === 0 ? (
          <div style={{ textAlign:'center', padding:'5rem 2rem', background: c.emptyBg, borderRadius:'20px', border: c.emptyBorder, maxWidth:'500px', margin:'0 auto', transition:'all 0.35s ease' }}>
            <FiCalendar size={56} color={c.emptyIcon} style={{ marginBottom:'1.5rem' }} />
            <h3 style={{ fontSize:'1.5rem', color: c.textPrimary, fontWeight:'800', marginBottom:'0.5rem', transition:'color 0.35s ease' }}>لا توجد ترمات متاحة</h3>
            <p style={{ color: c.textMuted, fontWeight:'500' }}>سيتم إضافة الترمات قريباً</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'1.5rem' }}>
            {terms.map((term, index) => {
              const color = termColors[index % termColors.length];
              return (
                <div key={term.id} onClick={() => handleTermSelect(term.id)}
                  style={{
                    background: c.cardBg, borderRadius:'20px', padding:'2.5rem 2rem',
                    textAlign:'center', cursor:'pointer', border: c.cardBorder,
                    transition:'all 0.35s cubic-bezier(0.4,0,0.2,1)', position:'relative', overflow:'hidden',
                    animation:`fadeUp 0.5s ease ${index * 0.1}s both`
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform='translateY(-8px)'; e.currentTarget.style.boxShadow=`0 20px 50px -10px ${color.shadow}`; e.currentTarget.style.borderColor = c.cardHoverBorder; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor = c.cardBorder; }}
                >
                  <div style={{ width:'70px', height:'70px', background:color.bg, borderRadius:'18px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.75rem', boxShadow:`0 8px 25px -5px ${color.shadow}`, color:'white', fontSize:'1.75rem' }}>
                    <FiBookOpen />
                  </div>
                  <h3 style={{ fontSize:'1.5rem', fontWeight:'800', color: c.textPrimary, marginBottom:'0.75rem', letterSpacing:'-0.015em', transition:'color 0.35s ease' }}>{term.name}</h3>
                  <span style={{ display:'inline-block', padding:'0.375rem 1rem', background: isLight ? color.light : `rgba(${color.text === '#1d4ed8' ? '59,130,246' : color.text === '#be123c' ? '244,63,94' : color.text === '#047857' ? '16,185,129' : color.text === '#6d28d9' ? '139,92,246' : color.text === '#b45309' ? '245,158,11' : '6,182,212'},0.15)`, color: isLight ? color.text : (color.text === '#1d4ed8' ? '#60a5fa' : color.text === '#be123c' ? '#fb7185' : color.text === '#047857' ? '#34d399' : color.text === '#6d28d9' ? '#a78bfa' : color.text === '#b45309' ? '#fbbf24' : '#22d3ee'), borderRadius:'9999px', fontSize:'0.8rem', fontWeight:'700', marginBottom:'1.5rem' }}>متاح الآن</span>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', fontWeight:'700', fontSize:'1rem', color: c.textSecondary, transition:'color 0.25s' }}>
                    <span>تصفح المواد</span>
                    <FiArrowLeft size={16} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentTerms;
