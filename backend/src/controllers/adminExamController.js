const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Admin = require('../models/Admin');
const pool = require('../config/database');
const questionParser = require('../utils/questionParser');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

/**
 * متحكم إدارة الامتحانات للأدمن
 */

// الحصول على كل الامتحانات
exports.getAllExams = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT e.*, s.name as subject_name 
       FROM exams e 
       JOIN subjects s ON e.subject_id = s.id 
       ORDER BY e.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

// الحصول على امتحان بالـ ID مع أسئلته
exports.getExamById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id);
    
    if (!exam) {
      return res.status(404).json({ success: false, message: 'الامتحان غير موجود' });
    }

    const questions = await Question.findByExam(id);
    
    res.json({ 
      success: true, 
      data: { 
        ...exam, 
        questions 
      } 
    });
  } catch (error) {
    next(error);
  }
};

// إنشاء امتحان جديد
exports.createExam = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const { 
      subject_id, 
      level, 
      title, 
      description, 
      time_limit, 
      passing_score, 
      points, 
      start_date, 
      end_date, 
      is_published 
    } = req.body;

    // التأكد من أن المستوى ضمن النطاق المسموح به (1, 2, 3)
    // إذا كان أكبر من 3، سنعتبره 3 كحد أقصى لتجنب خطأ قاعدة البيانات
    const validLevel = Math.min(Math.max(1, parseInt(level) || 1), 3);

    const result = await pool.query(
      `INSERT INTO exams (subject_id, level, name, title, description, time_limit, passing_score, points, start_date, end_date, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [subject_id, validLevel, title, title, description, time_limit, passing_score, points, start_date, end_date, is_published]
    );
    
    const exam = result.rows[0];
    
    // تسجيل النشاط
    await Admin.logActivity(req.admin.id, 'create_exam', { examId: exam.id }, req.ip);
    
    res.status(201).json({ 
      success: true, 
      message: 'تم إنشاء الامتحان بنجاح', 
      data: exam 
    });
  } catch (error) {
    next(error);
  }
};

exports.getQuestionAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const analytics = await Exam.getQuestionAnalytics(id);
    res.json({ success: true, data: analytics });
  } catch (error) {
    next(error);
  }
};

// تحديث امتحان
exports.updateExam = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { id } = req.params;
    const updates = req.body;

    // التأكد من تحديث الحقل name أيضاً إذا تم تغيير title لضمان التوافق
    if (updates.title) {
      updates.name = updates.title;
    }

    // التأكد من صحة المستوى
    if (updates.level) {
      updates.level = Math.min(Math.max(1, parseInt(updates.level) || 1), 3);
    }

    const exam = await Exam.update(id, updates);
    
    if (!exam) {
      return res.status(404).json({ success: false, message: 'الامتحان غير موجود' });
    }

    // تسجيل النشاط
    await Admin.logActivity(req.admin.id, 'update_exam', { examId: id }, req.ip);

    res.json({ 
      success: true, 
      message: 'تم تحديث الامتحان بنجاح', 
      data: exam 
    });
  } catch (error) {
    next(error);
  }
};

// حذف امتحان
exports.deleteExam = async (req, res, next) => {
  try {
    const { id } = req.params;

    await Exam.delete(id);
    
    // تسجيل النشاط
    await Admin.logActivity(req.admin.id, 'delete_exam', { examId: id }, req.ip);

    res.json({ success: true, message: 'تم حذف الامتحان بنجاح' });
  } catch (error) {
    next(error);
  }
};

// إضافة أسئلة يدوياً
exports.addQuestionsManually = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ success: false, message: 'يرجى إرسال مصفوفة من الأسئلة' });
    }

    const createdQuestions = await Question.bulkCreate(id, questions);

    // إضافة الأسئلة تلقائياً لبنك الأسئلة المركزي
    try {
      const QuestionBank = require('../models/QuestionBank');
      const exam = await Exam.findById(id);
      for (const q of questions) {
        try {
          await QuestionBank.create({
            subject_id: exam.subject_id,
            question_text: q.question_text || q.questionText,
            type: q.type || 'multiple',
            options: q.options || { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d },
            correct_answer: q.correct_answer || q.correctAnswer,
            explanation: q.explanation,
            difficulty_level: 3,
            created_by: req.admin.id
          });
        } catch (bankErr) {
          // تجاهل الخطأ إذا كان السؤال موجوداً بالفعل
          console.log('Skipping duplicate question in bank auto-add');
        }
      }
    } catch (err) {
      console.error('Error auto-adding questions to bank:', err);
    }

    // تسجيل النشاط
    await Admin.logActivity(req.admin.id, 'add_questions_manually', { 
      examId: id, 
      count: createdQuestions.length 
    }, req.ip);

    res.json({ 
      success: true, 
      message: `تم إضافة ${createdQuestions.length} سؤال بنجاح`,
      count: createdQuestions.length
    });
  } catch (error) {
    next(error);
  }
};

// تحديث سؤال
exports.updateQuestion = async (req, res, next) => {
  try {
    const { examId, questionId } = req.params;
    const updates = req.body;

    const question = await Question.update(questionId, updates);
    
    if (!question) {
      return res.status(404).json({ success: false, message: 'السؤال غير موجود' });
    }

    // تسجيل النشاط
    await Admin.logActivity(req.admin.id, 'update_question', { questionId, examId: question.exam_id }, req.ip);

    res.json({ success: true, message: 'تم تحديث السؤال بنجاح', data: question });
  } catch (error) {
    next(error);
  }
};

// حذف سؤال
exports.deleteQuestion = async (req, res, next) => {
  try {
    const { examId, questionId } = req.params;
    
    // الحصول على معلومات السؤال قبل الحذف للنشاط
    const questionResult = await pool.query(
      'SELECT exam_id FROM questions WHERE id = $1',
      [questionId]
    );
    
    await Question.delete(questionId);

    // تسجيل النشاط
    if (questionResult.rows[0]) {
      await Admin.logActivity(req.admin.id, 'delete_question', { 
        questionId, 
        examId: questionResult.rows[0].exam_id 
      }, req.ip);
    }

    res.json({ success: true, message: 'تم حذف السؤال بنجاح' });
  } catch (error) {
    next(error);
  }
};

// الحصول على إحصائيات الامتحان
exports.getExamStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stats = await Exam.getStats(id);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// الحصول على جميع المحاولات
exports.getAllAttempts = async (req, res, next) => {
  try {
    const { examId, studentId, status } = req.query;
    let query = `
      SELECT ea.*, u.name as student_name, e.name as exam_name, s.name as subject_name
      FROM exam_attempts ea
      JOIN users u ON ea.user_id = u.id
      JOIN exams e ON ea.exam_id = e.id
      JOIN subjects s ON e.subject_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (examId) {
      params.push(examId);
      query += ` AND ea.exam_id = $${params.length}`;
    }
    if (studentId) {
      params.push(studentId);
      query += ` AND ea.user_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND ea.status = $${params.length}`;
    }

    query += ' ORDER BY ea.attempt_date DESC';
    
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

// الحصول على تفاصيل محاولة
exports.getAttemptById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT ea.*, u.name as student_name, e.name as exam_name
      FROM exam_attempts ea
      JOIN users u ON ea.user_id = u.id
      JOIN exams e ON ea.exam_id = e.id
      WHERE ea.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'المحاولة غير موجودة' });
    }

    const attempt = result.rows[0];
    
    // الحصول على أسئلة الامتحان للمقارنة
    const questionsResult = await pool.query(`
      SELECT id, question_text, type, options, correct_answer, explanation
      FROM questions
      WHERE exam_id = $1
      ORDER BY question_order ASC
    `, [attempt.exam_id]);

    res.json({ 
      success: true, 
      data: { 
        ...attempt,
        questions: questionsResult.rows 
      } 
    });
  } catch (error) {
    next(error);
  }
};

