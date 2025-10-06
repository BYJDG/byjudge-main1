const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = process.env.DB_PATH || './database/store.db';

let db;

const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Veritabanı bağlantı hatası:', err);
        reject(err);
        return;
      }
      
      console.log('✅ SQLite veritabanına bağlandı');
      createTables()
        .then(() => createDefaultAdmin())
        .then(() => {
          console.log('✅ Veritabanı başarıyla başlatıldı');
          resolve();
        })
        .catch(reject);
    });
  });
};

const createTables = () => {
  return new Promise((resolve, reject) => {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        phone VARCHAR(20),
        telegram_username VARCHAR(50),
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Categories table
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Products table
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) UNIQUE NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'TRY',
        duration_days INTEGER,
        image_url VARCHAR(255),
        features TEXT,
        is_featured BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        stock_quantity INTEGER DEFAULT -1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )`,

      // Orders table
      `CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        quantity INTEGER DEFAULT 1,
        total_amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'TRY',
        status VARCHAR(20) DEFAULT 'pending',
        payment_method VARCHAR(50),
        payment_reference VARCHAR(100),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )`,

      // Receipts table
      `CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        verified_by INTEGER,
        verified_at DATETIME,
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        FOREIGN KEY (order_id) REFERENCES orders (id),
        FOREIGN KEY (verified_by) REFERENCES users (id)
      )`,

      // User sessions table
      `CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token VARCHAR(500) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // System settings table
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Admin logs table
      `CREATE TABLE IF NOT EXISTS admin_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER NOT NULL,
        admin_username VARCHAR(50) NOT NULL,
        action VARCHAR(500) NOT NULL,
        ip VARCHAR(45),
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users (id)
      )`
    ];

    let completed = 0;
    const total = tables.length;

    tables.forEach((sql, index) => {
      db.run(sql, (err) => {
        if (err) {
          console.error(`Tablo oluşturma hatası ${index + 1}:`, err);
          reject(err);
          return;
        }
        completed++;
        if (completed === total) {
          console.log('✅ Tüm tablolar oluşturuldu');
          resolve();
        }
      });
    });
  });
};

const createDefaultAdmin = async () => {
  return new Promise((resolve, reject) => {
    // Check if admin exists
    db.get('SELECT id FROM users WHERE role = ?', ['admin'], async (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (!row) {
        // Create default admin
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
        
        db.run(
          `INSERT INTO users (username, email, password, full_name, role) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            process.env.ADMIN_USERNAME || 'admin',
            process.env.ADMIN_EMAIL || 'admin@byjudge.com',
            hashedPassword,
            'Admin User',
            'admin'
          ],
          function(err) {
            if (err) {
              console.error('Admin kullanıcı oluşturma hatası:', err);
              reject(err);
              return;
            }
            console.log('✅ Varsayılan admin kullanıcı oluşturuldu');
            console.log(`👤 Kullanıcı adı: ${process.env.ADMIN_USERNAME || 'admin'}`);
            console.log(`🔑 Şifre: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
            resolve();
          }
        );
      } else {
        console.log('✅ Admin kullanıcı zaten mevcut');
        resolve();
      }
    });
  });
};

const getDatabase = () => {
  if (!db) {
    throw new Error('Veritabanı başlatılmamış');
  }
  return db;
};

module.exports = {
  initializeDatabase,
  getDatabase
};
