'use strict';

const acorn = require('acorn');
const walk = require('acorn-walk');
const { dosyaIcerigiOku } = require('./streamPaket');

const ADRES_DESENI = /^https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/i;

const GORMEZDEN_GEL = new Set([
  'www.w3.org',
  'schema.org',
  'developer.chrome.com',
  'github.com',
  'clients2.google.com',
]);

function agacaCevir(kaynak) {
  const secenekler = { ecmaVersion: 'latest', allowHashBang: true, locations: false };
  try {
    return acorn.parse(kaynak, { ...secenekler, sourceType: 'module' });
  } catch (ilkHata) {
    try {
      return acorn.parse(kaynak, { ...secenekler, sourceType: 'script' });
    } catch (ikinciHata) {
      return null;
    }
  }
}

function cagriAdi(dugum) {
  const parcalar = [];
  let g = dugum;
  while (g) {
    if (g.type === 'Identifier') {
      parcalar.unshift(g.name);
      break;
    }
    if (g.type === 'MemberExpression' && !g.computed) {
      if (g.property.type === 'Identifier') parcalar.unshift(g.property.name);
      g = g.object;
      continue;
    }
    break;
  }
  return parcalar.join('.');
}

function sabitMetinMi(dugum) {
  return dugum && dugum.type === 'Literal' && typeof dugum.value === 'string';
}

function biter(ad, isim) {
  return ad === isim || ad.endsWith('.' + isim);
}

function tekDosyayiTara(kaynak, bulgular, alanAdlari) {
  const agac = agacaCevir(kaynak);
  if (!agac) return { ayristirildi: false };

  walk.simple(agac, {
    CallExpression(dugum) {
      const ad = cagriAdi(dugum.callee);

      if (ad === 'eval') {
        bulgular.dinamik_kod = (bulgular.dinamik_kod || 0) + 1;
      }

      if ((ad === 'setTimeout' || ad === 'setInterval') && dugum.arguments[0]) {
        if (sabitMetinMi(dugum.arguments[0])) {
          bulgular.dinamik_kod = (bulgular.dinamik_kod || 0) + 1;
        }
      }

      if (biter(ad, 'importScripts')) {
        bulgular.uzaktan_kod = (bulgular.uzaktan_kod || 0) + 1;
      }

      if (biter(ad, 'fetch') || ad === 'navigator.sendBeacon') {
        bulgular.dis_istek = (bulgular.dis_istek || 0) + 1;
        const ilkArg = dugum.arguments[0];
        if (sabitMetinMi(ilkArg)) {
          const eslesme = ilkArg.value.match(ADRES_DESENI);
          if (eslesme) {
            const alan = eslesme[1].toLowerCase();
            if (!GORMEZDEN_GEL.has(alan)) {
              alanAdlari.set(alan, (alanAdlari.get(alan) || 0) + 1);
            }
          }
        }
      }

      if (ad === 'chrome.cookies.getAll' || ad === 'chrome.cookies.get' || ad === 'chrome.cookies.set') {
        bulgular.cerez_erisimi = (bulgular.cerez_erisimi || 0) + 1;
      }

      if (biter(ad, 'addEventListener') && sabitMetinMi(dugum.arguments[0])) {
        const olay = dugum.arguments[0].value;
        if (['keydown', 'keypress', 'keyup'].includes(olay)) {
          bulgular.tus_dinleyici = (bulgular.tus_dinleyici || 0) + 1;
        }
        if (olay === 'submit') {
          bulgular.form_dinleyici = (bulgular.form_dinleyici || 0) + 1;
        }
      }

      if (biter(ad, 'localStorage.getItem') || biter(ad, 'sessionStorage.getItem')) {
        bulgular.depolama_okuma = (bulgular.depolama_okuma || 0) + 1;
      }
    },

    NewExpression(dugum) {
      const ad = cagriAdi(dugum.callee);
      if (ad === 'Function') {
        bulgular.dinamik_kod = (bulgular.dinamik_kod || 0) + 1;
      }
      if (ad === 'XMLHttpRequest') {
        bulgular.dis_istek = (bulgular.dis_istek || 0) + 1;
      }
    },

    AssignmentExpression(dugum) {
      if (
        dugum.left.type === 'MemberExpression' &&
        !dugum.left.computed &&
        dugum.left.property.type === 'Identifier' &&
        dugum.left.property.name === 'src' &&
        sabitMetinMi(dugum.right) &&
        /^https?:\/\//i.test(dugum.right.value)
      ) {
        bulgular.uzaktan_kod = (bulgular.uzaktan_kod || 0) + 1;
      }
    },

    MemberExpression(dugum) {
      if (
        !dugum.computed &&
        dugum.property.type === 'Identifier' &&
        dugum.property.name === 'cookie' &&
        dugum.object.type === 'Identifier' &&
        dugum.object.name === 'document'
      ) {
        bulgular.cerez_erisimi = (bulgular.cerez_erisimi || 0) + 1;
      }
    },
  });

  return { ayristirildi: true };
}

