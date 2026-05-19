const pool = require('./database');

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 جاري إنشاء الجداول...');
    
    await client.query('BEGIN');

    // 1. جدول المستخدمين (الطلبة)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        device_id VARCHAR(500) NOT NULL,
        fingerprint TEXT,
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_points INTEGER DEFAULT 0,
        is_blocked BOOLEAN DEFAULT FALSE,
        blocked_reason TEXT,
        last_login TIMESTAMP,
        last_ip VARCHAR(100),
        last_user_agent TEXT,
        failed_attempts INTEGER DEFAULT 0,
        last_failed_attempt TIMESTAMP,
        questions_count INTEGER DEFAULT 0,
        last_question_month INTEGER,
        last_question_year INTEGER
      )
    `);
    console.log('✅ جدول users تم إنشاؤه');

    // 2. جدول المشرفين
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        permissions JSONB DEFAULT '{"subjects": true, "exams": true, "students": true, "questions": true, "stats": true}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_super_admin BOOLEAN DEFAULT FALSE
      )
    `);
    console.log('✅ جدول admins تم إنشاؤه');

    // 3. جدول الترمات
    await client.query(`
      CREATE TABLE IF NOT EXISTS terms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول terms تم إنشاؤه');

    // 4. جدول المواد
    await client.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        term_id INTEGER REFERENCES terms(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        cover_image VARCHAR(500),
        status VARCHAR(50) DEFAULT 'open',
        scheduled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES admins(id),
        is_published BOOLEAN DEFAULT TRUE
      )
    `);
    console.log('✅ جدول subjects تم إنشاؤه');

    // 5. جدول ملفات PDF
    await client.query(`
      CREATE TABLE IF NOT EXISTS pdfs (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_size INTEGER,
        downloads_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول pdfs تم إنشاؤه');

    // 6. جدول الصور
    await client.query(`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        title VARCHAR(255),
        file_url VARCHAR(500) NOT NULL,
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول images تم إنشاؤه');

    // 7. جدول الامتحانات
    await client.query(`
      CREATE TABLE IF NOT EXISTS exams (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        open_at TIMESTAMP,
        close_at TIMESTAMP,
        pass_percentage INTEGER DEFAULT 80,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(subject_id, level)
      )
    `);
    console.log('✅ جدول exams تم إنشاؤه');

    // 8. جدول الأسئلة
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('multiple', 'true_false')),
        options JSONB,
        correct_answer VARCHAR(10) NOT NULL,
        question_order INTEGER DEFAULT 0
      )
    `);
    console.log('✅ جدول questions تم إنشاؤه');

    // 9. جدول محاولات الامتحانات
    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
        score DECIMAL(5,2) NOT NULL,
        passed BOOLEAN DEFAULT FALSE,
        answers JSONB NOT NULL,
        attempt_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول exam_attempts تم إنشاؤه');

    // 10. جدول سجل النقاط
    await client.query(`
      CREATE TABLE IF NOT EXISTS points_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(100) NOT NULL,
        points INTEGER NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول points_log تم إنشاؤه');

    // 11. جدول الإشعارات
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        link VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول notifications تم إنشاؤه');

    // 12. جدول أسئلة الطلبة للأدمن
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_questions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        admin_reply TEXT,
        replied_at TIMESTAMP,
        replied_by INTEGER REFERENCES admins(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_replied BOOLEAN DEFAULT FALSE
      )
    `);
    console.log('✅ جدول student_questions تم إنشاؤه');

    // 13. جدول التقييمات
    await client.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, subject_id)
      )
    `);
    console.log('✅ جدول ratings تم إنشاؤه');

    // 14. جدول سجل نشاط الأدمن
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
        action VARCHAR(255) NOT NULL,
        details JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول activity_log تم إنشاؤه');

    // 15. جدول المحظورين
    await client.query(`
      CREATE TABLE IF NOT EXISTS blocked_list (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        ip_address VARCHAR(100),
        device_id VARCHAR(500),
        fingerprint TEXT,
        reason TEXT,
        blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        blocked_by INTEGER REFERENCES admins(id),
        expires_at TIMESTAMP
      )
    `);
    console.log('✅ جدول blocked_list تم إنشاؤه');

    // 16. جدول مخالفات الطلاب
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_violations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
        violation_type VARCHAR(100) NOT NULL,
        description TEXT,
        evidence_url VARCHAR(500),
        severity VARCHAR(50) DEFAULT 'low',
        reported_by INTEGER REFERENCES admins(id),
        action_taken TEXT,
        details JSONB,
        ip_address VARCHAR(100),
        device_id VARCHAR(500),
        fingerprint TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول student_violations تم إنشاؤه');

    await client.query('COMMIT');
    
    console.log('');
    console.log('🎉 تم إنشاء جميع الجداول بنجاح!');
    console.log('📊 عدد الجداول: 16');
    console.log('');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ في إنشاء الجداول:', error.message);
    throw error;
  } finally {
    client.release();
    if (require.main === module) {
      await pool.end();
      process.exit(0);
    }
  }
};

if (require.main === module) {
  createTables();
}

module.exports = createTables;
