/**
 * Trabajador de servicio de FinControl.
 *
 * Objetivo: que la aplicación abra sin conexión y arranque rápido, sin llegar
 * nunca a servir una versión vieja de la aplicación cuando hay red.
 *
 * - Navegación: primero la red, y solo si falla se usa la copia guardada. Así
 *   un despliegue nuevo se ve en cuanto se recarga con conexión.
 * - Recursos de /assets/: Vite les pone un hash en el nombre, así que un
 *   nombre dado siempre contiene lo mismo y se puede servir desde la caché.
 * - Otros dominios (tipografías de Google): no se tocan, los gestiona el navegador.
 */
const CACHE = 'fincontrol-v2'
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})

/** Guarda una copia solo de respuestas correctas y propias. */
const store = (request, response) => {
  if (response && response.ok && response.type === 'basic') {
    const copy = response.clone()
    caches
      .open(CACHE)
      .then(cache => cache.put(request, copy))
      .catch(() => {})
  }
  return response
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navegación: la red manda; sin conexión, la última copia del index.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => store(request, response))
        .catch(() => caches.match('/').then(hit => hit || caches.match(request)))
    )
    return
  }

  // Recursos con hash: la caché primero, que es instantánea.
  event.respondWith(
    caches.match(request).then(hit => hit || fetch(request).then(response => store(request, response)))
  )
})
