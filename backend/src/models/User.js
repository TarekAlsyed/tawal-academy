const pool = require('../config/database');
const { validateEmail } = require('../utils/emailValidator');

class User {
  // تسجيل أو تسجيل دخول مستخدم
  static async findOrCreate(name, email, deviceId) {
    const client = await pool.connect();
    
    try {
      // التحقق من صحة الإيميل
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.message);
      }

      await client.query('BEGIN');

      // التحقق من أن الإيميل غير محظور
      const blockedEmailCheck = await client.query(
        'SELECT id FROM blocked_list WHERE email = $1',
        [email]
      );

      if (blockedEmailCheck.rows.length > 0) {
        throw new Error('هذا الإيميل محظور. يرجى التواصل مع الإدارة');
      }

      // التحقق من أن الجهاز غير محظور
      const blockedDeviceCheck = await client.query(
        'SELECT id FROM blocked_list WHERE device_id = $1',
        [deviceId]
      );

      if (blockedDeviceCheck.rows.length > 0) {
        throw new Error('هذا الجهاز محظور. يرجى التواصل مع الإدارة');
      }

      // البحث عن المستخدم
      const existingUser = await client.query(
        'SELECT * FROM users WHERE email = $1 AND device_id = $2',
        [email, deviceId]
      );

      let user;

      if (existingUser.rows.length > 0) {
        // تحديث آخر تسجيل دخول
        const updateResult = await client.query(
          `UPDATE users 
           SET last_login = CURRENT_TIMESTAMP 
           WHERE id = $1 
           RETURNING *`,
          [existingUser.rows[0].id]
        );
        user = updateResult.rows[0];
      } else {
        // إنشاء مستخدم جديد
        const insertResult = await client.query(
          `INSERT INTO users (name, email, device_id, last_login)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           RETURNING *`,
          [name, email, deviceId]
        );
        user = insertResult.rows[0];
      }

      await client.query('COMMIT');
      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // الحصول على مستخدم بالـ ID
  static async findById(userId) {
    const result = await pool.query(
      'SELECT id, name, email, total_points, registration_date, last_login FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  }

  // الحصول على جميع المستخدمين
  static async findAll(limit = 100, offset = 0) {
    const result = await pool.query(
      `SELECT id, name, email, total_points, registration_date, last_login, is_blocked
       FROM users
       ORDER BY total_points DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  // الحصول على الترتيب (Leaderboard)
  static async getLeaderboard(limit = 10) {
    const result = await pool.query(
      `SELECT id, name, total_points
       FROM users
       WHERE is_blocked = FALSE
       ORDER BY total_points DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  // الحصول على ترتيب مستخدم معين
  static async getUserRank(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) + 1 as rank
       FROM users
       WHERE total_points > (SELECT total_points FROM users WHERE id = $1)
       AND is_blocked = FALSE`,
      [userId]
    );
    return result.rows[0]?.rank || 0;
  }

  // حظر مستخدم
  static async blockUser(userId, reason, blockedBy) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // الحصول على بيانات المستخدم
      const userResult = await client.query(
        'SELECT email, device_id FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('المستخدم غير موجود');
      }

      const user = userResult.rows[0];

      // تحديث حالة المستخدم
      await client.query(
        'UPDATE users SET is_blocked = TRUE, blocked_reason = $1 WHERE id = $2',
        [reason, userId]
      );

      // إضافة إلى قائمة المحظورين
      await client.query(
        `INSERT INTO blocked_list (email, device_id, reason, blocked_by)
         VALUES ($1, $2, $3, $4)`,
        [user.email, user.device_id, reason, blockedBy]
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

  // إلغاء حظر مستخدم
  static async unblockUser(userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        'SELECT email, device_id FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('المستخدم غير موجود');
      }

      const user = userResult.rows[0];

      await client.query(
        'UPDATE users SET is_blocked = FALSE, blocked_reason = NULL WHERE id = $1',
        [userId]
      );

      await client.query(
        'DELETE FROM blocked_list WHERE email = $1 OR device_id = $2',
        [user.email, user.device_id]
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

  // حذف مستخدم
  static async deleteUser(userId) {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    return true;
  }

  // البحث عن مستخدمين
  static async search(searchTerm) {
    const result = await pool.query(
      `SELECT id, name, email, total_points, registration_date, is_blocked
       FROM users
       WHERE name ILIKE $1 OR email ILIKE $1
       ORDER BY total_points DESC
       LIMIT 50`,
      [`%${searchTerm}%`]
    );
    return result.rows;
  }

  // عدد المستخدمين
  static async count() {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  }
}

module.exports = User;
