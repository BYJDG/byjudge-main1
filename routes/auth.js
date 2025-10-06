const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `BJ${timestamp.slice(-6)}${random}`;
};

// Register
router.post('/register', [
  body('username').isLength({ min: 3, max: 50 }).withMessage('Kullanıcı adı 3-50 karakter arası olmalı'),
  body('email').isEmail().withMessage('Geçerli bir email adresi girin'),
  body('password').isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalı'),
  body('full_name').optional().isLength({ max: 100 }).withMessage('Ad soyad en fazla 100 karakter olmalı'),
  body('phone').optional().isLength({ max: 20 }).withMessage('Telefon numarası en fazla 20 karakter olmalı'),
  body('telegram_username').optional().isLength({ max: 50 }).withMessage('Telegram kullanıcı adı en fazla 50 karakter olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Geçersiz veri',
        details: errors.array()
      });
    }

    const { username, email, password, full_name, phone, telegram_username } = req.body;
    const db = getDatabase();

    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Bu kullanıcı adı veya email zaten kullanılıyor' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (username, email, password, full_name, phone, telegram_username) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [username, email, hashedPassword, full_name, phone, telegram_username],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: userId, 
        username, 
        email, 
        role: 'user' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Kayıt başarılı',
      token,
      user: {
        id: userId,
        username,
        email,
        full_name,
        role: 'user'
      }
    });

  } catch (error) {
    console.error('Kayıt hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Login
router.post('/login', [
  body('login').notEmpty().withMessage('Kullanıcı adı veya email gerekli'),
  body('password').notEmpty().withMessage('Şifre gerekli')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Geçersiz veri',
        details: errors.array()
      });
    }

    const { login, password } = req.body;
    const db = getDatabase();

    // Find user by username or email
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1',
        [login, login],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login
    db.run('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Giriş hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, email, full_name, phone, telegram_username, role, created_at FROM users WHERE id = ?',
        [req.user.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profil getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Update profile
router.put('/profile', authenticateToken, [
  body('full_name').optional().isLength({ max: 100 }).withMessage('Ad soyad en fazla 100 karakter olmalı'),
  body('phone').optional().isLength({ max: 20 }).withMessage('Telefon numarası en fazla 20 karakter olmalı'),
  body('telegram_username').optional().isLength({ max: 50 }).withMessage('Telegram kullanıcı adı en fazla 50 karakter olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Geçersiz veri',
        details: errors.array()
      });
    }

    const { full_name, phone, telegram_username } = req.body;
    const db = getDatabase();

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET full_name = ?, phone = ?, telegram_username = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [full_name, phone, telegram_username, req.user.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ message: 'Profil güncellendi' });
  } catch (error) {
    console.error('Profil güncelleme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Change password
router.put('/change-password', authenticateToken, [
  body('current_password').notEmpty().withMessage('Mevcut şifre gerekli'),
  body('new_password').isLength({ min: 6 }).withMessage('Yeni şifre en az 6 karakter olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Geçersiz veri',
        details: errors.array()
      });
    }

    const { current_password, new_password } = req.body;
    const db = getDatabase();

    // Get current user
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT password FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Mevcut şifre yanlış' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedNewPassword, req.user.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ message: 'Şifre başarıyla değiştirildi' });
  } catch (error) {
    console.error('Şifre değiştirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Çıkış başarılı' });
});

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role
    }
  });
});

module.exports = router;
