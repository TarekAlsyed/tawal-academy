const pool = require('../config/database');

class Subject {
  // إنشاء مادة جديدة
  static async create(termId, name, description, coverImage, status, scheduledAt, createdBy) {
    const result = await pool.query(
      `INSERT INTO subjects (term_id, name, description, cover_image, status, scheduled_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [termId, name, description, coverImage, status, scheduledAt, createdBy]
    );
    return result.rows[0];
  }

  // الحصول على جميع المواد
  static async findAll(includeScheduled = false) {
    let query = `
      SELECT s.*, t.name as term_name,
             (SELECT COUNT(*) FROM pdfs WHERE subject_id = s.id) as pdfs_count,
             (SELECT COUNT(*) FROM images WHERE subject_id = s.id) as images_count,
             (SELECT COUNT(*) FROM exams WHERE subject_id = s.id) as exams_count,
             (SELECT COALESCE(AVG(rating), 0) FROM ratings WHERE subject_id = s.id) as avg_rating,
             (SELECT COUNT(*) FROM ratings WHERE subject_id = s.id) as ratings_count
      FROM subjects s
      LEFT JOIN terms t ON s.term_id = t.id
    `;

    if (!includeScheduled) {
      query += ` WHERE (s.scheduled_at IS NULL OR s.scheduled_at <= CURRENT_TIMESTAMP)
                 AND s.status = 'open'`;
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query);
    return result.rows;
  }

  // الحصول على مادة واحدة بكل التفاصيل
  static async findById(subjectId) {
    const result = await pool.query(
      `SELECT s.*, t.name as term_name,
              (SELECT COALESCE(AVG(rating), 0) FROM ratings WHERE subject_id = s.id) as avg_rating,
              (SELECT COUNT(*) FROM ratings WHERE subject_id = s.id) as ratings_count
       FROM subjects s
       LEFT JOIN terms t ON s.term_id = t.id
       WHERE s.id = $1`,
      [subjectId]
    );
    return result.rows[0];
  }

  // الحصول على مادة مع كل محتوياتها (PDFs, Images, Exams)
  static async findByIdWithContent(subjectId, userId = null) {
    const client = await pool.connect();
    
    try {
      // المادة الأساسية
      const subjectResult = await client.query(
        `SELECT s.*, t.name as term_name,
                (SELECT COALESCE(AVG(rating), 0) FROM ratings WHERE subject_id = s.id) as avg_rating,
                (SELECT COUNT(*) FROM ratings WHERE subject_id = s.id) as ratings_count
         FROM subjects s
         LEFT JOIN terms t ON s.term_id = t.id
         WHERE s.id = $1`,
        [subjectId]
      );

      if (subjectResult.rows.length === 0) {
        return null;
      }

      const subject = subjectResult.rows[0];

      // ملفات PDF
      const pdfsResult = await client.query(
        'SELECT * FROM pdfs WHERE subject_id = $1 ORDER BY created_at DESC',
        [subjectId]
      );

      // الصور
      const imagesResult = await client.query(
        'SELECT * FROM images WHERE subject_id = $1 ORDER BY created_at DESC',
        [subjectId]
      );

      // الامتحانات
      const examsResult = await client.query(
        `SELECT e.*,
                (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as questions_count
         FROM exams e
         WHERE e.subject_id = $1
         ORDER BY e.level ASC`,
        [subjectId]
      );

      // إذا كان هناك مستخدم، نتحقق من محاولاته السابقة
      let userAttempts = [];
      let userRating = null;

      if (userId) {
        const attemptsResult = await client.query(
          `SELECT exam_id, MAX(score) as best_score, MAX(passed) as passed
           FROM exam_attempts
           WHERE user_id = $1 AND exam_id IN (SELECT id FROM exams WHERE subject_id = $2)
           GROUP BY exam_id`,
          [userId, subjectId]
        );
        userAttempts = attemptsResult.rows;

        const ratingResult = await client.query(
          'SELECT rating FROM ratings WHERE user_id = $1 AND subject_id = $2',
          [userId, subjectId]
        );
        userRating = ratingResult.rows[0]?.rating || null;
      }

      return {
        ...subject,
        pdfs: pdfsResult.rows,
        images: imagesResult.rows,
        exams: examsResult.rows.map(exam => {
          const userAttempt = userAttempts.find(a => a.exam_id === exam.id);
          return {
            ...exam,
            user_best_score: userAttempt?.best_score || null,
            user_passed: userAttempt?.passed || false,
            is_locked: exam.level > 1 && !this.canAccessLevel(exam.level, userAttempts, examsResult.rows)
          };
        }),
        user_rating: userRating
      };
    } finally {
      client.release();
    }
  }

  // التحقق من إمكانية الوصول للمستوى
  static canAccessLevel(level, userAttempts, allExams) {
    if (level === 1) return true;

    const previousLevel = level - 1;
    const previousExam = allExams.find(e => e.level === previousLevel);
    
    if (!previousExam) return false;

    const previousAttempt = userAttempts.find(a => a.exam_id === previousExam.id);
    
    if (!previousAttempt) return false;

    const requiredPercentage = previousLevel === 1 ? 80 : 85;
    return previousAttempt.best_score >= requiredPercentage;
  }

  // تحديث مادة
  static async update(subjectId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramIndex}`);
      values.push(updates[key]);
      paramIndex++;
    });

