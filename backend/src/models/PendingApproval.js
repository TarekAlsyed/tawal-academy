const pool = require('../config/database');

class PendingApproval {
  // Create new approval request
  static async create(adminId, actionType, entityType, entityData) {
    const result = await pool.query(
      `INSERT INTO pending_approvals 
       (admin_id, action_type, entity_type, entity_data, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [adminId, actionType, entityType, JSON.stringify(entityData)]
    );
    return result.rows[0];
  }

  // Find all requests
  static async findAll(status = null) {
    let query = `
      SELECT 
        pa.*,
        a.name as admin_name,
        a.email as admin_email,
        ra.name as reviewed_by_name
      FROM pending_approvals pa
      LEFT JOIN admins a ON pa.admin_id = a.id
      LEFT JOIN admins ra ON pa.reviewed_by = ra.id
    `;

    const params = [];
    if (status && status !== 'all') {
      query += ` WHERE pa.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY pa.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows.map(row => {
      const data = row.entity_data || row.request_data;
      return {
        ...row,
        entity_data: typeof data === 'string' ? JSON.parse(data) : data
      };
    });
  }

  // Find requests by admin
  static async findByAdmin(adminId) {
    const result = await pool.query(
      `SELECT * FROM pending_approvals 
       WHERE admin_id = $1 
       ORDER BY created_at DESC`,
      [adminId]
    );
    return result.rows.map(row => {
      const data = row.entity_data || row.request_data;
      return {
        ...row,
        entity_data: typeof data === 'string' ? JSON.parse(data) : data
      };
    });
  }

  // Approve request
  static async approve(approvalId, reviewerId) {
    const result = await pool.query(
      `UPDATE pending_approvals 
       SET status = 'approved',
           reviewed_by = $1,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [reviewerId, approvalId]
    );
    
    const approval = result.rows[0];
    if (!approval) return null;
    
    const data = approval.entity_data || approval.request_data;
    return {
      ...approval,
      entity_data: typeof data === 'string' ? JSON.parse(data) : data
    };
  }

  // Reject request
  static async reject(approvalId, reviewerId, reason) {
    const result = await pool.query(
      `UPDATE pending_approvals 
       SET status = 'rejected',
           reviewed_by = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           rejection_reason = $2
       WHERE id = $3
       RETURNING *`,
      [reviewerId, reason, approvalId]
    );
    return result.rows[0];
  }

  // Delete request
  static async delete(id) {
    await pool.query('DELETE FROM pending_approvals WHERE id = $1', [id]);
    return true;
  }
}

module.exports = PendingApproval;
