const CACHE_NAME = 'pptvinstall-v2';
const CACHE_PREFIX = 'pptvinstall-';

// Install: activate the newest worker immediately after a deploy.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: delete old PPTVInstall cache versions and control open tabs.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for app code/HTML so deploys do not serve stale route chunks.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // Network-first for all API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => new Response(JSON.stringify({ message: 'You appear to be offline.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }))
    );
    return;
  }

  // Never serve hashed JS/CSS route chunks from the service-worker cache.
  // The browser HTTP cache can still cache these immutable files normally.
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache images/fonts only as a non-critical offline/performance helper.
  if (
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Network-first for navigation requests. Do not cache HTML app shells because
  // an old index can point at deleted hashed chunks after a new deploy.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/').then((cached) => cached || new Response('Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        }))
      )
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request).then((cached) => cached || new Response('', { status: 503 })))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
