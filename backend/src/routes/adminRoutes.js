const express = require('express');
const router = express.Router();
const { adminAuth, checkPermission } = require('../middlewares/adminAuth');
const { uploadAudio, upload: localUpload } = require('../middlewares/upload'); // Only keep what is needed from here
const { adminLoginValidation, subjectValidation, examValidation, updateExamValidation, questionBankValidation, updateQuestionBankValidation, updateAdminValidation, termValidation, updateTermValidation } = require('../middlewares/validator');

// Controllers
const adminAuthController = require('../controllers/adminAuthController');
const adminSubjectController = require('../controllers/adminSubjectController');
const adminExamController = require('../controllers/adminExamController');
const adminStudentController = require('../controllers/adminStudentController');
const adminQuestionReplyController = require('../controllers/adminQuestionReplyController');
const adminNotificationController = require('../controllers/adminNotificationController');
const adminStatsController = require('../controllers/adminStatsController');
const adminTermController = require('../controllers/adminTermController');
const approvalsController = require('../controllers/approvalsController');
const adminSecurityController = require('../controllers/adminSecurityController');
const adminQuestionBankController = require('../controllers/adminQuestionBankController');
const adminExamManagementController = require('../controllers/adminExamManagementController');

// ============================================
// Security & Monitoring Routes
// ============================================
router.get('/security/stats', adminAuth, checkPermission('stats', 'view'), adminSecurityController.getSecurityDashboardStats);
router.get('/security/errors', adminAuth, checkPermission('stats', 'view'), adminSecurityController.getSystemErrors);
router.post('/security/errors/resolve-all', adminAuth, checkPermission('stats', 'edit'), adminSecurityController.resolveAllSystemErrors);
router.get('/security/scans', adminAuth, checkPermission('stats', 'view'), adminSecurityController.getSecurityScans);
router.post('/security/errors/:id/resolve', adminAuth, checkPermission('stats', 'edit'), adminSecurityController.resolveSystemError);
router.get('/security/report', adminAuth, checkPermission('stats', 'view'), adminSecurityController.generateSecurityReport);
router.post('/security/scans/:id/resolve', adminAuth, checkPermission('stats', 'edit'), adminSecurityController.resolveSecurityScan);
router.post('/security/scans/run', adminAuth, checkPermission('stats', 'edit'), adminSecurityController.runManualScan);
router.post('/security/images/heal', adminAuth, checkPermission('stats', 'edit'), adminSecurityController.runImageHealing);
router.get('/security/auto-saved-images', adminAuth, checkPermission('stats', 'view'), adminSecurityController.getAutoSavedImages);
router.get('/security/auto-saved-images/stats', adminAuth, checkPermission('stats', 'view'), adminSecurityController.getAutoSavedImagesStats);
router.get('/security/settings', adminAuth, checkPermission('stats', 'view'), adminSecurityController.getSystemSettings);
router.post('/security/settings', adminAuth, checkPermission('stats', 'edit'), adminSecurityController.updateSystemSetting);
router.post('/security/blacklist/reset', adminAuth, checkPermission('admins', 'edit'), adminSecurityController.resetIPBlacklist);

// ============================================
// Approvals Routes (الموافقات)
// ============================================
// هذه المسارات متاحة فقط للمدير العام (أو من لديه صلاحية إدارة الموافقات)
router.get('/approvals', adminAuth, checkPermission('approvals', 'view'), approvalsController.listPendingApprovals);
router.post('/approvals/:id/approve', adminAuth, checkPermission('approvals', 'approve'), approvalsController.approveRequest);
router.post('/approvals/:id/reject', adminAuth, checkPermission('approvals', 'reject'), approvalsController.rejectRequest);
router.delete('/approvals/:id', adminAuth, checkPermission('approvals', 'reject'), approvalsController.deleteRequest);

// ============================================
// Auth Routes
// ============================================
router.post('/login', adminLoginValidation, adminAuthController.login);
router.post('/refresh-token', adminAuthController.refreshToken);
router.post('/logout', adminAuth, adminAuthController.logout);

