// src/api/api-service.js

const API_BASE_URL = 'https://story-api.dicoding.dev/v1';
const VAPID_PUBLIC_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';

const ApiService = {
  /**
   * Registrasi pengguna baru
   * @param {object} userData - { name, email, password }
   * @returns {Promise<object>}
   */
  async register(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      const responseJson = await response.json();
      
      if (response.status >= 400) {
        throw new Error(responseJson.message || 'Registrasi gagal');
      }
      
      return responseJson;
    } catch (error) {
      console.error('Error during registration:', error);
      throw error;
    }
  },

  /**
   * Login pengguna
   * @param {object} credentials - { email, password }
   * @returns {Promise<object>}
   */
  async login(credentials) {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      const responseJson = await response.json();
      
      if (response.status >= 400) {
        throw new Error(responseJson.message || 'Login gagal');
      }
      
      return responseJson.loginResult;
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  },

  /**
   * Mendapatkan daftar cerita
   * @param {string} token - Token otentikasi
   * @returns {Promise<Array>}
   */
  async getStories(token) {
    try {
      // Kita tambahkan query param `location=1` agar data yang kembali punya lat/lon
      const response = await fetch(`${API_BASE_URL}/stories?location=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const responseJson = await response.json();

      if (response.status >= 400) {
        throw new Error(responseJson.message || 'Gagal mengambil cerita');
      }

      return responseJson.listStory; // Mengembalikan array of stories
    } catch (error) {
      console.error('Error fetching stories:', error);
      throw error;
    }
  },

  /**
   * Memposting cerita baru
   * @param {FormData} formData - Data form (termasuk description, photo, lat, lon)
   * @param {string} token - Token otentikasi
   * @returns {Promise<object>}
   */
  async postNewStory(formData, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/stories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // PENTING: JANGAN set 'Content-Type' di sini.
          // Browser akan otomatis mengaturnya ke 'multipart/form-data'
          // dengan 'boundary' yang benar jika kita menggunakan FormData.
        },
        body: formData,
      });
      const responseJson = await response.json();
      
      // API mengembalikan 201 untuk sukses
      if (response.status >= 400) {
        throw new Error(responseJson.message || 'Gagal memposting cerita');
      }
      
      return responseJson;
    } catch (error) {
      console.error('Error posting story:', error);
      throw error;
    }
  },

  async getStoryDetail(storyId, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/stories/${storyId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const responseJson = await response.json();

      if (response.status >= 400) {
        throw new Error(responseJson.message || 'Gagal mengambil detail cerita');
      }
      return responseJson.story;
    } catch (error) {
      console.error('Error fetching story detail:', error);
      throw error;
    }
  },

  async getVapidKey() {
    // Berdasarkan dokumentasi Story API bagian push notification
    // VAPID public key bersifat statis.
    return VAPID_PUBLIC_KEY;
  },

  async subscribePush(subscriptionPayload, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(subscriptionPayload),
      });
      const responseJson = await response.json();

      if (response.status >= 400) {
        throw new Error(responseJson.message || 'Gagal berlangganan push notification');
      }
      return responseJson;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      throw error;
    }
  },

  async unsubscribePush(endpoint, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/subscribe`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint }),
      });
      const responseJson = await response.json();

      if (response.status >= 400) {
        throw new Error(responseJson.message || 'Gagal menghentikan langganan push notification');
      }
      return responseJson;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      throw error;
    }
  },

};

export default ApiService;