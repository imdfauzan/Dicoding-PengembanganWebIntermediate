// src/views/pages/register-page.js
import ApiService from '../../api/api-service';

const RegisterPage = {
  async render() {
    return `
      <div class="form-container">
        <h1>Register Akun Baru</h1>
        <div id="error-message" class="error-message" style="display: none;"></div>
        
        <form id="register-form">
          <div class="form-group">
            <label for="name">Nama:</label>
            <input type="text" id="name" name="name" required>
          </div>
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" minlength="8" required>
          </div>
          <button type="submit" class="button" id="submit-button">Register</button>
        </form>
        <p>Sudah punya akun? <a href="#/login">Login di sini</a></p>
      </div>
    `;
  },

  async afterRender() {
    const registerForm = document.getElementById('register-form');
    const submitButton = document.getElementById('submit-button');
    const errorMessageElement = document.getElementById('error-message');

    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      // Tampilkan status loading di tombol
      submitButton.disabled = true;
      submitButton.textContent = 'Mendaftar...';
      errorMessageElement.style.display = 'none';

      const formData = new FormData(registerForm);
      const userData = Object.fromEntries(formData.entries());

      try {
        await ApiService.register(userData);
        
        // Jika sukses, arahkan ke halaman login
        alert('Registrasi berhasil! Silakan login.');
        window.location.hash = '#/login';
        
      } catch (error) {
        // Tampilkan pesan error
        errorMessageElement.textContent = error.message;
        errorMessageElement.style.display = 'block';
      } finally {
        // Kembalikan tombol ke keadaan semula
        submitButton.disabled = false;
        submitButton.textContent = 'Register';
      }
    });
  },
};

export default RegisterPage;