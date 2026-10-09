// Sawm's service worker. The build prepends SAWM_VERSION and SAWM_PRECACHE (every file the app needs to open).
// Pages come from the network first, so updates arrive; when offline, the cached app shell opens instead.
// Times live in IndexedDB, so a cached shell is all it takes for Today to work offline.

/* global SAWM_VERSION, SAWM_PRECACHE */
const CACHE = `sawm-${SAWM_VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SAWM_PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('sawm-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/').then((cached) => cached ?? Response.error())))
    return
  }
  event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)))
})
