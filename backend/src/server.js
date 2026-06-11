console.log('🚀 [STARTUP] Tawal Academy Backend starting up...');
const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const setupSecurity = require('./config/security');
require('dotenv').config();

// ✅ L-08 FIX: Suppress verbose console.log in production (keep error/warn)
if (process.env.NODE_ENV === 'production') {
  const originalLog = console.log;
  console.log = (...args) => {
    // Only allow startup and critical logs in production
    const msg = args[0]?.toString() || '';
    if (msg.includes('🚀') || msg.includes('✅') || msg.includes('❌') || msg.includes('📡')) {
      originalLog.apply(console, args);
    }
    // All other console.log calls are silently suppressed in production
  };
}

// ✅ C-08 FIX: Global Error Handlers — exit on uncaughtException to avoid undefined state
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  // Process state is undefined after uncaughtException — must exit
  // Process manager (PM2/Docker/systemd) will restart automatically
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Verify critical environment variables
const criticalEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'APP_SECRET', 'APP_SIGNATURE'];
criticalEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ CRITICAL ERROR: Environment variable ${varName} is missing!`);
    if (process.env.NODE_ENV === 'production') {
      console.error(`   The server will now exit to prevent security vulnerabilities.`);
      process.exit(1); 
    } else {
      console.warn(`⚠️  WARNING: Using development defaults for ${varName} is NOT RECOMMENDED.`);
    }
  }
});

const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const createTables = require('./config/createTables');
const createIndexes = require('./config/createIndexes');
const monitorService = require('./services/monitorService');

const app = express();
const PORT = process.env.PORT || 8080;
const IP = process.env.IP || '0.0.0.0'; // Support AlwaysData IP or default to 0.0.0.0
const uploadRoutes = require('./routes/uploadRoutes');

// 1. Basic body parsers - CRITICAL: Needed BEFORE security integrity checks
// Fix #17: Prototype Pollution protection via JSON reviver
app.use(express.json({ 
  limit: '10mb',
  reviver: (key, value) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
    return value;
  }
})); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Fix #18: Use DOMPurify for XSS Sanitization instead of xss-clean
const xssSanitizer = require('./middlewares/xssSanitizer');
app.use(xssSanitizer());

// 2. Apply Advanced Security Configuration (WAF, Logging, Throttling, etc.)
const { logger, loginLimiter, heartbeatLimiter } = setupSecurity(app);

// Update Monitor Activity on each request (except for internal health checks)
app.use((req, res, next) => {
  if (monitorService && typeof monitorService.recordActivity === 'function') {
    if (!req.path.includes('/health')) {
      monitorService.recordActivity();
    }
  }
  next();
});

// ============================================
// 0. IMMEDIATE HEALTH CHECK (For Cloud Providers)
// ============================================
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'tawal-academy-backend',
    version: '2.1.0-secured',
    updated: '2026-04-25'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'tawal-academy-backend', version: '2.1.0-secured' });
});

app.get('/', (req, res) => {
  res.status(200).send('Tawal Academy API v2.1.0-secured is Running ✅');
});

// Prevent caching of API responses (security: avoid sensitive data leaking via cache)
app.use('/api', (req, res, next) => {
  if (!req.url.includes('/uploads')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
});

// 2. Request logging middleware (reduced in production)
app.use((req, res, next) => {
  // Set global timeout for large uploads (15 minutes)
  if (req.url.includes('/pdfs') || req.url.includes('/images') || req.url.includes('/upload') || req.url.includes('/videos') || req.url.includes('/audios')) {
    req.setTimeout(900000);
    res.setTimeout(900000);
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=900, max=100');
  }
  
  const start = Date.now();
  
  // In production, only log on finish (and only slow/error requests)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.get('Origin') || 'No Origin'}`);
  }
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    // In production, only log slow (>2s) or error responses
    if (process.env.NODE_ENV !== 'production' || duration > 2000 || res.statusCode >= 400) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    }
  });
  
  next();
});

app.use('/api/auth', loginLimiter);
app.use('/api/admin/login', loginLimiter);
// Fix #28: Apply heartbeatLimiter to heartbeat endpoint
app.use('/api/auth/heartbeat', heartbeatLimiter);

// Fix #20: Content-Type validation for mutating requests
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('json') && !req.is('multipart/form-data')) {
    return res.status(415).json({ success: false, message: 'Content-Type غير مدعوم' });
  }
  next();
});

const uploadsPath = (process.env.NODE_ENV === 'production' && fs.existsSync('/app/uploads'))
  ? '/app/uploads' // For Docker (Fly.io)
  : path.join(__dirname, '../uploads'); // Standard local path (AlwaysData)

