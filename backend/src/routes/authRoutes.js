const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');
const deviceCheck = require('../middlewares/deviceCheck');
const { studentLoginValidation } = require('../middlewares/validator');
const appOnlyGuard = require('../middlewares/appOnlyGuard');
const { heartbeatLimiter } = require('../config/security'); // ✅ L-06 FIX

// Student login — حصرياً من التطبيق فقط
router.post('/login', appOnlyGuard, studentLoginValidation, deviceCheck, authController.login);

// Refresh token — حصرياً من التطبيق فقط
router.post('/refresh-token', appOnlyGuard, authController.refreshToken);

// Get profile — حصرياً من التطبيق فقط
router.get('/profile', appOnlyGuard, auth, authController.getProfile);

// ✅ L-06 FIX: Heartbeat with dedicated rate limiter (2 req/min)
router.post('/heartbeat', appOnlyGuard, heartbeatLimiter, auth, authController.heartbeat);

// Logout — حصرياً من التطبيق فقط
router.post('/logout', appOnlyGuard, auth, authController.logout);

module.exports = router;
