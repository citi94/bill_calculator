// Electricity Bill Calculator Service Worker
const CACHE_NAME = 'electricity-bill-calculator-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/css/components.css',
  '/js/app-combined.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css',
  'https://cdn.jsdelivr.net/npm/flatpickr',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// Install event - cache all essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service worker installed: Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Service worker activated: Clearing old cache', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first strategy for API/data requests, cache first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  
  // For HTML and core assets - network first, then cache
  if (event.request.headers.get('accept')?.includes('text/html') || 
      ASSETS_TO_CACHE.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // If the request is for index.html, return the cached version
              if (event.request.url.includes('/index.html') || url.pathname === '/') {
                return caches.match('/index.html');
              }
            });
        })
    );
  } else {
    // For other assets - cache first, then network
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Return cached response
            return cachedResponse;
          }
          
          // Not in cache, get from network
          return fetch(event.request)
            .then(response => {
              const responseClone = response.clone();
              
              // Cache the response for future
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
              
              return response;
            });
        })
    );
  }
});

// Handle data sync when coming back online
self.addEventListener('sync', event => {
  if (event.tag === 'sync-readings') {
    event.waitUntil(syncReadingsData());
  }
});

// Function to sync queued operations when coming back online
async function syncReadingsData() {
  console.log('Processing queued operations');
  
  try {
    // Get stored operations from IndexedDB or localStorage
    const pendingOperations = JSON.parse(localStorage.getItem('pending_operations') || '[]');
    
    if (pendingOperations.length === 0) {
      console.log('No pending operations to process');
      return;
    }
    
    console.log(`Found ${pendingOperations.length} pending operations`);
    
    for (const operation of pendingOperations) {
      // Apply operations to localStorage
      // This simulates what would be a server sync in a real cloud-based app
      
      if (operation.type === 'saveReading') {
        const readings = JSON.parse(localStorage.getItem('electricity_readings') || '[]');
        readings.push(operation.data);
        localStorage.setItem('electricity_readings', JSON.stringify(readings));
      } else if (operation.type === 'saveSetting') {
        const settings = JSON.parse(localStorage.getItem('electricity_settings') || '{}');
        settings[operation.key] = operation.value;
        localStorage.setItem('electricity_settings', JSON.stringify(settings));
      }
    }
    
    // Clear pending operations after successful sync
    localStorage.removeItem('pending_operations');
    console.log('All pending operations processed successfully');
    
    // Notify all clients that data has been synced
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        message: 'Data synchronized successfully'
      });
    });
  } catch (error) {
    console.error('Error syncing data:', error);
  }
}

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
}); 