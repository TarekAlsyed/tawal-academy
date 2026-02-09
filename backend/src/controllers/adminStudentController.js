const User = require('../models/User');
const Admin = require('../models/Admin');
const pool = require('../config/database');
const PDFDocument = require('pdfkit');

exports.getAllStudents = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const students = await User.findAll(limit, offset);
    const totalCount = await User.count();

    res.json({
      success: true,
      data: {
        students,
        count: students.length,
        total: totalCount
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.searchStudents = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'مصطلح البحث مطلوب'
      });
    }

    const students = await User.search(q);

    res.json({
      success: true,
      data: {
        students,
        count: students.length
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.blockStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'سبب الحظر مطلوب'
      });
    }

    await User.blockUser(id, reason, req.admin.id);

    await Admin.logActivity(req.admin.id, 'block_student', { studentId: id, reason }, req.ip);

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

    await Admin.logActivity(req.admin.id, 'unblock_student', { studentId: id }, req.ip);

    res.json({
      success: true,
      message: 'تم إلغاء حظر الطالب بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;

    await User.deleteUser(id);

    await Admin.logActivity(req.admin.id, 'delete_student', { studentId: id }, req.ip);

    res.json({
      success: true,
      message: 'تم حذف الطالب بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

exports.exportStudents = async (req, res, next) => {
  try {
    const students = await User.findAll(10000, 0);

    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=students.pdf');

    doc.pipe(res);

    doc.fontSize(20).text('قائمة الطلبة', { align: 'center' });
    doc.moveDown();

    students.forEach((student, index) => {
      doc.fontSize(12).text(`${index + 1}. ${student.name} - ${student.email} - ${student.total_points} نقطة`);
      doc.moveDown(0.5);
    });

    doc.end();

    await Admin.logActivity(req.admin.id, 'export_students', { count: students.length }, req.ip);
  } catch (error) {
    next(error);
  }
};
