const { getDatabase } = require('../database/init');
const fs = require('fs');
const path = require('path');

class SecurityMonitor {
    constructor() {
        this.db = null;
        this.alertThresholds = {
            failedLogins: 5,        // 5 başarısız giriş
            adminAccess: 10,        // 10 admin işlemi
            suspiciousIPs: 3,       // 3 şüpheli IP
            fileUploads: 5          // 5 dosya yükleme
        };
    }

    async initialize() {
        try {
            this.db = getDatabase();
            console.log('🔍 Güvenlik monitörü başlatıldı');
            await this.startMonitoring();
        } catch (error) {
            console.error('❌ Güvenlik monitörü başlatma hatası:', error);
        }
    }

    async startMonitoring() {
        // Her 5 dakikada bir güvenlik kontrolü yap
        setInterval(async () => {
            await this.checkSecurityAlerts();
        }, 5 * 60 * 1000);

        // Her saatte bir rapor oluştur
        setInterval(async () => {
            await this.generateSecurityReport();
        }, 60 * 60 * 1000);
    }

    async checkSecurityAlerts() {
        try {
            const alerts = [];

            // Başarısız giriş denemeleri kontrolü
            const failedLogins = await this.getRecentFailedLogins();
            if (failedLogins.length >= this.alertThresholds.failedLogins) {
                alerts.push({
                    type: 'FAILED_LOGINS',
                    message: `${failedLogins.length} başarısız giriş denemesi tespit edildi`,
                    severity: 'HIGH',
                    data: failedLogins
                });
            }

            // Şüpheli admin aktiviteleri
            const suspiciousAdminActivity = await this.getSuspiciousAdminActivity();
            if (suspiciousAdminActivity.length > 0) {
                alerts.push({
                    type: 'SUSPICIOUS_ADMIN',
                    message: `${suspiciousAdminActivity.length} şüpheli admin aktivitesi tespit edildi`,
                    severity: 'CRITICAL',
                    data: suspiciousAdminActivity
                });
            }

            // Yüksek hacimli admin işlemleri
            const highVolumeAdmin = await this.getHighVolumeAdminActivity();
            if (highVolumeAdmin.length >= this.alertThresholds.adminAccess) {
                alerts.push({
                    type: 'HIGH_VOLUME_ADMIN',
                    message: `${highVolumeAdmin.length} admin işlemi tespit edildi`,
                    severity: 'MEDIUM',
                    data: highVolumeAdmin
                });
            }

            // Alert'leri işle
            for (const alert of alerts) {
                await this.handleAlert(alert);
            }

        } catch (error) {
            console.error('❌ Güvenlik kontrolü hatası:', error);
        }
    }

    async getRecentFailedLogins() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM admin_logs 
                WHERE action LIKE '%login%' AND timestamp > datetime('now', '-1 hour')
                ORDER BY timestamp DESC
                LIMIT 50
            `;
            
            this.db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getSuspiciousAdminActivity() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM admin_logs 
                WHERE (
                    action LIKE '%DELETE%' OR 
                    action LIKE '%DROP%' OR 
                    action LIKE '%ALTER%' OR
                    ip IN (SELECT ip FROM admin_logs GROUP BY ip HAVING COUNT(*) > 20)
                ) AND timestamp > datetime('now', '-1 hour')
                ORDER BY timestamp DESC
            `;
            
