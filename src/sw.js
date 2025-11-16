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
  
  // --- INI LOGIKA BARU UNTUK Kriteria 2 ---
  onQueueDidReplay: async (queue) => {
    // Dipanggil SETELAH antrian berhasil dikirim
    await queue.queue.getAll().then(async (entries) => {
      for (const entry of entries) {
        // Ambil data dari request yang berhasil
        const requestBody = await entry.request.formData();
        const description = requestBody.get('description');
        
        // Tampilkan Notifikasi! (K2 Basic/Skilled)
        self.registration.showNotification('Cerita Berhasil Di-upload!', {
          body: `Cerita Anda "${description.substring(0, 20)}..." telah diposting.`,
          icon: '/icons/icon-192x192.png',
          // K2 Advanced: Tombol Aksi
          actions: [
            { action: 'open_home', title: 'Lihat Daftar Cerita' }
          ]
        });
      }
    });
  },
});

// 5. Terapkan Background Sync ke API (Logika dari Fase 3)
registerRoute(
  ({ url }) => url.href === 'https://story-api.dicoding.dev/v1/stories',
  new NetworkOnly({ // <-- GANTI JADI NetworkOnly
    plugins: [bgSyncPlugin], // bgSyncPlugin akan menangkap jika NetworkOnly gagal
  }),
  'POST'
);

// --- Kriteria 2 (Advanced): Event listener untuk Aksi Notifikasi ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Tutup notifikasi

  if (event.action === 'open_home') {
    // Buka aplikasi ke halaman home
    event.waitUntil(clients.openWindow('/#/home'));
  } else {
    // Default: buka aplikasi
    event.waitUntil(clients.openWindow('/'));
  }
});

// Selalu pastikan SW baru mengambil alih
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  clients.claim();
});