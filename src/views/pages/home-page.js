// src/views/pages/home-page.js

import L from 'leaflet';
import ApiService from '../../api/api-service';
import Auth from '../../utils/auth';
import StoryDb from '../../utils/db'; // <-- Impor DB helper kita

const HomePage = {
  async render() {
    return `
      <div class="home-container">
        <div class="story-list-container">
          <div class="search-container">
            <label for="search-story" class="visually-hidden">Cari cerita</label>
            <input type="search" id="search-story" placeholder="Cari berdasarkan nama atau deskripsi...">
          </div>
          <h1>Daftar Cerita</h1>
          <div id="story-list-content" class="story-list-content">
            <p>Memuat cerita...</p>
          </div>
        </div>
        <div class="map-container">
          <div id="map" tabindex="-1"></div>
        </div>
      </div>
    `;
  },

  async afterRender() {
    // Referensi elemen
    const storyListContent = document.getElementById('story-list-content');
    const searchInput = document.getElementById('search-story');
    const mapElement = document.getElementById('map');
    
    // Inisialisasi Peta (hanya sekali)
    const { map, mapLayers } = this._initMap(mapElement);
    const markers = {};

    // --- LOGIKA UTAMA: Offline-First (PERBAIKAN) ---
    try {
      // 1. Tampilkan data dari IndexedDB dulu
      await this._renderStoriesFromDb(storyListContent, map, markers);
    } catch (dbError) {
      // Tampilkan error HANYA JIKA DB gagal
      console.error('Gagal render dari DB:', dbError);
      storyListContent.innerHTML = `<p class="error-message">Gagal memuat data lokal. ${dbError.message}</p>`;
    }

    try {
      // 2. SELALU coba fetch data baru secara terpisah
      await this._fetchAndSyncStories(storyListContent, map, markers);
      console.log('Data sukses disinkronkan dengan API.');
    } catch (fetchError) {
      // Jika fetch GAGAL (karena offline), kita biarkan saja.
      // Data dari DB (langkah 1) sudah tampil.
      console.warn('Gagal sinkronisasi (mungkin offline):', fetchError.message);
    }

    // --- Kriteria 4 Skilled: Event Listener untuk Search ---
    searchInput.addEventListener('input', async (event) => {
      const query = event.target.value.toLowerCase();
      const allStories = await StoryDb.getAllStories();
      
      const filteredStories = allStories.filter(story => 
        story.name.toLowerCase().includes(query) || 
        story.description.toLowerCase().includes(query)
      );
      
      // Render ulang daftar cerita berdasarkan hasil filter
      this._renderStoryList(storyListContent, filteredStories, map, markers);
    });

    // --- Kriteria 4 Basic: Event Listener untuk Delete ---
    storyListContent.addEventListener('click', async (event) => {
      // Hapus item
      if (event.target.classList.contains('button-delete')) {
        const storyId = event.target.dataset.id;
        if (confirm('Anda yakin ingin menghapus cerita ini dari daftar lokal?')) {
          await StoryDb.deleteStory(storyId); // Hapus dari DB
          // Render ulang daftar cerita dari DB
          await this._renderStoriesFromDb(storyListContent, map, markers);
        }
      }
      
      // Interaktivitas flyTo (yang sudah ada)
      const storyItem = event.target.closest('.story-item');
      if (storyItem) {
        this._handleStoryItemClick(storyItem.dataset.id, map, markers);
      }
    });

    // Listener keyboard (yang sudah ada)
    storyListContent.addEventListener('keydown', (event) => {
      if (event.keyCode === 13 || event.keyCode === 32) {
        const storyItem = event.target.closest('.story-item');
        if (storyItem) {
          event.preventDefault();
          this._handleStoryItemClick(storyItem.dataset.id, map, markers);
          mapElement.focus();
        }
      }
    });
  },

  /**
   * Helper untuk inisialisasi Peta Leaflet
   */
  _initMap(mapElement) {
    if (!mapElement || mapElement._leaflet_id) {
      // Peta sudah diinisialisasi atau elemen tidak ada
      return { map: null, mapLayers: null };
    }
    
    const map = L.map(mapElement).setView([-2.5489, 118.0149], 5);
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    const openTopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    const mapLayers = { "OpenStreetMap": osm, "OpenTopoMap": openTopo };
    L.control.layers(mapLayers).addTo(map);
    
    return { map, mapLayers };
  },

  /**
   * Ambil data dari IndexedDB dan render ke DOM
   */
  async _renderStoriesFromDb(storyListContent, map, markers) {
    const stories = await StoryDb.getAllStories();
    this._renderStoryList(storyListContent, stories, map, markers);
  },

  /**
   * Ambil data dari API, sinkronkan ke DB, lalu render ke DOM
   */
  async _fetchAndSyncStories(storyListContent, map, markers) {
    const token = Auth.getToken();
    if (!token) throw new Error('Token tidak valid.');

    // 1. Ambil data baru
    const stories = await ApiService.getStories(token);
    
    // 2. Bersihkan DB lama dan simpan data baru (K4 Create)
    await StoryDb.clearAllStories();
    await StoryDb.putAllStories(stories);
    
    // 3. Render ulang list dengan data segar (K4 Read)
    await this._renderStoriesFromDb(storyListContent, map, markers);
  },

  /**
   * Fungsi inti untuk merender daftar cerita dan marker ke DOM
   */
  _renderStoryList(storyListContent, stories, map, markers) {
    storyListContent.innerHTML = ''; // Kosongkan list
    
    // Bersihkan marker lama di peta
    Object.values(markers).forEach(marker => marker.remove());
    Object.keys(markers).forEach(key => delete markers[key]);

    if (stories.length === 0) {
      storyListContent.innerHTML = '<p>Belum ada cerita untuk ditampilkan.</p>';
      return;
    }

    stories.forEach((story) => {
      // Render ke List
      const storyItem = document.createElement('div');
      storyItem.className = 'story-item';
      storyItem.setAttribute('role', 'button');
      storyItem.setAttribute('tabindex', '0');
      storyItem.setAttribute('data-id', story.id);
      storyItem.innerHTML = `
        <img src="${story.photoUrl}" alt="Foto oleh ${story.name}">
        <div class="story-item-info">
          <h2>${story.name}</h2>
          <p>${story.description.substring(0, 100)}...</p>
          <small class="story-date">
            ${new Date(story.createdAt).toLocaleDateString()}
          </small>
        </div>
        <button class="button button-delete" data-id="${story.id}" aria-label="Hapus ${story.name} dari lokal">
          Hapus
        </button>
      `;
      storyListContent.appendChild(storyItem);

      // Render ke Peta (jika ada lat/lon)
      if (story.lat && story.lon && map) {
        const marker = L.marker([story.lat, story.lon]).addTo(map);
        marker.bindPopup(`<b>${story.name}</b><br>${story.description.substring(0, 50)}...`);
        markers[story.id] = marker;
      }
    });
  },

  /**
   * Helper untuk interaktivitas klik item
   */
  _handleStoryItemClick(storyId, map, markers) {
    const marker = markers[storyId];
    if (marker && map) {
      map.flyTo(marker.getLatLng(), 15);
      marker.openPopup();
    }
  },
};

export default HomePage;