    values.push(subjectId);

    const result = await pool.query(
      `UPDATE subjects SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  // حذف مادة
  static async delete(subjectId) {
    await pool.query('DELETE FROM subjects WHERE id = $1', [subjectId]);
    return true;
  }

  // إضافة PDF
  static async addPDF(subjectId, title, fileUrl, fileSize) {
    const result = await pool.query(
      `INSERT INTO pdfs (subject_id, title, file_url, file_size)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [subjectId, title, fileUrl, fileSize]
    );
    return result.rows[0];
  }

  // حذف PDF
  static async deletePDF(pdfId) {
    const result = await pool.query(
      'DELETE FROM pdfs WHERE id = $1 RETURNING file_url',
      [pdfId]
    );
    return result.rows[0];
  }

  // إضافة صورة
  static async addImage(subjectId, title, fileUrl) {
    const result = await pool.query(
      `INSERT INTO images (subject_id, title, file_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [subjectId, title, fileUrl]
    );
    return result.rows[0];
  }

  // حذف صورة
  static async deleteImage(imageId) {
    const result = await pool.query(
      'DELETE FROM images WHERE id = $1 RETURNING file_url',
      [imageId]
    );
    return result.rows[0];
  }

  // تسجيل تحميل PDF
  static async recordPDFDownload(pdfId) {
    await pool.query(
      'UPDATE pdfs SET downloads_count = downloads_count + 1 WHERE id = $1',
      [pdfId]
    );
  }

  // تسجيل مشاهدة صورة
  static async recordImageView(imageId) {
    await pool.query(
      'UPDATE images SET views_count = views_count + 1 WHERE id = $1',
      [imageId]
    );
  }

  // تقييم مادة
  static async rateSubject(userId, subjectId, rating) {
    const result = await pool.query(
      `INSERT INTO ratings (user_id, subject_id, rating)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, subject_id)
       DO UPDATE SET rating = $3, created_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, subjectId, rating]
    );
    return result.rows[0];
  }

  // الحصول على المواد حسب الترم
  static async findByTerm(termId) {
    const result = await pool.query(
      `SELECT s.*, 
              (SELECT COUNT(*) FROM pdfs WHERE subject_id = s.id) as pdfs_count,
              (SELECT COUNT(*) FROM images WHERE subject_id = s.id) as images_count,
              (SELECT COUNT(*) FROM exams WHERE subject_id = s.id) as exams_count
       FROM subjects s
       WHERE s.term_id = $1
       AND (s.scheduled_at IS NULL OR s.scheduled_at <= CURRENT_TIMESTAMP)
       AND s.status = 'open'
       ORDER BY s.created_at DESC`,
      [termId]
    );
    return result.rows;
  }
}

module.exports = Subject;
