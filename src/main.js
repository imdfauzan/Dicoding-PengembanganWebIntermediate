import './style.css';
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import Router from './utils/router';
import LoginPage from './views/pages/login-page';
import RegisterPage from './views/pages/register-page';
import HomePage from './views/pages/home-page';
import LogoutPage from './views/pages/logout-page';
import AddStoryPage from './views/pages/add-story-page';
import SavedStoriesPage from './views/pages/saved-stories-page';
import StoryDetailPage from './views/pages/story-detail-page';

import Auth from './utils/auth';
import ApiService from './api/api-service';

// Atur ikon default Leaflet secara manual
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

if (!document.startViewTransition) {
  document.startViewTransition = (callback) => {
    callback(); // Langsung jalankan callback tanpa transisi
  };
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isPushSupported() {
  return 'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;
}

async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error('Browser Anda belum mendukung push notification.');
  }

  try {
    const swRegistration = await navigator.serviceWorker.ready;
    const existingSubscription = await swRegistration.pushManager.getSubscription();
    if (existingSubscription) {
      return existingSubscription;
    }
    
    const vapidKey = await ApiService.getVapidKey();
    const applicationServerKey = urlBase64ToUint8Array(vapidKey);

    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    
    const token = Auth.getToken();
    if (!token) {
      throw new Error('Sesi Anda berakhir. Silakan login kembali sebelum mengaktifkan notifikasi.');
    }

    await ApiService.subscribePush(subscription.toJSON(), token);
    updateNotificationButtonStatus();
    return subscription;
  } catch (err) {
    console.error(err);
    updateNotificationButtonStatus();
    throw err;
  }
}

async function unsubscribeFromPush() {
  if (!isPushSupported()) {
    return;
  }

  const swRegistration = await navigator.serviceWorker.ready;
  const subscription = await swRegistration.pushManager.getSubscription();
  if (!subscription) {
    return;
  }

  try {
    const token = Auth.getToken();
    if (!token) {
      await subscription.unsubscribe();
      return;
    }
    await ApiService.unsubscribePush(subscription.endpoint, token);
    await subscription.unsubscribe();
  } catch (error) {
    console.error('Gagal menghentikan langganan push notification', error);
    throw error;
  } finally {
    updateNotificationButtonStatus();
  }
}

function updateNavigationUI() {
  const navElement = document.querySelector('.app-nav ul');
  if (!navElement) return;

  if (Auth.isLoggedIn()) {
    navElement.innerHTML = `
      <li><a href="#/home">Home</a></li>
      <li><a href="#/add-story">Tambah Cerita</a></li>
      <li><a href="#/saved">Tersimpan</a></li>
      <li><a href="#/logout">Logout</a></li>
      <li>
        <button id="notification-toggle" class="button-nav" aria-label="Pengaturan Notifikasi">
          🔔 Notifikasi
        </button>
      </li>
    `;
  } else {
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

  const authRoutes = ['#/home', '#/add-story', '#/saved', '#/story'];
  const guestRoutes = ['#/login', '#/register'];

  if (isLoggedIn && guestRoutes.includes(path)) {
    // Jika sudah login tapi akses halaman login/register, redirect ke home
    window.location.hash = '#/home';
    return false;
  }

  const requiresAuth = authRoutes.some((route) => path === route || path.startsWith(`${route}/`));

  if (!isLoggedIn && requiresAuth) {
    // Jika belum login tapi akses halaman home/add, redirect ke login
    window.location.hash = '#/login';
    return false;
  }

  return true;
}

async function updateNotificationButtonStatus() {
  const toggleButton = document.getElementById('notification-toggle');
  if (!toggleButton) return;

  if (!isPushSupported()) {
    toggleButton.textContent = 'Push tidak didukung';
    toggleButton.disabled = true;
    toggleButton.setAttribute('aria-hidden', 'true');
    return;
  }

  const permission = Notification.permission;
  if (permission === 'denied') {
    toggleButton.textContent = '❌ Notif Diblokir';
    toggleButton.setAttribute('aria-label', 'Notifikasi diblokir oleh browser');
    toggleButton.disabled = true;
    return;
  }

  if (permission === 'default') {
    toggleButton.textContent = '🔔 Aktifkan Notifikasi';
    toggleButton.setAttribute('aria-label', 'Aktifkan push notification');
    toggleButton.disabled = false;
    return;
  }

  try {
    const swRegistration = await navigator.serviceWorker.ready;
    const subscription = await swRegistration.pushManager.getSubscription();
    if (subscription) {
      toggleButton.textContent = '🔕 Matikan Notifikasi';
      toggleButton.setAttribute('aria-label', 'Matikan langganan push notification');
    } else {
      toggleButton.textContent = '🔔 Aktifkan Notifikasi';
      toggleButton.setAttribute('aria-label', 'Aktifkan push notification');
    }
    toggleButton.disabled = false;
  } catch (error) {
    console.error('Gagal memperbarui status notifikasi', error);
    toggleButton.textContent = 'Coba lagi';
    toggleButton.disabled = false;
  }
}

function initNotificationListener() {
  if (!isPushSupported()) {
    return;
  }

  document.body.addEventListener('click', async (event) => {
    if (event.target.id !== 'notification-toggle') {
      return;
    }

    if (Notification.permission === 'denied') {
      alert('Notifikasi telah diblokir. Silakan izinkan melalui pengaturan browser.');
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        updateNotificationButtonStatus();
        return;
      }
    }

    const button = event.target;
    button.disabled = true;

    try {
      const swRegistration = await navigator.serviceWorker.ready;
      const existingSubscription = await swRegistration.pushManager.getSubscription();

      if (existingSubscription) {
        await unsubscribeFromPush();
        alert('Langganan notifikasi dimatikan.');
      } else {
        await subscribeToPush();
        alert('Langganan notifikasi diaktifkan.');
      }
    } catch (error) {
      console.error('Gagal memperbarui langganan notifikasi', error);
      alert('Terjadi kesalahan saat memperbarui langganan notifikasi.');
    } finally {
      updateNotificationButtonStatus();
      button.disabled = false;
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
  router.addRoute('#/saved', SavedStoriesPage);
  router.addRoute('#/story/:id', StoryDetailPage);

  // Handle rute default/kosong
  if (window.location.hash === '') {
    window.location.hash = Auth.isLoggedIn() ? '#/home' : '#/login';
  }

  // Panggil router handle secara manual setelah setup
  router.handleRouteChange();
}

// Jalankan aplikasi saat DOM sudah siap
document.addEventListener('DOMContentLoaded', initApp);