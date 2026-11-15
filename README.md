# Sandık

Tarayıcıda çalışan ücretsiz dosya araçları. Sunucu yok, hesap yok, dosya yükleme yok:
her işlem kullanıcının cihazında (tarayıcıda) yapılır.

**Marka vaadi:** "Dosyaların cihazından çıkmaz."

---

## 1. İçindeki araçlar

| Sayfa | Araç | Ne yapar |
|---|---|---|
| `pdf-birlestir.html` | PDF Birleştir | Sınırsız PDF'yi sırayla tek dosyada toplar, kalite kaybı yok |
| `pdf-sayfa-duzenle.html` | Sayfa Düzenle | Sayfa sil, sırala, 90° döndür, seçilenleri ayır, her sayfayı ayrı ZIP yap |
| `pdf-gorsel.html` | PDF → Görsel | Her sayfayı JPG/PNG olarak indirir (96–300 DPI, sayfa aralığı) |
| `gorsel-pdf.html` | Görsel → PDF | JPG/PNG/WebP'yi PDF yapar; otomatik yön, A4, Letter, kenar boşluğu |
| `gorsel-sikistir.html` | Görsel Sıkıştır | Hedef KB verir, kalite + çözünürlüğü otomatik ayarlar (JPEG/WebP) |
| `pdf-kucult.html` | PDF Küçült | Sayfaları görüntüye çevirip yeniden paketler, boyutu düşürür |
| `qr-kod.html` | QR Kod Üret | Metin, link, Wi-Fi, telefon, e-posta; PNG + SVG, renk seçimi |
| `pdf-metin.html` | PDF'ten Metin | Metin katmanını kopyalanabilir yazıya çevirir, .txt indirir |

Ayrıca: ana sayfa, hakkında, gizlilik, iletişim, 404, PWA (çevrimdışı), sitemap, robots.

---

## 2. Dosya yapısı

```
sandik/
├── index.html                 ana sayfa (araç kartları, SSS, nasıl çalışır)
├── pdf-*.html, gorsel-*.html, qr-kod.html, ...
├── hakkinda.html, gizlilik.html, iletisim.html, 404.html
├── assets/
│   ├── css/style.css          tüm tasarım (tek dosya, tema değişkenleri)
│   └── js/
│       ├── config.js          SİTE AYARLARI (isim, alan adı, e-posta, reklam)
│       ├── core.js            ortak yardımcılar, tema, toast, reklam, SW kaydı
│       └── tools/*.js         her aracın kendi dosyası
├── libs/                      pdf-lib, pdf.js (+worker), qrcode-generator, fflate
├── icons/                     logo, favicon, uygulama ikonları, og.png
├── manifest.webmanifest       PWA tanımı
├── sw.js                      service worker (çevrimdışı önbellek)
├── robots.txt, sitemap.xml
└── .nojekyll                  GitHub Pages için
```

Build adımı yok. Dosyalar olduğu gibi yayına çıkar.

---

## 3. Yerelde deneme

```bash
cd sandik
python3 -m http.server 8000
```

Sonra tarayıcıda `http://localhost:8000`. (Servis çalışanı ve PDF.js işçisi
`file://` üzerinde çalışmaz; mutlaka yerel sunucu kullan.)

---

## 4. Ücretsiz yayına alma (3 seçenek)

### A) Cloudflare Pages — en kolay
1. https://dash.cloudflare.com → Workers & Pages → Create → Pages → Upload assets
2. `sandik` klasörünün **içeriğini** (klasörün kendisini değil) sürükle
3. Deploy. `https://rastgele-ad.pages.dev` adresinde yayında.
4. İstersen "Custom domain" ile kendi alan adını bağla (alan adı ücretli, hosting bedava).

### B) GitHub Pages
1. GitHub'da yeni repo aç (public).
2. `sandik` içeriğini yükle.
3. Settings → Pages → Source: `main` / `root`. Adres: `https://kullanici.github.io/repo/`.
4. Not: tüm yollar göreli olduğu için alt klasörde de sorunsuz çalışır.

### C) Netlify Drop
1. https://app.netlify.com/drop → klasörü sürükle bırak. Bitti.

**Alan adı** istersen `.com` ortalama 10–12 USD/yıl. Ücretsiz `*.pages.dev` /
`*.github.io` alt alan adı ile de başlayabilirsin; reklam başvurusu için alan adı şart değil.

---

## 5. Yayına çıkmadan önce değiştir

Dosya: `assets/js/config.js`

```js
window.SANDIK_CONFIG = {
  siteName: "Sandık",
  siteUrl: "https://oyunlarinkrali83-byte.github.io/sandik",        // gerçek alan adın
  contactEmail: "merhaba@sandik.app",   // gerçek e-posta
  adsenseClient: ""                     // reklam yoksa boş kalsın
};
```

Ayrıca metin içinde geçen `sandik.app` adresini kendi alan adınla değiştir
(`index.html`, tüm araç sayfaları, `robots.txt`, `sitemap.xml`, `gizlilik.html`, `iletisim.html`).
Toplu değiştirmek için:

```bash
grep -rl "sandik.app" . | xargs sed -i 's/sandik\.app/yeniadresin.com/g'
```

Marka adını değiştirmek istersen `Sandık` kelimesini ve `icons/` içindeki logoyu değiştir.
Renkler `assets/css/style.css` dosyasının en üstündeki `--accent`, `--bg` gibi değişkenlerde.

---

## 6. Reklam (para kazanma)

### AdSense
1. https://adsense.google.com ile başvur. Site adresi olarak yayındaki adresini ver.
2. Onay için gerekenler (hepsi projede hazır):
   - Özgün içerik: her araç sayfasında açıklama + 3–4 SSS var.
   - Gizlilik politikası: `gizlilik.html` ✔
   - İletişim bilgisi: `iletisim.html` ✔
   - Gezinme ve mobil uyum ✔
