const Subject = require('../models/Subject');
const Admin = require('../models/Admin');
const PendingApproval = require('../models/PendingApproval');
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

const getPermissions = (admin) => {
  try {
    return typeof admin.permissions_detailed === 'string'
      ? JSON.parse(admin.permissions_detailed)
      : admin.permissions_detailed || {};
  } catch (e) {
    return {};
  }
};

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
    const admin = req.admin;
    const permissions = getPermissions(admin);

    const { termId, name, description, status, scheduledAt, cover_url } = req.body;
    let coverImage = cover_url || null;
    
    // التعامل مع upload.fields
    const coverFile = req.file || (req.files && req.files.cover ? req.files.cover[0] : null);
    if (coverFile && !coverImage) {
      coverImage = coverFile.path;
    }

    // هل المدير محتاج موافقة؟ (يستثنى المدير العام دائماً)
    // تم نقل التحقق من الموافقة إلى adminAuth.js
    // if (!admin.is_super_admin && permissions.subjects?.requireApproval) { ... }

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
    const admin = req.admin;
    const permissions = getPermissions(admin);
    const { name, description, status, scheduledAt, cover_url } = req.body;
    
    const updates = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (status) updates.status = status;
    if (scheduledAt) updates.scheduled_at = scheduledAt;
    if (cover_url) updates.cover_image = cover_url;
    
    // التعامل مع upload.fields
    const coverFile = req.file || (req.files && req.files.cover ? req.files.cover[0] : null);
    if (coverFile && !cover_url) {
      updates.cover_image = coverFile.path;
    }

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

exports.getSubjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Pass the admin ID to Subject.findByIdWithContent
    const subject = await Subject.findByIdWithContent(id, req.admin.id);
    
    if (!subject) {
      return res.status(404).json({ success: false, message: 'المادة غير موجودة' });
    }

    res.json({ success: true, data: { subject } });
  } catch (error) {
    next(error);
  }
};

exports.addPDFs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { has_watermark } = req.body;
    // Default to true if not explicitly provided as false or 'false'
    const shouldWatermark = has_watermark !== 'false' && has_watermark !== false;
    
    console.log(`[UPLOAD DEBUG] Starting PDF upload for subject ${id}. has_watermark: ${shouldWatermark} (received: ${has_watermark})`);
    
    // Handle both upload.array and upload.fields
    let files = [];
    if (Array.isArray(req.files)) {
      files = req.files;
    } else if (req.files && req.files.pdfs) {
      files = req.files.pdfs;
    } else if (req.file) {
      files = [req.file];
    }
    
    if (files.length === 0) {
      console.warn(`[UPLOAD DEBUG] No files found in request for subject ${id}`);
      return res.status(400).json({ success: false, message: 'يرجى رفع ملفات PDF' });
    }
    
    console.log(`[UPLOAD DEBUG] Processing ${files.length} files. First file size: ${files[0].size}`);
    
    const pdfs = files.map(f => {
      let originalName = f.originalname;
      try {
        // Try to decode UTF-8 if it was mangled by Multer/Latin1
        originalName = Buffer.from(f.originalname, 'latin1').toString('utf8');
      } catch (e) {
        console.warn(`[UPLOAD] Failed to decode filename: ${f.originalname}`);
      }
      
      return {
        name: originalName,
        url: f.path,
        size: f.size || null
      };
    });

    const created = [];
    try {
        console.log(`[UPLOAD DEBUG] Saving ${pdfs.length} PDF records to database...`);
        for (const pdf of pdfs) {
            try {
                const result = await Subject.addPDF(id, pdf.name, pdf.url, pdf.size, shouldWatermark);
                created.push(result);
                console.log(`[UPLOAD DEBUG] Saved PDF: ${pdf.name} (ID: ${result.id})`);
            } catch (insertErr) {
                console.error(`[UPLOAD DEBUG] Failed to save PDF ${pdf.name} to DB:`, insertErr.message);
                throw insertErr;
            }
        }
      
        await Admin.logActivity(req.admin.id, 'upload_pdfs', { subjectId: id, count: created.length }, req.ip);
        
        // Return response IMMEDIATELY after DB save, BEFORE sending notifications to speed up UI
        res.status(201).json({ success: true, message: `تم رفع ${created.length} ملف بنجاح`, data: { pdfs: created } });

        // Notify students in the background (Don't await to avoid UI hang)
        (async () => {
            try {
                const subject = await Subject.findById(id);
                const students = await pool.query('SELECT id FROM users WHERE is_blocked = FALSE');
                
                if (students.rows.length > 0) {
                    const message = `تمت إضافة ${created.length} ملف PDF جديد في مادة: ${subject.name}`;
                    const type = 'new_content';
                    const link = `/#/subjects/${id}`;
                    
                    // Bulk insert notifications in chunks to avoid PostgreSQL parameter limit (65535)
                    const CHUNK_SIZE = 5000;
                    for (let i = 0; i < students.rows.length; i += CHUNK_SIZE) {
                        const chunk = students.rows.slice(i, i + CHUNK_SIZE);
                        const values = [];
                        const placeholders = [];
                        
                        chunk.forEach((student, index) => {
                            const base = index * 4;
                            placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
                            values.push(student.id, message, type, link);
                        });
                        
                        await pool.query(
                            `INSERT INTO notifications (user_id, message, type, link) VALUES ${placeholders.join(', ')}`,
                            values
                        );
                        console.log(`[UPLOAD] Sent notifications to chunk ${i / CHUNK_SIZE + 1}`);
                    }
                }
            } catch (notifyErr) {
                console.error('Background Notification Error:', notifyErr.message);
            }
        })();

        console.log(`[UPLOAD DEBUG] Successfully completed upload process for subject ${id}`);
    } catch (error) {
      console.error('[UPLOAD DEBUG] Error saving PDFs to database:', error);
      throw error;
    }
  } catch (error) {
    console.error('[UPLOAD DEBUG] Final Error in addPDFs:', error.message);
    next(error);
  }
};

