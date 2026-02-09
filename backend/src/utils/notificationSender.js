const pool = require('../config/database');

// إرسال إشعار لمستخدم واحد
const sendNotification = async (userId, message, type = 'info', link = null) => {
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, message, type, link)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, message, type, link]
    );

    return {
      success: true,
      notificationId: result.rows[0].id
    };
  } catch (error) {
    console.error('خطأ في إرسال الإشعار:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

// إرسال إشعار لجميع المستخدمين
const sendNotificationToAll = async (message, type = 'info', link = null) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // الحصول على جميع المستخدمين غير المحظورين
    const usersResult = await client.query(
      'SELECT id FROM users WHERE is_blocked = FALSE'
    );

    const users = usersResult.rows;

    // إرسال الإشعار لكل مستخدم
    for (const user of users) {
      await client.query(
        `INSERT INTO notifications (user_id, message, type, link)
         VALUES ($1, $2, $3, $4)`,
        [user.id, message, type, link]
      );
    }

    await client.query('COMMIT');

    return {
      success: true,
      count: users.length
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('خطأ في إرسال الإشعارات:', error);
    return {
      success: false,
      message: error.message
    };
  } finally {
    client.release();
  }
};

// إرسال إشعار لمجموعة من المستخدمين
const sendNotificationToGroup = async (userIds, message, type = 'info', link = null) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    for (const userId of userIds) {
      await client.query(
        `INSERT INTO notifications (user_id, message, type, link)
         VALUES ($1, $2, $3, $4)`,
        [userId, message, type, link]
      );
    }

    await client.query('COMMIT');

    return {
      success: true,
      count: userIds.length
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('خطأ في إرسال الإشعارات:', error);
    return {
      success: false,
      message: error.message
    };
  } finally {
    client.release();
  }
};

// إشعار عند إضافة مادة جديدة
const notifyNewSubject = async (subjectName, subjectId) => {
  return await sendNotificationToAll(
    `تم إضافة مادة جديدة: ${subjectName}`,
    'info',
    `/subjects/${subjectId}`
  );
};

// إشعار عند إضافة امتحان جديد
const notifyNewExam = async (subjectName, examLevel, examId) => {
  return await sendNotificationToAll(
    `امتحان جديد في ${subjectName} - المستوى ${examLevel}`,
    'exam',
    `/exams/${examId}`
  );
};

// إشعار عند الرد على سؤال طالب
const notifyQuestionReply = async (userId, questionId) => {
  return await sendNotification(
    userId,
    'تم الرد على سؤالك',
    'reply',
    `/my-questions#${questionId}`
  );
};

// إشعار عند النجاح في مستوى
const notifyLevelPassed = async (userId, subjectName, level, score) => {
  return await sendNotification(
    userId,
    `مبروك! نجحت في ${subjectName} - المستوى ${level} بدرجة ${score}%`,
    'success',
    null
  );
};

module.exports = {
  sendNotification,
  sendNotificationToAll,
  sendNotificationToGroup,
  notifyNewSubject,
  notifyNewExam,
  notifyQuestionReply,
  notifyLevelPassed
};
