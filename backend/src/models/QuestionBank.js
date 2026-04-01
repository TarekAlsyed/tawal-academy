const pool = require('../config/database');

class QuestionBank {
  static async create({ subject_id, question_text, type, options, correct_answer, explanation, difficulty_level, tags, created_by }) {
    // التحقق من وجود السؤال مسبقاً في نفس المادة بنفس النص
    const existing = await pool.query(
      'SELECT id FROM question_bank WHERE subject_id = $1 AND question_text = $2',
      [subject_id, question_text]
    );

    if (existing.rows.length > 0) {
      throw new Error('هذا السؤال موجود بالفعل في بنك الأسئلة لهذه المادة');
    }

    const result = await pool.query(
      `INSERT INTO question_bank (subject_id, question_text, type, options, correct_answer, explanation, difficulty_level, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [subject_id, question_text, type, JSON.stringify(options || {}), correct_answer, explanation, difficulty_level, JSON.stringify(tags || []), created_by]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM question_bank WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM question_bank';
    const values = [];
    const conditions = [];

    if (filters.subject_id) {
      conditions.push(`subject_id = $${values.length + 1}`);
      values.push(filters.subject_id);
    }

    if (filters.type) {
      conditions.push(`type = $${values.length + 1}`);
      values.push(filters.type);
    }

    if (filters.difficulty_level) {
      conditions.push(`difficulty_level = $${values.length + 1}`);
      values.push(filters.difficulty_level);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];
    let i = 1;

    for (const key of Object.keys(updates)) {
      const val = (key === 'options' || key === 'tags') ? JSON.stringify(updates[key]) : updates[key];
      fields.push(`${key} = $${i}`);
      values.push(val);
      i++;
    }
    values.push(id);
    const result = await pool.query(
      `UPDATE question_bank SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM question_bank WHERE id = $1', [id]);
    return true;
  }

  static async deleteAll() {
    await pool.query('DELETE FROM question_bank');
    return true;
  }

  // إضافة سؤال من البنك إلى امتحان (بالنسخ لضمان الظهور في النظام الحالي)
  static async addToExam(exam_id, question_bank_id, question_order = 0, points = 10) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. الحصول على بيانات السؤال من البنك
      const bankQ = await client.query('SELECT * FROM question_bank WHERE id = $1', [question_bank_id]);
      if (bankQ.rows.length === 0) {
        throw new Error('السؤال غير موجود في البنك');
      }
      const q = bankQ.rows[0];

      // 2. التحقق مما إذا كان السؤال مضافاً بالفعل لهذا الامتحان (لتجنب التكرار)
      const existing = await client.query(
        'SELECT id FROM questions WHERE exam_id = $1 AND question_bank_id = $2',
        [exam_id, question_bank_id]
      );

      if (existing.rows.length > 0) {
        throw new Error('هذا السؤال مضاف بالفعل لهذا الامتحان');
      }

      // 3. نسخ السؤال إلى جدول questions الخاص بالامتحان
      // أضفنا حقل question_bank_id لجدول questions لسهولة التتبع ومنع التكرار
      try {
        await client.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_bank_id INTEGER`);
      } catch (alterErr) {
        console.log('Column question_bank_id might already exist or table is being modified');
      }

      const result = await client.query(
        `INSERT INTO questions (exam_id, question_text, type, options, correct_answer, explanation, question_order, points, question_bank_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [exam_id, q.question_text, q.type, q.options, q.correct_answer, q.explanation, question_order, points, question_bank_id]
      );

      // 4. تسجيل الارتباط في جدول الربط أيضاً للتوافق المستقبلي
      await client.query(
        `INSERT INTO exam_questions (exam_id, question_bank_id, question_order, points)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (exam_id, question_bank_id) DO UPDATE SET question_order = $3, points = $4`,
        [exam_id, question_bank_id, question_order, points]
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

  // الحصول على أسئلة امتحان من البنك
  static async findByExam(exam_id) {
    const result = await pool.query(
      `SELECT qb.*, eq.question_order, eq.points 
       FROM question_bank qb
       JOIN exam_questions eq ON qb.id = eq.question_bank_id
       WHERE eq.exam_id = $1
       ORDER BY eq.question_order ASC`,
      [exam_id]
    );
    return result.rows;
  }
}

module.exports = QuestionBank;
