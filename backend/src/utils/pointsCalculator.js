const pool = require('../config/database');

/**
 * حساب النقاط بناءً على نتيجة الامتحان
 * 100%: 100 نقطة
 * 90-99%: 80 نقطة
 * 80-89%: 60 نقطة
 * 70-79%: 40 نقطة
 * 60-69%: 20 نقطة
 * أقل من 60%: 0 نقطة
 */
const calculateExamPoints = (score) => {
  if (score >= 100) return 100;
  if (score >= 90) return 80;
  if (score >= 80) return 60;
  if (score >= 70) return 40;
  if (score >= 60) return 20;
  return 0;
};

/**
 * أنواع النقاط الأخرى
 */
const POINTS = {
  DOWNLOAD_PDF: 5,
  VIEW_IMAGE: 2,
  RATE_SUBJECT: 3
};

const getPointsBreakdown = () => {
  return [
    { range: '100%', points: 100 },
    { range: '90-99%', points: 80 },
    { range: '80-89%', points: 60 },
    { range: '70-79%', points: 40 },
    { range: '60-69%', points: 20 },
    { type: 'تحميل ملف PDF', points: 5 },
    { type: 'مشاهدة صورة', points: 2 },
    { type: 'تقييم مادة', points: 3 }
  ];
};

/**
 * إضافة نقاط للمستخدم وتحديث المجموع الكلي
 */
const addPoints = async (userId, actionType, points, details = {}) => {
  if (points <= 0) return 0;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // منع تكرار النقاط لنفس الإجراء خلال 24 ساعة
    if (actionType === 'download_pdf' || actionType === 'view_image') {
      const idKey = actionType === 'download_pdf' ? 'pdfId' : 'imageId';
      // تأكد من وجود المعرف في التفاصيل
      if (details[idKey]) {
        const lastActionCheck = await client.query(
          `SELECT created_at FROM points_log 
           WHERE user_id = $1 AND action_type = $2 AND details->>'${idKey}' = $3 
           ORDER BY created_at DESC LIMIT 1`,
          [userId, actionType, String(details[idKey])]
        );

        if (lastActionCheck.rows.length > 0) {
          const lastActionTime = new Date(lastActionCheck.rows[0].created_at);
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          if (lastActionTime > twentyFourHoursAgo) {
            await client.query('ROLLBACK');
            return 0;
          }
        }
      }
    }

    // منع تكرار نقاط التقييم لنفس المادة (مرة واحدة فقط)
    if (actionType === 'rate_subject') {
      const subjectId = details.subjectId;
      if (subjectId) {
        const alreadyRated = await client.query(
          `SELECT 1 FROM points_log 
           WHERE user_id = $1 AND action_type = 'rate_subject' 
           AND details->>'subjectId' = $2`,
          [userId, String(subjectId)]
        );

        if (alreadyRated.rows.length > 0) {
          await client.query('ROLLBACK');
          return 0;
        }
      }
    }

    // منطق نقاط الامتحانات: الحصول على الفرق فقط عند تحسين الدرجة
    if (actionType === 'exam_completed') {
      const examId = details.examId;
      if (examId) {
        // حساب مجموع النقاط التي حصل عليها المستخدم لهذا الامتحان سابقاً
        const prevPointsRes = await client.query(
          `SELECT COALESCE(SUM(points), 0) as total_awarded
           FROM points_log 
           WHERE user_id = $1 AND action_type = 'exam_completed' 
           AND details->>'examId' = $2`,
          [userId, String(examId)]
        );

        const totalAwarded = parseInt(prevPointsRes.rows[0].total_awarded);
        
        // النقاط الجديدة هي الفرق بين ما يستحقه الآن وما حصل عليه سابقاً
        const pointsToAward = points - totalAwarded;

        if (pointsToAward <= 0) {
          await client.query('ROLLBACK');
          return 0; // لا نقاط إضافية
        }

        // تحديث قيمة النقاط لتكون الفرق فقط
        points = pointsToAward;
      }
    }

    // تسجيل في سجل النقاط
    await client.query(
      `INSERT INTO points_log (user_id, action_type, points, details)
       VALUES ($1, $2, $3, $4)`,
      [userId, actionType, points, JSON.stringify(details)]
    );

    // تحديث نقاط المستخدم
    await client.query(
      `UPDATE users SET total_points = total_points + $1 WHERE id = $2`,
      [points, userId]
    );

    await client.query('COMMIT');
    return points;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding points:', error);
    return 0;
  } finally {
    client.release();
  }
};

module.exports = {
  calculateExamPoints,
  calculatePoints: calculateExamPoints, // للتوافق مع الكود القديم إن وجد
  POINTS,
  getPointsBreakdown,
  addPoints
};
