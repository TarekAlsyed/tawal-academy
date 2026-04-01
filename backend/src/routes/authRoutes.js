const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');
const deviceCheck = require('../middlewares/deviceCheck');
const { studentLoginValidation } = require('../middlewares/validator');

// Student login
router.post('/login', studentLoginValidation, deviceCheck, authController.login);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Get profile
router.get('/profile', auth, authController.getProfile);

// Logout
router.post('/logout', auth, authController.logout);

module.exports = router;
