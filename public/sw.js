const CACHE_NAME = 'smart-qr-attendance-v4';
const STATIC_CACHE_URLS = [
  '/',
  '/login',
  '/offline',
  '/brand/login-banner.webp',
  '/brand/login-banner-sm.webp',
  '/brand/logo.png',
  '/brand/logo-mark.png',
  '/brand/logo-mark-sm.png',
  '/brand/logo-full.png',
  '/brand/logo-full-sm.png',
  '/brand/logo-full-solid.webp',
  '/brand/logo-icon-solid.webp',
  '/icon.png',
  '/apple-icon.png',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_CACHE_URLS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((cacheNames) => Promise.all(cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))),
  ]));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api')) return;

  if (url.pathname.startsWith('/_next/static') || ['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match('/offline'));
  }
}
