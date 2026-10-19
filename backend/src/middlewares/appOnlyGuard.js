/**
 * App-Only Middleware — يمنع الطلاب من الوصول عبر المتصفح العادي
 * يسمح فقط بالطلبات القادمة من تطبيق Capacitor (الأبلكيشن)
 * 
 * الكشف يتم عبر:
 * 1. هيدر X-Platform: 'capacitor' (يُضاف تلقائياً من الأبلكيشن)
 * 2. User-Agent يحتوي على نمط Capacitor WebView
 * 
 * ملاحظة: مسارات الأدمن مستثناة من هذا القيد
 * 
 * SECURITY FIX: Re-enabled app-only protection.
 * All student API requests must come from the official app (X-Platform: capacitor)
 * or be sent from an allowed web origin (GitHub Pages for testing).
 */

const appOnlyGuard = (req, res, next) => {
  const path = (req.path || '').toLowerCase();
  const method = (req.method || '').toUpperCase();

  // Always allow OPTIONS (CORS preflight)
  if (method === 'OPTIONS') return next();

  // Allow health checks and monitoring
  if (path === '/health' || path.includes('/api/health') || path.includes('/monitoring/')) {
    return next();
  }

  // Admin routes: always allowed (admin has own authentication)
  if (path.includes('/admin/') || path.includes('/admin')) {
    return next();
  }

  // Auth routes: allow login/register/refresh (public endpoints)
  if (path.includes('/auth/login') || path.includes('/auth/register') || path.includes('/refresh-token') || path.includes('/csrf-token')) {
    return next();
  }

  const platform = req.headers['x-platform'] || '';
  const userAgent = req.get('User-Agent') || '';

  // Check if request comes from Capacitor native app
  const isCapacitorPlatform = platform.toLowerCase() === 'capacitor';

  // Check if User-Agent matches known Capacitor/WebView patterns
  const isCapacitorUserAgent = /Capacitor|capacitor/i.test(userAgent) ||
    /wv\)/i.test(userAgent) || // Android WebView
    /Android.*Version\/[\d.]+.*Chrome/i.test(userAgent); // Android WebView pattern

  // Allow GitHub Pages web origin (for development/testing/admin access from browser)
  const origin = req.headers['origin'] || '';
  const isAllowedWebOrigin = 
    origin.includes('tarekalsyed.github.io') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1');

  if (isCapacitorPlatform || isCapacitorUserAgent || isAllowedWebOrigin) {
    return next();
  }

  // Reject unauthorized clients
  return res.status(403).json({
    success: false,
    message: 'هذه الخدمة متاحة فقط عبر التطبيق الرسمي'
  });
};

module.exports = appOnlyGuard;
