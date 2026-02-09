const StudentQuestion = require('../models/StudentQuestion');
const Admin = require('../models/Admin');
const { notifyQuestionReply } = require('../utils/notificationSender');

exports.getAllQuestions = async (req, res, next) => {
  try {
    const isReplied = req.query.replied === 'true' ? true : req.query.replied === 'false' ? false : null;
    const limit = parseInt(req.query.limit) || 50;

    const questions = await StudentQuestion.findAll(isReplied, limit);
    const unansweredCount = await StudentQuestion.countUnanswered();

    res.json({
      success: true,
      data: {
        questions,
        count: questions.length,
        unanswered_count: unansweredCount
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.replyToQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'نص الرد مطلوب'
      });
    }

    const question = await StudentQuestion.reply(id, reply, req.admin.id);

    await notifyQuestionReply(question.user_id, id);

    await Admin.logActivity(req.admin.id, 'reply_question', { questionId: id }, req.ip);

    res.json({
      success: true,
      message: 'تم الرد على السؤال بنجاح',
      data: { question }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;

    await StudentQuestion.delete(id);

    await Admin.logActivity(req.admin.id, 'delete_student_question', { questionId: id }, req.ip);

    res.json({
      success: true,
      message: 'تم حذف السؤال بنجاح'
    });
  } catch (error) {
    next(error);
  }
};
