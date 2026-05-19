const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const subjectController = require('../controllers/subjectController');

const { upload, uploadToCloudinary } = require('../middlewares/cloudinaryUploader');

// Get all subjects
router.get('/', auth, subjectController.getAllSubjects);

// UPLOAD PDF
router.post('/:id/pdfs', auth, upload.array('pdfs'), uploadToCloudinary, subjectController.uploadPdf);

// UPLOAD IMAGE
router.post('/:id/images', auth, upload.array('images'), uploadToCloudinary, subjectController.uploadImage);

// Get all terms
router.get('/terms', auth, subjectController.getTerms);

// Get subject by ID
router.get('/:id', auth, subjectController.getSubjectById);

// Get certificate
router.get('/:id/certificate', auth, subjectController.getCertificate);

// Rate subject
router.post('/:id/rate', auth, subjectController.rateSubject);

// Download PDF
router.get('/:subjectId/pdfs/:pdfId/download', auth, subjectController.downloadPDF);

// View Image
router.get('/:subjectId/images/:imageId/view', auth, subjectController.viewImage);

module.exports = router;
