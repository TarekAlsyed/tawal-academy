const pool = require('../config/database');
const bcrypt = require('bcryptjs');

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

      // تشفير كلمة المرور
      const hashedPassword = await bcrypt.hash(password, 10);

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
  static async login(email, password) {
    const result = await pool.query(
      'SELECT * FROM admins WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('الإيميل أو كلمة المرور غير صحيحة');
    }

    const admin = result.rows[0];

    // التحقق من كلمة المرور
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      throw new Error('الإيميل أو كلمة المرور غير صحيحة');
    }

    // إرجاع البيانات بدون كلمة المرور
    const { password: _, ...adminData } = admin;
    return adminData;
  }

  // الحصول على مشرف بالـ ID
  static async findById(adminId) {
    const result = await pool.query(
      'SELECT id, name, email, permissions, is_super_admin, created_at FROM admins WHERE id = $1',
      [adminId]
    );
    return result.rows[0];
  }

  // تحديث صلاحيات مشرف
  static async updatePermissions(adminId, permissions) {
    const result = await pool.query(
      `UPDATE admins 
       SET permissions = $1 
       WHERE id = $2 
       RETURNING id, name, email, permissions, is_super_admin`,
      [JSON.stringify(permissions), adminId]
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
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

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

  // الحصول على جميع المشرفين
  static async findAll() {
    const result = await pool.query(
      'SELECT id, name, email, permissions, is_super_admin, created_at FROM admins ORDER BY created_at DESC'
    );
    return result.rows;
  }

  // حذف مشرف
  static async delete(adminId) {
    await pool.query('DELETE FROM admins WHERE id = $1', [adminId]);
    return true;
  }

  // تسجيل نشاط المشرف
  static async logActivity(adminId, action, details = {}, ipAddress = null) {
    await pool.query(
      `INSERT INTO activity_log (admin_id, action, details, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [adminId, action, JSON.stringify(details), ipAddress]
    );
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
