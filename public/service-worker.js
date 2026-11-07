/* SPELL// STARS service worker.
 *
 * Lets the site be installed as an app and keep working without a connection.
 * No build step: it caches as you browse.
 *
 *   - Pages: network first, so a new release shows up straight away; the
 *     cached app shell (stored as '/', since every route serves the same page) is used when offline.
 *   - Built files (/static/…, hashed names) and word lists (/data/…):
 *     cached copy first, refreshed in the background.
 *   - Google Fonts: same, so type survives offline.
 *   - Never touched: other methods than GET, /api/ calls, other sites.
 *
 * Bump CACHE when this file's behaviour changes; old caches are removed.
 */
const CACHE = 'spell-stars-v1';
const SHELL = ['/', '/manifest.json', '/logo192.png', '/logo512.png', '/favicon-32.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isFont = (url) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

function staleWhileRevalidate(request) {
  return caches.open(CACHE).then((cache) =>
    cache.match(request).then((cached) => {
      const refresh = fetch(request)
        .then((response) => {
          if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || refresh;
    }),
  );
}

function networkFirstPage(request) {
  return fetch(request)
    .then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put('/', copy));
      }
      return response;
    })
    .catch(() => caches.match('/'));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (isFont(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Every route is the same single-page app, so any page falls back to it.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (url.pathname.startsWith('/static/') || url.pathname.startsWith('/data/') || SHELL.includes(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
