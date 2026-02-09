const StudentQuestion = require('../models/StudentQuestion');

exports.askQuestion = async (req, res, next) => {
  try {
    const { questionText } = req.body;
    const userId = req.user.id;

    if (!questionText || questionText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'نص السؤال مطلوب'
      });
    }

    const result = await StudentQuestion.create(userId, questionText);

    res.json({
      success: true,
      message: 'تم إرسال السؤال بنجاح',
      data: {
        question: result.question,
        remaining_questions: result.remaining_questions
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyQuestions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const questions = await StudentQuestion.findByUser(userId);
    const remaining = await StudentQuestion.getRemainingQuestions(userId);

    res.json({
      success: true,
      data: {
        questions,
        count: questions.length,
        remaining_questions: remaining
      }
    });
  } catch (error) {
    next(error);
  }
};
