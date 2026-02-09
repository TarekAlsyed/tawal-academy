const pool = require('../config/database');

class Exam {
  static async update(examId, updates) {
    const fields = [];
    const values = [];
    let i = 1;
    for (const key of Object.keys(updates)) {
      fields.push(`${key} = $${i}`);
      values.push(updates[key]);
      i++;
    }
    values.push(examId);
    const result = await pool.query(
      `UPDATE exams SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(examId) {
    await pool.query('DELETE FROM exams WHERE id = $1', [examId]);
    return true;
  }

  static async getStats(examId) {
    const stats = {};
    const totalAttemptsRes = await pool.query('SELECT COUNT(*) as count FROM exam_attempts WHERE exam_id = $1', [examId]);
    const avgScoreRes = await pool.query('SELECT AVG(score) as avg FROM exam_attempts WHERE exam_id = $1', [examId]);
    const passRateRes = await pool.query('SELECT AVG(CASE WHEN passed THEN 1 ELSE 0 END) as rate FROM exam_attempts WHERE exam_id = $1', [examId]);
    stats.total_attempts = parseInt(totalAttemptsRes.rows[0].count);
    stats.average_score = parseFloat(avgScoreRes.rows[0].avg || 0).toFixed(2);
    stats.pass_rate = parseFloat(passRateRes.rows[0].rate || 0).toFixed(2);
    return stats;
  }
  // إنشاء امتحان جديد
  static async create(subjectId, level, name, status, openAt, closeAt, passPercentage) {
    const result = await pool.query(
      `INSERT INTO exams (subject_id, level, name, status, open_at, close_at, pass_percentage)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [subjectId, level, name, status, openAt, closeAt, passPercentage]
    );
    return result.rows[0];
  }

  // الحصول على امتحان بالـ ID
  static async findById(examId) {
    const result = await pool.query(
      `SELECT e.*, s.name as subject_name, s.term_id
       FROM exams e
       JOIN subjects s ON e.subject_id = s.id
       WHERE e.id = $1`,
      [examId]
    );
    return result.rows[0];
  }

  // الحصول على امتحان مع أسئلته (عشوائية)
  static async findByIdWithQuestions(examId, userId = null) {
    const client = await pool.connect();
    
    try {
      // الامتحان
      const examResult = await client.query(
        `SELECT e.*, s.name as subject_name
         FROM exams e
         JOIN subjects s ON e.subject_id = s.id
         WHERE e.id = $1`,
        [examId]
      );

      if (examResult.rows.length === 0) {
        return null;
      }

      const exam = examResult.rows[0];

      // التحقق من حالة الامتحان
      if (exam.status === 'closed') {
        throw new Error('الامتحان مغلق حالياً');
      }

      if (exam.open_at && new Date(exam.open_at) > new Date()) {
        throw new Error('الامتحان لم يفتح بعد');
      }

      if (exam.close_at && new Date(exam.close_at) < new Date()) {
        throw new Error('انتهى وقت الامتحان');
      }

      // الأسئلة (بترتيب عشوائي)
      const questionsResult = await client.query(
        `SELECT id, question_text, type, options
         FROM questions
         WHERE exam_id = $1
         ORDER BY RANDOM()`,
        [examId]
      );

      // محاولات المستخدم السابقة
      let userAttempts = [];
      if (userId) {
        const attemptsResult = await client.query(
          `SELECT score, passed, attempt_date
           FROM exam_attempts
           WHERE user_id = $1 AND exam_id = $2
           ORDER BY attempt_date DESC`,
          [userId, examId]
        );
        userAttempts = attemptsResult.rows;
      }

      return {
        ...exam,
        questions: questionsResult.rows,
        questions_count: questionsResult.rows.length,
        user_attempts: userAttempts,
        best_score: userAttempts.length > 0 ? Math.max(...userAttempts.map(a => a.score)) : null
      };
    } finally {
      client.release();
    }
  }

  // تصحيح الامتحان وحساب الدرجة
  static async submitExam(userId, examId, answers) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // الحصول على الأسئلة والإجابات الصحيحة
      const questionsResult = await client.query(
        'SELECT id, correct_answer FROM questions WHERE exam_id = $1',
        [examId]
      );

      const questions = questionsResult.rows;
      let correctCount = 0;

      // تصحيح الإجابات
      questions.forEach(question => {
        const userAnswer = answers[question.id];
        if (userAnswer && userAnswer.toLowerCase() === question.correct_answer.toLowerCase()) {
          correctCount++;
        }
      });

      // حساب النسبة المئوية
      const score = (correctCount / questions.length) * 100;

      // الحصول على نسبة النجاح المطلوبة
      const examResult = await client.query(
        'SELECT pass_percentage, level, subject_id FROM exams WHERE id = $1',
        [examId]
      );
      const exam = examResult.rows[0];

      const passed = score >= exam.pass_percentage;

      // حفظ المحاولة
      const attemptResult = await client.query(
        `INSERT INTO exam_attempts (user_id, exam_id, score, passed, answers)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, examId, score.toFixed(2), passed, JSON.stringify(answers)]
      );

      await client.query('COMMIT');

      return {
        attempt: attemptResult.rows[0],
        total_questions: questions.length,
        correct_answers: correctCount,
        score: parseFloat(score.toFixed(2)),
        passed: passed,
        required_percentage: exam.pass_percentage
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // تحديث امتحان
  static async update(examId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramIndex}`);
      values.push(updates[key]);
      paramIndex++;
    });

    values.push(examId);

    const result = await pool.query(
      `UPDATE exams SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  // حذف امتحان
  static async delete(examId) {
    await pool.query('DELETE FROM exams WHERE id = $1', [examId]);
    return true;
  }

  // إحصائيات الامتحان
  static async getStats(examId) {
    const result = await pool.query(
      `SELECT 
         COUNT(DISTINCT user_id) as total_attempts,
         AVG(score) as average_score,
         MAX(score) as highest_score,
         MIN(score) as lowest_score,
         COUNT(CASE WHEN passed = true THEN 1 END) as passed_count,
         COUNT(CASE WHEN passed = false THEN 1 END) as failed_count
       FROM exam_attempts
       WHERE exam_id = $1`,
      [examId]
    );
    return result.rows[0];
  }

  // الحصول على جميع امتحانات مادة
  static async findBySubject(subjectId) {
    const result = await pool.query(
      `SELECT e.*,
              (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as questions_count,
              (SELECT COUNT(DISTINCT user_id) FROM exam_attempts WHERE exam_id = e.id) as attempts_count
       FROM exams e
       WHERE e.subject_id = $1
       ORDER BY e.level ASC`,
      [subjectId]
    );
    return result.rows;
  }
}

module.exports = Exam;
