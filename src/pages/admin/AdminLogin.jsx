import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FiMail, FiShield, FiLock, FiEye, FiEyeOff, FiCopy, FiClipboard } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
// import '../../styles/Login.css'; // Commented out to use global COMPLETE-ADMIN-DESIGN.css

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '', mfaCode: '' });
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adminData, setAdminData] = useState(null);
  
  const navigate = useNavigate();
  const { adminLogin } = useAuth();

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${label} بنجاح`, { position: 'bottom-center' });
  };

  const handlePaste = async (fieldName) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setFormData(prev => ({ ...prev, [fieldName]: text }));
        toast.success(`تم اللصق في ${fieldName === 'email' ? 'البريد' : 'كلمة المرور'}`, { position: 'bottom-center' });
      }
    } catch (err) {
      toast.error('لا يمكن الوصول للحافظة. يرجى السماح بالصلاحية أو استخدام Ctrl+V');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('الإيميل وكلمة المرور مطلوبان');
      return;
    }

    if (mfaRequired && !formData.mfaCode) {
        toast.error('يرجى إدخال رمز التحقق (MFA)');
        return;
    }

    setLoading(true);

    try {
      const result = await adminLogin(formData.email, formData.password, formData.mfaCode);
      
      if (result.success) {
        if (result.mfaRequired) {
            setMfaRequired(true);
            toast.info('تم التحقق من كلمة المرور. يرجى إدخال رمز التحقق (MFA)');
        } else {
            toast.success('مرحباً بك في لوحة التحكم!');
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-layout" style={{ 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'var(--admin-bg-primary)' 
    }}>
      <div className="admin-card" style={{ 
        width: '100%', 
        maxWidth: '420px', 
        padding: '2.5rem',
        boxShadow: 'var(--admin-shadow-lg)',
        border: '1px solid var(--admin-border)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '70px',
            height: '70px',
            background: 'linear-gradient(135deg, var(--admin-primary) 0%, var(--admin-primary-dark) 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)'
          }}>
            <FiShield size={32} color="white" />
          </div>
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '800', 
            color: 'var(--admin-text)',
            marginBottom: '0.5rem' 
          }}>
            {mfaRequired ? 'التحقق الثنائي' : 'تسجيل دخول المسؤول'}
          </h1>
          <p style={{ color: 'var(--admin-text-muted)' }}>
            {mfaRequired ? 'أدخل رمز التحقق من تطبيق Authenticator' : 'Tawal Academy لوحة تحكم'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {!mfaRequired ? (
            <>
              <div className="admin-form-group">
                <label className="admin-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>البريد الإلكتروني</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={() => handlePaste('email')} title="لصق" style={{ background: 'none', border: 'none', color: 'var(--admin-primary)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <FiClipboard size={12} /> لصق
                    </button>
                    <button type="button" onClick={() => handleCopy(formData.email, 'البريد')} title="نسخ" style={{ background: 'none', border: 'none', color: 'var(--admin-text-light)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <FiCopy size={12} /> نسخ
                    </button>
                  </div>
                </label>
                <div style={{ position: 'relative' }}>
                  <FiMail style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    right: '1rem', 
                    color: 'var(--admin-text-light)' 
                  }} />
                  <input
                    type="email"
                    name="email"
                    className="admin-input"
                    style={{ paddingRight: '2.75rem' }}
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>كلمة المرور</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={() => handlePaste('password')} title="لصق" style={{ background: 'none', border: 'none', color: 'var(--admin-primary)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <FiClipboard size={12} /> لصق
                    </button>
                    <button type="button" onClick={() => handleCopy(formData.password, 'كلمة المرور')} title="نسخ" style={{ background: 'none', border: 'none', color: 'var(--admin-text-light)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <FiCopy size={12} /> نسخ
                    </button>
                  </div>
                </label>
                <div style={{ position: 'relative' }}>
                  <FiLock style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    right: '1rem', 
                    color: 'var(--admin-text-light)' 
                  }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    className="admin-input"
                    style={{ paddingRight: '2.75rem', paddingLeft: '2.75rem' }}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      left: '1rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--admin-text-light)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0'
                    }}
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="admin-form-group">
              <label className="admin-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>رمز التحقق (6 أرقام)</span>
                <button type="button" onClick={() => handlePaste('mfaCode')} title="لصق" style={{ background: 'none', border: 'none', color: 'var(--admin-primary)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <FiClipboard size={12} /> لصق الرمز
                </button>
              </label>
              <div style={{ position: 'relative' }}>
                <FiLock style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  right: '1rem', 
                  color: 'var(--admin-text-light)' 
                }} />
                <input
                  type="text"
                  name="mfaCode"
                  className="admin-input"
                  style={{ paddingRight: '2.75rem', textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.25rem' }}
                  placeholder="000000"
                  value={formData.mfaCode}
                  onChange={handleChange}
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="admin-btn admin-btn-primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: '600' }}
            disabled={loading}
          >
            {loading ? 'جاري التحقق...' : (mfaRequired ? 'تأكيد الرمز' : 'تسجيل الدخول')}
          </button>
          
          {mfaRequired && (
            <button 
                type="button" 
                className="admin-btn admin-btn-secondary" 
                style={{ width: '100%', marginTop: '1rem' }}
                onClick={() => setMfaRequired(false)}
            >
                رجوع لتسجيل الدخول
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;