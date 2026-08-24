'use strict';

function izinleriPuanla(izinler, kapsam, kurallar) {
  const tablo = kurallar.izinler;
  const satirlar = [];
  let toplam = 0;

  for (const izin of izinler) {
    const tanim = tablo[izin];

    if (!tanim) {
      satirlar.push({
        izin,
        puan: 2,
        seviye: 'bilinmiyor',
        yetenek: 'Bu izin kural tablosunda tanımlı değil.',
        aciklama: 'Elle incelenmesi gerekir.',
      });
      toplam += 2;
      continue;
    }

    const carpan = tanim.kapsamDuyarli ? kapsam.carpan : 1;
    const puan = Math.round(tanim.temel * carpan * 10) / 10;

    satirlar.push({
      izin,
      puan,
      seviye: tanim.seviye,
      yetenek: tanim.yetenek,
      aciklama: tanim.aciklama,
      kapsamUygulandi: tanim.kapsamDuyarli ? kapsam.etiket : null,
    });

    toplam += puan;
  }

  satirlar.sort((a, b) => b.puan - a.puan);
  return { satirlar, toplam };
}

function kombinasyonlariUygula(izinler, kapsam, kodSinyalleri, kombinasyonKurallari, icerikScriptiVar) {
  const izinKumesi = new Set(izinler);
  const sinyalKumesi = new Set(kodSinyalleri.map((s) => s.kimlik));
  const bulunan = [];
  let toplam = 0;

  for (const kural of kombinasyonKurallari.kurallar) {
    if (kural.gerekli && !kural.gerekli.every((i) => izinKumesi.has(i))) continue;

    if (kural.herhangiBiri) {
      const sayfayaErisim =
        kural.icerikScriptiSayilir && icerikScriptiVar;
      if (!kural.herhangiBiri.some((i) => izinKumesi.has(i)) && !sayfayaErisim) continue;
    }

    if (kural.genisHostGerekli && !kapsam.genis) continue;

    if (kural.kodSinyaliGerekli && !kural.kodSinyaliGerekli.every((s) => sinyalKumesi.has(s))) {
      continue;
    }

    bulunan.push({
      kimlik: kural.kimlik,
      ad: kural.ad,
      seviye: kural.seviye,
      puan: kural.puan,
      aciklama: kural.aciklama,
      kullaniciCumlesi: kural.kullaniciCumlesi,
    });

    toplam += kural.puan;
  }

  return { bulunan, toplam };
}

function iyiSinyalleriTopla(mf, izinler, kapsam, kodSinyalleri, kombinasyonKurallari) {
  const izinKumesi = new Set(izinler);
  const sinyalKumesi = new Set(kodSinyalleri.map((s) => s.kimlik));
  const bulunan = [];

  const kosullar = {
    activeTab_var_genis_host_yok: izinKumesi.has('activeTab') && !kapsam.genis,
    host_izinleri_tek_alan: kapsam.carpan <= 1.0 && mf.hostIzinleri.length > 0,
    manifest_v3: mf.manifestSurumu >= 3,
    dis_istek_sinyali_yok: !sinyalKumesi.has('dis_istek'),
  };

  for (const s of kombinasyonKurallari.iyiSinyaller) {
    if (kosullar[s.kosul]) bulunan.push({ kimlik: s.kimlik, mesaj: s.mesaj });
  }

  return bulunan;
}

function notHesapla(hamPuan) {
  const olcek = Math.min(100, Math.round((hamPuan / 190) * 100));

  let harf, etiket;
  if (olcek >= 75) [harf, etiket] = ['E', 'Çok yüksek maruziyet'];
  else if (olcek >= 55) [harf, etiket] = ['D', 'Yüksek maruziyet'];
  else if (olcek >= 33) [harf, etiket] = ['C', 'Orta maruziyet'];
  else if (olcek >= 12) [harf, etiket] = ['B', 'Düşük maruziyet'];
  else [harf, etiket] = ['A', 'Çok düşük maruziyet'];

  return { olcek, harf, etiket };
}

module.exports = { izinleriPuanla, kombinasyonlariUygula, iyiSinyalleriTopla, notHesapla };
