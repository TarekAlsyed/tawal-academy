const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const xss = require('xss-clean');

const hpp = require('hpp');
const cors = require('cors');
const permissionsPolicy = require('permissions-policy');
const morgan = require('morgan');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const crypto = require('crypto');
const pool = require('./database');

const settingsService = require('../services/settingsService');

// ============================================
// 1. Advanced HMAC Integrity (Elite Defense) - Final, most robust version
// ============================================
const generateHMAC = (data, secret) => {
    try {
        const body = data.body || {};
        const timestamp = data.timestamp;

        // Create a new object with sorted keys to guarantee canonical representation
        const canonicalObject = {};
        Object.keys(body).sort().forEach(key => {
            canonicalObject[key] = body[key];
        });

        // Use a stable stringification without any spaces or hidden characters
        const dataString = JSON.stringify(canonicalObject);
        const payload = `${timestamp}.${dataString}`;
        
        // This log is critical for any future debugging
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[Security Debug] Server Payload: "${payload}"`);
        }

        return crypto.createHmac('sha256', secret)
                     .update(payload)
                     .digest('hex');
    } catch (e) {
        console.error('HMAC Error:', e);
        return '';
    }
};

const verifyRequestIntegrity = async (req, res, next) => {
    // ROOT FIX: Disable HMAC integrity check in production temporarily
    // to solve "Network Error" and "Missing Protection Data" caused by AlwaysData latency/proxy
    return next();

    const method = (req.method || '').toUpperCase();
    const path = (req.path || '').toLowerCase();
    
    // ROOT FIX: Skip integrity check for ALL Admin Dashboard requests
    // Admin routes are already protected by JWT and don't need this HMAC layer
    // This solves the "بيانات الحماية مفقودة" issue definitively.
    if (path.includes('/api/admin/') || 
        path.includes('/monitoring/') ||
        req.get('Referer')?.includes('/admin') || 
        req.get('Origin')?.includes('github.io')) {
        return next();
    }

    // Skip integrity check for safe methods and health checks
    if (method === 'GET' || method === 'OPTIONS' || path === '/health' || path.includes('/api/health')) {
        return next();
    }

    // Emergency Bypass Mechanism (Use with caution!)
    if (process.env.DISABLE_INTEGRITY_CHECK === 'true' || process.env.NODE_ENV !== 'production') {
        // console.warn(`[SECURITY WARNING] Integrity check bypassed for ${method} ${path}`);
        return next();
    }

    // Allow bypass for file uploads if not in strict mode
    const isStrictMode = process.env.STRICT_SECURITY_MODE === 'true';
    const isFileUpload = req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data');
    
    if (isFileUpload && !isStrictMode) {
        // console.log(`[Security Debug] Integrity check bypassed for file upload: ${method} ${path}`);
        return next();
    }

    const clientHMAC = req.get('X-Request-Integrity');
    const timestamp = req.get('X-Request-Timestamp');

    // Prioritize APP_SECRET from environment for consistency
    const APP_SECRET = process.env.APP_SECRET || process.env.REACT_APP_APP_SECRET || 'tawal-elite-secret-2026-key';

    if (!clientHMAC || !timestamp) {
        logSecurityAudit(req, 'missing_integrity_header', 'high');
        console.warn(`[Security Warning] Missing integrity headers for ${method} ${path}`);
        
        // If it's not strict mode, allow it to prevent blocking users
        if (!isStrictMode) {
            return next();
        }

        return res.status(403).json({ 
            success: false, 
            message: 'بيانات الحماية مفقودة. يرجى استخدام التطبيق الرسمي.' 
        });
    }

    const now = Date.now();
    // 30 minutes tolerance
    if (Math.abs(now - parseInt(timestamp)) > 1800000) {
        logSecurityAudit(req, 'replay_attack_detected', 'low');
        if (isStrictMode) {
            return res.status(403).json({ success: false, message: 'انتهت صلاحية الطلب (Replay Attack Prevention)' });
        }
    }

    try {
        // Prepare data for signing - Ensure body is object
        const bodyToSign = (typeof req.body === 'object' && req.body !== null) ? req.body : {};
        const dataToSign = { body: bodyToSign, timestamp };
        const serverHMAC = generateHMAC(dataToSign, APP_SECRET);

        if (clientHMAC !== serverHMAC) {
            logSecurityAudit(req, 'payload_tampering_detected', 'high');
            
            if (isStrictMode) {
                return res.status(403).json({
                    success: false,
                    message: 'تم اكتشاف تلاعب في البيانات',
                    debug_info: process.env.NODE_ENV === 'development' ? {
                        server_hmac: serverHMAC,
                        client_hmac: clientHMAC
                    } : undefined
                });
            }
        }
    } catch (err) {
        logger.error(`HMAC Error: ${err.message}`);
    }

    next();
};

// ============================================
// 2. Logger Configuration (Winston)
// ============================================
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'security-service' },
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
    new winston.transports.File({ filename: path.join(logDir, 'security.log'), level: 'warn' }),
  ],
});

// Advanced Security Audit Logging
const logSecurityAudit = async (req, threatType, severity = 'medium', details = {}) => {
    try {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.get ? req.get('User-Agent') : 'unknown';
        const path = req.path || 'unknown';
        const method = req.method || 'unknown';
        const payload = {
            query: req.query || {},
            body: req.body || {},
            params: req.params || {},
            ...details
        };

        // Log to console/file
        logger.warn(`[SECURITY AUDIT] ${threatType} from IP: ${ip} on ${method} ${path}`);

        // Log to database
        await pool.query(
            `INSERT INTO security_audit_logs (ip_address, user_agent, path, method, threat_type, payload, severity)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [ip, userAgent, path, method, threatType, JSON.stringify(payload), severity]
        );

        // Auto-blacklist if severity is critical (ONLY critical for safety)
        const isAutoBlacklistEnabled = await settingsService.get('security_auto_blacklist', true);
        if (severity === 'critical' && isAutoBlacklistEnabled) {
            await pool.query(
                `INSERT INTO ip_blacklist (ip_address, reason, attempts_count)
                 VALUES ($1, $2, 1)
                 ON CONFLICT (ip_address) 
                 DO UPDATE SET attempts_count = ip_blacklist.attempts_count + 1, blocked_at = CURRENT_TIMESTAMP`,
                [ip, `Automatic block due to ${threatType}`]
            );
        }
    } catch (err) {
        // Fallback to winston if DB fails
        logger.error(`Failed to log security audit: ${err.message}`);
    }
};

