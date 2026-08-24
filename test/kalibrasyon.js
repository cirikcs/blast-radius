'use strict';

const fs = require('fs');
const path = require('path');
const { analizEt } = require('../src/analyze');

const BEKLENEN = [
  { dosya: 'temiz.zip', beklenen: ['A'], gerekce: 'Dar izin, host erisimi yok' },
  { dosya: 'engelleyici.zip', beklenen: ['B', 'C'], gerekce: 'Mesru ama tum sitelere erisimli' },
  { dosya: 'ara.zip', beklenen: ['B', 'C'], gerekce: 'Tum sitelerde kod calistiriyor' },
  { dosya: 'agresif.zip', beklenen: ['E'], gerekce: 'Veri sizdirma ve oturum calma yetenegi' },
];

async function calistir() {
  let basarisiz = 0;

  console.log('\nKALIBRASYON');
  console.log('='.repeat(78));
  console.log(
    'PAKET'.padEnd(20) + 'NOT'.padEnd(6) + 'PUAN'.padEnd(7) + 'BEKLENEN'.padEnd(11) + 'SONUC'
  );
  console.log('-'.repeat(78));

  for (const durum of BEKLENEN) {
    const yol = path.join(__dirname, durum.dosya);

    if (!fs.existsSync(yol)) {
      console.log(`${durum.dosya.padEnd(20)}paket yok — once: node test/fixtures.js`);
      basarisiz++;
      continue;
    }

    try {
      const r = await analizEt(yol);
      const gecti = durum.beklenen.includes(r.sonuc.harf);
      if (!gecti) basarisiz++;

      console.log(
        durum.dosya.padEnd(20) +
        r.sonuc.harf.padEnd(6) +
        String(r.sonuc.olcek).padEnd(7) +
        durum.beklenen.join('/').padEnd(11) +
        (gecti ? 'gecti' : 'KALDI')
      );
      console.log(`${''.padEnd(20)}${durum.gerekce}`);

      const d = r.sonuc.dagilim;
      console.log(
        `${''.padEnd(20)}host ${d.hostErisimi} · izin ${d.izinler} · kombinasyon ${d.kombinasyonlar} · kod ${d.kod} · manifest ${d.manifest}\n`
      );
    } catch (err) {
      basarisiz++;
      console.log(`${durum.dosya.padEnd(20)}HATA: ${err.message}\n`);
    }
  }

  console.log('='.repeat(78));
  console.log(basarisiz === 0 ? 'Tum durumlar gecti.' : `${basarisiz} durum kaldi.`);
  console.log();

  process.exit(basarisiz === 0 ? 0 : 1);
}

calistir();