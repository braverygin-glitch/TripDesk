const CACHE_NAME = "tripdesk-v1-8-3-expense-settings-fixed";

const ASSETS = [
  "./",
  "./index.html",
  "./share.html",
  "./manifest.json",
  "./css/style.css",
  "./data/sample-trips.js",
  "./js/core/utils.js",
  "./js/storage/local-storage-service.js",
  "./js/storage/firebase-config.js",
  "./js/storage/firebase-service.js",
  "./js/core/data-service.js",
  "./js/core/state.js",
  "./js/core/ui.js",
  "./js/core/bottom-nav-controller.js",
  "./js/integrations/json-service.js",
  "./js/integrations/excel-import-service.js",
  "./js/features/trips.js",
  "./js/features/home.js",
  "./js/features/schedule.js",
  "./js/features/bookings.js",
  "./js/features/expense-analysis.js",
  "./js/features/expenses.js",
  "./js/features/checklist.js",
  "./js/features/more.js",
  "./js/app.js",
  "./js/share-view.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const networkFirst = event.request.mode === "navigate"
    || url.pathname.endsWith("/share.html")
    || url.pathname.endsWith("/js/share-view.js")
    || url.pathname.endsWith("/js/storage/firebase-config.js")
    || url.pathname.endsWith("/js/storage/firebase-service.js");

  if (networkFirst) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response?.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
