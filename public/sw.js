const CACHE_NAME = 'currency-converter-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';

// Assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/favicon.ico',
    '/arrow-up.svg',
    '/arrow-down.svg'
];

// API endpoints to cache with different strategies
const API_ROUTES = [
    '/api/convert',
    '/api/rates'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Service Worker: Static assets cached');
                self.skipWaiting(); // Activate immediately
            })
            .catch((error) => {
                console.error('Service Worker: Cache failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            // Delete caches that don't match current version
                            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
                        })
                        .map((cacheName) => {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                self.clients.claim(); // Take control of all pages
            })
    );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip external requests (except for our API)
    if (url.origin !== self.location.origin) {
        return;
    }

    // Handle API requests with Network First strategy
    if (API_ROUTES.some(route => url.pathname.startsWith(route))) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Handle static assets with Cache First strategy
    if (STATIC_ASSETS.includes(url.pathname) || url.pathname.startsWith('/_next/static/')) {
        event.respondWith(cacheFirstStrategy(request));
        return;
    }

    // Handle navigation requests with Network First strategy
    if (request.mode === 'navigate') {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Default to network
    event.respondWith(fetch(request));
});

// Network First Strategy - try network, fallback to cache
async function networkFirstStrategy(request) {
    const cache = await caches.open(RUNTIME_CACHE);

    try {
        // Try network first
        const networkResponse = await fetch(request);

        // If successful, update cache and return response
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('Service Worker: Network failed, trying cache:', request.url);

        // Network failed, try cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // If it's an API request and no cache, return offline response
        if (request.url.includes('/api/')) {
            return new Response(
                JSON.stringify({ success: false, message: 'Offline - no cached data available' }),
                {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // For other requests, return offline page or error
        return new Response('Offline', { status: 503 });
    }
}

// Cache First Strategy - try cache, fallback to network
async function cacheFirstStrategy(request) {
    const cache = await caches.open(CACHE_NAME);

    // Try cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    // Cache miss, try network
    try {
        const networkResponse = await fetch(request);

        // If successful, cache and return
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('Service Worker: Both cache and network failed:', request.url);
        return new Response('Resource not available', { status: 404 });
    }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => caches.delete(cacheName))
            );
        }).then(() => {
            event.ports[0].postMessage({ success: true });
        });
    }
});

// Background sync for offline actions (if supported)
if ('serviceWorker' in self && 'sync' in self.registration) {
    self.addEventListener('sync', (event) => {
        if (event.tag === 'background-conversion') {
            event.waitUntil(handleBackgroundConversion());
        }
    });
}

async function handleBackgroundConversion() {
    // This would handle queued conversions when back online
    console.log('Service Worker: Handling background conversion sync');
    // Implementation would depend on how you store offline requests
} 