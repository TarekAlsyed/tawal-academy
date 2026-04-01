const pool = require('../config/database');
const AIGradingService = require('../services/aiGradingService');

class Exam {
  // إنشاء امتحان جديد
  static async create(subjectId, level, name, status, openAt, closeAt, passPercentage, createdBy = null) {
    const result = await pool.query(
      `INSERT INTO exams (subject_id, level, name, status, open_at, close_at, pass_percentage, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [subjectId, level, name, status, openAt, closeAt, passPercentage, createdBy]
    );
    return result.rows[0];
  }

  // الحصول على امتحان بالـ ID
  static async findById(examId) {
    const result = await pool.query(
      `SELECT e.*, COALESCE(e.title, e.name) as title, s.name as subject_name, s.term_id
       FROM exams e
       JOIN subjects s ON e.subject_id = s.id
       WHERE e.id = $1`,
      [examId]
    );
    return result.rows[0];
  }

  // الحصول على امتحان مع الأسئلة (للطالب)
  static async findByIdWithQuestions(examId, userId = null) {
    const client = await pool.connect();
    try {
      // الحصول على بيانات الامتحان
      const examResult = await client.query(
        `SELECT e.*, COALESCE(e.title, e.name) as title, s.name as subject_name, s.term_id 
         FROM exams e 
         JOIN subjects s ON e.subject_id = s.id 
         WHERE e.id = $1`,
        [examId]
      );

      if (examResult.rows.length === 0) return null;
      const exam = examResult.rows[0];

      // التحقق من الجدولة الزمنية
      const now = new Date();
      if (exam.start_date && new Date(exam.start_date) > now) {
        exam.is_locked = true;
        exam.lock_reason = 'لم يبدأ موعد الامتحان بعد';
        exam.start_time = exam.start_date;
      } else if (exam.end_date && new Date(exam.end_date) < now) {
        exam.is_locked = true;
        exam.lock_reason = 'انتهى موعد الامتحان';
      } else if (!exam.is_published || exam.status === 'closed') {
        exam.is_locked = true;
        exam.lock_reason = 'الامتحان مغلق حالياً';
      } else {
        exam.is_locked = false;
      }

      // الحصول على الأسئلة (مع الإجابة الصحيحة للتقييم اللحظي)
      const questionsResult = await client.query(
        'SELECT id, question_text, type, options, question_order, explanation, correct_answer FROM questions WHERE exam_id = $1 ORDER BY question_order ASC',
        [examId]
      );

      let userAttempts = [];
      if (userId) {
        const attemptsResult = await client.query(
          `SELECT id, score, passed, attempt_date, answers
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
        best_score: userAttempts.length > 0 ? Math.max(...userAttempts.map(a => parseFloat(a.score))) : null
      };
    } finally {
      client.release();
    }
  }

  // الحصول على أسئلة الامتحان مع الإجابات الصحيحة (للمراجعة بعد الامتحان)
  static async getExamWithAnswers(examId, userId) {
    const client = await pool.connect();
    try {
      const examResult = await client.query(
        `SELECT e.*, COALESCE(e.title, e.name) as title, s.name as subject_name 
         FROM exams e 
         JOIN subjects s ON e.subject_id = s.id 
         WHERE e.id = $1`,
        [examId]
      );
      
      if (examResult.rows.length === 0) return null;
      const exam = examResult.rows[0];

      const questionsResult = await client.query(
        'SELECT * FROM questions WHERE exam_id = $1 ORDER BY question_order ASC',
        [examId]
      );

      const lastAttemptResult = await client.query(
        `SELECT * FROM exam_attempts 
         WHERE user_id = $1 AND exam_id = $2 
         ORDER BY attempt_date DESC LIMIT 1`,
        [userId, examId]
      );

      return {
        ...exam,
        questions: questionsResult.rows,
        last_attempt: lastAttemptResult.rows[0] || null
      };
    } finally {
      client.release();
    }
  }

  // الحصول على بنك الأسئلة الشخصي (الأسئلة التي أخطأ فيها الطالب)
  static async getPersonalQuestionBank(userId) {
    const result = await pool.query(
      `SELECT DISTINCT q.*, e.name as exam_title, s.name as subject_name
       FROM questions q
       JOIN exams e ON q.exam_id = e.id
       JOIN subjects s ON e.subject_id = s.id
       JOIN exam_attempts ea ON ea.exam_id = e.id
       WHERE ea.user_id = $1
         AND (ea.answers->>(q.id::text)) IS NOT NULL
         AND LOWER(ea.answers->>(q.id::text)) != LOWER(q.correct_answer)
       ORDER BY q.id ASC`,
      [userId]
    );
    return result.rows;
  }

  // إحصائيات الأسئلة (للأدمن)
  static async getQuestionAnalytics(examId) {
    const questionsResult = await pool.query(
      'SELECT id, question_text, correct_answer FROM questions WHERE exam_id = $1',
      [examId]
    );
    
    const attemptsResult = await pool.query(
      'SELECT answers FROM exam_attempts WHERE exam_id = $1',
      [examId]
    );

    const analytics = questionsResult.rows.map(q => {
      let correct = 0;
      let wrong = 0;
      let total = 0;
      const optionsStats = { a: 0, b: 0, c: 0, d: 0 };

      attemptsResult.rows.forEach(attempt => {
        const answer = attempt.answers[q.id];
        if (answer) {
          total++;
          if (String(answer).toLowerCase() === q.correct_answer.toLowerCase()) {
            correct++;
          } else {
            wrong++;
          }
          if (optionsStats[answer.toLowerCase()] !== undefined) {
            optionsStats[answer.toLowerCase()]++;
          }
        }
      });

      return {
        id: q.id,
        text: q.question_text,
        correct_answer: q.correct_answer,
        success_rate: total > 0 ? ((correct / total) * 100).toFixed(1) : 0,
        total_answers: total,
        options_stats: optionsStats
      };
    });

    return analytics;
  }

  // حفظ تقدم الامتحان وجلسة المؤقت
  static async saveProgress(userId, examId, answers) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // الحصول على حد الوقت للامتحان
      const examRes = await client.query('SELECT time_limit FROM exams WHERE id = $1', [examId]);
      const timeLimit = examRes.rows[0]?.time_limit; // 0 or null means unlimited

      // التحقق من وجود تقدم سابق
      const existingRes = await client.query(
        'SELECT start_time, end_time FROM exam_progress WHERE user_id = $1 AND exam_id = $2',
        [userId, examId]
      );

      let startTime, endTime;
      if (existingRes.rows.length === 0) {
        startTime = new Date();
        // إذا كان الوقت غير محدود (0)، نضع endTime كـ null
        endTime = (timeLimit && timeLimit > 0) 
          ? new Date(startTime.getTime() + timeLimit * 60000)
          : null;
      } else {
        startTime = existingRes.rows[0].start_time;
        endTime = existingRes.rows[0].end_time;
      }

      const result = await client.query(
        `INSERT INTO exam_progress (user_id, exam_id, answers, start_time, end_time, last_updated)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, exam_id)
         DO UPDATE SET answers = $3, last_updated = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, examId, JSON.stringify(answers), startTime, endTime]
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

  // الحصول على تقدم الامتحان والوقت المتبقي
  static async getProgress(userId, examId) {
    const result = await pool.query(
      'SELECT answers, start_time, end_time, (EXTRACT(EPOCH FROM (end_time - CURRENT_TIMESTAMP))) AS remaining_seconds FROM exam_progress WHERE user_id = $1 AND exam_id = $2',
      [userId, examId]
    );
    
    if (!result.rows[0]) return null;

    const row = result.rows[0];
    let remainingSeconds = -1; // افتراضي غير محدود

    if (row.end_time) {
      remainingSeconds = Math.max(0, Math.floor(row.remaining_seconds));
    }

    return {
      answers: row.answers,
      start_time: row.start_time,
      end_time: row.end_time,
      remaining_seconds: remainingSeconds
    };
  }

  // حذف تقدم الامتحان (بعد التسليم)
  static async deleteProgress(userId, examId) {
    await pool.query(
      'DELETE FROM exam_progress WHERE user_id = $1 AND exam_id = $2',
      [userId, examId]
    );
    return true;
  }

  // تصحيح الامتحان وحساب الدرجة
  static async submitExam(userId, examId, answers) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // التحقق من الوقت المتبقي
      const progressRes = await client.query(
        'SELECT end_time, (EXTRACT(EPOCH FROM (end_time - CURRENT_TIMESTAMP))) AS remaining_seconds FROM exam_progress WHERE user_id = $1 AND exam_id = $2',
        [userId, examId]
      );

      const progress = progressRes.rows[0];
      const isTimeOver = progress && progress.end_time && progress.remaining_seconds < -30; // 30 ثانية سماح، فقط إذا كان هناك وقت نهاية (محدود)

      // الحصول على الأسئلة والإجابات الصحيحة
      const questionsResult = await client.query(
        'SELECT id, type, correct_answer, points FROM questions WHERE exam_id = $1',
        [examId]
      );

      const questions = questionsResult.rows;
      let totalPoints = 0;
      let earnedPoints = 0;
      let correctCount = 0;
      let hasManualGrading = false;

      questions.forEach(question => {
        const userAnswer = answers[question.id];
        const points = question.points || 10;
        totalPoints += points;

        if (question.type === 'essay') {
          hasManualGrading = true;
          return;
        }

        if (userAnswer !== undefined && userAnswer !== null) {
          let isCorrect = false;
          const normalizedUserAnswer = String(userAnswer).trim().toLowerCase();
          const normalizedCorrectAnswer = String(question.correct_answer).trim().toLowerCase();

          if (question.type === 'multiple' || question.type === 'true_false') {
            isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
          } else if (question.type === 'fill_blanks') {
            isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
          } else if (question.type === 'matching') {
            try {
              const userObj = typeof userAnswer === 'string' ? JSON.parse(userAnswer) : userAnswer;
              const correctObj = typeof question.correct_answer === 'string' ? JSON.parse(question.correct_answer) : question.correct_answer;
              isCorrect = JSON.stringify(userObj) === JSON.stringify(correctObj);
            } catch (e) {
              isCorrect = false;
            }
          }

          if (isCorrect) {
            earnedPoints += points;
            correctCount++;
          }
        }
      });

      const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

      // الحصول على إعدادات الامتحان (درجة النجاح والنقاط)
      const examResult = await client.query(
        'SELECT passing_score, points, level, subject_id FROM exams WHERE id = $1',
        [examId]
      );
      const exam = examResult.rows[0];

      // درجة النجاح المطلوبة (افتراضي 50%)
      const requiredScore = exam.passing_score || 50;
      const passed = score >= requiredScore;
      const status = hasManualGrading ? 'pending_grading' : 'completed';
      
      // حساب الإجمالي والأسئلة لضمان عدم التناقض في الواجهة
      const gradableQuestions = questions.filter(q => q.type !== 'essay').length;
      const totalQuestionsCount = questions.length;

      // حفظ المحاولة
      const attemptResult = await client.query(
        `INSERT INTO exam_attempts (user_id, exam_id, score, passed, answers, status, is_manual_grading)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [userId, examId, score.toFixed(2), passed, JSON.stringify(answers), status, hasManualGrading]
      );

      // إذا نجح الطالب ولم يسبق له النجاح في هذا الامتحان، نمنحه النقاط
      if (passed && !hasManualGrading) {
        const previousPass = await client.query(
          'SELECT id FROM exam_attempts WHERE user_id = $1 AND exam_id = $2 AND passed = true AND id != $3',
          [userId, examId, attemptResult.rows[0].id]
        );

        if (previousPass.rows.length === 0) {
          const awardedPoints = exam.points || 10;
          await client.query(
            'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
            [awardedPoints, userId]
          );
          
          // تسجيل النقاط في السجل
          await client.query(
            'INSERT INTO points_log (user_id, action_type, points, details) VALUES ($1, $2, $3, $4)',
            [userId, 'exam_pass', awardedPoints, JSON.stringify({ exam_id: examId, score: score.toFixed(2) })]
          );
        }
      }

      // حذف التقدم بعد التسليم الناجح
      await client.query(
        'DELETE FROM exam_progress WHERE user_id = $1 AND exam_id = $2',
        [userId, examId]
      );

      await client.query('COMMIT');

      // تشغيل التصحيح الذكي في الخلفية إذا لزم الأمر
      if (hasManualGrading) {
        AIGradingService.gradeAttempt(attemptResult.rows[0].id)
          .catch(err => console.error('فشل تشغيل التصحيح الذكي:', err));
      }

      return {
        attempt: attemptResult.rows[0],
        total_questions: totalQuestionsCount,
        gradable_questions: gradableQuestions,
        correct_answers: correctCount,
        earned_points: earnedPoints,
        total_points: totalPoints,
        score: parseFloat(score.toFixed(2)),
        passed: passed,
        status: status,
        has_manual_grading: hasManualGrading,
        required_percentage: requiredScore,
        awarded_points: passed ? (exam.points || 10) : 0
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
      `SELECT e.*, COALESCE(e.title, e.name) as title,
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
