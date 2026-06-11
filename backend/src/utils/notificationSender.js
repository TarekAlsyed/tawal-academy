const pool = require('../config/database');
const nodemailer = require('nodemailer');
const axios = require('axios');
const { decrypt } = require('./encryption');

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

const sendFcmPushNotification = async (tokens, title, body, link = null) => {
  try {
    const admin = require('../config/firebase');
    if (!admin || !admin.apps || admin.apps.length === 0) {
      console.warn('[FCM] Firebase not initialized, skipping push notification');
      return false;
    }

    if (!tokens || tokens.length === 0) return false;

    const payload = {
      notification: { 
        title, 
        body 
      },
      data: { 
        link: link || '/',
        title: title || '',
        body: body || '',
        timestamp: new Date().toISOString()
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'tawal_academy_notifications',
          priority: 'max',
          defaultSound: true,
          defaultVibrateTimings: true,
          visibility: 'public',
          icon: 'ic_launcher',
          color: '#6366f1',
        },
        // Ensure delivery even in Doze mode
        ttl: 86400000, // 24 hours in milliseconds
      },
      // APNs config for iOS (future-proofing)
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: 'default',
            badge: 1,
            'content-available': 1,
          },
        },
        headers: {
          'apns-priority': '10',
        },
      },
      tokens: tokens
    };

    const response = await admin.messaging().sendEachForMulticast(payload);
    console.log(`[FCM] Sent: ${response.successCount} success, ${response.failureCount} failed`);
    
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`[FCM] Token ${idx} error:`, resp.error?.code, resp.error?.message);
          if (resp.error.code === 'messaging/invalid-registration-token' ||
              resp.error.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[idx]);
          }
        }
      });
      
      if (invalidTokens.length > 0) {
        const pool = require('../config/database');
        const placeholders = invalidTokens.map((_, i) => `$${i + 1}`).join(',');
        await pool.query(`UPDATE users SET fcm_token = NULL WHERE fcm_token IN (${placeholders})`, invalidTokens)
          .catch(err => console.error('[FCM] Error clearing invalid tokens:', err));
        console.log(`[FCM] Cleared ${invalidTokens.length} invalid tokens`);
      }
    }
    return true;
  } catch (error) {
    console.error('[FCM] Error sending push notification:', error);
    return false;
  }
};

const sendNotification = async (userId, message, type = 'info', link = null) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, message, type, link)
       VALUES ($1, $2, $3, $4)`,
      [userId, message, type, link]
    );

    // Fetch user FCM token
    const res = await pool.query('SELECT fcm_token FROM users WHERE id = $1', [userId]);
    let token = res.rows[0]?.fcm_token;
    if (token) {
      try {
        token = decrypt(token);
        await sendFcmPushNotification([token], 'أكاديمية طوال', message, link);
      } catch (err) {
        console.error('Failed to decrypt token:', err.message);
      }
    }

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
};

const sendBulkNotification = async (userIds, message, type = 'info', link = null) => {
  const client = await pool.connect();
  let tokens = [];
  try {
    await client.query('BEGIN');
    
    for (const userId of userIds) {
      await client.query(
        `INSERT INTO notifications (user_id, message, type, link)
         VALUES ($1, $2, $3, $4)`,
        [userId, message, type, link]
      );
    }
    
    // Fetch tokens
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
    const res = await client.query(`SELECT fcm_token FROM users WHERE id IN (${placeholders}) AND fcm_token IS NOT NULL`, userIds);
    tokens = res.rows.map(r => {
      try { return decrypt(r.fcm_token); } catch(e) { return null; }
    }).filter(Boolean);

    await client.query('COMMIT');
    
    if (tokens.length > 0) {
      await sendFcmPushNotification(tokens, 'أكاديمية طوال', message, link);
    }
    
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
    // 🚀 O(1) bulk insert directly inside postgres
    await pool.query(
      `INSERT INTO notifications (user_id, message, type, link)
       SELECT id, $1, $2, $3 FROM users WHERE is_blocked = FALSE`,
      [message, type, link]
    );

    // Fetch all tokens
    const res = await pool.query('SELECT fcm_token FROM users WHERE is_blocked = FALSE AND fcm_token IS NOT NULL');
    const tokens = res.rows.map(r => {
      try { return decrypt(r.fcm_token); } catch(e) { return null; }
    }).filter(Boolean);
    if (tokens.length > 0) {
      // Chunk tokens in batches of 500 (Firebase Multicast limit)
      const chunkSize = 500;
      for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize);
        await sendFcmPushNotification(chunk, 'أكاديمية طوال', message, link);
      }
    }

    return true;
  } catch (error) {
    console.error('Error sending notification to all:', error);
    return false;
  }
};

const notifyEvent = async (eventName, data, link = null) => {
  try {
    let message = '';
    let type = 'info';
    
    // Add Egyptian time to the message
    const egyptTime = new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', hour12: true });

    switch(eventName) {
      case 'new_subject':
        message = `تمت إضافة مادة جديدة (${data.subjectName}) بتاريخ ${egyptTime}`;
        type = 'new_subject';
        break;
      case 'update_subject':
        message = `تم تحديث بيانات مادة (${data.subjectName}) بتاريخ ${egyptTime}`;
        type = 'update_subject';
        break;
      case 'new_term':
        message = `تمت إضافة ترم دراسي جديد (${data.termName}) بتاريخ ${egyptTime}`;
        type = 'new_term';
        break;
      case 'update_term':
        message = `تم تحديث ترم دراسي (${data.termName}) بتاريخ ${egyptTime}`;
        type = 'update_term';
        break;
      case 'new_pdf':
        message = `تمت إضافة ${data.count} ملفات PDF جديدة في مادة (${data.subjectName}) بتاريخ ${egyptTime}`;
        type = 'new_content';
        break;
      case 'new_image':
        message = `تمت إضافة ${data.count} صور جديدة في مادة (${data.subjectName}) بتاريخ ${egyptTime}`;
        type = 'new_content';
        break;
      case 'delete_pdf':
        message = `تم إزالة ملف من مادة (${data.subjectName}) بتاريخ ${egyptTime}`;
        type = 'delete_content';
        break;
      case 'delete_image':
        message = `تم إزالة صورة من مادة (${data.subjectName}) بتاريخ ${egyptTime}`;
        type = 'delete_content';
        break;
      case 'new_exam':
        message = `تم نشر امتحان جديد (${data.examName}) في مادة (${data.subjectName}) بتاريخ ${egyptTime}`;
        type = 'new_exam';
        break;
      case 'delete_exam':
        message = `تم إزالة امتحان من مادة (${data.subjectName}) بتاريخ ${egyptTime}`;
        type = 'delete_content';
        break;
      case 'update_exam':
        message = `تم تحديث بيانات امتحان (${data.examName}) في مادة (${data.subjectName}) بتاريخ ${egyptTime}`;
        type = 'update_exam';
        break;
      case 'new_questions':
        message = `تمت إضافة أسئلة جديدة لامتحان (${data.examName}) بتاريخ ${egyptTime}`;
        type = 'new_questions';
        break;
      case 'reply_question':
        // For replying to a specific student
        message = `تم الرد على سؤالك بخصوص (${data.questionText}) بتاريخ ${egyptTime}`;
        type = 'admin_reply';
        return await sendNotification(data.userId, message, type, link);
      default:
        message = `حدث جديد على المنصة بتاريخ ${egyptTime}`;
    }

    return await sendNotificationToAll(message, type, link);
  } catch (error) {
    console.error('Error in notifyEvent:', error);
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
  notifyEvent,
  notifyLevelPassed,
  sendAdminAlert
};
