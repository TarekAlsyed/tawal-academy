import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { studentLogin, adminLogin } from '../services/api';
import { API_ENDPOINTS } from '../config/api';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const adminToken = localStorage.getItem('adminToken');
        const savedUser = localStorage.getItem('user');
        const savedAdmin = localStorage.getItem('admin');

        if (token && savedUser) {
          setUser(JSON.parse(savedUser));
        }

        if (adminToken && savedAdmin) {
          setAdmin(JSON.parse(savedAdmin));
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.clear();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Student login
  const login = async (name, email) => {
    try {
      const response = await studentLogin({ name, email });
      const { user: userData, token } = response.data.data;

      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      navigate('/');
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'فشل تسجيل الدخول'
      };
    }
  };

  // Admin login
  const adminLoginHandler = async (email, password) => {
    try {
      const response = await adminLogin({ email, password });
      const { admin: adminData, token } = response.data.data;

      // Save to localStorage
      localStorage.setItem('adminToken', token);
      localStorage.setItem('admin', JSON.stringify(adminData));

      setAdmin(adminData);
      navigate('/admin/dashboard');
      return { success: true };
    } catch (error) {
      console.error('Admin login failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'فشل تسجيل الدخول'
      };
    }
  };

  // Student logout
  const logoutHandler = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.PROFILE);
      if (response.data.success) {
        const userData = response.data.data.user;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  // Admin logout
  const adminLogoutHandler = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    setAdmin(null);
    navigate('/admin/login');
  };

  const value = {
    user,
    admin,
    loading,
    login,
    refreshUser,
    logout: logoutHandler,
    adminLogin: adminLoginHandler,
    adminLogout: adminLogoutHandler,
    isAuthenticated: !!user,
    isAdminAuthenticated: !!admin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
