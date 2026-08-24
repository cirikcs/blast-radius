# Blast Radius

Tarayıcı eklentilerinin izinlerine bakıp ne yapabildiklerini gösteren bir
analiz aracı.

İsmini güvenlik alanındaki *blast radius* kavramından alıyor: bir bileşen
ele geçirilirse etkisi ne kadar yayılır. Araç bir eklentiyi kötü ya da iyi
diye etiketlemiyor; sahip olduğu yetenekleri ve oluşturabileceği
potansiyel riski gösteriyor.

Canlı: **https://blast-radius.sbs**

## Ne yapar

- Eklenti paketini mağaza adresinden (Chrome Web Store, Firefox Add-ons,
  Edge Add-ons) indirir ya da `.crx` / `.zip` dosyası olarak alır
- İzinleri ve site erişim kapsamını çıkarır
- JS dosyalarını ayrıştırıp şüpheli davranışları arar — metin taraması
  değil, sözdizimi ağacı (AST) üzerinden
- İzin kombinasyonlarının tek başına değil, birlikte ne anlama geldiğini
  özetler

Örnek: `cookies` izni tek başına sıradan görünür. Geniş site erişimiyle
birleşince oturum çalma imkanı doğar. Araç bunu ayrı ayrı değil, birlikte
değerlendiriyor.

## Kurulum

```bash
npm install
node test/fixtures.js
node server.js                 # http://localhost:3000
```

Komut satırı:

```bash
node bin/cli.js test/agresif.zip
```

## Yapı

```
server.js                  /api/analiz, /api/magaza, /saglik
public/                    arayüz (index.html, style.css, app.js)
  manifest.json, sw.js     PWA desteği — masaüstüne yüklenebilir uygulama
rules/
  permissions.json         izin → yetenek eşlemesi (43 izin)
  combinations.json        izin kombinasyonu kuralları
src/
  crx.js                   .crx paket başlığını ayıklar
  streamPaket.js           zip içeriğini akış (stream) hâlinde okur
  store.js                 mağaza indirmesi, disk tabanlı akış
  manifest.js              manifest ayrıştırma, i18n çözümü
  code.js                  hibrit AST/regex tabanlı kod analizi
  score.js                 puanlama motoru
  analyze.js               analiz akışının giriş noktası
  analyzeIsolated.js       analizi izole bir işçi süreçte çalıştırır
  analyzeWorker.js         işçi sürecin kendisi
bin/cli.js
test/
  fixtures.js              sahte test paketleri üretir
  kalibrasyon.js           sentetik testleri doğrular
  gercek-kalibrasyon.js    gerçek eklentilerle toplu test
```

Kurallar koda gömülü değil, `rules/` altındaki JSON dosyalarında.

## Puanlama

```
ham puan = Σ(izin puanı × kapsam çarpanı) + Σ(kombinasyon cezaları)
         + Σ(kod sinyalleri) + Σ(manifest uyarıları)
```

Kombinasyon cezaları puanın çoğunu oluşturuyor. "Veri sızdırma" kuralı
örneğin, sadece dış istek atmayı değil, önce çerez/depolama okuyup sonra
göndermeyi arıyor — filtre listesi güncelleyen bir reklam engelleyici
artık boşuna cezalandırılmıyor.

Ham puan 0-190 arasına sıkışıp A-E notuna dönüşüyor. Arayüzde sadece harf
gösteriliyor. E notu en yüksek maruziyet demek, kendi içinde ayrıca bir
sıralama yapmıyor.

## Kalibrasyon

Sentetik kontrol paketleri:

```bash
node test/fixtures.js
node test/kalibrasyon.js
```

Eşikler 75 gerçek Chrome eklentisiyle test edildi:

| Not | Sayı |
|---|---|
| A | 11 |
| B | 24 |
| C | 17 |
| D | 9  |
| E | 14 |

Ortalama %42, medyan %33. Tekrar çalıştırmak için (internet gerekli):

```bash
node test/gercek-kalibrasyon.js
```

## Kod analizi

`src/code.js` acorn ile kodu ayrıştırıp gerçek fonksiyon çağrılarını
buluyor. Bu sayede yorum satırındaki ya da bir metin (string) içindeki
`eval` kelimesi yanlışlıkla sinyal olarak sayılmıyor.

800 KB üzerindeki dosyalarda (genelde küçültülmüş/paketlenmiş kütüphane
dosyaları) tam AST ayrıştırması bellek açısından risk taşıdığı için, bu
dosyalarda desen (regex) tabanlı daha hafif bir tarama kullanılıyor. Bu
şekilde tespit kabiliyeti büyük ölçüde korunurken bellek kullanımı da
düşük kalıyor.

## Büyük paket desteği ve kararlılık

Erken sürümlerde büyük paketler (70 MB üzeri) barındırma ortamının bellek
sınırını (512 MB) aşıp sunucuyu çökertiyordu. Kök sebep, paketin tamamının
tek bir bellek bloğu (buffer) olarak tutulmasıydı.

Bunu çözmek için mimari değişti:

- Mağaza indirmesi artık tamamı belleğe alınmadan, doğrudan geçici diske
  akıtılıyor (`store.js`)
- Analiz, ana sunucu sürecinden ayrı, izole bir işçi süreçte çalışıyor
  (`analyzeIsolated.js` / `analyzeWorker.js`) — bir sorun çıkarsa sadece
  o analiz başarısız olur, sunucu etkilenmez
- Zip içeriği akış hâlinde okunuyor (`streamPaket.js`), dosyalar tek tek
  işlenip bellekten atılıyor

Bu değişiklikten sonra 114 MB'lık gerçek bir eklenti (Keeper Password
Manager) sorunsuz analiz edildi.

## PWA desteği

Site, tarayıcıdan ziyaret edildiğinde birkaç saniye sonra kapatılabilir
bir "yükle" bildirimi gösteriyor. Windows'ta (Chrome/Edge) tek tıkla
kurulum yapılabiliyor. Mac'te Safari bu otomasyonu desteklemediği için,
bunun yerine Paylaş menüsünden Dock'a ekleme talimatı gösteriliyor.
Mobil cihazlarda bildirim hiç görünmüyor.

## Sınırlar

- Mağaza indirmede 120 MB paket sınırı var
- Safari'nin kendi eklenti mağazası desteklenmiyor (App Store dağıtımı
  tamamen farklı bir model, incelenen paket formatı da farklı)
