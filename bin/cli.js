#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { analizEt } = require('../src/analyze');

const RENK = {
  sifirla: '\x1b[0m',
  kalin: '\x1b[1m',
  soluk: '\x1b[2m',
  kirmizi: '\x1b[31m',
  sari: '\x1b[33m',
  yesil: '\x1b[32m',
};

const NOT_RENGI = { A: RENK.yesil, B: RENK.yesil, C: RENK.sari, D: RENK.kirmizi, E: RENK.kirmizi };

function baslik(metin) {
  console.log(`\n${RENK.kalin}${metin}${RENK.sifirla}`);
  console.log('-'.repeat(metin.length));
}

async function main() {
  const yol = process.argv[2];
  if (!yol) {
    console.error('Kullanım: node bin/cli.js <paket.crx|paket.zip>');
    process.exit(1);
  }

  let rapor;
  try {
    rapor = await analizEt(fs.readFileSync(yol));
  } catch (hata) {
    console.error(`${RENK.kirmizi}Analiz basarisiz: ${hata.message}${RENK.sifirla}`);
    process.exit(1);
  }

  const { eklenti, sonuc } = rapor;
  const renk = NOT_RENGI[sonuc.harf] || '';

  console.log(`\n${RENK.kalin}${eklenti.ad}${RENK.sifirla} ${RENK.soluk}s.${eklenti.surum} · manifest v${eklenti.manifestSurumu}${RENK.sifirla}`);
  console.log(`${renk}${RENK.kalin}${sonuc.harf}${RENK.sifirla} ${renk}${sonuc.etiket} (${sonuc.olcek}/100)${RENK.sifirla}`);
  console.log(`${RENK.soluk}host ${sonuc.dagilim.hostErisimi} · izinler ${sonuc.dagilim.izinler} · kombinasyon ${sonuc.dagilim.kombinasyonlar} · kod ${sonuc.dagilim.kod} · manifest ${sonuc.dagilim.manifest}${RENK.sifirla}`);

  if (rapor.yetenekler.length) {
    baslik('Bu eklenti neler yapabilir');
    rapor.yetenekler.forEach((y) => console.log(`  ${RENK.kirmizi}!${RENK.sifirla} ${y}`));
  }

  if (rapor.kombinasyonlar.length) {
    baslik('İzin kombinasyonları');
    rapor.kombinasyonlar.forEach((k) => {
      console.log(`  [${k.seviye}] ${RENK.kalin}${k.ad}${RENK.sifirla} (+${k.puan})`);
      console.log(`      ${RENK.soluk}${k.aciklama}${RENK.sifirla}`);
    });
  }

  baslik(`İzinler — site erişimi: ${rapor.kapsam.etiket} (${rapor.kapsam.puan} puan, x${rapor.kapsam.carpan})`);
  if (!rapor.izinler.length) console.log('  (izin istenmemiş)');
  rapor.izinler.forEach((i) => {
    const k = i.kapsamUygulandi ? ` ${RENK.soluk}[kapsam uygulandi]${RENK.sifirla}` : '';
    console.log(`  ${String(i.puan).padStart(5)}  ${i.izin}${k}`);
    console.log(`         ${RENK.soluk}${i.yetenek}${RENK.sifirla}`);
  });

  if (rapor.kod.sinyaller.length) {
    baslik('Kod sinyalleri');
    rapor.kod.sinyaller.forEach((s) =>
      console.log(`  +${s.agirlik}  ${s.ad} ${RENK.soluk}(${s.dosyalar.length} dosya)${RENK.sifirla}`)
    );
  }

  if (rapor.kod.alanAdlari.length) {
    baslik('Kodda geçen alan adları');
    rapor.kod.alanAdlari.forEach((a) => console.log(`  ${a.alan} ${RENK.soluk}(${a.adet})${RENK.sifirla}`));
  }

  if (rapor.manifestUyarilari.length) {
    baslik('Riskli durumlar');
    rapor.manifestUyarilari.forEach((u) => console.log(`  +${u.puan}  ${u.mesaj}`));
  }

  if (rapor.iyiSinyaller.length) {
    baslik('Olumlu işaretler');
    rapor.iyiSinyaller.forEach((s) => console.log(`  ${RENK.yesil}+${RENK.sifirla} ${s.mesaj}`));
  }

  console.log();
}

main().catch((hata) => {
  console.error(`${RENK.kirmizi}Beklenmeyen hata: ${hata.message}${RENK.sifirla}`);
  process.exit(1);
});
