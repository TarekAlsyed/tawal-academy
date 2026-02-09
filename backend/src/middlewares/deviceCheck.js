const DeviceDetector = require('device-detector-js');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');

const deviceDetector = new DeviceDetector();

const generateDeviceId = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const device = deviceDetector.parse(userAgent);
  
  const deviceInfo = {
    browser: device.client?.name || 'unknown',
    os: device.os?.name || 'unknown',
    device: device.device?.type || 'desktop',
    userAgent: userAgent
  };

  return `${deviceInfo.browser}-${deviceInfo.os}-${deviceInfo.device}-${uuidv4()}`;
};

const deviceCheckMiddleware = async (req, res, next) => {
  try {
    const deviceId = req.cookies.deviceId || req.headers['x-device-id'];

    if (!deviceId) {
      // جهاز جديد - إنشاء device ID
      const newDeviceId = generateDeviceId(req);
      res.cookie('deviceId', newDeviceId, {
        httpOnly: true,
        maxAge: 365 * 24 * 60 * 60 * 1000, // سنة
        sameSite: 'strict'
      });
      req.deviceId = newDeviceId;
      return next();
    }

    // التحقق من أن الجهاز غير محظور
    const blockedCheck = await pool.query(
      'SELECT id FROM blocked_list WHERE device_id = $1',
      [deviceId]
    );

    if (blockedCheck.rows.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'تم حظر هذا الجهاز. يرجى التواصل مع الإدارة'
      });
    }

    req.deviceId = deviceId;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { deviceCheckMiddleware, generateDeviceId };
