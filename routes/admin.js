const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const db = getDatabase();
    
    const stats = await new Promise((resolve, reject) => {
      const stats = {};
      let completed = 0;
      const total = 5;

      // Total users
      db.get('SELECT COUNT(*) as count FROM users WHERE role = "user"', (err, row) => {
        if (err) return reject(err);
        stats.totalUsers = row.count;
        completed++;
        if (completed === total) resolve(stats);
      });

      // Total products
      db.get('SELECT COUNT(*) as count FROM products WHERE is_active = 1', (err, row) => {
        if (err) return reject(err);
        stats.totalProducts = row.count;
        completed++;
        if (completed === total) resolve(stats);
      });

      // Total orders
      db.get('SELECT COUNT(*) as count FROM orders', (err, row) => {
        if (err) return reject(err);
        stats.totalOrders = row.count;
        completed++;
        if (completed === total) resolve(stats);
      });

      // Pending orders
      db.get('SELECT COUNT(*) as count FROM orders WHERE status = "pending"', (err, row) => {
        if (err) return reject(err);
        stats.pendingOrders = row.count;
        completed++;
        if (completed === total) resolve(stats);
      });

      // Total revenue
      db.get('SELECT SUM(total_amount) as total FROM orders WHERE status = "completed"', (err, row) => {
        if (err) return reject(err);
        stats.totalRevenue = row.total || 0;
        completed++;
        if (completed === total) resolve(stats);
      });
    });

    // Recent orders
    const recentOrders = await new Promise((resolve, reject) => {
      db.all(`
        SELECT o.*, u.username, u.email, p.name as product_name 
        FROM orders o 
        JOIN users u ON o.user_id = u.id 
        JOIN products p ON o.product_id = p.id 
        ORDER BY o.created_at DESC 
        LIMIT 10
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Recent users
    const recentUsers = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, username, email, full_name, created_at 
        FROM users 
        WHERE role = "user" 
        ORDER BY created_at DESC 
        LIMIT 10
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      stats,
      recentOrders,
      recentUsers
    });

  } catch (error) {
    console.error('Dashboard verisi getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const db = getDatabase();

    let query = 'SELECT id, username, email, full_name, phone, telegram_username, role, is_active, created_at FROM users';
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    const params = [];

    if (search) {
      query += ' WHERE username LIKE ? OR email LIKE ? OR full_name LIKE ?';
      countQuery += ' WHERE username LIKE ? OR email LIKE ? OR full_name LIKE ?';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [users, total] = await Promise.all([
      new Promise((resolve, reject) => {
        db.all(query, params.slice(0, -2).concat([parseInt(limit), parseInt(offset)]), (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(countQuery, params.slice(0, -2), (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        });
      })
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Kullanıcıları getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Update user status
router.put('/users/:id/status', [
  body('is_active').isBoolean().withMessage('is_active boolean değer olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Geçersiz veri',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { is_active } = req.body;
    const db = getDatabase();

    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role != "admin"',
        [is_active, id],
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) {
            reject(new Error('Kullanıcı bulunamadı veya admin kullanıcı değiştirilemez'));
          } else {
            resolve();
          }
        }
      );
    });

    res.json({ message: 'Kullanıcı durumu güncellendi' });
  } catch (error) {
    console.error('Kullanıcı durumu güncelleme hatası:', error);
    res.status(500).json({ error: error.message || 'Sunucu hatası' });
  }
});

// Get all orders
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', search = '' } = req.query;
    const offset = (page - 1) * limit;
    const db = getDatabase();

    let query = `
      SELECT o.*, u.username, u.email, u.full_name, p.name as product_name, p.price 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      JOIN products p ON o.product_id = p.id
    `;
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      JOIN products p ON o.product_id = p.id
    `;
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(u.username LIKE ? OR u.email LIKE ? OR o.order_number LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [orders, total] = await Promise.all([
      new Promise((resolve, reject) => {
        db.all(query, params.slice(0, -2).concat([parseInt(limit), parseInt(offset)]), (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(countQuery, params.slice(0, -2), (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        });
      })
    ]);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Siparişleri getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Update order status
router.put('/orders/:id/status', [
  body('status').isIn(['pending', 'processing', 'completed', 'cancelled']).withMessage('Geçersiz sipariş durumu'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notlar en fazla 500 karakter olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Geçersiz veri',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;
    const db = getDatabase();

    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE orders SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, notes, id],
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) {
            reject(new Error('Sipariş bulunamadı'));
          } else {
            resolve();
          }
        }
      );
    });

    res.json({ message: 'Sipariş durumu güncellendi' });
  } catch (error) {
    console.error('Sipariş durumu güncelleme hatası:', error);
    res.status(500).json({ error: error.message || 'Sunucu hatası' });
  }
});

// Get all receipts
router.get('/receipts', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', search = '' } = req.query;
    const offset = (page - 1) * limit;
    const db = getDatabase();

    let query = `
      SELECT r.*, o.order_number, o.total_amount, u.username, u.email, 
             p.name as product_name, verifier.username as verified_by_username
      FROM receipts r 
      JOIN orders o ON r.order_id = o.id
      JOIN users u ON o.user_id = u.id
      JOIN products p ON o.product_id = p.id
      LEFT JOIN users verifier ON r.verified_by = verifier.id
    `;
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM receipts r 
      JOIN orders o ON r.order_id = o.id
      JOIN users u ON o.user_id = u.id
    `;
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('r.status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(u.username LIKE ? OR u.email LIKE ? OR o.order_number LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ' ORDER BY r.uploaded_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [receipts, total] = await Promise.all([
      new Promise((resolve, reject) => {
        db.all(query, params.slice(0, -2).concat([parseInt(limit), parseInt(offset)]), (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(countQuery, params.slice(0, -2), (err, row) => {
          if (err) reject(err);
          else resolve(row.total);
        });
      })
    ]);

    res.json({
      receipts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Dekontları getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Verify receipt
router.put('/receipts/:id/verify', [
  body('status').isIn(['verified', 'rejected']).withMessage('Geçersiz doğrulama durumu'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notlar en fazla 500 karakter olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Geçersiz veri',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;
    const db = getDatabase();

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE receipts 
         SET status = ?, notes = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [status, notes, req.user.id, id],
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) {
            reject(new Error('Dekont bulunamadı'));
          } else {
            resolve();
          }
        }
      );
    });

    // If receipt is verified, update order status to processing
    if (status === 'verified') {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE orders SET status = "processing" WHERE id = (SELECT order_id FROM receipts WHERE id = ?)',
          [id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    res.json({ message: 'Dekont durumu güncellendi' });
  } catch (error) {
    console.error('Dekont doğrulama hatası:', error);
    res.status(500).json({ error: error.message || 'Sunucu hatası' });
  }
});

module.exports = router;
