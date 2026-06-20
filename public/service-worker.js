/**
 * Caerphilly RFC — Service Worker
 *
 * Currently a stub that installs and activates cleanly without caching
 * any resources. The presence of a registered service worker is what
 * triggers the PWA "Add to Home Screen" prompt on supported browsers.
 *
 * Future work:
 * - Cache the app shell (HTML, CSS, JS) for offline support
 * - Cache static assets (fonts, icons) with a cache-first strategy
 * - Use a stale-while-revalidate strategy for API responses
 * - Show an offline fallback page when the network is unavailable
 */

const CACHE_NAME = 'caerphilly-rfc-v1';

// ---------------------------------------------------------------------------
// Install event
// ---------------------------------------------------------------------------
// Skip waiting so this worker takes control of the page immediately on first
// install, rather than waiting until all existing tabs are closed.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// Activate event
// ---------------------------------------------------------------------------
// Claim all clients immediately so we control existing open tabs without
// requiring a page refresh.

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Remove caches from previous versions to avoid stale assets.
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        );
      }),
      // Claim all existing clients immediately.
      self.clients.claim(),
    ]),
  );
});

// ---------------------------------------------------------------------------
// Fetch event
// ---------------------------------------------------------------------------
// Currently passes all requests straight through to the network.
// Replace with a caching strategy when offline support is implemented.

self.addEventListener('fetch', (event) => {
  // Only handle GET requests — mutations must always go to the network.
  if (event.request.method !== 'GET') return;

  // Pass through to the network; no offline caching yet.
  // event.respondWith(networkFirst(event.request));
});
