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
        const token = localStorage.getItem('accessToken');
        const adminToken = localStorage.getItem('adminAccessToken');
        const savedUser = localStorage.getItem('user');
        const savedAdmin = localStorage.getItem('admin');

        const isAdminPath = window.location.hash.includes('/admin');

        if (token && savedUser && !isAdminPath) {
          try {
            setUser(JSON.parse(savedUser));
            // Fetch fresh data from API
            const response = await api.get(API_ENDPOINTS.PROFILE);
            if (response.data.success) {
              const userData = response.data.data.user;
              setUser(userData);
              localStorage.setItem('user', JSON.stringify(userData));
            }
          } catch (err) {
            console.error('Student profile refresh failed:', err.message);
            // If it's a 403 (Device mismatch) or 401 (Expired), the interceptor will handle it
          }
        }

        if (adminToken && savedAdmin) {
          setAdmin(JSON.parse(savedAdmin));
          // Refresh admin stats or profile if needed
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Don't clear everything, just current invalid session info if needed
        // but generally let the interceptor handle 401s
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
      const { user: userData, accessToken } = response.data.data;

      // Save to localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Save credentials for auto-login
      localStorage.setItem('savedStudentName', name);
      localStorage.setItem('savedStudentEmail', email);

      setUser(userData);
      navigate('/terms');
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      
      let detailedMessage = error.response?.data?.message || 'فشل تسجيل الدخول';

      if (import.meta.env.DEV && error.response?.data?.debug_info) {
        console.log('DEBUG: Server Response Data:', JSON.stringify(error.response.data, null, 2));
        const { server_payload_to_sign } = error.response.data.debug_info;
        // Overwrite the message to make the payload visible in the toast
        detailedMessage = `Server Payload: ${server_payload_to_sign}`;
      }

      return {
        success: false,
        message: detailedMessage
      };
    }
  };

  // Admin login
  const adminLoginHandler = async (email, password, mfaCode = null) => {
    try {
      const response = await adminLogin({ email, password, mfaCode });
      
      if (response.data.mfaRequired) {
        return { 
          success: true, 
          mfaRequired: true, 
          mfaToken: response.data.mfaToken 
        };
      }

      const { admin: adminData, accessToken } = response.data.data;

      localStorage.setItem('adminAccessToken', accessToken);
      localStorage.setItem('admin', JSON.stringify(adminData));

      setAdmin(adminData);
      navigate('/admin/dashboard');
      return { success: true };
    } catch (error) {
      console.error('Admin login failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'فشل تسجيل الدخول كمسؤول'
      };
    }
  };

  // Student logout
  const logoutHandler = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    
    // localStorage.removeItem('savedStudentName');
    // localStorage.removeItem('savedStudentEmail');

    setUser(null);
    // Use navigate but also trigger a small delay for state cleanup
    setTimeout(() => navigate('/login'), 10);
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
      // 401 will be handled by interceptor
    }
  };

  // Admin logout
  const adminLogoutHandler = async () => {
    try {
      await api.post('/admin/logout');
    } catch (err) {
      console.error('Admin logout error:', err);
    }
    localStorage.removeItem('adminAccessToken');
    localStorage.removeItem('admin');

    setAdmin(null);
    setTimeout(() => navigate('/admin/login'), 10);
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
