// src/utils/db.js

import { openDB } from 'idb';

const DB_NAME = 'story-app-db';
const STORE_NAME = 'stories';
const DB_VERSION = 1;

// Inisialisasi database
const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    // Buat object store (tabel) jika belum ada
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      // Kita gunakan 'id' sebagai keyPath
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  },
});

const StoryDb = {
  /**
   * Mengambil semua cerita dari IndexedDB
   * @returns {Promise<Array>} Array of stories
   */
  async getAllStories() {
    return (await dbPromise).getAll(STORE_NAME);
  },

  /**
   * Menyimpan satu cerita ke IndexedDB
   * @param {object} story - Objek cerita
   */
  async putStory(story) {
    return (await dbPromise).put(STORE_NAME, story);
  },

  /**
   * Menyimpan banyak cerita ke IndexedDB
   * @param {Array<object>} stories - Array objek cerita
   */
  async putAllStories(stories) {
    const tx = (await dbPromise).transaction(STORE_NAME, 'readwrite');
    await Promise.all(
      stories.map((story) => {
        return tx.store.put(story);
      })
    );
    return tx.done;
  },

  /**
   * Menghapus cerita dari IndexedDB berdasarkan ID
   * @param {string} id - ID cerita
   */
  async deleteStory(id) {
    return (await dbPromise).delete(STORE_NAME, id);
  },

  /**
   * Menghapus semua cerita (untuk sinkronisasi)
   */
  async clearAllStories() {
    return (await dbPromise).clear(STORE_NAME);
  },
};

export default StoryDb;