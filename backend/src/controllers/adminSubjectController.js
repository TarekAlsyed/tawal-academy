const Subject = require('../models/Subject');
const Admin = require('../models/Admin');
const PendingApproval = require('../models/PendingApproval');
const pool = require('../config/database');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const { notifyEvent } = require('../utils/notificationSender');

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
      // ✅ L-05 FIX: Store relative path instead of absolute system path
      coverImage = coverFile.path.includes('http') ? coverFile.path : coverFile.path.replace(/\\/g, '/').replace(/^.*\/uploads\//, '/uploads/');
    }

    // هل المدير محتاج موافقة؟ (يستثنى المدير العام دائماً)
    // تم نقل التحقق من الموافقة إلى adminAuth.js
    // if (!admin.is_super_admin && permissions.subjects?.requireApproval) { ... }

    if (!termId || !name) {
      return res.status(400).json({ success: false, message: 'termId و name مطلوبان' });
    }

    const subject = await Subject.create(termId, name, description || null, coverImage, status || 'open', scheduledAt || null, req.admin.id);
    await Admin.logActivity(req.admin.id, 'create_subject', { subjectId: subject.id }, req.ip);
    
    // 🔔 Notify all students
    await notifyEvent('new_subject', { subjectName: name }, `/subjects/${subject.id}`);

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
    
    // 🔔 Notify all students
    const subjectName = subject.name || name || 'مادة';
    await notifyEvent('update_subject', { subjectName }, `/subjects/${id}`);

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
      console.warn(`[UPLOAD] No files found in request for subject ${id}`);
      return res.status(400).json({ success: false, message: 'يرجى اختيار ملفات PDF للرفع' });
    }

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'المادة غير موجودة' });
    }

    const sanitizedName = (subject.name || 'subject_' + id)
      .toString().trim()
      .replace(/[^\u0621-\u064A\u0660-\u0669a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_').substring(0, 30);

    const created = [];

    for (const file of files) {
      console.log("PDF upload start", file.size);

      let originalName = file.originalname;
      try {
        originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      } catch (e) {
        console.warn(`[UPLOAD] Failed to decode filename: ${file.originalname}`);
      }

      let fileUrl = file.path;
      let isCloudinary = false;

      // Safe Cloudinary upload wrapped in try/catch
      // NOTE: Cloudinary free accounts strictly limit uploads to 10MB. Files >10MB must be stored locally.
      // Calling upload_large is avoided because it uses event streams that throw unhandled errors and crash Node.
      const hasCloudinary = Boolean(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME);
      const isOverCloudinaryLimit = file.size > 10 * 1024 * 1024;

      if (hasCloudinary && !isOverCloudinaryLimit && file.path && fs.existsSync(file.path)) {
        try {
          const folder = `tawal_academy/subjects/${sanitizedName}/pdfs`;
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const publicId = `pdf-${uniqueSuffix}`;

          const uploadOptions = {
            folder,
            public_id: publicId,
            resource_type: 'auto',
            access_mode: 'public',
            timeout: 600000,
            use_filename: true,
            unique_filename: true,
            overwrite: true
          };

          const result = await cloudinary.uploader.upload(file.path, uploadOptions);

          if (result && result.secure_url) {
            fileUrl = result.secure_url;
            isCloudinary = true;
            console.log(`[CLOUDINARY] Upload success: ${file.originalname} -> ${result.secure_url}`);

            try {
              if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            } catch (unlinkErr) {
              console.warn('[CLEANUP] Could not remove temp file:', unlinkErr.message);
            }
          }
        } catch (cloudinaryErr) {
          console.error('[CLOUDINARY ERROR] PDF upload failed for', file.originalname, ':', cloudinaryErr.message);
          console.warn('[CLOUDINARY FALLBACK] Storing file locally instead of failing.');
        }
      } else if (isOverCloudinaryLimit) {
        console.log(`[STORAGE] File "${file.originalname}" is ${Math.round(file.size / (1024 * 1024))}MB (>10MB limit). Storing directly in permanent local storage.`);
      }

      // If not uploaded to Cloudinary, ensure file is stored permanently in uploads/pdfs
      if (!isCloudinary && file.path && fs.existsSync(file.path)) {
        try {
          const persistentDir = path.resolve(__dirname, '../../uploads/pdfs');
          if (!fs.existsSync(persistentDir)) {
            fs.mkdirSync(persistentDir, { recursive: true });
          }
          const targetFilename = path.basename(file.path);
          const targetPath = path.join(persistentDir, targetFilename);
          if (file.path !== targetPath) {
            fs.copyFileSync(file.path, targetPath);
            try { fs.unlinkSync(file.path); } catch(e) {}
          }
          fileUrl = `/uploads/pdfs/${targetFilename}`;
          console.log(`[LOCAL STORAGE] PDF saved locally at: ${fileUrl}`);
        } catch (localErr) {
          console.error('[LOCAL STORAGE ERROR] Failed to store local PDF:', localErr.message);
        }
      }

      // Save record in database
      try {
        const result = await Subject.addPDF(id, originalName, fileUrl, file.size || null, shouldWatermark);
        created.push(result);
        console.log(`[UPLOAD DEBUG] Saved PDF to DB: ${originalName} (ID: ${result.id})`);
      } catch (insertErr) {
        console.error(`[UPLOAD DEBUG] Failed to save PDF ${originalName} to DB:`, insertErr.message);
        return res.status(400).json({
          success: false,
          message: `فشل حفظ بيانات الملف في قاعدة البيانات: ${insertErr.message}`
        });
      }
    }

    if (req.admin && req.admin.id) {
      await Admin.logActivity(req.admin.id, 'upload_pdfs', { subjectId: id, count: created.length }, req.ip);
    }

    res.status(201).json({
      success: true,
      message: `تم رفع ${created.length} ملف بنجاح`,
      data: { pdfs: created }
    });

    (async () => {
      try {
        await notifyEvent('new_pdf', { subjectName: subject.name, count: created.length }, `/#/subjects/${id}`);
      } catch (notifyErr) {
        console.error('Background Notification Error:', notifyErr.message);
      }
    })();
  } catch (error) {
    console.error('[UPLOAD DEBUG] Final Error in addPDFs:', error);
    return res.status(400).json({
      success: false,
      message: `حدث خطأ أثناء رفع ملفات الـ PDF: ${error.message || 'خطأ غير معروف'}`
    });
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
      
      // ✅ Notify students
      (async () => {
        try {
            const subject = await Subject.findById(id);
            await notifyEvent('new_image', { subjectName: subject.name, count: created.length }, `/#/subjects/${id}`);
        } catch (notifyErr) {
            console.error('Background Notification Error:', notifyErr.message);
        }
      })();
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

exports.addVideos = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { youtube_link, title } = req.body;
    
    // إذا كان هناك رابط يوتيوب، نرفعه بدون ملف
    if (youtube_link) {
      if (!title) return res.status(400).json({ success: false, message: 'عنوان الفيديو مطلوب' });
      const result = await Subject.addVideo(id, title, null, youtube_link, null);
      await Admin.logActivity(req.admin.id, 'add_youtube_video', { subjectId: id, videoId: result.id }, req.ip);
      
      // ✅ Notify students
      (async () => {
        try {
            const subject = await Subject.findById(id);
            await notifyEvent('new_video', { subjectName: subject.name, count: 1 }, `/#/subjects/${id}`);
        } catch (e) {}
      })();
      
      return res.status(201).json({ success: true, message: 'تمت إضافة رابط اليوتيوب بنجاح', data: { video: result } });
    }

    // Handle upload.array for video files
    let files = [];
    if (Array.isArray(req.files)) files = req.files;
    else if (req.files && req.files.videos) files = req.files.videos;
    else if (req.file) files = [req.file];

    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'يرجى رفع فيديو أو إدخال رابط يوتيوب' });
    }

    const videos = files.map(f => {
      let originalName = f.originalname;
      try { originalName = Buffer.from(f.originalname, 'latin1').toString('utf8'); } catch (e) {}
      return { name: originalName, url: f.path, size: f.size };
    });

    const created = [];
    for (const vid of videos) {
      const result = await Subject.addVideo(id, vid.name, vid.url, null, vid.size);
      created.push(result);
    }
    await Admin.logActivity(req.admin.id, 'upload_videos', { subjectId: id, count: created.length }, req.ip);
    
    // ✅ Notify students
    (async () => {
      try {
          const subject = await Subject.findById(id);
          await notifyEvent('new_video', { subjectName: subject.name, count: created.length }, `/#/subjects/${id}`);
      } catch (e) {}
    })();

    res.status(201).json({ success: true, message: `تم رفع ${created.length} فيديو بنجاح`, data: { videos: created } });
  } catch (error) {
    next(error);
  }
};

