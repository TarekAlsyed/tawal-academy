const pool = require('../config/database');

class ActivityLog {
  static async create({ adminId, userId, action, details = {}, ipAddress = null }) {
    if (!adminId && !userId) {
      throw new Error('Either adminId or userId must be provided');
    }

    try {
      const result = await pool.query(
        `INSERT INTO activity_log (admin_id, user_id, action, details, ip_address)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [adminId || null, userId || null, action, JSON.stringify(details), ipAddress]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw error to avoid blocking the main operation if logging fails
      return null;
    }
  }

  static async findAll({ limit = 100, offset = 0, adminId = null, userId = null } = {}) {
    let query = `
      SELECT al.*, 
             a.name as admin_name,
             u.name as user_name
      FROM activity_log al
      LEFT JOIN admins a ON al.admin_id = a.id
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (adminId) {
      params.push(adminId);
      query += ` AND al.admin_id = $${params.length}`;
    }

    if (userId) {
      params.push(userId);
      query += ` AND al.user_id = $${params.length}`;
    }

    // Fixed params for limit and offset
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    query += ` ORDER BY al.created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = ActivityLog;
