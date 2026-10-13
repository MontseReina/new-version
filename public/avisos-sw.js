// New Version — avisos al móvil dentro del service worker (lo carga el service worker de la app con importScripts).
// El contenido llega cifrado desde la función del servidor `avisos`: { titulo, cuerpo, ruta, tag }.
self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch { d = { cuerpo: event.data ? event.data.text() : '' } }
  event.waitUntil(self.registration.showNotification(d.titulo || 'New Version', {
    body: d.cuerpo || '',
    tag: d.tag || undefined,
    icon: 'pwa-192.png',
    badge: 'pwa-192.png',
    data: { ruta: d.ruta || '' },
  }))
})

// Al tocar el aviso se abre la app en la página que corresponde.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const ruta = (event.notification.data && event.notification.data.ruta) || ''
  const url = new URL('./' + (ruta ? '#/' + ruta : ''), self.registration.scope).href
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const w of ventanas) {
      if ('focus' in w) {
        if ('navigate' in w) { try { await w.navigate(url) } catch { /* sin navegación */ } }
        return w.focus()
      }
    }
    return self.clients.openWindow(url)
  })())
})
