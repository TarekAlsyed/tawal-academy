const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middlewares/auth');

router.get('/', authMiddleware, profileController.getProfile);
router.get('/exams', authMiddleware, profileController.getExamHistory);
router.get('/points', authMiddleware, profileController.getPointsHistory);
router.get('/leaderboard', profileController.getLeaderboard);

module.exports = router;
