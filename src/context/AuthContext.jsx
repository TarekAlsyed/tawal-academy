import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
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
  const [user, setUser] = useState(() => {
    // Try to restore user from localStorage for offline mode
    const savedUser = localStorage.getItem('offline_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [admin, setAdmin] = useState(() => {
    // Try to restore admin from localStorage for offline mode
    const savedAdmin = localStorage.getItem('offline_admin');
    return savedAdmin ? JSON.parse(savedAdmin) : null;
  });
  // ⚡ CRITICAL FIX: If we have cached data, start with loading=false immediately
  // The user sees the cached UI instantly, auth verifies silently in background
  const hasCachedSession = !!(localStorage.getItem('offline_user') || localStorage.getItem('offline_admin'));
  const [loading, setLoading] = useState(!hasCachedSession);
  const navigate = useNavigate();

  const authAttempted = useRef(false);

  // Listen for unauthorized events from API interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setAdmin(null);
      localStorage.removeItem('offline_user');
      localStorage.removeItem('offline_admin');
    };
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    // ⚡ FAST AUTH: 5s timeout, and _noRetry flag that CANNOT be overridden by the request interceptor
    const AUTH_CHECK_CONFIG = { timeout: 5000, _noRetry: true };

    const checkAuth = async () => {
      if (authAttempted.current) return;
      authAttempted.current = true;

      // Skip online check if we're offline — use cached data
      if (!navigator.onLine) {
        const savedUser = localStorage.getItem('offline_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
        const savedAdmin = localStorage.getItem('offline_admin');
        if (savedAdmin) {
          setAdmin(JSON.parse(savedAdmin));
        }
        setLoading(false);
        return;
      }

      const currentHash = window.location.hash;
      const isAdminPath = currentHash.includes('/admin');

      try {
        if (isAdminPath) {
          // === Admin Path: Only check admin session ===
          const savedAdmin = localStorage.getItem('offline_admin');
          const adminLoginTime = localStorage.getItem('admin_login_time');
          
          try {
            const adminResponse = await api.get('/admin/profile', AUTH_CHECK_CONFIG);
            if (adminResponse.data.success) {
              const adminData = adminResponse.data.data.admin;
              setAdmin(adminData);
              localStorage.setItem('offline_admin', JSON.stringify(adminData));
              // Update login time on successful profile fetch
              if (!adminLoginTime) {
                localStorage.setItem('admin_login_time', Date.now().toString());
              }
            }
          } catch (err) {
            // Check if session expired (3 days)
            if (adminLoginTime) {
              const elapsed = Date.now() - parseInt(adminLoginTime);
              const threeDays = 3 * 24 * 60 * 60 * 1000;
              if (elapsed > threeDays) {
                // Session expired — clear everything
                localStorage.removeItem('offline_admin');
                localStorage.removeItem('admin_login_time');
                setAdmin(null);
              } else if (savedAdmin) {
                // Within 3 days — use cached data, the refresh token will handle re-auth
                setAdmin(JSON.parse(savedAdmin));
              }
            } else {
              // No login time recorded, clear admin data
              if (err.response?.status === 401) {
                localStorage.removeItem('offline_admin');
                setAdmin(null);
              }
            }
          }
        } else {
          // === Student Path: Only check student session ===
          try {
            const response = await api.get(API_ENDPOINTS.PROFILE, AUTH_CHECK_CONFIG);
            if (response.data.success) {
              const userData = response.data.data.user;
              setUser(userData);
              localStorage.setItem('offline_user', JSON.stringify(userData));
            }
          } catch (error) {
            if (error.response?.status === 401) {
              localStorage.removeItem('offline_user');
              setUser(null);
            }
            // For network errors, keep cached user if available
          }
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // ⚡ SAFETY NET: 4 seconds (was 15) — force loading screen to dismiss
    // If auth check takes longer, the cached data is already showing
    const safetyTimer = setTimeout(() => {
      setLoading((current) => {
        if (current) {
          console.warn('[Auth] Safety timeout (4s) — forcing loading screen to dismiss');
          return false;
        }
        return current;
      });
    }, 4000);

    return () => clearTimeout(safetyTimer);
  }, []);

  // Advanced Heartbeat & Activity Tracker (Presence Detection)
  useEffect(() => {
    if (!user) return;

    let heartbeatInterval;
    let idleTimeout;
    let isIdle = false;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    
    // Send heartbeat to server
    const sendHeartbeat = async () => {
      if (!isIdle && navigator.onLine) {
        try {
          await api.post('/auth/heartbeat', {}, { _noRetry: true, timeout: 5000 });
        } catch (error) {
          // Silent fail
        }
      }
    };

    // Reset idle status when user interacts
    const resetIdleTimer = () => {
      if (isIdle) {
        isIdle = false;
        sendHeartbeat(); // Immediate ping upon returning from idle
      }
      
      clearTimeout(idleTimeout);
      // Mark as idle if no interaction for 60 seconds
      idleTimeout = setTimeout(() => {
        isIdle = true;
      }, 60 * 1000);
    };

    // Handle tab switching
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isIdle = true; // Immediately idle when switching tabs or minimizing
      } else {
        resetIdleTimer(); // Active when returning
      }
    };

    // Setup listeners
    activityEvents.forEach(event => document.addEventListener(event, resetIdleTimer, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial state
    resetIdleTimer();
    sendHeartbeat();
    
    // Ping every 45 seconds ONLY if active
    heartbeatInterval = setInterval(sendHeartbeat, 45 * 1000);

    return () => {
      activityEvents.forEach(event => document.removeEventListener(event, resetIdleTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
      clearTimeout(idleTimeout);
    };
  }, [user]);

  // Student login
  const login = useCallback(async (name, email, autoLogin = false) => {
    try {
      const response = await studentLogin({ name, email, autoLogin });
      const { user: userData } = response.data.data;

      setUser(userData);
      localStorage.setItem('offline_user', JSON.stringify(userData));
      navigate('/terms');
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      
      let detailedMessage = error.response?.data?.message || 'فشل تسجيل الدخول';

      return {
        success: false,
        message: detailedMessage,
        status: error.response?.status
      };
    }
  }, [navigate]);

  // Admin login
  const adminLoginHandler = useCallback(async (email, password, mfaCode = null) => {
    try {
      const response = await adminLogin({ email, password, mfaCode });
      
      if (response.data.mfaRequired) {
        return { 
          success: true, 
          mfaRequired: true, 
          mfaToken: response.data.mfaToken 
        };
      }

      const { admin: adminData } = response.data.data;

      setAdmin(adminData);
      localStorage.setItem('offline_admin', JSON.stringify(adminData));
      localStorage.setItem('admin_login_time', Date.now().toString());
      navigate('/admin/dashboard');
      return { success: true };
    } catch (error) {
      console.error('Admin login failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'فشل تسجيل الدخول كمسؤول'
      };
    }
  }, [navigate]);

  // Student logout
  const logoutHandler = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
    localStorage.removeItem('offline_user');
    // Clear Capacitor token storage
    localStorage.removeItem('cap_access_token');
    localStorage.removeItem('cap_refresh_token');
    setTimeout(() => navigate('/login'), 10);
  }, [navigate]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const response = await api.get(API_ENDPOINTS.PROFILE);
      if (response.data.success) {
        const userData = response.data.data.user;
        setUser(userData);
        localStorage.setItem('offline_user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, []);

  // Admin logout
  const adminLogoutHandler = useCallback(async () => {
    try {
      await api.post('/admin/logout');
    } catch (err) {
      console.error('Admin logout error:', err);
    }
    setAdmin(null);
    localStorage.removeItem('offline_admin');
    localStorage.removeItem('admin_login_time');
    // Clear Capacitor token storage (same as student logout)
    localStorage.removeItem('cap_access_token');
    localStorage.removeItem('cap_refresh_token');
    setTimeout(() => navigate('/admin/login'), 10);
  }, [navigate]);

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
