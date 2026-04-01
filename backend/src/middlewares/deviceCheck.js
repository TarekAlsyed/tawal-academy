const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const deviceCheck = async (req, res, next) => {
  try {
    let deviceId = req.header('X-Device-Id') || req.header('X-Device-ID') || req.cookies.deviceId;

    if (!deviceId) {
      deviceId = uuidv4();
      res.cookie('deviceId', deviceId, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'none',
        secure: true
      });
    }

    const blockedCheck = await pool.query(
      'SELECT id FROM blocked_list WHERE device_id = $1',
      [deviceId]
    );

    if (blockedCheck.rows.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'هذا الجهاز محظور. يرجى التواصل مع الإدارة'
      });
    }

    req.deviceId = deviceId;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = deviceCheck;
