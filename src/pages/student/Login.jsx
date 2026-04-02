import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiLogIn } from 'react-icons/fi';
// import '../../styles/Login.css'; // Commented out to use global COMPLETE-STUDENT-DESIGN.css

const Login = () => {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Check for saved credentials and auto-login
  useEffect(() => {
    const attemptAutoLogin = async () => {
      const savedName = localStorage.getItem('savedStudentName');
      const savedEmail = localStorage.getItem('savedStudentEmail');

      if (savedName && savedEmail) {
        setLoading(true);
        // Pre-fill form
        setFormData({ name: savedName, email: savedEmail });
        
        try {
          const result = await login(savedName, savedEmail);
          if (result.success) {
            toast.success('مرحباً بك مجدداً! تم تسجيل الدخول تلقائياً');
          } else {
            // If auto-login fails (e.g. server error), let user try manually
            console.log('Auto-login failed:', result.message);
          }
        } catch (error) {
          console.error('Auto-login error:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    attemptAutoLogin();
  }, [login]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Trim inputs before validation and submission
    const name = formData.name.trim();
    const email = formData.email.trim();

    if (!name || !email) {
      toast.error('الاسم والبريد الإلكتروني مطلوبان');
      return;
    }

    if (!email.includes('@')) {
      toast.error('البريد الإلكتروني غير صحيح');
      return;
    }

    setLoading(true);

    try {
      const result = await login(name, email);
      
      if (result.success) {
        toast.success('مرحباً بك في Tawal Academy!');
      } else {
        toast.error(result.message || 'فشل تسجيل الدخول');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Shapes */}
      <div className="floating-shape shape-1"></div>
      <div className="floating-shape shape-2"></div>
      <div className="floating-shape shape-3"></div>

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '3rem',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 20px 40px -10px rgba(16, 185, 129, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        zIndex: 10,
        position: 'relative'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="bounce-logo" style={{ 
            fontSize: '4rem', 
            marginBottom: '1rem',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
          }}>
            🎓
          </div>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '800', 
            color: '#1f2937',
            marginBottom: '0.5rem',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Tawal Academy
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>منصة تعليمية متكاملة للطلاب</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              color: '#374151',
              fontWeight: '600',
              fontSize: '0.95rem'
            }}>
              <FiUser style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
              الاسم الكامل
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="أدخل اسمك الكامل"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                outline: 'none',
                background: '#f9fafb'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#10b981';
                e.target.style.background = '#fff';
                e.target.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.background = '#f9fafb';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              color: '#374151',
              fontWeight: '600',
              fontSize: '0.95rem'
            }}>
              <FiMail style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }} />
              البريد الإلكتروني
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@gmail.com"
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                outline: 'none',
                background: '#f9fafb'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#10b981';
                e.target.style.background = '#fff';
                e.target.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.background = '#f9fafb';
                e.target.style.boxShadow = 'none';
              }}
            />
            <small style={{ display: 'block', marginTop: '0.5rem', color: '#6b7280', fontSize: '0.85rem' }}>
              يجب استخدام بريد Gmail (@gmail.com)
            </small>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.1rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1)'
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(16, 185, 129, 0.3), 0 4px 6px -2px rgba(16, 185, 129, 0.15)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1)';
              }
            }}
          >
            {loading ? (
              'جاري تسجيل الدخول...'
            ) : (
              <>
                <FiLogIn />
                تسجيل الدخول
              </>
            )}
          </button>
        </form>

        <div style={{ 
          marginTop: '2.5rem', 
          textAlign: 'center', 
          borderTop: '1px solid #e5e7eb',
          paddingTop: '1.5rem'
        }}>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
            Tawal Academy &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
