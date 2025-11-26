// src/views/pages/home-page.js

import L from 'leaflet';
import ApiService from '../../api/api-service';
import Auth from '../../utils/auth';
import SavedStoryDb from '../../utils/db';

let currentStories = [];
const DEFAULT_COORDINATE = [-2.5489, 118.0149];

const HomePage = {
  async render() {
    return `
      <div class="home-container">
        <div class="story-list-container">
          <h1>Daftar Cerita</h1>
          <div class="search-container">
            <label for="search-story" class="visually-hidden">Cari cerita berdasarkan nama atau deskripsi</label>
            <input 
              id="search-story" 
              type="search" 
              placeholder="Cari cerita..." 
              autocomplete="off" 
              aria-describedby="search-helper">
            <small id="search-helper" class="visually-hidden">
              Ketik minimal satu karakter untuk memfilter daftar cerita.
            </small>
          </div>
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
    const storyListContent = document.getElementById('story-list-content');
    const mapElement = document.getElementById('map');
    const searchInput = document.getElementById('search-story');

    const { map } = this._initMap(mapElement);
    const markers = {};

    try {
      const token = Auth.getToken();
      if (!token) throw new Error('Token tidak valid.');
      
      currentStories = await ApiService.getStories(token);
      await this._renderStoryList(storyListContent, currentStories, map, markers);
    } catch (error) {
      console.error('Gagal memuat cerita:', error);
      storyListContent.innerHTML = `<p class="error-message">Gagal memuat cerita. ${error.message}</p>`;
    }

    if (searchInput) {
      searchInput.addEventListener('input', (event) => {
        const query = event.target.value.toLowerCase();
        const filteredStories = currentStories.filter((story) => {
          const name = story.name?.toLowerCase() || '';
          const description = story.description?.toLowerCase() || '';
          return name.includes(query) || description.includes(query);
        });
        this._renderStoryList(storyListContent, filteredStories, map, markers);
      });
    }

    storyListContent.addEventListener('click', async (event) => {
      if (event.target.classList.contains('button-bookmark')) {
        event.stopPropagation();
        const storyId = event.target.dataset.id;
        const storyToSave = currentStories.find((story) => story.id === storyId);

        if (storyToSave) {
          try {
            await SavedStoryDb.putSavedStory(storyToSave);
            event.target.textContent = '✅';
            event.target.disabled = true;
            event.target.setAttribute('aria-label', `Cerita ${storyToSave.name} sudah tersimpan`);
            alert(`Cerita "${storyToSave.name}" telah disimpan ke bookmark.`);
          } catch (err) {
            alert('Gagal menyimpan bookmark.');
            console.error(err);
          }
        }
        return;
      }

      const storyItem = event.target.closest('.story-item');
      if (storyItem) {
        this._handleStoryItemClick(storyItem.dataset.id, map, markers);
      }
    });

    storyListContent.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        const storyItem = event.target.closest('.story-item');
        if (storyItem) {
          event.preventDefault();
          this._handleStoryItemClick(storyItem.dataset.id, map, markers);
          mapElement?.focus();
        }
      }
    });
  },

  _initMap(mapElement) {
    if (!mapElement || mapElement._leaflet_id) {
      return { map: null, mapLayers: null };
    }
    
    const map = L.map(mapElement).setView(DEFAULT_COORDINATE, 5);
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

  async _renderStoryList(storyListContent, stories, map, markers) {
    storyListContent.innerHTML = '';
    this._clearMarkers(markers);

    if (stories.length === 0) {
      storyListContent.innerHTML = '<p>Belum ada cerita untuk ditampilkan.</p>';
      return;
    }

    const savedStories = await SavedStoryDb.getAllSavedStories();
    const savedIds = new Set(savedStories.map((story) => story.id));
    const bounds = [];

    stories.forEach((story) => {
      const storyItem = document.createElement('div');
      storyItem.className = 'story-item';
      storyItem.setAttribute('role', 'button');
      storyItem.setAttribute('tabindex', '0');
      storyItem.setAttribute('data-id', story.id);
      storyItem.innerHTML = `
        <img src="${story.photoUrl}" alt="Foto oleh ${story.name}">
        <div class="story-item-info">
          <h2>${story.name}</h2>
          <p>${this._formatDescription(story.description)}</p>
          <small class="story-date">
            ${new Date(story.createdAt).toLocaleDateString()}
          </small>
        </div>
        <button 
          class="button button-bookmark" 
          data-id="${story.id}" 
          aria-label="${savedIds.has(story.id) ? `Cerita ${story.name} sudah tersimpan` : `Simpan cerita ${story.name}`}"
          ${savedIds.has(story.id) ? 'disabled' : ''}>
          ${savedIds.has(story.id) ? '✅' : '🔖'}
        </button>
      `;
      storyListContent.appendChild(storyItem);

      const lat = Number(story.lat);
      const lon = Number(story.lon);
      const hasCoordinate = Number.isFinite(lat) && Number.isFinite(lon);

      if (hasCoordinate && map) {
        const marker = L.marker([lat, lon], {
          title: story.name,
          icon: this._createMarkerIcon(story.photoUrl),
        })
          .addTo(map)
          .bindPopup(`<strong>${story.name}</strong><br>${this._formatDescription(story.description)}`);

        markers[story.id] = marker;
        bounds.push(marker.getLatLng());
      }
    });

    if (bounds.length && map) {
      const leafletBounds = L.latLngBounds(bounds);
      map.fitBounds(leafletBounds, { padding: [20, 20] });
    } else if (map) {
      map.setView(DEFAULT_COORDINATE, 4.5);
    }
  },

  _handleStoryItemClick(storyId, map, markers) {
    const marker = markers[storyId];
    if (marker && map) {
      map.flyTo(marker.getLatLng(), 15);
      marker.openPopup();
    }
  },

  _clearMarkers(markers) {
    Object.values(markers).forEach((marker) => marker.remove());
    Object.keys(markers).forEach((key) => delete markers[key]);
  },

  _createMarkerIcon(photoUrl) {
    return L.icon({
      iconUrl: photoUrl || '/icons/icon-192x192.png',
      iconSize: [42, 42],
      iconAnchor: [21, 40],
      popupAnchor: [0, -36],
      className: 'story-marker-icon',
    });
  },

  _formatDescription(text = '') {
    const cleanText = text || '';
    return cleanText.length > 110 ? `${cleanText.substring(0, 110)}…` : cleanText;
  },
};

export default HomePage;