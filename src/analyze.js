'use strict';

const fs = require('fs');
const { paketiAc } = require('./streamPaket');
const { manifestiOku, kapsamHesapla, manifestSinyalleri } = require('./manifest');
const { kodAnalizi } = require('./code');
const { izinleriPuanla, kombinasyonlariUygula, iyiSinyalleriTopla, notHesapla } = require('./score');

const izinKurallari = require('../rules/permissions.json');
const kombinasyonKurallari = require('../rules/combinations.json');

async function analizEt(girdi) {
  let tampon = girdi;
  if (typeof girdi === 'string') {
    tampon = fs.readFileSync(girdi);
  }

  const paket = await paketiAc(tampon);

  try {
    const mf = await manifestiOku(paket.kayitlar, paket.zipfile);
    const kapsam = kapsamHesapla(mf.hostIzinleri, izinKurallari.hostErisimi);
    const kod = await kodAnalizi(paket.kayitlar, paket.zipfile);

    const icerikScriptiVar = mf.icerikScriptleri.length > 0;

    const izinPuani = izinleriPuanla(mf.izinler, kapsam, izinKurallari);
    const manifestBulgulari = manifestSinyalleri(mf, izinKurallari);
    const manifestPuani = manifestBulgulari.reduce((t, b) => t + b.puan, 0);

    const kombinasyonlar = kombinasyonlariUygula(
      mf.izinler,
      kapsam,
      kod.sinyaller,
      kombinasyonKurallari,
      icerikScriptiVar
    );

    const iyiSinyaller = iyiSinyalleriTopla(
      mf,
      mf.izinler,
      kapsam,
      kod.sinyaller,
      kombinasyonKurallari
    );

    const hamPuan =
      izinPuani.toplam + kapsam.puan + kombinasyonlar.toplam + manifestPuani + kod.toplam;

    const not = notHesapla(hamPuan);

    return {
      eklenti: {
        ad: mf.ad,
        surum: mf.surum,
        manifestSurumu: mf.manifestSurumu,
        aciklama: mf.aciklama,
        paketFormati: paket.format,
      },
      sonuc: {
        ...not,
        hamPuan: Math.round(hamPuan * 10) / 10,
        dagilim: {
          hostErisimi: kapsam.puan,
          izinler: Math.round(izinPuani.toplam * 10) / 10,
          kombinasyonlar: kombinasyonlar.toplam,
          kod: kod.toplam,
          manifest: manifestPuani,
        },
      },
      yetenekler: kombinasyonlar.bulunan.map((k) => k.kullaniciCumlesi),
      kombinasyonlar: kombinasyonlar.bulunan,
      kapsam,
      icerikScriptleri: mf.icerikScriptleri.map((cs) => ({
        desenler: cs.desenler,
        calismaAni: cs.calismaAni,
        dosyaSayisi: cs.dosyalar.length,
      })),
      izinler: izinPuani.satirlar,
      manifestUyarilari: manifestBulgulari,
      kod: {
        sinyaller: kod.sinyaller,
        alanAdlari: kod.alanAdlari.slice(0, 20),
        istatistik: kod.istatistik,
      },
      iyiSinyaller,
    };
  } finally {
    try {
      if (paket && paket.zipfile) paket.zipfile.close();
    } catch { }
  }
}

module.exports = { analizEt };