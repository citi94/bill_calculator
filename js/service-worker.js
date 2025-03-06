/**
 * Service Worker for Electricity Bill Calculator PWA
 * 
 * Handles caching and offline functionality
 */

const CACHE_NAME = 'electricity-bill-calculator-v1';

// Files to cache
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/components.css',
    '/js/app.js',
    '/js/calculator.js',
    '/js/pdf.js',
    '/js/storage.js',
    '/js/ui.js',
    '/js/validation.js',
    '/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching app shell');
                return cache.addAll(FILES_TO_CACHE);
            })
            .then(() => {
                console.log('[Service Worker] Install completed');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating');
    
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
        .then(() => {
            console.log('[Service Worker] Claiming clients');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
    // Skip cross-origin requests
    if (event.request.url.startsWith(self.location.origin) || 
        event.request.url.includes('cdnjs.cloudflare.com')) {
        
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    
                    return fetch(event.request)
                        .then(response => {
                            // Cache valid responses for future use
                            if (response && response.status === 200 && response.type === 'basic') {
                                const responseToCache = response.clone();
                                
                                caches.open(CACHE_NAME)
                                    .then(cache => {
                                        cache.put(event.request, responseToCache);
                                    });
                            }
                            
                            return response;
                        })
                        .catch(error => {
                            console.log('[Service Worker] Fetch failed; returning offline page', error);
                            
                            // If the request is for an HTML page, serve index.html
                            if (event.request.headers.get('accept').includes('text/html')) {
                                return caches.match('/index.html');
                            }
                        });
                })
        );
    }
});

// Message event - handle messages from the application
self.addEventListener('message', event => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});