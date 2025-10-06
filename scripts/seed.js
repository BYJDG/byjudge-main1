const { getDatabase } = require('../database/init');

const seedDatabase = async () => {
    const db = getDatabase();
    
    try {
        console.log('🌱 Veritabanı seed işlemi başlıyor...');

        // Categories
        const categories = [
            { name: 'PUBG Mobile', slug: 'pubg-mobile', description: 'PUBG Mobile hileleri' },
            { name: 'Valorant', slug: 'valorant', description: 'Valorant hileleri' },
            { name: 'CS2', slug: 'cs2', description: 'Counter-Strike 2 hileleri' },
            { name: 'Zula', slug: 'zula', description: 'Zula hileleri' },
            { name: 'Wolfteam', slug: 'wolfteam', description: 'Wolfteam hileleri' }
        ];

        console.log('📁 Kategoriler ekleniyor...');
        for (const category of categories) {
            await new Promise((resolve, reject) => {
                db.run(
                    'INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)',
                    [category.name, category.slug, category.description],
                    function(err) {
                        if (err) reject(err);
                        else {
                            console.log(`✅ Kategori: ${category.name}`);
                            resolve(this.lastID);
                        }
                    }
                );
            });
        }

        // Get category IDs
        const categoryMap = {};
        for (const category of categories) {
            const cat = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM categories WHERE slug = ?', [category.slug], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            categoryMap[category.slug] = cat.id;
        }

        // Products
        const products = [
            // PUBG Mobile
            {
                name: 'PUBG Mobile Dragon Cheats (Haftalık)',
                slug: 'pubg-mobile-dragon-weekly',
                description: 'PUBG Mobile Dragon hilesi - 7 günlük erişim',
                price: 350,
                currency: 'TRY',
                category_id: categoryMap['pubg-mobile'],
                duration_days: 7,
                image_url: '/pubg/pubg7.png',
                features: 'Aimbot, Wallhack, ESP, No Recoil, Speed Hack',
                is_featured: true
            },
            {
                name: 'PUBG Mobile Dragon Cheats (Aylık)',
                slug: 'pubg-mobile-dragon-monthly',
                description: 'PUBG Mobile Dragon hilesi - 30 günlük erişim',
                price: 700,
                currency: 'TRY',
                category_id: categoryMap['pubg-mobile'],
                duration_days: 30,
                image_url: '/pubg/pubg30.png',
                features: 'Aimbot, Wallhack, ESP, No Recoil, Speed Hack',
                is_featured: true
            },
            {
                name: 'PUBG Mobile Bypass (Haftalık)',
                slug: 'pubg-mobile-bypass-weekly',
                description: 'PUBG Mobile Bypass hilesi - 7 günlük erişim',
                price: 600,
                currency: 'TRY',
                category_id: categoryMap['pubg-mobile'],
                duration_days: 7,
                image_url: '/pubg/pubg7.png',
                features: 'Emülatör bypass, Mobil görünüm, Tüm özellikler',
                is_featured: false
            },
            {
                name: 'PUBG Mobile Bypass (Aylık)',
                slug: 'pubg-mobile-bypass-monthly',
                description: 'PUBG Mobile Bypass hilesi - 30 günlük erişim',
                price: 1200,
                currency: 'TRY',
                category_id: categoryMap['pubg-mobile'],
                duration_days: 30,
                image_url: '/pubg/pubg30.png',
                features: 'Emülatör bypass, Mobil görünüm, Tüm özellikler',
                is_featured: false
            },

            // Valorant
            {
                name: 'Valorant External (1 Gün)',
                slug: 'valorant-external-1day',
                description: 'Valorant External hilesi - 1 günlük erişim',
                price: 280,
                currency: 'TRY',
                category_id: categoryMap['valorant'],
                duration_days: 1,
                image_url: '/valorant/1day.png',
                features: 'Aimbot, ESP, Triggerbot, Radar Hack',
                is_featured: false
            },
            {
                name: 'Valorant External (3 Gün)',
                slug: 'valorant-external-3day',
                description: 'Valorant External hilesi - 3 günlük erişim',
                price: 600,
                currency: 'TRY',
                category_id: categoryMap['valorant'],
                duration_days: 3,
                image_url: '/valorant/3day.png',
                features: 'Aimbot, ESP, Triggerbot, Radar Hack',
                is_featured: false
            },
            {
                name: 'Valorant External (Haftalık)',
                slug: 'valorant-external-weekly',
                description: 'Valorant External hilesi - 7 günlük erişim',
                price: 1000,
                currency: 'TRY',
                category_id: categoryMap['valorant'],
                duration_days: 7,
                image_url: '/valorant/weekly.png',
                features: 'Aimbot, ESP, Triggerbot, Radar Hack',
                is_featured: false
            },
            {
                name: 'Valorant External (Aylık)',
                slug: 'valorant-external-monthly',
                description: 'Valorant External hilesi - 30 günlük erişim',
                price: 2000,
                currency: 'TRY',
                category_id: categoryMap['valorant'],
                duration_days: 30,
                image_url: '/valorant/monthly.png',
                features: 'Aimbot, ESP, Triggerbot, Radar Hack',
                is_featured: false
            },
            {
                name: 'Valorant External (Sınırsız)',
                slug: 'valorant-external-lifetime',
                description: 'Valorant External hilesi - Sınırsız erişim',
                price: 4600,
                currency: 'TRY',
                category_id: categoryMap['valorant'],
                duration_days: -1,
                image_url: '/valorant/lifetime.png',
                features: 'Aimbot, ESP, Triggerbot, Radar Hack',
                is_featured: true
            },
            {
                name: 'Valorant TheAlpha (3 Gün)',
                slug: 'valorant-thealpha-3day',
                description: 'Valorant TheAlpha hilesi - 3 günlük erişim',
                price: 600,
                currency: 'TRY',
                category_id: categoryMap['valorant'],
                duration_days: 3,
                image_url: '/valorant/3day.png',
                features: 'Gelişmiş Aimbot, ESP, Triggerbot, Radar Hack',
                is_featured: true
            },
            {
                name: 'Valorant TheAlpha (Haftalık)',
                slug: 'valorant-thealpha-weekly',
                description: 'Valorant TheAlpha hilesi - 7 günlük erişim',
                price: 1000,
                currency: 'TRY',
                category_id: categoryMap['valorant'],
                duration_days: 7,
                image_url: '/valorant/weekly.png',
                features: 'Gelişmiş Aimbot, ESP, Triggerbot, Radar Hack',
                is_featured: true
            },
            {
                name: 'Valorant TheAlpha (Aylık)',
                slug: 'valorant-thealpha-monthly',
                description: 'Valorant TheAlpha hilesi - 30 günlük erişim',
                price: 2000,
                currency: 'TRY',
                category_id: categoryMap['valorant'],
                duration_days: 30,
                image_url: '/valorant/monthly.png',
                features: 'Gelişmiş Aimbot, ESP, Triggerbot, Radar Hack',
                is_featured: true
            },

            // CS2
            {
                name: 'CS2 Premium (Haftalık)',
                slug: 'cs2-premium-weekly',
                description: 'CS2 Premium hilesi - 7 günlük erişim',
                price: 410,
                currency: 'TRY',
                category_id: categoryMap['cs2'],
                duration_days: 7,
                image_url: '/cs/csweekly.png',
                features: 'Aimbot, ESP, Triggerbot, Bunny Hop',
                is_featured: false
            },
            {
                name: 'CS2 Premium (Aylık)',
                slug: 'cs2-premium-monthly',
                description: 'CS2 Premium hilesi - 30 günlük erişim',
                price: 820,
                currency: 'TRY',
                category_id: categoryMap['cs2'],
                duration_days: 30,
                image_url: '/cs/csmonthly.png',
                features: 'Aimbot, ESP, Triggerbot, Bunny Hop',
                is_featured: false
            },

            // Zula
            {
                name: 'Zula Private (Aylık)',
                slug: 'zula-private-monthly',
                description: 'Zula Private hilesi - 30 günlük erişim, Özel slot sistemi',
                price: 1000,
                currency: 'TRY',
                category_id: categoryMap['zula'],
                duration_days: 30,
                image_url: '/zula/30zula.png',
                features: 'Özel slot sistemi (15 kişi), Maksimum güvenlik, Premium deneyim',
                is_featured: true
            },
            {
                name: 'Zula Legendware (Günlük)',
                slug: 'zula-legendware-daily',
                description: 'Zula Legendware hilesi - 1 günlük erişim',
                price: 160,
                currency: 'TRY',
                category_id: categoryMap['zula'],
                duration_days: 1,
                image_url: '/zula/1zula.png',
                features: 'Aimbot, ESP, Wallhack, Speed Hack',
                is_featured: false
            },
            {
                name: 'Zula Legendware (Haftalık)',
                slug: 'zula-legendware-weekly',
                description: 'Zula Legendware hilesi - 7 günlük erişim',
                price: 340,
                currency: 'TRY',
                category_id: categoryMap['zula'],
                duration_days: 7,
                image_url: '/zula/7zula.png',
                features: 'Aimbot, ESP, Wallhack, Speed Hack',
                is_featured: false
            },
            {
                name: 'Zula Legendware (2 Hafta)',
                slug: 'zula-legendware-2week',
                description: 'Zula Legendware hilesi - 14 günlük erişim',
                price: 540,
                currency: 'TRY',
                category_id: categoryMap['zula'],
                duration_days: 14,
                image_url: '/zula/14zula.png',
                features: 'Aimbot, ESP, Wallhack, Speed Hack',
                is_featured: false
            },
            {
                name: 'Zula Legendware (Aylık)',
                slug: 'zula-legendware-monthly',
                description: 'Zula Legendware hilesi - 30 günlük erişim',
                price: 740,
                currency: 'TRY',
                category_id: categoryMap['zula'],
                duration_days: 30,
                image_url: '/zula/30zula.png',
                features: 'Aimbot, ESP, Wallhack, Speed Hack',
                is_featured: false
            },
            {
                name: 'Zula Titanware (Haftalık)',
                slug: 'zula-titanware-weekly',
                description: 'Zula Titanware hilesi - 7 günlük erişim',
                price: 400,
                currency: 'TRY',
                category_id: categoryMap['zula'],
                duration_days: 7,
                image_url: '/zula/7zula.png',
                features: 'Gelişmiş Aimbot, ESP, Wallhack, Speed Hack',
                is_featured: false
            },
            {
                name: 'Zula Titanware (Aylık)',
                slug: 'zula-titanware-monthly',
                description: 'Zula Titanware hilesi - 30 günlük erişim',
                price: 640,
                currency: 'TRY',
                category_id: categoryMap['zula'],
                duration_days: 30,
                image_url: '/zula/30zula.png',
                features: 'Gelişmiş Aimbot, ESP, Wallhack, Speed Hack',
                is_featured: false
            },

            // Wolfteam
            {
                name: 'Wolfteam Premium (Aylık)',
                slug: 'wolfteam-premium-monthly',
                description: 'Wolfteam Premium hilesi - 30 günlük erişim',
                price: 250,
                currency: 'TRY',
                category_id: categoryMap['wolfteam'],
                duration_days: 30,
                image_url: '/wolftü/wolftü.png',
                features: 'Aimbot, ESP, Wallhack, Speed Hack',
                is_featured: false
            }
        ];

        console.log('📦 Ürünler ekleniyor...');
        for (const product of products) {
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT OR IGNORE INTO products (
                        name, slug, description, price, currency, category_id, 
                        duration_days, image_url, features, is_featured
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        product.name, product.slug, product.description, product.price,
                        product.currency, product.category_id, product.duration_days,
                        product.image_url, product.features, product.is_featured
                    ],
                    function(err) {
                        if (err) reject(err);
                        else {
                            console.log(`✅ Ürün: ${product.name}`);
                            resolve(this.lastID);
                        }
                    }
                );
            });
        }

        console.log('🎉 Veritabanı seed işlemi tamamlandı!');
        console.log(`📊 ${categories.length} kategori eklendi`);
        console.log(`📊 ${products.length} ürün eklendi`);

    } catch (error) {
        console.error('❌ Seed işlemi hatası:', error);
        throw error;
    }
};

// Run seed if called directly
if (require.main === module) {
    const { initializeDatabase } = require('../database/init');
    
    initializeDatabase()
        .then(() => seedDatabase())
        .then(() => {
            console.log('✅ Tüm işlemler tamamlandı');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Hata:', error);
            process.exit(1);
        });
}

module.exports = { seedDatabase };
