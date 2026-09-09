// Bump to retire every previously cached response in one go.
const CACHE_VERSION = 'zero-club-v2';

// Only the offline fallback is precached. The app shell deliberately is not:
// see the navigation strategy below.
const OFFLINE_URLS = ['/index.html', '/favicon.svg', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(OFFLINE_URLS))
      .catch(() => { /* offline during install — fetch handler still works */ })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

const putInCache = async (request, response) => {
  const cache = await caches.open(CACHE_VERSION);
  await cache.put(request, response);
};

// Try the network, fall back to whatever was cached last.
const networkFirst = async (request, fallbackUrl) => {
  try {
    const response = await fetch(request);
    if (response.ok) putInCache(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request) || (fallbackUrl && await caches.match(fallbackUrl));
    return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, fonts, analytics

  // Navigations must hit the network first. Serving the shell from cache means
  // an installed home-screen app keeps running the build it was installed with
  // and never sees another deploy — the index.html is what points at the
  // current hashed bundles.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/index.html'));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Build output is content-hashed, so a hit is always the right file.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) putInCache(request, response.clone());
        return response;
      }))
    );
    return;
  }

  event.respondWith(networkFirst(request));
});
