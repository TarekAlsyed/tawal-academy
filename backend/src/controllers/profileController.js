const User = require('../models/User');
const pool = require('../config/database');

exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    const rank = await User.getUserRank(userId);

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          rank
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getExamHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT 
         ea.id,
         ea.score,
         ea.passed,
         ea.attempt_date,
         e.name as exam_name,
         e.level,
         s.name as subject_name
       FROM exam_attempts ea
       JOIN exams e ON ea.exam_id = e.id
       JOIN subjects s ON e.subject_id = s.id
       WHERE ea.user_id = $1
       ORDER BY ea.attempt_date DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({
      success: true,
      data: {
        history: result.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getLeaderboard = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    
    const leaderboard = await User.getLeaderboard(limit);

    res.json({
      success: true,
      data: {
        leaderboard
      }
    });
  } catch (error) {
    next(error);
  }
};