// MFA Routes
router.get('/mfa/setup', adminAuth, adminAuthController.setupMFA);
router.post('/mfa/enable', adminAuth, adminAuthController.enableMFA);
router.post('/mfa/disable', adminAuth, adminAuthController.disableMFA);

// Session Management Routes
router.get('/sessions', adminAuth, adminAuthController.getActiveSessions);
router.delete('/sessions/other', adminAuth, adminAuthController.invalidateOtherSessions);
router.delete('/sessions/:tokenId', adminAuth, adminAuthController.invalidateSession);

router.post('/create-admin', adminAuth, checkPermission('admins', 'add'), adminAuthController.createAdmin);
router.put('/update-permissions/:adminId', adminAuth, checkPermission('admins', 'edit'), adminAuthController.updatePermissions);

// ============================================
// Admins Management Routes (إدارة المديرين)
// ============================================
router.get('/admins', adminAuth, checkPermission('admins', 'view'), adminAuthController.getAllAdmins);
router.put('/admins/:id', adminAuth, checkPermission('admins', 'edit'), updateAdminValidation, adminAuthController.updateAdmin);
router.delete('/admins/:id', adminAuth, checkPermission('admins', 'delete'), adminAuthController.deleteAdmin);
router.put('/admins/:id/toggle-super', adminAuth, checkPermission('admins', 'edit'), adminAuthController.toggleSuperAdmin);

// ============================================
// Terms Routes
// ============================================
router.get('/terms', adminAuth, adminTermController.getAllTerms);
router.post('/terms', adminAuth, checkPermission('subjects', 'add'), termValidation, adminTermController.createTerm);
router.put('/terms/:id', adminAuth, checkPermission('subjects', 'edit'), updateTermValidation, adminTermController.updateTerm);
router.delete('/terms/:id', adminAuth, checkPermission('subjects', 'delete'), adminTermController.deleteTerm);

// ============================================
// Subjects Routes
// ============================================
router.get('/subjects', adminAuth, adminSubjectController.getAllSubjects);
router.get('/subjects/:id', adminAuth, adminSubjectController.getSubjectById);
// استخدام cloudinaryUploader للرفع المباشر إلى Cloudinary
const { upload, uploadToCloudinary } = require('../middlewares/cloudinaryUploader');

// تعريف الحقول المسموح برفعها للمادة
const subjectUpload = upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'pdfs', maxCount: 10 },
  { name: 'images', maxCount: 10 }
]);

router.post('/subjects', adminAuth, subjectUpload, uploadToCloudinary, checkPermission('subjects', 'add'), subjectValidation, adminSubjectController.createSubject);
router.put('/subjects/:id', adminAuth, subjectUpload, uploadToCloudinary, checkPermission('subjects', 'edit'), subjectValidation, adminSubjectController.updateSubject);
router.delete('/subjects/:id', adminAuth, checkPermission('subjects', 'delete'), adminSubjectController.deleteSubject);
// مسارات الحذف الجماعي (Bulk Delete) - يجب أن تكون قبل المسارات التي تحتوي على بارامترات مشابهة
router.delete('/subjects/:id/pdfs/all', adminAuth, checkPermission('subjects', 'delete'), adminSubjectController.deleteAllPDFs);
router.delete('/subjects/:id/images/all', adminAuth, checkPermission('subjects', 'delete'), adminSubjectController.deleteAllImages);
router.delete('/subjects/:id/exams/all', adminAuth, checkPermission('subjects', 'delete'), adminSubjectController.deleteAllExams);

// Wrap the PDF upload route with error handling to catch Multer errors specifically
const handleMulterError = (req, res, next) => {
  const multer = require('multer');
  return (err) => {
    if (err instanceof multer.MulterError) {
      console.error('[MULTER ERROR]:', err.code, err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'حجم الملف كبير جداً. الحد الأقصى هو 100 ميجابايت.' });
      }
      return res.status(400).json({ success: false, message: `خطأ في رفع الملف: ${err.message}` });
    } else if (err) {
      console.error('[UPLOAD ERROR]:', err.message);
      return res.status(500).json({ success: false, message: `حدث خطأ غير متوقع أثناء الرفع: ${err.message}` });
    }
    next();
  };
};

