const StudentQuestion = require('../models/StudentQuestion');
const { sendNotification } = require('../utils/notificationSender');
const Admin = require('../models/Admin');

exports.getAllQuestions = async (req, res, next) => {
  try {
    const { status = 'all', limit = 50, offset = 0 } = req.query;

    const rawQuestions = await StudentQuestion.findAll(status, limit, offset);

    // Map to the structure expected by the frontend
    const questions = rawQuestions.map(q => ({
      id: q.id,
      student: {
        name: q.student_name,
        email: q.student_email
      },
      question: q.question_text,
      status: q.is_replied ? 'answered' : 'pending',
      reply: q.admin_reply,
      replied_at: q.replied_at,
      created_at: q.created_at
    }));

    res.json({
      success: true,
      data: { questions }
    });
  } catch (error) {
    next(error);
  }
};

exports.replyToQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reply, admin_reply } = req.body;
    const finalReply = reply || admin_reply;
    const adminId = req.admin.id;
    const admin = req.admin;

    if (!finalReply || finalReply.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'الرد مطلوب'
      });
    }

    const question = await StudentQuestion.reply(id, finalReply, adminId);

    // تسجيل النشاط
    await Admin.logActivity(adminId, 'reply_to_question', { questionId: id }, req.ip);

    // Send notification to student
    await sendNotification(
      question.user_id,
      `تم الرد على سؤالك: ${question.question_text.substring(0, 50)}...`,
      'info',
      `/questions`
    );

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
    const adminId = req.admin.id;

    const question = await StudentQuestion.delete(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'السؤال غير موجود'
      });
    }

    // تسجيل النشاط
    await Admin.logActivity(adminId, 'delete_student_question', { questionId: id }, req.ip);

    res.json({
      success: true,
      message: 'تم حذف السؤال بنجاح'
    });
  } catch (error) {
    next(error);
  }
};