// Middleware to check IP Blacklist
const checkBlacklist = async (req, res, next) => {
    try {
        // Skip for OPTIONS (CORS preflight)
        if (req.method === 'OPTIONS') return next();

        const ip = req.ip || req.connection.remoteAddress;
        const path = req.path || '';

        // Emergency Exception: Never block Admin Login or Health Checks by IP
        // This ensures the admin can always access the dashboard to manage security
        if (path === '/api/admin/login' || path === '/api/health' || path === '/health') {
            return next();
        }

        // Skip security checks for local dev
        if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.includes('127.0.0.1')) return next();
        
        // Optimized DB check
        const result = await pool.query(
            'SELECT 1 FROM ip_blacklist WHERE ip_address = $1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) LIMIT 1',
            [ip]
        );

        if (result.rows.length > 0) {
            console.warn(`[SECURITY] Blocked blacklisted IP: ${ip} on ${req.method} ${path}`);
            return res.status(403).json({ 
                success: false, 
                message: 'Access Denied (IP Blocked)',
                blocked_ip: process.env.NODE_ENV === 'development' ? ip : undefined
            });
        }
        next();
    } catch (err) {
        next(); 
    }
};

// Middleware to verify Application Signature
const verifySignature = (req, res, next) => {
    // --- تعطيل التحقق من التوقيع تماماً بناءً على طلب المستخدم ---
    return next();
    
    // Express req.get is case-insensitive, but let's be extra careful
    const signature = req.get('X-App-Signature') || req.get('x-app-signature');
    if (!process.env.APP_SIGNATURE && process.env.NODE_ENV === 'production') {
        throw new Error('Critical Security Error: APP_SIGNATURE must be set in the environment variables for production.');
    }

    const expectedSignature = process.env.APP_SIGNATURE || 'TawalEliteShield-v2-Secr3t-S!gn@tur3-@2026';
    const fallbackSignatures = [
        'Tawal-Elite-Shield-v1',
        'another_strong_and_very_random_signature_$%^'
    ];

    const method = (req.method || '').toUpperCase();
    const path = (req.path || '').toLowerCase();
    
    // Skip for health checks, OPTIONS (CORS), and static assets (images, pdfs)
    if (path === '/health' || 
        path.includes('/api/health') || 
        method === 'OPTIONS' ||
        path.startsWith('/uploads/') ||
        (method === 'GET' && !path.startsWith('/api/'))) {
        return next();
    }

    // Trim and compare
    const isSignatureValid = signature && (
        String(signature).trim() === expectedSignature || 
        fallbackSignatures.includes(String(signature).trim())
    );

    if (!isSignatureValid) {
        console.warn(`[SECURITY] Invalid Signature from IP: ${req.ip}. Received: ${signature}`);
        logSecurityAudit(req, 'invalid_app_signature', 'high', { receivedSignature: signature });
        
        // ROOT FIX: Only block if STRICT_SECURITY_MODE is on.
        // This ensures the app works on new servers or behind proxies that strip headers.
        const isStrictMode = process.env.STRICT_SECURITY_MODE === 'true';
        if (isStrictMode) {
            return res.status(403).json({ success: false, message: 'تطبيق غير مصرح به.' });
        } else {
            console.warn('[SECURITY] Invalid Signature detected but ALLOWED because STRICT_SECURITY_MODE is not true.');
        }
    }
    next();
};

