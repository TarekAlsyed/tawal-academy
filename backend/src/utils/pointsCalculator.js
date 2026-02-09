const pool = require('../config/database');

// نظام النقاط
const POINTS = {
  EXAM_100: 100,      // امتحان 100%
  EXAM_90: 80,        // امتحان 90-99%
  EXAM_80: 60,        // امتحان 80-89%
  EXAM_70: 40,        // امتحان 70-79%
  EXAM_60: 20,        // امتحان 60-69%
  DOWNLOAD_PDF: 5,    // تحميل PDF
  VIEW_IMAGE: 2,      // مشاهدة صورة
  RATE_SUBJECT: 3     // تقييم مادة
};

// حساب النقاط بناءً على درجة الامتحان
const calculateExamPoints = (score) => {
  if (score >= 100) return POINTS.EXAM_100;
  if (score >= 90) return POINTS.EXAM_90;
  if (score >= 80) return POINTS.EXAM_80;
  if (score >= 70) return POINTS.EXAM_70;
  if (score >= 60) return POINTS.EXAM_60;
  return 0;
};

// إضافة نقاط للمستخدم
const addPoints = async (userId, actionType, points, details = {}) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // إضافة النقاط إلى إجمالي نقاط المستخدم
    await client.query(
      'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
      [points, userId]
    );

    // تسجيل العملية في سجل النقاط
    await client.query(
      `INSERT INTO points_log (user_id, action_type, points, details)
       VALUES ($1, $2, $3, $4)`,
      [userId, actionType, points, JSON.stringify(details)]
    );

    await client.query('COMMIT');

    return {
      success: true,
      pointsAdded: points
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// الحصول على إجمالي نقاط المستخدم
const getUserPoints = async (userId) => {
  const result = await pool.query(
    'SELECT total_points FROM users WHERE id = $1',
    [userId]
  );
  
  return result.rows[0]?.total_points || 0;
};

// الحصول على سجل النقاط للمستخدم
const getPointsHistory = async (userId, limit = 20) => {
  const result = await pool.query(
    `SELECT action_type, points, details, created_at
     FROM points_log
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  
  return result.rows;
};

module.exports = {
  POINTS,
  calculateExamPoints,
  addPoints,
  getUserPoints,
  getPointsHistory
};
