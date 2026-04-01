const pool = require('../config/database');
const SystemError = require('../models/SystemError');
const SecurityScan = require('../models/SecurityScan');
const notificationSender = require('../utils/notificationSender');
const imageAutoSaveService = require('./imageAutoSaveService');
const ImageRecoveryMonitor = require('./imageRecoveryMonitor');

class MonitorService {
  constructor() {
    this.monitoringInterval = null;
    this.securityInterval = null;
    this.healingInterval = null;
    this.recoveryInterval = null;
  }

  start() {
    console.log('🚀 بدء خدمة المراقبة والأمان (24/7)...');
    
    // 1. مراقبة أخطاء المنصة كل 5 دقائق
    this.monitoringInterval = setInterval(() => this.checkPlatformHealth(), 5 * 60 * 1000);
    
    // 2. فحص أمني كل ساعة
    this.securityInterval = setInterval(() => this.runSecurityScan(), 60 * 60 * 1000);

    // 3. فحص وإصلاح نظام الصور كل 30 دقيقة (Healing System)
    this.healingInterval = setInterval(() => imageAutoSaveService.healFileSystem(), 30 * 60 * 1000);
    
    // 4. فحص استرداد الصور من Cloudinary كل ساعة
    this.recoveryInterval = setInterval(() => ImageRecoveryMonitor.checkAllImages(10), 60 * 60 * 1000);

    // تشغيل الفحوصات فوراً
    this.checkPlatformHealth();
    this.runSecurityScan();
    imageAutoSaveService.healFileSystem();
    ImageRecoveryMonitor.checkAllImages(5);
  }

  async checkPlatformHealth() {
    try {
      const startTime = Date.now();
      const health = {
        database: false,
        api: true, // we are running
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };

      // Check Database
      try {
        const dbResult = await pool.query('SELECT 1');
        if (dbResult.rows.length > 0) health.database = true;
      } catch (err) {
        await SystemError.create({
          errorType: 'DB_CONNECTION',
          message: 'فشل الاتصال بقاعدة البيانات',
          stackTrace: err.stack,
          component: 'Database',
          severity: 'critical',
          impactLevel: 'total'
        });
        // إرسال تنبيه فوري
        await notificationSender.sendAdminAlert('فشل الاتصال بقاعدة البيانات! المنصة متوقفة.');
      }

      // Check Memory Usage (Improved Monitoring)
      const memoryThreshold = 0.90; // 90% threshold
      const usedMemoryPercent = health.memory.heapUsed / health.memory.heapTotal;
      
      if (usedMemoryPercent > memoryThreshold) {
        await SystemError.create({
          errorType: 'SERVER_RESOURCE_CRITICAL',
          message: `استهلاك ذاكرة حرج (${(usedMemoryPercent * 100).toFixed(1)}%)`,
          component: 'Server',
          severity: 'critical',
          impactLevel: 'partial',
          details: {
            ...health.memory,
            percentage: (usedMemoryPercent * 100).toFixed(1),
            nodeVersion: process.version,
            platform: process.platform,
            uptime: health.uptime
          }
        });
        
        // Try to trigger garbage collection if --expose-gc is used
        if (global.gc) {
          console.log('Running manual garbage collection...');
          global.gc();
        }
      } else if (usedMemoryPercent > 0.75) {
        // Warning level
        console.warn(`Memory usage warning: ${(usedMemoryPercent * 100).toFixed(1)}%`);
      }

      // If any critical error found, we already logged it.
      // We can also log a heartbeat for dashboard status.
    } catch (err) {
      console.error('Monitor Error:', err);
    }
  }

