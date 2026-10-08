// my-store service worker — installable PWA with safe static-asset caching.
// Never cache Next.js documents, RSC payloads, API calls, or framework assets:
// stale app-router responses can make navigation and development HMR unstable.

const CACHE_NAME = "my-store-static-v2";

self.addEventListener("install", () => {
  // Activate the updated worker promptly; there is intentionally no page reload.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("my-store-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Always let Next.js and application data requests go directly to the server.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.searchParams.has("_rsc") ||
    request.headers.has("RSC") ||
    request.headers.has("Next-Action") ||
    request.mode === "navigate" ||
    request.destination === "document"
  ) {
    return;
  }

  // Cache only versioned/public static assets. Never cache arbitrary fetches.
  const isStaticAsset =
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style" ||
    request.destination === "script";
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
