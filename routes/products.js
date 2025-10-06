const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const db = getDatabase();
    const categories = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM categories WHERE is_active = 1 ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ categories });
  } catch (error) {
    console.error('Kategorileri getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Get all products (public)
router.get('/', async (req, res) => {
  try {
    const { category_id, featured } = req.query;
    const db = getDatabase();

    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = 1
    `;
    const params = [];

    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (featured === 'true') {
      query += ' AND p.is_featured = 1';
    }

    query += ' ORDER BY p.is_featured DESC, p.created_at DESC';

    const products = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({ products });
  } catch (error) {
    console.error('Ürünleri getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const product = await new Promise((resolve, reject) => {
      db.get(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.id = ? AND p.is_active = 1
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Ürün getirme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Admin routes - require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Create category
router.post('/categories', [
  body('name').notEmpty().withMessage('Kategori adı gerekli'),
  body('slug').notEmpty().withMessage('Kategori slug gerekli'),
  body('description').optional().isLength({ max: 500 }).withMessage('Açıklama en fazla 500 karakter olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Geçersiz veri',
        details: errors.array()
      });
    }

    const { name, slug, description } = req.body;
    const db = getDatabase();

    // Check if category already exists
    const existingCategory = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM categories WHERE slug = ?', [slug], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Bu slug zaten kullanılıyor' });
    }

    const categoryId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
        [name, slug, description],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    res.status(201).json({
      message: 'Kategori oluşturuldu',
      category: { id: categoryId, name, slug, description }
    });

  } catch (error) {
    console.error('Kategori oluşturma hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Update category
router.put('/categories/:id', [
  body('name').optional().notEmpty().withMessage('Kategori adı boş olamaz'),
  body('slug').optional().notEmpty().withMessage('Kategori slug boş olamaz'),
  body('description').optional().isLength({ max: 500 }).withMessage('Açıklama en fazla 500 karakter olmalı'),
  body('is_active').optional().isBoolean().withMessage('is_active boolean değer olmalı')
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
    const { name, slug, description, is_active } = req.body;
    const db = getDatabase();

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (slug !== undefined) {
      updates.push('slug = ?');
      params.push(slug);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Güncellenecek veri yok' });
    }

    params.push(id);

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
        params,
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) {
            reject(new Error('Kategori bulunamadı'));
          } else {
            resolve();
          }
        }
      );
    });

    res.json({ message: 'Kategori güncellendi' });
  } catch (error) {
    console.error('Kategori güncelleme hatası:', error);
    res.status(500).json({ error: error.message || 'Sunucu hatası' });
  }
});

// Create product
router.post('/', [
  body('name').notEmpty().withMessage('Ürün adı gerekli'),
  body('slug').notEmpty().withMessage('Ürün slug gerekli'),
  body('price').isFloat({ min: 0 }).withMessage('Fiyat 0 veya daha büyük olmalı'),
  body('category_id').optional().isInt().withMessage('Kategori ID integer olmalı'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Açıklama en fazla 1000 karakter olmalı'),
  body('duration_days').optional().isInt({ min: 1 }).withMessage('Süre pozitif integer olmalı'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Para birimi 3 karakter olmalı'),
  body('image_url').optional().isURL().withMessage('Geçerli bir URL girin'),
  body('features').optional().isLength({ max: 2000 }).withMessage('Özellikler en fazla 2000 karakter olmalı'),
  body('is_featured').optional().isBoolean().withMessage('is_featured boolean değer olmalı'),
  body('stock_quantity').optional().isInt({ min: -1 }).withMessage('Stok miktarı -1 veya daha büyük olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Geçersiz veri',
        details: errors.array()
      });
    }

    const {
      name, slug, description, price, category_id, duration_days,
      currency = 'TRY', image_url, features, is_featured = false,
      stock_quantity = -1
    } = req.body;

    const db = getDatabase();

    // Check if product already exists
    const existingProduct = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM products WHERE slug = ?', [slug], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingProduct) {
      return res.status(400).json({ error: 'Bu slug zaten kullanılıyor' });
    }

    // Check if category exists
    if (category_id) {
      const category = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM categories WHERE id = ?', [category_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!category) {
        return res.status(400).json({ error: 'Kategori bulunamadı' });
      }
    }

    const productId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO products (
          name, slug, description, price, category_id, duration_days,
          currency, image_url, features, is_featured, stock_quantity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name, slug, description, price, category_id, duration_days,
          currency, image_url, features, is_featured, stock_quantity
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    res.status(201).json({
      message: 'Ürün oluşturuldu',
      product: {
        id: productId,
        name,
        slug,
        description,
        price,
        category_id,
        duration_days,
        currency,
        image_url,
        features,
        is_featured,
        stock_quantity
      }
    });

  } catch (error) {
    console.error('Ürün oluşturma hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Update product
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('Ürün adı boş olamaz'),
  body('slug').optional().notEmpty().withMessage('Ürün slug boş olamaz'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Fiyat 0 veya daha büyük olmalı'),
  body('category_id').optional().isInt().withMessage('Kategori ID integer olmalı'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Açıklama en fazla 1000 karakter olmalı'),
  body('duration_days').optional().isInt({ min: 1 }).withMessage('Süre pozitif integer olmalı'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Para birimi 3 karakter olmalı'),
  body('image_url').optional().isURL().withMessage('Geçerli bir URL girin'),
  body('features').optional().isLength({ max: 2000 }).withMessage('Özellikler en fazla 2000 karakter olmalı'),
  body('is_featured').optional().isBoolean().withMessage('is_featured boolean değer olmalı'),
  body('is_active').optional().isBoolean().withMessage('is_active boolean değer olmalı'),
  body('stock_quantity').optional().isInt({ min: -1 }).withMessage('Stok miktarı -1 veya daha büyük olmalı')
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
    const {
      name, slug, description, price, category_id, duration_days,
      currency, image_url, features, is_featured, is_active,
      stock_quantity
    } = req.body;

    const db = getDatabase();

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (slug !== undefined) {
      updates.push('slug = ?');
      params.push(slug);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(price);
    }
    if (category_id !== undefined) {
      updates.push('category_id = ?');
      params.push(category_id);
    }
    if (duration_days !== undefined) {
      updates.push('duration_days = ?');
      params.push(duration_days);
    }
    if (currency !== undefined) {
      updates.push('currency = ?');
      params.push(currency);
    }
    if (image_url !== undefined) {
      updates.push('image_url = ?');
      params.push(image_url);
    }
    if (features !== undefined) {
      updates.push('features = ?');
      params.push(features);
    }
    if (is_featured !== undefined) {
      updates.push('is_featured = ?');
      params.push(is_featured);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }
    if (stock_quantity !== undefined) {
      updates.push('stock_quantity = ?');
      params.push(stock_quantity);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Güncellenecek veri yok' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
        params,
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) {
            reject(new Error('Ürün bulunamadı'));
          } else {
            resolve();
          }
        }
      );
    });

    res.json({ message: 'Ürün güncellendi' });
  } catch (error) {
    console.error('Ürün güncelleme hatası:', error);
    res.status(500).json({ error: error.message || 'Sunucu hatası' });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else if (this.changes === 0) {
          reject(new Error('Ürün bulunamadı'));
        } else {
          resolve();
        }
      });
    });

    res.json({ message: 'Ürün silindi' });
  } catch (error) {
    console.error('Ürün silme hatası:', error);
    res.status(500).json({ error: error.message || 'Sunucu hatası' });
  }
});

module.exports = router;
