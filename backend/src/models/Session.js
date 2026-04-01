const pool = require('../config/database');

class Session {
  static async create({ adminId, tokenId, ipAddress, userAgent }) {
    const result = await pool.query(
      `INSERT INTO sessions (admin_id, token_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [adminId, tokenId, ipAddress, userAgent]
    );
    return result.rows[0];
  }

  static async findActiveByAdmin(adminId) {
    const result = await pool.query(
      `SELECT s.*, a.name as admin_name, a.email as admin_email 
       FROM sessions s
       JOIN admins a ON s.admin_id = a.id
       WHERE s.admin_id = $1 AND s.is_active = TRUE 
       ORDER BY s.last_activity DESC`,
      [adminId]
    );
    return result.rows;
  }

  static async findAllActive() {
    const result = await pool.query(
      `SELECT s.*, a.name as admin_name, a.email as admin_email 
       FROM sessions s
       JOIN admins a ON s.admin_id = a.id
       WHERE s.is_active = TRUE 
       ORDER BY s.last_activity DESC`
    );
    return result.rows;
  }

  static async updateActivity(tokenId) {
    await pool.query(
      `UPDATE sessions SET last_activity = CURRENT_TIMESTAMP 
       WHERE token_id = $1 AND is_active = TRUE`,
      [tokenId]
    );
  }

  static async invalidate(tokenId) {
    await pool.query(
      `UPDATE sessions SET is_active = FALSE 
       WHERE token_id = $1`,
      [tokenId]
    );
  }

  static async invalidateAllButCurrent(adminId, currentTokenId) {
    await pool.query(
      `UPDATE sessions SET is_active = FALSE 
       WHERE admin_id = $1 AND token_id != $2`,
      [adminId, currentTokenId]
    );
  }

  static async invalidateAllExcept(currentTokenId) {
    await pool.query(
      `UPDATE sessions SET is_active = FALSE 
       WHERE token_id != $1`,
      [currentTokenId]
    );
  }

  static async findByTokenId(tokenId) {
    const result = await pool.query(
      `SELECT * FROM sessions WHERE token_id = $1 AND is_active = TRUE`,
      [tokenId]
    );
    return result.rows[0];
  }
}

module.exports = Session;