const User = require('../models/User');
const pool = require('../config/database');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const arabicReshaper = require('arabic-persian-reshaper');
const BidiJS = require('bidi-js');
const bidi = BidiJS();

// دالة لمساعدة في تشكيل ونقل النص العربي ليظهر بشكل صحيح في PDFKit
const formatArabicText = (text) => {
  if (!text) return '';
  try {
    // التأكد من استدعاء المكتبة بشكل صحيح
    const reshaper = arabicReshaper.ArabicReshaper || arabicReshaper;
    if (typeof reshaper.reshape !== 'function') {
      console.warn('Reshape function not found, returning original text');
      return text;
    }
    // تشكيل الحروف العربية
    const reshaped = reshaper.reshape(text);
    // عكس النص ليدعم الـ RTL
    const bidiText = bidi.getReorderedText(reshaped);
    return bidiText;
  } catch (error) {
    console.error('Error in formatArabicText:', error.message);
    return text; // Return original text if processing fails
  }
};

exports.getAllStudents = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.total_points, u.registration_date, u.last_login, u.is_blocked, u.device_id,
              CASE WHEN u.is_blocked THEN 'blocked' ELSE 'active' END as status,
              EXISTS (SELECT 1 FROM blocked_list WHERE email = u.email) as is_email_blocked,
              EXISTS (SELECT 1 FROM blocked_list WHERE device_id = u.device_id AND u.device_id IS NOT NULL) as is_device_blocked
       FROM users u
       ORDER BY u.total_points DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const students = result.rows;
    
    let totalCount = 0;
    try {
      const countResult = await pool.query('SELECT COUNT(*) FROM users');
      totalCount = parseInt(countResult.rows[0].count);
    } catch (countError) {
      console.error('[getAllStudents] Count error:', countError.message);
      totalCount = students.length;
    }

    res.json({
      success: true,
      data: {
        students,
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.searchStudents = async (req, res, next) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'نص البحث مطلوب'
      });
    }

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.total_points, u.registration_date, u.last_login, u.is_blocked, u.device_id,
              CASE WHEN u.is_blocked THEN 'blocked' ELSE 'active' END as status,
              EXISTS (SELECT 1 FROM blocked_list WHERE email = u.email) as is_email_blocked,
              EXISTS (SELECT 1 FROM blocked_list WHERE device_id = u.device_id AND u.device_id IS NOT NULL) as is_device_blocked
       FROM users u
       WHERE u.name ILIKE $1 OR u.email ILIKE $1
       ORDER BY u.total_points DESC`,
      [`%${query}%`]
    );

    res.json({
      success: true,
      data: { students: result.rows }
    });
  } catch (error) {
    next(error);
  }
};

exports.blockStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'تم حظر الحساب من قبل المسؤول' } = req.body;
    const adminId = req.admin.id;

    await User.blockUser(id, reason, adminId);

    res.json({
      success: true,
      message: 'تم حظر الطالب بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

exports.unblockStudent = async (req, res, next) => {
  try {
    const { id } = req.params;

    await User.unblockUser(id);

    res.json({
      success: true,
      message: 'تم إلغاء حظر الطالب والجهاز بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

exports.unblockEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'الإيميل مطلوب'
      });
    }

    await pool.query('DELETE FROM blocked_list WHERE email = $1', [email]);

    res.json({
      success: true,
      message: 'تم إلغاء حظر الإيميل بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

exports.unblockDevice = async (req, res, next) => {
  try {
    const { deviceId } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الجهاز مطلوب'
      });
    }

    await pool.query('DELETE FROM blocked_list WHERE device_id = $1', [deviceId]);

    res.json({
      success: true,
      message: 'تم إلغاء حظر الجهاز بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

exports.resetDevice = async (req, res, next) => {
  try {
    const { id } = req.params;

    await pool.query('UPDATE users SET device_id = NULL WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'تم تصفير جهاز الطالب بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'تم حذف الطالب بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

exports.exportStudentsPDF = async (req, res, next) => {
  try {
    const students = await User.findAll(1000, 0);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=students.pdf');

    doc.pipe(res);

    // التحقق من وجود خط يدعم العربية
    const fontPath = path.join(__dirname, '../../assets/fonts/Tajawal-Regular.ttf');
    const hasArabicFont = fs.existsSync(fontPath);

    if (hasArabicFont) {
      doc.font(fontPath);
    }

    doc.fontSize(20).text(formatArabicText('قائمة الطلبة'), { align: 'center' });
    doc.moveDown();

    doc.fontSize(12);
    students.forEach((student, index) => {
      const studentInfo = `${student.name} - ${student.email} - النقاط: ${student.total_points}`;
      const text = `${index + 1}. ${formatArabicText(studentInfo)}`;
      doc.text(text, { align: 'right' });
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};
