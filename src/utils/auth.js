// src/utils/auth.js

const AUTH_TOKEN_KEY = 'STORY_APP_TOKEN';

const Auth = {
  saveToken(token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  removeToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },

  isLoggedIn() {
    return !!this.getToken(); // Mengembalikan true jika token ada
  },
};

export default Auth;