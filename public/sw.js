const CACHE = 'notes-v2'

self.addEventListener('install', (e) => {
  // Pre-cache de offline-fallback pagina
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.add('/offline.html'))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  // Verwijder alle oude caches (v1, v2, ...)
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return

  // Cache-first voor /_next/static/ (content-hashed, onveranderlijk)
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(e.request)
        if (cached) return cached
        const resp = await fetch(e.request)
        if (resp.ok) cache.put(e.request, resp.clone())
        return resp
      })
    )
    return
  }

  // Navigatieverzoeken: netwerk eerst, offline-pagina als fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/offline.html'))
    )
    return
  }
})

// Push notificatie ontvangen
self.addEventListener('push', (e) => {
  if (!e.data) return
  let data
  try { data = e.data.json() } catch { data = { titel: 'Notities', bericht: e.data.text() } }

  e.waitUntil(
    self.registration.showNotification(data.titel ?? 'Notities', {
      body:  data.bericht ?? '',
      icon:  '/icon-192.png',
      badge: '/icon-192.png',
      tag:   data.id ?? 'notes',
      data:  { url: '/' },
    })
  )
})

// Klik op notificatie → app openen of focussen
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lijst) => {
      const open = lijst.find(c => c.url.startsWith(self.location.origin))
      return open ? open.focus() : self.clients.openWindow('/')
    })
  )
})
