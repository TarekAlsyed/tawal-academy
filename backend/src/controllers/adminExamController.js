const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Admin = require('../models/Admin');
const { parseExcelQuestions, parseTextQuestions } = require('../utils/questionParser');

exports.createExam = async (req, res, next) => {
  try {
    const { subjectId, level, name, status, openAt, closeAt, passPercentage } = req.body;
    if (!subjectId || !level || !name) {
      return res.status(400).json({ success: false, message: 'subjectId و level و name مطلوبة' });
    }
    const exam = await Exam.create(subjectId, level, name, status || 'open', openAt || null, closeAt || null, passPercentage || 80);
    await Admin.logActivity(req.admin.id, 'create_exam', { examId: exam.id }, req.ip);
    res.status(201).json({ success: true, message: 'تم إنشاء الامتحان', data: { exam } });
  } catch (error) {
    next(error);
  }
};

exports.updateExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const exam = await Exam.update(id, updates);
    await Admin.logActivity(req.admin.id, 'update_exam', { examId: id }, req.ip);
    res.json({ success: true, message: 'تم تحديث الامتحان', data: { exam } });
  } catch (error) {
    next(error);
  }
};

exports.deleteExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Exam.delete(id);
    await Admin.logActivity(req.admin.id, 'delete_exam', { examId: id }, req.ip);
    res.json({ success: true, message: 'تم حذف الامتحان' });
  } catch (error) {
    next(error);
  }
};

exports.getExamStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stats = await Exam.getStats(id);
    res.json({ success: true, data: { stats } });
  } catch (error) {
    next(error);
  }
};

exports.addQuestionsManual = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'قائمة الأسئلة مطلوبة' });
    }
    const createdQuestions = await Question.createMany(id, questions);
    await Admin.logActivity(req.admin.id, 'add_questions_manual', { examId: id, count: createdQuestions.length }, req.ip);
    res.status(201).json({ success: true, message: `تم إضافة ${createdQuestions.length} سؤال يدوياً`, data: { questions: createdQuestions, count: createdQuestions.length } });
  } catch (error) {
    next(error);
  }
};

exports.addQuestionsFromExcel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'ملف Excel مطلوب' });
    }
    const result = parseExcelQuestions(file.buffer);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    const createdQuestions = await Question.createMany(id, result.questions);
    await Admin.logActivity(req.admin.id, 'add_questions_excel', { examId: id, count: result.count }, req.ip);
    res.status(201).json({ success: true, message: `تم إضافة ${result.count} سؤال من Excel`, data: { questions: createdQuestions, count: result.count } });
  } catch (error) {
    next(error);
  }
};

exports.addQuestionsFromText = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'النص مطلوب' });
    }
    const result = parseTextQuestions(text);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    const createdQuestions = await Question.createMany(id, result.questions);
    await Admin.logActivity(req.admin.id, 'add_questions_text', { examId: id, count: result.count }, req.ip);
    res.status(201).json({ success: true, message: `تم إضافة ${result.count} سؤال من النص بنجاح`, data: { questions: createdQuestions, count: result.count } });
  } catch (error) {
    next(error);
  }
};

exports.deleteQuestion = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    await Question.delete(questionId);
    await Admin.logActivity(req.admin.id, 'delete_question', { questionId }, req.ip);
    res.json({ success: true, message: 'تم حذف السؤال بنجاح' });
  } catch (error) {
    next(error);
  }
};
