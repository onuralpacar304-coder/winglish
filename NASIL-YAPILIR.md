# Winglish – Ne Yapacağım? (Rehber)

Bu dosyayı VS Code / Cursor’da açıp takip edebilirsin. Adımlar sırayla yazılı.

---

## 1. Projeyi bilgisayarda çalıştırmak

1. Terminal aç (VS Code’da: Terminal → New Terminal).
2. Proje klasörüne gir:
   ```
   cd /Users/onuralp/Downloads/winglish
   ```
3. Bağımlılıkları yükle (ilk sefer veya package.json değiştiyse):
   ```
   npm install
   ```
4. Sunucuyu başlat:
   ```
   npm start
   ```
5. Tarayıcıda aç: **http://localhost:3000**

---

## 2. Admin’de düzenleme yaptıktan sonra (duyurular, paketler vb.)

- Aynı tarayıcıda ana sayfaya veya ilgili sayfaya dön; içerik otomatik güncellenir.
- **Diğer cihazlarda** (mobil, başka bilgisayar) da aynı içeriği göstermek için:
  1. **Bir kez** Admin → **Yedekleme & Senkronizasyon** bölümünde **Sunucu adresi**ni ayarla (örn. **https://winglish.onrender.com** veya **https://www.winglish.tr**).
  2. Bundan sonra duyuru, paket, iletişim formu vb. kaydettiğinizde veriler **otomatik olarak** sunucuya gönderilir.
  3. Diğer cihazlar siteyi aynı adresten açtığında sayfa yüklenirken sunucudan güncel veri çekilir; ekstra “Sunucudan al” tıklaman gerekmez (istersen yine de manuel **Sunucuya gönder** / **Sunucudan al** kullanabilirsin).

---

## 3. Değişiklikleri canlı siteye (Render’a) yansıtmak

Kodda değişiklik yaptıysan (veya biri yaptırdıysan) canlı sitede görmek için:

1. Terminalde proje klasöründe ol:
   ```
   cd /Users/onuralp/Downloads/winglish
   ```
2. Değişen dosyaları ekle:
   ```
   git add .
   ```
   (Sadece belirli dosyalar için: `git add public/index.html server.js`)
3. Commit at:
   ```
   git commit -m "Ne yaptığını kısaca yaz"
   ```
4. GitHub’a gönder:
   ```
   git push origin main
   ```
5. Render birkaç dakika içinde otomatik deploy eder. **winglish.onrender.com** (veya winglish.tr) güncel olur.

---

## 4. Sunucu adresi ne olmalı?

- Şu an site **winglish.onrender.com** ise → Sunucu adresi: **https://winglish.onrender.com**
- **winglish.tr** açılıyorsa → Sunucu adresi: **https://www.winglish.tr** veya **https://winglish.tr**
- Kural: Siteyi **hangi adresle** açıyorsan, “Sunucu adresi”ni de **aynı adres** yap.

---

## 5. Sık sorulanlar

**Duyurularım mobilde / başka tarayıcıda eski görünüyor.**  
→ Sunucu adresinin Admin → Yedekleme bölümünde doğru ayarlı olduğundan emin ol. Duyuru/paket kaydettiğinde veri otomatik sunucuya gider; diğer cihazda sayfayı yenile (mümkünse Cmd+Shift+R veya cache temizle).

**“Sunucuya gönder” hata veriyor.**  
→ Sunucu adresini, siteyi açtığın adresle aynı yap. Site uyku modundaysa (Render ücretsiz) önce sayfayı açıp 1–2 dakika bekle, sonra tekrar dene.

**Kod nerede?**  
→ `/Users/onuralp/Downloads/winglish`  
- **server.js** = sunucu + API  
- **public/index.html** = tüm arayüz (admin, duyurular, paketler, blog, veli yorumları)

---

Bu dosyayı istediğin zaman VS Code’da açıp “ne yapacağım?” diye bakabilirsin.
