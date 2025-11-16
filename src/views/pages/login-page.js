// src/views/pages/login-page.js

import ApiService from '../../api/api-service';
import Auth from '../../utils/auth';

const LoginPage = {
  async render() {
    return `
      <div class="form-container">
        <h1>Login Pengguna</h1>
        <div id="error-message" class="error-message" style="display: none;"></div>
        
        <form id="login-form">
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required>
          </div>
          <button type="submit" class="button" id="submit-button">Login</button>
        </form>
        <p>Belum punya akun? <a href="#/register">Register di sini</a></p>
      </div>
    `;
  },

  async afterRender() {
    const loginForm = document.getElementById('login-form');
    const submitButton = document.getElementById('submit-button');
    const errorMessageElement = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      submitButton.disabled = true;
      submitButton.textContent = 'Masuk...';
      errorMessageElement.style.display = 'none';

      const formData = new FormData(loginForm);
      const credentials = Object.fromEntries(formData.entries());

      try {
        const loginResult = await ApiService.login(credentials);
        
        // Jika sukses, simpan token dan arahkan ke home
        Auth.saveToken(loginResult.token);
        
        // Arahkan ke halaman utama
        window.location.hash = '#/home';
        // Kita perlu me-reload untuk memperbarui navigasi (untuk sementara)
        // Nanti kita perbaiki ini agar lebih SPA-friendly
        window.location.reload(); 
        
      } catch (error) {
        errorMessageElement.textContent = error.message;
        errorMessageElement.style.display = 'block';
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
      }
    });
  },
};

export default LoginPage;