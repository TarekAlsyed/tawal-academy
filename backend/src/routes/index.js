const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const subjectRoutes = require('./subjectRoutes');
const examRoutes = require('./examRoutes');
const profileRoutes = require('./profileRoutes');
const questionRoutes = require('./questionRoutes');
const notificationRoutes = require('./notificationRoutes');
const adminRoutes = require('./adminRoutes');

router.use('/auth', authRoutes);
router.use('/subjects', subjectRoutes);
router.use('/exams', examRoutes);
router.use('/profile', profileRoutes);
router.use('/questions', questionRoutes);
router.use('/notifications', notificationRoutes);

router.use('/admin', adminRoutes);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Tawal Academy API is running!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
