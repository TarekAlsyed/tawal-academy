const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.login = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const deviceId = req.deviceId || req.body.deviceId || req.headers['x-device-id'] || `device-${Date.now()}`;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'الاسم والإيميل مطلوبان'
      });
    }

    const user = await User.findOrCreate(name, email, deviceId);

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not defined in environment variables');
      return res.status(500).json({
        success: false,
        message: 'JWT Secret configuration missing'
      });
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, ip: req.ip || req.connection.remoteAddress, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // تسجيل نشاط الطالب
    try {
      await User.logActivity(user.id, 'student_login', { deviceId }, req.ip);
    } catch (logError) {
      console.error('⚠️ Failed to log student activity:', logError.message);
    }

    // Cookie Security Options (Elite Defense)
    const cookieOptions = {
      httpOnly: true, // Prevent XSS access
      secure: true, // ALWAYS secure in production/staging for HTTPS
      sameSite: 'strict', // Strong CSRF protection
      path: '/' // Ensure cookie is accessible globally
    };

    if (process.env.NODE_ENV !== 'production') {
        cookieOptions.secure = false;
        cookieOptions.sameSite = 'lax';
    }

    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('deviceId', deviceId, {
      ...cookieOptions,
      httpOnly: false, // Accessible by JS to be sent in headers if needed
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          totalPoints: user.total_points || 0
        },
        accessToken
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);

    // Handle specific errors with appropriate status codes
    if (error.message.includes("البريد الإلكتروني غير صالح") || error.message.includes("يجب استخدام بريد Gmail فقط") || error.message.includes("صيغة البريد الإلكتروني غير صحيحة")) {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (error.message.includes("محظور") || error.message.includes("جهاز آخر")) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token not found' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, ip: req.ip || req.connection.remoteAddress, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/'
    });

    res.json({ success: true, accessToken });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Session expired' });
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    const rank = await User.getUserRank(userId);

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          rank
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.user) {
      await User.logActivity(req.user.id, 'student_logout', {}, req.ip);
    }
  } catch (error) {
    console.error('Logout log error', error);
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({
    success: true,
    message: 'تم تسجيل الخروج بنجاح'
  });
};
