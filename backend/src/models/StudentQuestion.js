const pool = require('../config/database');

class StudentQuestion {
  static async create(userId, questionText) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO student_questions (user_id, question_text)
         VALUES ($1, $2)
         RETURNING *`,
        [userId, questionText]
      );

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      await client.query(
        `UPDATE users 
         SET questions_count = questions_count + 1,
             last_question_month = $1,
             last_question_year = $2
         WHERE id = $3`,
        [currentMonth, currentYear, userId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async canAskQuestion(userId) {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const result = await pool.query(
      `SELECT questions_count, last_question_month, last_question_year
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) return false;

    const user = result.rows[0];
    
    if (user.last_question_month !== currentMonth || user.last_question_year !== currentYear) {
      await pool.query(
        'UPDATE users SET questions_count = 0 WHERE id = $1',
        [userId]
      );
      return true;
    }

    return user.questions_count < 3;
  }

  static async getRemainingQuestions(userId) {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const result = await pool.query(
      `SELECT questions_count, last_question_month, last_question_year
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) return 3;

    const user = result.rows[0];
    
    if (user.last_question_month !== currentMonth || user.last_question_year !== currentYear) {
      return 3;
    }

    return Math.max(0, 3 - user.questions_count);
  }

  static async findByUserId(userId) {
    const result = await pool.query(
      `SELECT id, question_text, admin_reply, is_replied, replied_at, created_at
       FROM student_questions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async findAll(status = 'all', limit = 50, offset = 0) {
    const limitInt = parseInt(limit) || 50;
    const offsetInt = parseInt(offset) || 0;

    let query = `
      SELECT 
        sq.id,
        sq.question_text,
        sq.admin_reply,
        sq.is_replied,
        sq.replied_at,
        sq.created_at,
        u.name as student_name,
        u.email as student_email
      FROM student_questions sq
      JOIN users u ON sq.user_id = u.id
    `;

    const params = [];
    
    if (status === 'pending') {
      query += ' WHERE sq.is_replied = FALSE';
    } else if (status === 'replied') {
      query += ' WHERE sq.is_replied = TRUE';
    }

    // Add LIMIT and OFFSET parameters
    // Note: params array index starts at 0, so $1 corresponds to params[0]
    // Since we don't have other params yet, limit is $1 and offset is $2
    
    query += ' ORDER BY sq.created_at DESC LIMIT $1 OFFSET $2';
    params.push(limitInt, offsetInt);

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async reply(questionId, adminReply, adminId) {
    const result = await pool.query(
      `UPDATE student_questions
       SET admin_reply = $1,
           is_replied = TRUE,
           replied_at = CURRENT_TIMESTAMP,
           replied_by = $2
       WHERE id = $3
       RETURNING *`,
      [adminReply, adminId, questionId]
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM student_questions WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
}

module.exports = StudentQuestion;
