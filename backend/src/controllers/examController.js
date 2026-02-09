const Exam = require('../models/Exam');
const { addPoints, calculateExamPoints } = require('../utils/pointsCalculator');
const { notifyLevelPassed } = require('../utils/notificationSender');

exports.getExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const exam = await Exam.findByIdWithQuestions(id, userId);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'الامتحان غير موجود'
      });
    }

    res.json({
      success: true,
      data: { exam }
    });
  } catch (error) {
    next(error);
  }
};

exports.submitExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'الإجابات مطلوبة'
      });
    }

    const result = await Exam.submitExam(userId, id, answers);

    const points = calculateExamPoints(result.score);
    if (points > 0) {
      await addPoints(userId, 'exam_completed', points, {
        examId: id,
        score: result.score,
        passed: result.passed
      });
    }

    if (result.passed) {
      const exam = await Exam.findById(id);
      await notifyLevelPassed(userId, exam.subject_name, exam.level, result.score);
    }

    res.json({
      success: true,
      message: result.passed ? 'مبروك! لقد نجحت في الامتحان' : 'للأسف لم تنجح، حاول مرة أخرى',
      data: {
        ...result,
        points_earned: points
      }
    });
  } catch (error) {
    next(error);
  }
};
