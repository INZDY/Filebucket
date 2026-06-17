const CACHE_NAME = "filebucket-v1";
const STATIC_ASSETS = [
  "/",
  "/login",
  "/icon.svg",
];

// Install Event: pre-cache static entry screens
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event: clear legacy cache buckets
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: intercept page and asset network streams
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Exclude non-HTTP requests (e.g. chrome-extension://) and non-GET requests
  if (event.request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // 1. Network-First for API data, NextAuth handlers, and login actions
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/login") ||
    event.request.headers.get("accept")?.includes("json")
  ) {
    event.respondWith(
      fetch(event.request).catch((err) => {
        // Safe offline response fallback
        return caches.match(event.request) || new Response("Offline mode active. Connection required for database actions.", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        });
      })
    );
    return;
  }

  // 2. Stale-While-Revalidate for Next.js assets, scripts, stylesheets, fonts, and graphics
  if (
    url.pathname.includes("/_next/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".svg")
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // If network fetch fails, swallow error and rely on cached response if available
          return cachedResponse || new Response("Offline", { status: 503 });
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. Default Network-First fallback for pages and other assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
