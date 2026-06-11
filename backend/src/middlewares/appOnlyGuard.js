/**
 * App-Only Middleware — يمنع الطلاب من الوصول عبر المتصفح العادي
 * يسمح فقط بالطلبات القادمة من تطبيق Capacitor (الأبلكيشن)
 * 
 * الكشف يتم عبر:
 * 1. هيدر X-Platform: 'capacitor' (يُضاف تلقائياً من الأبلكيشن)
 * 2. User-Agent يحتوي على نمط Capacitor WebView
 * 
 * ملاحظة: مسارات الأدمن مستثناة من هذا القيد
 */

const appOnlyGuard = (req, res, next) => {
  // Check if the request is from Capacitor app
  const platform = req.headers['x-platform'];
  const userAgent = req.get('User-Agent') || '';

  // Method 1: Check X-Platform header (set by api.jsx interceptor)
  const isCapacitorHeader = platform === 'capacitor';

  // Method 2: Check User-Agent for Android WebView patterns (backup detection)
  const isAndroidWebView = userAgent.includes('wv') && userAgent.includes('Android');
  const isElectronApp = userAgent.toLowerCase().includes('electron');

  // Method 3: Admin Preview bypass (super admin testing from browser)
  // Fix #22: Preview key moved to env var — no hardcoded secrets
  const adminPreviewKey = req.headers['x-admin-preview'];
  const isAdminPreview = process.env.ADMIN_PREVIEW_KEY && adminPreviewKey === process.env.ADMIN_PREVIEW_KEY;

  if (isCapacitorHeader || isAndroidWebView || isElectronApp || isAdminPreview) {
    return next(); // Allow — request is from the app or admin preview
  }

  // Block browser access for student routes
  return res.status(403).json({
    success: false,
    message: 'الوصول متاح فقط عبر تطبيق Tawal Academy. يرجى تحميل التطبيق.',
    appOnly: true,
    downloadUrl: 'https://www.mediafire.com/file/7xvb3e61ry8s4gl/Tawal-Academy.apk/file'
  });
};

module.exports = appOnlyGuard;