// حذف جميع الأسئلة
exports.deleteAllQuestions = async (req, res, next) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM questions WHERE exam_id = $1', [id]);
    
    // تسجيل النشاط
    await Admin.logActivity(req.admin.id, 'delete_all_questions', { examId: id }, req.ip);

    res.json({ success: true, message: 'تم حذف جميع الأسئلة بنجاح' });
  } catch (error) {
    next(error);
  }
};

// إضافة أسئلة من ملف (Excel أو Word)
exports.addQuestionsFromFile = async (req, res, next) => {
  let filePath = null;
  try {
    const { id } = req.params;
    const examId = parseInt(id);

    if (isNaN(examId)) {
      return res.status(400).json({ success: false, message: 'ID الامتحان غير صالح' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'يرجى رفع ملف (Excel أو Word)' });
    }
    
    filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    let parseResult;
    if (fileExt === '.docx') {
      parseResult = await questionParser.parseWordQuestions(filePath);
    } else {
      parseResult = await questionParser.parseExcelQuestions(filePath);
    }

    if (!parseResult.success) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ 
        success: false, 
        message: parseResult.error || 'فشل في تحليل ملف الأسئلة'
      });
    }

    try {
      const createdQuestions = await Question.bulkCreate(examId, parseResult.questions);

      // إضافة الأسئلة تلقائياً لبنك الأسئلة المركزي
      try {
        const QuestionBank = require('../models/QuestionBank');
        const exam = await Exam.findById(examId);
        if (exam) {
          for (const q of parseResult.questions) {
            try {
              await QuestionBank.create({
                subject_id: exam.subject_id,
                question_text: q.question_text || q.questionText,
                type: q.type || 'multiple',
                options: q.options || { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d },
                correct_answer: q.correct_answer || q.correctAnswer,
                explanation: q.explanation,
                difficulty_level: 3,
                created_by: req.admin.id
              });
            } catch (bankErr) {
              console.log('Skipping duplicate question in bank auto-add from file');
            }
          }
        }
      } catch (err) {
        console.error('Error auto-adding file questions to bank:', err);
      }

      await Admin.logActivity(req.admin.id, 'add_file_questions', { 
        examId: examId, 
        count: createdQuestions.length,
        fileType: fileExt
      }, req.ip);

      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      res.json({ 
        success: true, 
        message: `تم إضافة ${createdQuestions.length} سؤال بنجاح`,
        count: createdQuestions.length
      });
    } catch (bulkError) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ 
        success: false, 
        message: bulkError.message || 'فشل في حفظ الأسئلة في قاعدة البيانات'
      });
    }
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    next(error);
  }
};

