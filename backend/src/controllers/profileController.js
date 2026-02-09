const User = require('../models/User');
const { getUserPoints, getPointsHistory } = require('../utils/pointsCalculator');
const pool = require('../config/database');

exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    const rank = await User.getUserRank(userId);
    const points = await getUserPoints(userId);

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          rank,
          total_points: points
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

    const result = await pool.query(
      `SELECT ea.*, e.name as exam_name, e.level, s.name as subject_name
       FROM exam_attempts ea
       JOIN exams e ON ea.exam_id = e.id
       JOIN subjects s ON e.subject_id = s.id
       WHERE ea.user_id = $1
       ORDER BY ea.attempt_date DESC
       LIMIT 50`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        attempts: result.rows,
        count: result.rows.length
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getPointsHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const history = await getPointsHistory(userId);

    res.json({
      success: true,
      data: {
        history,
        count: history.length
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getLeaderboard = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await User.getLeaderboard(limit);

    res.json({
      success: true,
      data: {
        leaderboard,
        count: leaderboard.length
      }
    });
  } catch (error) {
    next(error);
  }
};
