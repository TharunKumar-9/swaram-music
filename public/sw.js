// Swaram — Service Worker for Offline App Loading
const CACHE_NAME = 'swaram-v7';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json'
];

// Install: Cache static app shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('ServiceWorker asset caching error:', err);
      });
    })
  );
});

// Activate: Delete all previous cache versions immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('ServiceWorker purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// 1. Never cache API routes, proxy streams or external domains in SW
// 2. Network-first for app code (HTML, JS, CSS) so updates apply immediately; fall back to cache when offline
// 3. Cache-first for other static resources
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass API calls
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return;
  }

  // Network-first for application logic and shell so user always gets the latest code
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
      }
      return networkResponse;
    }).catch(() => {
      // Offline fallback
      return caches.match(event.request).then((cached) => {
        if (cached) return cached;
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
