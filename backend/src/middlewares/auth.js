const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const settingsService = require('../services/settingsService');
const { decrypt } = require('../utils/encryption');

const auth = async (req, res, next) => {
  try {
    // Check Maintenance Mode
    const isMaintenanceMode = await settingsService.get('system_maintenance_mode', false);
    if (isMaintenanceMode) {
      return res.status(503).json({ 
        success: false, 
        message: 'المنصة حالياً في وضع الصيانة. يرجى المحاولة لاحقاً.',
        maintenance: true
      });
    }

    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح لك بالوصول، يرجى تسجيل الدخول'
      });
    }

    // Fix #23: Check if token is blacklisted
    const blacklisted = await pool.query('SELECT 1 FROM token_blacklist WHERE token = $1', [token]);
    if (blacklisted.rows.length > 0) {
      return res.status(401).json({ success: false, message: 'توكن منتهي الصلاحية (تم تسجيل الخروج)' });
    }

    // ✅ C-07 FIX: Use separate student access token secret with fallback
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET);
    
    if (!decoded.userId || decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'توكن غير صالح أو منتهي الصلاحية'
      });
    }

    // Elite Session Binding (IP & Device)
    const currentIp = req.ip || req.connection.remoteAddress;
    if (decoded.ip && decoded.ip !== currentIp) {
        console.warn(`[SECURITY] Session Binding Alert: Token IP ${decoded.ip} vs Current ${currentIp}`);
        // We log but allow for now to handle mobile network changes
    }

    const userResult = await pool.query(
      'SELECT id, name, email, device_id, is_blocked FROM users WHERE id = $1',
      [decoded.userId]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    if (user.is_blocked) {
      return res.status(403).json({
        success: false,
        message: 'هذا الحساب محظور'
      });
    }

    // Device check (Highly Secure)
    const deviceId = req.headers['x-device-id'] || req.cookies.deviceId;
    
    if (user.device_id) {
      const decryptedUserDeviceId = decrypt(user.device_id);
      
      // If decryption failed (key rotation or corruption), log but don't block
      if (decryptedUserDeviceId === null) {
        console.warn(`[AUTH WARNING] Failed to decrypt device_id for user ${user.id}. Possible key rotation.`);
      } else if (deviceId && decryptedUserDeviceId !== deviceId) {
        return res.status(403).json({
          success: false,
          message: 'هذا الحساب مرتبط بجهاز آخر'
        });
      }
    }

    req.user = user;
    req.deviceId = deviceId;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً'
    });
  }
};

module.exports = auth;
