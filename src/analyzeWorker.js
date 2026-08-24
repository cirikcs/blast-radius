'use strict';

const { parentPort, workerData } = require('worker_threads');
const { analizEt } = require('./analyze');

(async () => {
  try {
    const sonuc = await analizEt(workerData.dosyaYolu);
    parentPort.postMessage({ tip: 'basarili', sonuc });
  } catch (hata) {
    parentPort.postMessage({ tip: 'hata', mesaj: hata.message });
  }
})();