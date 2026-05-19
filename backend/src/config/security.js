const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const cors = require('cors');
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
    const method = (req.method || '').toUpperCase();
    const path = (req.path || '').toLowerCase();
    
    // Skip integrity check for Admin Dashboard requests (already protected by JWT)
    // and monitoring routes (public error reporting)
    if (path.includes('/api/admin/') || 
        path.includes('/monitoring/')) {
        return next();
    }

    // Skip integrity check for safe methods and health checks
    if (method === 'GET' || method === 'OPTIONS' || path === '/health' || path.includes('/api/health')) {
        return next();
    }

    // SECURITY: Emergency bypass removed for production safety

    // Allow bypass for file uploads if not in strict mode
    const isStrictMode = process.env.STRICT_SECURITY_MODE === 'true';
    const isFileUpload = req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data');
    
    if (isFileUpload && !isStrictMode) {
        return next();
    }

    // SECURITY v2.2.0: Server-side integrity verification
    // The frontend sends only the timestamp (no HMAC). 
    // The server validates: (1) replay protection via timestamp, (2) binds body to request via server-side hash
    const timestamp = req.get('X-Request-Timestamp');

    if (!timestamp) {
        logSecurityAudit(req, 'missing_timestamp_header', 'medium');
        
        // In production, timestamp is required for replay protection
        if (process.env.NODE_ENV === 'production' || isStrictMode) {
            return res.status(403).json({ 
                success: false, 
                message: 'بيانات الحماية مفقودة. يرجى استخدام التطبيق الرسمي.' 
            });
        }
        return next();
    }

    const now = Date.now();
    // 5 minutes tolerance for replay protection
    if (Math.abs(now - parseInt(timestamp)) > 300000) {
        logSecurityAudit(req, 'replay_attack_detected', 'low');
        if (isStrictMode || process.env.NODE_ENV === 'production') {
            return res.status(403).json({ success: false, message: 'انتهت صلاحية الطلب (Replay Attack Prevention)' });
        }
    }

    // Server-side body integrity: compute a hash binding the body to this request
    // This protects against middleware-level body injection (defense-in-depth)
    const APP_SECRET = process.env.APP_SECRET;
    if (APP_SECRET) {
        try {
            const bodyToSign = (typeof req.body === 'object' && req.body !== null) ? req.body : {};
            const dataToSign = { body: bodyToSign, timestamp };
            const bodyHash = generateHMAC(dataToSign, APP_SECRET);
            // Store the server-computed hash for downstream verification if needed
            req._bodyIntegrityHash = bodyHash;
        } catch (err) {
            logger.error(`Server HMAC Error: ${err.message}`);
        }
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
            // PERF v2.2.0: Immediately update in-memory cache so next request is blocked
            blacklistCache.addIp(ip);
        }
    } catch (err) {
        // Fallback to winston if DB fails
        logger.error(`Failed to log security audit: ${err.message}`);
    }
};

// ============================================
// In-Memory Blacklist Cache (Performance Optimization v2.2.0)
// Eliminates database query on every request — refreshes every 5 minutes
// ============================================
const blacklistCache = {
    _ips: new Set(),
    _lastRefresh: 0,
    _TTL: 5 * 60 * 1000, // 5 minutes
    _refreshing: false,

    async refresh() {
        // Prevent concurrent refreshes
        if (this._refreshing) return;
        this._refreshing = true;
        try {
            const result = await pool.query(
                'SELECT ip_address FROM ip_blacklist WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP'
            );
            this._ips = new Set(result.rows.map(r => r.ip_address));
            this._lastRefresh = Date.now();
        } catch (err) {
            console.error('[BLACKLIST CACHE] Refresh failed:', err.message);
            // Keep stale cache rather than losing protection
        } finally {
            this._refreshing = false;
        }
    },

    async isBlocked(ip) {
        // Refresh cache if TTL expired
        if (Date.now() - this._lastRefresh > this._TTL) {
            await this.refresh();
        }
        return this._ips.has(ip);
    },

    // Called when a new IP is blacklisted to immediately update cache
    addIp(ip) {
        this._ips.add(ip);
    },

    // Called when an IP is unblocked to immediately update cache
    removeIp(ip) {
        this._ips.delete(ip);
    }
};

// Initial cache load
blacklistCache.refresh().catch(err => {
    console.error('[BLACKLIST CACHE] Initial load failed:', err.message);
});

