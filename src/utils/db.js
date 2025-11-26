// src/utils/db.js

import { openDB } from 'idb';

const DB_NAME = 'story-app-db';
const STORE_NAME = 'saved-stories';
const DB_VERSION = 1;

// Inisialisasi database
const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
    
    // (Jika Anda punya store 'stories' lama, Anda bisa hapus,
    // tapi lebih aman biarkan saja untuk Kriteria 3)
  },
});

const SavedStoryDb = {
  /**
   * Mengambil semua cerita yang di-bookmark
   */
  async getAllSavedStories() {
    return (await dbPromise).getAll(STORE_NAME);
  },

  /**
   * Mengambil satu cerita yang di-bookmark berdasarkan ID
   * @param {string} id
   */
  async getSavedStory(id) {
    if (!id) return undefined;
    return (await dbPromise).get(STORE_NAME, id);
  },

  /**
   * Menyimpan (bookmark) satu cerita
   * @param {object} story
   */
  async putSavedStory(story) {
    if (!story || !story.id) {
      throw new Error('Data cerita tidak valid untuk disimpan.');
    }
    return (await dbPromise).put(STORE_NAME, story);
  },

  /**
   * Menghapus (un-bookmark) cerita berdasarkan ID
   */
  async deleteSavedStory(id) {
    if (!id) return undefined;
    return (await dbPromise).delete(STORE_NAME, id);
  },

  /**
   * Mengosongkan seluruh bookmark (opsional)
   */
  async clearSavedStories() {
    return (await dbPromise).clear(STORE_NAME);
  },
};

export default SavedStoryDb;