'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { analizEtIzoleEdilmis } = require('./src/analyzeIsolated');
const { magazadanIndir } = require('./src/store');

const app = express();
const PORT = process.env.PORT || 3000;
const BOYUT_SINIRI = 120 * 1024 * 1024;

const yukleme = multer({
  dest: os.tmpdir(),
  limits: { fileSize: BOYUT_SINIRI },
  fileFilter: (req, dosya, cb) => {
    const ad = dosya.originalname.toLowerCase();
    if (ad.endsWith('.crx') || ad.endsWith('.zip')) return cb(null, true);
    cb(new Error('Yalnızca .crx veya .zip paketleri kabul ediliyor.'));
  },
});

app.use(express.json({ limit: '4kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/saglik', (req, res) => {
  res.status(200).type('text/plain').send('tamam');
});

app.post('/api/analiz', yukleme.single('paket'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ hata: 'Paket dosyası gönderilmedi.' });
  }

  const dosyaYolu = req.file.path;
  try {
    const rapor = await analizEtIzoleEdilmis(dosyaYolu);
    res.json(rapor);
  } catch (hata) {
    res.status(422).json({ hata: hata.message });
  } finally {
    await fs.promises.rm(dosyaYolu, { force: true }).catch(() => { });
  }
});

app.post('/api/magaza', async (req, res) => {
  const girdi = req.body && req.body.kimlik;

  if (!girdi || typeof girdi !== 'string') {
    return res.status(400).json({ hata: 'Eklenti kimliği veya mağaza adresi gönderilmedi.' });
  }

  let indirilen;
  try {
    indirilen = await magazadanIndir(girdi, BOYUT_SINIRI);
  } catch (hata) {
    return res.status(400).json({ hata: hata.message });
  }

  try {
    const rapor = await analizEtIzoleEdilmis(indirilen.dosyaYolu);
    rapor.eklenti.magazaKimligi = indirilen.kimlik;
    rapor.eklenti.magazaPlatformu = indirilen.platform;
    res.json(rapor);
  } catch (hata) {
    res.status(422).json({ hata: hata.message });
  } finally {
    if (indirilen && indirilen.dosyaYolu) {
      await fs.promises.rm(indirilen.dosyaYolu, { force: true }).catch(() => { });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Blast Radius çalışıyor: http://localhost:${PORT}`);
});