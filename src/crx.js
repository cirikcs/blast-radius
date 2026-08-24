'use strict';

const SIHIRLI_SAYI = 'Cr24';

function crxBasliginiAt(tampon) {
  if (tampon.length < 16) {
    throw new Error('Dosya bir eklenti paketi olamayacak kadar küçük.');
  }

  const sihirli = tampon.toString('utf8', 0, 4);

  if (sihirli.startsWith('PK')) {
    return { veri: tampon, format: 'zip', crxSurumu: null };
  }

  if (sihirli !== SIHIRLI_SAYI) {
    throw new Error('Dosya tanınmadı. Beklenen bir .crx veya .zip paketi.');
  }

  const crxSurumu = tampon.readUInt32LE(4);

  if (crxSurumu === 3) {
    const baslikUzunlugu = tampon.readUInt32LE(8);
    return { veri: tampon.subarray(12 + baslikUzunlugu), format: 'crx', crxSurumu: 3 };
  }

  if (crxSurumu === 2) {
    const anahtarUzunlugu = tampon.readUInt32LE(8);
    const imzaUzunlugu = tampon.readUInt32LE(12);
    return { veri: tampon.subarray(16 + anahtarUzunlugu + imzaUzunlugu), format: 'crx', crxSurumu: 2 };
  }

  throw new Error(`Desteklenmeyen CRX sürümü: ${crxSurumu}`);
}

module.exports = { crxBasliginiAt };