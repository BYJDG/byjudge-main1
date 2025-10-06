const rateLimit = require('express-rate-limit');
const { getDatabase } = require('../database/init');

// IP whitelist for admin access (production için)
const ADMIN_IP_WHITELIST = process.env.ADMIN_IP_WHITELIST ? 
    process.env.ADMIN_IP_WHITELIST.split(',') : [];

// Admin access rate limiting (daha sıkı)
const adminRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 10, // Admin işlemleri için 10 istek
    message: 'Çok fazla admin işlemi yapıldı. Lütfen daha sonra tekrar deneyin.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth rate limiting (giriş denemeleri için)
const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 5, // 5 başarısız giriş denemesi
    message: 'Çok fazla giriş denemesi yapıldı. Lütfen 15 dakika bekleyin.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Başarılı istekleri sayma
});

// File upload rate limiting
const uploadRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 dakika
    max: 3, // Dakikada 3 dosya yükleme
    message: 'Çok fazla dosya yükleme işlemi yapıldı. Lütfen bekleyin.',
    standardHeaders: true,
    legacyHeaders: false,
});

// IP whitelist kontrolü (admin panel için)
const checkAdminIP = (req, res, next) => {
    // Development modunda IP kontrolü yapma
    if (process.env.NODE_ENV === 'development') {
        return next();
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (ADMIN_IP_WHITELIST.length > 0 && !ADMIN_IP_WHITELIST.includes(clientIP)) {
        console.warn(`Admin panel erişim denemesi engellendi: ${clientIP}`);
        return res.status(403).json({ 
            error: 'Bu IP adresinden admin paneline erişim izni yok' 
        });
    }
    
    next();
};

// Admin aktivite loglama
const logAdminActivity = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        const activity = {
            admin_id: req.user.id,
            admin_username: req.user.username,
            action: `${req.method} ${req.originalUrl}`,
            ip: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        };
        
        console.log('ADMIN ACTIVITY:', JSON.stringify(activity));
        
        // İsterseniz bu logları veritabanına da kaydedebiliriz
        logToDatabase(activity);
    }
    
    next();
};

// Veritabanına log kaydetme
const logToDatabase = async (activity) => {
    try {
        const db = getDatabase();
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO admin_logs (admin_id, admin_username, action, ip, user_agent, timestamp) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    activity.admin_id,
                    activity.admin_username,
                    activity.action,
                    activity.ip,
                    activity.user_agent,
                    activity.timestamp
                ],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    } catch (error) {
        console.error('Admin log kaydetme hatası:', error);
    }
};

// Şüpheli aktivite tespiti
const detectSuspiciousActivity = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    
    // Bot user agent'ları
    const botPatterns = [
        /bot/i, /crawler/i, /spider/i, /scraper/i,
        /curl/i, /wget/i, /python/i, /php/i,
        /sqlmap/i, /nikto/i, /nmap/i
    ];
    
    // Şüpheli user agent
    if (botPatterns.some(pattern => pattern.test(userAgent))) {
        console.warn(`Şüpheli user agent tespit edildi: ${userAgent} - IP: ${clientIP}`);
        return res.status(403).json({ 
            error: 'Erişim engellendi' 
        });
    }
    
    // Şüpheli path'ler
    const suspiciousPaths = [
        '/admin', '/wp-admin', '/phpmyadmin', '/.env',
        '/config', '/backup', '/database', '/sql'
    ];
    
    if (suspiciousPaths.some(path => req.path.includes(path)) && !req.user) {
        console.warn(`Şüpheli path erişim denemesi: ${req.path} - IP: ${clientIP}`);
        return res.status(403).json({ 
            error: 'Erişim engellendi' 
        });
    }
    
    next();
};

// Request validation
const validateRequest = (req, res, next) => {
    // Content-Type kontrolü
    if (req.method === 'POST' || req.method === 'PUT') {
        const contentType = req.get('Content-Type');
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(400).json({ 
                error: 'Geçersiz content type' 
            });
        }
    }
    
    // Request boyut kontrolü
    const contentLength = parseInt(req.get('Content-Length') || '0');
    if (contentLength > 10 * 1024 * 1024) { // 10MB limit
        return res.status(413).json({ 
            error: 'İstek çok büyük' 
        });
    }
    
    next();
};

// SQL injection koruması
const sanitizeInput = (req, res, next) => {
    const sqlInjectionPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
        /(;|\-\-|\/\*|\*\/)/,
        /(\bOR\b|\bAND\b).*(\=|\<|\>|\!)/i,
        /(\bUNION\b.*\bSELECT\b)/i
    ];
    
    const checkObject = (obj) => {
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                if (sqlInjectionPatterns.some(pattern => pattern.test(value))) {
                    console.warn(`SQL Injection denemesi tespit edildi: ${value} - IP: ${req.ip}`);
                    return false;
                }
            } else if (typeof value === 'object' && value !== null) {
                if (!checkObject(value)) return false;
            }
        }
        return true;
    };
    
    if (!checkObject(req.body) || !checkObject(req.query) || !checkObject(req.params)) {
        return res.status(400).json({ 
            error: 'Geçersiz karakterler tespit edildi' 
        });
    }
    
    next();
};

module.exports = {
    adminRateLimit,
    authRateLimit,
    uploadRateLimit,
    checkAdminIP,
    logAdminActivity,
    detectSuspiciousActivity,
    validateRequest,
    sanitizeInput
};
