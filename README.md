# ByJudge Store - Oyun Hilesi Satış Sistemi

Bu proje, ByJudge Store için tam otomatik bir oyun hilesi satış sistemi içerir. Kullanıcı girişi, admin paneli, sipariş yönetimi ve dekont kontrolü özelliklerine sahiptir.

## 🚀 Özellikler

### Kullanıcı Özellikleri
- ✅ Kullanıcı kayıt/giriş sistemi
- ✅ Profil yönetimi
- ✅ Sipariş verme
- ✅ Sipariş takibi
- ✅ Dekont yükleme
- ✅ Sipariş iptal etme

### Admin Özellikleri
- ✅ Admin paneli
- ✅ Kullanıcı yönetimi
- ✅ Ürün ekleme/düzenleme
- ✅ Sipariş yönetimi
- ✅ Dekont kontrolü
- ✅ Dashboard ve istatistikler

### Teknik Özellikler
- ✅ JWT tabanlı kimlik doğrulama
- ✅ SQLite veritabanı
- ✅ Dosya yükleme sistemi
- ✅ Responsive tasarım
- ✅ Güvenlik önlemleri
- ✅ Rate limiting

## 🛠️ Kurulum

### Gereksinimler
- Node.js (v14 veya üzeri)
- npm veya yarn

### Adımlar

1. **Projeyi klonlayın:**
```bash
git clone <repository-url>
cd byjudge-store
```

2. **Bağımlılıkları yükleyin:**
```bash
npm install
```

3. **Veritabanını başlatın:**
```bash
npm run seed
```

4. **Sunucuyu başlatın:**
```bash
# Geliştirme modu
npm run dev

# Üretim modu
npm start
```

5. **Siteyi açın:**
- Ana Site: http://localhost:3000/
- Ürünler: http://localhost:3000/urunler
- Giriş: http://localhost:3000/login
- Kayıt: http://localhost:3000/register
- Admin Panel: http://localhost:3000/admin
- Siparişlerim: http://localhost:3000/orders
- Profil: http://localhost:3000/profile
- API: http://localhost:3000/api

## 🔑 Varsayılan Admin Bilgileri

```
Kullanıcı Adı: mehtikorhan
Email: mehtikorhan16@gmail.com
Şifre: 0537447mM
```

**⚠️ Önemli:** Bu bilgiler sizin admin hesabınızdır. Güvenliğini sağlayın!

## 📁 Proje Yapısı

```
byjudge-store/
├── byjudge-main/          # Frontend dosyaları
│   ├── index.html         # Ana sayfa
│   ├── urunler.html       # Ürünler sayfası
│   ├── auth.html          # Giriş/Kayıt sayfası
│   ├── orders.html        # Sipariş takip sayfası
│   ├── profile.html       # Kullanıcı profil sayfası
│   ├── styles.css         # CSS dosyaları
│   └── main.js            # JavaScript dosyaları
├── database/              # Veritabanı dosyaları
│   └── init.js            # Veritabanı başlatma
├── middleware/            # Middleware dosyaları
│   └── auth.js            # Kimlik doğrulama
├── routes/                # API route'ları
│   ├── auth.js            # Kimlik doğrulama route'ları
│   ├── admin.js           # Admin route'ları
│   ├── products.js        # Ürün route'ları
│   ├── orders.js          # Sipariş route'ları
│   └── upload.js          # Dosya yükleme route'ları
├── scripts/               # Yardımcı script'ler
│   └── seed.js            # Veritabanı seed script'i
├── uploads/               # Yüklenen dosyalar
├── server.js              # Ana sunucu dosyası
├── package.json           # Proje bağımlılıkları
└── config.env             # Konfigürasyon dosyası
```

## 🔧 Konfigürasyon

`config.env` dosyasında aşağıdaki ayarları yapabilirsiniz:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret (Değiştirin!)
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production

# Database
DB_PATH=./database/store.db

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Admin Configuration
ADMIN_EMAIL=admin@byjudge.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

## 📱 API Endpoints

### Kimlik Doğrulama
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `GET /api/auth/profile` - Profil bilgileri
- `PUT /api/auth/profile` - Profil güncelleme
- `PUT /api/auth/change-password` - Şifre değiştirme

### Ürünler
- `GET /api/products` - Tüm ürünler
- `GET /api/products/:id` - Tek ürün
- `GET /api/products/categories` - Kategoriler

### Siparişler
- `POST /api/orders` - Sipariş oluşturma
- `GET /api/orders/my-orders` - Kullanıcı siparişleri
- `GET /api/orders/:id` - Tek sipariş
- `PUT /api/orders/:id/cancel` - Sipariş iptal

### Dosya Yükleme
- `POST /api/upload/receipt` - Dekont yükleme
- `GET /api/upload/receipt/:filename` - Dekont görüntüleme

### Admin (Admin yetkisi gerekli)
- `GET /api/admin/dashboard` - Dashboard verileri
- `GET /api/admin/users` - Kullanıcı listesi
- `GET /api/admin/orders` - Sipariş listesi
- `GET /api/admin/receipts` - Dekont listesi
- `PUT /api/admin/receipts/:id/verify` - Dekont doğrulama

## 🔒 Güvenlik

- JWT token tabanlı kimlik doğrulama
- Bcrypt ile şifre hashleme
- Rate limiting
- Helmet.js güvenlik middleware'i
- CORS konfigürasyonu
- Dosya türü kontrolü
- Dosya boyutu sınırlaması

## 📊 Veritabanı Şeması

### Tablolar
- `users` - Kullanıcı bilgileri
- `categories` - Ürün kategorileri
- `products` - Ürün bilgileri
- `orders` - Sipariş bilgileri
- `receipts` - Dekont dosyaları
- `user_sessions` - Kullanıcı oturumları
- `settings` - Sistem ayarları

## 🚀 Deployment

### Vercel (Önerilen)
1. Projeyi GitHub'a yükleyin
2. Vercel'e bağlayın
3. Environment variables ekleyin
4. Deploy edin

### Diğer Platformlar
- Heroku
- Railway
- DigitalOcean App Platform

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Commit yapın (`git commit -m 'Add some AmazingFeature'`)
4. Push yapın (`git push origin feature/AmazingFeature`)
5. Pull Request açın

## 📞 Destek

Herhangi bir sorun yaşarsanız:
- GitHub Issues kullanın
- Email: admin@byjudge.com
- Telegram: @byjudgee

## 🎯 Gelecek Özellikler

- [ ] Email bildirimleri
- [ ] SMS doğrulama
- [ ] Çoklu dil desteği
- [ ] Mobil uygulama
- [ ] Ödeme entegrasyonu
- [ ] İstatistik raporları
- [ ] Otomatik dekont doğrulama

---

**Not:** Bu sistem sadece eğitim amaçlıdır. Gerçek ürün satışında kullanmadan önce güvenlik açıklarını kontrol edin ve gerekli güncellemeleri yapın.
