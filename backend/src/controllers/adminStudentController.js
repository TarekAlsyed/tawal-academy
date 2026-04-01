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
    
    const students = await User.findAll(parseInt(limit), parseInt(offset));
    
    let totalCount = 0;
    try {
      totalCount = await User.count();
    } catch (countError) {
      console.error('[getAllStudents] Count error:', countError.message);
      // Fallback to students length if count fails, though not ideal
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

    const students = await User.search(query);

    res.json({
      success: true,
      data: { students }
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
