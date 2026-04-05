const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');
const Session = require('../models/Session');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

exports.login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const { email, password, mfaCode } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'الإيميل وكلمة المرور مطلوبان' });
    }
    
    const admin = await Admin.login(email, password, req.ip || req.connection.remoteAddress);
    
    // Check if MFA is enabled
    if (admin.mfa_enabled) {
      if (!mfaCode) {
        // Return a temporary token for MFA verification
        const mfaToken = jwt.sign(
          { adminId: admin.id, isMfaPending: true },
          process.env.JWT_SECRET,
          { expiresIn: '5m' }
        );
        return res.json({ 
          success: true, 
          mfaRequired: true, 
          mfaToken,
          message: 'يرجى إدخال رمز التحقق (MFA)' 
        });
      }

      // Verify MFA code
      const verified = speakeasy.totp.verify({
        secret: admin.mfa_secret,
        encoding: 'base32',
        token: mfaCode
      });

      if (!verified) {
        return res.status(401).json({ success: false, message: 'رمز التحقق غير صحيح' });
      }
    }

    console.log('✅ Admin logged in:', admin.email);
    const tokenId = uuidv4();
    const accessToken = jwt.sign(
      { adminId: admin.id, email: admin.email, ip: req.ip || req.connection.remoteAddress, tokenId, type: 'access' }, 
      process.env.JWT_SECRET, 
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { adminId: admin.id, tokenId, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    // Create active session
    await Session.create({
        adminId: admin.id,
        tokenId,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
    });
    
    // تسجيل النشاط
    try {
      await Admin.logActivity(admin.id, 'admin_login', { mfa: admin.mfa_enabled, tokenId }, req.ip);
      
      // Elite Recovery: If this is a successful super admin login, 
      // automatically clear their IP from the blacklist if it was there
      if (admin.is_super_admin) {
        const ip = req.ip || req.connection.remoteAddress;
        if (ip) {
            const pool = require('../config/database');
            await pool.query('DELETE FROM ip_blacklist WHERE ip_address = $1', [ip]);
            console.log(`[Security Recovery] Super Admin IP ${ip} unblocked after successful login.`);
        }
      }
    } catch (logError) {
      console.error('⚠️ Failed to log activity or recovery:', logError.message);
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

    res.cookie('adminAccessToken', accessToken, { 
      ...cookieOptions,
      maxAge: 15 * 60 * 1000
    });

    res.cookie('adminRefreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({ 
      success: true, 
      message: 'تم تسجيل الدخول كمشرف', 
      data: { 
        admin: { 
          id: admin.id, 
          name: admin.name, 
          email: admin.email, 
          permissions: admin.permissions, 
          permissions_detailed: admin.permissions_detailed,
          is_super_admin: admin.is_super_admin,
          mfa_enabled: admin.mfa_enabled
        }, 
        accessToken 
      } 
    });
  } catch (error) {
    console.error('Admin login error:', error.message);
    if (error.message.includes('غير صحيحة')) {
      return res.status(401).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.adminRefreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token not found' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    const admin = await Admin.findById(decoded.adminId);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    // Check if session is still valid
    const session = await Session.findByTokenId(decoded.tokenId);
    if (!session || !session.is_active) {
      return res.status(401).json({ success: false, message: 'Session invalidated' });
    }

    const accessToken = jwt.sign(
      { adminId: admin.id, email: admin.email, ip: req.ip || req.connection.remoteAddress, tokenId: decoded.tokenId, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.cookie('adminAccessToken', accessToken, {
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

exports.setupMFA = async (req, res, next) => {
  try {
    const adminId = req.admin.id;
    const secret = speakeasy.generateSecret({
      name: `Tawal Academy Admin: ${req.admin.email}`
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      data: {
        qrCode: qrCodeUrl,
        secret: secret.base32
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.enableMFA = async (req, res, next) => {
  try {
    const { secret, code } = req.body;
    const adminId = req.admin.id;

    if (!secret || !code) {
      return res.status(400).json({ success: false, message: 'الرمز والسر مطلوبان' });
    }

    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: code
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: 'رمز التحقق غير صحيح' });
    }

    await Admin.updateMFA(adminId, true, secret);
    await Admin.logActivity(adminId, 'enable_mfa', {}, req.ip);

    res.json({
      success: true,
      message: 'تم تفعيل التحقق الثنائي بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

exports.disableMFA = async (req, res, next) => {
  try {
    const { code } = req.body;
    const adminId = req.admin.id;
    const admin = await Admin.findById(adminId);

    if (!admin.mfa_enabled) {
      return res.status(400).json({ success: false, message: 'التحقق الثنائي غير مفعل' });
    }

    const verified = speakeasy.totp.verify({
      secret: admin.mfa_secret,
      encoding: 'base32',
      token: code
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: 'رمز التحقق غير صحيح' });
    }

    await Admin.updateMFA(adminId, false);
    await Admin.logActivity(adminId, 'disable_mfa', {}, req.ip);

    res.json({
      success: true,
      message: 'تم إيقاف التحقق الثنائي بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.admin && req.admin.tokenPayload && req.admin.tokenPayload.tokenId) {
      const tokenId = req.admin.tokenPayload.tokenId;
      await Session.invalidate(tokenId);
      await Admin.logActivity(req.admin.id, 'admin_logout', { tokenId }, req.ip);
    }
    res.clearCookie('adminAccessToken');
    res.clearCookie('adminRefreshToken');
    res.json({ success: true, message: 'تم تسجيل الخروج' });
  } catch (error) {
    res.clearCookie('adminAccessToken');
    res.clearCookie('adminRefreshToken');
    res.json({ success: true, message: 'تم تسجيل الخروج' });
  }
};

exports.getActiveSessions = async (req, res, next) => {
  try {
    const adminId = req.admin.id;
    const isSuperAdmin = req.admin.is_super_admin === true || req.admin.is_super_admin === 'true';
    
    let sessions;
    if (isSuperAdmin) {
      sessions = await Session.findAllActive();
    } else {
      sessions = await Session.findActiveByAdmin(adminId);
    }
    
    res.json({ success: true, data: { sessions } });
  } catch (error) {
    next(error);
  }
};

exports.invalidateSession = async (req, res, next) => {
  try {
    const { tokenId } = req.params;
    const adminId = req.admin.id;
    const isSuperAdmin = req.admin.is_super_admin === true || req.admin.is_super_admin === 'true';
    
    // Security check: Ensure the session exists
    const session = await Session.findByTokenId(tokenId);
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'الجلسة غير موجودة أو منتهية بالفعل' });
    }

    // Allow Super Admin to invalidate any session, or admin to invalidate their own
    if (!isSuperAdmin && session.admin_id !== adminId) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بإلغاء هذه الجلسة' });
    }

    await Session.invalidate(tokenId);
    await Admin.logActivity(adminId, 'invalidate_session', { 
      tokenId, 
      targetAdminId: session.admin_id,
      isGlobalTermination: isSuperAdmin && session.admin_id !== adminId
    }, req.ip);

    res.json({ success: true, message: 'تم إلغاء الجلسة بنجاح' });
  } catch (error) {
    next(error);
  }
};

exports.invalidateOtherSessions = async (req, res, next) => {
  try {
    const adminId = req.admin.id;
    const currentTokenId = req.admin.tokenPayload.tokenId;
    const isSuperAdmin = req.admin.is_super_admin === true || req.admin.is_super_admin === 'true';

    if (isSuperAdmin) {
      // Super Admin can terminate ALL other sessions in the system
      await Session.invalidateAllExcept(currentTokenId);
      await Admin.logActivity(adminId, 'invalidate_all_sessions_global', { exceptTokenId: currentTokenId }, req.ip);
    } else {
      // Regular Admin only terminates their own other sessions
      await Session.invalidateAllButCurrent(adminId, currentTokenId);
      await Admin.logActivity(adminId, 'invalidate_other_sessions', { tokenId: currentTokenId }, req.ip);
    }

    res.json({ success: true, message: 'تم إلغاء جميع الجلسات الأخرى بنجاح' });
  } catch (error) {
    next(error);
  }
};

exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, permissions, permissionsDetailed } = req.body;
    // Elite Defense: Only a super admin can create another super admin
    let is_super_admin = false;
    if (req.admin.is_super_admin) {
        is_super_admin = req.body.is_super_admin !== undefined ? req.body.is_super_admin : req.body.isSuperAdmin;
    }
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'الاسم والإيميل وكلمة المرور مطلوبة' });
    }

    const client = await require('../config/database').connect();
    try {
      await client.query('BEGIN');

      // التحقق من عدم وجود المشرف
      const existingAdmin = await client.query('SELECT id FROM admins WHERE email = $1', [email]);
      if (existingAdmin.rows.length > 0) {
        throw new Error('المشرف موجود بالفعل');
      }

      // تشفير كلمة المرور (Elite Defense: 12 rounds)
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 12);

      // الصلاحيات الافتراضية
      const defaultPermissions = {
        subjects: true,
        exams: true,
        students: true,
        questions: true,
        stats: true,
        ...permissions
      };

      // إنشاء المشرف
      const result = await client.query(
        `INSERT INTO admins (name, email, password, permissions, permissions_detailed, is_super_admin)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, email, permissions, permissions_detailed, is_super_admin, created_at`,
        [
          name, 
          email, 
          hashedPassword, 
          JSON.stringify(defaultPermissions), 
          permissionsDetailed ? JSON.stringify(permissionsDetailed) : null,
          !!is_super_admin
        ]
      );

      await client.query('COMMIT');
      const admin = result.rows[0];
      await Admin.logActivity(req.admin.id, 'create_admin', { newAdminId: admin.id }, req.ip);
      res.status(201).json({ success: true, message: 'تم إنشاء المشرف', data: { admin } });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
};

exports.updatePermissions = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { permissions, permissionsDetailed } = req.body;
    
    // التحقق من أن المدير موجود
    const adminExists = await Admin.findById(adminId);
    if (!adminExists) {
      return res.status(404).json({ success: false, message: 'المدير غير موجود' });
    }

    // تجهيز الصلاحيات القديمة (للتوافق)
    const legacyPermissions = permissions || adminExists.permissions || {};
    
    // تجهيز الصلاحيات التفصيلية (الحفاظ على القديم إذا لم يتم إرسال الجديد)
    const newDetailedPermissions = permissionsDetailed !== undefined ? permissionsDetailed : adminExists.permissions_detailed;

    const admin = await Admin.updatePermissions(adminId, legacyPermissions, newDetailedPermissions);
    await Admin.logActivity(req.admin.id, 'update_admin_permissions', { adminId: adminId }, req.ip);
    
    res.json({ 
      success: true, 
      message: 'تم تحديث الصلاحيات بنجاح', 
      data: { admin } 
    });
  } catch (error) {
    next(error);
  }
};

// Get all admins
exports.getAllAdmins = async (req, res, next) => {
  try {
    const Admin = require('../models/Admin');
    
    const admins = await Admin.findAll();
    
    res.json({
      success: true,
      data: {
        admins
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update admin
exports.updateAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, permissions } = req.body;
    const is_super_admin = req.body.is_super_admin !== undefined ? req.body.is_super_admin : req.body.isSuperAdmin;
    const Admin = require('../models/Admin');

    // التحقق من أن المدير موجود
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'المدير غير موجود'
      });
    }

    // التحقق من عدم تغيير الإيميل لإيميل مستخدم بالفعل
    if (email && email !== admin.email) {
      const pool = require('../config/database');
      const existingAdmin = await pool.query(
        'SELECT id FROM admins WHERE email = $1 AND id != $2',
        [email, id]
      );

      if (existingAdmin.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'البريد الإلكتروني مستخدم بالفعل'
        });
      }
    }

    // تحديث البيانات
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (permissions !== undefined) updates.permissions = JSON.stringify(permissions);
    if (req.body.permissionsDetailed !== undefined) updates.permissions_detailed = JSON.stringify(req.body.permissionsDetailed);
    if (is_super_admin !== undefined) updates.is_super_admin = is_super_admin;

    const pool = require('../config/database');
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramIndex}`);
      values.push(updates[key]);
      paramIndex++;
    });

    values.push(id);

    const result = await pool.query(
      `UPDATE admins 
       SET ${fields.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING id, name, email, permissions, permissions_detailed, is_super_admin, created_at`,
      values
    );

    // تسجيل النشاط
    await Admin.logActivity(req.admin.id, 'update_admin', {
      adminId: id,
      updates: Object.keys(updates)
    });

    res.json({
      success: true,
      message: 'تم تحديث بيانات المدير بنجاح',
      data: {
        admin: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete admin
exports.deleteAdmin = async (req, res, next) => {
  const pool = require('../config/database');
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const Admin = require('../models/Admin');

    // التحقق من أن المدير موجود
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'المدير غير موجود'
      });
    }

    // منع حذف نفسه
    if (id === req.admin.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكنك حذف حسابك الخاص'
      });
    }

    // التحقق من وجود مديرين آخرين
    const adminsCount = await pool.query(
      'SELECT COUNT(*) as count FROM admins'
    );

    if (parseInt(adminsCount.rows[0].count) <= 1) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حذف آخر مدير في النظام'
      });
    }

    // البدء في المعاملة
    await client.query('BEGIN');

    // فك ارتباط المدير بالمواد التي أنشأها
    await client.query('UPDATE subjects SET created_by = NULL WHERE created_by = $1', [id]);
    
    // فك ارتباط المدير بالردود على الأسئلة
    await client.query('UPDATE student_questions SET replied_by = NULL WHERE replied_by = $1', [id]);
    
    // فك ارتباط المدير بقائمة المحظورين
    await client.query('UPDATE blocked_list SET blocked_by = NULL WHERE blocked_by = $1', [id]);

    // حذف المدير
    await client.query('DELETE FROM admins WHERE id = $1', [id]);

    // تسجيل النشاط
    await Admin.logActivity(req.admin.id, 'delete_admin', {
      deletedAdminId: id,
      deletedAdminName: admin.name,
      deletedAdminEmail: admin.email
    });

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'تم حذف المدير بنجاح'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// Toggle super admin
exports.toggleSuperAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isSuperAdmin } = req.body;
    const Admin = require('../models/Admin');
    const pool = require('../config/database');

    // التحقق من أن المدير موجود
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'المدير غير موجود'
      });
    }

    // منع تغيير صلاحيات نفسه
    if (id === req.admin.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكنك تغيير صلاحياتك الخاصة'
      });
    }

    // التحقق من وجود مدير عام واحد على الأقل
    if (admin.is_super_admin && !isSuperAdmin) {
      const superAdminsCount = await pool.query(
        'SELECT COUNT(*) as count FROM admins WHERE is_super_admin = true'
      );

      if (parseInt(superAdminsCount.rows[0].count) <= 1) {
        return res.status(400).json({
          success: false,
          message: 'يجب وجود مدير عام واحد على الأقل في النظام'
        });
      }
    }

    // تحديث الحالة
    const result = await pool.query(
      `UPDATE admins 
       SET is_super_admin = $1 
       WHERE id = $2 
       RETURNING id, name, email, permissions, is_super_admin, created_at`,
      [isSuperAdmin, id]
    );

    // تسجيل النشاط
    await Admin.logActivity(req.admin.id, 'toggle_super_admin', {
      adminId: id,
      newStatus: isSuperAdmin
    });

    res.json({
      success: true,
      message: isSuperAdmin 
        ? 'تم منح صلاحيات المدير العام بنجاح'
        : 'تم إلغاء صلاحيات المدير العام بنجاح',
      data: {
        admin: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
};
