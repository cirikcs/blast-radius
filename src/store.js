'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

const KIMLIK_DESENI = /^[a-p]{32}$/;

const CHROME_ADRESI =
  'https://clients2.google.com/service/update2/crx' +
  '?response=redirect&acceptformat=crx2,crx3&prodversion=9999.0.9999.999&x=id%3D{KIMLIK}%26uc';

const EDGE_ADRESI =
  'https://edge.microsoft.com/extensionwebstorebase/v1/crx' +
  '?response=redirect&prod=chromiumcrx&prodchannel=&prodversion=9999.0.9999.999' +
  '&x=id%3D{KIMLIK}%26installsource%3Dondemand%26uc';

const AMO_API_ADRESI = 'https://addons.mozilla.org/api/v5/addons/addon/{TANIMLAYICI}/';

function kaynagiCoz(girdi) {
  const metin = String(girdi || '').trim();

  if (/addons\.mozilla\.org/i.test(metin)) {
    const eslesme = metin.match(/\/addon\/([a-z0-9_-]+)/i);
    if (eslesme) return { platform: 'firefox', tanimlayici: eslesme[1] };
  }

  if (/microsoftedge\.microsoft\.com\/addons/i.test(metin)) {
    const eslesme = metin.match(/\/([a-p]{32})(?:[/?]|$)/i);
    if (eslesme) return { platform: 'edge', tanimlayici: eslesme[1].toLowerCase() };
  }

  if (/chromewebstore\.google\.com|chrome\.google\.com\/webstore/i.test(metin)) {
    const eslesme = metin.match(/([a-p]{32})/i);
    if (eslesme) return { platform: 'chrome', tanimlayici: eslesme[1].toLowerCase() };
  }

  if (KIMLIK_DESENI.test(metin)) {
    return { platform: 'chrome', tanimlayici: metin };
  }

  const serbest = metin.match(/([a-p]{32})/i);
  if (serbest) return { platform: 'chrome', tanimlayici: serbest[1].toLowerCase() };

  throw new Error(
    'Eklenti kimliği bulunamadı. Chrome Web Store, Firefox Add-ons ya da Edge Add-ons adresini veya kimliği girin.'
  );
}

async function diskeStreamEt(yanit, hedefYol, sinirBayt) {
  if (yanit.status === 404) {
    throw new Error('Mağazada eklenti bulunamadı.');
  }
  if (!yanit.ok) {
    throw new Error(`Mağaza ${yanit.status} döndü.`);
  }

  const bildirilenBoyut = Number(yanit.headers.get('content-length') || 0);
  if (bildirilenBoyut > sinirBayt) {
    throw new Error(
      `Paket boyut sınırını aşıyor (${(bildirilenBoyut / 1024 / 1024).toFixed(1)} MB, sınır ${(sinirBayt / 1024 / 1024).toFixed(0)} MB).`
    );
  }

  const stream = Readable.fromWeb(yanit.body);
  const writeStream = fs.createWriteStream(hedefYol);
  await pipeline(stream, writeStream);

  const stats = await fs.promises.stat(hedefYol);
  if (stats.size > sinirBayt) {
    await fs.promises.rm(hedefYol, { force: true });
    throw new Error(
      `Paket boyut sınırını aşıyor (${(stats.size / 1024 / 1024).toFixed(1)} MB, sınır ${(sinirBayt / 1024 / 1024).toFixed(0)} MB).`
    );
  }
  if (stats.size < 100) {
    await fs.promises.rm(hedefYol, { force: true });
    throw new Error('Mağazadan geçerli bir paket alınamadı. Eklenti kaldırılmış ya da bölgesel olarak kısıtlanmış olabilir.');
  }
}

async function magazadanIndir(girdi, sinirBayt = 120 * 1024 * 1024) {
  const { platform, tanimlayici } = kaynagiCoz(girdi);
  const hedefYol = path.join(os.tmpdir(), `ext_${Date.now()}_${Math.random().toString(36).slice(2)}.tmp`);

  let indirmeAdresi;
  if (platform === 'chrome') {
    indirmeAdresi = CHROME_ADRESI.replace('{KIMLIK}', tanimlayici);
  } else if (platform === 'edge') {
    indirmeAdresi = EDGE_ADRESI.replace('{KIMLIK}', tanimlayici);
  } else if (platform === 'firefox') {
    const apiAdresi = AMO_API_ADRESI.replace('{TANIMLAYICI}', encodeURIComponent(tanimlayici));
    const apiYaniti = await fetch(apiAdresi, {
      headers: { Accept: 'application/json' },
    });

    if (apiYaniti.status === 404) {
      throw new Error(`Firefox Add-ons'ta ${tanimlayici} adında bir eklenti bulunamadı.`);
    }
    if (!apiYaniti.ok) {
      throw new Error(`Firefox Add-ons API'si ${apiYaniti.status} döndü.`);
    }

    const veri = await apiYaniti.json();
    const cv = veri && veri.current_version;
    indirmeAdresi =
      (cv && cv.file && cv.file.url) ||
      (cv && Array.isArray(cv.files) && cv.files[0] && cv.files[0].url) ||
      null;

    if (!indirmeAdresi) {
      throw new Error(
        'Firefox Add-ons yanıtından indirme adresi çıkarılamadı. API yanıt biçimi beklenenden farklı olabilir.'
      );
    }
  }

  const yanit = await fetch(indirmeAdresi, { redirect: 'follow' });
  await diskeStreamEt(yanit, hedefYol, sinirBayt);

  return { dosyaYolu: hedefYol, kimlik: tanimlayici, platform };
}

module.exports = { magazadanIndir, kaynagiCoz, KIMLIK_DESENI };