function regexIleHafifTara(kaynak, bulgular, alanAdlari) {
  if (/\beval\s*\(/.test(kaynak)) bulgular.dinamik_kod = (bulgular.dinamik_kod || 0) + 1;
  if (/\bnew\s+Function\s*\(/.test(kaynak)) bulgular.dinamik_kod = (bulgular.dinamik_kod || 0) + 1;
  if (/\bimportScripts\s*\(/.test(kaynak)) bulgular.uzaktan_kod = (bulgular.uzaktan_kod || 0) + 1;
  if (/\.src\s*=\s*['"`]https?:\/\//i.test(kaynak)) bulgular.uzaktan_kod = (bulgular.uzaktan_kod || 0) + 1;
  if (/\bfetch\s*\(|\bnavigator\.sendBeacon\s*\(|\bnew\s+XMLHttpRequest\b/.test(kaynak)) {
    bulgular.dis_istek = (bulgular.dis_istek || 0) + 1;
  }
  if (/\bchrome\.cookies\.(getAll|get|set)\b|document\.cookie\b/.test(kaynak)) {
    bulgular.cerez_erisimi = (bulgular.cerez_erisimi || 0) + 1;
  }
  if (/\baddEventListener\s*\(\s*['"`](keydown|keypress|keyup)['"`]/.test(kaynak)) {
    bulgular.tus_dinleyici = (bulgular.tus_dinleyici || 0) + 1;
  }
  if (/\baddEventListener\s*\(\s*['"`]submit['"`]/.test(kaynak)) {
    bulgular.form_dinleyici = (bulgular.form_dinleyici || 0) + 1;
  }
  if (/\b(localStorage|sessionStorage)\.getItem\b/.test(kaynak)) {
    bulgular.depolama_okuma = (bulgular.depolama_okuma || 0) + 1;
  }

  const urlEslesmeleri = kaynak.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi);
  for (const eslesme of urlEslesmeleri) {
    const alan = eslesme[1].toLowerCase();
    if (!GORMEZDEN_GEL.has(alan)) {
      alanAdlari.set(alan, (alanAdlari.get(alan) || 0) + 1);
    }
  }
}

const SINYAL_META = {
  uzaktan_kod: { ad: 'Uzaktan kod yükleme', agirlik: 12 },
  dinamik_kod: { ad: 'Dinamik kod çalıştırma', agirlik: 8 },
  dis_istek: { ad: 'Harici sunucuya istek', agirlik: 6 },
  cerez_erisimi: { ad: 'Çerez okuma', agirlik: 7 },
  tus_dinleyici: { ad: 'Tuş vuruşu dinleme', agirlik: 9 },
  form_dinleyici: { ad: 'Form gönderimi dinleme', agirlik: 7 },
  depolama_okuma: { ad: 'Sayfa depolamasını okuma', agirlik: 5 },
};

async function kodAnalizi(kayitlar, zipfile) {
  const jsKayitlari = kayitlar.filter((k) => k.yol.toLowerCase().endsWith('.js'));
  const bulunanSinyaller = new Map();
  const alanAdlari = new Map();
  let toplamPuan = 0;
  let tarananBayt = 0;
  let ayristirilamayanDosya = 0;

  const AST_UST_SINIRI = 800 * 1024;
  const DOSYA_OKUMA_UST_SINIRI = 5 * 1024 * 1024;

  for (const kayit of jsKayitlari) {
    if (kayit.boyut > DOSYA_OKUMA_UST_SINIRI) {
      ayristirilamayanDosya++;
      continue;
    }

    const ham = await dosyaIcerigiOku(zipfile, kayit);
    const icerik = ham.toString('utf8');
    tarananBayt += icerik.length;

    const bulgular = {};

    if (kayit.boyut > AST_UST_SINIRI) {
      regexIleHafifTara(icerik, bulgular, alanAdlari);
    } else {
      const { ayristirildi } = tekDosyayiTara(icerik, bulgular, alanAdlari);
      if (!ayristirildi) {
        regexIleHafifTara(icerik, bulgular, alanAdlari);
        ayristirilamayanDosya++;
      }
    }

    for (const kimlik of Object.keys(bulgular)) {
      const meta = SINYAL_META[kimlik];
      if (!meta) continue;

      if (!bulunanSinyaller.has(kimlik)) {
        bulunanSinyaller.set(kimlik, { kimlik, ad: meta.ad, agirlik: meta.agirlik, dosyalar: [] });
        toplamPuan += meta.agirlik;
      }
      bulunanSinyaller.get(kimlik).dosyalar.push(kayit.yol);
    }
  }

  const alanListesi = [...alanAdlari.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([alan, adet]) => ({ alan, adet }));

  return {
    sinyaller: [...bulunanSinyaller.values()],
    alanAdlari: alanListesi,
    toplam: toplamPuan,
    istatistik: {
      dosyaSayisi: jsKayitlari.length,
      tarananBayt,
      ayristirilamayanDosya,
    },
  };
}

module.exports = { kodAnalizi };