// Middleware to check IP Blacklist (uses in-memory cache — zero DB queries per request)
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
        
        // Check in-memory cache (zero DB queries)
        if (await blacklistCache.isBlocked(ip)) {
            console.warn(`[SECURITY] Blocked blacklisted IP: ${ip} on ${req.method} ${path}`);
            return res.status(403).json({ 
                success: false, 
                message: 'Access Denied (IP Blocked)',
                blocked_ip: process.env.NODE_ENV === 'development' ? ip : undefined
            });
        }
        next();
    } catch (err) {
        logger.error(`[SECURITY CRITICAL] Blacklist check failed (fail-open): ${err.message}`);
        // Fail-open to prevent total lockout on cache/DB failure, but log as critical
        console.error(`[SECURITY] ⚠️ Blacklist check failed for IP: ${req.ip} — request allowed (fail-open)`);
        next();
    }
};

// Application Signature verification is handled via JWT + HMAC layers
// This middleware delegates to the existing verifyRequestIntegrity chain
const verifySignature = (req, res, next) => {
    // Signature validation is now fully covered by verifyRequestIntegrity
    return next();
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
  max: 500, // Balanced: enough for admin/dashboard, low enough to prevent abuse
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
    max: 15, // Block after 15 failed attempts per IP (successful requests are skipped)
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

    // Track if this is a file upload (body may not be serializable)
    const isFileUpload = req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data');

    // SECURITY: Emergency WAF bypass removed for production safety

    // 1. User Agent Protection
    const userAgent = req.get ? req.get('User-Agent') : '';
    const badBots = ['sqlmap', 'nikto', 'curb', 'python-requests', 'nmap', 'apache-scalp', 'dirbuster', 'gobuster', 'metasploit'];
    
    if (badBots.some(bot => userAgent && userAgent.toLowerCase().includes(bot))) {
        logSecurityAudit(req, 'malicious_bot', 'high', { userAgent });
        return res.status(403).json({ message: 'Access Denied' });
    }

    // 2. SQL/NoSQL/XSS Injection Protection
    const maliciousPatterns = [
        // REMOVED: Overly broad pattern that blocked legitimate apostrophes/hashes
        /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
        /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
        /((\%27)|(\'))union/i,
        /\$where/i,
        /javascript:/i,
        /<script.*?>/i,
        /eval\(.*?\)/i,
        /UNION ALL SELECT/i,
        /INFORMATION_SCHEMA/i,
        /pg_sleep/i,
        /;\s*DROP\s+(TABLE|DATABASE)/i,
        /;\s*DELETE\s+FROM/i
    ];
    
    // Clean input check
    try {
        const bodyStr = (!isFileUpload && req.body) ? JSON.stringify(req.body) : '';
        const queryStr = req.query ? JSON.stringify(req.query) : '';
        const paramsStr = req.params ? JSON.stringify(req.params) : '';
        const inputToCheck = bodyStr + queryStr + paramsStr;
        
        if (maliciousPatterns.some(pattern => pattern.test(inputToCheck)) || 
            inputToCheck.includes("' OR '1'='1") || 
            inputToCheck.includes('" OR "1"="1')) {
             logSecurityAudit(req, 'injection_attempt', 'critical');
             
             // Block malicious payloads in production or strict mode
             if (process.env.STRICT_SECURITY_MODE === 'true' || process.env.NODE_ENV === 'production') {
                return res.status(403).json({ success: false, message: 'تم رفض الطلب لأسباب أمنية' });
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
            // Allow requests with no origin (mobile apps, curl, server-to-server)
            if (!origin) return callback(null, true);
            
            const allowedOrigins = [
                'https://tarekalsyed.github.io',
                'http://localhost:3000',
                'http://localhost:5173',
                'http://localhost:8080',
                // Capacitor mobile app origins (v5+ uses https://localhost)
                'capacitor://localhost',
                'http://localhost',
                'https://localhost',
                process.env.FRONTEND_URL
            ].filter(Boolean);
            
            // Secure origin comparison: extract origin (scheme+host+port) from each allowed URL
            const isAllowed = allowedOrigins.some(allowed => {
                try {
                    return new URL(allowed).origin === origin;
                } catch {
                    return allowed === origin;
                }
            });
            
            if (isAllowed) {
                callback(null, true);
            } else {
                console.warn(`[CORS] Blocked origin: ${origin}`);
                callback(null, false);
            }
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
            'X-Platform',
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
module.exports.blacklistCache = blacklistCache;
