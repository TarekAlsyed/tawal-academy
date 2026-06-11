const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const notificationController = require('../controllers/notificationController');

// Get unread count
router.get('/unread-count', auth, notificationController.getUnreadCount);

// Get all notifications for logged-in user
router.get('/', auth, notificationController.getNotifications);

// Mark all as read
router.put('/read-all', auth, notificationController.markAllAsRead);

// Mark notification as read
router.put('/:id/read', auth, notificationController.markAsRead);

// Delete notification
router.delete('/:id', auth, notificationController.deleteNotification);

// Save FCM token for push notifications
router.post('/fcm-token', auth, notificationController.saveFcmToken);

module.exports = router;
