// public/sw.js
const CACHE_NAME = 'match-scribe-cache-v1';
const INITIAL_ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching pre-defined assets');
        return cache.addAll(INITIAL_ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('Service Worker: Pre-defined assets cached successfully.');
        self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache assets during install:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Old caches deleted, now claiming clients.');
      return self.clients.claim();
    })
    .catch(error => {
      console.error('Service Worker: Failed to activate or claim clients:', error);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(cachedResponse => {
              return cachedResponse || caches.match('/index.html');
            });
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(event.request).then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          });
        })
        .catch(error => {
          console.error('Service Worker: Error in fetch handler for non-navigation request:', error);
        })
    );
  }
});

self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);

  if (event.data && event.data.type === 'SHOW_LOW_BATTERY_NOTIFICATION') {
    const { level, charging, trackerName, chargingTime, dischargingTime } = event.data.payload;
    
    let title = `🔋 Low Battery: ${level}%`;
    let body = `${trackerName}'s battery is at ${level}%.`;

    if (charging) {
      title = `🔌 Battery Alert: ${level}% (Charging)`;
      body = `${trackerName} is charging at ${level}%.`;
    } else {
        body += " Please connect to a power source soon.";
    }

    const options = {
      body: body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: {
        url: '/',
      }
    };

    if (self.Notification && self.Notification.permission === 'granted') {
      event.waitUntil(self.registration.showNotification(title, options));
      console.log('Service Worker: Low battery notification shown.');
    } else {
      console.log('Service Worker: Notification permission not granted. Cannot show notification.');
    }
  }
});