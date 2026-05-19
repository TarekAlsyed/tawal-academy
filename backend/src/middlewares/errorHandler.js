const SystemError = require('../models/SystemError');
const notificationSender = require('../utils/notificationSender');
const multer = require('multer');

const errorHandler = async (err, req, res, next) => {
  // تسجيل الخطأ للمطورين دائماً
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // تسجيل الخطأ في قاعدة البيانات (24/7 Monitoring)
  try {
    const isCritical = err.status >= 500 || !err.status;
    
    // تصنيف المكون المتأثر
    let component = 'API';
    if (req.path.startsWith('/api/admin')) component = 'Admin Panel';
    if (req.path.startsWith('/api/auth')) component = 'Auth System';
    if (err.name?.includes('Database') || err.code?.startsWith('23')) component = 'Database';

    const errorDetails = {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      params: req.params,
      query: req.query,
      body: undefined, // Never store request body in error logs (may contain passwords/tokens)
      status: err.status,
      requestId: req.headers['x-request-id'],
      headers: {
        host: req.get('host'),
        origin: req.get('origin'),
        referer: req.get('referer')
      }
    };

    const savedError = await SystemError.create({
      errorType: err.name || (err.code ? `DB_ERROR_${err.code}` : 'API_ERROR'),
      message: err.message || 'خطأ غير معروف في الـ API',
      stackTrace: err.stack,
      component,
      severity: isCritical ? 'critical' : 'medium',
      impactLevel: isCritical ? 'partial' : 'low',
      userId: req.user ? req.user.id : null,
      adminId: req.admin ? req.admin.id : null,
      details: errorDetails
    });

    // إرسال تنبيه فوري إذا كان الخطأ حرجاً أو تكرر كثيراً
    if (isCritical || (savedError && savedError.repetition_count > 10)) {
      await notificationSender.sendAdminAlert(
        `خطأ ${isCritical ? 'حرج' : 'متكرر'}: ${err.message}`,
        isCritical ? 'critical' : 'high',
        {
          errorId: savedError?.id,
          component,
          path: req.path,
          repetitionCount: savedError?.repetition_count,
          errorType: err.name
        }
      );
    }
  } catch (logErr) {
    console.error('Failed to log error to DB:', logErr.message);
  }

  // معالجة أخطاء التحقق والتكرار
  if (err.name === 'ValidationError' || err.code === '23502') {
    return res.status(400).json({
      success: false,
      message: 'بيانات غير صالحة أو ناقصة'
    });
  }

  if (err.code === '23505') {
    // محاولة استخراج الحقل المكرر إذا أمكن
    let message = 'هذه البيانات موجودة مسبقاً (مكررة)';
    if (err.detail && err.detail.includes('subject_id') && err.detail.includes('level')) {
      message = 'يوجد امتحان بالفعل بهذا المستوى لهذه المادة. يرجى اختيار مستوى آخر.';
    }
    
    return res.status(400).json({
      success: false,
      message
    });
  }

  // معالجة أخطاء الصلاحيات
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      success: false,
      message: 'غير مصرح لك بالوصول أو انتهت الجلسة'
    });
  }

  // معالجة أخطاء الملفات
  if (err instanceof multer.MulterError) {
    let message = 'حدث خطأ أثناء رفع الملف';
    if (err.code === 'LIMIT_FILE_SIZE') message = 'حجم الملف كبير جداً (الحد الأقصى 500 ميجا)';
    if (err.code === 'LIMIT_FILE_COUNT') message = 'عدد الملفات المرفوعة كبير جداً';
    if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'حقل غير متوقع في رفع الملفات';

    return res.status(400).json({
      success: false,
      message
    });
  }

  // الخطأ الافتراضي
  const status = err.status || 500;
  
  // في بيئة الإنتاج، نظهر رسالة عامة فقط للأخطاء الحقيقية في السيرفر (500)
  // أما الأخطاء الأخرى (400, 401, 403, 404) فيجب أن تظهر رسالتها الأصلية
  const message = (process.env.NODE_ENV === 'production' && status >= 500)
    ? 'حدث خطأ في السيرفر، يرجى المحاولة لاحقاً' 
    : err.message || 'حدث خطأ في السيرفر';

  res.status(status).json({
    success: false,
    message
  });
};

module.exports = errorHandler;
