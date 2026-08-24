'use strict';

const path = require('path');
const { Worker } = require('worker_threads');

const WORKER_YOLU = path.join(__dirname, 'analyzeWorker.js');
const ISCI_BELLEK_MB = 350;
const ZAMAN_ASIMI_MS = 60 * 1000;

function analizEtIzoleEdilmis(dosyaYolu) {
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(WORKER_YOLU, {
        workerData: { dosyaYolu },
        resourceLimits: {
          maxOldGenerationSizeMb: ISCI_BELLEK_MB,
          maxYoungGenerationSizeMb: 64,
        },
      });
    } catch (hata) {
      return reject(new Error('Analiz süreci başlatılamadı.'));
    }

    let tamamlandi = false;

    function guvenliSonlandir() {
      try {
        worker.terminate();
      } catch { }
    }

    const zamanAsimi = setTimeout(() => {
      if (tamamlandi) return;
      tamamlandi = true;
      guvenliSonlandir();
      reject(new Error('Analiz zaman aşımına uğradı, paket çok büyük ya da karmaşık olabilir.'));
    }, ZAMAN_ASIMI_MS);

    worker.on('message', (mesaj) => {
      if (tamamlandi) return;
      tamamlandi = true;
      clearTimeout(zamanAsimi);
      guvenliSonlandir();

      if (mesaj.tip === 'basarili') resolve(mesaj.sonuc);
      else reject(new Error(mesaj.mesaj));
    });

    worker.on('error', () => {
      if (tamamlandi) return;
      tamamlandi = true;
      clearTimeout(zamanAsimi);
      guvenliSonlandir();
      reject(new Error('Bu paket analiz edilirken kaynak sınırına takıldı, çok büyük ya da karmaşık olabilir.'));
    });

    worker.on('exit', (kod) => {
      if (tamamlandi) return;
      tamamlandi = true;
      clearTimeout(zamanAsimi);
      if (kod !== 0) {
        reject(new Error('Bu paket analiz edilirken kaynak sınırına takıldı, çok büyük ya da karmaşık olabilir.'));
      }
    });
  });
}

module.exports = { analizEtIzoleEdilmis };