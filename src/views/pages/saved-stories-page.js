// src/views/pages/saved-stories-page.js

import SavedStoryDb from '../../utils/db'; // Impor DB bookmark kita

const SavedStoriesPage = {
  async render() {
    return `
      <div class="saved-stories-container">
        <h1>Cerita Tersimpan</h1>
        <div id="saved-story-list" class="story-list-content">
          <p>Memuat cerita tersimpan...</p>
        </div>
      </div>
    `;
  },

  async afterRender() {
    const storyListElement = document.getElementById('saved-story-list');
    
    // Panggil fungsi untuk merender list
    await this._renderSavedStories(storyListElement);

    storyListElement.addEventListener('click', async (event) => {
      if (event.target.classList.contains('button-delete-bookmark')) {
        const storyId = event.target.dataset.id;
        await SavedStoryDb.deleteSavedStory(storyId);
        alert('Bookmark cerita telah dihapus.');
        await this._renderSavedStories(storyListElement);
        return;
      }

      const storyCard = event.target.closest('.story-item');
      if (storyCard) {
        window.location.hash = `#/story/${storyCard.dataset.id}`;
      }
    });

    storyListElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        const storyCard = event.target.closest('.story-item');
        if (storyCard) {
          event.preventDefault();
          window.location.hash = `#/story/${storyCard.dataset.id}`;
        }
      }
    });
  },

  /**
   * Helper untuk mengambil data dari DB dan merendernya
   */
  async _renderSavedStories(storyListElement) {
    // Kriteria 4 (Read): Ambil semua cerita dari DB
    const stories = await SavedStoryDb.getAllSavedStories();

    if (stories.length === 0) {
      storyListElement.innerHTML = '<p>Anda belum menyimpan (bookmark) cerita apapun.</p>';
      return;
    }

    storyListElement.innerHTML = ''; // Kosongkan list
    stories.forEach((story) => {
      const storyItem = document.createElement('div');
      storyItem.className = 'story-item';
      storyItem.setAttribute('role', 'button');
      storyItem.setAttribute('tabindex', '0');
      storyItem.setAttribute('data-id', story.id);
      const shortDescription = story.description
        ? `${story.description.substring(0, 120)}${story.description.length > 120 ? '…' : ''}`
        : 'Tidak ada deskripsi.';

      storyItem.innerHTML = `
        <img src="${story.photoUrl}" alt="Foto oleh ${story.name}">
        <div class="story-item-info">
          <h2>${story.name}</h2>
          <p>${shortDescription}</p>
          <small class="story-date">
            ${new Date(story.createdAt).toLocaleDateString()}
          </small>
        </div>
        <button class="button button-delete button-delete-bookmark" data-id="${story.id}" aria-label="Hapus bookmark ${story.name}">
          Hapus
        </button>
      `;
      storyListElement.appendChild(storyItem);
    });
  },
};

export default SavedStoriesPage;