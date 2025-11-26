import L from 'leaflet';
import ApiService from '../../api/api-service';
import Auth from '../../utils/auth';
import SavedStoryDb from '../../utils/db';

const StoryDetailPage = {
  async render(params = {}) {
    const { id = '' } = params;
    return `
      <section class="story-detail" aria-live="polite">
        <a href="#/home" class="back-link" aria-label="Kembali ke halaman daftar cerita">
          ← Kembali ke Beranda
        </a>
        <div id="story-detail-content" data-story-id="${id}">
          <p>Memuat detail cerita...</p>
        </div>
        <div id="story-detail-map" class="story-detail-map" role="region" aria-label="Peta lokasi cerita"></div>
      </section>
    `;
  },

  async afterRender(params = {}) {
    const { id } = params;
    const detailContainer = document.getElementById('story-detail-content');
    const mapElement = document.getElementById('story-detail-map');

    if (!id) {
      detailContainer.innerHTML = '<p class="error-message">ID cerita tidak ditemukan.</p>';
      mapElement.style.display = 'none';
      return;
    }

    try {
      const token = Auth.getToken();
      if (!token) {
        throw new Error('Sesi Anda berakhir. Silakan login kembali.');
      }

      const story = await ApiService.getStoryDetail(id, token);
      const savedStory = await SavedStoryDb.getSavedStory(id);

      detailContainer.innerHTML = `
        <article class="story-detail-card" data-id="${story.id}">
          <img src="${story.photoUrl}" alt="Foto cerita oleh ${story.name}">
          <div class="story-detail-info">
            <h1>${story.name}</h1>
            <p>${story.description}</p>
            <small class="story-date">Dibuat pada ${new Date(story.createdAt).toLocaleString()}</small>
            <div class="story-detail-actions">
              <button 
                class="button button-bookmark" 
                id="detail-bookmark-button" 
                data-id="${story.id}">
                ${savedStory ? '✅ Sudah Tersimpan' : '🔖 Simpan Cerita'}
              </button>
            </div>
          </div>
        </article>
      `;

      this._initBookmarkButton(story, Boolean(savedStory));
      this._renderDetailMap(story, mapElement);
    } catch (error) {
      console.error(error);
      detailContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
      mapElement.style.display = 'none';
    }
  },

  _initBookmarkButton(story, alreadySaved) {
    const button = document.getElementById('detail-bookmark-button');
    if (!button) return;

    const updateState = (isSaved) => {
      button.dataset.state = isSaved ? 'saved' : 'unsaved';
      button.textContent = isSaved ? '✅ Sudah Tersimpan' : '🔖 Simpan Cerita';
      button.setAttribute(
        'aria-label',
        isSaved ? `Cerita ${story.name} sudah tersimpan` : `Simpan cerita ${story.name}`
      );
    };

    updateState(alreadySaved);

    button.addEventListener('click', async () => {
      try {
        if (button.dataset.state === 'saved') {
          await SavedStoryDb.deleteSavedStory(story.id);
          updateState(false);
          alert('Cerita dihapus dari daftar tersimpan.');
        } else {
          await SavedStoryDb.putSavedStory(story);
          updateState(true);
          alert('Cerita berhasil disimpan.');
        }
      } catch (err) {
        console.error(err);
        alert('Terjadi kesalahan pada fitur bookmark.');
      }
    });
  },

  _renderDetailMap(story, mapElement) {
    if (!mapElement) return;

    if (typeof story.lat !== 'number' || typeof story.lon !== 'number') {
      mapElement.classList.add('story-detail-map--empty');
      mapElement.innerHTML = '<p>Lokasi tidak tersedia untuk cerita ini.</p>';
      return;
    }

    const map = L.map(mapElement).setView([story.lat, story.lon], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    L.marker([story.lat, story.lon], { title: story.name })
      .addTo(map)
      .bindPopup(`<strong>${story.name}</strong><br>${story.description}`)
      .openPopup();
  },
};

export default StoryDetailPage;

