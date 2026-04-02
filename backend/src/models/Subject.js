const pool = require('../config/database');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');

class Subject {
  // دالة مساعدة لحذف ملف من Cloudinary أو القرص المحلي
  static async deleteFile(fileUrl) {
    if (!fileUrl) return;

    // 1. إذا كان الملف على Cloudinary
    if (fileUrl.includes('res.cloudinary.com')) {
      try {
        const publicId = this.getPublicIdFromUrl(fileUrl);
        if (publicId) {
          const resourceType = fileUrl.includes('/raw/upload/') ? 'raw' : 'image';
          await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        }
      } catch (err) {
        console.error('[CLOUDINARY DELETE ERROR]:', err.message);
      }
      return;
    }

    // 2. إذا كان الملف محلياً
    try {
      const uploadsPath = process.env.NODE_ENV === 'production' 
        ? '/app/uploads' 
        : path.join(__dirname, '../../uploads');
      const filePath = path.join(uploadsPath, fileUrl.replace("/uploads/", ""));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('[LOCAL FILE DELETE ERROR]:', err.message);
    }
  }

  // دالة لاستخراج الـ Public ID من رابط Cloudinary
  static getPublicIdFromUrl(url) {
    if (!url || !url.includes('res.cloudinary.com')) return null;
    try {
      const parts = url.split('/');
      const uploadIndex = parts.indexOf('upload');
      if (uploadIndex === -1) return null;
      
      // تخطي الـ version (يبدأ بحرف v)
      const publicIdWithExt = parts.slice(uploadIndex + 2).join('/');
      
      // بالنسبة للملفات الـ raw نحتاج الامتداد، أما الصور فلا
      const isRaw = url.includes('/raw/upload/');
      if (isRaw) return publicIdWithExt;
      
      return publicIdWithExt.split('.').slice(0, -1).join('.');
    } catch (e) {
      return null;
    }
  }

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
             (SELECT COUNT(*) FROM exams WHERE subject_id = s.id AND is_published = TRUE) as exams_count,
             (SELECT COALESCE(AVG(rating), 0) FROM ratings WHERE subject_id = s.id) as avg_rating,
             (SELECT COUNT(*) FROM ratings WHERE subject_id = s.id) as ratings_count
      FROM subjects s
      LEFT JOIN terms t ON s.term_id = t.id
    `;

    if (!includeScheduled) {
      query += ` WHERE (t.is_published = TRUE OR t.is_published IS NULL)
                 AND (s.scheduled_at IS NULL OR s.scheduled_at <= CURRENT_TIMESTAMP)
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
        `SELECT s.*, t.name as term_name, t.is_published as term_published,
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

      // الامتحانات - تعديل لجعل الأدمن يرى كل الامتحانات (حتى غير المنشورة)
      const isAdmin = !!userId && (await client.query('SELECT id FROM admins WHERE id = $1', [userId])).rows.length > 0;
      
      let examsQuery = 'SELECT e.*, (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as questions_count FROM exams e WHERE e.subject_id = $1';
      if (!isAdmin) {
        examsQuery += ' AND e.is_published = TRUE';
      }
      examsQuery += ' ORDER BY e.level ASC';

      const examsResult = await client.query(examsQuery, [subjectId]);

      // إذا كان هناك مستخدم، نتحقق من محاولاته السابقة
      let userAttempts = [];
      let userRating = null;

      if (userId) {
        const attemptsResult = await client.query(
          `SELECT exam_id, MAX(score) as best_score, 
           CASE WHEN COUNT(*) FILTER (WHERE passed = true) > 0 THEN true ELSE false END as passed
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
          const bestScore = userAttempt ? parseFloat(userAttempt.best_score) : null;
          const passed = userAttempt ? !!userAttempt.passed : false;
          
