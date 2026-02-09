const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const authMiddleware = require('../middlewares/auth');

router.post('/ask', authMiddleware, questionController.askQuestion);
router.get('/my-questions', authMiddleware, questionController.getMyQuestions);

module.exports = router;
