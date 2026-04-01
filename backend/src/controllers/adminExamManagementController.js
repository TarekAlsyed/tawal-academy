const StudentViolation = require('../models/StudentViolation');
const Admin = require('../models/Admin');

/**
 * متحكم إدارة مخالفات الامتحانات الرقمية (Digital Violations)
 */

// --- إدارة المخالفات ---
exports.reportViolation = async (req, res, next) => {
  try {
    let { user_id, exam_id, violation_type, description, evidence_url, severity, action_taken } = req.body;
    
    // إذا كانت المخالفة مسجلة تلقائياً من نظام المراقبة للطالب الحالي
    if (user_id === 'current') {
      // التحقق من وجود req.user (للطالب) أو req.admin (للأدمن)
      const currentUserId = req.user?.id || req.admin?.id;
      if (!currentUserId) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
      }
      user_id = currentUserId;
    }

    const violation = await StudentViolation.create(
      user_id, exam_id, violation_type, description, evidence_url, severity, req.admin ? req.admin.id : null, action_taken
    );
    
    if (req.admin) {
      await Admin.logActivity(req.admin.id, 'report_violation', { violationId: violation.id, studentId: user_id }, req.ip);
    }
    
    res.status(201).json({ success: true, message: 'تم تسجيل المخالفة بنجاح', data: violation });
  } catch (error) {
    next(error);
  }
};

exports.getAllViolations = async (req, res, next) => {
  try {
    const violations = await StudentViolation.findAll();
    res.json({ success: true, data: violations });
  } catch (error) {
    next(error);
  }
};
