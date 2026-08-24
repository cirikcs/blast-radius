'use strict';

const yauzl = require('yauzl');
const { crxBasliginiAt } = require('./crx');

const ACIK_TOPLAM_SINIRI = 250 * 1024 * 1024;

function paketiAc(tampon) {
  return new Promise((resolve, reject) => {
    let veri, format, crxSurumu;
    try {
      ({ veri, format, crxSurumu } = crxBasliginiAt(tampon));
    } catch (hata) {
      return reject(hata);
    }

    yauzl.fromBuffer(veri, { lazyEntries: true }, (hata, zipfile) => {
      if (hata) return reject(new Error('Paket açılamadı, arşiv bozuk olabilir.'));

      const kayitlar = [];
      let acikToplam = 0;

      zipfile.on('entry', (girisEntry) => {
        if (girisEntry.fileName.endsWith('/')) {
          zipfile.readEntry();
          return;
        }

        const yol = girisEntry.fileName.replace(/\\/g, '/');
        if (yol.includes('../') || yol.startsWith('/')) {
          zipfile.readEntry();
          return;
        }

        const boyut = girisEntry.uncompressedSize || 0;

        if (yol.endsWith('.js') || yol.endsWith('.json') || yol.endsWith('.html') || yol.endsWith('.css')) {
          acikToplam += boyut;
        }

        if (acikToplam > ACIK_TOPLAM_SINIRI) {
          zipfile.close();
          return reject(new Error(`Paket açıldığında analiz edilebilir kod boyutu sınırını aşıyor (${(ACIK_TOPLAM_SINIRI / 1024 / 1024).toFixed(0)} MB üzeri).`));
        }

        kayitlar.push({ yol, boyut, entry: girisEntry });
        zipfile.readEntry();
      });

      zipfile.on('error', () => {
        reject(new Error('Paket açılamadı, arşiv bozuk olabilir.'));
      });

      zipfile.on('end', () => {
        if (kayitlar.length === 0) return reject(new Error('Paketin içinde dosya bulunamadı.'));
        resolve({ kayitlar, zipfile, format, crxSurumu });
      });

      zipfile.readEntry();
    });
  });
}

function dosyaIcerigiOku(zipfile, kayit) {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(kayit.entry, (hata, akis) => {
      if (hata) return reject(hata);

      const parcalar = [];
      akis.on('data', (p) => parcalar.push(p));
      akis.on('end', () => resolve(Buffer.concat(parcalar)));
      akis.on('error', reject);
    });
  });
}

function kayitBul(kayitlar, yol) {
  return kayitlar.find((k) => k.yol === yol) || null;
}

module.exports = { paketiAc, dosyaIcerigiOku, kayitBul };