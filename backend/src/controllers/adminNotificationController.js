const { sendNotification, sendBulkNotification, sendNotificationToAll } = require('../utils/notificationSender');
const pool = require('../config/database');
const Admin = require('../models/Admin');

exports.sendNotification = async (req, res, next) => {
  try {
    const { recipientType, recipientIds, message, type = 'info', link } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'نص الإشعار مطلوب'
      });
    }

    let result;

    if (recipientType === 'all') {
      result = await sendNotificationToAll(message, type, link);
    } else if (recipientType === 'specific' && recipientIds && recipientIds.length > 0) {
      result = await sendBulkNotification(recipientIds, message, type, link);
    } else {
      return res.status(400).json({
        success: false,
        message: 'نوع المستلمين غير صحيح'
      });
    }

    if (result) {
      // تسجيل النشاط
      await Admin.logActivity(req.admin.id, 'send_notification', { 
        recipientType, 
        message: message.substring(0, 50) + (message.length > 50 ? '...' : '') 
      }, req.ip);

      res.json({
        success: true,
        message: 'تم إرسال الإشعار بنجاح'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'فشل إرسال الإشعار'
      });
    }
  } catch (error) {
    next(error);
  }
};
