// CLOE te organiza · Service Worker
// Estrategia: network-first para HTML/JS/CSS (siempre intenta lo último,
// usa cache solo si estás offline). Así no quedas atrapado en versiones viejas.

const CACHE = 'cloe-v6';
const SHELL = [
  '/', '/index.html', '/app.html', '/admin.html',
  '/styles.css', '/shared.js', '/app.js', '/admin.js', '/config.js',
  '/manifest.json', '/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // No tocar peticiones a Supabase ni a otros dominios
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
