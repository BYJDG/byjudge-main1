const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../database/init');
const { authenticateToken, requireUser } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/receipts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `receipt-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only image files
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Sadece resim dosyaları (JPEG, PNG, GIF, WebP) yüklenebilir'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: fileFilter
});

// Upload receipt for order
router.post('/receipt', authenticateToken, requireUser, upload.single('receipt'), [
  body('order_id').isInt({ min: 1 }).withMessage('Geçerli sipariş ID gerekli'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notlar en fazla 500 karakter olmalı')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Delete uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        error: 'Geçersiz veri',
        details: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Dekont dosyası gerekli' });
    }

    const { order_id, notes } = req.body;
    const db = getDatabase();

    // Check if order exists and belongs to user
    const order = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [order_id, req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!order) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    // Check if receipt already exists for this order
    const existingReceipt = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM receipts WHERE order_id = ?', [order_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingReceipt) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Bu sipariş için zaten dekont yüklenmiş' });
    }

    // Save receipt info to database
    const receiptId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO receipts (
          order_id, filename, original_name, file_path, file_size, 
          mime_type, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order_id,
          req.file.filename,
          req.file.originalname,
          req.file.path,
          req.file.size,
          req.file.mimetype,
          notes,
          'pending'
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    res.status(201).json({
      message: 'Dekont başarıyla yüklendi',
      receipt: {
        id: receiptId,
        filename: req.file.filename,
        original_name: req.file.originalname,
        file_size: req.file.size,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Dekont yükleme hatası:', error);
    
    // Delete uploaded file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Get receipt file (for viewing)
router.get('/receipt/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const db = getDatabase();

    // Get receipt info
    const receipt = await new Promise((resolve, reject) => {
      db.get(`
        SELECT r.*, o.user_id, u.role 
        FROM receipts r 
        JOIN orders o ON r.order_id = o.id 
        JOIN users u ON o.user_id = u.id 
        WHERE r.filename = ?
      `, [filename], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Dekont bulunamadı' });
    }

    // Check if user has permission to view this receipt
    const isOwner = receipt.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Bu dekontu görme yetkiniz yok' });
    }

    // Check if file exists
    if (!fs.existsSync(receipt.file_path)) {
      return res.status(404).json({ error: 'Dekont dosyası bulunamadı' });
    }

    // Send file
    res.setHeader('Content-Type', receipt.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${receipt.original_name}"`);
    
    const fileStream = fs.createReadStream(receipt.file_path);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Dekont görüntüleme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Delete receipt (admin only or owner)
router.delete('/receipt/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // Get receipt info
    const receipt = await new Promise((resolve, reject) => {
      db.get(`
        SELECT r.*, o.user_id, u.role 
        FROM receipts r 
        JOIN orders o ON r.order_id = o.id 
        JOIN users u ON o.user_id = u.id 
        WHERE r.id = ?
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Dekont bulunamadı' });
    }

    // Check if user has permission to delete this receipt
    const isOwner = receipt.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Bu dekontu silme yetkiniz yok' });
    }

    // Delete file from filesystem
    if (fs.existsSync(receipt.file_path)) {
      fs.unlinkSync(receipt.file_path);
    }

    // Delete record from database
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM receipts WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'Dekont silindi' });

  } catch (error) {
    console.error('Dekont silme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Error handler for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Dosya boyutu çok büyük' });
    }
  }
  
  if (error.message.includes('Sadece resim dosyaları')) {
    return res.status(400).json({ error: error.message });
  }

  console.error('Upload hatası:', error);
  res.status(500).json({ error: 'Dosya yükleme hatası' });
});

module.exports = router;
