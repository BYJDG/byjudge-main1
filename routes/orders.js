const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../database/init');
const { authenticateToken, requireUser } = require('../middleware/auth');

const router = express.Router();

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `BJ${timestamp.slice(-6)}${random}`;
};

// Create order (authenticated users only)
router.post('/', authenticateToken, requireUser, [
  body('product_id').isInt({ min: 1 }).withMessage('Geçerli ürün ID gerekli'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Miktar 1 veya daha büyük olmalı'),
  body('payment_method').optional().isLength({ max: 50 }).withMessage('Ödeme yöntemi en fazla 50 karakter olmalı'),
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

    const { product_id, quantity = 1, payment_method, notes } = req.body;
    const db = getDatabase();

    // Get product details
    const product = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM products WHERE id = ? AND is_active = 1', [product_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    // Check stock if applicable
    if (product.stock_quantity !== -1 && product.stock_quantity < quantity) {
      return res.status(400).json({ error: 'Yetersiz stok' });
    }

    const total_amount = product.price * quantity;
    const order_number = generateOrderNumber();

    // Create order
    const orderId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO orders (
          user_id, product_id, order_number, quantity, total_amount, 
          currency, payment_method, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id, product_id, order_number, quantity, total_amount,
          product.currency, payment_method, notes
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Update stock if applicable
    if (product.stock_quantity !== -1) {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [quantity, product_id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    res.status(201).json({
      message: 'Sipariş oluşturuldu',
      order: {
        id: orderId,
        order_number,
        product_name: product.name,
        quantity,
        total_amount,
        currency: product.currency,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Sipariş oluşturma hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Get user's orders
router.get('/my-orders', authenticateToken, requireUser, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const offset = (page - 1) * limit;
    const db = getDatabase();

    let query = `
      SELECT o.*, p.name as product_name, p.price, p.currency, p.duration_days,
             CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as has_receipt
      FROM orders o 
      JOIN products p ON o.product_id = p.id 
      LEFT JOIN receipts r ON o.id = r.order_id
      WHERE o.user_id = ?
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
    const params = [req.user.id];
    const countParams = [req.user.id];

    if (status) {
      query += ' AND o.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [orders, total] = await Promise.all([
      new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      }),
      new Promise((resolve, reject) => {
        db.get(countQuery, countParams, (err, row) => {
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

// Get single order
router.get('/:id', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const order = await new Promise((resolve, reject) => {
      db.get(`
        SELECT o.*, p.name as product_name, p.price, p.currency, p.duration_days,
               u.username, u.email, u.full_name
        FROM orders o 
        JOIN products p ON o.product_id = p.id 
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ? AND (o.user_id = ? OR u.role = 'admin')
      `, [id, req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    // Get receipt if exists
    const receipt = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM receipts WHERE order_id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({
      order: {
        ...order,
        receipt
      }
    });

  } catch (error) {
    console.error('Sipariş getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Cancel order (only pending orders)
router.put('/:id/cancel', authenticateToken, requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // Check if order exists and belongs to user
    const order = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [id, req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Sadece bekleyen siparişler iptal edilebilir' });
    }

    // Update order status
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE orders SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Restore stock if applicable
    const product = await new Promise((resolve, reject) => {
      db.get('SELECT stock_quantity FROM products WHERE id = ?', [order.product_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (product && product.stock_quantity !== -1) {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
          [order.quantity, order.product_id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    res.json({ message: 'Sipariş iptal edildi' });
  } catch (error) {
    console.error('Sipariş iptal etme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Get order status for public tracking
router.get('/track/:order_number', async (req, res) => {
  try {
    const { order_number } = req.params;
    const db = getDatabase();

    const order = await new Promise((resolve, reject) => {
      db.get(`
        SELECT o.order_number, o.status, o.created_at, o.updated_at,
               p.name as product_name, p.price, p.currency
        FROM orders o 
        JOIN products p ON o.product_id = p.id 
        WHERE o.order_number = ?
      `, [order_number], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Sipariş takip hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
