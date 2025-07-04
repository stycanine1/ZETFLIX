// ZETFLIX Service Worker for Android App
const CACHE_NAME = 'zetflix-v1.0.0';
const STATIC_CACHE = 'zetflix-static-v1.0.0';
const DYNAMIC_CACHE = 'zetflix-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/main.html',
  '/index.html',
  '/disclaimer.html',
  '/css/home.css',
  '/js/home.js',
  '/manifest.json',
  '/logo.png',
  '/Screenshot_13-removebg-preview.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('ZETFLIX Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('ZETFLIX Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('ZETFLIX Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('ZETFLIX Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('ZETFLIX Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('ZETFLIX Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('ZETFLIX Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached files or fetch from network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external API calls (TMDB, streaming servers)
  if (url.hostname.includes('themoviedb.org') || 
      url.hostname.includes('vidsrc') || 
      url.hostname.includes('videasy') ||
      url.hostname.includes('betteradsystem') ||
      url.hostname.includes('cloudfront')) {
    return fetch(request);
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('ZETFLIX Service Worker: Serving from cache', request.url);
          return cachedResponse;
        }

        // Fetch from network and cache dynamic content
        return fetch(request)
          .then((networkResponse) => {
            // Only cache successful responses
            if (networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            
            return networkResponse;
          })
          .catch((error) => {
            console.error('ZETFLIX Service Worker: Fetch failed', error);
            
            // Return offline page for navigation requests
            if (request.destination === 'document') {
              return caches.match('/main.html');
            }
            
            throw error;
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('ZETFLIX Service Worker: Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('ZETFLIX Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New content available on ZETFLIX!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Watch Now',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('ZETFLIX', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('ZETFLIX Service Worker: Notification clicked');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/main.html')
    );
  }
});

// Background sync function
async function doBackgroundSync() {
  try {
    // Sync user data, my list, etc.
    console.log('ZETFLIX Service Worker: Performing background sync');
    
    // You can add specific sync logic here
    // For example, sync user's "My List" with server
    
    return Promise.resolve();
  } catch (error) {
    console.error('ZETFLIX Service Worker: Background sync failed', error);
    throw error;
  }
}

// Handle app updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

console.log('ZETFLIX Service Worker: Loaded successfully');