const CACHE_NAME = "tripdesk-v1-4-stable-rebuilt";
const ASSETS = [
  "./",
  "./index.html",
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
  "./js/integrations/json-service.js",
  "./js/integrations/excel-import-service.js",
  "./js/features/trips.js",
  "./js/features/home.js",
  "./js/features/schedule.js",
  "./js/features/bookings.js",
  "./js/features/expenses.js",
  "./js/features/checklist.js",
  "./js/features/more.js",
  "./js/app.js"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
