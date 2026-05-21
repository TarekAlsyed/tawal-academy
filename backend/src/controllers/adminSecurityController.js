const SystemError = require('../models/SystemError');
const SecurityScan = require('../models/SecurityScan');
const AutoSavedImage = require('../models/AutoSavedImage');
const imageAutoSaveService = require('../services/imageAutoSaveService');
const pool = require('../config/database');

const getAutoSavedImages = async (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;
    let images;
    if (type) {
      images = await AutoSavedImage.findByType(type);
    } else {
      images = await AutoSavedImage.findAll();
    }
    
    // Apply pagination in JS for simplicity, or we could add it to the model
    const paginatedImages = images.slice(offset, parseInt(offset) + parseInt(limit));
    
    res.json({
      success: true,
      data: {
        images: paginatedImages,
        total: images.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Get Auto Saved Images Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAutoSavedImagesStats = async (req, res) => {
  try {
    const stats = await imageAutoSaveService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get Auto Saved Images Stats Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSecurityDashboardStats = async (req, res) => {
  try {
    const systemStats = await SystemError.getStats() || {};
    const securityStats = await SecurityScan.getStats() || {};
    
    // Get recent logs
    const recentErrors = await SystemError.findAll({ limit: 10, isResolved: false }) || [];
    const recentScans = await SecurityScan.findAll({ limit: 5 }) || [];
    
    // Get Error Patterns (Most frequent errors)
    const errorPatterns = await pool.query(`
      SELECT error_type, component, severity, COUNT(*) as occurrence, SUM(repetition_count) as total_reps
      FROM system_errors
      WHERE is_resolved = FALSE
      GROUP BY error_type, component, severity
      ORDER BY total_reps DESC
      LIMIT 5
    `);

    // Get Threat Timeline (Last 7 days) - Using Student Violations for more realism
    const timeline = await pool.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
      FROM student_violations
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date ASC
    `);
    
    // Get Security Audit Logs (Intrusion attempts)
    const intrusionAttempts = await pool.query(`
      SELECT violation_type as threat_type, severity, COUNT(*) as count
      FROM student_violations
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY violation_type, severity
      ORDER BY count DESC
    `);

    // Get Recent Student Violations (Real-time Threat Radar)
    const recentViolations = await pool.query(`
      SELECT sv.*, u.name as student_name, u.email as student_email
      FROM student_violations sv
      JOIN users u ON sv.user_id = u.id
      ORDER BY sv.created_at DESC
      LIMIT 10
    `);

    // Get Active Sessions count
    const activeSessions = await pool.query(`
      SELECT COUNT(*) as count FROM sessions WHERE is_active = TRUE
    `);

    // System Health Pulse (Based on DB status and error count)
    const healthPulse = 100 - Math.min(recentErrors.length * 2, 30); 

    // ⚠️ L-10 NOTE: Heatmap data is placeholder. Replace with real GeoIP data when available.
    const heatmapData = [
      { city: 'القاهرة', count: 0, isPlaceholder: true },
      { city: 'الرياض', count: 0, isPlaceholder: true },
      { city: 'جدة', count: 0, isPlaceholder: true },
      { city: 'دبي', count: 0, isPlaceholder: true },
      { city: 'الإسكندرية', count: 0, isPlaceholder: true }
    ];
    
    // Get threat level (based on last scan or recent critical errors)
    let currentThreatLevel = 'safe';
    if (recentErrors.some(e => e.severity === 'critical') || recentViolations.rows.some(v => v.severity === 'high')) {
      currentThreatLevel = 'danger';
    } else if (recentErrors.length > 5 || recentViolations.rows.length > 3) {
      currentThreatLevel = 'warning';
    }

    res.json({
      success: true,
      data: {
        stats: {
          systemErrors: systemStats,
          securityScans: securityStats,
          activeSessions: parseInt(activeSessions.rows[0]?.count || 0),
          healthPulse,
          currentThreatLevel
        },
        recentErrors,
        recentScans,
        recentViolations: recentViolations.rows,
        errorPatterns: errorPatterns.rows,
        timeline: timeline.rows,
        intrusionAttempts: intrusionAttempts.rows,
        heatmapData
      }
    });
  } catch (error) {
    console.error('Security Dashboard Stats Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'فشل استرجاع بيانات الأمان من قاعدة البيانات',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

const generateSecurityReport = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysInt = parseInt(days);
    
    const summary = await pool.query(`
      SELECT 
        COUNT(*) as total_scans,
        SUM(CASE WHEN threat_level = 'critical' THEN 1 ELSE 0 END) as critical_threats,
        SUM(CASE WHEN threat_level = 'high' THEN 1 ELSE 0 END) as high_threats,
        (SELECT COUNT(*) FROM security_audit_logs WHERE created_at > NOW() - (interval '1 day' * $1)) as total_audit_logs
      FROM security_scans
      WHERE created_at > NOW() - (interval '1 day' * $1)
    `, [daysInt]);

    const topAttackedPaths = await pool.query(`
      SELECT path, COUNT(*) as count, threat_type
      FROM security_audit_logs
      WHERE created_at > NOW() - (interval '1 day' * $1)
      GROUP BY path, threat_type
      ORDER BY count DESC
      LIMIT 10
    `, [daysInt]);

    const frequentErrors = await pool.query(`
      SELECT error_type, message, component, COUNT(*) as count
      FROM system_errors
      WHERE created_at > NOW() - (interval '1 day' * $1)
      GROUP BY error_type, message, component
      ORDER BY count DESC
      LIMIT 10
    `, [daysInt]);

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        summary: summary.rows[0],
        topAttackedPaths: topAttackedPaths.rows,
        frequentErrors: frequentErrors.rows,
        generatedAt: new Date().toISOString(),
        recommendations: [
          "تحديث قواعد بيانات الحماية بشكل دوري",
          "مراجعة سجلات الوصول للمكونات الأكثر عرضة للهجوم",
          "تفعيل التحقق بخطوتين لجميع حسابات المشرفين",
          "تحديث المكتبات والتبعيات البرمجية لسد الثغرات المعروفة"
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSystemErrors = async (req, res) => {
  try {
    const { limit = 50, offset = 0, severity, isResolved } = req.query;
    const errors = await SystemError.findAll({ limit, offset, severity, isResolved });
    res.json({ success: true, data: errors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSecurityScans = async (req, res) => {
  try {
    const { limit = 50, offset = 0, threatLevel } = req.query;
    const scans = await SecurityScan.findAll({ limit, offset, threatLevel });
    res.json({ success: true, data: scans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resolveSystemError = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    const updatedError = await SystemError.resolve(id, adminId);
    res.json({ success: true, data: updatedError });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resolveAllSystemErrors = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const result = await pool.query(
      `UPDATE system_errors 
       SET is_resolved = TRUE, resolved_at = CURRENT_TIMESTAMP, resolved_by = $1 
       WHERE is_resolved = FALSE 
       RETURNING id`,
      [adminId]
    );
    res.json({ success: true, message: `تم حل ${result.rowCount} خطأ بنجاح`, count: result.rowCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resolveSecurityScan = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedScan = await SecurityScan.resolve(id);
    res.json({ success: true, data: updatedScan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const runManualScan = async (req, res) => {
  const monitorService = require('../services/monitorService');
  try {
    await monitorService.runSecurityScan();
    res.json({ success: true, message: 'تم بدء الفحص الأمني اليدوي بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const runImageHealing = async (req, res) => {
  try {
    const healedCount = await imageAutoSaveService.healFileSystem();
    res.json({ 
      success: true, 
      message: `تم الانتهاء من فحص الصور. تم استعادة ${healedCount} ملف مفقود.`,
      data: { healedCount }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSystemSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const settingsService = require('../services/settingsService');

const updateSystemSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    const adminId = req.admin.id;
    
    await pool.query(
      `INSERT INTO system_settings (key, value, updated_by, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP`,
      [key, JSON.stringify(value), adminId]
    );
    
    // Clear the settings cache to apply changes immediately
    settingsService.clearCache();

    res.json({ success: true, message: 'تم تحديث الإعداد بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const clearOldLogs = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const errorsResult = await pool.query('DELETE FROM system_errors WHERE created_at < NOW() - (interval \'1 day\' * $1) AND is_resolved = TRUE RETURNING id', [days]);
    const auditResult = await pool.query('DELETE FROM security_audit_logs WHERE created_at < NOW() - (interval \'1 day\' * $1) RETURNING id', [days]);
    res.json({ 
      success: true, 
      message: 'تم تنظيف السجلات القديمة بنجاح',
      deletedErrors: errorsResult.rowCount,
      deletedAuditLogs: auditResult.rowCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resetIPBlacklist = async (req, res) => {
  try {
    await pool.query('TRUNCATE ip_blacklist RESTART IDENTITY');
    // ✅ M-03 FIX: Sync in-memory blacklist cache immediately after DB reset
    const { blacklistCache } = require('../config/security');
    if (blacklistCache) {
      blacklistCache._ips = new Set();
      blacklistCache._lastRefresh = Date.now();
    }
    res.json({ success: true, message: 'تم تصفير القائمة السوداء بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSecurityDashboardStats,
  getSystemErrors,
  getSecurityScans,
  resolveSystemError,
  resolveAllSystemErrors,
  generateSecurityReport,
  resolveSecurityScan,
  runManualScan,
  getAutoSavedImages,
  getAutoSavedImagesStats,
  runImageHealing,
  getSystemSettings,
  updateSystemSetting,
  clearOldLogs,
  resetIPBlacklist
};
