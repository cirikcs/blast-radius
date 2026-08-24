'use strict';

const el = (kimlik) => document.getElementById(kimlik);

const bolumler = {
  giris: el('giris'),
  yukleniyor: el('yukleniyor'),
  rapor: el('rapor'),
};

let acikIstek = null;

function goster(ad) {
  for (const [anahtar, dugum] of Object.entries(bolumler)) {
    dugum.hidden = anahtar !== ad;
  }
}

function hataGoster(mesaj) {
  const kutu = el('hata');
  kutu.textContent = mesaj;
  kutu.hidden = false;
}

function hatayiTemizle() {
  el('hata').hidden = true;
}

async function istekYap(adres, secenekler, mesaj) {
  hatayiTemizle();
  el('yuklemeMetni').textContent = mesaj;
  goster('yukleniyor');

  acikIstek = new AbortController();

  try {
    const yanit = await fetch(adres, { ...secenekler, signal: acikIstek.signal });
    const veri = await yanit.json();

    if (!yanit.ok) {
      goster('giris');
      hataGoster(veri.hata || 'Paket analiz edilemedi.');
      return;
    }

    raporuCiz(veri);
    goster('rapor');
    window.scrollTo({ top: 0 });
  } catch (hata) {
    goster('giris');
    if (hata.name !== 'AbortError') hataGoster('Sunucuya ulaşılamadı.');
  } finally {
    acikIstek = null;
  }
}

function analizGonder(dosya) {
  const govde = new FormData();
  govde.append('paket', dosya);
  return istekYap('/api/analiz', { method: 'POST', body: govde }, 'Kod inceleniyor');
}

function magazadanGetir(kimlik) {
  return istekYap(
    '/api/magaza',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kimlik }),
    },
    'Paket indiriliyor'
  );
}

function raporuCiz(r) {
  el('eklentiAd').textContent = r.eklenti.ad;

  const kunye = el('kunye');
  kunye.textContent = `${r.eklenti.surum} · eklenti dosyası sürüm ${r.eklenti.manifestSurumu} · ${r.eklenti.paketFormati}`;
  if (r.eklenti.magazaKimligi) {
    const platformAdlari = { chrome: 'Chrome Web Store', firefox: 'Firefox Add-ons', edge: 'Edge Add-ons' };
    const etiket = document.createElement('span');
    etiket.className = 'kimlik-etiket';
    etiket.textContent = platformAdlari[r.eklenti.magazaPlatformu] || r.eklenti.magazaKimligi;
    kunye.appendChild(etiket);
  }

  olcutuCiz(r.sonuc);
  yetenekleriCiz(r.yetenekler);
  defteriCiz(r.izinler, r.kapsam);
  bulgulariCiz(r.kod.sinyaller);
  alanlariCiz(r.kod.alanAdlari);
  uyarilariCiz(r.manifestUyarilari);
  iyileriCiz(r.iyiSinyaller);
}

function olcutuCiz(sonuc) {
  for (const basamak of el('olcutRay').children) {
    basamak.dataset.etkin = basamak.dataset.harf === sonuc.harf ? '1' : '0';
  }
  el('olcutEtiket').textContent = sonuc.etiket;
}

function yetenekleriCiz(yetenekler) {
  const liste = el('yetenekler');
  el('yetenekBolum').hidden = false;

  if (!yetenekler.length) {
    liste.innerHTML = '<p class="bos">Yetkilerin birleşiminden doğan belirgin bir erişim bulunmadı.</p>';
    return;
  }

  liste.innerHTML = yetenekler.map((y) => `<li>${y}</li>`).join('');
}

function defteriCiz(izinler, kapsam) {
  el('kapsamNot').textContent = `Site erişimi: ${kapsam.etiket}`;

  const defter = el('defter');

  if (!izinler.length) {
    defter.innerHTML = '<p class="bos">Eklenti hiçbir izin istemiyor.</p>';
    return;
  }

  defter.innerHTML = '';

  for (const izin of izinler) {
    const satir = document.createElement('div');
    satir.className = 'satir';

    const ad = document.createElement('span');
    ad.className = 'satir-ad';
    ad.dataset.seviye = izin.seviye;
    ad.textContent = izin.izin;

    const yetenek = document.createElement('p');
    yetenek.className = 'satir-yetenek';
    yetenek.textContent = izin.yetenek;

    satir.append(ad, yetenek);
    defter.appendChild(satir);
  }
}

