// src/views/pages/logout-page.js
import Auth from '../../utils/auth';

const LogoutPage = {
  async render() {
    return ''; // Tidak perlu render HTML
  },

  async afterRender() {
    // Hapus token
    Auth.removeToken();
    
    // Redirect ke login dan reload untuk perbarui nav
    alert('Anda telah logout.');
    window.location.hash = '#/login';
    window.location.reload();
  },
};

export default LogoutPage;