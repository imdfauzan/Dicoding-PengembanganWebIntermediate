// src/utils/router.js

class Router {
  constructor(contentElement) {
    this.contentElement = contentElement; // Elemen <main id="app-content">
    this.routes = {}; // Tempat menyimpan rute: { '#/login': pageObject, ... }
    
    // Listener untuk hash change
    window.addEventListener('hashchange', () => this.handleRouteChange());
    // Listener untuk load awal
    window.addEventListener('load', () => this.handleRouteChange());
  }

  /**
   * Menambahkan rute baru
   * @param {string} path - Hash path (cth: '#/login')
   * @param {object} page - Objek halaman yang memiliki method render() dan afterRender()
   */
  addRoute(path, page) {
    this.routes[path] = page;
  }

  /**
   * Menangani perubahan rute
   */
  async handleRouteChange() {
    const path = window.location.hash || '#/login'; // Default ke login
    const page = this.routes[path];

    if (page) {
      // Kriteria 1: Menerapkan View Transition
      // Kita bungkus perubahan DOM dengan startViewTransition
      if (!document.startViewTransition) {
        // Fallback jika API tidak didukung
        await this.renderPage(page);
      } else {
        document.startViewTransition(async () => {
          await this.renderPage(page);
        });
      }
    } else {
      // Halaman 404 (Not Found)
      this.contentElement.innerHTML = '<h1>404 - Halaman tidak ditemukan</h1>';
    }
  }
  
  /**
   * Merender halaman ke DOM
   * @param {object} page - Objek halaman yang akan dirender
   */
  async renderPage(page) {
    this.contentElement.innerHTML = await page.render(); // Panggil render()
    if (page.afterRender) {
      await page.afterRender(); // Panggil afterRender() (untuk event listener)
    }
  }
}

export default Router;