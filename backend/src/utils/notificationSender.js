const pool = require('../config/database');
const nodemailer = require('nodemailer');
const axios = require('axios');

// Configure Email Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendNotification = async (userId, message, type = 'info', link = null) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, message, type, link)
       VALUES ($1, $2, $3, $4)`,
      [userId, message, type, link]
    );
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
};

const sendBulkNotification = async (userIds, message, type = 'info', link = null) => {
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
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error sending bulk notifications:', error);
    return false;
  } finally {
    client.release();
  }
};

const sendNotificationToAll = async (message, type = 'info', link = null) => {
  try {
    const usersResult = await pool.query('SELECT id FROM users WHERE is_blocked = FALSE');
    const userIds = usersResult.rows.map(row => row.id);
    return await sendBulkNotification(userIds, message, type, link);
  } catch (error) {
    console.error('Error sending notification to all:', error);
    return false;
  }
};

const notifyLevelPassed = async (userId, subjectName, level, score) => {
  const message = `مبروك! لقد نجحت في المستوى ${level} بمادة ${subjectName} بنسبة ${score}% 🎉`;
  return await sendNotification(userId, message, 'success');
};

const sendAdminAlert = async (message, severity = 'high', context = {}) => {
  try {
    const timestamp = new Date().toLocaleString('ar-EG');
    const fullMessage = `[${severity.toUpperCase()}] ${message}\nالوقت: ${timestamp}\nالسياق: ${JSON.stringify(context, null, 2)}`;

    // 1. Log to database for internal Admin Panel alerts
    const admins = await pool.query('SELECT id FROM admins WHERE is_super_admin = TRUE');
    for (const admin of admins.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, message, type)
         VALUES ($1, $2, $3)`,
        [null, `🚨 [ALERT] ${message}`, 'error']
      );
    }

    // 2. Send Email
    if (process.env.ADMIN_EMAIL && process.env.SMTP_USER) {
      transporter.sendMail({
        from: `"Tawal System Alert" <${process.env.SMTP_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `⚠️ Security/Error Alert: ${severity.toUpperCase()}`,
        text: fullMessage,
        html: `<div dir="rtl" style="font-family: Arial, sans-serif; border: 2px solid red; padding: 20px;">
          <h2 style="color: red;">🚨 تنبيه من نظام أكاديمية طوال</h2>
          <p><strong>المستوى:</strong> ${severity.toUpperCase()}</p>
          <p><strong>الرسالة:</strong> ${message}</p>
          <p><strong>الوقت:</strong> ${timestamp}</p>
          <hr/>
          <pre style="background: #f4f4f4; padding: 10px; direction: ltr;">${JSON.stringify(context, null, 2)}</pre>
        </div>`
      }).catch(err => console.error('Email alert failed:', err.message));
    }

    // 3. Send Slack Webhook
    if (process.env.SLACK_WEBHOOK_URL) {
      axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: `🚨 *SYSTEM ALERT [${severity.toUpperCase()}]*\n> ${message}\n_Time: ${timestamp}_`,
        attachments: context ? [{
          color: severity === 'critical' ? '#ff0000' : '#ff9900',
          text: `Context: \`\`\`${JSON.stringify(context, null, 2)}\`\`\``
        }] : []
      }).catch(err => console.error('Slack alert failed:', err.message));
    }

    // 4. Send SMS (Placeholder for SMS Gateway)
    if (process.env.SMS_API_KEY && process.env.ADMIN_PHONE) {
      // Example for a generic SMS API
      axios.post('https://api.sms-gateway.com/send', {
        api_key: process.env.SMS_API_KEY,
        sender: process.env.SMS_SENDER || 'TAWAL',
        to: process.env.ADMIN_PHONE,
        message: `🚨 ALERT: ${message.substring(0, 100)}`
      }).catch(err => console.error('SMS alert failed:', err.message));
    }

    console.log(`📣 ADMIN ALERT [${severity.toUpperCase()}]: ${message}`);
    return true;
  } catch (error) {
    console.error('Error sending multi-channel admin alert:', error);
    return false;
  }
};

module.exports = {
  sendNotification,
  sendBulkNotification,
  sendNotificationToAll,
  notifyLevelPassed,
  sendAdminAlert
};
