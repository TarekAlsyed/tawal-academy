const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./authRoutes');
const subjectRoutes = require('./subjectRoutes');
const examRoutes = require('./examRoutes');
const profileRoutes = require('./profileRoutes');
const questionRoutes = require('./questionRoutes');
const notificationRoutes = require('./notificationRoutes');
const adminRoutes = require('./adminRoutes');
const fileRoutes = require('./fileRoutes');
const monitoringRoutes = require('./monitoringRoutes');
const { upload } = require('../middlewares/upload');
const ImageStorageService = require('../services/imageStorageService');
const auth = require('../middlewares/auth');
const { adminAuth } = require('../middlewares/adminAuth');
const deviceCheck = require('../middlewares/deviceCheck');

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route to upload course background using Elite Permanent Storage System (Admin only)
router.post('/upload-course-background', adminAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'يرجى اختيار صورة للرفع'
      });
    }

    // Use Elite System: Upload to Cloudinary + Local Backup + DB Permanent Record
    const savedImage = await ImageStorageService.uploadAndSavePermanently(req.file, 'tawal_academy_backgrounds');

    res.json({
      success: true,
      message: 'تم رفع خلفية المادة وتأمينها بنجاح في النظام الدائم',
      imageUrl: savedImage.cloudinary_url,
      storageId: savedImage.id
    });
  } catch (err) {
    console.error('Elite Upload Error:', err);
    res.status(500).json({
      success: false,
      message: 'فشل رفع وتأمين الصورة في النظام الدائم',
      error: err.message
    });
  }
});

// Public routes (No Auth needed)
router.use('/auth', authRoutes);
router.use('/monitoring', monitoringRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Student routes (Auth and Device Check needed)
const studentRouter = express.Router();
studentRouter.use(auth, deviceCheck);

studentRouter.use('/subjects', subjectRoutes);
studentRouter.use('/exams', examRoutes);
studentRouter.use('/questions', questionRoutes);
studentRouter.use('/profile', profileRoutes);
studentRouter.use('/notifications', notificationRoutes);
studentRouter.use('/files', fileRoutes);

// Apply the student router under the main router
router.use(studentRouter);

module.exports = router;
