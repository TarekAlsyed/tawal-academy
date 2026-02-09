const bcrypt = require('bcryptjs');
const pool = require('./src/config/database');

const createSuperAdmin = async () => {
  try {
    console.log('🔄 جاري إنشاء المشرف الأعلى...');
    console.log('');
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const result = await pool.query(
      `INSERT INTO admins (name, email, password, is_super_admin, permissions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, is_super_admin, created_at`,
      [
        'Super Admin',
        'admin@tawal.com',
        hashedPassword,
        true,
        JSON.stringify({
          subjects: true,
          exams: true,
          students: true,
          questions: true,
          stats: true
        })
      ]
    );

    console.log('✅ تم إنشاء المشرف الأعلى بنجاح!');
    console.log('════════════════════════════════════════');
    console.log('📧 الإيميل: admin@tawal.com');
    console.log('🔑 كلمة المرور: admin123');
    console.log('════════════════════════════════════════');
    console.log('');
    console.log('معلومات المشرف:');
    console.log(result.rows[0]);
    console.log('');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    if (error.code === '23505') {
      console.error('❌ المشرف موجود بالفعل! الإيميل admin@tawal.com مستخدم.');
    } else {
      console.error('❌ خطأ:', error.message);
    }
    await pool.end();
    process.exit(1);
  }
};

createSuperAdmin();
