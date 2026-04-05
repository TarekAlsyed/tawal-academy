const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const deviceCheck = async (req, res, next) => {
  try {
    const deviceId = req.header('X-Device-Id') || req.header('X-Device-ID') || req.cookies.deviceId;
    const fingerprint = req.header('X-Fingerprint');

    if (!deviceId) {
      return res.status(401).json({
        success: false,
        message: 'معرف الجهاز مطلوب للوصول للمنصة'
      });
    }

    // Check if device or fingerprint is blocked
    const blockedCheck = await pool.query(
      `SELECT reason FROM blocked_list 
       WHERE (device_id = $1 OR (fingerprint = $2 AND fingerprint IS NOT NULL) OR ip_address = $3)
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

    // Attach to request for later use in controllers
    req.deviceId = deviceId;
    req.fingerprint = fingerprint;
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = deviceCheck;
