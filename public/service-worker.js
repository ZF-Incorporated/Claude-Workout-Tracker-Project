// Bump this on any deploy that changes cached files, so old clients pick up the update.
const CACHE_NAME = "workout-tracker-shell-v1";

const SHELL_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

// Cache the app shell so the UI itself loads with no signal — this is what
// makes "Add to Home Screen" actually open instantly at the gym instead of
// showing a browser error.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Clean up old cache versions on activate.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls — workout data must always be fresh from the
  // server when a connection exists. The page itself (index.html) handles
  // what happens when a save/fetch fails while offline.
  if (url.pathname.startsWith("/api/")) {
    return; // let the browser handle it normally, no interception
  }

  // App shell: cache-first, falling back to network, and re-caching
  // whatever the network returns so the shell stays fresh over time.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match("/")); // offline + not cached → show shell anyway
    })
  );
});
