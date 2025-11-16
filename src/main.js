import './style.css';
import 'leaflet/dist/leaflet.css';

import Router from './utils/router';
import LoginPage from './views/pages/login-page';
import RegisterPage from './views/pages/register-page';
import HomePage from './views/pages/home-page';
import LogoutPage from './views/pages/logout-page';
import AddStoryPage from './views/pages/add-story-page';

import Auth from './utils/auth';

if (!document.startViewTransition) {
  document.startViewTransition = (callback) => {
    callback(); // Langsung jalankan callback tanpa transisi
  };
}

function updateNavigationUI() {
  const navElement = document.querySelector('.app-nav ul');
  if (!navElement) return;

  if (Auth.isLoggedIn()) {
    navElement.innerHTML = `
      <li><a href="#/home">Home</a></li>
      <li><a href="#/add-story">Tambah Cerita</a></li>
      <li><a href="#/logout">Logout</a></li>
      <li>
        <button id="notification-toggle" class="button-nav" aria-label="Pengaturan Notifikasi">
          🔔 Notifikasi
        </button>
      </li>
    `;
  } else {
    // Pengguna belum login
    navElement.innerHTML = `
      <li><a href="#/login">Login</a></li>
      <li><a href="#/register">Register</a></li>
    `;
  }
  updateNotificationButtonStatus();
}

/**
 * Melindungi Rute
 * @returns {boolean} True jika diizinkan, false jika ditolak
 */
function handleAuthRoutes() {
  const path = window.location.hash;
  const isLoggedIn = Auth.isLoggedIn();

  const authRoutes = ['#/home', '#/add-story'];
  const guestRoutes = ['#/login', '#/register'];

  if (isLoggedIn && guestRoutes.includes(path)) {
    // Jika sudah login tapi akses halaman login/register, redirect ke home
    window.location.hash = '#/home';
    return false;
  }

  if (!isLoggedIn && authRoutes.includes(path)) {
    // Jika belum login tapi akses halaman home/add, redirect ke login
    window.location.hash = '#/login';
    return false;
  }

  return true;
}

async function initNotificationToggle() {
  // Cek dukungan Notifikasi
  if ('Notification' in window) {
    const toggleButton = document.getElementById('notification-toggle');
    if (!toggleButton) return; // Tombol tidak ada (mungkin di hal. login)

    // Set status tombol saat ini
    const updateButtonStatus = (permission) => {
      if (permission === 'granted') {
        toggleButton.textContent = '🔕 Matikan Notifikasi';
        toggleButton.setAttribute('aria-label', 'Nonaktifkan Notifikasi');
      } else {
        toggleButton.textContent = '🔔 Aktifkan Notifikasi';
        toggleButton.setAttribute('aria-label', 'Aktifkan Notifikasi');
      }
    };

    updateButtonStatus(Notification.permission);

    // Tambahkan event listener
    toggleButton.addEventListener('click', async () => {
      if (Notification.permission === 'granted') {
        // Saat ini, browser tidak mengizinkan "un-request" permission.
        // Pengguna harus melakukannya manual di pengaturan browser.
        alert('Untuk mematikan notifikasi, harap nonaktifkan izin di pengaturan browser Anda.');
      } else if (Notification.permission === 'denied') {
        alert('Anda telah memblokir notifikasi. Harap izinkan dari pengaturan browser.');
      } else {
        // Minta Izin
        const permission = await Notification.requestPermission();
        updateButtonStatus(permission);
      }
    });
  }
}

function updateNotificationButtonStatus() {
  // Cek dukungan
  if (!('Notification' in window)) {
    return; // Sembunyikan tombol jika notif tidak didukung
  }

  const toggleButton = document.getElementById('notification-toggle');
  if (!toggleButton) {
    return; // Tombol tidak ada (misal: di halaman login)
  }

  const permission = Notification.permission;
  if (permission === 'granted') {
    toggleButton.textContent = '🔕 Notif Aktif';
    toggleButton.setAttribute('aria-label', 'Notifikasi sudah diaktifkan');
    toggleButton.disabled = true; // Nonaktifkan, karena 'un-grant' harus manual
  } else if (permission === 'denied') {
    toggleButton.textContent = '❌ Notif Diblokir';
    toggleButton.setAttribute('aria-label', 'Notifikasi diblokir');
    toggleButton.disabled = true; // Nonaktifkan, karena 'un-deny' harus manual
  } else {
    // Status 'default' (belum ditanya)
    toggleButton.textContent = '🔔 Aktifkan Notifikasi';
    toggleButton.setAttribute('aria-label', 'Aktifkan Notifikasi');
    toggleButton.disabled = false;
  }
}

function initNotificationListener() {
  document.body.addEventListener('click', async (event) => {
    // Cek apakah yang diklik adalah tombol kita
    if (event.target.id === 'notification-toggle') {
      
      // Minta izin (hanya jika statusnya 'default')
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        // Setelah izin didapat (atau ditolak), perbarui teks tombol
        updateNotificationButtonStatus(permission);
      }
    }
  });
}

// Fungsi untuk inisialisasi aplikasi
function initApp() {
  const appContent = document.getElementById('app-content');
  if (!appContent) {
    console.error('Elemen #app-content tidak ditemukan!');
    return;
  }

  const skipLink = document.querySelector('.skip-link');
  skipLink.addEventListener('click', (event) => {
    // 1. Hentikan aksi default (yaitu MENGUBAH HASH URL)
    event.preventDefault();
    
    // 2. Lakukan aksi yang seharusnya: pindahkan fokus ke target
    appContent.focus();
  });

  initNotificationListener();
  
  // Update UI Navigasi saat pertama kali load
  updateNavigationUI();

  // Setiap kali hash berubah, cek otentikasi dan update nav
  window.addEventListener('hashchange', () => {
    handleAuthRoutes();
    updateNavigationUI();
  });
  
  // Cek otentikasi saat load awal
  if (!handleAuthRoutes()) {
     // Jika redirect terjadi, hentikan inisialisasi router
     // Biarkan hashchange handler yang mengambil alih
     return;
  }

  const router = new Router(appContent);
  router.addRoute('#/login', LoginPage);
  router.addRoute('#/register', RegisterPage);
  router.addRoute('#/home', HomePage);
  router.addRoute('#/logout', LogoutPage);
  router.addRoute('#/add-story', AddStoryPage);

  // Handle rute default/kosong
  if (window.location.hash === '') {
    window.location.hash = Auth.isLoggedIn() ? '#/home' : '#/login';
  }

  // Panggil router handle secara manual setelah setup
  router.handleRouteChange();
}

// Jalankan aplikasi saat DOM sudah siap
document.addEventListener('DOMContentLoaded', initApp);