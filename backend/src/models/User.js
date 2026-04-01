const pool = require('../config/database');
const { validateEmail } = require('../utils/emailValidator');
const { encrypt, decrypt } = require('../utils/encryption');

class User {
  static async findOrCreate(name, email, deviceId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Encrypt sensitive deviceId for DB storage
      const encryptedDeviceId = encrypt(deviceId);

      // التحقق من البريد الإلكتروني باستخدام emailValidator
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.message);
      }

      // التحقق إذا كان الجهاز محظوراً (Check by plain deviceId in blocked_list which stores plain IDs for speed)
      const blockedDeviceCheck = await client.query(
        "SELECT id FROM blocked_list WHERE device_id = $1",
        [deviceId]
      );
      if (blockedDeviceCheck.rows.length > 0) {
        throw new Error("هذا الجهاز محظور. يرجى التواصل مع الإدارة");
      }

      const existingUser = await client.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      let user;

      if (existingUser.rows.length > 0) {
        const userOnRecord = existingUser.rows[0];
        
        // Decrypt deviceId from DB to compare
        const decryptedDeviceId = decrypt(userOnRecord.device_id);

        // التحقق من الجهاز (Device Locking)
        if (userOnRecord.device_id && userOnRecord.device_id.trim() !== '' && deviceId && decryptedDeviceId !== deviceId) {
          throw new Error("هذا الحساب مرتبط بجهاز آخر. يرجى التواصل مع الإدارة");
        }

        // إذا كان المستخدم موجوداً، نقوم بتحديث بياناته
        if (!userOnRecord.device_id) {
          const updateResult = await client.query(
            `UPDATE users 
             SET last_login = CURRENT_TIMESTAMP, device_id = $1 
             WHERE email = $2 
             RETURNING *`,
            [encryptedDeviceId, email]
          );
          user = updateResult.rows[0];
        } else {
          // تحديث وقت آخر تسجيل دخول
          const updateResult = await client.query(
            `UPDATE users 
             SET last_login = CURRENT_TIMESTAMP 
             WHERE email = $1 
             RETURNING *`,
            [email]
          );
          user = updateResult.rows[0];
        }
      } else {
        // إذا لم يكن المستخدم موجوداً، نقوم بإنشاء مستخدم جديد
        const insertResult = await client.query(
          `INSERT INTO users (name, email, device_id, last_login)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           RETURNING *`,
          [name, email, encryptedDeviceId]
        );
        user = insertResult.rows[0];
      }
      await client.query("COMMIT");
      return user;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ Database error in findOrCreate:", error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(userId) {
    try {
      const result = await pool.query(
        `SELECT id, name, email, phone, device_id, total_points, registration_date, last_login, is_blocked,
                CASE WHEN is_blocked THEN 'blocked' ELSE 'active' END as status
         FROM users WHERE id = $1`,
        [userId]
      );
      const user = result.rows[0];
      if (user) {
          if (user.phone) user.phone = decrypt(user.phone);
          if (user.device_id) user.device_id = decrypt(user.device_id);
      }
      return user;
    } catch (error) {
      console.error(`[User.findById] Error for ID ${userId}:`, error.message);
      throw error;
    }
  }

  static async findAll(limit = 100, offset = 0) {
    try {
      const result = await pool.query(
        `SELECT id, name, email, phone, device_id, total_points, registration_date, last_login, is_blocked,
                CASE WHEN is_blocked THEN 'blocked' ELSE 'active' END as status
         FROM users
         ORDER BY total_points DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return result.rows.map(user => {
          if (user.phone) user.phone = decrypt(user.phone);
          if (user.device_id) user.device_id = decrypt(user.device_id);
          return user;
      });
    } catch (error) {
      console.error('[User.findAll] Error:', error.message);
      throw error;
    }
  }

  static async search(query) {
    try {
      const result = await pool.query(
        `SELECT id, name, email, phone, device_id, total_points, registration_date, last_login, is_blocked,
                CASE WHEN is_blocked THEN 'blocked' ELSE 'active' END as status
         FROM users
         WHERE name ILIKE $1 OR email ILIKE $1
         ORDER BY total_points DESC`,
        [`%${query}%`]
      );
      return result.rows.map(user => {
          if (user.phone) user.phone = decrypt(user.phone);
          if (user.device_id) user.device_id = decrypt(user.device_id);
          return user;
      });
    } catch (error) {
      console.error('[User.search] Error:', error.message);
      throw error;
    }
  }

  static async update(userId, updates) {
    const fields = [];
    const values = [];
    let i = 1;

    // Encrypt sensitive fields before saving
    if (updates.phone) updates.phone = encrypt(updates.phone);
    if (updates.device_id) updates.device_id = encrypt(updates.device_id);

    for (const key of Object.keys(updates)) {
      fields.push(`${key} = $${i}`);
      values.push(updates[key]);
      i++;
    }
    values.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    
    const user = result.rows[0];
    if (user) {
        if (user.phone) user.phone = decrypt(user.phone);
        if (user.device_id) user.device_id = decrypt(user.device_id);
    }
    return user;
  }

  static async updateDeviceId(userId, newDeviceId) {
    try {
      const encryptedDeviceId = encrypt(newDeviceId);
      await pool.query(
        'UPDATE users SET device_id = $1 WHERE id = $2',
        [encryptedDeviceId, userId]
      );
      return true;
    } catch (error) {
      console.error(`[User.updateDeviceId] Error for user ${userId}:`, error.message);
      throw error;
    }
  }

  static async logActivity(userId, action, details = {}, ipAddress = null) {
    const ActivityLog = require('./ActivityLog');
    return await ActivityLog.create({ userId, action, details, ipAddress });
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
    try {
      const result = await pool.query(
        `SELECT COUNT(*) + 1 as rank
         FROM users
         WHERE COALESCE(total_points, 0) > (SELECT COALESCE(total_points, 0) FROM users WHERE id = $1)
         AND is_blocked = FALSE`,
        [userId]
      );
      return result.rows[0]?.rank || 1;
    } catch (error) {
      console.error('[User.getUserRank] Error:', error.message);
      return 1; // Fallback to rank 1 instead of throwing
    }
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

      // Only block device if it exists
      if (user.device_id && user.device_id !== '') {
        await client.query(
          `INSERT INTO blocked_list (email, device_id, reason, blocked_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO UPDATE SET 
              device_id = EXCLUDED.device_id,
              reason = EXCLUDED.reason,
              blocked_by = EXCLUDED.blocked_by,
              blocked_at = CURRENT_TIMESTAMP`,
          [user.email, user.device_id, reason, blockedBy]
        );
      } else {
        // If no device_id, still block by email in blocked_list
        await client.query(
          `INSERT INTO blocked_list (email, device_id, reason, blocked_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO UPDATE SET 
              reason = EXCLUDED.reason,
              blocked_by = EXCLUDED.blocked_by,
              blocked_at = CURRENT_TIMESTAMP`,
          [user.email, null, reason, blockedBy]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in blockUser model:', error);
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

      // Cleanup blocked_list for this user (both email and device)
      await client.query(
        'DELETE FROM blocked_list WHERE email = $1',
        [user.email]
      );

      if (user.device_id && user.device_id !== '') {
        await client.query(
          'DELETE FROM blocked_list WHERE device_id = $1',
          [user.device_id]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in unblockUser model:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async blockDevice(deviceId, reason, blockedBy) {
    await pool.query(
      `INSERT INTO blocked_list (device_id, reason, blocked_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (device_id) DO UPDATE SET 
          reason = EXCLUDED.reason,
          blocked_by = EXCLUDED.blocked_by,
          blocked_at = CURRENT_TIMESTAMP`,
      [deviceId, reason, blockedBy]
    );
    return true;
  }

  static async unblockDevice(deviceId) {
    await pool.query(
      'DELETE FROM blocked_list WHERE device_id = $1',
      [deviceId]
    );
    return true;
  }

  static async resetDevice(userId) {
    await pool.query(
      'UPDATE users SET device_id = NULL WHERE id = $1',
      [userId]
    );
    return true;
  }

  static async deleteUser(userId) {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    return true;
  }

  static async search(searchTerm) {
    try {
      const result = await pool.query(
        `SELECT id, name, email, phone, device_id, total_points, registration_date, is_blocked,
                CASE WHEN is_blocked THEN 'blocked' ELSE 'active' END as status
         FROM users
         WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1
         ORDER BY total_points DESC
         LIMIT 50`,
        [`%${searchTerm}%`]
      );
      return result.rows;
    } catch (error) {
      console.error('[User.search] Error:', error.message);
      throw error;
    }
  }

  static async count() {
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM users');
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('[User.count] Error:', error.message);
      throw error;
    }
  }
}

module.exports = User;
