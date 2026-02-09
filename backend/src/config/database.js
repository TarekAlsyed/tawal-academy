const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('✅ متصل بقاعدة البيانات بنجاح');
});

pool.on('error', (err) => {
  console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err);
  process.exit(-1);
});

// Test connection
const testConnection = async () => {
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
