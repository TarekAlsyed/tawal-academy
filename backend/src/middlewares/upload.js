const multer = require('multer');
const path = require('path');
const fs = require('fs');

// إنشاء المجلدات إذا لم تكن موجودة
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// إعداد التخزين للصور
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/images';
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// إعداد التخزين لملفات PDF
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/pdfs';
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pdf-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// إعداد التخزين لصور الأغلفة
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/covers';
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// فلتر للصور فقط
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('الملف يجب أن يكون صورة (jpg, jpeg, png, gif, webp)'));
  }
};

// فلتر لملفات PDF فقط
const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('الملف يجب أن يكون PDF'));
  }
};

// فلتر لملفات Excel
const excelFilter = (req, file, cb) => {
  const allowedTypes = /xlsx|xls|csv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  if (extname) {
    cb(null, true);
  } else {
    cb(new Error('الملف يجب أن يكون Excel (xlsx, xls, csv)'));
  }
};

// Multer configurations
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter
});

const uploadPDF = multer({
  storage: pdfStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: pdfFilter
});

const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: imageFilter
});

const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: excelFilter
});

module.exports = {
  uploadImage,
  uploadPDF,
  uploadCover,
  uploadExcel
};
