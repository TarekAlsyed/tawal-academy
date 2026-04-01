const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const adminExamManagementController = require('../controllers/adminExamManagementController');
const authMiddleware = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

router.get('/personal-bank', authMiddleware, examController.getPersonalBank);
router.get('/:id', authMiddleware, examController.getExam);
router.get('/:id/review', authMiddleware, examController.getExamReview);
router.post('/:id/submit', authMiddleware, examController.submitExam);
router.post('/:id/progress', authMiddleware, examController.saveProgress);
router.get('/:id/progress', authMiddleware, examController.getProgress);
router.post('/violations', authMiddleware, adminExamManagementController.reportViolation);
router.post('/:id/import-questions', authMiddleware, upload.single('questionsFile'), examController.importQuestions);

module.exports = router;
