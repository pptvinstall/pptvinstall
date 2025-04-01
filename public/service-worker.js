// Service worker version
const CACHE_VERSION = 'v1.1.0';
const CACHE_NAME = `pptv-install-cache-${CACHE_VERSION}`;

// Assets to cache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/icons/offline-image.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/badge-72x72.png',
  '/icons/pptv/icon.svg',
  '/icons/pptv/apple-touch-icon.svg',
  '/icons/pptv/apple-touch-icon-precomposed.png',
  '/manifest.json'
];

// Install event - Cache basic resources
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker...', event);
  
  // Skip waiting to activate service worker immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Precaching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .catch(error => {
        console.error('[Service Worker] Precaching failed:', error);
      })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker...', event);
  
  // Clean up old caches
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
  
  return self.clients.claim();
});

// Fetch event - Network first with cache fallback strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  
  // API requests - network only
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // HTML pages - network with offline fallback
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/offline.html');
        })
    );
    return;
  }
  
  // Images - cache first, network fallback
  if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(event.request)
            .then(networkResponse => {
              // Cache the fetched image
              if (networkResponse && networkResponse.ok) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, responseToCache);
                  });
              }
              return networkResponse;
            })
            .catch(() => {
              // If both cache and network fail, return a placeholder image
              return caches.match('/icons/offline-image.svg');
            });
        })
    );
    return;
  }
  
  // Default strategy - stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          })
          .catch(error => {
            console.log('[Service Worker] Fetch failed; returning cached response instead.', error);
          });
          
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// Push notification event
self.addEventListener('push', event => {
  console.log('[Service Worker] Push notification received', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'New Notification',
        body: event.data.text()
      };
    }
  }
  
  const title = data.title || 'PPTVInstall';
  const options = {
    body: data.body || 'Something new happened!',
    icon: data.icon || '/icons/pptv/icon.svg',
    badge: data.badge || '/icons/pptv/apple-touch-icon-precomposed.png',
    data: data.data || {},
    actions: data.actions || [],
    vibrate: [100, 50, 100],
    tag: data.tag || 'default'
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click received', event);
  
  event.notification.close();
  
  // Handle notification click
  const data = event.notification.data;
  const action = event.action;
  
  let url = '/';
  
  // Handle different actions
  if (action === 'view' && data && data.bookingId) {
    url = `/account/bookings/${data.bookingId}`;
  } else if (data && data.type === 'reminder') {
    url = '/account/bookings';
  } else if (data && data.url) {
    url = data.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(windowClients => {
        // Check if there is already a window client open
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});