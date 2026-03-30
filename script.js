// ЛОКАЛЬНАЯ РАЗРАБОТКА:
const API_BASE_URL = 'http://127.0.0.1:7860';

// PRODUCTION (Render):
// const API_BASE_URL = 'https://your-app-name.onrender.com';
// Замените 'your-app-name' на имя вашего приложения на Render

document.addEventListener('DOMContentLoaded', () => {
    // Элементы Авторизации
    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const authMessage = document.getElementById('authMessage');
    const welcomeUser = document.getElementById('welcomeUser');
    const logoutBtn = document.getElementById('logoutBtn');

    // Элементы плеера
    const trackList = document.getElementById('trackList');
    const fileInput = document.getElementById('fileInput');
    const currentTrackName = document.getElementById('currentTrackName');
    const audio = document.getElementById('audioPlayer');
    const playBtn = document.getElementById('playBtn');
    const progressContainer = document.querySelector('.progress-container');
    const progressFill = document.querySelector('.progress-fill');
    const progressKnob = document.querySelector('.progress-knob');
    const currentTimeText = document.getElementById('currentTime');
    const totalTimeText = document.getElementById('totalTime');
    const volumeSlider = document.getElementById('volumeSlider');
    const repeatBtn = document.getElementById('repeatBtn');

    let isRepeatOne = false;
    let trackElements = [];
    let tracksData = []; // Храним массив объектов {filename, url}

    // Проверка авторизации при загрузке
    const checkAuth = () => {
        const userId = localStorage.getItem('userId');
        const username = localStorage.getItem('username');
        if (userId && username) {
            authScreen.classList.add('hidden');
            mainApp.classList.remove('hidden');
            welcomeUser.textContent = `Hi, ${username}!`;
            fetchLibrary();
        }
    };

    // Авторизация
    loginBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: usernameInput.value, password: passwordInput.value})
            });
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('userId', data.user_id);
                localStorage.setItem('username', data.username);
                location.reload();
            } else {
                authMessage.textContent = data.error || 'Login failed';
                authMessage.style.color = '#f87171';
            }
        } catch (error) {
            console.error('Login error:', error);
            authMessage.textContent = 'Network error. Check if backend is running at ' + API_BASE_URL;
            authMessage.style.color = '#f87171';
        }
    });

    // Регистрация
    registerBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: usernameInput.value, password: passwordInput.value})
            });
            const data = await response.json();
            
            if (response.ok) {
                authMessage.style.color = '#4ade80';
                authMessage.textContent = "Success! Now you can log in.";
            } else {
                authMessage.style.color = '#f87171';
                authMessage.textContent = data.error || 'Registration failed';
            }
        } catch (error) {
            console.error('Registration error:', error);
            authMessage.style.color = '#f87171';
            authMessage.textContent = 'Network error. Check if backend is running at ' + API_BASE_URL;
        }
    });

    // Выход
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        location.reload();
    });

    // Получение библиотеки
    const fetchLibrary = async () => {
        const userId = localStorage.getItem('userId');
        try {
            const response = await fetch(`${API_BASE_URL}/api/tracks`, {
                headers: {'X-User-ID': userId}
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            tracksData = await response.json();
            renderTracks(tracksData);
        } catch (error) {
            console.error('Fetch library error:', error);
            trackList.innerHTML = '<div class="empty-state">Error loading tracks. Backend may be offline.</div>';
        }
    };

    const renderTracks = (tracks) => {
        trackList.innerHTML = '';
        trackElements = [];
        if (tracks.length === 0) {
            trackList.innerHTML = '<div class="empty-state">No tracks found. Upload one!</div>';
            return;
        }

        tracks.forEach((trackObj, index) => {
            const div = document.createElement('div');
            div.className = 'track-item';
            div.textContent = trackObj.filename;
            trackElements.push(div);

            div.addEventListener('click', () => {
                playTrack(index);
            });
            trackList.appendChild(div);
        });
    };

    const playTrack = (index) => {
        trackElements.forEach(el => el.classList.remove('playing'));
        trackElements[index].classList.add('playing');
        
        const trackObj = tracksData[index];
        currentTrackName.textContent = trackObj.filename;
        audio.src = trackObj.url; // Прямая ссылка на Supabase!
        audio.play();
        playBtn.textContent = '❚❚';
    };

    // Простые управления
    playBtn.addEventListener('click', () => {
        if (!audio.src) return;
        if (audio.paused) { audio.play(); playBtn.textContent = '❚❚'; }
        else { audio.pause(); playBtn.textContent = '▶'; }
    });

    repeatBtn.addEventListener('click', () => {
        isRepeatOne = !isRepeatOne;
        audio.loop = isRepeatOne;
        repeatBtn.classList.toggle('active', isRepeatOne);
    });

    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        const percent = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = `${percent}%`;
        progressKnob.style.left = `calc(${percent}% - 6px)`;
        currentTimeText.textContent = Math.floor(audio.currentTime / 60) + ":" + ("0" + Math.floor(audio.currentTime % 60)).slice(-2);
    });

    audio.addEventListener('loadedmetadata', () => {
        totalTimeText.textContent = Math.floor(audio.duration / 60) + ":" + ("0" + Math.floor(audio.duration % 60)).slice(-2);
    });

    progressContainer.addEventListener('click', (e) => {
        if (!audio.src) return;
        const rect = progressContainer.getBoundingClientRect();
        audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    });

    volumeSlider.addEventListener('input', (e) => { audio.volume = e.target.value; });

    // Загрузка файла
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const userId = localStorage.getItem('userId');
        currentTrackName.textContent = "Uploading to cloud...";

        try {
            const response = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                headers: {'X-User-ID': userId},
                body: formData
            });

            if (response.ok) {
                currentTrackName.textContent = "Success!";
                fetchLibrary();
            } else {
                const data = await response.json();
                currentTrackName.textContent = data.error || "Error during upload.";
            }
        } catch (error) {
            console.error('Upload error:', error);
            currentTrackName.textContent = "Network error during upload.";
        } finally {
            fileInput.value = '';
        }
    });

    checkAuth();
});