            this.db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getHighVolumeAdminActivity() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT admin_id, admin_username, ip, COUNT(*) as action_count
                FROM admin_logs 
                WHERE timestamp > datetime('now', '-1 hour')
                GROUP BY admin_id, ip
                HAVING action_count > ?
                ORDER BY action_count DESC
            `;
            
            this.db.all(query, [this.alertThresholds.adminAccess], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async handleAlert(alert) {
        console.log(`🚨 GÜVENLIK ALERT: ${alert.type} - ${alert.message}`);
        
        // Alert'i dosyaya kaydet
        const alertLog = {
            timestamp: new Date().toISOString(),
            ...alert
        };
        
        const logPath = path.join(__dirname, '../logs/security-alerts.json');
        const logDir = path.dirname(logPath);
        
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        let alerts = [];
        if (fs.existsSync(logPath)) {
            try {
                const data = fs.readFileSync(logPath, 'utf8');
                alerts = JSON.parse(data);
            } catch (error) {
                alerts = [];
            }
        }
        
        alerts.push(alertLog);
        
        // Son 100 alert'i sakla
        if (alerts.length > 100) {
            alerts = alerts.slice(-100);
        }
        
        fs.writeFileSync(logPath, JSON.stringify(alerts, null, 2));
        
        // Kritik alert'ler için ek aksiyonlar
        if (alert.severity === 'CRITICAL') {
            await this.handleCriticalAlert(alert);
        }
    }

    async handleCriticalAlert(alert) {
        // Kritik alert'ler için:
        // 1. Admin kullanıcılarını geçici olarak devre dışı bırakabilir
        // 2. IP'yi bloklayabilir
        // 3. Email bildirimi gönderebilir
        
        console.log(`🔴 KRITIK ALERT İŞLENİYOR: ${alert.type}`);
        
        // Şimdilik sadece log, ileride email bildirimi eklenebilir
        const criticalLog = {
            timestamp: new Date().toISOString(),
            alert: alert,
            actions: ['Logged to critical alerts file'],
            status: 'PROCESSED'
        };
        
        const criticalLogPath = path.join(__dirname, '../logs/critical-alerts.json');
        let criticalAlerts = [];
        
        if (fs.existsSync(criticalLogPath)) {
            try {
                const data = fs.readFileSync(criticalLogPath, 'utf8');
                criticalAlerts = JSON.parse(data);
            } catch (error) {
                criticalAlerts = [];
            }
        }
        
        criticalAlerts.push(criticalLog);
        
        // Son 50 kritik alert'i sakla
        if (criticalAlerts.length > 50) {
            criticalAlerts = criticalAlerts.slice(-50);
        }
        
        fs.writeFileSync(criticalLogPath, JSON.stringify(criticalAlerts, null, 2));
    }

    async generateSecurityReport() {
        try {
            const report = {
                timestamp: new Date().toISOString(),
                period: '1 hour',
                stats: {
                    totalAdminActions: await this.getTotalAdminActions(),
                    uniqueIPs: await this.getUniqueIPs(),
                    failedLogins: await this.getFailedLoginsCount(),
                    suspiciousActivities: await this.getSuspiciousActivitiesCount()
                },
                topAdminUsers: await this.getTopAdminUsers(),
                topIPs: await this.getTopIPs()
            };
            
            const reportPath = path.join(__dirname, '../logs/security-reports');
            const reportDir = path.dirname(reportPath);
            
            if (!fs.existsSync(reportDir)) {
                fs.mkdirSync(reportDir, { recursive: true });
            }
            
            const fileName = `security-report-${new Date().toISOString().split('T')[0]}.json`;
            const filePath = path.join(reportDir, fileName);
            
            fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
            
            console.log(`📊 Güvenlik raporu oluşturuldu: ${fileName}`);
            
        } catch (error) {
            console.error('❌ Güvenlik raporu oluşturma hatası:', error);
        }
    }

    // Yardımcı metodlar
    async getTotalAdminActions() {
        return new Promise((resolve, reject) => {
            this.db.get(
                "SELECT COUNT(*) as count FROM admin_logs WHERE timestamp > datetime('now', '-1 hour')",
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });
    }

    async getUniqueIPs() {
        return new Promise((resolve, reject) => {
            this.db.get(
                "SELECT COUNT(DISTINCT ip) as count FROM admin_logs WHERE timestamp > datetime('now', '-1 hour')",
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });
    }

    async getFailedLoginsCount() {
        return new Promise((resolve, reject) => {
            this.db.get(
                "SELECT COUNT(*) as count FROM admin_logs WHERE action LIKE '%login%' AND timestamp > datetime('now', '-1 hour')",
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });
    }

    async getSuspiciousActivitiesCount() {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT COUNT(*) as count FROM admin_logs 
                 WHERE (action LIKE '%DELETE%' OR action LIKE '%DROP%') 
                 AND timestamp > datetime('now', '-1 hour')`,
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });
    }

    async getTopAdminUsers() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT admin_username, COUNT(*) as action_count 
                 FROM admin_logs 
                 WHERE timestamp > datetime('now', '-1 hour')
                 GROUP BY admin_username 
                 ORDER BY action_count DESC 
                 LIMIT 5`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    async getTopIPs() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT ip, COUNT(*) as request_count 
                 FROM admin_logs 
                 WHERE timestamp > datetime('now', '-1 hour')
                 GROUP BY ip 
                 ORDER BY request_count DESC 
                 LIMIT 5`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }
}

// Monitörü başlat
if (require.main === module) {
    const monitor = new SecurityMonitor();
    monitor.initialize();
}

module.exports = SecurityMonitor;
