# Görevler

React + Tailwind CSS ile yapılmış yapılacaklar listesi (kullanıcıya görünen adı **Görevler**, teknik adı `task`). Görevler tarihlerine göre gruplanır. Tamamlanan görev silinmez, kendi gününde üstü çizili ve soluk kalır. Bugün ve sonrası ana listede, geçmiş günler altında görünür: önce dün, "Bir önceki günü göster" düğmesine her basışta bir gün daha geriye gidilir. Veriler tarayıcıda saklanır, istersen Google Drive ile cihazlar arasında eşitlenir. GitHub Actions her `main` güncellemesinde siteyi GitHub Pages'e yayınlar.

## Yerelde çalıştırma

```bash
npm install
cp .env.example .env.local   # Drive eşitlemesi için istemci kimliğini buraya yaz
npm run dev                  # http://localhost:5173
npm test                     # tarih ve birleştirme mantığı testleri
```

İstemci kimliği olmadan da uygulama çalışır. Bu durumda Drive eşitleme kapalıdır ve görevler yalnızca tarayıcıda saklanır.

### Eşitleme nasıl çalışır

- Görevler Drive'daki gizli uygulama klasörüne (`appDataFolder`) `task.json` adlı tek dosya olarak yazılır. Bu klasör Drive arayüzünde görünmez, uygulama yalnızca kendi dosyasına erişir.
- Aynı görev iki cihazda değiştiyse en son değiştirilen kazanır. Silinen görevler 30 gün boyunca silinmiş olarak işaretli kalır, böylece silme diğer cihazlara da ulaşır.
- Eşitleme, görev değiştikten bir saniye sonra ve sekmeye geri dönüldüğünde çalışır.
- **Bağlantıyı kes** düğmesi yalnızca bu tarayıcının erişimini kaldırır. Drive'daki dosya durur.
- Google erişim anahtarı yaklaşık bir saat geçerlidir. Sayfa açılırken ve süre dolunca arka planda yenilenir. Tarayıcı bunu engellerse üstte **Yeniden bağlan** düğmesi çıkar.