// الدالة القديمة للإبقاء على التوافق إذا لزم الأمر
exports.addQuestionsFromExcel = exports.addQuestionsFromFile;

// إضافة أسئلة من نص (Text)
exports.addQuestionsFromText = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: 'يرجى إرسال النص المراد تحليله' });
    }

    const parseResult = questionParser.parseTextQuestions(text);
    if (!parseResult.success) {
      throw new Error(parseResult.error || 'فشل في تحليل النص');
    }

    const createdQuestions = await Question.bulkCreate(id, parseResult.questions);

    // إضافة الأسئلة تلقائياً لبنك الأسئلة المركزي
    try {
      const QuestionBank = require('../models/QuestionBank');
      const exam = await Exam.findById(id);
      for (const q of parseResult.questions) {
        try {
          await QuestionBank.create({
            subject_id: exam.subject_id,
            question_text: q.question_text || q.questionText,
            type: q.type || 'multiple',
            options: q.options || { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d },
            correct_answer: q.correct_answer || q.correctAnswer,
            explanation: q.explanation,
            difficulty_level: 3,
            created_by: req.admin.id
          });
        } catch (bankErr) {
          console.log('Skipping duplicate question in bank auto-add from text');
        }
      }
    } catch (err) {
      console.error('Error auto-adding text questions to bank:', err);
    }

    // تسجيل النشاط
    await Admin.logActivity(req.admin.id, 'add_text_questions', { 
      examId: id, 
      count: createdQuestions.length 
    }, req.ip);

    res.json({ 
      success: true, 
      message: `تم إضافة ${createdQuestions.length} سؤال بنجاح`,
      count: createdQuestions.length
    });
  } catch (error) {
    next(error);
  }
};