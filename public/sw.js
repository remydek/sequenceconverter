// Service Worker for Transparent Video Creator PWA
const CACHE_NAME = 'transparent-video-creator-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/static/css/modern-responsive.css',
  '/static/dist/app.js',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
  '/static/icons/favicon-32x32.png',
  '/static/manifest.json'
];

// Files that require network-first strategy (frequently updated)
const NETWORK_FIRST_PATHS = [
  '/static/dist/',
  '/api/'
];

// Files that can be cached with fallback
const CACHE_FIRST_PATHS = [
  '/static/css/',
  '/static/icons/',
  '/static/ffmpeg/'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Install failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with appropriate strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const { url, method } = request;

  // Only handle GET requests
  if (method !== 'GET') return;

  // Skip cross-origin requests
  if (!url.startsWith(self.location.origin)) return;

  // Skip requests with query parameters (likely dynamic)
  if (url.includes('?')) return;

  event.respondWith(
    handleRequest(request)
  );
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // Network-first strategy for dynamic content
    if (NETWORK_FIRST_PATHS.some(p => path.startsWith(p))) {
      return await networkFirst(request);
    }

    // Cache-first strategy for static assets
    if (CACHE_FIRST_PATHS.some(p => path.startsWith(p))) {
      return await cacheFirst(request);
    }

    // Default: stale-while-revalidate for HTML pages
    return await staleWhileRevalidate(request);

  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    return await handleOffline(request);
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

// Cache-first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first failed:', error);
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse.ok) {
        const cache = caches.open(DYNAMIC_CACHE);
        cache.then(c => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(err => {
      console.log('[SW] Network failed for:', request.url);
      return null;
    });

  // Return cached response immediately, or wait for network
  return cachedResponse || await fetchPromise;
}

// Handle offline scenarios
async function handleOffline(request) {
  const url = new URL(request.url);

  // Try to serve from cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // For HTML requests, serve offline page or main page
  if (request.headers.get('accept').includes('text/html')) {
    const offlineResponse = await caches.match('/');
    if (offlineResponse) {
      return offlineResponse;
    }
  }

  // For images, serve placeholder
  if (request.headers.get('accept').includes('image/')) {
    const placeholder = await caches.match('/static/icons/icon-192.png');
    if (placeholder) {
      return placeholder;
    }
  }

  // Return a generic offline response
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'This content is not available offline'
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

// Handle background sync (for future use)
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background tasks here
      Promise.resolve()
    );
  }
});

// Handle push notifications (for future use)
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/static/icons/icon-192.png',
    badge: '/static/icons/icon-72.png',
    data: data.data || {},
    actions: [
      {
        action: 'open',
        title: 'Open App'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Transparent Video Creator', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll().then(clients => {
      // Focus existing tab if available
      const existingClient = clients.find(client =>
        client.url.includes(self.location.origin) && 'focus' in client
      );

      if (existingClient) {
        return existingClient.focus();
      }

      // Open new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

console.log('[SW] Service Worker loaded');