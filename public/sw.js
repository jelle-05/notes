const CACHE = 'notes-v1'

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
