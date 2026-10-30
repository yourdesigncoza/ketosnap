importScripts('./version.js');
const VERSION = 'ks-' + self.KS_VERSION;
const ASSETS = ['./', './index.html', './style.css', './app.js', './plan.js', './cloud.js', './manifest.json', './version.js', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png', './fonts/outfit-latin.woff2'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Network first for our own files (so updates land), cache fallback when offline. API calls pass through.
// no-cache makes the browser ask the server every time instead of reusing its own HTTP cache for minutes.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
