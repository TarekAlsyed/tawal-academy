const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ تحذير: DATABASE_URL غير محدد في المتغيرات البيئية');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase pooler uses certs not in Node's trust store; connection is still encrypted
  // 🕒 إعدادات توفير الطاقة
  max: 10, // تقليل الحد الأقصى للاتصالات لتوفير الموارد
  idleTimeoutMillis: 30000, // إغلاق الاتصالات غير النشطة بعد 30 ثانية (يسمح لـ Neon بالنوم)
  connectionTimeoutMillis: 2000, // وقت انتظار قصير للاتصال الجديد
});

pool.on('connect', () => {
  console.log('✅ متصل بقاعدة البيانات بنجاح');
});

pool.on('error', (err) => {
  console.error('❌ خطأ مفاجئ في قاعدة البيانات:', err);
});

// Test connection (Disabled by default to save Neon CU-hrs on restarts)
const testConnection = async () => {
  if (process.env.NODE_ENV === 'development') {
    if (!process.env.DATABASE_URL) {
      console.error('❌ فشل اختبار الاتصال: DATABASE_URL غير موجود');
      return;
    }
    try {
      const client = await pool.connect();
      console.log('✅ تم اختبار الاتصال بقاعدة البيانات بنجاح');
      client.release();
    } catch (err) {
      console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message);
    }
  }
};

// testConnection(); // تم تعطيله لتوفير الموارد في Neon

module.exports = pool;