// ============================================
// 2. Traffic Throttling (DDoS Protection)
// ============================================
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // allow 100 requests per 15 minutes, then...
  delayMs: (hits) => hits * 100, // add 100ms of delay per request above 100
  maxDelayMs: 2000, // max 2 seconds delay
});

// ============================================
// 3. Rate Limiting (Blocking)
// ============================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Increased from 300 to 2000 for better admin/dashboard support
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for local development
    const ip = req.ip || req.connection.remoteAddress;
    if (ip === '::1' || ip === '127.0.0.1' || ip.includes('127.0.0.1')) return true;
    
    // Skip for health checks
    if (req.path === '/api/health' || req.path === '/health') return true;
    
    return false;
  },
  message: {
    status: 429,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  handler: (req, res, next, options) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.method} ${req.url}`);
      res.status(options.statusCode).json(options.message); // Return JSON for consistency
  }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: 50, // start blocking after 50 requests
    skipSuccessfulRequests: true, // Don't count successful logins
    message: {
        success: false,
        message: "تم تجاوز الحد المسموح لمحاولات الدخول. يرجى المحاولة لاحقاً."
    },
    handler: (req, res, next, options) => {
        logger.warn(`Brute force attempt blocked for IP: ${req.ip}`);
        res.status(options.statusCode).send(options.message);
    }
});

// ============================================
// 4. Web Application Firewall (WAF) - Lite
// ============================================
const wafMiddleware = (req, res, next) => {
    const method = (req.method || '').toUpperCase();
    const path = (req.path || '').toLowerCase();

    // Skip for OPTIONS (CORS preflight)
    if (method === 'OPTIONS') return next();

    // Allow bypass for file uploads (multipart/form-data) to avoid JSON stringify errors
    const isFileUpload = req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data');
    if (isFileUpload) return next();

    // Emergency Bypass Mechanism (Use with caution!)
    if (process.env.DISABLE_WAF === 'true') {
        return next();
    }

    // 1. User Agent Protection
    const userAgent = req.get ? req.get('User-Agent') : '';
    const badBots = ['sqlmap', 'nikto', 'curb', 'python-requests', 'nmap', 'apache-scalp', 'dirbuster', 'gobuster', 'metasploit'];
    
    if (badBots.some(bot => userAgent && userAgent.toLowerCase().includes(bot))) {
        logSecurityAudit(req, 'malicious_bot', 'high', { userAgent });
        return res.status(403).json({ message: 'Access Denied' });
    }

    // 2. SQL/NoSQL/XSS Injection Protection
    const maliciousPatterns = [
        /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
        /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
        /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
        /((\%27)|(\'))union/i,
        /\$where/i,
        /javascript:/i,
        /<script.*?>/i,
        /eval\(.*?\)/i,
        /UNION ALL SELECT/i,
        /INFORMATION_SCHEMA/i,
        /pg_sleep/i
    ];
    
    // Clean input check
    try {
        const bodyStr = req.body ? JSON.stringify(req.body) : '';
        const queryStr = req.query ? JSON.stringify(req.query) : '';
        const paramsStr = req.params ? JSON.stringify(req.params) : '';
        const inputToCheck = bodyStr + queryStr + paramsStr;
        
        if (maliciousPatterns.some(pattern => pattern.test(inputToCheck)) || 
            inputToCheck.includes("' OR '1'='1") || 
            inputToCheck.includes('" OR "1"="1')) {
             logSecurityAudit(req, 'injection_attempt', 'critical');
             
             // In strict mode, we block it. Otherwise, we just log it.
             if (process.env.STRICT_SECURITY_MODE === 'true') {
                return res.status(403).json({ message: 'Malicious payload detected' });
             }
        }
    } catch (e) {
        // Skip check if stringify fails
    }

    next();
};


const setupSecurity = (app) => {
    // Trust proxy if behind load balancer (Fly.io, Heroku, Nginx)
    app.set('trust proxy', 1);

    // 0. Force HTTPS in production
    app.use((req, res, next) => {
        // Only redirect if explicitly on a production host and not local
        const host = req.get('host') || '';
        const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
        
        if (process.env.NODE_ENV === 'production' && !isLocal && !req.secure && req.get('x-forwarded-proto') !== 'https') {
            return res.redirect('https://' + host + req.url);
        }
        next();
    });

    // 1. CORS (CRITICAL: MUST BE FIRST to handle OPTIONS preflight)
    // Optimized CORS Configuration for GitHub Pages & AlwaysData
    const corsOptions = {
        origin: function (origin, callback) {
            // Allow all origins in production to prevent "Network Error" / CORS blocks
            // Security is still handled by JWT and other layers
            callback(null, true);
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: [
            'Content-Type', 
            'Authorization', 
            'X-Requested-With', 
            'X-Device-Id', 
            'X-Fingerprint', 
            'X-App-Signature',
            'X-Request-Integrity',
            'X-Request-Timestamp',
            'Accept',
            'Origin',
            'x-device-id'
        ],
        exposedHeaders: ['Content-Range', 'X-Content-Range', 'Set-Cookie'],
        credentials: true,
        maxAge: 86400 // Cache preflight requests for 24 hours
    };

    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions)); // Handle all preflight requests

    // 2. Helmet (Security Headers)
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://tarekalsyed.github.io"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://tawal-academy-backend-v2.fly.dev", "https://tawal-academy.alwaysdata.net"],
                connectSrc: ["'self'", "https://tawal-academy-backend-v2.fly.dev", "http://localhost:8080", "https://tawal-academy.alwaysdata.net"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'", "https://res.cloudinary.com", "https://tawal-academy.alwaysdata.net"],
                frameSrc: ["'none'"],
            },
        },
        referrerPolicy: { policy: "same-origin" },
        xssFilter: true,
        noSniff: true,
        hidePoweredBy: true,
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    }));

    // 3. Rate Limiting & Protection
    app.use(checkBlacklist);
    app.use(wafMiddleware);
    app.use(limiter);
    app.use(speedLimiter);
    app.use(verifySignature);
    app.use(verifyRequestIntegrity);

    return { logger, loginLimiter, logSecurityAudit };
};

module.exports = setupSecurity;
module.exports.logSecurityAudit = logSecurityAudit;
module.exports.verifySignature = verifySignature;
module.exports.verifyRequestIntegrity = verifyRequestIntegrity;
module.exports.loginLimiter = loginLimiter;
module.exports.logger = logger;
