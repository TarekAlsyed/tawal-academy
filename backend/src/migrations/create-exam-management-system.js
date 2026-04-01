const pool = require('../config/database');

const createExamManagementSystem = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 جاري إنشاء نظام إدارة الامتحانات الرقمي المتقدم...');
    await client.query('BEGIN');

    // 1. جدول مخالفات الطلاب (Student Violations) - للغش الإلكتروني
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_violations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
        violation_type VARCHAR(100) NOT NULL, -- 'cheat', 'browser_switch', etc.
        description TEXT,
        evidence_url VARCHAR(500),
        severity VARCHAR(20) DEFAULT 'medium',
        reported_by INTEGER REFERENCES admins(id),
        action_taken TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ جدول مخالفات الطلاب تم بنجاح');

    // 2. تحديث جدول الامتحانات لإضافة حقول جديدة رقمية
    await client.query(`
      ALTER TABLE exams 
      ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'online',
      ADD COLUMN IF NOT EXISTS allowed_attempts INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS show_result_immediately BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS proctoring_enabled BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 30
    `);
    console.log('✅ تم تحديث جدول الامتحانات بالحقول الرقمية الجديدة');

    // 3. إضافة حقول للتصحيح الذكي في محاولات الامتحانات
    await client.query(`
      ALTER TABLE exam_attempts 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed',
      ADD COLUMN IF NOT EXISTS is_manual_grading BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS ai_grading_data JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS ai_status VARCHAR(50) DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS ai_suggested_score DECIMAL(5,2)
    `);
    console.log('✅ تم إضافة حقول التصحيح الذكي والحالة لجدول المحاولات');

    // 4. إنشاء الفهارس (Indexes) للأداء
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_student_violations_user ON student_violations(user_id);
      CREATE INDEX IF NOT EXISTS idx_student_violations_exam ON student_violations(exam_id);
    `);

    await client.query('COMMIT');
    console.log('🚀 تم إنشاء نظام إدارة الامتحانات الرقمي بنجاح!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ في إنشاء النظام:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// تنفيذ Migration إذا تم تشغيله مباشرة
if (require.main === module) {
  createExamManagementSystem()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = createExamManagementSystem;
