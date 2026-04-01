const pool = require('../config/database');

class Question {
  static async create(examId, questionText, type, options, correctAnswer, order = 0, explanation = null) {
    const result = await pool.query(
      `INSERT INTO questions (exam_id, question_text, type, options, correct_answer, question_order, explanation)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [examId, questionText, type, JSON.stringify(options || {}), correctAnswer, order, explanation]
    );
    return result.rows[0];
  }

  static async bulkCreate(examId, questions) {
    if (!questions || questions.length === 0) return [];
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const created = [];
      
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        
        // التحقق من الحقول الأساسية
        const questionText = q.question_text || q.questionText;
        const correctAnswer = q.correct_answer || q.correctAnswer;
        const explanation = q.explanation || null;
        const type = q.type || 'multiple';
        
        if (!questionText) {
          throw new Error(`الصف ${i + 1}: نص السؤال مفقود`);
        }
        
        // Handle options mapping if coming from frontend flat structure
        let options = q.options || {};
        if (q.option_a || q.option_b || q.option_c || q.option_d) {
          options = {
            a: q.option_a || '',
            b: q.option_b || '',
            c: q.option_c || '',
            d: q.option_d || ''
          };
        }

        const res = await client.query(
          `INSERT INTO questions (exam_id, question_text, type, options, correct_answer, question_order, explanation)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            examId, 
            questionText, 
            type, 
            JSON.stringify(options), 
            correctAnswer, 
            q.question_order || q.order || i + 1,
            explanation
          ]
        );
        created.push(res.rows[0]);
      }
      await client.query('COMMIT');
      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in bulkCreate:', error);
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

    // Handle options mapping if coming from frontend flat structure
    if (
      updates.option_a !== undefined || 
      updates.option_b !== undefined || 
      updates.option_c !== undefined || 
      updates.option_d !== undefined
    ) {
      const existing = await this.findById(id);
      const existingOptions = typeof existing.options === 'string' ? JSON.parse(existing.options) : (existing.options || {});
      
      updates.options = {
        ...existingOptions,
        a: updates.option_a !== undefined ? updates.option_a : existingOptions.a,
        b: updates.option_b !== undefined ? updates.option_b : existingOptions.b,
        c: updates.option_c !== undefined ? updates.option_c : existingOptions.c,
        d: updates.option_d !== undefined ? updates.option_d : existingOptions.d
      };
      
      delete updates.option_a;
      delete updates.option_b;
      delete updates.option_c;
      delete updates.option_d;
    }

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
