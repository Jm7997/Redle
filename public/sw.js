// Pelipper trae el aviso del reto del día (Web Push). Solo enseña la notificación y abre Redle al tocarla:
// no guarda la web en caché, así que la página siempre es la última versión.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch {}
  e.waitUntil(self.registration.showNotification(d.title || 'Redle', {
    body: d.body || '',
    icon: 'https://play.pokemonshowdown.com/sprites/gen5/pelipper.png',
    tag: d.tag || 'redle',
    renotify: true,
    data: {url: d.url || './'},
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './';
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(list => {
    const open = list.find(c => c.url.startsWith(self.registration.scope));
    if (open) return open.navigate(url).then(c => (c || open).focus()).catch(() => open.focus());
    return self.clients.openWindow(url);
  }));
});
