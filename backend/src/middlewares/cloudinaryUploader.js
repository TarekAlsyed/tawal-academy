const multer = require('multer');
const CloudinaryStorage = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const Subject = require('../models/Subject');

// Create storage engine for different file types
const storage = CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    try {
      // 1. Get subject ID from params or URL
      let subjectId = req.params.id;
      if (!subjectId) {
        const urlMatch = req.originalUrl.match(/\/subjects\/(\d+)/);
        if (urlMatch) subjectId = urlMatch[1];
      }

      // 2. Get subject name (from body or DB)
      let subjectName = req.body.name || req.body.title;
      
      if (!subjectName && subjectId) {
        try {
          // استخدام الدالة السريعة الجديدة لجلب الاسم فقط
          subjectName = await Subject.getNameById(subjectId);
        } catch (err) {
          console.error('Error fetching subject name for cloudinary:', err);
        }
      }
      
      if (!subjectName) subjectName = subjectId || 'unnamed_subject';
      
      // 3. Sanitize subject name (Replace special chars, limit length)
      const sanitizedName = subjectName.toString()
        .trim()
        .replace(/[^\u0621-\u064A\u0660-\u0669a-zA-Z0-9\s]/g, '') // Keep Arabic/English/Numbers/Spaces only
        .replace(/\s+/g, '_')                                     // Spaces to underscores
        .substring(0, 30);                                        // Keep it short
  
      // 4. Folder structure using Subject Name
      const folderPath = `tawal_academy/subjects/${sanitizedName}/${file.fieldname === 'pdfs' ? 'pdfs' : 'images'}`;
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      
      // Safe public ID
      const ext = file.originalname.split('.').pop() || (file.fieldname === 'pdfs' ? 'pdf' : 'jpg');
      const publicId = `${file.fieldname}-${uniqueSuffix}.${ext}`;
      
      // Determine resource type and prepare public ID
      const isPDF = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
      const resourceType = isPDF ? 'raw' : 'auto';
      
      // For 'raw' files, Cloudinary doesn't handle extensions automatically the same way as images
      // but it's safer to include it in the public_id for raw files to keep the original filename
      
      if (file.fieldname === 'cover') {
        return {
          folder: 'tawal_academy/covers',
          public_id: publicId,
          resource_type: 'image',
          access_mode: 'public',
          transformation: [
            { width: 800, crop: 'limit' }, // Resize if larger than 800px
            { quality: 'auto' },           // Automatic quality optimization
            { fetch_format: 'auto' }       // Automatic format selection (webp/avif if supported)
          ]
        };
      }
      
      return {
        folder: folderPath,
        public_id: publicId,
        resource_type: resourceType,
        access_mode: 'public',
        transformation: resourceType === 'image' ? [
          { width: 1200, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ] : undefined
      };
    } catch (error) {
      console.error('Cloudinary Storage Params Error:', error);
      return {
        folder: 'tawal_academy/fallback',
        public_id: `file-${Date.now()}`,
        resource_type: 'auto'
      };
    }
  },
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (Cloudinary free tier restriction for some file types)
  },
  fileFilter: (req, file, cb) => {
    // Check if it's an image or PDF
    const isPDF = file.mimetype === 'application/pdf';
    const isImage = file.mimetype.startsWith('image/');
    
    if (isPDF || isImage) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم. يرجى رفع صور أو ملفات PDF فقط.'), false);
    }
  }
});

module.exports = upload;