exports.deleteVideo = async (req, res, next) => {
  try {
    const { subjectId, videoId } = req.params;
    await Subject.deleteVideo(videoId);
    await Admin.logActivity(req.admin.id, 'delete_video', { subjectId, videoId }, req.ip);
    res.json({ success: true, message: 'تم حذف الفيديو بنجاح' });
  } catch (error) {
    next(error);
  }
};

exports.addAudios = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    let files = [];
    if (Array.isArray(req.files)) files = req.files;
    else if (req.files && req.files.audios) files = req.files.audios;
    else if (req.file) files = [req.file];

    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'يرجى رفع ملف صوتي' });
    }

    const audios = files.map(f => {
      let originalName = f.originalname;
      try { originalName = Buffer.from(f.originalname, 'latin1').toString('utf8'); } catch (e) {}
      return { name: originalName, url: f.path, size: f.size };
    });

    const created = [];
    for (const aud of audios) {
      const result = await Subject.addAudio(id, aud.name, aud.url, aud.size);
      created.push(result);
    }
    await Admin.logActivity(req.admin.id, 'upload_audios', { subjectId: id, count: created.length }, req.ip);
    
    // ✅ Notify students
    (async () => {
      try {
          const subject = await Subject.findById(id);
          await notifyEvent('new_audio', { subjectName: subject.name, count: created.length }, `/#/subjects/${id}`);
      } catch (e) {}
    })();

    res.status(201).json({ success: true, message: `تم رفع ${created.length} ملف صوتي بنجاح`, data: { audios: created } });
  } catch (error) {
    next(error);
  }
};

exports.deleteAudio = async (req, res, next) => {
  try {
    const { subjectId, audioId } = req.params;
    await Subject.deleteAudio(audioId);
    await Admin.logActivity(req.admin.id, 'delete_audio', { subjectId, audioId }, req.ip);
    res.json({ success: true, message: 'تم حذف الملف الصوتي بنجاح' });
  } catch (error) {
    next(error);
  }
};


