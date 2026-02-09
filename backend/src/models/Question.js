const pool = require('../config/database');

class Question {
  static async create(examId, questionText, type, options, correctAnswer, order = 0) {
    const result = await pool.query(
      `INSERT INTO questions (exam_id, question_text, type, options, correct_answer, question_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [examId, questionText, type, JSON.stringify(options || {}), correctAnswer, order]
    );
    return result.rows[0];
  }

  static async bulkCreate(examId, questions) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const created = [];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const res = await client.query(
          `INSERT INTO questions (exam_id, question_text, type, options, correct_answer, question_order)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [examId, q.questionText, q.type, JSON.stringify(q.options || {}), q.correctAnswer, q.order ?? i + 1]
        );
        created.push(res.rows[0]);
      }
      await client.query('COMMIT');
      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async createMany(examId, questions) {
    return this.bulkCreate(examId, questions);
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM questions WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findByExam(examId) {
    const result = await pool.query(
      'SELECT * FROM questions WHERE exam_id = $1 ORDER BY question_order ASC, id ASC',
      [examId]
    );
    return result.rows;
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];
    let i = 1;
    for (const key of Object.keys(updates)) {
      const val = key === 'options' ? JSON.stringify(updates[key]) : updates[key];
      fields.push(`${key} = $${i}`);
      values.push(val);
      i++;
    }
    values.push(id);
    const result = await pool.query(
      `UPDATE questions SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM questions WHERE id = $1', [id]);
    return true;
  }

  static async countByExam(examId) {
    const result = await pool.query('SELECT COUNT(*) AS count FROM questions WHERE exam_id = $1', [examId]);
    return parseInt(result.rows[0].count);
  }
}

module.exports = Question;
