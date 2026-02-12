import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import '../../styles/Login.css';

const StudentLogin = () => {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast.error('الاسم والإيميل مطلوبان');
      return;
    }

    if (!formData.email.endsWith('@gmail.com')) {
      toast.error('يجب أن يكون الإيميل من Gmail فقط (@gmail.com)');
      return;
    }

    setLoading(true);

    try {
      const result = await login(formData.name, formData.email);
      
      if (result.success) {
        toast.success('مرحباً بك في Tawal Academy!');
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
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🎓 Tawal Academy</h1>
          <p>منصة تعليمية متكاملة</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>الاسم</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="أدخل اسمك"
              required
            />
          </div>

          <div className="form-group">
            <label>البريد الإلكتروني (Gmail فقط)</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@gmail.com"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="login-footer">
          <p>Tawal Academy - رحلتك نحو التميز</p>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