function bulgulariCiz(sinyaller) {
  el('sinyaller').innerHTML = sinyaller
    .map(
      (s) =>
        `<div class="bulgu"><span>${s.ad}</span>` +
        `<span class="sag">${s.dosyalar.length} dosya</span></div>`
    )
    .join('');
  kodKartiniGuncelle();
}

function alanlariCiz(alanlar) {
  el('alanBolum').hidden = !alanlar.length;
  el('alanlar').innerHTML = alanlar
    .map((a) => `<li>${a.alan} <span class="adet">${a.adet}</span></li>`)
    .join('');
}

function uyarilariCiz(uyarilar) {
  el('manifestBolum').hidden = !uyarilar.length;
  el('uyarilar').innerHTML = uyarilar.map((u) => `<li>${u.mesaj}</li>`).join('');
  kodKartiniGuncelle();
}

function kodKartiniGuncelle() {
  const sinyalVar = el('sinyaller').children.length > 0;
  const uyariVar = el('uyarilar').children.length > 0;
  el('kodBolum').hidden = !sinyalVar && !uyariVar;
}

function iyileriCiz(iyiler) {
  el('iyiBolum').hidden = !iyiler.length;
  el('iyiler').innerHTML = iyiler.map((s) => `<li>${s.mesaj}</li>`).join('');
}

const girdi = el('dosya');
const birak = el('birak');
const kimlikGirdisi = el('kimlik');

el('sec').addEventListener('click', () => girdi.click());

girdi.addEventListener('change', () => {
  if (girdi.files[0]) analizGonder(girdi.files[0]);
});

['dragenter', 'dragover'].forEach((tur) =>
  birak.addEventListener(tur, (olay) => {
    olay.preventDefault();
    birak.classList.add('uzerinde');
  })
);

['dragleave', 'drop'].forEach((tur) =>
  birak.addEventListener(tur, (olay) => {
    olay.preventDefault();
    birak.classList.remove('uzerinde');
  })
);

birak.addEventListener('drop', (olay) => {
  const dosya = olay.dataTransfer.files[0];
  if (dosya) analizGonder(dosya);
});

function magazaTetikle() {
  const deger = kimlikGirdisi.value.trim();
  if (!deger) {
    hataGoster('Mağaza adresi veya eklenti kimliği girin.');
    return;
  }
  magazadanGetir(deger);
}

el('cek').addEventListener('click', magazaTetikle);
kimlikGirdisi.addEventListener('keydown', (olay) => {
  if (olay.key === 'Enter') magazaTetikle();
});

el('iptal').addEventListener('click', () => {
  if (acikIstek) acikIstek.abort();
  goster('giris');
});

el('yeni').addEventListener('click', () => {
  girdi.value = '';
  kimlikGirdisi.value = '';
  hatayiTemizle();
  goster('giris');
  kimlikGirdisi.focus();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

(function () {
  const bildirim = el('yukleme-bildirimi');
  const aciklama = el('yukleme-aciklama');
  const yuklemeButonu = el('yukleme-buton');
  const kapatButonu = el('yukleme-kapat');

  if (!bildirim) return;

  const iPadMi = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  const mobilMi = /Android|iPhone|iPad|iPod|Mobile|webOS/i.test(navigator.userAgent) || iPadMi;

  if (mobilMi) return;

  const zatenYuklu =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (zatenYuklu) return;

  let kapatildiMi = false;

  function bildirimiKapat() {
    kapatildiMi = true;
    bildirim.hidden = true;
  }

  kapatButonu.addEventListener('click', bildirimiKapat);

  let ertelenmisOlay = null;

  window.addEventListener('beforeinstallprompt', (olay) => {
    olay.preventDefault();
    ertelenmisOlay = olay;
    setTimeout(() => {
      if (ertelenmisOlay && !kapatildiMi) bildirim.hidden = false;
    }, 3000);
  });

  yuklemeButonu.addEventListener('click', async () => {
    if (!ertelenmisOlay) return;
    ertelenmisOlay.prompt();
    await ertelenmisOlay.userChoice;
    ertelenmisOlay = null;
    bildirim.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    kapatildiMi = true;
    bildirim.hidden = true;
  });

  const safariMi = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (safariMi) {
    aciklama.textContent = 'Paylaş → Dock\'a Ekle, sonra masaüstüne sürükle.';
    aciklama.hidden = false;
    yuklemeButonu.hidden = true;
    setTimeout(() => {
      if (!kapatildiMi) bildirim.hidden = false;
    }, 3000);
  }
})();