  async runSecurityScan() {
    try {
      const startTime = Date.now();
      const findings = [];
      let threatLevel = 'safe';

      // 1. Check for brute force attempts in logs (Enhanced)
      const bruteForceCheck = await pool.query(`
        SELECT ip_address, COUNT(DISTINCT user_agent) as devices, COUNT(*) as attempts
        FROM security_audit_logs 
        WHERE threat_type IN ('brute_force', 'unauthorized_access', 'invalid_login') 
        AND created_at > NOW() - INTERVAL '1 hour'
        GROUP BY ip_address
        HAVING COUNT(*) > 20
      `);

      if (bruteForceCheck.rows.length > 0) {
        threatLevel = 'medium';
        findings.push({
          type: 'BRUTE_FORCE_DETECTED',
          ips: bruteForceCheck.rows.map(r => ({ ip: r.ip_address, attempts: r.attempts, devices: r.devices })),
          message: `تم اكتشاف محاولات دخول مكثفة من ${bruteForceCheck.rows.length} عناوين IP`
        });
      }

      // 2. Check for suspicious SQL/XSS keywords in payloads
      const injectionCheck = await pool.query(`
        SELECT id, ip_address, path, payload FROM security_audit_logs 
        WHERE (
          payload::text ILIKE '%SELECT%' OR 
          payload::text ILIKE '%UNION%' OR 
          payload::text ILIKE '%DROP%' OR
          payload::text ILIKE '%<script>%' OR
          payload::text ILIKE '%javascript:%'
        )
        AND created_at > NOW() - INTERVAL '1 hour'
      `);

      if (injectionCheck.rows.length > 0) {
        threatLevel = 'high';
        findings.push({
          type: 'INJECTION_ATTEMPT',
          count: injectionCheck.rows.length,
          details: injectionCheck.rows.slice(0, 5),
          message: 'تم اكتشاف محاولات حقن SQL أو XSS محتملة'
        });
      }

      // 3. Check for unusual surges in registration or password resets
      const authSurgeCheck = await pool.query(`
        SELECT path, COUNT(*) as count 
        FROM security_audit_logs
        WHERE path IN ('/api/auth/register', '/api/auth/reset-password')
        AND created_at > NOW() - INTERVAL '30 minutes'
        GROUP BY path
        HAVING COUNT(*) > 100
      `);

      if (authSurgeCheck.rows.length > 0) {
        threatLevel = 'high';
        findings.push({
          type: 'AUTH_SURGE',
          details: authSurgeCheck.rows,
          message: 'زيادة غير طبيعية في طلبات التسجيل أو استعادة كلمة المرور'
        });
      }

      // 4. Vulnerability Check: Check for missing integrity headers
      const integrityCheck = await pool.query(`
        SELECT COUNT(*) FROM security_audit_logs
        WHERE threat_type = 'missing_integrity_header'
        AND created_at > NOW() - INTERVAL '1 hour'
      `);

      if (integrityCheck.rows[0].count > 200) {
        threatLevel = threatLevel === 'critical' ? 'critical' : 'high';
        findings.push({
          type: 'INTEGRITY_VIOLATION_SURGE',
          count: integrityCheck.rows[0].count,
          message: 'زيادة في محاولات الوصول من تطبيقات غير رسمية'
        });
      }

      // 5. Database Health & Performance Audit
      try {
        const dbLoadCheck = await pool.query(`
          SELECT count(*) as active_conns FROM pg_stat_activity WHERE state = 'active'
        `);
        if (parseInt(dbLoadCheck.rows[0].active_conns) > 40) {
          findings.push({
            type: 'DB_HIGH_LOAD',
            count: dbLoadCheck.rows[0].active_conns,
            message: 'تحميل عالي جداً على قاعدة البيانات - احتمال هجوم DoS'
          });
          threatLevel = 'critical';
        }
      } catch (e) {
        // Restricted access to pg_stat_activity is common
      }

      // 6. Check for suspicious large file upload attempts
      const largeFileUploadCheck = await pool.query(`
        SELECT * FROM system_errors 
        WHERE error_type = 'LIMIT_FILE_SIZE' 
        AND created_at > NOW() - INTERVAL '1 hour'
      `);

      if (largeFileUploadCheck.rows.length > 10) {
        findings.push({
          type: 'LARGE_UPLOAD_SPAM',
          count: largeFileUploadCheck.rows.length,
          message: 'محاولات متكررة لرفع ملفات ضخمة'
        });
        if (threatLevel === 'safe') threatLevel = 'low';
      }

      // Create Scan Log
      const scan = await SecurityScan.create({
        scanType: 'ADVANCED_SYSTEM_AUDIT',
        target: 'Platform Infrastructure & API',
        findings: findings,
        threatLevel: threatLevel,
        durationMs: Date.now() - startTime
      });

      // Early Warning System: Immediate Alerts for High/Critical
      if (threatLevel === 'high' || threatLevel === 'critical') {
        await notificationSender.sendAdminAlert(
          `🚨 [${threatLevel.toUpperCase()}] تم اكتشاف تهديد أمني محتمل!`,
          threatLevel,
          {
            scanId: scan.id,
            findingsCount: findings.length,
            topThreat: findings[0]?.type,
            time: new Date().toISOString()
          }
        );
      } else if (findings.length > 0) {
        // Low/Medium alerts can be logged or sent via less urgent channels
        console.log(`⚠️ Security Scan Findings: ${findings.length} issues detected.`);
      }
    } catch (err) {
      console.error('Security Scan Error:', err);
    }
  }

  stop() {
    clearInterval(this.monitoringInterval);
    clearInterval(this.securityInterval);
  }
}

module.exports = new MonitorService();
