const pool = require('../config/database');
const crypto = require('crypto');

class SystemError {
  static async create({ errorType, message, stackTrace = null, component = null, severity = 'medium', impactLevel = 'low', userId = null, adminId = null, details = {} }) {
    const client = await pool.connect();
    try {
      // Create a hash to identify unique errors (message + component + errorType)
      const errorHash = crypto.createHash('md5').update(`${errorType}-${message}-${component}`).digest('hex');

      // Check if this error already exists and is not resolved
      const existing = await client.query(
        `SELECT id FROM system_errors WHERE error_hash = $1 AND is_resolved = FALSE LIMIT 1`,
        [errorHash]
      );

      if (existing.rows.length > 0) {
        // Update existing error
        const result = await client.query(
          `UPDATE system_errors 
           SET repetition_count = repetition_count + 1, 
               last_occurrence = CURRENT_TIMESTAMP,
               details = $1,
               user_id = COALESCE($2, user_id),
               admin_id = COALESCE($3, admin_id)
           WHERE id = $4
           RETURNING *`,
          [JSON.stringify(details), userId, adminId, existing.rows[0].id]
        );
        return result.rows[0];
      }

      // Create new error
      const result = await client.query(
        `INSERT INTO system_errors (error_type, message, stack_trace, component, severity, impact_level, user_id, admin_id, details, error_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [errorType, message, stackTrace, component, severity, impactLevel, userId, adminId, JSON.stringify(details), errorHash]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async findAll({ limit = 100, offset = 0, severity = null, isResolved = null, search = null } = {}) {
    let query = `
      SELECT se.*, 
             u.name as user_name,
             a.name as admin_name,
             ra.name as resolved_by_name
      FROM system_errors se
      LEFT JOIN users u ON se.user_id = u.id
      LEFT JOIN admins a ON se.admin_id = a.id
      LEFT JOIN admins ra ON se.resolved_by = ra.id
      WHERE 1=1
    `;
    const params = [];

    if (severity) {
      params.push(severity);
      query += ` AND se.severity = $${params.length}`;
    }

    if (isResolved !== null) {
      params.push(isResolved);
      query += ` AND se.is_resolved = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (se.message ILIKE $${params.length} OR se.error_type ILIKE $${params.length} OR se.component ILIKE $${params.length})`;
    }

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    query += ` ORDER BY se.last_occurrence DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async resolve(id, adminId) {
    const result = await pool.query(
      `UPDATE system_errors 
       SET is_resolved = TRUE, resolved_at = CURRENT_TIMESTAMP, resolved_by = $1 
       WHERE id = $2 
       RETURNING *`,
      [adminId, id]
    );
    return result.rows[0];
  }

  static async resolveAll(adminId) {
    const result = await pool.query(
      `UPDATE system_errors 
       SET is_resolved = TRUE, resolved_at = CURRENT_TIMESTAMP, resolved_by = $1 
       WHERE is_resolved = FALSE 
       RETURNING COUNT(*) as count`,
      [adminId]
    );
    return result.rows[0];
  }

  static async getStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_errors,
        COALESCE(SUM(CASE WHEN is_resolved = FALSE THEN 1 ELSE 0 END), 0) as active_errors,
        COALESCE(SUM(CASE WHEN severity = 'critical' AND is_resolved = FALSE THEN 1 ELSE 0 END), 0) as critical_errors,
        COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END), 0) as last_24h_errors
      FROM system_errors
    `);
    return result.rows[0];
  }
}

module.exports = SystemError;
