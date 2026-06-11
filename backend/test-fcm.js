require('dotenv').config();
const { sendNotificationToAll } = require('./src/utils/notificationSender');
const admin = require('./src/config/firebase');

async function testPush() {
  console.log('Testing push notification...');
  try {
    const res = await sendNotificationToAll('رسالة اختبار من النظام', 'info');
    console.log('Send result:', res);
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}

testPush();
