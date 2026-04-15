// public/sw.js

// Lors de l'installation, on force le Service Worker à s'activer immédiatement
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Lors de l'activation, on prend le contrôle de la page immédiatement
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// À chaque requête (image, texte, base de données...)
self.addEventListener('fetch', (event) => {
  // STRATÉGIE "100% ONLINE" : 
  // On ignore totalement le cache et on retourne la requête directement depuis le réseau
  event.respondWith(fetch(event.request));
});