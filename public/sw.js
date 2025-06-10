// public/sw.js
const CACHE_NAME = 'match-scribe-cache-v1';
// Define assets that are fundamental to the app's basic structure.
// Other assets (like specific JS/CSS chunks from build output, images)
// will be cached on demand by the fetch handler.
const INITIAL_ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.ico',
  // '/manifest.json', // Add if/when a manifest.json is created
  // Add other absolutely critical assets like a logo or essential font if needed.
  // However, be mindful that if any of these fail to cache, the SW installation will fail.
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching pre-defined assets');
        // Using addAll. If any of these fail, the SW install will fail.
        return cache.addAll(INITIAL_ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('Service Worker: Pre-defined assets cached successfully.');
        self.skipWaiting(); // Activate new SW immediately
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache assets during install:', error);
        // If caching fails, the SW won't install. This is a conscious choice for critical assets.
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
      return self.clients.claim(); // Take control of open pages
    })
    .catch(error => {
      console.error('Service Worker: Failed to activate or claim clients:', error);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    // For non-GET requests, just fetch from network.
    // Consider if POST requests or others should have specific offline handling.
    event.respondWith(fetch(event.request));
    return;
  }

  // For HTML navigation requests, use Network First, then Cache strategy.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If network fetch is successful, clone and cache it for future offline use.
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
          // If network fails (e.g., offline), serve the matched request from cache.
          // This is typically the index.html for SPAs.
          return caches.match(event.request)
            .then(cachedResponse => {
              // If the specific navigation request isn't in cache (e.g. /some/deep/link)
              // try to return the base index.html as a fallback for SPAs.
              return cachedResponse || caches.match('/index.html');
            });
        })
    );
  } else {
    // For non-navigation GET requests (CSS, JS, images), use Cache First, then Network strategy.
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // console.log('Service Worker: Serving from cache:', event.request.url);
            return cachedResponse;
          }

          // console.log('Service Worker: Fetching from network and caching:', event.request.url);
          return fetch(event.request).then((networkResponse) => {
            // Check if the response is valid and can be cached.
            // We don't cache opaque responses (from third-party CDNs without CORS) or errors.
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
          // Optionally, provide a generic fallback for failed asset fetches,
          // though this is less critical than for navigation.
          // e.g., return new Response('Asset not available', { status: 404 });
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
    
    // Optional: Add charging/discharging time to the notification body
    // if (chargingTime !== null && chargingTime !== undefined && chargingTime > 0) {
    //   body += ` Time until full: ${Math.round(chargingTime / 60)} min.`;
    // } else if (dischargingTime !== null && dischargingTime !== undefined && dischargingTime > 0) {
    //   body += ` Remaining time: ${Math.round(dischargingTime / 60)} min.`;
    // }

    const options = {
      body: body,
      icon: '/favicon.ico', // Ensure this icon is cached or accessible
      badge: '/favicon.ico', // Optional: For Android status bar / notification shade
      // tag: 'low-battery-warning', // Optional: Replaces previous notifications with the same tag
      // renotify: true, // Optional: Vibrate/sound even if tag is the same (if user settings allow)
      data: { // Optional: data to pass to notification click event
        url: '/', // URL to open on click when the notification is clicked
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