router.post('/subjects/:id/pdfs', adminAuth, (req, res, next) => {
  upload.array('pdfs', 50)(req, res, (err) => {
    if (err) return handleMulterError(req, res, next)(err);
    next();
  });
}, uploadToCloudinary, checkPermission('subjects', 'upload_pdf'), adminSubjectController.addPDFs);

router.delete('/subjects/:subjectId/pdfs/:pdfId', adminAuth, checkPermission('subjects', 'delete_pdf'), adminSubjectController.deletePDF);

router.post('/subjects/:id/images', adminAuth, (req, res, next) => {
  upload.array('images', 50)(req, res, (err) => {
    if (err) return handleMulterError(req, res, next)(err);
    next();
  });
}, uploadToCloudinary, checkPermission('subjects', 'upload_image'), adminSubjectController.addImages);
router.delete('/subjects/:subjectId/images/:imageId', adminAuth, checkPermission('subjects', 'delete_image'), adminSubjectController.deleteImage);
router.post('/subjects/:id/audio', adminAuth, uploadAudio.single('audio'), checkPermission('subjects', 'edit'), adminSubjectController.updateSubject); // Placeholder for audio upload

// ============================================
// Exams Routes
// ============================================
router.get('/exams', adminAuth, adminExamController.getAllExams);
router.get('/exams/:id/analytics', adminAuth, checkPermission('exams', 'view'), adminExamController.getQuestionAnalytics);
router.get('/exams/:id', adminAuth, checkPermission('exams', 'view'), adminExamController.getExamById);
router.get('/exams/:id/stats', adminAuth, adminExamController.getExamStats);
router.get('/exams/attempts/all', adminAuth, checkPermission('exams', 'view'), adminExamController.getAllAttempts);
router.get('/exams/attempts/:id', adminAuth, checkPermission('exams', 'view'), adminExamController.getAttemptById);
router.post('/exams', adminAuth, checkPermission('exams', 'add'), examValidation, adminExamController.createExam);
router.put('/exams/:id', adminAuth, checkPermission('exams', 'edit'), updateExamValidation, adminExamController.updateExam);
router.delete('/exams/:id', adminAuth, checkPermission('exams', 'delete'), adminExamController.deleteExam);
router.post('/exams/:id/questions/manual', adminAuth, checkPermission('exams', 'add'), adminExamController.addQuestionsManually);
router.post('/exams/:id/questions/excel', adminAuth, localUpload.single('excel'), checkPermission('exams', 'add'), adminExamController.addQuestionsFromExcel);
router.post('/exams/:id/import-questions', adminAuth, localUpload.single('excel'), checkPermission('exams', 'add'), adminExamController.addQuestionsFromExcel);
router.post('/exams/:id/questions/text', adminAuth, checkPermission('exams', 'add'), adminExamController.addQuestionsFromText);
router.delete('/exams/:id/questions/all', adminAuth, checkPermission('exams', 'delete'), adminExamController.deleteAllQuestions);
router.put('/exams/:examId/questions/:questionId', adminAuth, checkPermission('exams', 'edit'), adminExamController.updateQuestion);
router.delete('/exams/:examId/questions/:questionId', adminAuth, checkPermission('exams', 'delete'), adminExamController.deleteQuestion);

// ============================================
// Advanced Exam Management (Digital Only)
// ============================================

// Violations (المخالفات)
router.get('/violations', adminAuth, checkPermission('exams', 'view'), adminExamManagementController.getAllViolations);
router.post('/violations', adminAuth, checkPermission('exams', 'edit'), adminExamManagementController.reportViolation);

