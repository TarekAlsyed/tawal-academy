const pool = require('../config/database');

class StudentQuestion {
  static async create(userId, questionText) {
    const result = await pool.query(
      `INSERT INTO student_questions (user_id, question_text)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, questionText]
    );
    const question = result.rows[0];
    const remaining = await this.getRemainingQuestions(userId);
    return { question, remaining_questions: remaining };
  }

  static async reply(questionId, replyText, adminId) {
    const result = await pool.query(
      `UPDATE student_questions
       SET admin_reply = $1, replied_at = CURRENT_TIMESTAMP, replied_by = $2, is_replied = TRUE
       WHERE id = $3
       RETURNING *`,
      [replyText, adminId, questionId]
    );
    return result.rows[0];
  }

  static async findByUser(userId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM student_questions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  static async findAll(isReplied = null, limit = 50, offset = 0) {
    let query = `
      SELECT sq.*, u.name as user_name, u.email as user_email
      FROM student_questions sq
      JOIN users u ON sq.user_id = u.id
    `;
    const params = [];
    if (isReplied !== null) {
      query += ` WHERE sq.is_replied = $1`;
      params.push(isReplied);
    }
    query += ` ORDER BY sq.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async listPending(limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT sq.*, u.name as user_name, u.email as user_email
       FROM student_questions sq
       JOIN users u ON sq.user_id = u.id
       WHERE sq.is_replied = FALSE
       ORDER BY sq.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  static async countUnanswered() {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM student_questions WHERE is_replied = FALSE'
    );
    return parseInt(result.rows[0].count);
  }

  static async getRemainingQuestions(userId) {
    // سياسة: السماح بـ 5 أسئلة شهرياً لكل مستخدم
    const MONTHLY_LIMIT = 5;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    // احسب عدد أسئلة هذا الشهر للمستخدم
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM student_questions
       WHERE user_id = $1
         AND EXTRACT(MONTH FROM created_at) = $2
         AND EXTRACT(YEAR FROM created_at) = $3`,
      [userId, month, year]
    );
    const used = parseInt(result.rows[0].count);
    return Math.max(MONTHLY_LIMIT - used, 0);
  }

  static async delete(id) {
    await pool.query('DELETE FROM student_questions WHERE id = $1', [id]);
    return true;
  }
}

module.exports = StudentQuestion;
