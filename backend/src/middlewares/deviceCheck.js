const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const deviceCheck = async (req, res, next) => {
  try {
    const deviceId = req.header('X-Device-Id') || req.header('X-Device-ID') || req.cookies.deviceId;
    const fingerprint = req.header('X-Fingerprint');
    const userAgent = req.get('User-Agent') || '';

    // ROOT FIX: Disable mandatory Device ID check for mobile browsers 
    // to prevent "Server Error" caused by cookie/header blocking on Android
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    if (!deviceId && !isMobile) {
      return res.status(401).json({
        success: false,
        message: 'معرف الجهاز مطلوب للوصول للمنصة'
      });
    }

    // Check if device or fingerprint is blocked (only if they exist)
    if (deviceId || fingerprint) {
      const blockedCheck = await pool.query(
        `SELECT reason FROM blocked_list 
         WHERE ((device_id = $1 AND device_id IS NOT NULL) 
         OR (fingerprint = $2 AND fingerprint IS NOT NULL) 
         OR ip_address = $3)
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
         LIMIT 1`,
        [deviceId, fingerprint, req.ip]
      );

      if (blockedCheck.rows.length > 0) {
        return res.status(403).json({
          success: false,
          message: blockedCheck.rows[0].reason || 'هذا الجهاز محظور أمنياً. يرجى التواصل مع الإدارة'
        });
      }
    }

    // Attach to request for later use in controllers
    req.deviceId = deviceId || `mobile-auto-${Date.now()}`;
    req.fingerprint = fingerprint;
    req.isMobile = isMobile;
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = deviceCheck;
