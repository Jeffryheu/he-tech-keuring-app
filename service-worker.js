const CACHE_NAME = 'keuring-app-v13';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/db.js',
  './js/checklists.js',
  './js/app.js',
  './vendor/pdf-lib.min.js',
  './js/pdf.js',
  './js/pdf-hulp.js',
  './js/inspectierapport.js',
  './js/share.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/logo-mark.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    // cache: 'reload' slaat de HTTP-cache van de browser over (GitHub Pages: max-age=600),
    // anders kan een nieuwe cacheversie met oude bestanden gevuld worden.
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' }))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
