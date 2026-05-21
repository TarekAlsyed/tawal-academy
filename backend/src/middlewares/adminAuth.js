const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const Admin = require('../models/Admin');
const Session = require('../models/Session');
const settingsService = require('../services/settingsService');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.adminAccessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'يرجى تسجيل الدخول كمشرف'
      });
    }

    // ✅ C-07 FIX: Use separate admin secret for verification
    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET);

    // 1. اكتشاف محاولات دخول الطلبة للوحة التحكم (Security Violation)
    if (decoded.userId && !decoded.adminId) {
      console.warn(`[SECURITY ALERT] Student ${decoded.email} attempted to access admin route ${req.path}`);
      
      // تسجيل انتهاك أمني للطالب
      await pool.query(
        `INSERT INTO student_violations (user_id, violation_type, severity, details, ip_address, device_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [decoded.userId, 'ADMIN_ACCESS_ATTEMPT', 'critical', JSON.stringify({ path: req.path, userAgent: req.get('User-Agent') }), req.ip, req.header('X-Device-Id')]
      );

      return res.status(403).json({
        success: false,
        message: 'محاولة وصول غير مصرح بها. لقد تم تسجيل هذا الإجراء أمنياً.'
      });
    }

    if (!decoded.adminId || decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'توكن غير صالح أو منتهي الصلاحية'
      });
    }

    const adminResult = await pool.query(
      'SELECT id, name, email, permissions, permissions_detailed, is_super_admin, mfa_enabled FROM admins WHERE id = $1',
      [decoded.adminId]
    );

    if (adminResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'المشرف غير موجود'
      });
    }

    const admin = adminResult.rows[0];

    // Mandatory MFA Check
    const isMandatoryMFA = await settingsService.get('security_mandatory_mfa', false);
    if (isMandatoryMFA && !admin.mfa_enabled && req.path !== '/mfa/setup' && req.path !== '/mfa/enable' && req.path !== '/logout') {
      return res.status(403).json({ 
        success: false, 
        message: 'يجب تفعيل التحقق الثنائي (MFA) للوصول إلى لوحة التحكم',
        requiresMFA: true
      });
    }

    // Session Validation (Elite Defense)
    if (decoded.tokenId && !decoded.is_system_execution) {
      const session = await Session.findByTokenId(decoded.tokenId);
      if (!session || !session.is_active) {
        return res.status(401).json({
          success: false,
          message: 'انتهت الجلسة أو تم تسجيل الخروج من جهاز آخر'
        });
      }
      // Update last activity
      await Session.updateActivity(decoded.tokenId);
    }

    // Admin Session Binding (Subnet-level IP Check - v2.2.0)
    // Allows minor IP changes (e.g., DHCP renewal within same subnet) while detecting network switches
    const currentIp = req.ip || req.connection.remoteAddress;
    if (decoded.ip && currentIp && !decoded.is_system_execution) {
        const isSameSubnet = (() => {
            try {
                // Handle IPv4-mapped IPv6 (::ffff:192.168.1.1 → 192.168.1.1)
                const normalizeIp = (ip) => ip.replace(/^::ffff:/, '');
                const ip1 = normalizeIp(decoded.ip);
                const ip2 = normalizeIp(currentIp);

                // IPv4: compare first 3 octets (xxx.xxx.xxx.*)
                if (ip1.includes('.') && ip2.includes('.')) {
                    const parts1 = ip1.split('.');
                    const parts2 = ip2.split('.');
                    return parts1[0] === parts2[0] && parts1[1] === parts2[1] && parts1[2] === parts2[2];
                }

                // IPv6: compare first 4 groups (/64 subnet)
                if (ip1.includes(':') && ip2.includes(':')) {
                    const groups1 = ip1.split(':').slice(0, 4).join(':');
                    const groups2 = ip2.split(':').slice(0, 4).join(':');
                    return groups1 === groups2;
                }

                // Mixed types — always fail
                return false;
            } catch (e) {
                return false;
            }
        })();

        if (!isSameSubnet) {
            console.warn(`[ADMIN SECURITY] Admin Token subnet mismatch: ${decoded.ip} != ${currentIp}`);
            return res.status(401).json({ 
              success: false, 
              message: 'انتهت الجلسة بسبب تغيير في الشبكة. يرجى الدخول مجدداً لأمان حسابك.' 
            });
        }
    }

    req.admin = admin;
    req.admin.tokenPayload = decoded;
    next();
  } catch (error) {
    console.error('[ADMIN AUTH ERROR]:', error.message);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'جلسة العمل منتهية. يرجى تسجيل الدخول مرة أخرى'
      });
    }

    res.status(500).json({
      success: false,
      message: 'حدث خطأ في المصادقة. يرجى المحاولة لاحقاً'
    });
  }
};

const checkPermission = (section, operation = 'view') => {
  return async (req, res, next) => {
    const admin = req.admin;
    
    // السماح بالتنفيذ المباشر إذا كان الطلب يحمل علامة تنفيذ النظام (من عملية الموافقة)
    if (admin.tokenPayload && admin.tokenPayload.is_system_execution) {
      return next();
    }
    
    // فحص صارم للمدير العام: مسموح له بكل شيء دائماً دون أي قيود
    if (admin.is_super_admin === true || admin.is_super_admin === 'true') {
      return next();
    }

    // التحقق من الصلاحيات الجديدة المفصلة للمدير المحدد حالياً
    let detailedPermissions = {};
    try {
      detailedPermissions = typeof admin.permissions_detailed === 'string'
        ? JSON.parse(admin.permissions_detailed)
        : admin.permissions_detailed || {};
    } catch (e) {
      detailedPermissions = {};
    }

    // فحص دقيق للصلاحية المطلوبة للقسم المحدد
    const permissionNode = detailedPermissions[section] && detailedPermissions[section][operation];
    
    let isAllowed = false;
    let requireApproval = false;

    // دعم التنسيق القديم (boolean) والتنسيق الجديد (object)
    if (permissionNode === true) {
        isAllowed = true;
    } else if (typeof permissionNode === 'object' && permissionNode !== null) {
        isAllowed = permissionNode.allowed === true;
        requireApproval = permissionNode.requireApproval === true;
    }

    if (isAllowed) {
        // إذا كان الطلب يتعلق بالصور أو ملفات PDF، نقوم بالتخطي مباشرة دون طلب موافقة (لتجنب تعطل الرفع السحابي)
        const isFileUploadRequest = 
            (req.originalUrl.includes('/images') || req.originalUrl.includes('/covers') || req.originalUrl.includes('/pdfs')) && 
            (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH');

        if (requireApproval && !isFileUploadRequest) {
            // اعتراض الطلب وحفظه في جدول الموافقات المعلقة
            try {
                const requestData = {
                    body: req.body,
                    params: req.params,
                    query: req.query,
                    method: req.method,
                    url: req.originalUrl,
                    files: req.files,
                    file: req.file
                };

                // تحديد معرف الهدف (Target ID) إن وجد
                let targetId = req.params.id || req.body.id || null;

                await pool.query(
                    `INSERT INTO pending_approvals 
                    (admin_id, action_type, entity_type, entity_data, status) 
                    VALUES ($1, $2, $3, $4, 'pending')`,
                    [
                        admin.id, 
                        `${section}.${operation}`, 
                        section, 
                        JSON.stringify({ ...requestData, targetId, admin_name: admin.name })
                    ]
                );

                return res.status(202).json({
                        success: true, // Changed to true so frontend displays success message
                        requireApproval: true,
                        message: 'تم تعليق الإجراء بانتظار موافقة المدير العام'
                    });

            } catch (err) {
                console.error('Error saving pending approval:', err);
                return res.status(500).json({ success: false, message: 'حدث خطأ أثناء معالجة طلب الموافقة' });
            }
        } else {
            return next();
        }
    }

    // التحقق من الصلاحيات القديمة (للتوافق مع العرض فقط ولضمان عدم التعطل)
    const oldPermissions = admin.permissions || {};
    if (operation === 'view' && oldPermissions[section]) {
      return next();
    }

    await Admin.logActivity(admin.id, 'permission_denied', { section, operation }, req.ip);
    return res.status(403).json({
      success: false,
      message: `ليس لديك صلاحية ${operation} في قسم ${section}`
    });
  };
};

module.exports = { adminAuth, checkPermission };
