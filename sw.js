// Service Worker de "La Despensa"
// Guarda una copia de la app (HTML, fuentes, y el SDK de Firebase) para
// que se pueda abrir aunque no haya conexión a internet. Los DATOS
// (productos, cantidades) siguen viviendo en Firebase; esto solo hace
// que la página misma cargue sin internet.

const CACHE_NAME = 'despensa-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'
];

// Al instalar: guarda una primera copia de todo lo necesario.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => {
            // Si algún recurso externo falla al guardarse (ej. sin internet
            // la primera vez), no rompe la instalación del resto.
            console.log('No se pudo guardar en caché:', url, err);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Al activar: borra copias viejas si actualizamos la app.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Estrategia: intenta primero la red (para tener siempre lo más nuevo);
// si no hay internet, usa lo que esté guardado en caché.
self.addEventListener('fetch', (event) => {
  // Deja que las llamadas a Firebase (datos en tiempo real) sigan su
  // camino normal; el SW solo cachea el "cascarón" de la app.
  if (event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('firebaseapp.com') ||
      event.request.url.includes('googleapis.com/identitytoolkit')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});