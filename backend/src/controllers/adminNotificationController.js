const { sendNotificationToAll, sendNotificationToGroup } = require('../utils/notificationSender');
const Admin = require('../models/Admin');

exports.sendCustomNotification = async (req, res, next) => {
  try {
    const { message, type, link, userIds } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'نص الإشعار مطلوب'
      });
    }

    let result;

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      result = await sendNotificationToGroup(userIds, message, type, link);
    } else {
      result = await sendNotificationToAll(message, type, link);
    }

    await Admin.logActivity(req.admin.id, 'send_notification', { message, count: result.count }, req.ip);

    res.json({
      success: true,
      message: `تم إرسال الإشعار إلى ${result.count} طالب`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
