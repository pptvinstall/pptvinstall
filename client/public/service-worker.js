
// Service Worker for Picture Perfect TV Install
const CACHE_NAME = 'picture-perfect-cache-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/images/logo.png',
];

// Install event - precache key assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
      })
      .then((cachesToDelete) => {
        return Promise.all(cachesToDelete.map((cacheToDelete) => {
          return caches.delete(cacheToDelete);
        }));
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event strategy: network first, falling back to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  
  // API requests should not be cached
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // For HTML navigation requests, use network-first approach
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }
  
  // For image assets, use cache-first with network fallback
  if (event.request.url.match(/\.(jpe?g|png|gif|svg|webp)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Also update cache in background
            fetch(event.request)
              .then((response) => {
                if (response.ok) {
                  caches.open(CACHE_NAME)
                    .then((cache) => cache.put(event.request, response));
                }
              })
              .catch(() => {});
            
            return cachedResponse;
          }
          
          return fetch(event.request)
            .then((response) => {
              // Cache valid responses
              if (!response || !response.ok) {
                return response;
              }
              
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            });
        })
    );
    return;
  }
  
  // For all other requests, try network first, then cache
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Background sync for offline form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-contact-form') {
    event.waitUntil(syncContactForm());
  } else if (event.tag === 'sync-booking-form') {
    event.waitUntil(syncBookingForm());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/images/logo.png',
    badge: '/images/badge.png',
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url === event.notification.data.url && 'focus' in client) {
              return client.focus();
            }
          }
          
          if (clients.openWindow) {
            return clients.openWindow(event.notification.data.url);
          }
        })
    );
  }
});

// Helper function to sync contact form submissions
async function syncContactForm() {
  const contactFormData = await getStoredContactForms();
  
  for (const formData of contactFormData) {
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        await removeStoredContactForm(formData.id);
      }
    } catch (error) {
      console.error('Failed to sync contact form:', error);
    }
  }
}

// Helper function to sync booking form submissions
async function syncBookingForm() {
  const bookingFormData = await getStoredBookingForms();
  
  for (const formData of bookingFormData) {
    try {
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        await removeStoredBookingForm(formData.id);
      }
    } catch (error) {
      console.error('Failed to sync booking form:', error);
    }
  }
}

// These would be implemented in the IndexedDB
// Placeholder functions for storing and retrieving offline form data
async function getStoredContactForms() {
  return [];
}

async function removeStoredContactForm(id) {
  // Implementation would use IndexedDB
}

async function getStoredBookingForms() {
  return [];
}

async function removeStoredBookingForm(id) {
  // Implementation would use IndexedDB
}
