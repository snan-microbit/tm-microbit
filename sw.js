const CACHE_NAME = 'ml-microbit-v1';
const MODEL_CACHE = 'tm-models-cache';

// Archivos base de la app
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './js/main.js',
  './js/ble-handler.js',
  './js/tm-handler.js',
  './js/ui-updates.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Lógica de intersección de archivos
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Si la petición es hacia Teachable Machine o Google Cloud (donde viven los modelos)
  if (url.hostname.includes('teachablemachine') || url.hostname.includes('gstatic')) {
    event.respondWith(
      caches.open(MODEL_CACHE).then((cache) => {
        return cache.match(event.request).then((response) => {
          // Si ya está en caché, lo devolvemos (rápido y offline)
          if (response) return response;

          // Si no está, lo buscamos en internet y lo guardamos para la próxima
          return fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  } else {
    // Para los archivos normales de la app
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  }
});
