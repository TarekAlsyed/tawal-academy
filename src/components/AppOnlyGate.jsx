import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isNativePlatform } from '../utils/nativeBridge';
import { FiSmartphone, FiDownload, FiShield, FiZap, FiStar, FiArrowLeft } from 'react-icons/fi';

/**
 * AppOnlyGate — بوابة تمنع الوصول من المتصفح العادي
 * تظهر صفحة "حمّل التطبيق" بدل المنصة لو المستخدم فاتح من المتصفح
 * الأدمن مستثنى من هذا القيد ويقدر يدخل من المتصفح عادي
 */
const AppOnlyGate = ({ children }) => {
  const [isApp, setIsApp] = useState(true); // Default true to avoid flash
  const [checked, setChecked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check if running inside Capacitor (native app)
    const native = isNativePlatform();
    setIsApp(native);
    setChecked(true);
  }, []);

  // Don't render anything until check completes (prevent flash)
  if (!checked) return null;

  // If running in app, render children normally
  if (isApp) return children;

  // Allow admin routes from browser (admins need browser access for management)
  const isAdminPath = location.pathname.includes('/admin');
  if (isAdminPath) return children;

  // If on web browser accessing student routes, show "Download the App" page
  return <DownloadAppPage />;
};

const DownloadAppPage = () => {
  const [isLight, setIsLight] = useState(document.body.classList.contains('light-mode'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.body.classList.contains('light-mode'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const t = {
    pageBg: isLight ? '#f0f7ff' : '#0c0f1a',
    meshGradient: isLight
      ? 'radial-gradient(at 20% 20%, #93c5fd 0, transparent 50%), radial-gradient(at 80% 30%, #86efac 0, transparent 50%), radial-gradient(at 50% 80%, #a78bfa 0, transparent 50%)'
      : 'radial-gradient(at 20% 20%, #3b82f6 0, transparent 50%), radial-gradient(at 80% 30%, #f43f5e 0, transparent 50%), radial-gradient(at 50% 80%, #8b5cf6 0, transparent 50%)',
    cardBg: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.75)',
    cardBorder: isLight ? '1px solid rgba(226,232,240,0.8)' : '1px solid rgba(255,255,255,0.1)',
    cardShadow: isLight
      ? '0 25px 60px rgba(37,99,235,0.1), 0 0 0 1px rgba(226,232,240,0.5)'
      : '0 0 80px rgba(59,130,246,0.1), 0 0 40px rgba(139,92,246,0.08)',
    titleGradient: isLight
      ? 'linear-gradient(135deg, #1e293b, #2563eb, #0891b2)'
      : 'linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)',
    subtitle: isLight ? '#475569' : '#94a3b8',
    text: isLight ? '#334155' : '#cbd5e1',
    featureBg: isLight ? 'rgba(241,245,249,0.8)' : 'rgba(255,255,255,0.05)',
    featureBorder: isLight ? '1px solid rgba(226,232,240,0.5)' : '1px solid rgba(255,255,255,0.08)',
    featureIcon: isLight ? '#2563eb' : '#60a5fa',
    badgeBg: isLight ? 'rgba(37,99,235,0.1)' : 'rgba(239,68,68,0.15)',
    badgeColor: isLight ? '#2563eb' : '#fca5a5',
    badgeBorder: isLight ? '1px solid rgba(37,99,235,0.2)' : '1px solid rgba(239,68,68,0.2)',
    footerText: isLight ? '#94a3b8' : '#475569',
    footerBorder: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)',
  };

  const features = [
    { icon: <FiShield size={22} />, title: 'حماية متقدمة', desc: 'تشفير كامل وحماية من الغش' },
    { icon: <FiZap size={22} />, title: 'أداء سريع', desc: 'تجربة سلسة بدون تأخير' },
    { icon: <FiStar size={22} />, title: 'مزايا حصرية', desc: 'إشعارات وميزات خاصة بالتطبيق' },
  ];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: t.pageBg, padding: '1.5rem', position: 'relative', overflow: 'hidden',
      fontFamily: 'Tajawal, sans-serif', direction: 'rtl', transition: 'background 0.35s ease'
    }}>
      {/* Mesh gradient background */}
      <div style={{ position: 'absolute', inset: 0, opacity: isLight ? 0.35 : 0.5, background: t.meshGradient, filter: 'blur(80px)', pointerEvents: 'none' }}></div>
      {/* Grid pattern */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${isLight ? 'rgba(37,99,235,0.04)' : 'rgba(255,255,255,0.05)'} 1px, transparent 1px)`, backgroundSize: '40px 40px', pointerEvents: 'none' }}></div>

      <style>{`
        @keyframes gateCardIn { from { opacity:0; transform:translateY(50px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes float { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-10px); } }
        @keyframes pulse { 0%,100%{ box-shadow: 0 0 0 0 rgba(59,130,246,0.4); } 50%{ box-shadow: 0 0 0 12px rgba(59,130,246,0); } }
        @keyframes shimmer { 0%{ background-position:-200% 0; } 100%{ background-position:200% 0; } }
      `}</style>

      <div style={{
        background: t.cardBg, backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderRadius: '28px', padding: '3rem 2.5rem', width: '100%', maxWidth: '500px',
        border: t.cardBorder, position: 'relative', zIndex: 10,
        animation: 'gateCardIn 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
        boxShadow: t.cardShadow, transition: 'background 0.35s ease, border 0.35s ease'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            fontSize: '4.5rem', marginBottom: '1.25rem',
            animation: 'float 4s ease-in-out infinite',
            filter: 'drop-shadow(0 0 25px rgba(59,130,246,0.4))'
          }}>📱</div>

          <h1 style={{
            fontSize: '2.2rem', fontWeight: '800', marginBottom: '0.75rem', letterSpacing: '-0.03em',
            background: t.titleGradient,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>Tawal Academy</h1>

          <p style={{ color: t.subtitle, fontSize: '1.05rem', fontWeight: '500', lineHeight: '1.7', marginBottom: '1.25rem' }}>
            المنصة متاحة حصرياً عبر التطبيق
          </p>

          {/* Warning Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.25rem', borderRadius: '12px',
            background: t.badgeBg, color: t.badgeColor,
            border: t.badgeBorder, fontSize: '0.875rem', fontWeight: '600'
          }}>
            <FiSmartphone size={16} />
            الدخول من المتصفح غير متاح
          </div>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '2rem' }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '1rem 1.25rem', borderRadius: '16px',
              background: t.featureBg, border: t.featureBorder,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'default'
            }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateX(-4px)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: `linear-gradient(135deg, ${t.featureIcon}22, ${t.featureIcon}11)`,
                color: t.featureIcon
              }}>{f.icon}</div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: isLight ? '#1e293b' : '#e2e8f0', marginBottom: '2px' }}>{f.title}</div>
                <div style={{ fontSize: '0.825rem', color: t.subtitle }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Download Button */}
        <a
          href="https://www.mediafire.com/file/a0l91h486tzapya/Tawal_Academy.apk/file"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            width: '100%', padding: '1.1rem', border: 'none', borderRadius: '16px',
            fontSize: '1.15rem', fontWeight: '700', textDecoration: 'none',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #f43f5e)',
            backgroundSize: '200% 200%', animation: 'shimmer 3s ease infinite',
            color: 'white', cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
            boxShadow: '0 8px 32px rgba(59,130,246,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset',
            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)'
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(139,92,246,0.4), 0 0 0 1px rgba(255,255,255,0.15) inset'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(59,130,246,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset'; }}
        >
          <FiDownload size={22} />
          تحميل التطبيق (APK)
        </a>

        {/* Admin access link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <a
            href="#/admin/login"
            style={{
              color: t.subtitle, fontSize: '0.825rem', fontWeight: '500',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = t.featureIcon}
            onMouseOut={(e) => e.currentTarget.style.color = t.subtitle}
          >
            <FiArrowLeft size={14} />
            دخول المسؤولين
          </a>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: t.footerBorder, paddingTop: '1.25rem' }}>
          <p style={{ color: t.footerText, fontSize: '0.825rem', fontWeight: '500' }}>
            Tawal Academy &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppOnlyGate;
