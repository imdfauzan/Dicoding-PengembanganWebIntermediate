// src/sw.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';
import * as navigationPreload from 'workbox-navigation-preload';

// 1. Terima daftar file 'precache' dari Vite-PWA (injectManifest)
precacheAndRoute(self.__WB_MANIFEST || []);

// 2. Aktifkan Navigation Preload (mempercepat loading PWA)
navigationPreload.enable();

// 3. Aturan Caching untuk Font (sama seperti di config lama)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
);
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 tahun
      }),
    ],
  })
);

// 4. Buat Background Sync Plugin (Logika dari Fase 3)
const bgSyncPlugin = new BackgroundSyncPlugin('story-outbox-queue', {
  maxRetentionTime: 24 * 60, // Coba ulang maks 24 jam
  
  // Sync hanya bertugas mengirim data. Notifikasi diurus oleh server.
});

// 5. Terapkan Background Sync ke API (Logika dari Fase 3)
registerRoute(
  ({ url }) => url.href === 'https://story-api.dicoding.dev/v1/stories',
  new StaleWhileRevalidate({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

// --- Kriteria 2 (Advanced): Event listener untuk Aksi Notifikasi ---
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  let payload;
  try {
    payload = event.data?.json();
  } catch (e) {
    payload = {
      title: 'Story App',
      options: { body: event.data?.text?.() || 'Ada cerita baru untukmu!' },
    };
  }

  const title = payload?.title || 'Story App';
  const serverOptions = payload?.options || {};
  const defaults = {
    body: payload?.body || 'Ada cerita baru untukmu!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: {},
  };

  const options = {
    ...defaults,
    ...serverOptions,
  };

  const serverData = serverOptions.data || {};
  const storyId = payload?.storyId || serverOptions.storyId || serverData.storyId;

  options.data = {
    ...serverData,
    storyId,
  };

  if (!options.actions || options.actions.length === 0) {
    options.actions = [
      { action: 'view_story', title: 'Lihat Detail' },
      { action: 'open_home', title: 'Buka Beranda' },
    ];
  }

  if (!options.data.url) {
    options.data.url = storyId ? `/#/story/${storyId}` : '/#/home';
  }

  if (!options.icon) {
    options.icon = '/icons/icon-192x192.png';
  }
  if (!options.badge) {
    options.badge = '/icons/icon-192x192.png';
  }
  if (!options.body) {
    options.body = 'Ada cerita baru untukmu!';
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = data.url || '/#/home';

  if (event.action === 'view_story' && data.storyId) {
    targetUrl = `/#/story/${data.storyId}`;
  } else if (event.action === 'open_home') {
    targetUrl = '/#/home';
  }

  const absoluteTarget = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ('navigate' in client) {
          client.navigate(absoluteTarget);
        }
        return client.focus();
      }
      return clients.openWindow(absoluteTarget);
    })
  );
});

// Selalu pastikan SW baru mengambil alih
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  clients.claim();
});