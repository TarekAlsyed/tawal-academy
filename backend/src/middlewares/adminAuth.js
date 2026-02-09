const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const adminAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies.adminToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح لك بالدخول. يرجى تسجيل الدخول كمشرف'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, name, email, permissions, is_super_admin FROM admins WHERE id = $1',
      [decoded.adminId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'المشرف غير موجود'
      });
    }

    const admin = result.rows[0];

    req.admin = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      permissions: admin.permissions,
      isSuperAdmin: admin.is_super_admin
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'جلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى'
      });
    }

    next(error);
  }
};

// Middleware للتحقق من صلاحية معينة
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (req.admin.isSuperAdmin) {
      return next();
    }

    if (!req.admin.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية للقيام بهذا الإجراء'
      });
    }

    next();
  };
};

module.exports = { adminAuthMiddleware, checkPermission };
