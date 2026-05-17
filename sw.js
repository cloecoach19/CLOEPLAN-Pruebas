// CLOE te organiza · Service Worker
// Estrategia: network-first para todo del propio dominio (siempre intenta
// la última versión; usa cache solo si estás offline).
// Auto-actualización: cuando se instala una versión nueva, salta directo
// a active y avisa a todas las pestañas/clientes para que recarguen.

const CACHE = 'cloe-v12';
const SHELL = [
  '/', '/index.html', '/app.html', '/admin.html',
  '/styles.css', '/shared.js', '/app.js', '/admin.js', '/config.js',
  '/manifest.json', '/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())   // no esperamos; activamos enseguida
  );
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Borrar caches viejas
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    // Tomar el control de todas las pestañas abiertas
    await self.clients.claim();
    // Avisar a los clientes para que se recarguen y vean la nueva versión
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'SW_ACTIVATED', version: CACHE });
    }
  })());
});

// Mensajes desde el cliente (p.ej. para forzar el salto de "waiting" → "active")
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
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
