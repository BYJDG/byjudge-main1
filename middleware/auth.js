const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Erişim token\'ı gerekli' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Geçersiz token' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }
  next();
};

const requireUser = (req, res, next) => {
  if (!req.user || (req.user.role !== 'user' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Kullanıcı yetkisi gerekli' });
  }
  next();
};

const checkUserStatus = async (req, res, next) => {
  try {
    const db = getDatabase();
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT is_active FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user || !user.is_active) {
      return res.status(403).json({ error: 'Hesabınız deaktif durumda' });
    }

    next();
  } catch (error) {
    console.error('Kullanıcı durumu kontrol hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireUser,
  checkUserStatus
};
