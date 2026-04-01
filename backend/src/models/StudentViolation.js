const pool = require('../config/database');

class StudentViolation {
  static async create(userId, examId, violationType, description, evidenceUrl, severity, reportedBy, actionTaken) {
    const result = await pool.query(
      `INSERT INTO student_violations (user_id, exam_id, violation_type, description, evidence_url, severity, reported_by, action_taken)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, examId, violationType, description, evidenceUrl, severity, reportedBy, actionTaken]
    );
    return result.rows[0];
  }

  static async findByUser(userId) {
    const result = await pool.query(`
      SELECT sv.*, u.name as student_name, e.name as exam_name, a.name as reporter_name
      FROM student_violations sv
      LEFT JOIN users u ON sv.user_id = u.id
      LEFT JOIN exams e ON sv.exam_id = e.id
      LEFT JOIN admins a ON sv.reported_by = a.id
      WHERE sv.user_id = $1
      ORDER BY sv.created_at DESC
    `, [userId]);
    return result.rows;
  }

  static async findAll() {
    const result = await pool.query(`
      SELECT sv.*, u.name as student_name, e.name as exam_name, a.name as reporter_name
      FROM student_violations sv
      LEFT JOIN users u ON sv.user_id = u.id
      LEFT JOIN exams e ON sv.exam_id = e.id
      LEFT JOIN admins a ON sv.reported_by = a.id
      ORDER BY sv.created_at DESC
    `);
    return result.rows;
  }

  static async updateAction(id, actionTaken) {
    const result = await pool.query(
      'UPDATE student_violations SET action_taken = $1 WHERE id = $2 RETURNING *',
      [actionTaken, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM student_violations WHERE id = $1', [id]);
    return true;
  }
}

module.exports = StudentViolation;
