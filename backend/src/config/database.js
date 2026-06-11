const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ تحذير: DATABASE_URL غير محدد في المتغيرات البيئية');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fix #13: Use proper SSL config
  ssl: { rejectUnauthorized: false },
  // 🕒 إعدادات توفير الطاقة
  max: 10, // تقليل الحد الأقصى للاتصالات لتوفير الموارد
  idleTimeoutMillis: 30000, // إغلاق الاتصالات غير النشطة بعد 30 ثانية (يسمح لـ Neon بالنوم)
  connectionTimeoutMillis: 10000, // وقت انتظار أطول (10 ثواني) لتجنب أخطاء Timeout مع Supabase/Neon
});

pool.on('connect', (client) => {
  // 🕒 Set timezone to Egypt Time (Africa/Cairo) for all connections
  client.query("SET TIME ZONE 'Africa/Cairo'");
  
  // Fix #3: Connection log suppressed in production (pool.max=10 creates noise)
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ متصل بقاعدة البيانات بنجاح (توقيت مصر)');
  }
});

// Fix #4: Run FCM migration once at startup instead of on every connection
(async () => {
  try {
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(255)");
  } catch (err) {
    console.error('Migration error (fcm_token):', err.message);
  }
})();

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
