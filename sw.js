// Service worker: permite usar la app sin internet y mostrar las notificaciones.

const VERSION = 'control-salud-v1';
const RECURSOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/store.js',
  './js/utils.js',
  './js/notify.js',
  './js/charts.js',
  './js/componentes.js',
  './js/views/inicio.js',
  './js/views/glucosa.js',
  './js/views/presion.js',
  './js/views/ejercicio.js',
  './js/views/recordatorios.js',
  './js/views/ajustes.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(RECURSOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;

  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: primero la red (para tomar actualizaciones), con respaldo en caché.
  if (peticion.mode === 'navigate') {
    evento.respondWith(
      fetch(peticion)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(VERSION).then((cache) => cache.put('./index.html', copia));
          return respuesta;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Recursos: primero la caché (arranque instantáneo), y se actualiza en segundo plano.
  evento.respondWith(
    caches.match(peticion).then((enCache) => {
      const desdeRed = fetch(peticion)
        .then((respuesta) => {
          if (respuesta && respuesta.status === 200) {
            const copia = respuesta.clone();
            caches.open(VERSION).then((cache) => cache.put(peticion, copia));
          }
          return respuesta;
        })
        .catch(() => enCache);
      return enCache || desdeRed;
    })
  );
});

// Al tocar la notificación se abre la app en la pantalla correspondiente.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();

  const tipo = evento.notification.data?.tipo;
  const rutas = { glucosa: '#/glucosa', presion: '#/presion', ejercicio: '#/calendario' };
  const ruta = rutas[tipo] || '#/inicio';
  const destino = new URL('./' + ruta, self.location.href).href;

  evento.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const ventana of ventanas) {
      if (new URL(ventana.url).origin === self.location.origin) {
        ventana.postMessage({ ruta });
        return ventana.focus();
      }
    }
    return self.clients.openWindow(destino);
  })());
});
