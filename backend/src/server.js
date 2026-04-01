console.log('🚀 [STARTUP] Tawal Academy Backend starting up...');
const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const setupSecurity = require('./config/security');
require('dotenv').config();

// Global Error Handlers for Startup
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION during startup:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// Verify critical environment variables
const criticalEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
criticalEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ CRITICAL ERROR: Environment variable ${varName} is missing!`);
    if (process.env.NODE_ENV === 'production') {
      // In production, we might want to exit if critical vars are missing
      // process.exit(1); 
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

// ============================================
// 0. IMMEDIATE HEALTH CHECK (For Cloud Providers)
// ============================================
// This must be BEFORE any middleware to ensure fastest response
app.get('/api/health', (req, res) => {
  console.log(`[${new Date().toISOString()}] Health check hit: /api/health`);
  res.status(200).json({ status: 'ok', service: 'tawal-academy-backend' });
});

app.get('/health', (req, res) => {
  console.log(`[${new Date().toISOString()}] Health check hit: /health`);
  res.status(200).json({ status: 'ok', service: 'tawal-academy-backend' });
});

app.get('/', (req, res) => {
  res.status(200).send('Tawal Academy API is Running');
});

// 1. Basic body parsers - CRITICAL: Needed BEFORE security integrity checks
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// 2. Debug logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.get('Origin') || 'No Origin'}`);
  next();
});

// 3. Apply Advanced Security Configuration (WAF, Logging, Throttling, etc.)
// Now it will have access to req.body for HMAC verification
const { logger, loginLimiter } = setupSecurity(app);

app.use('/api/auth', loginLimiter);
app.use('/api/admin/login', loginLimiter);

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

// (Remove duplicate / and /api/health)

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'المسار غير موجود'
  });
});

app.use(errorHandler);

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

    // Background initialization
    try {
      console.log('🔄 Initializing database tables...');
      await createTables();
      console.log('🔄 Initializing database indexes...');
      await createIndexes();
      console.log('✅ Database initialization complete.');
      
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
  });

  // Increase timeout for large file uploads (10 minutes)
  server.timeout = 600000;
  server.keepAliveTimeout = 61000;
  server.headersTimeout = 62000;

  server.on('error', (err) => {
    console.error('❌ Server startup error (Port Binding):', err.message);
    process.exit(1); // ALWAYS exit on port binding error
  });
}

module.exports = app;
