const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const profileController = require('../controllers/profileController');

// Get user profile
router.get('/', auth, profileController.getProfile);

// Get exam history
router.get('/exam-history', auth, profileController.getExamHistory);

// Get leaderboard
router.get('/leaderboard', auth, profileController.getLeaderboard);

module.exports = router;