// ============================================
// Students Routes
// ============================================
router.get('/students', adminAuth, checkPermission('students', 'view'), adminStudentController.getAllStudents);
router.get('/students/search', adminAuth, checkPermission('students', 'view'), adminStudentController.searchStudents);
router.post('/students/:id/block', adminAuth, checkPermission('students', 'block'), adminStudentController.blockStudent);
router.post('/students/:id/unblock', adminAuth, checkPermission('students', 'unblock'), adminStudentController.unblockStudent);
router.post('/students/:id/reset-device', adminAuth, checkPermission('students', 'unblock'), adminStudentController.resetDevice);
router.post('/students/unblock-device', adminAuth, checkPermission('students', 'unblock'), adminStudentController.unblockDevice);
router.delete('/students/:id', adminAuth, checkPermission('students', 'delete'), adminStudentController.deleteStudent);
router.get('/students/:id/activity', adminAuth, checkPermission('students', 'view'), adminStatsController.getStudentLogs);
router.get('/students/export', adminAuth, checkPermission('students', 'view'), adminStudentController.exportStudentsPDF);

// ============================================
// Question Bank Routes (بنك الأسئلة المركزي)
// ============================================
router.get('/question-bank', adminAuth, checkPermission('questions', 'view'), adminQuestionBankController.getAll);
router.post('/question-bank', adminAuth, checkPermission('questions', 'add'), questionBankValidation, adminQuestionBankController.create);
router.delete('/question-bank/all', adminAuth, checkPermission('questions', 'delete'), adminQuestionBankController.deleteAll);
router.put('/question-bank/:id', adminAuth, checkPermission('questions', 'edit'), updateQuestionBankValidation, adminQuestionBankController.update);
router.delete('/question-bank/:id', adminAuth, checkPermission('questions', 'delete'), adminQuestionBankController.delete);
router.post('/exams/:examId/question-bank/add', adminAuth, checkPermission('exams', 'add'), adminQuestionBankController.addToExam);

// ============================================
// Questions Routes
// ============================================
router.get('/questions', adminAuth, checkPermission('questions', 'view'), adminQuestionReplyController.getAllQuestions);
router.post('/questions/:id/reply', adminAuth, checkPermission('questions', 'reply'), adminQuestionReplyController.replyToQuestion);
router.delete('/questions/:id', adminAuth, checkPermission('questions', 'delete'), adminQuestionReplyController.deleteQuestion);

// ============================================
// Notifications Routes
// ============================================
router.post('/notifications', adminAuth, checkPermission('notifications', 'send'), adminNotificationController.sendNotification);

// ============================================
// Stats & Logs Routes
// ============================================
router.get('/stats/dashboard', adminAuth, checkPermission('stats', 'view'), adminStatsController.getDashboardStats);

// Diagnostic Route
router.get('/system/status', adminAuth, (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const uploadDir = path.resolve(__dirname, '../../uploads/temp');
  const dirExists = fs.existsSync(uploadDir);
  let dirWritable = false;
  if (dirExists) {
    try {
      fs.accessSync(uploadDir, fs.constants.W_OK);
      dirWritable = true;
    } catch (e) {}
  }

  res.json({
    success: true,
    server_time: new Date().toISOString(),
    version: '2026-04-01-v5-diagnostic',
    env: process.env.NODE_ENV,
    storage: {
      temp_dir: uploadDir,
      exists: dirExists,
      writable: dirWritable
    },
    security_state: {
      integrity_bypass: true,
      signature_bypass: true,
      waf_bypass: true
    }
  });
});
router.get('/stats/activity', adminAuth, checkPermission('stats', 'view'), adminStatsController.getActivityLogs);
router.get('/stats/predictive', adminAuth, checkPermission('stats', 'view'), adminStatsController.getPredictiveAnalysis);

// ============================================
// Elite Security Operations Center (SOC)
// ============================================
router.get('/security/audit-logs', adminAuth, checkPermission('stats', 'view'), adminStatsController.getSecurityAuditLogs);
router.get('/security/blacklist', adminAuth, checkPermission('stats', 'view'), adminStatsController.getIPBlacklist);
router.post('/security/blacklist/add', adminAuth, checkPermission('admins', 'edit'), adminStatsController.addToBlacklist);
router.delete('/security/blacklist/:id', adminAuth, checkPermission('admins', 'edit'), adminStatsController.removeFromBlacklist);

module.exports = router;
