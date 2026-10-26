# Görevler

React + Tailwind CSS ile yapılmış yapılacaklar listesi (kullanıcıya görünen adı **Görevler**, teknik adı `task`). Görevler tarihlerine göre gruplanır. Tamamlanan görev silinmez, kendi gününde üstü çizili ve soluk kalır. Bugün ve sonrası ana listede, geçmiş günler altında görünür: yalnızca görevi olan son 14 gün gösterilir, "Daha eski günler" düğmesi her basışta 14 gün daha açar. Her göreve istenirse bir saat eklenebilir (ekleme çubuğundaki **Saat ekle** düğmesi). Bir göreve dokununca açılan pencerede adı, günü ve saati değiştirilebilir ya da görev silinebilir. Veriler tarayıcıda saklanır, istersen Google ile giriş yapıp Supabase'e yedeklenir ve cihazlar arasında eşitlenir. GitHub Actions her `main` güncellemesinde siteyi GitHub Pages'e yayınlar.

## Yerelde çalıştırma

```bash
npm install
cp .env.example .env.local   # Supabase URL ve anon anahtarını yaz (üç uygulamada aynı)
npm run dev                  # http://localhost:5173
npm test                     # tarih ve birleştirme mantığı testleri
```

Supabase anahtarları olmadan da uygulama çalışır. Bu durumda bulut yedekleme kapalıdır ve görevler yalnızca tarayıcıda saklanır.

### Supabase yedekleme kurulumu (bir kez, üç uygulama için ortak)

Günlük, Akış ve Görevler **aynı Supabase projesini ve aynı tek tabloyu** (`app_backups`) kullanır. Her uygulama tabloda kendi satırına yazar (`app` sütunu: `daily`, `flow`, `task`), bu yüzden veriler karışmaz. Her kullanıcı yalnızca kendi satırlarını görür (RLS).

1. **Tablo:** Supabase → SQL Editor'a `supabase/setup.sql` dosyasının içeriğini yapıştırıp çalıştır (tekrar çalıştırmak güvenli).
2. **Google girişi:** Supabase → Authentication → Providers → **Google**'ı aç, Google Cloud'daki OAuth istemcisinin Client ID ve Client Secret değerlerini yaz. Google Cloud'da bu istemcinin **Authorized redirect URIs** listesine Supabase'in gösterdiği `https://<proje>.supabase.co/auth/v1/callback` adresini ekle.
3. **Yönlendirme adresleri:** Supabase → Authentication → URL Configuration → **Redirect URLs** listesine üç uygulamanın adreslerini ekle (sonda `/` olacak), yerel geliştirme için de `http://localhost:5173/`. Örnek: `https://oguzbatuhan.github.io/daily/`, `https://oguzbatuhan.github.io/flow/`, `https://oguzbatuhan.github.io/task/`.
4. **Anahtarlar:** Supabase → Project Settings → API'den `Project URL` ve `anon public` anahtarını al. Yerelde `.env.local` içine, yayında deponun **Settings → Secrets and variables → Actions → Variables** bölümüne `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` olarak ekle. Anahtar herkese açık olacak şekilde tasarlanmıştır; veriyi RLS korur. `service_role` anahtarını **asla** kullanma.

Tabloyu başka bir adla açtıysan `VITE_SUPABASE_TABLE` ile adını ver.

### Eşitleme nasıl çalışır

- Görevler Supabase'deki ortak `app_backups` tablosuna `app = task` satırı olarak yazılır; Günlük ve Akış'ın satırlarına dokunulmaz. Giriş Google ile yapılır.
- Aynı görev iki cihazda değiştiyse en son değiştirilen kazanır. Silinen görevler 30 gün boyunca silinmiş olarak işaretli kalır, böylece silme diğer cihazlara da ulaşır.
- Eşitleme, görev değiştikten bir saniye sonra ve sekmeye geri dönüldüğünde çalışır.
- **Bağlantıyı kes** düğmesi yalnızca bu tarayıcıdaki oturumu kapatır. Supabase'deki yedek durur.
- Oturum telefonda/tarayıcıda kalıcıdır ve arka planda kendiliğinden yenilenir. Oturum düşerse üstte **Yeniden bağlan** düğmesi çıkar.
