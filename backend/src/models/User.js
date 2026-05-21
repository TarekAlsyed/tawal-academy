const pool = require('../config/database');
const { validateEmail } = require('../utils/emailValidator');
const { encrypt } = require('../utils/encryption');

class User {
  static async findOrCreate(name, email, deviceId, fingerprint, ipAddress = null, userAgent = null) {
    const client = await pool.connect();
    
    try {
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.message);
      }

      await client.query('BEGIN');

      // 1. التحقق من الحظر الشامل
      const blockedCheck = await client.query(
        `SELECT reason FROM blocked_list 
         WHERE (email = $1 OR device_id = $2 OR (fingerprint = $3 AND fingerprint IS NOT NULL))
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
         LIMIT 1`,
        [email, deviceId, fingerprint]
      );

      if (blockedCheck.rows.length > 0) {
        throw new Error(blockedCheck.rows[0].reason || 'هذا الحساب أو الجهاز محظور أمنياً. يرجى التواصل مع الإدارة');
      }

      // 2. البحث عن المستخدم
      const existingUser = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      let user;
      
      // Encrypt deviceId for secure storage (matches decrypt in auth middleware)
      const encryptedDeviceId = deviceId ? encrypt(deviceId) : null;

      if (existingUser.rows.length > 0) {
        user = existingUser.rows[0];

        // 3. سياسة ربط الجهاز الصارمة (Zero Trust)
        // إذا كان المستخدم لديه بصمة جهاز مسجلة بالفعل، يجب أن تتطابق
        if (user.fingerprint && fingerprint && user.fingerprint !== fingerprint) {
          // تسجيل محاولة اختراق أو مشاركة حساب
          await client.query(
            `INSERT INTO student_violations (user_id, violation_type, severity, details, ip_address, device_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [user.id, 'DEVICE_MISMATCH', 'high', JSON.stringify({ oldFingerprint: user.fingerprint, newFingerprint: fingerprint, userAgent }), ipAddress, deviceId]
          );

          throw new Error('عذراً، هذا الحساب مرتبط بجهاز آخر. لا يمكن فتح الحساب من أكثر من جهاز في نفس الوقت لحماية خصوصيتك.');
        }

        // تحديث البيانات وآخر تسجيل دخول
        const updateResult = await client.query(
          `UPDATE users 
           SET device_id = $1, 
               fingerprint = COALESCE(fingerprint, $2),
               last_login = CURRENT_TIMESTAMP,
               last_ip = $3,
               last_user_agent = $4,
               failed_attempts = 0
           WHERE id = $5 
           RETURNING *`,
          [encryptedDeviceId, fingerprint, ipAddress, userAgent, user.id]
        );
        user = updateResult.rows[0];
      } else {
        // إنشاء مستخدم جديد وتسجيل بصمته لأول مرة
        const insertResult = await client.query(
          `INSERT INTO users (name, email, device_id, fingerprint, last_login, last_ip, last_user_agent)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)
           RETURNING *`,
          [name, email, encryptedDeviceId, fingerprint, ipAddress, userAgent]
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

  static async findById(userId) {
    const result = await pool.query(
      'SELECT id, name, email, total_points, registration_date, last_login FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await pool.query(
      'SELECT id, name, email, total_points FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  static async logActivity(userId, action, details, ipAddress) {
    const ActivityLog = require('./ActivityLog');
    try {
      await ActivityLog.create({
        userId,
        action,
        details,
        ipAddress
      });
    } catch (err) {
      console.error('Activity logging failed:', err.message);
    }
  }

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

  static async blockUser(userId, reason, blockedBy) {
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
        'UPDATE users SET is_blocked = TRUE, blocked_reason = $1 WHERE id = $2',
        [reason, userId]
      );

      await client.query(
        `INSERT INTO blocked_list (email, device_id, reason, blocked_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
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

  static async deleteUser(userId) {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    return true;
  }

  static async search(searchTerm) {
    // ✅ M-08 FIX: Validate and limit search term length
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length < 2) return [];
    const sanitizedTerm = searchTerm.trim().substring(0, 100);
    
    const result = await pool.query(
      `SELECT id, name, email, total_points, registration_date, is_blocked
       FROM users
       WHERE name ILIKE $1 OR email ILIKE $1
       ORDER BY total_points DESC
       LIMIT 50`,
      [`%${sanitizedTerm}%`]
    );
    return result.rows;
  }

  static async count() {
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  }
}

module.exports = User;