3. Onay gelince `config.js` içine yayıncı kimliğini yaz:
   ```js
   adsenseClient: "ca-pub-1234567890123456"
   ```
   Reklam alanları otomatik görünür. Her sayfada bir `.ad-slot` var.
   Belirli bir reklam birimi kullanmak istersen `data-slot-id="1234567890"` ekle.
4. **Önemli:** Avrupa (AEA) ziyaretçileri için Google, onaylı bir CMP ister.
   Projede basit bir izin şeridi var; AdSense panelinden "Gizlilik ve mesajlar"
   bölümünde Google'ın kendi CMP'sini aç. Bu, hukuken doğru olan yol.
   Reddeden kullanıcıya reklam gösterilmez (bu davranış kodda hazır).

### Reklam gerçeği (abartısız)
- Gelir = gösterim × RPM. Türkiye trafiğinde RPM çoğu nişte 0,3–3 USD/1000 gösterim.
- Yani **ayda 50.000 sayfa görüntüleme ≈ 15–150 USD**. Trafik olmadan gelir olmaz.
- Trafik kaynağı: Google aramaları. Bu yüzden sayfa başlıkları ve SSS'ler
  ("pdf birleştirme nasıl yapılır" gibi aramalar) önemli.
- İlk 3–6 ay genelde 0'a yakın gelir; bu normal. Sabır + içerik.

### Alternatifler
Onay alamazsan veya daha hızlı başlamak istersen: Ezoic, PropellerAds, Adsterra.
Hepsi betik eklemeyi gerektirir; aynı `.ad-slot` yapısını kullanabilirsin.

---

## 7. Bilerek **olmayanlar** (ve neden)

| Yok | Neden |
|---|---|
| Sunucu / dosya yükleme | Maliyet + gizlilik riski. Tarayıcı zaten yeterince hızlı, vaat de bu. |
| Hesap, üyelik, e-posta | Dönüşümü düşürür, KVKK yükü getirir. Reklam modeliyle gerek yok. |
| Kota / "3 dosya hakkı" | Kullanıcıyı kaçırır; kötü ün en büyük risk. |
| OCR (taranmış PDF'ten yazı) | Tarayıcıda kaliteli OCR ya çok büyük ya ücretli bir servis gerektirir. Sonradan eklenebilir. |
| Analitik / çerez takibi | Gizlilik vaadini zayıflatır. İstersen sonradan ekle, ama gizlilik metnini güncelle. |
| Karanlık desenler (sahte indirme, zorla reklam tıklatma) | AdSense tarafından kalıcı yasak getirir. |
| Otomatik reklam tıklama | Aynı sebep. Kesinlikle yapma. |

---

## 8. Bilinen sınırlar

- **Bellek:** Çok büyük PDF'ler (300 MB+) mobilde tarayıcıyı zorlayabilir. Masaüstünde sorun yok.
- **PDF Küçült** kaliteyi düşürür ve metni görüntüye çevirir; uyarı arayüzde var.
- **Şifreli PDF:** Şifre sorulur (pdf.js destekler). Kullanıcı bilmezse işlem durur.
- **Taranmış PDF → metin:** Metin katmanı yoksa boş döner; arayüz bunu söyler.
- **Dosya adları:** Türkçe karakterler indirmede korunur; ZIP içinde de sorunsuz.

---

## 9. Geliştirici notları

- Vanilla JS, framework yok, build yok. Her araç kendi IIFE'sinde, ortak kod `core.js`.
- Tüm yollar göreli (`assets/...`), alt dizinde yayınlanabilir.
- `sw.js` içindeki `VERSION` değerini değiştirmediğin sürece eski önbellek kalır.
  Yeni dosya eklediğinde hem `ASSETS` listesine ekle hem `VERSION`ı `sandik-v2` yap.
- Yeni araç eklemek: HTML'i bir araç sayfasından kopyala, `assets/js/tools/` içine
  yeni dosya yaz, `<script defer>` satırı ekle, `sw.js` listesine ekle, ana sayfadaki
  `TOOLS` kartlarına bir kart ekle.
- Erişilebilirlik: klavye ile gezinme, `aria-*`, `prefers-reduced-motion`,
  yüksek kontrast desteği mevcut. Değişiklik yaparken koru.
- Bağımlılıklar `libs/` içinde yerel (CDN yok, çevrimdışı çalışır):
  pdf-lib (MIT), PDF.js (Apache-2.0), qrcode-generator (MIT), fflate (MIT).

---

## 10. Sonraki adım fikirleri (para kazandıran sırayla)

1. **Türkçe SEO içerik sayfaları**: "PDF birleştirme nasıl yapılır", "PDF küçültme",
   "QR kod nedir" rehberleri. Trafiğin çoğu buradan gelir.
2. **Yeni araçlar**: PDF'e şifre koy/kaldır (pdf-lib kısıtlı), PDF sıkıştır (metin koruyan),
   görsel → WebP toplu, Word/Excel → PDF (zor), e-imza görüntüsü ekleme.
3. **Toplu işlem**: birden fazla PDF için aynı ayarları uygula.
4. **Dil**: İngilizce sürüm (`/en/`) — RPM 5–10 kat yüksek.
5. **Android paketi**: Aynı siteyi Capacitor veya WebView ile sarmalayıp Play Store'a
   koymak (25 USD hesap + inceleme). PWA zaten kurulabilir olduğu için acele etme.

---

## 11. Lisans

Kod: kendi projen, istediğin gibi kullan. Üçüncü taraf kütüphanelerin lisansları
`libs/` içindeki dosyaların başında yazılı (MIT / Apache-2.0).
