'use strict';

const { dosyaIcerigiOku, kayitBul } = require('./streamPaket');

const GENIS_DESENLER = ['<all_urls>', '*://*/*', 'http://*/*', 'https://*/*', 'file:///*'];

function yorumlariTemizle(metin) {
  let sonuc = '';
  let dizeIcinde = false;
  let kacis = false;

  for (let i = 0; i < metin.length; i++) {
    const k = metin[i];

    if (dizeIcinde) {
      sonuc += k;
      if (kacis) kacis = false;
      else if (k === '\\') kacis = true;
      else if (k === '"') dizeIcinde = false;
      continue;
    }

    if (k === '"') {
      dizeIcinde = true;
      sonuc += k;
      continue;
    }

    if (k === '/' && metin[i + 1] === '/') {
      while (i < metin.length && metin[i] !== '\n') i++;
      sonuc += '\n';
      continue;
    }

    if (k === '/' && metin[i + 1] === '*') {
      i += 2;
      while (i < metin.length && !(metin[i] === '*' && metin[i + 1] === '/')) i++;
      i++;
      continue;
    }

    sonuc += k;
  }

  return sonuc;
}

function manifestAyristir(ham) {
  const temiz = ham.replace(/^\uFEFF/, '');

  try {
    return JSON.parse(temiz);
  } catch (ilkHata) {
    try {
      return JSON.parse(yorumlariTemizle(temiz));
    } catch (ikinciHata) {
      throw new Error('manifest.json ayrıştırılamadı: ' + ilkHata.message);
    }
  }
}


const MESAJ_DESENI = /^__MSG_(.+)__$/;

async function mesajlariOku(kayitlar, zipfile, dilKodu) {
  if (!dilKodu) return null;
  const yol = `_locales/${dilKodu}/messages.json`;
  const kayit = kayitBul(kayitlar, yol);
  if (!kayit) return null;
  try {
    const ham = await dosyaIcerigiOku(zipfile, kayit);
    return JSON.parse(ham.toString('utf8'));
  } catch {
    return null;
  }
}

function mesajiCoz(deger, mesajlar) {
  if (typeof deger !== 'string') return deger;
  const eslesme = deger.match(MESAJ_DESENI);
  if (!eslesme || !mesajlar) return deger;
  const anahtar = eslesme[1];
  const kayit = mesajlar[anahtar] || mesajlar[anahtar.toLowerCase()];
  return kayit && typeof kayit.message === 'string' ? kayit.message : deger;
}

async function manifestiOku(kayitlar, zipfile) {
  const manifestKaydi = kayitBul(kayitlar, 'manifest.json');
  if (!manifestKaydi) throw new Error('Pakette manifest.json bulunamadı.');

  const hamBuffer = await dosyaIcerigiOku(zipfile, manifestKaydi);
  const ham = hamBuffer.toString('utf8');

  const m = manifestAyristir(ham);

  const surum = m.manifest_version || 2;

  const hamIzinler = [...(m.permissions || []), ...(m.optional_permissions || [])];

  const izinler = [];
  const hostIzinleri = [
    ...(m.host_permissions || []),
    ...(m.optional_host_permissions || []),
  ];

  for (const giris of hamIzinler) {
    if (typeof giris !== 'string') continue;
    if (giris.includes('://') || giris === '<all_urls>') hostIzinleri.push(giris);
    else izinler.push(giris);
  }

  const icerikScriptleri = (m.content_scripts || []).map((cs) => ({
    desenler: cs.matches || [],
    calismaAni: cs.run_at || 'document_idle',
    dosyalar: [...(cs.js || []), ...(cs.css || [])],
  }));

  for (const cs of icerikScriptleri) hostIzinleri.push(...cs.desenler);

  const mesajlar = await mesajlariOku(kayitlar, zipfile, m.default_locale);

  return {
    ad: mesajiCoz(m.name, mesajlar) || '(isimsiz)',
    surum: m.version || '?',
    manifestSurumu: surum,
    aciklama: mesajiCoz(m.description, mesajlar) || '',
    izinler: [...new Set(izinler)],
    hostIzinleri: [...new Set(hostIzinleri)],
    icerikScriptleri,
    csp: m.content_security_policy || null,
    externallyConnectable: m.externally_connectable || null,
    guncellemeAdresi: m.update_url || null,
    arkaPlan: m.background || null,
  };
}

function kapsamHesapla(hostIzinleri, hostTablosu) {
  let anahtar = 'yok';

  if (hostIzinleri && hostIzinleri.length) {
    if (hostIzinleri.some((d) => GENIS_DESENLER.includes(d))) anahtar = 'genis';
    else if (hostIzinleri.some((d) => /:\/\/\*\./.test(d))) anahtar = 'altAlanli';
    else anahtar = 'tekAlan';
  }

  const t = hostTablosu[anahtar];

  return {
    anahtar,
    carpan: t.carpan,
    etiket: t.etiket,
    puan: t.puan,
    aciklama: t.aciklama,
    genis: anahtar === 'genis',
  };
}

function manifestSinyalleri(mf, kurallar) {
  const s = kurallar.manifestSinyalleri;
  const bulgular = [];

  if (mf.manifestSurumu < 3) bulgular.push({ ...s.eskiSurum, kimlik: 'eskiSurum' });

  const cspMetni = JSON.stringify(mf.csp || '');
  if (/unsafe-eval|unsafe-inline|https?:\/\//.test(cspMetni)) {
    bulgular.push({ ...s.gevsekCSP, kimlik: 'gevsekCSP' });
  }

  const ec = mf.externallyConnectable;
  if (ec && Array.isArray(ec.matches) && ec.matches.some((d) => GENIS_DESENLER.includes(d))) {
    bulgular.push({ ...s.genisExternallyConnectable, kimlik: 'genisExternallyConnectable' });
  }

  if (mf.guncellemeAdresi && !/clients2\.google\.com/.test(mf.guncellemeAdresi)) {
    bulgular.push({ ...s.magazaDisiGuncelleme, kimlik: 'magazaDisiGuncelleme' });
  }

  const erkenGenis = mf.icerikScriptleri.some(
    (cs) => cs.calismaAni === 'document_start' && cs.desenler.some((d) => GENIS_DESENLER.includes(d))
  );
  if (erkenGenis) {
    bulgular.push({ ...s.erkenCalisanGenisIcerikScripti, kimlik: 'erkenCalisanGenisIcerikScripti' });
  }

  return bulgular;
}

module.exports = { manifestiOku, kapsamHesapla, manifestSinyalleri, GENIS_DESENLER };
