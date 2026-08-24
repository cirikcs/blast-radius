'use strict';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (olay) => {
  olay.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (olay) => {
  olay.respondWith(fetch(olay.request));
});
