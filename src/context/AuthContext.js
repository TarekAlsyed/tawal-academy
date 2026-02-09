import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

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

  useEffect(() => {
    // التحقق من وجود توكن عند تحميل التطبيق
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

    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const adminLogin = (adminData, token) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('admin', JSON.stringify(adminData));
    setAdmin(adminData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const adminLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    setAdmin(null);
  };

  const value = {
    user,
    admin,
    loading,
    login,
    adminLogin,
    logout,
    adminLogout,
    isAuthenticated: !!user,
    isAdminAuthenticated: !!admin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
