# 🚀 ByJudge Store - Deployment Rehberi

Bu rehber, ByJudge Store sistemini çevrimiçi olarak deploy etmek için hazırlanmıştır.

## 🌐 **Hosting Seçenekleri**

### **1. Vercel (Önerilen - Ücretsiz)**

#### **Avantajları:**
- ✅ Node.js tam desteği
- ✅ Ücretsiz tier
- ✅ Otomatik GitHub deployment
- ✅ Hızlı ve güvenilir
- ✅ SSL sertifikası dahil

#### **Kurulum Adımları:**

1. **Vercel'e Gidin:**
   - https://vercel.com adresine gidin
   - "Sign up" butonuna tıklayın
   - GitHub hesabınızla giriş yapın

2. **Proje Import Edin:**
   - Dashboard'da "Add New..." → "Project" seçin
   - GitHub repository'nizi seçin
   - "Import" butonuna tıklayın

3. **Environment Variables Ekleyin:**
   - Project Settings → Environment Variables
   - Şu değişkenleri ekleyin:
   ```
   JWT_SECRET=ByJudge_Store_2025_Super_Secure_JWT_Secret_Key_MehtiKorhan_Admin_System
   ADMIN_EMAIL=mehtikorhan16@gmail.com
   ADMIN_USERNAME=mehtikorhan
   ADMIN_PASSWORD=0537447mM
   NODE_ENV=production
   ```

4. **Deploy Edin:**
   - "Deploy" butonuna tıklayın
   - 2-3 dakika bekleyin
   - Site hazır!

#### **Vercel URL Formatı:**
- **Site URL:** `https://your-project-name.vercel.app`
- **Admin Panel:** `https://your-project-name.vercel.app/admin`

---

### **2. Railway (Ücretsiz)**

#### **Kurulum Adımları:**

1. **Railway'e Gidin:**
   - https://railway.app adresine gidin
   - GitHub ile giriş yapın

2. **Proje Oluşturun:**
   - "Deploy from GitHub repo" seçin
   - Repository'nizi seçin
   - "Deploy Now" butonuna tıklayın

3. **Environment Variables:**
   - Project → Variables sekmesi
   - Aynı değişkenleri ekleyin

---

### **3. Render (Ücretsiz)**

#### **Kurulum Adımları:**

1. **Render'e Gidin:**
   - https://render.com adresine gidin
   - GitHub ile giriş yapın

2. **Web Service Oluşturun:**
   - "New" → "Web Service" seçin
   - GitHub repository'nizi bağlayın
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Environment Variables:**
   - Environment sekmesinde değişkenleri ekleyin

---

## 🔧 **Deployment Sonrası**

### **1. Site Erişimi:**
- **Ana Site:** `https://your-domain.com/`
- **Admin Panel:** `https://your-domain.com/admin`
- **Giriş:** `https://your-domain.com/login`

### **2. Admin Girişi:**
```
Email: mehtikorhan16@gmail.com
Şifre: 0537447mM
```

### **3. İlk Kurulum:**
- Site ilk açıldığında otomatik olarak:
  - ✅ Veritabanı oluşturulur
  - ✅ Admin kullanıcısı eklenir
  - ✅ Örnek ürünler yüklenir

---

## 📊 **Özellikler**

### **Kullanıcı Özellikleri:**
- ✅ Kullanıcı kayıt/giriş
- ✅ Profil yönetimi
- ✅ Sipariş verme
- ✅ Dekont yükleme
- ✅ Sipariş takibi

### **Admin Özellikleri:**
- ✅ Dashboard ve istatistikler
- ✅ Kullanıcı yönetimi
- ✅ Ürün ekleme/düzenleme
- ✅ Sipariş yönetimi
- ✅ Dekont kontrolü

### **Güvenlik:**
- ✅ JWT tabanlı kimlik doğrulama
- ✅ Rate limiting
- ✅ Input validation
- ✅ SQL injection koruması
- ✅ XSS koruması

---

## 🔄 **Güncelleme**

### **Otomatik Güncelleme:**
- GitHub'a push yaptığınızda otomatik deploy olur
- Manuel güncelleme gerekmez

### **Manuel Güncelleme:**
1. Kod değişikliklerini GitHub'a push edin
2. Hosting platformunda "Redeploy" butonuna tıklayın

---

## 🆘 **Sorun Giderme**

### **Deploy Hatası:**
- Environment variables'ları kontrol edin
- Build logs'ları inceleyin
- package.json'daki script'leri kontrol edin

### **Veritabanı Hatası:**
- İlk deploy'da seed script otomatik çalışır
- Manuel olarak tekrar çalıştırmak için hosting platformunun console'unu kullanın

### **Admin Giriş Hatası:**
- Environment variables'ları kontrol edin
- Admin bilgilerinin doğru olduğundan emin olun

---

## 📞 **Destek**

Herhangi bir sorun yaşarsanız:
- **Email:** mehtikorhan16@gmail.com
- **Telegram:** @byjudgee

---

**🎉 Başarılı deployment sonrası tam özellikli e-ticaret siteniz hazır!**
