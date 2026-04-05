const express = require('express');
const router = express.Router();
const SystemError = require('../models/SystemError');

/**
 * @route   POST /api/monitoring/report-error
 * @desc    Report an error from the frontend (Client-side error hunting)
 * @access  Public (But with rate limiting and basic validation)
 */
router.post('/report-error', async (req, res) => {
  try {
    const { 
      errorType, 
      message, 
      stackTrace, 
      component = 'Frontend', 
      severity = 'medium', 
      impactLevel = 'low', 
      details = {} 
    } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // Enrich details with server-side info
    const enrichedDetails = {
      ...details,
      clientIp: req.ip,
      userAgent: req.get('User-Agent'),
      reportedAt: new Date().toISOString()
    };

    const savedError = await SystemError.create({
      errorType: errorType || 'FRONTEND_ERROR',
      message,
      stackTrace,
      component,
      severity,
      impactLevel,
      userId: req.user ? req.user.id : (details.userId || null),
      adminId: req.admin ? req.admin.id : (details.adminId || null),
      details: enrichedDetails
    });

    res.status(201).json({
      success: true,
      message: 'Error reported and logged successfully',
      errorId: savedError.id
    });
  } catch (err) {
    console.error('Failed to report frontend error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error while logging'
    });
  }
});

/**
 * @route   GET /api/monitoring/health
 * @desc    Get detailed system health pulse
 * @access  Private (Admin only)
 */
router.get('/health', async (req, res) => {
    // This will be expanded in the SOC Phase
    res.json({
        status: 'ok',
        pulse: 100,
        services: {
            database: 'connected',
            storage: 'active',
            auth: 'operational'
        }
    });
});

module.exports = router;
