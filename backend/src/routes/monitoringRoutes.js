const express = require('express');
const router = express.Router();
const SystemError = require('../models/SystemError');
const rateLimit = require('express-rate-limit');

// Rate limit error reporting to prevent DB flooding (10 reports per 15 min per IP)
const errorReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many error reports. Please try again later.' }
});

/**
 * @route   POST /api/monitoring/report-error
 * @desc    Report an error from the frontend (Client-side error hunting)
 * @access  Public (Rate limited)
 */
router.post('/report-error', errorReportLimiter, async (req, res) => {
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

    // Input sanitization to prevent DB abuse
    const allowedSeverities = ['low', 'medium', 'high', 'critical'];
    const sanitizedSeverity = allowedSeverities.includes(severity) ? severity : 'medium';
    const sanitizedMessage = String(message).substring(0, 500);
    const sanitizedStackTrace = stackTrace ? String(stackTrace).substring(0, 2000) : null;
    const sanitizedErrorType = String(errorType || 'FRONTEND_ERROR').substring(0, 50);
    const sanitizedComponent = String(component || 'Frontend').substring(0, 50);

    // Enrich details with server-side info
    const enrichedDetails = {
      ...(typeof details === 'object' ? details : {}),
      clientIp: req.ip,
      userAgent: req.get('User-Agent'),
      reportedAt: new Date().toISOString()
    };

    // Limit details size
    const detailsStr = JSON.stringify(enrichedDetails);
    const finalDetails = detailsStr.length > 2000 
      ? { clientIp: req.ip, reportedAt: new Date().toISOString(), truncated: true }
      : enrichedDetails;

    const savedError = await SystemError.create({
      errorType: sanitizedErrorType,
      message: sanitizedMessage,
      stackTrace: sanitizedStackTrace,
      component: sanitizedComponent,
      severity: sanitizedSeverity,
      impactLevel,
      userId: null, // Public endpoint: never trust client-provided userId
      adminId: null,
      details: finalDetails
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
 * @desc    Get system health pulse
 * @access  Private (Admin only)
 */
router.get('/health', async (req, res) => {
    // Return minimal info
    res.json({
        status: 'operational',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