          return {
            ...exam,
            best_score: bestScore,
            passed: passed,
            can_access: exam.status === 'open' && (exam.level === 1 || this.canAccessLevel(exam.level, userAttempts, examsResult.rows))
          };
        }),
        user_rating: userRating
      };
    } finally {
      client.release();
    }
  }

  // الحصول على ملفات PDF لمادة
  static async getPDFs(subjectId) {
    const result = await pool.query(
      'SELECT * FROM pdfs WHERE subject_id = $1 ORDER BY created_at DESC',
      [subjectId]
    );
    return result.rows;
  }

  // الحصول على صور لمادة
  static async getImages(subjectId) {
    const result = await pool.query(
      'SELECT * FROM images WHERE subject_id = $1 ORDER BY created_at DESC',
      [subjectId]
    );
    return result.rows;
  }

  // التحقق من إمكانية الوصول للمستوى
  static canAccessLevel(level, userAttempts, allExams) {
    if (level === 1) return true;

    const previousLevel = level - 1;
    const previousExam = allExams.find(e => e.level === previousLevel);
    
    if (!previousExam) return false;

    const previousAttempt = userAttempts.find(a => a.exam_id === previousExam.id);
    
    if (!previousAttempt) return false;

    // استخدام نسبة النجاح من قاعدة البيانات بدلاً من القيم الثابتة
    const requiredPercentage = previousExam.pass_percentage || 80;
    return previousAttempt.best_score >= requiredPercentage;
  }

  // التحقق مما إذا كانت المادة مغلقة للمستخدم
  static async isLocked(subjectId, userId) {
    // حالياً المواد ليست مغلقة، الامتحانات فقط هي التي تغلق حسب المستوى
    return false;
  }

  // الحصول على تقدم المستخدم في المادة
  static async getUserProgress(subjectId, userId) {
    // التأكد من أن subjectId نص للمقارنة مع JSONB
    const subjectIdStr = String(subjectId);

    const result = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM exams WHERE subject_id = $1 AND is_published = TRUE) as total_exams,
        (SELECT COUNT(*) FROM pdfs WHERE subject_id = $1) as total_pdfs,
        (SELECT COUNT(*) FROM images WHERE subject_id = $1) as total_images,
        
        (SELECT COUNT(DISTINCT exam_id) FROM exam_attempts 
         WHERE user_id = $2 AND passed = true AND exam_id IN (SELECT id FROM exams WHERE subject_id = $1 AND is_published = TRUE)) as passed_exams,
         
        (SELECT COUNT(DISTINCT details->>'pdfId') 
         FROM points_log 
         WHERE user_id = $2 
         AND action_type = 'download_pdf' 
         AND details->>'subjectId' = $3) as downloaded_pdfs,
         
        (SELECT COUNT(DISTINCT details->>'imageId') 
         FROM points_log 
         WHERE user_id = $2 
         AND action_type = 'view_image' 
         AND details->>'subjectId' = $3) as viewed_images`,
      [subjectId, userId, subjectIdStr]
    );
    
    const { total_exams, total_pdfs, total_images, passed_exams, downloaded_pdfs, viewed_images } = result.rows[0];
    
    const totalContent = parseInt(total_exams || 0) + parseInt(total_pdfs || 0) + parseInt(total_images || 0);
    const completedContent = parseInt(passed_exams || 0) + parseInt(downloaded_pdfs || 0) + parseInt(viewed_images || 0);
    
    // حساب النسبة المئوية مع التأكد من عدم تجاوز 100%
    const percentage = totalContent > 0 ? Math.min(100, Math.round((completedContent / totalContent) * 100)) : 0;
    
    return {
      total_exams: parseInt(total_exams || 0),
      total_pdfs: parseInt(total_pdfs || 0),
      total_images: parseInt(total_images || 0),
      passed_exams: parseInt(passed_exams || 0),
      downloaded_pdfs: parseInt(downloaded_pdfs || 0),
      viewed_images: parseInt(viewed_images || 0),
      percentage: percentage
    };
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
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // الحصول على صورة الغلاف وملفات الـ PDF والصور لحذفها من القرص
      const subjectResult = await client.query("SELECT cover_image FROM subjects WHERE id = $1", [subjectId]);
      const pdfsResult = await client.query("SELECT file_url FROM pdfs WHERE subject_id = $1", [subjectId]);
      const imagesResult = await client.query("SELECT file_url FROM images WHERE subject_id = $1", [subjectId]);

      // حذف المادة من قاعدة البيانات (سيتم حذف السجلات المرتبطة بفضل ON DELETE CASCADE)
      await client.query('DELETE FROM subjects WHERE id = $1', [subjectId]);

      // حذف الملفات من التخزين (Cloudinary أو القرص المحلي)
      if (subjectResult.rows[0]?.cover_image) {
        await this.deleteFile(subjectResult.rows[0].cover_image);
      }

      for (const pdf of pdfsResult.rows) {
        await this.deleteFile(pdf.file_url);
      }

      for (const img of imagesResult.rows) {
        await this.deleteFile(img.file_url);
      }

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        "DELETE FROM pdfs WHERE id = $1 RETURNING file_url",
        [pdfId]
      );
      if (result.rows[0] && result.rows[0].file_url) {
        await this.deleteFile(result.rows[0].file_url);
      }
      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        "DELETE FROM images WHERE id = $1 RETURNING file_url",
        [imageId]
      );
      if (result.rows[0] && result.rows[0].file_url) {
        await this.deleteFile(result.rows[0].file_url);
      }
      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // حذف جميع ملفات PDF لمادة
  static async deleteAllPDFs(subjectId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        "DELETE FROM pdfs WHERE subject_id = $1 RETURNING file_url",
        [subjectId]
      );
      
      for (const row of result.rows) {
        if (row.file_url) {
          await this.deleteFile(row.file_url);
        }
      }
      
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // حذف جميع الصور لمادة
  static async deleteAllImages(subjectId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        "DELETE FROM images WHERE subject_id = $1 RETURNING file_url",
        [subjectId]
      );
      
      for (const row of result.rows) {
        if (row.file_url) {
          await this.deleteFile(row.file_url);
        }
      }
      
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // حذف جميع الامتحانات لمادة
  static async deleteAllExams(subjectId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // بفضل ON DELETE CASCADE سيتم حذف الأسئلة والمحاولات تلقائياً
      await client.query("DELETE FROM exams WHERE subject_id = $1", [subjectId]);
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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

  // دالة سريعة لجلب الاسم فقط (للميدل وير)
  static async getNameById(id) {
    const result = await pool.query('SELECT name FROM subjects WHERE id = $1', [id]);
    return result.rows[0]?.name;
  }

  // التحقق من إكمال المادة والحصول على الشهادة
  static async checkCompletion(userId, subjectId) {
    const client = await pool.connect();
    try {
      // الحصول على جميع الامتحانات في المادة
      const examsResult = await client.query(
        'SELECT id FROM exams WHERE subject_id = $1 AND is_published = TRUE',
        [subjectId]
      );
      
      if (examsResult.rows.length === 0) return { completed: false };

      const examIds = examsResult.rows.map(e => e.id);

      // التحقق من نجاح المستخدم في كل امتحان
      const attemptsResult = await client.query(
        `SELECT DISTINCT exam_id 
         FROM exam_attempts 
         WHERE user_id = $1 AND exam_id = ANY($2) AND passed = TRUE`,
        [userId, examIds]
      );

      const completedExams = attemptsResult.rows.map(a => a.exam_id);
      const isCompleted = examIds.every(id => completedExams.includes(id));

      if (isCompleted) {
        // الحصول على بيانات المستخدم والمادة للشهادة
        const userResult = await client.query('SELECT name FROM users WHERE id = $1', [userId]);
        const subjectResult = await client.query('SELECT name FROM subjects WHERE id = $1', [subjectId]);
        
        return {
          completed: true,
          user_name: userResult.rows[0].name,
          subject_name: subjectResult.rows[0].name,
          completion_date: new Date(),
          certificate_id: `CERT-${userId}-${subjectId}-${Date.now().toString().slice(-6)}`
        };
      }

      return { 
        completed: false, 
        progress: {
          total: examIds.length,
          completed: completedExams.length
        }
      };
    } finally {
      client.release();
    }
  }

  // الحصول على المواد حسب الترم
  static async findByTerm(termId) {
    const result = await pool.query(
      `SELECT s.*, 
              (SELECT COUNT(*) FROM pdfs WHERE subject_id = s.id) as pdfs_count,
              (SELECT COUNT(*) FROM images WHERE subject_id = s.id) as images_count,
              (SELECT COUNT(*) FROM exams WHERE subject_id = s.id AND is_published = TRUE) as exams_count,
              (SELECT COALESCE(AVG(rating), 0) FROM ratings WHERE subject_id = s.id) as avg_rating,
              (SELECT COUNT(*) FROM ratings WHERE subject_id = s.id) as ratings_count
       FROM subjects s
       JOIN terms t ON s.term_id = t.id
       WHERE s.term_id = $1
       AND (t.is_published = TRUE OR t.is_published IS NULL)
       AND (s.scheduled_at IS NULL OR s.scheduled_at <= CURRENT_TIMESTAMP)
       AND s.status = 'open'
       ORDER BY s.created_at DESC`,
      [termId]
    );
    return result.rows;
  }
}

module.exports = Subject;
