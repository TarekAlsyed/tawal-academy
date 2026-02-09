const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/auth');
const { deviceCheckMiddleware } = require('../middlewares/deviceCheck');

router.post('/login', deviceCheckMiddleware, authController.login);
router.get('/profile', authMiddleware, authController.getProfile);
router.post('/logout', authController.logout);

module.exports = router;