// Serve static files with enhanced caching for performance
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, path) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    // Permanent cache for 1 year (Standard for immutable assets)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}));

const pool = require('./config/database');

// Middleware to log and handle missing static files (Persistent Storage Fallback)
app.use('/uploads', async (req, res, next) => {
    // If we reach here, it means express.static didn't find the file in the primary directory
    const fullUrl = req.originalUrl.split('?')[0]; // Remove query params
    
    try {
        // Look for this file in the persistent storage table
        const result = await pool.query(
            'SELECT saved_path FROM auto_saved_images WHERE original_path = $1 OR original_path = $2 LIMIT 1',
            [fullUrl, fullUrl.startsWith('/') ? fullUrl : `/${fullUrl}`]
        );

        if (result.rows.length > 0) {
            const savedPath = result.rows[0].saved_path;
            const absoluteSavedPath = path.join(uploadsPath, savedPath.replace('/uploads/', ''));
            
            if (fs.existsSync(absoluteSavedPath)) {
                console.log(`[Persistent Fallback] Found backup for ${fullUrl} at ${savedPath}`);
                return res.sendFile(absoluteSavedPath);
            }
        }
    } catch (err) {
        console.error('[Persistent Fallback Error]', err.message);
    }

    // If no fallback found, log audit and return 404
    const logSecurityAudit = require('./config/security').logSecurityAudit;
    if (logSecurityAudit) {
        logSecurityAudit(req, 'missing_static_file', 'medium', { 
            filePath: req.path,
            fullUrl: req.originalUrl 
        });
    }
    res.status(404).json({ success: false, message: 'الملف غير موجود' });
});

app.use('/api', uploadRoutes);
app.use('/api', routes);


// Fix #45: Pass 404 to errorHandler instead of terminating immediately
app.use((req, res, next) => {
  const error = new Error('المسار غير موجود');
  error.status = 404;
  next(error);
});

app.use(errorHandler);

// ============================================
// 📊 Database & Services Initialization
// ============================================
const initApp = async () => {
  try {
    console.log('🔄 Running security schema upgrades...');
    const upgradeSecuritySchema = require('./migrations/upgrade-security-schema');
    await upgradeSecuritySchema();
    
    console.log('🔄 Initializing database tables...');
    await createTables();
    console.log('🔄 Initializing database indexes...');
    await createIndexes();
    console.log('✅ Database initialization complete.');

    // ✅ C-02: Create OTP table if OTP is enabled
    if (process.env.OTP_ENABLED === 'true') {
      try {
        const createOtpTable = require('./migrations/create-otp-table');
        await createOtpTable();
      } catch (otpErr) {
        console.warn('⚠️ OTP table migration skipped:', otpErr.message);
      }
    }
    
    // Start Monitoring Service (24/7) ONLY after DB is ready
    console.log('🔄 Starting Monitor Service...');
    if (monitorService && typeof monitorService.start === 'function') {
      monitorService.start();
    }

    // Start Memory Monitoring if not in production
    if (process.env.NODE_ENV !== 'production') {
      const { startMemoryMonitoring } = require('./services/memoryMonitor');
      startMemoryMonitoring();
    }
  } catch (dbError) {
    console.error('❌ Database initialization/Monitoring failed:', dbError.message);
    // We don't exit, we want the server to stay alive to receive health checks
  }
};

// Run initialization immediately (Non-blocking)
initApp();

if (require.main === module) {
  // Start server listening on IP and PORT (Required for AlwaysData)
  console.log(`[${new Date().toISOString()}] Attempting to start server on ${IP}:${PORT}...`);
  const server = app.listen(PORT, IP, async () => {
    console.log('');
    console.log('🚀 ════════════════════════════════════════════════════════');
    console.log(`   Tawal Academy Backend Server`);
    console.log('🚀 ════════════════════════════════════════════════════════');
    console.log(`📡 Server listening on: ${IP}:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health Check: http://${IP === '0.0.0.0' ? 'localhost' : IP}:${PORT}/api/health`);
    console.log('🚀 ════════════════════════════════════════════════════════');
    console.log('');
  });

  // ✅ L-07 FIX: Reduce default timeout to 2 minutes (upload routes have their own 15min timeout)
  server.timeout = 120000;
  server.keepAliveTimeout = 61000;
  server.headersTimeout = 62000;

  server.on('error', (err) => {
    console.error('❌ Server startup error (Port Binding):', err.message);
    process.exit(1); // ALWAYS exit on port binding error
  });
}

module.exports = app;
