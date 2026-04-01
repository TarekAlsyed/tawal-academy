const pool = require('../config/database');

class SecurityScan {
  static async create({ scanType, target, findings = {}, threatLevel = 'low', durationMs = 0, status = 'completed' }) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO security_scans (scan_type, target, findings, threat_level, duration_ms, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [scanType, target, JSON.stringify(findings), threatLevel, durationMs, status]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async findAll({ limit = 100, offset = 0, threatLevel = null } = {}) {
    let query = `SELECT * FROM security_scans WHERE 1=1`;
    const params = [];

    if (threatLevel) {
      params.push(threatLevel);
      query += ` AND threat_level = $${params.length}`;
    }

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    query += ` ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async getStats() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_scans,
        COALESCE(SUM(CASE WHEN threat_level IN ('high', 'critical') THEN 1 ELSE 0 END), 0) as high_threat_scans,
        MAX(created_at) as last_scan_at,
        (SELECT COUNT(*) FROM security_audit_logs WHERE created_at > NOW() - INTERVAL '24 hours') as penetration_attempts_24h
      FROM security_scans
    `);
    return result.rows[0];
  }

  static async resolve(id) {
    const result = await pool.query(
      `UPDATE security_scans SET status = 'resolved' WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }
}

module.exports = SecurityScan;
