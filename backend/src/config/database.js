const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ تحذير: DATABASE_URL غير محدد في المتغيرات البيئية');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => {
  console.log('✅ متصل بقاعدة البيانات بنجاح');
});

pool.on('error', (err) => {
  console.error('❌ خطأ مفاجئ في قاعدة البيانات:', err);
});

// Test connection
const testConnection = async () => {
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
};

testConnection();

module.exports = pool;
