const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const authMiddleware = require('../middlewares/auth');

router.get('/', subjectController.getAllSubjects);
router.get('/:id', authMiddleware, subjectController.getSubjectById);
router.post('/:id/pdfs/:pdfId/download', authMiddleware, subjectController.downloadPDF);
router.post('/:id/images/:imageId/view', authMiddleware, subjectController.viewImage);
router.post('/:id/rate', authMiddleware, subjectController.rateSubject);

module.exports = router;
