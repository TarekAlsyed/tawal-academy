const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const Subject = require('../models/Subject');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');

// Use Disk Storage for better reliability with large files on shared hosting
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Try local uploads/temp first (more reliable on AlwaysData/Shared Hosting)
        let uploadDir = path.resolve(__dirname, '../../uploads/temp');
        
        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            try {
                fs.mkdirSync(uploadDir, { recursive: true });
            } catch (err) {
                console.error('[STORAGE ERROR] Failed to create local temp directory, falling back to /tmp:', err.message);
                uploadDir = '/tmp';
            }
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Optimized Cloudinary Upload Middleware using Stream
const uploadToCloudinary = async (req, res, next) => {
    try {
        if (!req.files && !req.file) return next();
        // Fixed: Ensure all files from all fields (cover, pdfs, images, etc.) are processed
        let files = [];
        if (Array.isArray(req.files)) {
            files = req.files;
        } else if (req.files && typeof req.files === 'object') {
            files = Object.values(req.files).flat();
        } else if (req.file) {
            files = [req.file];
        }

        if (files.length === 0) return next();

        console.log(`[CLOUDINARY] Starting sequential upload for ${files.length} files...`);

        // Use sequential upload (one by one) to avoid bandwidth saturation and memory spikes
        for (const file of files) {
            // 1. Determine Folder & Public ID
            let subjectId = req.params.id;
            if (!subjectId) {
                const urlMatch = req.originalUrl.match(/\/subjects\/(\d+)/);
                if (urlMatch) subjectId = urlMatch[1];
            }

            let subjectName = req.body.name || req.body.title;
            if (!subjectName && subjectId) {
                try {
                    const subject = await Subject.findById(subjectId);
                    if (subject) subjectName = subject.name;
                } catch (err) {
                    console.error('[CLOUDINARY] Failed to fetch subject name:', err.message);
                }
            }
            if (!subjectName) subjectName = subjectId || 'unnamed_subject';

            const sanitizedName = subjectName.toString().trim()
                .replace(/[^\u0621-\u064A\u0660-\u0669a-zA-Z0-9\s]/g, '')
                .replace(/\s+/g, '_').substring(0, 30);

            const isPDF = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
            const isVideo = file.mimetype.startsWith('video/');
            
            // PDF resource type should ideally be 'image' in Cloudinary to support page extraction and overlays
            // but 'auto' usually works fine. We'll stick with 'auto' but ensure robust options.
            const folder = `tawal_academy/subjects/${sanitizedName}/${isPDF ? 'pdfs' : (isVideo ? 'videos' : 'images')}`;
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const publicId = `${file.fieldname}-${uniqueSuffix}`;

            console.log(`[CLOUDINARY] Uploading file: ${file.originalname} (${file.size} bytes) to folder: ${folder}`);

            // 2. Upload to Cloudinary directly from disk (Most reliable for shared hosting)
            // Use upload_large if file is over 10MB, otherwise standard upload
            const isLarge = file.size > 10 * 1024 * 1024;
            
            const uploadOptions = {
                folder: folder,
                public_id: publicId,
                resource_type: 'auto', // Cloudinary handles PDFs as 'image' internally for transformations
                access_mode: 'public',
                timeout: 600000, // 10 minutes
                use_filename: true,
                unique_filename: true,
                overwrite: true,
                chunk_size: isLarge ? 6000000 : undefined,
                // Transformation is only applied to images
                transformation: (isPDF || isVideo) ? [] : [
                    { width: 1200, crop: 'limit' },
                    { quality: 'auto' },
                    { fetch_format: 'auto' }
                ]
            };

            let result;
            try {
                result = isLarge 
                    ? await cloudinary.uploader.upload_large(file.path, uploadOptions)
                    : await cloudinary.uploader.upload(file.path, uploadOptions);
                
                console.log(`[CLOUDINARY] Success: ${file.originalname} -> ${result.secure_url}`);
            } catch (uploadErr) {
                console.error(`[CLOUDINARY ERROR] Failed to upload ${file.originalname}:`, uploadErr.message);
                // Attempt one retry for smaller files if it's a timeout
                if (!isLarge && uploadErr.message.includes('timeout')) {
                    console.log(`[CLOUDINARY] Retrying ${file.originalname} once...`);
                    result = await cloudinary.uploader.upload(file.path, uploadOptions);
                } else {
                    throw uploadErr;
                }
            }

            // Cleanup local temp file
            try {
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            } catch (e) {
                console.error('[CLEANUP ERROR]:', e.message);
            }

            file.path = result.secure_url;
            file.cloudinary_public_id = result.public_id;
        }

        console.log('[CLOUDINARY] All files uploaded successfully.');
        next();
    } catch (error) {
        console.error('[UPLOAD MIDDLEWARE ERROR]:', error);
        // Cleanup local temp files on error
        if (req.files) {
            const filesToCleanup = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            filesToCleanup.forEach(f => {
                if (f.path && fs.existsSync(f.path)) {
                    try { fs.unlinkSync(f.path); } catch(e) {}
                }
            });
        }
        res.status(500).json({ 
            success: false, 
            message: 'فشل رفع الملفات إلى السحابة'
        });
    }
};

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // SECURITY FIX: 50MB limit (was 500MB) — prevents storage abuse
    },
    fileFilter: (req, file, cb) => {
        const path = require('path');
        const allowedExtensions = /jpeg|jpg|png|gif|pdf|xlsx|xls|docx|doc|mp3|wav|ogg|m4a|mp4|mkv|avi|webm/;
        const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
        
        const allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/gif',
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a',
            'video/mp4', 'video/x-matroska', 'video/x-msvideo', 'video/webm'
        ];
        const mimetype = allowedMimeTypes.includes(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('نوع الملف غير مسموح به.'));
    }
});

module.exports = { upload, uploadToCloudinary };
