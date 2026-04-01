const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const questionController = require('../controllers/questionController');

// Submit a question to admin
router.post('/', auth, questionController.submitQuestion);

// Get my questions
router.get('/', auth, questionController.getMyQuestions);

module.exports = router;
