// Bump this on any deploy that changes cached files, so old clients pick up the update.
const CACHE_NAME = "workout-tracker-shell-v2";

const SHELL_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon-120.png",
  "/icons/apple-touch-icon-152.png",
  "/icons/apple-touch-icon-167.png",
  "/icons/apple-touch-icon-180.png",
];

// Cache the app shell so the UI itself loads with no signal. We cache each
// asset independently (not cache.addAll, which is all-or-nothing) — if one
// asset fails (e.g. briefly blocked by an auth redirect), the rest still
// get cached instead of the whole install silently failing.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        SHELL_ASSETS.map((url) =>
          fetch(url, { cache: "reload" })
            .then((res) => {
              if (res.ok) return cache.put(url, res);
              console.warn(`Skipped caching ${url} — got status ${res.status}`);
            })
            .catch((err) => console.warn(`Skipped caching ${url} —`, err))
        )
      )
    )
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
  // ignoreSearch handles iOS sometimes appending query params when
  // launching a standalone home-screen app.
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return res;
        })
        .catch(() => caches.match("/", { ignoreSearch: true })); // offline + not cached → show shell anyway
    })
  );
});
