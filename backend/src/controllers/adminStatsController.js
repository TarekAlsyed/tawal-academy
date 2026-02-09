const pool = require('../config/database');
const User = require('../models/User');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalStudents = await User.count();

    const totalSubjects = await pool.query('SELECT COUNT(*) as count FROM subjects');
    
    const totalExams = await pool.query('SELECT COUNT(*) as count FROM exams');
    
    const todayAttempts = await pool.query(
      `SELECT COUNT(*) as count FROM exam_attempts 
       WHERE DATE(attempt_date) = CURRENT_DATE`
    );

    const avgScore = await pool.query(
      'SELECT AVG(score) as avg FROM exam_attempts'
    );

    const topDownloadedPDFs = await pool.query(
      `SELECT p.title, p.downloads_count, s.name as subject_name
       FROM pdfs p
       JOIN subjects s ON p.subject_id = s.id
       ORDER BY p.downloads_count DESC
       LIMIT 10`
    );

    const topStudents = await User.getLeaderboard(10);

    const unansweredQuestions = await pool.query(
      'SELECT COUNT(*) as count FROM student_questions WHERE is_replied = FALSE'
    );

    res.json({
      success: true,
      data: {
        stats: {
          total_students: parseInt(totalStudents),
          total_subjects: parseInt(totalSubjects.rows[0].count),
          total_exams: parseInt(totalExams.rows[0].count),
          today_attempts: parseInt(todayAttempts.rows[0].count),
          average_score: parseFloat(avgScore.rows[0].avg || 0).toFixed(2),
          unanswered_questions: parseInt(unansweredQuestions.rows[0].count)
        },
        top_downloaded_pdfs: topDownloadedPDFs.rows,
        top_students: topStudents
      }
    });
  } catch (error) {
    next(error);
  }
};
