import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import '../../styles/Login.css';

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('الإيميل وكلمة المرور مطلوبان');
      return;
    }

    setLoading(true);

    try {
      const result = await adminLogin(formData.email, formData.password);
      
      if (result.success) {
        toast.success('مرحباً بك في لوحة التحكم!');
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
    <div className="login-container admin-login">
      <div className="login-card">
        <div className="login-header">
          <h1>🔐 لوحة التحكم</h1>
          <p>Tawal Academy - Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>البريد الإلكتروني</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@tawal.com"
              required
            />
          </div>

          <div className="form-group">
            <label>كلمة المرور</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="login-footer">
          <p>Tawal Academy - جميع الحقوق محفوظة &copy; 2024</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
