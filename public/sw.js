// Service worker « d'effacement », servi seulement par `next dev` (localhost) : il n'y a pas de service worker en
// développement. Si un ancien service worker de production est resté enregistré sur ce port, le navigateur redemande
// /sw.js, reçoit ce fichier au lieu d'une erreur 404 (« Failed to update a ServiceWorker »), l'installe, vide les
// caches, se désinscrit et recharge les onglets : l'application repart des fichiers du serveur de développement.
//
// En production, scripts/generer-sw.mjs remplace ce fichier par le vrai service worker (out/sw.js).
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const nom of await caches.keys()) await caches.delete(nom);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: "window" })) client.navigate(client.url);
  })());
});
