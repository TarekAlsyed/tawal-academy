const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.login = async (req, res, next) => {
  try {
    const { name, email, autoLogin = false, otp } = req.body;
    const deviceId = req.deviceId || req.body.deviceId || req.headers['x-device-id'];
    const fingerprint = req.fingerprint || req.headers['x-fingerprint'];
    const userAgent = req.get('User-Agent');

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'الاسم والإيميل مطلوبان'
      });
    }

    // ✅ C-02 FIX: OTP verification (enabled via OTP_ENABLED env var)
    const isOtpEnabled = process.env.OTP_ENABLED === 'true';
    
    if (isOtpEnabled && !autoLogin) {
      const pool = require('../config/database');
      
      if (!otp) {
        // Step 1: Generate and send OTP
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await pool.query(
          `INSERT INTO otp_codes (email, code, expires_at, attempts)
           VALUES ($1, $2, $3, 0)
           ON CONFLICT ON CONSTRAINT uq_otp_email 
           DO UPDATE SET code = $2, expires_at = $3, attempts = 0`,
          [email, generatedOtp, otpExpiry]
        );

        // Send OTP via email (uses existing SMTP config if available)
        try {
          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          });

          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: email,
            subject: 'رمز التحقق - أكاديمية طوال',
            html: `<div dir="rtl" style="font-family:Arial;text-align:center;padding:20px">
              <h2>رمز التحقق الخاص بك</h2>
              <p style="font-size:32px;font-weight:bold;color:#4F46E5;letter-spacing:8px">${generatedOtp}</p>
              <p>صالح لمدة 10 دقائق</p>
            </div>`
          });
        } catch (mailErr) {
          console.error('OTP email send failed:', mailErr.message);
          // In development, log OTP to console as fallback
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV OTP] Code for ${email}: ${generatedOtp}`);
          }
        }

        return res.json({ success: true, otpRequired: true, message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' });
      }

      // Step 2: Verify OTP
      const otpResult = await pool.query(
        `SELECT * FROM otp_codes WHERE email = $1 AND code = $2 AND expires_at > NOW() AND attempts < 5`,
        [email, otp]
      );

      if (otpResult.rows.length === 0) {
        await pool.query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE email = $1`, [email]);
        return res.status(401).json({ success: false, message: 'رمز التحقق غير صحيح أو منتهي الصلاحية' });
      }

      // Delete OTP after successful verification
      await pool.query(`DELETE FROM otp_codes WHERE email = $1`, [email]);
    }

    // Check if user exists for autoLogin
    const userExists = await User.findByEmail(email);
    if (autoLogin && !userExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'الحساب غير موجود، يرجى تسجيل الدخول يدوياً لأول مرة',
        requireManualLogin: true 
      });
    }

    const user = await User.findOrCreate(name, email, deviceId, fingerprint, req.ip, userAgent);

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is not defined in environment variables');
      return res.status(500).json({
        success: false,
        message: 'JWT Secret configuration missing'
      });
    }

    // ✅ C-07 FIX: Use separate secrets for access vs refresh tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, ip: req.ip || req.connection.remoteAddress, type: 'access' },
      process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
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
      sameSite: 'none', // Required for cross-site (github.io -> alwaysdata.net)
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

    // ✅ M-07 FIX: Set deviceId cookie as httpOnly to prevent XSS theft
    res.cookie('deviceId', deviceId, {
      ...cookieOptions,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    // Detect if request is from Capacitor mobile app
    const isCapacitorClient = req.headers['x-platform'] === 'capacitor';

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
        accessToken,
        // SECURITY: Only send refreshToken in body for Capacitor (WebView can't access HttpOnly cookies)
        // On web, refreshToken is HttpOnly cookie only — never exposed to JavaScript
        ...(isCapacitorClient ? { refreshToken } : {})
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // If it's a known validation or security error, return 403 or 400
    if (error.message.includes('بريد') || error.message.includes('جهاز') || error.message.includes('حظر')) {
      return res.status(403).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: 'حدث خطأ في السيرفر، يرجى المحاولة لاحقاً' });
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    // Accept refresh token from cookies OR request body (Capacitor fallback)
    const refreshToken = req.cookies.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token not found' });
    }

    // ✅ C-07 FIX: Use separate refresh secret
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, ip: req.ip || req.connection.remoteAddress, type: 'access' },
      process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
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
  // ✅ M-12 FIX: clearCookie must use matching options (path, sameSite, secure) to actually delete
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  };
  res.clearCookie('accessToken', clearOptions);
  res.clearCookie('refreshToken', clearOptions);
  res.clearCookie('deviceId', clearOptions);
  res.json({
    success: true,
    message: 'تم تسجيل الخروج بنجاح'
  });
};

exports.heartbeat = async (req, res, next) => {
  const pool = require('../config/database');
  try {
    const userId = req.user.id;
    await pool.query('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
    res.json({ success: true });
  } catch (error) {
    // If column doesn't exist, log warning but don't try to ALTER TABLE at runtime
    // Schema changes should be handled by migration scripts only
    if (error.code === '42703') {
      console.warn('[HEARTBEAT] last_active_at column missing. Run migrations to fix.');
      return res.json({ success: true });
    }
    next(error);
  }
};
