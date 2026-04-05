const Subject = require('../models/Subject');
const User = require('../models/User');
const pool = require('../config/database');
const { addPoints, POINTS } = require('../utils/pointsCalculator');

exports.getCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const certificate = await Subject.checkCompletion(userId, id);
    
    if (!certificate.completed) {
      return res.json({
        success: true,
        data: {
          completed: false,
          progress: certificate.progress
        }
      });
    }

    res.json({
      success: true,
      data: {
        certificate
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadPdf = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No PDF files uploaded.' });
    }

    const filesInfo = req.files.map(file => ({
      originalName: file.originalname,
      url: file.path,
      size: file.size,
    }));

    res.status(200).json({
      success: true,
      message: 'PDF files uploaded successfully',
      files: filesInfo,
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No image files uploaded.' });
    }

    const filesInfo = req.files.map(file => ({
      originalName: file.originalname,
      url: file.path,
      size: file.size,
    }));

    res.status(200).json({
      success: true,
      message: 'Image files uploaded successfully',
      files: filesInfo,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllSubjects = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { term_id } = req.query;
    
    let subjects;
    if (term_id) {
      subjects = await Subject.findByTerm(term_id);
    } else {
      subjects = await Subject.findAll();
    }
    
    res.json({
      success: true,
      data: {
        subjects: subjects
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getTerms = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT t.*, 
             (SELECT COUNT(*) FROM subjects WHERE term_id = t.id) as subjects_count
      FROM terms t 
      WHERE t.is_published = TRUE
      ORDER BY created_at ASC
    `);
    res.json({
      success: true,
      data: {
        terms: result.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getSubjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const subject = await Subject.findByIdWithContent(id, userId);
    
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'المادة غير موجودة'
      });
    }

    // التحقق من أن الترم منشور للطلاب
    if (subject.term_published === false) {
      return res.status(403).json({
        success: false,
        message: 'هذا الترم غير متاح حالياً'
      });
    }

    // Check if subject is locked (though currently always returns false)
    const isLocked = await Subject.isLocked(id, userId);
    
    if (isLocked) {
      return res.status(403).json({
        success: false,
        message: 'يجب إكمال المستويات السابقة لفتح هذه المادة'
      });
    }

    // Get user progress
    const progress = await Subject.getUserProgress(id, userId);

    // Log Activity
    try {
      await User.logActivity(userId, 'SUBJECT_VIEW', { 
        subjectId: id, 
        subjectName: subject.name 
      }, req.ip);
    } catch (err) {
      console.error('Failed to log activity:', err);
    }

    res.json({
      success: true,
      data: {
        subject: {
          ...subject,
          progress
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.rateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'التقييم يجب أن يكون بين 1 و 5'
      });
    }

    await Subject.rateSubject(userId, id, rating);

    // Add points for rating
    const pointsAdded = await addPoints(userId, 'rate_subject', POINTS.RATE_SUBJECT, { subjectId: id });

    res.json({
      success: true,
      message: pointsAdded ? 'تم التقييم بنجاح وحصلت على 3 نقاط' : 'تم تحديث تقييمك بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

exports.downloadPDF = async (req, res, next) => {
  try {
    const { subjectId, pdfId } = req.params;
    const userId = req.user.id;
    
    const pdf = await pool.query(
      'SELECT * FROM pdfs WHERE id = $1 AND subject_id = $2',
      [pdfId, subjectId]
    );

    if (pdf.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'الملف غير موجود'
      });
    }

    // Increment download count
    await Subject.recordPDFDownload(pdfId);

    // Add points for download
    const pointsAdded = await addPoints(userId, 'download_pdf', POINTS.DOWNLOAD_PDF, { pdfId, subjectId });

    // Use https for production on Fly.io
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : (req.headers['x-forwarded-proto'] || req.protocol);
    let host = req.get('host');
    
    // For production (Fly.io), we want to ensure it's the backend URL
    if (process.env.NODE_ENV === 'production') {
        host = 'tawal-academy-backend.fly.dev';
    }

    const fileUrl = pdf.rows[0].file_url;
    
    // If it's already a full URL (like Cloudinary), inject watermark and return
    if (fileUrl.startsWith('http') || fileUrl.includes('res.cloudinary.com')) {
      let finalUrl = fileUrl;
      
      // Inject Cloudinary dynamic watermark if it's a Cloudinary URL
      if (finalUrl.includes('res.cloudinary.com') && !finalUrl.includes('/admin/')) {
        // High visibility: o_40 (opacity), co_black, bo_3px_solid_white (outline)
        // Adding fl_attachment to suggest it's protected and adding print-specific optimization if possible
        const watermarkTransformation = 'l_text:Arial_120_bold_stroke:Tawal%20Academy,g_center,o_40,a_-35,fl_tiled,co_black,bo_3px_solid_white';
        
        if (finalUrl.includes('/upload/')) {
          const parts = finalUrl.split('/upload/');
          const versionPart = parts[1].split('/');
          
          if (versionPart[0].startsWith('v') && !isNaN(versionPart[0].substring(1))) {
            finalUrl = `${parts[0]}/upload/${watermarkTransformation}/${parts[1]}`;
          } else {
            finalUrl = `${parts[0]}/upload/${watermarkTransformation},${parts[1]}`;
          }
          
          // Force high quality for printing if it's a PDF
          if (finalUrl.endsWith('.pdf')) {
            // fl_attachment: Ensures browser treats it as a downloadable/printable file
            // dpr_2.0: Higher resolution for print
            finalUrl = finalUrl.replace('/upload/', '/upload/q_auto:best,dn_300,dpr_2.0/');
          }
        }
      }

      return res.json({
        success: true,
        message: pointsAdded ? 'تم إضافة 5 نقاط لرصيدك' : 'تم تحميل الملف',
        data: {
          url: fileUrl,
          full_url: finalUrl
        }
      });
    }

    const cleanFileUrl = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;

    res.json({
      success: true,
      message: pointsAdded ? 'تم إضافة 5 نقاط لرصيدك' : 'تم تحميل الملف',
      data: {
        url: fileUrl,
        full_url: `${protocol}://${host}${cleanFileUrl}`
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.viewImage = async (req, res, next) => {
  try {
    const { subjectId, imageId } = req.params;
    const userId = req.user.id;
    
    const image = await pool.query(
      'SELECT * FROM images WHERE id = $1 AND subject_id = $2',
      [imageId, subjectId]
    );

    if (image.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'الصورة غير موجودة'
      });
    }

    // Increment view count
    await Subject.recordImageView(imageId);

    // Add points for viewing
    const pointsAdded = await addPoints(userId, 'view_image', POINTS.VIEW_IMAGE, { imageId, subjectId });

    // Use https for production on Fly.io
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : (req.headers['x-forwarded-proto'] || req.protocol);
    let host = req.get('host');
    
    // For production (Fly.io), we want to ensure it's the backend URL
    if (process.env.NODE_ENV === 'production') {
        host = 'tawal-academy-backend.fly.dev';
    }

    const fileUrl = image.rows[0].file_url;

    // If it's already a full URL (like Cloudinary), inject watermark and return
    if (fileUrl.startsWith('http') || fileUrl.includes('res.cloudinary.com')) {
      let finalUrl = fileUrl;
      
      // Inject Cloudinary dynamic watermark if it's a Cloudinary URL
      if (finalUrl.includes('res.cloudinary.com') && !finalUrl.includes('/admin/')) {
        // High visibility: o_40 (opacity), co_black, bo_3px_solid_white (outline)
        const watermarkTransformation = 'l_text:Arial_120_bold_stroke:Tawal%20Academy,g_center,o_40,a_-35,fl_tiled,co_black,bo_3px_solid_white';
        
        if (finalUrl.includes('/upload/')) {
          const parts = finalUrl.split('/upload/');
          const versionPart = parts[1].split('/');
          
          if (versionPart[0].startsWith('v') && !isNaN(versionPart[0].substring(1))) {
            finalUrl = `${parts[0]}/upload/${watermarkTransformation}/${parts[1]}`;
          } else {
            finalUrl = `${parts[0]}/upload/${watermarkTransformation},${parts[1]}`;
          }
        }
      }

      return res.json({
        success: true,
        message: pointsAdded ? 'تم إضافة نقطتين لرصيدك' : 'تم عرض الصورة',
        data: {
          url: fileUrl,
          full_url: finalUrl
        }
      });
    }

    const cleanFileUrl = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;

    res.json({
      success: true,
      message: pointsAdded ? 'تم إضافة نقطتين لرصيدك' : 'تم عرض الصورة',
      data: {
        url: fileUrl,
        full_url: `${protocol}://${host}${cleanFileUrl}`
      }
    });
  } catch (error) {
    next(error);
  }
};
