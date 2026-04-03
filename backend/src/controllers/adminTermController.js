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
    const { name, is_published } = req.body;
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
        'create_term',
        'term',
        { 
          method: 'POST',
          url: '/api/admin/terms',
          body: { name, is_published: is_published !== undefined ? is_published : true }
        }
      );

      return res.json({
        success: true,
        message: 'تم إرسال طلب الإضافة للمراجعة'
      });
    }

    const term = await Term.create(name, is_published !== undefined ? is_published : true);
    
    // تسجيل النشاط
    await Admin.logActivity(req.admin.id, 'create_term', { name, is_published }, req.ip);

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
  try {
    const { id } = req.params;
    const { name, is_published } = req.body;
    const admin = req.admin;

    // Check permissions
    let permissions = {};
    try {
      permissions = typeof admin.permissions_detailed === 'string'
        ? JSON.parse(admin.permissions_detailed)
        : admin.permissions_detailed || {};
    } catch (e) {}

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (is_published !== undefined) updates.is_published = is_published;

    if (!admin.is_super_admin && permissions.subjects?.requireApproval) {
      const PendingApproval = require('../models/PendingApproval');
      await PendingApproval.create(
        admin.id,
        'update_term',
        'term',
        { 
          method: 'PUT',
          url: `/api/admin/terms/${id}`,
          body: updates
        }
      );

      return res.json({
        success: true,
        message: 'تم إرسال طلب التعديل للمراجعة'
      });
    }

    const term = await Term.update(id, updates);

    // تسجيل النشاط
    await Admin.logActivity(req.admin.id, 'update_term', { termId: id, ...updates }, req.ip);

    res.json({
      success: true,
      message: 'تم تحديث الترم بنجاح',
      data: { term }
    });
  } catch (error) {
    next(error);
  }
};
