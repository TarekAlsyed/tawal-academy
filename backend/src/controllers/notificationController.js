const pool = require('../config/database');

exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT id, message, type, link, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const unreadCount = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    res.json({
      success: true,
      data: {
        notifications: result.rows,
        unreadCount: parseInt(unreadCount.rows[0].count)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({
      success: true,
      message: 'تم وضع علامة مقروء'
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({
      success: true,
      message: 'تم حذف الإشعار'
    });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    res.json({
      success: true,
      message: 'تم تعيين جميع الإشعارات كمقروءة'
    });
  } catch (error) {
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const unreadCount = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    res.json({
      success: true,
      data: {
        unreadCount: parseInt(unreadCount.rows[0].count)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.saveFcmToken = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fcm_token } = req.body;

    if (!fcm_token) {
      return res.status(400).json({ success: false, message: 'FCM Token is required' });
    }

    // Fix #46: Encrypt FCM token before saving
    const { encrypt } = require('../utils/encryption');
    const encryptedToken = encrypt(fcm_token);

    await pool.query(
      'UPDATE users SET fcm_token = $1 WHERE id = $2',
      [encryptedToken, userId]
    );

    res.json({
      success: true,
      message: 'تم حفظ الرمز بنجاح'
    });
  } catch (error) {
    next(error);
  }
};
