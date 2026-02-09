const Subject = require('../models/Subject');
const Admin = require('../models/Admin');

exports.getAllSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.findAll(true);
    res.json({ success: true, data: { subjects, count: subjects.length } });
  } catch (error) {
    next(error);
  }
};

exports.createSubject = async (req, res, next) => {
  try {
    const { termId, name, description, status, scheduledAt } = req.body;
    const coverImage = req.file ? `/uploads/covers/${req.file.filename}` : null;
    if (!termId || !name) {
      return res.status(400).json({ success: false, message: 'termId و name مطلوبان' });
    }
    const subject = await Subject.create(termId, name, description || null, coverImage, status || 'open', scheduledAt || null, req.admin.id);
    await Admin.logActivity(req.admin.id, 'create_subject', { subjectId: subject.id }, req.ip);
    res.status(201).json({ success: true, message: 'تم إنشاء المادة', data: { subject } });
  } catch (error) {
    next(error);
  }
};

exports.updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, status, scheduledAt } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (status) updates.status = status;
    if (scheduledAt) updates.scheduled_at = scheduledAt;
    if (req.file) updates.cover_image = `/uploads/covers/${req.file.filename}`;
    const subject = await Subject.update(id, updates);
    await Admin.logActivity(req.admin.id, 'update_subject', { subjectId: id }, req.ip);
    res.json({ success: true, message: 'تم تحديث المادة', data: { subject } });
  } catch (error) {
    next(error);
  }
};

exports.deleteSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Subject.delete(id);
    await Admin.logActivity(req.admin.id, 'delete_subject', { subjectId: id }, req.ip);
    res.json({ success: true, message: 'تم حذف المادة' });
  } catch (error) {
    next(error);
  }
};

exports.uploadPDFs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const files = req.files || [];
    const created = [];
    for (const f of files) {
      const fileUrl = `/uploads/pdfs/${f.filename}`;
      const pdf = await Subject.addPDF(id, f.originalname, fileUrl, f.size || null);
      created.push(pdf);
    }
    await Admin.logActivity(req.admin.id, 'upload_pdfs', { subjectId: id, count: created.length }, req.ip);
    res.status(201).json({ success: true, message: 'تم رفع ملفات PDF', data: { pdfs: created, count: created.length } });
  } catch (error) {
    next(error);
  }
};

exports.deletePDF = async (req, res, next) => {
  try {
    const { pdfId } = req.params;
    const deleted = await Subject.deletePDF(pdfId);
    await Admin.logActivity(req.admin.id, 'delete_pdf', { pdfId }, req.ip);
    res.json({ success: true, message: 'تم حذف PDF', data: { file: deleted } });
  } catch (error) {
    next(error);
  }
};

exports.uploadImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const files = req.files || [];
    const created = [];
    for (const f of files) {
      const fileUrl = `/uploads/images/${f.filename}`;
      const img = await Subject.addImage(id, f.originalname, fileUrl);
      created.push(img);
    }
    await Admin.logActivity(req.admin.id, 'upload_images', { subjectId: id, count: created.length }, req.ip);
    res.status(201).json({ success: true, message: 'تم رفع الصور', data: { images: created, count: created.length } });
  } catch (error) {
    next(error);
  }
};

exports.deleteImage = async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const deleted = await Subject.deleteImage(imageId);
    await Admin.logActivity(req.admin.id, 'delete_image', { imageId }, req.ip);
    res.json({ success: true, message: 'تم حذف الصورة', data: { file: deleted } });
  } catch (error) {
    next(error);
  }
};
