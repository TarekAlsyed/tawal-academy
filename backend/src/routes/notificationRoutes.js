const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const notificationController = require('../controllers/notificationController');

// Get all notifications for logged-in user
router.get('/', auth, notificationController.getNotifications);

// Mark notification as read
router.put('/:id/read', auth, notificationController.markAsRead);

// Delete notification
router.delete('/:id', auth, notificationController.deleteNotification);

module.exports = router;
