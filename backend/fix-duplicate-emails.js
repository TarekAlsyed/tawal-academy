const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./src/config/database');

const fixDuplicateEmails = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 جاري إصلاح مشكلة الإيميلات المكررة...');
    console.log('');

    await client.query('BEGIN');

    // 1. حذف القيد الفريد القديم (email, device_id)
    await client.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_email_device_id_key;
    `);
    console.log('✅ تم حذف القيد القديم');

    // 2. التأكد من وجود القيد الصحيح فقط على email
    await client.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_email_key;
    `);
    
    await client.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_email_key UNIQUE (email);
    `);
    console.log('✅ تم إضافة القيد الجديد على email فقط');

    // 3. حذف السجلات المكررة (نحتفظ بأول سجل فقط)
    await client.query(`
      DELETE FROM users a
      USING users b
      WHERE a.id > b.id
      AND a.email = b.email;
    `);
    console.log('✅ تم حذف السجلات المكررة');

    await client.query('COMMIT');
    
    console.log('');
    console.log('✅ تم إصلاح قاعدة البيانات بنجاح!');
    console.log('');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
};

fixDuplicateEmails();
