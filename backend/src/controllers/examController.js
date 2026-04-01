const XLSX = require('xlsx');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const User = require('../models/User');
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

    // التحقق من حالة القفل
    if (exam.is_locked) {
      return res.status(403).json({
        success: false,
        message: exam.lock_reason,
        data: { exam }
      });
    }

    // Log Activity
    try {
      await User.logActivity(userId, 'EXAM_START', { 
        examId: id, 
        examName: exam.name || exam.title
      }, req.ip);
    } catch (err) {
      console.error('Failed to log activity:', err);
    }

    res.json({
      success: true,
      data: { exam }
    });
  } catch (error) {
    next(error);
  }
};

exports.getExamReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const exam = await Exam.getExamWithAnswers(id, userId);

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

exports.getPersonalBank = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const questions = await Exam.getPersonalQuestionBank(userId);

    res.json({
      success: true,
      data: { questions }
    });
  } catch (error) {
    next(error);
  }
};

exports.importQuestions = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'لم يتم رفع أي ملف' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const questions = XLSX.utils.sheet_to_json(worksheet);

    await Question.bulkCreate(id, questions);

    res.json({ success: true, message: `تم استيراد ${questions.length} سؤال بنجاح` });
  } catch (error) {
    next(error);
  }
};

exports.saveProgress = async (req, res, next) => {
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

    await Exam.saveProgress(userId, id, answers);

    res.json({
      success: true,
      message: 'تم حفظ التقدم بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

exports.getProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const answers = await Exam.getProgress(userId, id);

    res.json({
      success: true,
      data: { answers: answers || {} }
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

    // Log Activity
    try {
      await User.logActivity(userId, 'EXAM_SUBMIT', { 
        examId: id
      }, req.ip);
    } catch (err) {
      console.error('Failed to log activity:', err);
    }

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'الإجابات مطلوبة'
      });
    }

    const result = await Exam.submitExam(userId, id, answers);

    const points = calculateExamPoints(result.score);
    let pointsAdded = 0;
    if (points > 0) {
      pointsAdded = await addPoints(userId, 'exam_completed', points, {
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
        points_earned: pointsAdded
      }
    });
  } catch (error) {
    next(error);
  }
};