exports.addImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Handle both upload.array and upload.fields
    let files = [];
    if (Array.isArray(req.files)) {
      files = req.files;
    } else if (req.files && req.files.images) {
      files = req.files.images;
    } else if (req.file) {
      files = [req.file];
    }

    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'يرجى رفع صور' });
    }

    const images = files.map(f => {
      let originalName = f.originalname;
      try {
        originalName = Buffer.from(f.originalname, 'latin1').toString('utf8');
      } catch (e) {}
      
      return {
        name: originalName,
        url: f.path
      };
    });

    const created = [];
    try {
      for (const img of images) {
        const result = await Subject.addImage(id, img.name, img.url);
        created.push(result);
      }
      await Admin.logActivity(req.admin.id, 'upload_images', { subjectId: id, count: created.length }, req.ip);
      
      // Notify students about new image materials
      try {
        const subject = await Subject.findById(id);
        const students = await pool.query('SELECT id FROM users WHERE is_blocked = FALSE');
        
        if (students.rows.length > 0) {
          const message = `تمت إضافة ${created.length} صور جديدة في مادة: ${subject.name}`;
          const type = 'new_content';
          const link = `/#/subjects/${id}`;
          
          // Bulk insert notifications in chunks to avoid PostgreSQL parameter limit
          const CHUNK_SIZE = 5000;
          for (let i = 0; i < students.rows.length; i += CHUNK_SIZE) {
            const chunk = students.rows.slice(i, i + CHUNK_SIZE);
            const values = [];
            const placeholders = [];
            chunk.forEach((student, index) => {
              const base = index * 4;
              placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
              values.push(student.id, message, type, link);
            });
            
            await pool.query(
              `INSERT INTO notifications (user_id, message, type, link) VALUES ${placeholders.join(', ')}`,
              values
            );
          }
        }
      } catch (notifyErr) {
        console.error('Failed to notify students about new images:', notifyErr);
      }

      res.status(201).json({ success: true, message: `تم رفع ${created.length} صورة بنجاح`, data: { images: created } });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

exports.deleteImage = async (req, res, next) => {
  try {
    const { subjectId, imageId } = req.params;

    await Subject.deleteImage(imageId);
    await Admin.logActivity(req.admin.id, 'delete_image', { subjectId, imageId }, req.ip);
    res.json({ success: true, message: 'تم حذف الصورة بنجاح' });
  } catch (error) {
    next(error);
  }
};

exports.deleteAllPDFs = async (req, res, next) => {
  try {
    const { id } = req.params;

    await Subject.deleteAllPDFs(id);
    await Admin.logActivity(req.admin.id, 'delete_all_pdfs', { subjectId: id }, req.ip);
    res.json({ success: true, message: 'تم حذف جميع ملفات الـ PDF بنجاح' });
  } catch (error) {
    next(error);
  }
};

exports.deleteAllImages = async (req, res, next) => {
  try {
    const { id } = req.params;

    await Subject.deleteAllImages(id);
    await Admin.logActivity(req.admin.id, 'delete_all_images', { subjectId: id }, req.ip);
    res.json({ success: true, message: 'تم حذف جميع الصور بنجاح' });
  } catch (error) {
    next(error);
  }
};

exports.deleteAllExams = async (req, res, next) => {
  try {
    const { id } = req.params;

    await Subject.deleteAllExams(id);
    await Admin.logActivity(req.admin.id, 'delete_all_exams', { subjectId: id }, req.ip);
    res.json({ success: true, message: 'تم حذف جميع الامتحانات بنجاح' });
  } catch (error) {
    next(error);
  }
};

exports.deletePDF = async (req, res, next) => {
  try {
    const { pdfId } = req.params;

    const deleted = await Subject.deletePDF(pdfId);
    await Admin.logActivity(req.admin.id, 'delete_pdf', { pdfId }, req.ip);
    res.json({ success: true, message: 'تم حذف ملف PDF بنجاح', data: { file: deleted } });
  } catch (error) {
    next(error);
  }
};

exports.updatePDFWatermark = async (req, res, next) => {
  try {
    const { pdfId } = req.params;
    const { has_watermark } = req.body;
    
    if (has_watermark === undefined) {
      return res.status(400).json({ success: false, message: 'has_watermark مطلوب' });
    }

    const updated = await Subject.updatePDFWatermark(pdfId, has_watermark);
    
    if (!updated) {
      return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    }

    await Admin.logActivity(req.admin.id, 'update_pdf_watermark', { pdfId, has_watermark }, req.ip);
    res.json({ success: true, message: 'تم تحديث حالة العلامة المائية بنجاح', data: { pdf: updated } });
  } catch (error) {
    next(error);
  }
};


