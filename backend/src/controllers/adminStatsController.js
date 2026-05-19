const pool = require('../config/database');
const ActivityLog = require('../models/ActivityLog');

exports.getDashboardStats = async (req, res, next) => {
  try {
    // Total students
    const studentsCount = await pool.query('SELECT COUNT(*) as count FROM users');
    
    // Total subjects
    const subjectsCount = await pool.query('SELECT COUNT(*) as count FROM subjects WHERE is_deleted = FALSE');
    
    // Total exams - Ensuring we only count active exams with valid subjects
    const examsCount = await pool.query(
      `SELECT COUNT(*) as count FROM exams 
       WHERE is_deleted = FALSE`
    );
    
    // Total exam attempts
    const attemptsCount = await pool.query('SELECT COUNT(*) as count FROM exam_attempts');
    
    // Today's attempts
    const todayAttempts = await pool.query(
      'SELECT COUNT(*) as count FROM exam_attempts WHERE attempt_date >= CURRENT_DATE'
    );
    
    // Top students
    const topStudents = await pool.query(
      'SELECT id, name, total_points FROM users ORDER BY total_points DESC LIMIT 5'
    );
    
    // Top downloaded PDFs
    const topPDFs = await pool.query(
      `SELECT p.id, p.title, p.downloads_count, s.name as subject_name 
       FROM pdfs p 
       JOIN subjects s ON p.subject_id = s.id 
       ORDER BY p.downloads_count DESC LIMIT 5`
    );
    
    // Pending questions
    const pendingQuestions = await pool.query(
      'SELECT COUNT(*) as count FROM student_questions WHERE is_replied = FALSE'
    );

    // عدد الطلاب الفريدين الذين اجتازوا الامتحانات
    const uniquePassedStudents = await pool.query(
      'SELECT COUNT(DISTINCT user_id) as count FROM exam_attempts WHERE passed = TRUE'
    );

    res.json({
      success: true,
      data: {
        stats: {
          total_students: parseInt(studentsCount.rows[0].count),
          total_subjects: parseInt(subjectsCount.rows[0].count),
          total_exams: parseInt(examsCount.rows[0].count),
          total_attempts: parseInt(attemptsCount.rows[0].count),
          today_attempts: parseInt(todayAttempts.rows[0].count),
          pending_questions: parseInt(pendingQuestions.rows[0].count),
          unique_passed_students: parseInt(uniquePassedStudents.rows[0].count)
        },
        top_students: topStudents.rows,
        top_downloaded_pdfs: topPDFs.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getActivityLogs = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, adminId, userId } = req.query;
    const logs = await ActivityLog.findAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      adminId: adminId && adminId !== 'undefined' ? parseInt(adminId) : null,
      userId: userId && userId !== 'undefined' ? parseInt(userId) : null
    });

    res.json({
      success: true,
      data: { logs }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAllActivityLogs = async (req, res, next) => {
  try {
    // Only super admins should be able to clear all logs for safety
    if (!req.admin.is_super_admin) {
      return res.status(403).json({ success: false, message: 'عذراً، هذا الإجراء متاح فقط للمدير العام' });
    }

    await pool.query('DELETE FROM activity_log');
    
    res.json({
      success: true,
      message: 'تم حذف سجل النشاط بالكامل بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// Elite SOC Controllers
// ============================================

exports.getSecurityAuditLogs = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await pool.query(
      `SELECT * FROM security_audit_logs 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );

    res.json({
      success: true,
      data: { logs: result.rows }
    });
  } catch (error) {
    next(error);
  }
};

exports.getIPBlacklist = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM ip_blacklist ORDER BY blocked_at DESC');
    res.json({
      success: true,
      data: { blacklist: result.rows }
    });
  } catch (error) {
    next(error);
  }
};

exports.addToBlacklist = async (req, res, next) => {
  try {
    const { ip, reason } = req.body;
    if (!ip) return res.status(400).json({ success: false, message: 'IP address required' });

    await pool.query(
      `INSERT INTO ip_blacklist (ip_address, reason) 
       VALUES ($1, $2) 
       ON CONFLICT (ip_address) DO UPDATE SET reason = EXCLUDED.reason`,
      [ip, reason || 'Manual block by admin']
    );

    res.json({ success: true, message: `IP ${ip} blocked successfully` });
  } catch (error) {
    next(error);
  }
};

exports.removeFromBlacklist = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM ip_blacklist WHERE id = $1', [id]);
    res.json({ success: true, message: 'IP removed from blacklist' });
  } catch (error) {
    next(error);
  }
};

exports.getStudentLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    console.log(`[DEBUG] Fetching logs for student ID: ${id}`);
    
    const logs = await ActivityLog.findAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      userId: id // نمرر الـ ID كما هو بدون تحويل لـ int هنا لضمان عدم حدوث خطأ إذا كان string
    });

    console.log(`[DEBUG] Found ${logs.length} logs for student ID: ${id}`);

    res.json({
      success: true,
      data: { logs }
    });
  } catch (error) {
    console.error(`[DEBUG ERROR] getStudentLogs: ${error.message}`);
    next(error);
  }
};

// --- التحليل التنبؤي (Predictive Analysis) ---
exports.getPredictiveAnalysis = async (req, res, next) => {
  try {
    const { subjectId } = req.query;
    
    // تحليل أنماط النجاح والرسوب بناءً على المحاولات السابقة
    const stats = await pool.query(`
      SELECT 
        u.id as user_id, u.name,
        COUNT(ea.id) as total_attempts,
        AVG(ea.score) as avg_score,
        COUNT(CASE WHEN ea.passed = TRUE THEN 1 END) as passed_count,
        (SELECT COUNT(*) FROM student_questions WHERE user_id = u.id) as questions_asked
      FROM users u
      LEFT JOIN exam_attempts ea ON u.id = ea.user_id
      GROUP BY u.id, u.name
      HAVING COUNT(ea.id) > 0
    `);

    // خوارزمية بسيطة للتنبؤ (يمكن تطويرها باستخدام نماذج تعلم آلي)
    const predictions = stats.rows.map(student => {
      let riskLevel = 'low';
      let probability = 0.85; // احتمال النجاح

      if (student.avg_score < 60) {
        riskLevel = 'high';
        probability = 0.35;
      } else if (student.avg_score < 80) {
        riskLevel = 'medium';
        probability = 0.65;
      }

      // الطالب الذي يسأل أسئلة أكثر غالباً ما يكون أكثر اهتماماً
      if (student.questions_asked > 5) probability += 0.1;

      return {
        ...student,
        prediction: {
          risk_level: riskLevel,
          success_probability: Math.min(probability, 1).toFixed(2),
          recommendation: riskLevel === 'high' ? 'يحتاج لمراجعة أساسيات المادة' : 
                         riskLevel === 'medium' ? 'يحتاج لمزيد من التدريب على حل الأسئلة' : 'مستواه ممتاز'
        }
      };
    });

    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    next(error);
  }
};
