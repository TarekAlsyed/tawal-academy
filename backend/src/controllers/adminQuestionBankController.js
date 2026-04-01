const QuestionBank = require('../models/QuestionBank');
const Admin = require('../models/Admin');
const { validationResult } = require('express-validator');

const adminQuestionBankController = {
  create: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { subject_id, question_text, options, correct_answer, explanation, difficulty, source, tags } = req.body;
      const question = await QuestionBank.create({
        subject_id,
        question_text,
        options,
        correct_answer,
        explanation,
        difficulty,
        source,
        tags,
        created_by: req.admin.id
      });

      await Admin.logActivity(req.admin.id, 'CREATE_QUESTION_BANK_ITEM', { question_id: question.id }, req.ip);

      res.json({ success: true, data: question });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getAll: async (req, res) => {
    try {
      const questions = await QuestionBank.findAll(req.query);
      res.json({ success: true, data: questions });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  update: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { id } = req.params;
      const question = await QuestionBank.update(id, req.body);

      await Admin.logActivity(req.admin.id, 'UPDATE_QUESTION_BANK_ITEM', { question_id: id }, req.ip);

      res.json({ success: true, data: question });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      await QuestionBank.delete(id);

      await Admin.logActivity(req.admin.id, 'DELETE_QUESTION_BANK_ITEM', { question_id: id }, req.ip);

      res.json({ success: true, message: 'تم حذف السؤال من البنك بنجاح' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  deleteAll: async (req, res) => {
    try {
      await QuestionBank.deleteAll();

      await Admin.logActivity(req.admin.id, 'DELETE_ALL_QUESTION_BANK_ITEMS', {}, req.ip);

      res.json({ success: true, message: 'تم حذف جميع الأسئلة من البنك بنجاح' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  addToExam: async (req, res) => {
    try {
      const { examId } = req.params;
      const { question_bank_id, questionId, question_order, order, points } = req.body;

      // Handle different naming conventions between front/back
      const finalBankId = question_bank_id || questionId;
      const finalOrder = question_order !== undefined ? question_order : (order || 0);

      const examQuestion = await QuestionBank.addToExam(examId, finalBankId, finalOrder, points || 10);

      res.json({ 
        success: true, 
        message: 'تم إضافة السؤال للامتحان بنجاح',
        data: examQuestion 
      });
    } catch (error) {
      if (error.message === 'هذا السؤال مضاف بالفعل لهذا الامتحان') {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = adminQuestionBankController;
