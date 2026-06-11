const multer = require('multer');
const path = require('path');
const fs = require('fs');
// const FileType = require('file-type'); // Import dynamically due to ESM

// Create uploads directory if it doesn't exist (only in development or if not using Cloudinary)
const uploadDir = path.join(__dirname, '../../uploads');
const subDirs = ['covers', 'pdfs', 'images', 'excel', 'audio', 'videos'];

// Ensure uploads directory and subdirectories exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

subDirs.forEach(dir => {
  const fullPath = path.join(uploadDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subDir = '';
    if (file.fieldname === 'cover') subDir = 'covers';
    else if (file.fieldname === 'pdfs') subDir = 'pdfs';
    else if (file.fieldname === 'images') subDir = 'images';
    else if (file.fieldname === 'excel') subDir = 'excel';
    else if (file.fieldname === 'audio') subDir = 'audio';
    else if (file.fieldname === 'video') subDir = 'videos';
    
    cb(null, path.join(uploadDir, subDir));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (Initial Check)
const fileFilter = (req, file, cb) => {
  // Validate file extension
  const allowedTypes = /jpeg|jpg|png|gif|pdf|xlsx|xls|docx|doc/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  // Validate MIME type to prevent file spoofing
  const allowedMimeTypes = [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'application/pdf', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'application/msword'
  ];
  
  const mimetype = allowedMimeTypes.includes(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مسموح به. المسموح: الصور، PDF، Excel، Word فقط.'));
  }
};

// Create multer instance for documents and images
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 ميجابايت حد أقصى للملفات العادية و PDF
  },
  fileFilter: fileFilter,
});

const audioFileFilter = (req, file, cb) => {
  // Validate file extension
  const allowedTypes = /mp3|wav|ogg|m4a/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  // Validate MIME type
  const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
  const mimetype = allowedMimeTypes.includes(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مسموح به. المسموح: MP3, WAV, OGG, M4A فقط.'));
  }
};

// Create multer instance for audio files
const uploadAudio = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // Fix #39: 100MB for audio files (was 1GB)
  },
  fileFilter: audioFileFilter,
});

const videoFileFilter = (req, file, cb) => {
  const allowedTypes = /mp4|mkv|avi|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  const allowedMimeTypes = ['video/mp4', 'video/x-matroska', 'video/x-msvideo', 'video/webm'];
  const mimetype = allowedMimeTypes.includes(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مسموح به. المسموح: MP4, MKV, AVI, WebM فقط.'));
  }
};

// Create multer instance for video files
const uploadVideo = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // Fix #39: 500MB max for video files (was 10GB)
  },
  fileFilter: videoFileFilter,
});

// Magic Number Validation Middleware
// This middleware runs AFTER multer has saved the file, to verify its content
const verifyFileSignature = async (req, res, next) => {
    if (!req.file && (!req.files || req.files.length === 0)) {
        return next();
    }

    const FileType = await import('file-type'); // Dynamic import for ESM package
    
    const filesToVerify = [];
    if (req.file) filesToVerify.push(req.file);
    if (req.files) {
        if (Array.isArray(req.files)) {
            filesToVerify.push(...req.files);
        } else {
            // Handle object of arrays (e.g. upload.fields)
            Object.values(req.files).forEach(arr => filesToVerify.push(...arr));
        }
    }

    try {
        for (const file of filesToVerify) {
            const filePath = file.path;
            
            // Read first 4100 bytes (enough for most magic numbers)
            // Or use file-type fromFile (which reads chunk)
            const fileTypeResult = await FileType.default.fromFile(filePath);
            
            // If fileTypeResult is undefined, it means unknown type or text file (like CSV/SVG if not handled)
            // For our allowed types (Images, PDF, Office), it SHOULD be detected.
            
            if (!fileTypeResult) {
                // If we can't detect type, and we expect binary formats, it's suspicious.
                // Exception: XML-based office files sometimes might be tricky, but file-type handles them well usually.
                console.warn(`[SECURITY WARNING] Could not detect file type for: ${file.originalname}`);
                // We might want to allow if it's strictly matching extension, but for high security, we block unknown binary blobs
                // fs.unlinkSync(filePath);
                // return res.status(400).json({ success: false, message: 'الملف غير صالح أو تالف (توقيع غير معروف).' });
            } else {
                const detectedMime = fileTypeResult.mime;
                
                // Allow specific mismatches (e.g. docx is identified as application/x-zip-compressed sometimes, or zip)
                // But generally should match.
                
                // We double check if the detected mime is in our allowed list
                const allowedMimesStart = [
                    'image/', 
                    'application/pdf',
                    'application/x-cfb', // Old office formats
                    'application/zip',   // New office formats (docx, xlsx) are zips
                    'application/vnd.openxmlformats-officedocument',
                    'application/vnd.ms-excel',
                    'application/msword'
                ];
                
                const isAllowed = allowedMimesStart.some(m => detectedMime.startsWith(m));

                if (!isAllowed) {
                     console.error(`[SECURITY ALERT] Magic Number Mismatch! Uploaded as ${file.mimetype} but detected as ${detectedMime}`);
                     // Delete the dangerous file immediately
                     fs.unlinkSync(filePath);
                     return res.status(400).json({ 
                         success: false, 
                         message: 'تم رفض الملف لأسباب أمنية (تزوير نوع الملف).' 
                     });
                }
            }
        }
        next();
    } catch (error) {
        console.error('[FILE VERIFICATION ERROR]', error);
        // Clean up files on error
        filesToVerify.forEach(f => {
             if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
        res.status(500).json({ success: false, message: 'خطأ أثناء فحص أمان الملفات.' });
    }
};

const imageAutoSaveService = require('../services/imageAutoSaveService');

// New middleware for auto-saving images and audio
const autoSaveUploadedFiles = async (req, res, next) => {
    // If no files, skip
    if (!req.file && (!req.files || req.files.length === 0)) {
        return next();
    }

    const filesToProcess = [];
    if (req.file) filesToProcess.push(req.file);
    if (req.files) {
        if (Array.isArray(req.files)) {
            filesToProcess.push(...req.files);
        } else {
            Object.values(req.files).forEach(arr => filesToProcess.push(...arr));
        }
    }

    try {
        for (const file of filesToProcess) {
            // Check if it's an image or audio
            if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
                // Determine source and type based on route or fieldname
                const options = {
                    source: req.originalUrl,
                    type: imageAutoSaveService.determineFileType(file),
                    metadata: {
                        userId: req.user?.id || req.admin?.id,
                        ip: req.ip
                    }
                };
                
                // Auto-save the file
                const saved = await imageAutoSaveService.autoSave(file, options);
                
                // Attach saved record to request for potential use in controllers
                if (saved) {
                    if (!req.autoSavedFiles) req.autoSavedFiles = [];
                    req.autoSavedFiles.push(saved);
                }
            }
        }
        next();
    } catch (error) {
        console.error('[AUTO-SAVE MIDDLEWARE ERROR]', error);
        // We don't block the request if auto-save fails, just continue
        next();
    }
};

module.exports = { upload, uploadAudio, uploadVideo, verifyFileSignature, autoSaveUploadedImages: autoSaveUploadedFiles };
