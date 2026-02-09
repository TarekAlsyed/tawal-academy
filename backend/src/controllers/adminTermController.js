const Term = require('../models/Term');
const Admin = require('../models/Admin');

exports.createTerm = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'اسم الترم مطلوب'
      });
    }

    const term = await Term.create(name);

    await Admin.logActivity(req.admin.id, 'create_term', { termId: term.id, name }, req.ip);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الترم بنجاح',
      data: { term }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllTerms = async (req, res, next) => {
  try {
    const terms = await Term.findAll();

    res.json({
      success: true,
      data: {
        terms,
        count: terms.length
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTerm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'اسم الترم مطلوب'
      });
    }

    const term = await Term.update(id, name);

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

exports.deleteTerm = async (req, res, next) => {
  try {
    const { id } = req.params;

    await Term.delete(id);

    await Admin.logActivity(req.admin.id, 'delete_term', { termId: id }, req.ip);

    res.json({
      success: true,
      message: 'تم حذف الترم بنجاح'
    });
  } catch (error) {
    next(error);
  }
};
