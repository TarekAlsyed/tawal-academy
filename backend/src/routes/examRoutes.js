const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const authMiddleware = require('../middlewares/auth');

router.get('/:id', authMiddleware, examController.getExam);
router.post('/:id/submit', authMiddleware, examController.submitExam);

module.exports = router;
