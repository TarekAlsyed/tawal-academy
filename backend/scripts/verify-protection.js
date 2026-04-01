const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyAllBackups() {
  const uploadsPath = process.env.NODE_ENV === 'production' 
    ? '/app/uploads' 
    : path.join(__dirname, '../uploads');

  console.log('--- 🛡️ التحقق النهائي من تأمين الصور ---');

  try {
    const subjects = await pool.query('SELECT id, name, cover_image FROM subjects');
    console.log(`\n🔹 فحص تأمين أغلفة المواد (${subjects.rows.length} مادة):`);
    
    let securedCount = 0;
    for (const sub of subjects.rows) {
      if (sub.cover_image) {
        // التحقق من وجود نسخة احتياطية في قاعدة البيانات
        const backup = await pool.query(
          'SELECT saved_path FROM auto_saved_images WHERE original_path = $1 LIMIT 1',
          [sub.cover_image]
        );
        
        const hasBackupRecord = backup.rows.length > 0;
        let hasBackupFile = false;
        
        if (hasBackupRecord) {
            const relativePath = backup.rows[0].saved_path.replace('/uploads/', '').replace('/permanent_storage/', 'permanent_storage/');
            const absoluteSavedPath = path.join(uploadsPath, relativePath);
            hasBackupFile = fs.existsSync(absoluteSavedPath);
        }

        console.log(`- [${sub.name}]: ${hasBackupRecord && hasBackupFile ? '✅ مؤمنة تماماً' : '⚠️ قيد التأمين...'}`);
        if (hasBackupRecord && hasBackupFile) securedCount++;
      }
    }

    console.log(`\n✨ النتيجة: تم تأمين ${securedCount} من أصل ${subjects.rows.length} مادة في نظام التخزين الدائم.`);
    
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

verifyAllBackups();
