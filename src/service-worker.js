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
    event.respondWith(fetch(request).catch(() => caches.match('/', { ignoreVary: true }).then((cached) => cached ?? Response.error())))
    return
  }
  // Cloudflare sends "Vary: Origin", and module scripts are requested with an Origin header the precache didn't
  // have, so Vary has to be ignored or nothing would match.
  event.respondWith(caches.match(request, { ignoreVary: true }).then((cached) => cached ?? fetch(request)))
})

// Reminders (ADR 0002): the server sends each one as an encrypted push; show it, and open Sawm when tapped.
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Sawm', {
      body: data.body,
      tag: data.tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
      if (open) return open.navigate(url).then((client) => (client ?? open).focus())
      return self.clients.openWindow(url)
    }),
  )
})

// The browser replaced the subscription: subscribe again if needed, and have the server move the schedule over.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const previous = event.oldSubscription
      let next = event.newSubscription
      if (!next) {
        const { publicKey } = await (await fetch('/api/reminders/key')).json()
        const padded = publicKey.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (publicKey.length % 4)) % 4)
        next = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)) })
      }
      if (previous) {
        await fetch('/api/reminders/move', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ from: previous.endpoint, to: next.toJSON() }) })
      }
    })(),
  )
})
