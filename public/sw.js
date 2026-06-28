const CACHE_NAME = "auto-mali-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([OFFLINE_URL, "/manifest.json", "/icons/icon.svg"])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function shouldBypass(request) {
  const url = new URL(request.url);

  if (url.pathname.startsWith("/_next/")) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.includes(".hot-update.")) return true;

  return false;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (shouldBypass(event.request)) return;

  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
      return new Response("Hors ligne", { status: 503, statusText: "Hors ligne" });
    })
  );
});
