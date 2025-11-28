// vite.config.js
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      // 1. Ubah strategi ke 'injectManifest'
      strategy: 'injectManifest',
      // 2. Tentukan di mana file SW kustom kita akan berada
      srcDir: 'src',
      filename: 'sw.js',
      // 3. Biarkan registerType
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      
      // 4. Manifest tetap sama (salin dari config lama Anda)
      manifest: {
        name: 'Story App Dicoding',
        short_name: 'StoryApp',
        description: 'Aplikasi PWA untuk berbagi cerita Dicoding.',
        theme_color: '#333333',
        background_color: '#f4f4f4',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          { src: '/screenshots/ss1.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'Tampilan Home' },
          { src: '/screenshots/ss2.png', sizes: '720x1280', type: 'image/png', form_factor: 'narrow', label: 'Tampilan Tambah Cerita' }
        ],
        shortcuts: [
          { name: 'Tambah Cerita Baru', url: '/#/add-story', icons: [{ src: '/icons/icon-add-96.png', sizes: '96x96' }] },
          { name: 'Lihat Cerita', url: '/#/home', icons: [{ src: '/icons/icon-home-96.png', sizes: '96x96' }] }
        ]
      },

      // 5. Konfigurasi injectManifest (penting!)
      injectManifest: {
        // Ini akan men-cache App Shell kita (sama seperti globPatterns)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
      },
    }),
  ],
});