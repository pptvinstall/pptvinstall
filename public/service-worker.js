// Service Worker for Picture Perfect TV Install PWA

const CACHE_NAME = 'pptv-cache-v3'; // Updated cache version
const ASSETS_TO_CACHE = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon.png',
  '/icons/pptv/apple-touch-icon.png',
  '/icons/pptv/apple-touch-icon-precomposed.png',
  '/icons/offline-image.svg',
  // Apple splash screens
  '/icons/apple-splash-640-1136.png',
  '/icons/apple-splash-750-1334.png',
  '/icons/apple-splash-828-1792.png',
  '/icons/apple-splash-1125-2436.png',
  '/icons/apple-splash-1242-2688.png',
  '/icons/apple-splash-1170-2532.png',
  '/icons/apple-splash-1284-2778.png',
  '/icons/apple-splash-1536-2048.png',
  '/icons/apple-splash-1668-2388.png',
  '/icons/apple-splash-2048-2732.png',
];

// Cache for dynamic content like images
const DYNAMIC_CACHE_NAME = 'pptv-dynamic-cache-v1';

// Install event - cache essential files for offline usage
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...', event);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...', event);
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        // Keep current caches, delete old versions
        if (key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Fetch event - respond with cached content when available
self.addEventListener('fetch', (event) => {
  // For API requests, always go to network
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // For non-API requests, use a caching strategy
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        // Return cached version if available
        return response;
      }
      
      // If not in cache, fetch from network and add to cache for future use
      return fetch(event.request).then((response) => {
        // Only cache successful responses to avoid caching error pages
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        const responseToCache = response.clone();
        
        // Determine which cache to use based on the request
        if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
          // Cache images in dynamic cache
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        } else {
          // Cache other assets in main cache
          caches.open(CACHE_NAME).then((cache) => {
            // Don't cache API responses
            if (!event.request.url.includes('/api/')) {
              cache.put(event.request, responseToCache);
            }
          });
        }
        
        return response;
      }).catch((error) => {
        console.error('[Service Worker] Fetch error:', error);
        
        // If both cache and network fail for image requests, return a fallback
        if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
          return caches.match('/icons/offline-image.svg') || caches.match('/icons/icon-512x512.png');
        }
        
        // For HTML pages, return the offline page
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/offline.html');
        }
        
        // For font files, try to serve any available font
        if (event.request.url.match(/\.(woff|woff2|ttf|otf|eot)$/)) {
          return new Response('Font not available offline', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
        
        // Otherwise, let the error happen
        return new Response('You are offline. Please check your internet connection.', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' },
        });
      });
    })
  );
});

// Listen for message events for service worker communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});