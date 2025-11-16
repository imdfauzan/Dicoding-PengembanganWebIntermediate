// src/views/pages/add-story-page.js
import L from 'leaflet';
import ApiService from '../../api/api-service';
import Auth from '../../utils/auth';

// --- Kriteria 3 (Advance): Variabel untuk stream kamera ---
let mediaStream = null; 
// ----------------------------------------------------

const AddStoryPage = {
  async render() {
    return `
      <div class="form-container">
        <h1>Tambah Cerita Baru</h1>
        <div id="error-message" class="error-message" style="display: none;"></div>
        
        <form id="add-story-form">
          <div class="form-group">
            <label for="photo">Foto:</label>
            <input type="file" id="photo" name="photo" accept="image/*" required>
            
            <button type="button" class="button button-secondary" id="open-camera-button">
              Ambil Foto dari Kamera
            </button>
            <img id="image-preview" src="#" alt="Pratinjau Gambar" style="display:none; max-width: 100%; margin-top: 10px;"/>
          </div>
          
          <div class="form-group">
            <label for="description">Deskripsi:</label>
            <textarea id="description" name="description" rows="5" required></textarea>
          </div>

          <div class="form-group">
            <label for="lat">Pilih Lokasi:</label>
            <div id="map-add-story" tabindex="0"></div>
            <input type="hidden" id="lat" name="lat" required>
            
            <label for="lon" class="visually-hidden">Longitude Lokasi:</label>
            <input type="hidden" id="lon" name="lon" required>
            
            <small>Klik di peta untuk memilih lokasi cerita Anda.</small>
          </div>
          
          <button type="submit" class="button" id="submit-button">Posting Cerita</button>
        </form>
      </div>

      <div id="camera-modal" class="camera-modal" style="display: none;">
        <div class="camera-modal-content">
          <h3>Ambil Foto</h3>
          <video id="camera-video" autoplay playsinline></video>
          <canvas id="camera-canvas" style="display: none;"></canvas>
          <div class="camera-controls">
            <button type="button" class="button" id="capture-button">Ambil Gambar</button>
            <button type="button" class="button button-secondary" id="close-camera-button">Tutup</button>
          </div>
        </div>
      </div>
    `;
  },

  async afterRender() {
    // --- Logika yang sudah ada (Form & Peta) ---
    const addStoryForm = document.getElementById('add-story-form');
    const submitButton = document.getElementById('submit-button');
    const errorMessageElement = document.getElementById('error-message');
    const latInput = document.getElementById('lat');
    const lonInput = document.getElementById('lon');

    // Inisialisasi Peta
    const map = L.map('map-add-story').setView([-2.5489, 118.0149], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    let marker = null; 
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      latInput.value = lat;
      lonInput.value = lng;
      if (marker) {
        marker.setLatLng(e.latlng);
      } else {
        marker = L.marker(e.latlng).addTo(map);
      }
      marker.bindPopup('Lokasi cerita dipilih').openPopup();
    });

    // --- Kriteria 3 (Advance): Logika Kamera ---
    const openCameraButton = document.getElementById('open-camera-button');
    const closeCameraButton = document.getElementById('close-camera-button');
    const captureButton = document.getElementById('capture-button');
    const cameraModal = document.getElementById('camera-modal');
    const videoElement = document.getElementById('camera-video');
    const canvasElement = document.getElementById('camera-canvas');
    const photoInput = document.getElementById('photo');
    const imagePreview = document.getElementById('image-preview');

    // Fungsi untuk memulai stream kamera
    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Kamera tidak didukung oleh browser ini.');
        }
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } // Prioritaskan kamera belakang
        });
        videoElement.srcObject = mediaStream;
        cameraModal.style.display = 'flex';
      } catch (err) {
        alert(`Error mengakses kamera: ${err.message}`);
        console.error(err);
      }
    };

    // Fungsi untuk menghentikan stream kamera (PENTING!)
    const stopCamera = () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop()); // Matikan stream
        mediaStream = null;
      }
      cameraModal.style.display = 'none';
    };

    // Fungsi untuk mengambil gambar dari video
    const captureImage = () => {
      const context = canvasElement.getContext('2d');
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      context.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);
      
      // Tampilkan pratinjau di form
      imagePreview.src = canvasElement.toDataURL('image/jpeg');
      imagePreview.style.display = 'block';

      // Konversi canvas ke Blob/File untuk di-upload
      canvasElement.toBlob((blob) => {
        // Buat file baru untuk disisipkan ke input <file>
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });

        // Buat DataTransfer untuk memanipulasi file di input
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        photoInput.files = dataTransfer.files;

        // Tutup kamera setelah selesai
        stopCamera();
      }, 'image/jpeg');
    };

    // Event Listeners untuk Kamera
    openCameraButton.addEventListener('click', startCamera);
    closeCameraButton.addEventListener('click', stopCamera);
    captureButton.addEventListener('click', captureImage);

    // Event listener untuk pratinjau jika memilih file (bukan kamera)
    photoInput.addEventListener('change', () => {
      if (photoInput.files && photoInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          imagePreview.src = e.target.result;
          imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(photoInput.files[0]);
      }
    });

    // --- Logika Submit Form (yang sudah ada) ---
    addStoryForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      submitButton.disabled = true;
      submitButton.textContent = 'Memposting...';
      errorMessageElement.style.display = 'none';

      // Validasi (tetap sama)
      const description = document.getElementById('description').value;
      const photo = photoInput.files[0]; // Ambil dari file input
      const lat = latInput.value;
      const lon = lonInput.value;

      if (!description || !photo || !lat || !lon) {
        errorMessageElement.textContent = 'Harap isi semua field: Foto, Deskripsi, dan pilih Lokasi di Peta.';
        errorMessageElement.style.display = 'block';
        submitButton.disabled = false;
        submitButton.textContent = 'Posting Cerita';
        return;
      }

      const formData = new FormData();
      formData.append('description', description);
      formData.append('photo', photo); // 'photo' dari kamera atau file
      formData.append('lat', lat);
      formData.append('lon', lon);

      try {
        const token = Auth.getToken();
        if (!token) throw new Error('Anda harus login untuk memposting.');
        
        await ApiService.postNewStory(formData, token);
        
        alert('Cerita baru berhasil diposting!');
        window.location.hash = '#/home';
        
      } catch (error) {
        // --- INI BLOK CATCH YANG BARU ---
        
        // Cek apakah error-nya karena 'Failed to fetch' (offline)
        if (error.message.includes('Failed to fetch')) {
          // Beri tahu pengguna bahwa sync akan berjalan
          alert('Anda sedang offline. Cerita akan otomatis diposting saat kembali online.');
          // Redirect ke home seolah-olah sukses
          window.location.hash = '#/home';
        } else {
          // Jika error lain (misal: 400 Bad Request), tampilkan error
          errorMessageElement.textContent = error.message;
          errorMessageElement.style.display = 'block';
        }
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Posting Cerita';
      }
    });
  },
};

export default AddStoryPage;