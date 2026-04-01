const StudentQuestion = require('../models/StudentQuestion');

exports.submitQuestion = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { question_text } = req.body;

    if (!question_text || question_text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'نص السؤال مطلوب'
      });
    }

    // Check monthly limit (3 questions per month)
    const canAsk = await StudentQuestion.canAskQuestion(userId);
    
    if (!canAsk) {
      return res.status(400).json({
        success: false,
        message: 'لقد وصلت للحد الأقصى من الأسئلة هذا الشهر (3 أسئلة)'
      });
    }

    const question = await StudentQuestion.create(userId, question_text);

    res.json({
      success: true,
      message: 'تم إرسال السؤال بنجاح. سيتم الرد عليه قريباً',
      data: { question }
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyQuestions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const questions = await StudentQuestion.findByUserId(userId);
    const remainingQuestions = await StudentQuestion.getRemainingQuestions(userId);

    res.json({
      success: true,
      data: {
        questions,
        remainingQuestions
      }
    });
  } catch (error) {
    next(error);
  }
};
