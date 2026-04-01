const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const Subject = require('../models/Subject');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');

// Use Disk Storage for better reliability with large files on shared hosting
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Try system /tmp first, fallback to local uploads/temp
        let uploadDir = '/tmp';
        
        // Check if /tmp is writable, if not use local path
        try {
            fs.accessSync(uploadDir, fs.constants.W_OK);
        } catch (e) {
            uploadDir = path.resolve(__dirname, '../../uploads/temp');
        }
            
        if (!fs.existsSync(uploadDir)) {
            try {
                fs.mkdirSync(uploadDir, { recursive: true });
            } catch (err) {
                console.error('[STORAGE ERROR] Failed to create temp directory:', err.message);
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

        const files = Array.isArray(req.files) ? req.files : (req.files?.pdfs || req.files?.images || [req.file].filter(Boolean));
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
                    subjectName = await Subject.getNameById(subjectId);
                } catch (err) {}
            }
            if (!subjectName) subjectName = subjectId || 'unnamed_subject';

            const sanitizedName = subjectName.toString().trim()
                .replace(/[^\u0621-\u064A\u0660-\u0669a-zA-Z0-9\s]/g, '')
                .replace(/\s+/g, '_').substring(0, 30);

            const isPDF = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
            const folder = `tawal_academy/subjects/${sanitizedName}/${isPDF ? 'pdfs' : 'images'}`;
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const publicId = `${file.fieldname}-${uniqueSuffix}`;

            console.log(`[CLOUDINARY] Uploading file: ${file.originalname} (${file.size} bytes) to folder: ${folder}`);

            // 2. Upload to Cloudinary using Stream
            const fileStream = fs.createReadStream(file.path);
            
            await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: folder,
                        public_id: publicId,
                        resource_type: isPDF ? 'auto' : 'image',
                        access_mode: 'public',
                        timeout: 120000, // 2 minutes timeout for server-to-server upload
                        transformation: isPDF ? undefined : [
                            { width: 1200, crop: 'limit' },
                            { quality: 'auto' },
                            { fetch_format: 'auto' }
                        ]
                    },
                    (error, result) => {
                        // Cleanup local temp file
                        try {
                            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                        } catch (e) {
                            console.error('[CLEANUP ERROR]:', e.message);
                        }

                        if (error) {
                            console.error('[CLOUDINARY ERROR]:', error);
                            reject(error);
                        } else {
                            file.path = result.secure_url;
                            file.cloudinary_public_id = result.public_id;
                            console.log(`[CLOUDINARY] Success: ${file.originalname} -> ${result.secure_url}`);
                            resolve(result);
                        }
                    }
                );

                fileStream.pipe(uploadStream);
            });
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
        res.status(500).json({ success: false, message: 'فشل رفع الملفات إلى السحابة', error: error.message });
    }
};

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
    },
    fileFilter: (req, file, cb) => {
        // More permissive filter to avoid 400 errors with some browsers
        cb(null, true);
    }
});

module.exports = { upload, uploadToCloudinary };
