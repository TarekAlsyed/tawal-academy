const { body, param, validationResult } = require('express-validator');

exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  next();
};

// Admin Auth
exports.adminLoginValidation = [
  body('email').isEmail().withMessage('البريد الإلكتروني غير صالح'),
  body('password').notEmpty().withMessage('كلمة المرور مطلوبة'),
];

// Student Auth
exports.studentLoginValidation = [
  body('name').notEmpty().withMessage('الاسم مطلوب'),
  body('email').isEmail().withMessage('البريد الإلكتروني غير صالح'),
];

// Subjects
exports.subjectValidation = [
  body('name').notEmpty().withMessage('اسم المادة مطلوب'),
  body('termId').isInt().withMessage('معرف الترم يجب أن يكون رقمًا صحيحًا'),
];

// Exams
exports.examValidation = [
  body('subject_id').isInt().withMessage('معرف المادة يجب أن يكون رقمًا صحيحًا'),
  body('level').isInt().withMessage('المستوى يجب أن يكون رقمًا صحيحًا'),
  body('title').notEmpty().withMessage('عنوان الامتحان مطلوب'),
  body('time_limit').isInt().withMessage('الوقت المحدد يجب أن يكون رقمًا صحيحًا'),
  body('passing_score').isInt().withMessage('درجة النجاح يجب أن تكون رقمًا صحيحًا'),
  body('points').isInt().withMessage('النقاط يجب أن تكون رقمًا صحيحًا'),
  body('is_published').isBoolean().withMessage('حالة النشر يجب أن تكون قيمة منطقية'),
];

exports.updateExamValidation = [
  param('id').isInt().withMessage('معرف الامتحان يجب أن يكون رقمًا صحيحًا'),
  body('subject_id').optional().isInt().withMessage('معرف المادة يجب أن يكون رقمًا صحيحًا'),
  body('level').optional().isInt().withMessage('المستوى يجب أن يكون رقمًا صحيحًا'),
  body('title').optional().notEmpty().withMessage('عنوان الامتحان مطلوب'),
  body('time_limit').optional().isInt().withMessage('الوقت المحدد يجب أن يكون رقمًا صحيحًا'),
  body('passing_score').optional().isInt().withMessage('درجة النجاح يجب أن تكون رقمًا صحيحًا'),
  body('points').optional().isInt().withMessage('النقاط يجب أن تكون رقمًا صحيحًا'),
  body('is_published').optional().isBoolean().withMessage('حالة النشر يجب أن تكون قيمة منطقية'),
];

// Question Bank
exports.questionBankValidation = [
  body('subject_id').isInt().withMessage('معرف المادة يجب أن يكون رقمًا صحيحًا'),
  body('question_text').notEmpty().withMessage('نص السؤال مطلوب'),
  body('correct_answer').notEmpty().withMessage('الإجابة الصحيحة مطلوبة'),
  body('options').isArray({ min: 4 }).withMessage('يجب توفير 4 خيارات على الأقل'),
];

exports.updateQuestionBankValidation = [
  param('id').isInt().withMessage('معرف السؤال يجب أن يكون رقمًا صحيحًا'),
  body('subject_id').optional().isInt().withMessage('معرف المادة يجب أن يكون رقمًا صحيحًا'),
  body('question_text').optional().notEmpty().withMessage('نص السؤال مطلوب'),
  body('correct_answer').optional().notEmpty().withMessage('الإجابة الصحيحة مطلوبة'),
  body('options').optional().isArray({ min: 4 }).withMessage('يجب توفير 4 خيارات على الأقل'),
];

// Admins Management
exports.createAdminValidation = [
  body('name').notEmpty().withMessage('اسم المسؤول مطلوب'),
  body('email').isEmail().withMessage('البريد الإلكتروني غير صالح'),
  body('password').isLength({ min: 8 }).withMessage('كلمة المرور يجب أن لا تقل عن 8 أحرف'),
];

exports.updateAdminValidation = [
  param('id').isInt().withMessage('معرف المسؤول يجب أن يكون رقمًا صحيحًا'),
  body('name').optional().notEmpty().withMessage('اسم المسؤول مطلوب'),
  body('email').optional().isEmail().withMessage('البريد الإلكتروني غير صالح'),
];

// Terms
exports.termValidation = [
  body('name').notEmpty().withMessage('اسم الترم مطلوب'),
];

exports.updateTermValidation = [
  param('id').isInt().withMessage('معرف الترم يجب أن يكون رقمًا صحيحًا'),
  body('name').notEmpty().withMessage('اسم الترم مطلوب'),
];
