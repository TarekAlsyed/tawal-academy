const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'الإيميل وكلمة المرور مطلوبان' });
    }
    const admin = await Admin.login(email, password);
    const token = jwt.sign({ adminId: admin.id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.cookie('adminToken', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: 'strict' });
    res.json({ success: true, message: 'تم تسجيل الدخول كمشرف', data: { admin: { id: admin.id, name: admin.name, email: admin.email, permissions: admin.permissions, isSuperAdmin: admin.is_super_admin }, token } });
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res) => {
  res.clearCookie('adminToken');
  res.json({ success: true, message: 'تم تسجيل الخروج' });
};

exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, permissions, isSuperAdmin } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'الاسم والإيميل وكلمة المرور مطلوبة' });
    }
    const admin = await Admin.create(name, email, password, permissions || {}, !!isSuperAdmin);
    await Admin.logActivity(req.admin.id, 'create_admin', { newAdminId: admin.id }, req.ip);
    res.status(201).json({ success: true, message: 'تم إنشاء المشرف', data: { admin } });
  } catch (error) {
    next(error);
  }
};

exports.updatePermissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ success: false, message: 'صلاحيات غير صالحة' });
    }
    const admin = await Admin.updatePermissions(id, permissions);
    await Admin.logActivity(req.admin.id, 'update_admin_permissions', { adminId: id }, req.ip);
    res.json({ success: true, message: 'تم تحديث الصلاحيات', data: { admin } });
  } catch (error) {
    next(error);
  }
};
