const pool = require('./database');

const createIndexes = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 جاري إنشاء الفهارس (Indexes)...');
    
    await client.query('BEGIN');

    const runQuery = async (name, sql) => {
      try {
        await client.query(sql);
        console.log(`✅ ${name} تم بنجاح`);
      } catch (err) {
        console.warn(`⚠️ ${name}:`, err.message);
        // We use warn because the index might already exist
      }
    };

    // 1. Users
    await runQuery('فهرس users_email', 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await runQuery('فهرس users_registration_date', 'CREATE INDEX IF NOT EXISTS idx_users_registration_date ON users(registration_date)');
    await runQuery('فهرس users_is_blocked', 'CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked)');

    // 2. Admins
    await runQuery('فهرس admins_email', 'CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email)');

    // 3. Subjects
    await runQuery('فهرس subjects_term_id', 'CREATE INDEX IF NOT EXISTS idx_subjects_term_id ON subjects(term_id)');
    await runQuery('فهرس subjects_created_at', 'CREATE INDEX IF NOT EXISTS idx_subjects_created_at ON subjects(created_at)');
    await runQuery('فهرس subjects_is_published', 'CREATE INDEX IF NOT EXISTS idx_subjects_is_published ON subjects(is_published)');

    // 4. Exams
    await runQuery('فهرس exams_subject_id', 'CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON exams(subject_id)');
    await runQuery('فهرس exams_level', 'CREATE INDEX IF NOT EXISTS idx_exams_level ON exams(level)');
    await runQuery('فهرس exams_created_at', 'CREATE INDEX IF NOT EXISTS idx_exams_created_at ON exams(created_at)');
    await runQuery('فهرس exams_is_published', 'CREATE INDEX IF NOT EXISTS idx_exams_is_published ON exams(is_published)');

    // 5. Exam Attempts
    await runQuery('فهرس exam_attempts_user_id', 'CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON exam_attempts(user_id)');
    await runQuery('فهرس exam_attempts_exam_id', 'CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON exam_attempts(exam_id)');
    await runQuery('فهرس exam_attempts_attempt_date', 'CREATE INDEX IF NOT EXISTS idx_exam_attempts_attempt_date ON exam_attempts(attempt_date)');
    await runQuery('فهرس exam_attempts_status', 'CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status)');

    // 6. Notifications
    await runQuery('فهرس notifications_user_id', 'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)');
    await runQuery('فهرس notifications_is_read', 'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)');
    await runQuery('فهرس notifications_created_at', 'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)');

    // 7. Student Questions
    await runQuery('فهرس student_questions_user_id', 'CREATE INDEX IF NOT EXISTS idx_student_questions_user_id ON student_questions(user_id)');
    await runQuery('فهرس student_questions_is_replied', 'CREATE INDEX IF NOT EXISTS idx_student_questions_is_replied ON student_questions(is_replied)');
    await runQuery('فهرس student_questions_created_at', 'CREATE INDEX IF NOT EXISTS idx_student_questions_created_at ON student_questions(created_at)');

    // 8. Activity Log
    await runQuery('فهرس activity_log_user_id', 'CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id)');
    await runQuery('فهرس activity_log_admin_id', 'CREATE INDEX IF NOT EXISTS idx_activity_log_admin_id ON activity_log(admin_id)');
    await runQuery('فهرس activity_log_created_at', 'CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at)');
    await runQuery('فهرس activity_log_action', 'CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action)');

    // 9. Sessions
    await runQuery('فهرس sessions_admin_id', 'CREATE INDEX IF NOT EXISTS idx_sessions_admin_id ON sessions(admin_id)');
    await runQuery('فهرس sessions_token_id', 'CREATE INDEX IF NOT EXISTS idx_sessions_token_id ON sessions(token_id)');
    await runQuery('فهرس sessions_is_active', 'CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active)');

    // 10. Security Audit Logs
    await runQuery('فهرس security_audit_logs_ip', 'CREATE INDEX IF NOT EXISTS idx_security_audit_logs_ip ON security_audit_logs(ip_address)');
    await runQuery('فهرس security_audit_logs_threat', 'CREATE INDEX IF NOT EXISTS idx_security_audit_logs_threat ON security_audit_logs(threat_type)');
    await runQuery('فهرس security_audit_logs_created_at', 'CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON security_audit_logs(created_at)');

    // 11. System Errors
    await runQuery('فهرس system_errors_is_resolved', 'CREATE INDEX IF NOT EXISTS idx_system_errors_is_resolved ON system_errors(is_resolved)');
    await runQuery('فهرس system_errors_created_at', 'CREATE INDEX IF NOT EXISTS idx_system_errors_created_at ON system_errors(created_at)');
    await runQuery('فهرس system_errors_error_hash', 'CREATE INDEX IF NOT EXISTS idx_system_errors_error_hash ON system_errors(error_hash)');

    // 12. Question Bank
    await runQuery('فهرس question_bank_subject_id', 'CREATE INDEX IF NOT EXISTS idx_question_bank_subject_id ON question_bank(subject_id)');
    await runQuery('فهرس question_bank_type', 'CREATE INDEX IF NOT EXISTS idx_question_bank_type ON question_bank(type)');
    await runQuery('فهرس question_bank_difficulty', 'CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON question_bank(difficulty_level)');

    // 13. Exam Questions
    await runQuery('فهرس exam_questions_exam_id', 'CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions(exam_id)');
    await runQuery('فهرس exam_questions_bank_id', 'CREATE INDEX IF NOT EXISTS idx_exam_questions_bank_id ON exam_questions(question_bank_id)');

    // 14. Student Violations
    await runQuery('فهرس student_violations_user_id', 'CREATE INDEX IF NOT EXISTS idx_student_violations_user_id ON student_violations(user_id)');
    await runQuery('فهرس student_violations_type', 'CREATE INDEX IF NOT EXISTS idx_student_violations_type ON student_violations(violation_type)');
    await runQuery('فهرس student_violations_created_at', 'CREATE INDEX IF NOT EXISTS idx_student_violations_created_at ON student_violations(created_at)');

    // 15. Blocked List
    await runQuery('فهرس blocked_list_email', 'CREATE INDEX IF NOT EXISTS idx_blocked_list_email ON blocked_list(email)');
    await runQuery('فهرس blocked_list_device_id', 'CREATE INDEX IF NOT EXISTS idx_blocked_list_device_id ON blocked_list(device_id)');
    await runQuery('فهرس blocked_list_fingerprint', 'CREATE INDEX IF NOT EXISTS idx_blocked_list_fingerprint ON blocked_list(fingerprint)');

    await client.query('COMMIT');
    console.log('🚀 تمت إضافة جميع الفهارس بنجاح');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ خطأ في إنشاء الفهارس:', error.message);
  } finally {
    client.release();
  }
};

module.exports = createIndexes;

if (require.main === module) {
  createIndexes()
    .then(() => {
      console.log('✅ تم الانتهاء من إضافة الفهارس');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ فشل إضافة الفهارس:', err);
      process.exit(1);
    });
}
