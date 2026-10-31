// Service worker de « Chez Billie » : fonctionnement hors ligne + réception des rappels.
const CACHE = 'chez-billie-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './firebase-config.js', './icons/icon-192.png', './icons/icon-512.png'];

importScripts('./firebase-config.js');
const cfg = self.FIREBASE_CONFIG;
if (cfg && cfg.apiKey && !String(cfg.apiKey).startsWith('A_REMPLIR')) {
  importScripts(
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js'
  );
  firebase.initializeApp(cfg);
  // Les messages envoyés avec un champ "notification" sont affichés automatiquement par le SDK.
  firebase.messaging();
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord pour nos propres fichiers, cache en secours (hors ligne).
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});

// Toucher une notification ouvre (ou ramène au premier plan) l'appli.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow('./');
    })
  );
});
