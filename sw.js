const CACHE_NAME = 'sky-index-shell-v1';
// Only the static shell is cached. API calls to Open-Meteo are intentionally
// NEVER cached here — this tool's entire value is fresh forecast data, and a
// cached weather response would be actively misleading rather than just stale.
const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept anything cross-origin (Open-Meteo, air quality API, fonts) —
  // those must always go live to the network.
  if (url.origin !== self.location.origin) return;

  // Same-origin shell files: cache-first, so the app still opens offline,
  // falling back to network for anything not precached.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
