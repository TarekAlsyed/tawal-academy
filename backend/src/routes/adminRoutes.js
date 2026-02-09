const express = require('express');
const router = express.Router();
const { adminAuthMiddleware, checkPermission } = require('../middlewares/adminAuth');
const { uploadCover, uploadPDF, uploadImage, uploadExcel } = require('../middlewares/upload');

const adminAuthController = require('../controllers/adminAuthController');
const adminSubjectController = require('../controllers/adminSubjectController');
const adminExamController = require('../controllers/adminExamController');
const adminStudentController = require('../controllers/adminStudentController');
const adminStatsController = require('../controllers/adminStatsController');
const adminQuestionReplyController = require('../controllers/adminQuestionReplyController');
const adminNotificationController = require('../controllers/adminNotificationController');
const adminTermController = require('../controllers/adminTermController');

router.post('/login', adminAuthController.login);
router.post('/logout', adminAuthController.logout);
router.post('/admins', adminAuthMiddleware, adminAuthController.createAdmin);
router.put('/admins/:id/permissions', adminAuthMiddleware, adminAuthController.updatePermissions);

router.get('/terms', adminAuthMiddleware, adminTermController.getAllTerms);
router.post('/terms', adminAuthMiddleware, checkPermission('subjects'), adminTermController.createTerm);
router.put('/terms/:id', adminAuthMiddleware, checkPermission('subjects'), adminTermController.updateTerm);
router.delete('/terms/:id', adminAuthMiddleware, checkPermission('subjects'), adminTermController.deleteTerm);

router.get('/subjects', adminAuthMiddleware, checkPermission('subjects'), adminSubjectController.getAllSubjects);
router.post('/subjects', adminAuthMiddleware, checkPermission('subjects'), uploadCover.single('cover'), adminSubjectController.createSubject);
router.put('/subjects/:id', adminAuthMiddleware, checkPermission('subjects'), uploadCover.single('cover'), adminSubjectController.updateSubject);
router.delete('/subjects/:id', adminAuthMiddleware, checkPermission('subjects'), adminSubjectController.deleteSubject);

router.post('/subjects/:id/pdfs', adminAuthMiddleware, checkPermission('subjects'), uploadPDF.array('pdfs', 10), adminSubjectController.uploadPDFs);
router.delete('/subjects/:subjectId/pdfs/:pdfId', adminAuthMiddleware, checkPermission('subjects'), adminSubjectController.deletePDF);

router.post('/subjects/:id/images', adminAuthMiddleware, checkPermission('subjects'), uploadImage.array('images', 20), adminSubjectController.uploadImages);
router.delete('/subjects/:subjectId/images/:imageId', adminAuthMiddleware, checkPermission('subjects'), adminSubjectController.deleteImage);

router.post('/exams', adminAuthMiddleware, checkPermission('exams'), adminExamController.createExam);
router.put('/exams/:id', adminAuthMiddleware, checkPermission('exams'), adminExamController.updateExam);
router.delete('/exams/:id', adminAuthMiddleware, checkPermission('exams'), adminExamController.deleteExam);
router.get('/exams/:id/stats', adminAuthMiddleware, checkPermission('stats'), adminExamController.getExamStats);

router.post('/exams/:id/questions/manual', adminAuthMiddleware, checkPermission('exams'), adminExamController.addQuestionsManual);
router.post('/exams/:id/questions/excel', adminAuthMiddleware, checkPermission('exams'), uploadExcel.single('file'), adminExamController.addQuestionsFromExcel);
router.post('/exams/:id/questions/text', adminAuthMiddleware, checkPermission('exams'), adminExamController.addQuestionsFromText);
router.delete('/exams/:examId/questions/:questionId', adminAuthMiddleware, checkPermission('exams'), adminExamController.deleteQuestion);

router.get('/students', adminAuthMiddleware, checkPermission('students'), adminStudentController.getAllStudents);
router.get('/students/search', adminAuthMiddleware, checkPermission('students'), adminStudentController.searchStudents);
router.post('/students/:id/block', adminAuthMiddleware, checkPermission('students'), adminStudentController.blockStudent);
router.post('/students/:id/unblock', adminAuthMiddleware, checkPermission('students'), adminStudentController.unblockStudent);
router.delete('/students/:id', adminAuthMiddleware, checkPermission('students'), adminStudentController.deleteStudent);
router.get('/students/export', adminAuthMiddleware, checkPermission('students'), adminStudentController.exportStudents);

router.get('/stats/dashboard', adminAuthMiddleware, checkPermission('stats'), adminStatsController.getDashboardStats);

router.get('/student-questions', adminAuthMiddleware, checkPermission('questions'), adminQuestionReplyController.getAllQuestions);
router.post('/student-questions/:id/reply', adminAuthMiddleware, checkPermission('questions'), adminQuestionReplyController.replyToQuestion);
router.delete('/student-questions/:id', adminAuthMiddleware, checkPermission('questions'), adminQuestionReplyController.deleteQuestion);

router.post('/notifications/send', adminAuthMiddleware, adminNotificationController.sendCustomNotification);

module.exports = router;
