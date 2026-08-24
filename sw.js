const CACHE_NAME = 'sky-index-shell-v2';
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

  // index.html (including the bare '/' request a browser sends on load) is now
  // network-FIRST: always try to fetch the live, current file first, and only
  // fall back to the cached copy if the network request fails (i.e. offline).
  // This was previously cache-first, which meant a code update could sit
  // deployed on GitHub Pages but never actually reach a browser that already
  // had the app installed — the service worker only re-checks its own file for
  // changes, not index.html, so a stale scoring version could silently keep
  // running indefinitely. Network-first for the shell's entry point closes
  // that gap; the offline fallback still works via the cache below.
  const isHtmlShell = url.pathname.endsWith('index.html') || url.pathname === '/' || url.pathname.endsWith('/');
  if (isHtmlShell) {
    event.respondWith(
      fetch(event.request)
        .then((fresh) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, fresh.clone()));
          return fresh;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Icons and manifest change rarely, if ever — cache-first is fine for those.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
