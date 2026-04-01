const pool = require('./database');

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 جاري إنشاء الجداول...');
    
    // Check if we're in production to log more details
    const isProduction = process.env.NODE_ENV === 'production';
    
    await client.query('BEGIN');

    // We'll run each query individually for better error tracking
    const runQuery = async (name, sql) => {
      try {
        await client.query(sql);
        console.log(`✅ ${name} تم بنجاح`);
      } catch (err) {
        console.error(`❌ خطأ في ${name}:`, err.message);
        throw err;
      }
    };

    // Ensure columns exist for existing tables
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_reason TEXT`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await client.query(`UPDATE users SET total_points = 0 WHERE total_points IS NULL`);

    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255)`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS permissions_detailed JSONB DEFAULT '{}'::jsonb`);
    await client.query(`ALTER TABLE admins ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

    await client.query(`ALTER TABLE terms ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await client.query(`ALTER TABLE terms ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`);

    await client.query(`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE`);
    await client.query(`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await client.query(`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'open'`);

    await client.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation TEXT`);
    await client.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_order INTEGER DEFAULT 0`);

    // 1. جدول المستخدمين (الطلبة)
    await runQuery('جدول users', `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        device_id VARCHAR(500) NOT NULL,
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_points INTEGER DEFAULT 0,
        is_blocked BOOLEAN DEFAULT FALSE,
        blocked_reason TEXT,
        last_login TIMESTAMP,
        questions_count INTEGER DEFAULT 0,
        last_question_month INTEGER,
        last_question_year INTEGER
      )
    `);

    // 2. جدول المشرفين
    await runQuery('جدول admins', `
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        permissions JSONB DEFAULT '{"subjects": true, "exams": true, "students": true, "questions": true, "stats": true}'::jsonb,
        permissions_detailed JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_super_admin BOOLEAN DEFAULT FALSE,
        mfa_enabled BOOLEAN DEFAULT FALSE,
        mfa_secret VARCHAR(255)
      )
    `);

    // 3. جدول الترمات
    await runQuery('جدول terms', `
      CREATE TABLE IF NOT EXISTS terms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. جدول المواد
    await runQuery('جدول subjects', `
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        term_id INTEGER REFERENCES terms(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        cover_image VARCHAR(500),
        file_url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'open',
        scheduled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES admins(id),
        is_published BOOLEAN DEFAULT TRUE
      )
    `);

    // 5. جدول ملفات PDF
    await runQuery('جدول pdfs', `
      CREATE TABLE IF NOT EXISTS pdfs (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        file_url VARCHAR(500),
        file_size INTEGER,
        downloads_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. جدول الصور
    await runQuery('جدول images', `
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        title VARCHAR(255),
        file_url VARCHAR(500),
        views_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS start_date TIMESTAMP`);
    await client.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS end_date TIMESTAMP`);
    await client.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 30`);
    await client.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS title VARCHAR(255)`);
    await client.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS description TEXT`);
    await client.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10`);
    await client.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 50`);
    await client.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE`);

    // Sync title with name if title is empty
    await client.query(`UPDATE exams SET title = name WHERE title IS NULL`);

    await client.query(`ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS selected_answers JSONB DEFAULT '{}'::jsonb`);

    // 7. جدول الامتحانات
    await runQuery('جدول exams', `
      CREATE TABLE IF NOT EXISTS exams (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
        name VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        status VARCHAR(50) DEFAULT 'open',
        time_limit INTEGER DEFAULT 30,
        open_at TIMESTAMP,
        close_at TIMESTAMP,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        is_published BOOLEAN DEFAULT TRUE,
        pass_percentage INTEGER DEFAULT 80,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(subject_id, level)
      )
    `);

    // 8. جدول الأسئلة (سيتم اعتباره جدول ربط لاحقاً أو استبداله بـ exam_questions)
    await runQuery('جدول questions', `
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
        question_bank_id INTEGER,
        question_text TEXT NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('multiple', 'true_false', 'essay', 'matching', 'fill_blanks')),
        options JSONB,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        question_order INTEGER DEFAULT 0,
        points INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // إضافة الأعمدة المفقودة إذا كان الجدول موجوداً مسبقاً
    await client.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_bank_id INTEGER`);
    await client.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 10`);
    await client.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

    // 24. جدول بنك الأسئلة المركزي (جديد)
    await runQuery('جدول question_bank', `
      CREATE TABLE IF NOT EXISTS question_bank (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
        question_text TEXT NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('multiple', 'true_false', 'essay', 'matching', 'fill_blanks')),
        options JSONB,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        difficulty_level INTEGER DEFAULT 1,
        tags JSONB DEFAULT '[]'::jsonb,
        created_by INTEGER REFERENCES admins(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 25. جدول ربط الأسئلة بالامتحانات (جديد)
    await runQuery('جدول exam_questions', `
      CREATE TABLE IF NOT EXISTS exam_questions (
        id SERIAL PRIMARY KEY,
        exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
        question_bank_id INTEGER REFERENCES question_bank(id) ON DELETE CASCADE,
        question_order INTEGER DEFAULT 0,
        points INTEGER DEFAULT 10,
        UNIQUE(exam_id, question_bank_id)
      )
    `);

    // 9. جدول محاولات الامتحانات
    await runQuery('جدول exam_attempts', `
      CREATE TABLE IF NOT EXISTS exam_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
        score DECIMAL(5,2) DEFAULT 0,
        passed BOOLEAN DEFAULT FALSE,
        answers JSONB NOT NULL,
        selected_answers JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(20) DEFAULT 'completed', -- 'completed', 'pending_grading'
        is_manual_grading BOOLEAN DEFAULT FALSE,
        attempt_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. جدول سجل النقاط
    await runQuery('جدول points_log', `
      CREATE TABLE IF NOT EXISTS points_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(100) NOT NULL,
        points INTEGER NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 11. جدول الإشعارات
    await runQuery('جدول notifications', `
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

    // 12. جدول أسئلة الطلبة للأدمن
    await runQuery('جدول student_questions', `
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

    // 13. جدول التقييمات
    await runQuery('جدول ratings', `
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, subject_id)
      )
    `);

    // 14. جدول سجل نشاط الأدمن والطلبة
    await runQuery('جدول activity_log', `
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        details JSONB DEFAULT '{}'::jsonb,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 15. جدول الجلسات النشطة (Active Sessions)
    await runQuery('جدول sessions', `
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id INTEGER REFERENCES admins(id) ON DELETE CASCADE,
        token_id VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    // 16. سجلات الأمان المتقدمة
    await runQuery('جدول security_audit_logs', `
      CREATE TABLE IF NOT EXISTS security_audit_logs (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(45),
        user_agent TEXT,
        path TEXT,
        method VARCHAR(10),
        threat_type VARCHAR(100),
        payload JSONB,
        severity VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 17. القائمة السوداء للـ IP
    await runQuery('جدول ip_blacklist', `
      CREATE TABLE IF NOT EXISTS ip_blacklist (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(45) UNIQUE NOT NULL,
        reason TEXT,
        attempts_count INTEGER DEFAULT 1,
        blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);

    // 18. جدول حفظ تقدم الامتحان وجلسات الامتحانات النشطة
    await runQuery('جدول exam_progress', `
      CREATE TABLE IF NOT EXISTS exam_progress (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
        answers JSONB NOT NULL,
        selected_answers JSONB DEFAULT '{}'::jsonb,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, exam_id)
      )
    `);

    // Ensure columns exist for exam_progress
    await client.query(`ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await client.query(`ALTER TABLE exam_progress ADD COLUMN IF NOT EXISTS end_time TIMESTAMP`);

    // 19. جدول طلبات الموافقة المعلقة
    await runQuery('جدول pending_approvals', `
      CREATE TABLE IF NOT EXISTS pending_approvals (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES admins(id),
        action_type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_data JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        reviewed_by INTEGER REFERENCES admins(id),
        rejection_reason TEXT,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure columns exist for pending_approvals (Migration)
    await client.query(`ALTER TABLE pending_approvals ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES admins(id)`);
    await client.query(`ALTER TABLE pending_approvals ADD COLUMN IF NOT EXISTS action_type VARCHAR(100)`);
    await client.query(`ALTER TABLE pending_approvals ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100)`);
    await client.query(`ALTER TABLE pending_approvals ADD COLUMN IF NOT EXISTS entity_data JSONB`);
    await client.query(`ALTER TABLE pending_approvals ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);
    await client.query(`ALTER TABLE pending_approvals ADD COLUMN IF NOT EXISTS review_notes TEXT`);
    await client.query(`ALTER TABLE pending_approvals ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP`);


    // 20. جدول الأخطاء البرمجية
    await runQuery('جدول system_errors', `
      CREATE TABLE IF NOT EXISTS system_errors (
        id SERIAL PRIMARY KEY,
        error_type VARCHAR(100),
        message TEXT,
        stack_trace TEXT,
        component VARCHAR(100),
        severity VARCHAR(20) DEFAULT 'medium',
        impact_level VARCHAR(20) DEFAULT 'low',
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        details JSONB DEFAULT '{}'::jsonb,
        repetition_count INTEGER DEFAULT 1,
        is_resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMP,
        resolved_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        last_occurrence TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        error_hash VARCHAR(64),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Ensure columns exist for existing tables (migration)
    await client.query(`ALTER TABLE system_errors ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE system_errors ADD COLUMN IF NOT EXISTS resolved_by INTEGER REFERENCES admins(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE system_errors ADD COLUMN IF NOT EXISTS last_occurrence TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await client.query(`ALTER TABLE system_errors ADD COLUMN IF NOT EXISTS error_hash VARCHAR(64)`);

    // 21. جدول الفحوصات الأمنية
    await runQuery('جدول security_scans', `
      CREATE TABLE IF NOT EXISTS security_scans (
        id SERIAL PRIMARY KEY,
        scan_type VARCHAR(100),
        target VARCHAR(255),
        findings JSONB DEFAULT '{}'::jsonb,
        threat_level VARCHAR(20) DEFAULT 'low',
        duration_ms INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Ensure columns exist for existing tables (migration)
    await client.query(`ALTER TABLE security_scans ADD COLUMN IF NOT EXISTS target VARCHAR(255)`);
    await client.query(`ALTER TABLE security_scans ADD COLUMN IF NOT EXISTS findings JSONB DEFAULT '{}'::jsonb`);
    await client.query(`ALTER TABLE security_scans ADD COLUMN IF NOT EXISTS duration_ms INTEGER DEFAULT 0`);

    // 22. جدول الصور المحفوظة تلقائياً
    await runQuery('جدول auto_saved_images', `
      CREATE TABLE IF NOT EXISTS auto_saved_images (
        id SERIAL PRIMARY KEY,
        original_filename VARCHAR(255),
        original_path VARCHAR(500),
        saved_path VARCHAR(500),
        image_type VARCHAR(100),
        source VARCHAR(255),
        priority INTEGER DEFAULT 2,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Ensure columns exist for existing tables (migration)
    await client.query(`ALTER TABLE auto_saved_images ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255)`);
    await client.query(`ALTER TABLE auto_saved_images ADD COLUMN IF NOT EXISTS original_path VARCHAR(500)`);
    await client.query(`ALTER TABLE auto_saved_images ADD COLUMN IF NOT EXISTS saved_path VARCHAR(500)`);
    await client.query(`ALTER TABLE auto_saved_images ADD COLUMN IF NOT EXISTS image_type VARCHAR(100)`);
    await client.query(`ALTER TABLE auto_saved_images ADD COLUMN IF NOT EXISTS source VARCHAR(255)`);
    await client.query(`ALTER TABLE auto_saved_images ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 2`);

    // 23. جدول التخزين الدائم للصور (Elite Permanent Storage)
    await runQuery('جدول permanent_images', `
      CREATE TABLE IF NOT EXISTS permanent_images (
        id SERIAL PRIMARY KEY,
        cloudinary_public_id VARCHAR(255) UNIQUE,
        cloudinary_url TEXT NOT NULL,
        backup_url TEXT,
        image_data TEXT,
        file_name VARCHAR(255),
        file_size INTEGER,
        mime_type VARCHAR(100),
        folder VARCHAR(100) DEFAULT 'tawal_academy_permanent',
        status VARCHAR(20) DEFAULT 'active',
        last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb
      )
    `);

    // 24. جدول إعدادات النظام
    await runQuery('جدول system_settings', `
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER REFERENCES admins(id)
      )
    `);

    // Insert default settings
    await client.query(`
      INSERT INTO system_settings (key, value, description)
      VALUES 
        ('security_strict_mode', 'false', 'حظر الطلبات بدون توقيع HMAC'),
        ('security_mandatory_mfa', 'false', 'إلزام المشرفين بتفعيل MFA'),
        ('security_auto_blacklist', 'true', 'حظر الـ IPs المشبوهة تلقائياً'),
        ('system_maintenance_mode', 'false', 'وضع الصيانة للمنصة')
      ON CONFLICT (key) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('🚀 تمت تهيئة جميع الجداول بنجاح');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ في إنشاء الجداول:', error.message);
  } finally {
    client.release();
  }
};

module.exports = createTables;

if (require.main === module) {
  createTables()
    .then(() => {
      console.log('✅ تم الانتهاء من تهيئة الجداول');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ فشل تهيئة الجداول:', err);
      process.exit(1);
    });
}
