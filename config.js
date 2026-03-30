/**
 * 🔧 API Configuration
 * 
 * Используйте эту переменную в зависимости от окружения:
 * - Локальная разработка: API_BASE_URL_LOCAL
 * - Production на Render: API_BASE_URL_PRODUCTION
 */

const API_CONFIG = {
  // Локальная разработка (localhost)
  LOCAL: 'http://127.0.0.1:7860',
  
  // Production на Render
  // 👇 ЗАМЕНИТЕ на ваш URL Render
  PRODUCTION: 'https://music-player-backend-xxxxx.onrender.com',
  
  // Автоматическое определение окружения
  getCurrent: function() {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
    
    if (isLocalhost) {
      return this.LOCAL;
    } else {
      return this.PRODUCTION;
    }
  }
};

// Используйте в коде:
const API_BASE_URL = API_CONFIG.getCurrent();

// Или явно выберите:
// const API_BASE_URL = API_CONFIG.LOCAL;        // Локально
// const API_BASE_URL = API_CONFIG.PRODUCTION;   // Production
