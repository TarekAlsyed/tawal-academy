const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt } = require('../utils/encryption');

class Admin {
  // إنشاء مشرف جديد
  static async create(name, email, password, permissions = {}, isSuperAdmin = false) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // التحقق من عدم وجود المشرف
      const existingAdmin = await client.query(
        'SELECT id FROM admins WHERE email = $1',
        [email]
      );

      if (existingAdmin.rows.length > 0) {
        throw new Error('المشرف موجود بالفعل');
      }

      // تشفير كلمة المرور (Elite Defense: 12 rounds)
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
        `INSERT INTO admins (name, email, password, permissions, is_super_admin)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, permissions, is_super_admin, created_at`,
        [name, email, hashedPassword, JSON.stringify(defaultPermissions), isSuperAdmin]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // تسجيل دخول المشرف
  static async login(email, password, ipAddress = null) {
    const result = await pool.query(
      'SELECT * FROM admins WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Record failed attempt for IP if possible (to prevent general brute force)
      throw new Error('الإيميل أو كلمة المرور غير صحيحة');
    }

    const admin = result.rows[0];

    // 1. التحقق من حالة الحظر
    if (admin.is_blocked || (admin.blocked_until && new Date(admin.blocked_until) > new Date())) {
      const remainingTime = admin.blocked_until ? Math.ceil((new Date(admin.blocked_until) - new Date()) / 60000) : null;
      throw new Error(`هذا الحساب محظور أمنياً بسبب محاولات دخول فاشلة متكررة. ${remainingTime ? `يرجى المحاولة بعد ${remainingTime} دقيقة.` : 'يرجى التواصل مع المدير العام.'}`);
    }

    // 2. التحقق من كلمة المرور
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      // 3. تحديث محاولات الدخول الفاشلة
      const newFailedAttempts = (admin.failed_attempts || 0) + 1;
      let updateQuery = 'UPDATE admins SET failed_attempts = $1, last_failed_attempt = CURRENT_TIMESTAMP WHERE id = $2';
      let params = [newFailedAttempts, admin.id];

      // حظر تلقائي بعد 5 محاولات فاشلة
      if (newFailedAttempts >= 5) {
        const blockedUntil = new Date(Date.now() + 30 * 60000); // 30 mins ban
        updateQuery = 'UPDATE admins SET failed_attempts = $1, last_failed_attempt = CURRENT_TIMESTAMP, blocked_until = $2 WHERE id = $3';
        params = [newFailedAttempts, blockedUntil, admin.id];
        
        // سجل واقعة أمنية في السجلات
        await pool.query(
          `INSERT INTO activity_log (admin_id, action_type, details, ip_address)
           VALUES ($1, $2, $3, $4)`,
          [admin.id, 'SECURITY_BAN', JSON.stringify({ reason: 'Multiple failed login attempts', attempts: newFailedAttempts }), ipAddress]
        );
      }

      await pool.query(updateQuery, params);
      throw new Error('الإيميل أو كلمة المرور غير صحيحة');
    }

    // 4. إعادة تعيين محاولات الدخول الفاشلة عند النجاح
    if (admin.failed_attempts > 0) {
      await pool.query(
        'UPDATE admins SET failed_attempts = 0, last_failed_attempt = NULL, blocked_until = NULL WHERE id = $1',
        [admin.id]
      );
    }

    // فك تشفير MFA Secret إذا وجد
    if (admin.mfa_secret) {
      admin.mfa_secret = decrypt(admin.mfa_secret);
    }

    // إرجاع البيانات بدون كلمة المرور
    const { password: _, ...adminData } = admin;
    return adminData;
  }

  // الحصول على مشرف بالـ ID
  static async findById(adminId) {
    const result = await pool.query(
      'SELECT id, name, email, permissions, permissions_detailed, is_super_admin, mfa_enabled, mfa_secret, created_at FROM admins WHERE id = $1',
      [adminId]
    );
    const admin = result.rows[0];
    if (admin && admin.mfa_secret) {
      admin.mfa_secret = decrypt(admin.mfa_secret);
    }
    return admin;
  }

  static async updateMFA(adminId, enabled, secret = null) {
    // تشفير MFA Secret قبل الحفظ
    const encryptedSecret = secret ? encrypt(secret) : null;
    
    const result = await pool.query(
      'UPDATE admins SET mfa_enabled = $1, mfa_secret = COALESCE($2, mfa_secret) WHERE id = $3 RETURNING id, mfa_enabled',
      [enabled, encryptedSecret, adminId]
    );
    return result.rows[0];
  }

  // الحصول على جميع المشرفين
  static async findAll() {
    const result = await pool.query(
      'SELECT id, name, email, permissions, permissions_detailed, is_super_admin, created_at FROM admins ORDER BY created_at DESC'
    );
    return result.rows;
  }

  // تحديث صلاحيات مشرف
  static async updatePermissions(adminId, permissions, permissionsDetailed = null) {
    const result = await pool.query(
      `UPDATE admins 
       SET permissions = $1, permissions_detailed = $2 
       WHERE id = $3 
       RETURNING id, name, email, permissions, permissions_detailed, is_super_admin`,
      [JSON.stringify(permissions), permissionsDetailed ? JSON.stringify(permissionsDetailed) : null, adminId]
    );
    return result.rows[0];
  }

  // تغيير كلمة المرور
  static async changePassword(adminId, oldPassword, newPassword) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const adminResult = await client.query(
        'SELECT password FROM admins WHERE id = $1',
        [adminId]
      );

      if (adminResult.rows.length === 0) {
        throw new Error('المشرف غير موجود');
      }

      const admin = adminResult.rows[0];

      // التحقق من كلمة المرور القديمة
      const isOldPasswordValid = await bcrypt.compare(oldPassword, admin.password);

      if (!isOldPasswordValid) {
        throw new Error('كلمة المرور القديمة غير صحيحة');
      }

      // تشفير كلمة المرور الجديدة
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      await client.query(
        'UPDATE admins SET password = $1 WHERE id = $2',
        [hashedNewPassword, adminId]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // حذف مشرف
  static async delete(adminId) {
    await pool.query('DELETE FROM admins WHERE id = $1', [adminId]);
    return true;
  }

  // تسجيل نشاط المشرف
  static async logActivity(adminId, action, details = {}, ipAddress = null) {
    const ActivityLog = require('./ActivityLog');
    return await ActivityLog.create({ adminId, action, details, ipAddress });
  }

  // الحصول على سجل نشاط المشرف
  static async getActivityLog(adminId = null, limit = 50) {
    let query = `
      SELECT al.*, a.name as admin_name, a.email as admin_email
      FROM activity_log al
      JOIN admins a ON al.admin_id = a.id
    `;
    const params = [];

    if (adminId) {
      query += ' WHERE al.admin_id = $1';
      params.push(adminId);
    }

    query += ' ORDER BY al.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = Admin;
