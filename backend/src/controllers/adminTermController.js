const Term = require('../models/Term');
const Admin = require('../models/Admin');

exports.getAllTerms = async (req, res, next) => {
  try {
    const terms = await Term.findAll();
    res.json({
      success: true,
      data: { terms }
    });
  } catch (error) {
    next(error);
  }
};

exports.createTerm = async (req, res, next) => {
  try {
    const { name } = req.body;
    const admin = req.admin;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'اسم الترم مطلوب'
      });
    }

    const term = await Term.create(name);
    
    // تسجيل النشاط
    await Admin.logActivity(req.admin.id, 'create_term', { name }, req.ip);

    res.json({
      success: true,
      message: 'تم إنشاء الترم بنجاح',
      data: { term }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteTerm = async (req, res, next) => {
  try {
    const { id } = req.params;

    await Term.delete(id);
    
    // تسجيل النشاط
    await Admin.logActivity(req.admin.id, 'delete_term', { termId: id }, req.ip);

    res.json({
      success: true,
      message: 'تم حذف الترم بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTerm = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { id } = req.params;
    const { name } = req.body;
    const admin = req.admin;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'اسم الترم مطلوب'
      });
    }

    // Check permissions
    let permissions = {};
    try {
      permissions = typeof admin.permissions_detailed === 'string'
        ? JSON.parse(admin.permissions_detailed)
        : admin.permissions_detailed || {};
    } catch (e) {}

    if (!admin.is_super_admin && permissions.subjects?.requireApproval) {
      const PendingApproval = require('../models/PendingApproval');
      await PendingApproval.create(
        admin.id,
        'update_term',
        'term',
        { 
          method: 'PUT',
          url: `/api/admin/terms/${id}`,
          body: { name }
        }
      );

      return res.json({
        success: true,
        message: 'تم إرسال طلب تحديث الترم للمدير العام للموافقة',
        requiresApproval: true
      });
    }

    const term = await Term.update(id, { name });

    // تسجيل النشاط
    await Admin.logActivity(req.admin.id, 'update_term', { termId: id, name }, req.ip);

    res.json({
      success: true,
      message: 'تم تحديث الترم بنجاح',
      data: { term }
    });
  } catch (error) {
    next(error);
  }
};
