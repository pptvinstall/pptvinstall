const CACHE_NAME = 'pptvinstall-v3';
const CACHE_PREFIX = 'pptvinstall-';
const MAX_MEDIA_ENTRIES = 64;

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => new Response(JSON.stringify({
      message: 'You appear to be offline.',
    }), { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })));
    return;
  }

  // The HTTP cache handles hashed code. Never store app HTML or private routes.
  if (request.mode === 'navigate' || request.destination === 'script' ||
      request.destination === 'style' || url.pathname.startsWith('/assets/')) {
    event.respondWith(fetch(request).catch(() => new Response(
      'Unable to load this page. Reconnect and retry, or call 404-702-4748.',
      { status: 503, headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } }
    )));
    return;
  }

  if (request.destination === 'image' || request.destination === 'font') {
    const response = fetch(request);
    event.waitUntil(response.then(async (result) => {
      if (!result.ok || /no-store|private/i.test(result.headers.get('Cache-Control') || '')) return;
      const clone = result.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, clone);
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_MEDIA_ENTRIES)).map((key) => cache.delete(key)));
    }).catch(() => {}));
    event.respondWith(response.catch(async () => {
      const cached = await caches.match(request).catch(() => undefined);
      return cached || new Response('Offline', { status: 503 });
    }));
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
