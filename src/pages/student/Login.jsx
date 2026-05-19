import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiLogIn, FiWifiOff } from 'react-icons/fi';

const Login = () => {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const autoLoginAttempted = useRef(false);

  // Theme awareness — read from body class
  const [isLight, setIsLight] = useState(document.body.classList.contains('light-mode'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.body.classList.contains('light-mode'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/terms');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Auto-login from localStorage is disabled for security
  }, [login, isAuthenticated]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isOffline) {
      toast.error('لا يمكنك تسجيل الدخول في وضع الأوفلاين. يرجى الاتصال بالإنترنت.');
      return;
    }
    const name = formData.name.trim();
    const email = formData.email.trim();
    if (!name || !email) { toast.error('الاسم والبريد الإلكتروني مطلوبان'); return; }
    if (!email.includes('@')) { toast.error('البريد الإلكتروني غير صحيح'); return; }
    setLoading(true);
    try {
      const result = await login(name, email);
      if (result.success) { toast.success('مرحباً بك في Tawal Academy!'); }
      else { toast.error(result.message || 'فشل تسجيل الدخول'); }
    } catch (error) { toast.error('حدث خطأ أثناء تسجيل الدخول'); }
    finally { setLoading(false); }
  };

  // Theme-aware color palette
  const t = {
    pageBg: isLight ? '#f0f7ff' : '#0f172a',
    meshGradient: isLight
      ? 'radial-gradient(at 20% 20%, #93c5fd 0, transparent 50%), radial-gradient(at 80% 20%, #86efac 0, transparent 50%), radial-gradient(at 50% 80%, #a78bfa 0, transparent 50%), radial-gradient(at 80% 80%, #67e8f9 0, transparent 50%)'
      : 'radial-gradient(at 20% 20%, #3b82f6 0, transparent 50%), radial-gradient(at 80% 20%, #f43f5e 0, transparent 50%), radial-gradient(at 50% 80%, #8b5cf6 0, transparent 50%), radial-gradient(at 80% 80%, #06b6d4 0, transparent 50%)',
    gridDot: isLight ? 'rgba(37,99,235,0.04)' : 'rgba(255,255,255,0.05)',
    cardBg: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.7)',
    cardBorder: isLight ? '1px solid rgba(226,232,240,0.8)' : '1px solid rgba(255,255,255,0.1)',
    cardShadow: isLight
      ? '0 20px 60px rgba(37,99,235,0.08), 0 0 0 1px rgba(226,232,240,0.5)'
      : '0 0 80px rgba(59,130,246,0.1), 0 0 40px rgba(139,92,246,0.08)',
    titleGradient: isLight
      ? 'linear-gradient(135deg, #1e293b, #2563eb, #0891b2)'
      : 'linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)',
    subtitle: isLight ? '#475569' : '#94a3b8',
    labelColor: isLight ? '#1e293b' : '#e2e8f0',
    labelIcon1: isLight ? '#2563eb' : '#60a5fa',
    labelIcon2: isLight ? '#7c3aed' : '#a78bfa',
    inputBg: isLight ? 'rgba(241,245,249,0.8)' : 'rgba(255,255,255,0.05)',
    inputBorder: isLight ? '1.5px solid #e2e8f0' : '1.5px solid rgba(255,255,255,0.1)',
    inputColor: isLight ? '#1e293b' : '#f1f5f9',
    inputFocusBg: isLight ? 'rgba(37,99,235,0.04)' : 'rgba(59,130,246,0.08)',
    inputFocusBorder: isLight ? '#3b82f6' : '#3b82f6',
    inputBlurBorder: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)',
    inputBlurBg: isLight ? 'rgba(241,245,249,0.8)' : 'rgba(255,255,255,0.05)',
    hintColor: isLight ? '#94a3b8' : '#64748b',
    footerBorder: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)',
    footerText: isLight ? '#94a3b8' : '#475569',
    emojiShadow: isLight ? 'drop-shadow(0 0 20px rgba(37,99,235,0.3))' : 'drop-shadow(0 0 20px rgba(59,130,246,0.4))',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: t.pageBg, padding: '1.5rem', position: 'relative', overflow: 'hidden',
      fontFamily: 'Tajawal, sans-serif', transition: 'background 0.35s ease'
    }}>
      {/* Multi-color mesh gradient background */}
      <div style={{ position:'absolute', inset:0, opacity: isLight ? 0.4 : 0.6, background: t.meshGradient, filter:'blur(80px)', pointerEvents:'none', transition: 'opacity 0.35s ease' }}></div>
      {/* Grid pattern overlay */}
      <div style={{ position:'absolute', inset:0, backgroundImage:`radial-gradient(${t.gridDot} 1px, transparent 1px)`, backgroundSize:'40px 40px', pointerEvents:'none' }}></div>

      <style>{`
        @keyframes cardIn { from { opacity:0; transform:translateY(40px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes float { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-8px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%{ background-position:-200% 0; } 100%{ background-position:200% 0; } }
      `}</style>

      <div style={{
        background: t.cardBg, backdropFilter:'blur(40px) saturate(180%)',
        WebkitBackdropFilter:'blur(40px) saturate(180%)',
        borderRadius:'28px', padding:'3rem 2.5rem', width:'100%', maxWidth:'460px',
        border: t.cardBorder, position:'relative', zIndex:10,
        animation:'cardIn 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        boxShadow: t.cardShadow, transition: 'background 0.35s ease, border 0.35s ease, box-shadow 0.35s ease'
      }}>
        <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
          <div style={{ fontSize:'4rem', marginBottom:'1.25rem', animation:'float 4s ease-in-out infinite', filter: t.emojiShadow }}>🎓</div>
          <h1 style={{
            fontSize:'2.5rem', fontWeight:'800', marginBottom:'0.5rem', letterSpacing:'-0.04em',
            background: t.titleGradient,
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'
          }}>Tawal Academy</h1>
          <p style={{ color: t.subtitle, fontSize:'1rem', fontWeight:'500', transition: 'color 0.35s ease' }}>منصة تعليمية متكاملة للطلاب</p>
          
          {isOffline && (
            <div style={{ marginTop:'1.5rem', padding:'0.875rem 1.25rem', background:'rgba(239,68,68,0.15)', color:'#fca5a5', borderRadius:'14px', fontSize:'0.875rem', fontWeight:'600', border:'1px solid rgba(239,68,68,0.2)', display:'flex', alignItems:'center', gap:'0.75rem', textAlign:'right' }}>
              <FiWifiOff size={20} style={{ flexShrink:0, color:'#f87171' }} />
              <span>أنت الآن في وضع الأوفلاين.</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:'1.5rem' }}>
            <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.625rem', color: t.labelColor, fontWeight:'700', fontSize:'0.9rem', transition: 'color 0.35s ease' }}>
              <FiUser size={16} style={{ color: t.labelIcon1 }} />
              الاسم الكامل
            </label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="أدخل اسمك الكامل" required disabled={loading || isOffline}
              style={{ width:'100%', padding:'0.875rem 1.125rem', borderRadius:'14px', border: t.inputBorder, fontSize:'1rem', transition:'all 0.25s', outline:'none', background: t.inputBg, fontFamily:'Tajawal, sans-serif', color: t.inputColor, boxSizing:'border-box' }}
              onFocus={(e) => { if(isOffline) return; e.target.style.borderColor = t.inputFocusBorder; e.target.style.background = t.inputFocusBg; e.target.style.boxShadow='0 0 0 4px rgba(59,130,246,0.15)'; }}
              onBlur={(e) => { e.target.style.borderColor = t.inputBlurBorder; e.target.style.background = t.inputBlurBg; e.target.style.boxShadow='none'; }}
            />
          </div>
          <div style={{ marginBottom:'2rem' }}>
            <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.625rem', color: t.labelColor, fontWeight:'700', fontSize:'0.9rem', transition: 'color 0.35s ease' }}>
              <FiMail size={16} style={{ color: t.labelIcon2 }} />
              البريد الإلكتروني
            </label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="example@gmail.com" required disabled={loading || isOffline}
              style={{ width:'100%', padding:'0.875rem 1.125rem', borderRadius:'14px', border: t.inputBorder, fontSize:'1rem', transition:'all 0.25s', outline:'none', background: t.inputBg, fontFamily:'Tajawal, sans-serif', color: t.inputColor, boxSizing:'border-box' }}
              onFocus={(e) => { if(isOffline) return; e.target.style.borderColor = t.labelIcon2; e.target.style.background = isLight ? 'rgba(124,58,237,0.04)' : 'rgba(139,92,246,0.08)'; e.target.style.boxShadow='0 0 0 4px rgba(139,92,246,0.15)'; }}
              onBlur={(e) => { e.target.style.borderColor = t.inputBlurBorder; e.target.style.background = t.inputBlurBg; e.target.style.boxShadow='none'; }}
            />
            <small style={{ display:'block', marginTop:'0.5rem', color: t.hintColor, fontSize:'0.8rem', fontWeight:'500' }}>يجب استخدام بريد Gmail (@gmail.com)</small>
          </div>

          <button type="submit" disabled={loading}
            style={{
              width:'100%', padding:'1rem', border:'none', borderRadius:'14px', fontSize:'1.1rem', fontWeight:'700',
              cursor: loading ? 'not-allowed' : 'pointer', transition:'all 0.3s cubic-bezier(0.4,0,0.2,1)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:'0.625rem', fontFamily:'Tajawal, sans-serif',
              background: loading ? '#475569' : 'linear-gradient(135deg, #3b82f6, #8b5cf6, #f43f5e)',
              backgroundSize: '200% 200%', animation: loading ? 'none' : 'shimmer 3s ease infinite',
              color:'white', boxShadow: loading ? 'none' : '0 8px 32px rgba(59,130,246,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset'
            }}
            onMouseOver={(e) => { if(!loading) { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 16px 48px rgba(139,92,246,0.4), 0 0 0 1px rgba(255,255,255,0.15) inset'; }}}
            onMouseOut={(e) => { if(!loading) { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(59,130,246,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset'; }}}
          >
            {loading ? ( <><div style={{ width:'20px', height:'20px', border:'2.5px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}></div> جاري تسجيل الدخول...</> ) : ( <><FiLogIn size={20} /> تسجيل الدخول</> )}
          </button>
        </form>

        <div style={{ marginTop:'2.5rem', textAlign:'center', borderTop: t.footerBorder, paddingTop:'1.5rem', transition: 'border-color 0.35s ease' }}>
          <p style={{ color: t.footerText, fontSize:'0.85rem', fontWeight:'500', transition: 'color 0.35s ease' }}>Tawal Academy &copy; {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
