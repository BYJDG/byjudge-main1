# 🔒 Güvenlik Rehberi - ByJudge Store

Bu doküman, ByJudge Store sisteminin güvenlik önlemlerini ve en iyi uygulamalarını içerir.

## 🛡️ Mevcut Güvenlik Önlemleri

### 1. **Kimlik Doğrulama ve Yetkilendirme**
- ✅ JWT token tabanlı kimlik doğrulama
- ✅ Bcrypt ile şifre hashleme
- ✅ Role tabanlı yetkilendirme (user/admin)
- ✅ Token süre sınırı (7 gün)
- ✅ Otomatik token doğrulama

### 2. **Rate Limiting (Hız Sınırlama)**
- ✅ Genel API: 100 istek/15 dakika
- ✅ Auth API: 5 başarısız giriş/15 dakika
- ✅ Admin API: 10 istek/15 dakika
- ✅ Upload API: 3 dosya/1 dakika

### 3. **Input Validation ve Sanitization**
- ✅ SQL injection koruması
- ✅ XSS koruması
- ✅ Request boyut kontrolü
- ✅ Content-Type kontrolü
- ✅ Şüpheli karakter filtreleme

### 4. **Dosya Güvenliği**
- ✅ Sadece resim dosyaları kabul edilir
- ✅ Dosya boyutu sınırı (5MB)
- ✅ Dosya türü kontrolü
- ✅ Güvenli dosya adlandırma

### 5. **Güvenlik Monitoring**
- ✅ Admin aktivite logları
- ✅ Şüpheli aktivite tespiti
- ✅ Bot koruması
- ✅ IP tabanlı güvenlik
- ✅ Otomatik güvenlik raporları

## 🚨 Güvenlik Riskleri ve Çözümleri

### **Risk 1: Brute Force Saldırıları**
**Çözüm:**
- Rate limiting aktif
- Başarısız giriş denemeleri loglanıyor
- IP bazlı engelleme

### **Risk 2: SQL Injection**
**Çözüm:**
- Prepared statements kullanılıyor
- Input sanitization aktif
- Şüpheli SQL komutları tespit ediliyor

### **Risk 3: XSS Saldırıları**
**Çözüm:**
- Helmet.js ile HTTP header koruması
- Input validation
- Content Security Policy

### **Risk 4: Admin Panel Erişimi**
**Çözüm:**
- Role tabanlı yetkilendirme
- IP whitelist (production için)
- Admin aktivite logları
- Şüpheli admin aktiviteleri tespiti

### **Risk 5: Dosya Upload Güvenliği**
**Çözüm:**
- Sadece resim dosyaları kabul edilir
- Dosya boyutu sınırı
- Güvenli dosya adlandırma
- Virus tarama (önerilen)

## 🔧 Üretim Güvenlik Ayarları

### 1. **Environment Variables**
```env
# Güvenli JWT Secret (değiştirin!)
JWT_SECRET=your_very_long_and_secure_secret_key_here

# Admin IP Whitelist (isteğe bağlı)
ADMIN_IP_WHITELIST=192.168.1.100,203.0.113.0

# Production modu
NODE_ENV=production
```

### 2. **HTTPS Kullanımı**
```javascript
// Production için HTTPS zorunlu
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```

### 3. **Database Güvenliği**
- Veritabanı dosyası sadece uygulama erişebilir
- Düzenli backup alın
- Şifreli bağlantı kullanın (SQLite için encryption)

### 4. **Server Güvenliği**
- Firewall ayarları
- Düzenli güvenlik güncellemeleri
- Server logları izleme
- DDoS koruması

## 📊 Güvenlik Monitoring

### **Log Dosyaları**
- `logs/security-alerts.json` - Güvenlik uyarıları
- `logs/critical-alerts.json` - Kritik güvenlik olayları
- `logs/security-reports/` - Güvenlik raporları

### **İzlenen Aktivite**
- Admin panel erişimleri
- Başarısız giriş denemeleri
- Şüpheli IP'ler
- Yüksek hacimli istekler
- Dosya yükleme aktiviteleri

### **Alert Seviyeleri**
- 🟡 **MEDIUM**: Yüksek hacimli admin işlemleri
- 🟠 **HIGH**: Çok fazla başarısız giriş
- 🔴 **CRITICAL**: Şüpheli admin aktiviteleri

## 🔐 Admin Güvenliği

### **Admin Hesap Güvenliği**
- Güçlü şifre kullanın (min 12 karakter)
- Düzenli şifre değişimi
- 2FA kullanımı (önerilen)
- Admin aktivitelerini izleyin

### **Admin Panel Erişimi**
- Sadece güvenilir IP'lerden erişim
- VPN kullanımı (önerilen)
- Düzenli log kontrolü
- Şüpheli aktiviteleri hemen bildirin

## 🚀 Güvenlik Checklist

### **Kurulum Öncesi**
- [ ] Güçlü JWT secret oluşturun
- [ ] Admin şifresini değiştirin
- [ ] IP whitelist ayarlayın
- [ ] HTTPS sertifikası hazırlayın

### **Kurulum Sonrası**
- [ ] Güvenlik loglarını kontrol edin
- [ ] Rate limiting ayarlarını test edin
- [ ] Admin panel erişimini test edin
- [ ] Dosya upload güvenliğini test edin

### **Düzenli Kontroller**
- [ ] Güvenlik loglarını inceleyin
- [ ] Admin aktivitelerini kontrol edin
- [ ] Başarısız giriş denemelerini kontrol edin
- [ ] Sistem güncellemelerini yapın

## 🆘 Güvenlik İhlali Durumunda

### **1. Hemen Yapılacaklar**
- Admin şifresini değiştirin
- Şüpheli IP'leri bloklayın
- Güvenlik loglarını inceleyin
- Sistem erişimini geçici olarak kısıtlayın

### **2. İnceleme**
- Hangi verilerin etkilendiğini belirleyin
- Saldırı vektörünü tespit edin
- Log dosyalarını analiz edin
- Kullanıcıları bilgilendirin

### **3. Onarım**
- Güvenlik açığını kapatın
- Etkilenen verileri temizleyin
- Sistem güvenliğini artırın
- Yeni güvenlik önlemleri ekleyin

## 📞 Güvenlik Desteği

Güvenlik konularında destek için:
- **Email**: mehtikorhan16@gmail.com
- **Telegram**: @byjudgee
- **GitHub Issues**: Güvenlik açığı bildirimi

## 🔄 Güvenlik Güncellemeleri

Bu güvenlik rehberi düzenli olarak güncellenecektir. Yeni güvenlik önlemleri ve tehditler eklendikçe dokümantasyon da güncellenecektir.

**Son Güncelleme**: 2025-01-27
**Versiyon**: 1.0

---

**⚠️ Önemli**: Bu sistem sadece eğitim amaçlıdır. Gerçek üretim ortamında kullanmadan önce güvenlik testlerini yapın ve profesyonel bir güvenlik denetimi gerçekleştirin.
