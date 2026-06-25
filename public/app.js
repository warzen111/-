
let db = [];
const audio = new Audio();
audio.volume = 0.7;

const appState = {
    currentTrackId: null,
    isPlaying: false,
    favorites: new Set(),
    volume: 0.7,
    currentView: 'home-view',
    playlists: [],
    currentPlaylistViewId: null,
    user: null
};

let tempSelectedTracks = new Set();

// --- Auth Logic ---
function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginBtn = document.getElementById('login-tab-btn');
    const registerBtn = document.getElementById('register-tab-btn');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginBtn.classList.add('bg-primary', 'text-on-primary');
        loginBtn.classList.remove('text-on-surface-variant');
        registerBtn.classList.remove('bg-primary', 'text-on-primary');
        registerBtn.classList.add('text-on-surface-variant');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        registerBtn.classList.add('bg-primary', 'text-on-primary');
        registerBtn.classList.remove('text-on-surface-variant');
        loginBtn.classList.remove('bg-primary', 'text-on-primary');
        loginBtn.classList.add('text-on-surface-variant');
    }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
        appState.user = data.user;
        localStorage.setItem('user', JSON.stringify(data.user));
        initApp();
    } else {
        alert(data.error);
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    if (res.ok) {
        alert('Регистрация успешна! Теперь войдите.');
        switchAuthTab('login');
    } else {
        alert(data.error);
    }
});

function logout() {
    localStorage.removeItem('user');
    appState.user = null;
    location.reload();
}

// --- App Initialization ---
async function initApp() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        appState.user = JSON.parse(savedUser);
    }

    if (!appState.user) {
        document.getElementById('auth-page').classList.remove('hidden');
        return;
    }

    document.getElementById('auth-page').classList.add('hidden');
    document.getElementById('user-name-display').innerText = appState.user.name;
    document.getElementById('profile-name-display').innerText = appState.user.name;

    // Fetch tracks
    const res = await fetch('/api/tracks');
    db = await res.json();

    renderAllViews();
    showPage('home-view');
}

// --- Player Logic ---
function formatTime(seconds) {
    if (!seconds || Number.isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secondsPart = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secondsPart}`;
}

audio.ontimeupdate = () => {
    const currentTime = document.getElementById('player-current-time');
    const durationTime = document.getElementById('player-duration');
    const progress = document.getElementById('player-progress');
    if (audio.duration) {
        const percent = (audio.currentTime / audio.duration) * 100;
        progress.style.width = `${percent}%`;
        currentTime.innerText = formatTime(audio.currentTime);
        durationTime.innerText = formatTime(audio.duration);
    }
};

audio.onended = () => playNext();

function playTrack(id) {
    const track = db.find(t => t.id === id);
    if (!track) return;

    if (appState.currentTrackId === id) {
        togglePlay();
        return;
    }

    appState.currentTrackId = id;
    appState.isPlaying = true;
    audio.src = track.url;
    audio.play();
    updatePlayerUI();
}

function togglePlay() {
    if (!appState.currentTrackId && db.length > 0) {
        playTrack(db[0].id);
        return;
    }
    if (!appState.currentTrackId) return;

    if (audio.paused) {
        audio.play();
        appState.isPlaying = true;
    } else {
        audio.pause();
        appState.isPlaying = false;
    }
    updatePlayerUI();
}

function playNext() {
    const currentIndex = db.findIndex(t => t.id === appState.currentTrackId);
    const nextIndex = (currentIndex + 1) % db.length;
    playTrack(db[nextIndex].id);
}

function playPrevious() {
    const currentIndex = db.findIndex(t => t.id === appState.currentTrackId);
    const prevIndex = (currentIndex - 1 + db.length) % db.length;
    playTrack(db[prevIndex].id);
}

// Progress Bar Seeking
document.getElementById('player-progress-container').addEventListener('click', (e) => {
    if (!audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pos * audio.duration;
});

// Volume Control
const volumeSlider = document.getElementById('volume-slider-container');
volumeSlider.addEventListener('click', (e) => {
    const rect = volumeSlider.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    setVolume(pos);
});

function setVolume(val) {
    appState.volume = Math.max(0, Math.min(1, val));
    audio.volume = appState.volume;
    document.getElementById('volume-slider-fill').style.width = `${appState.volume * 100}%`;
    const icon = document.getElementById('volume-icon');
    if (appState.volume === 0) icon.innerText = 'volume_off';
    else if (appState.volume < 0.5) icon.innerText = 'volume_down';
    else icon.innerText = 'volume_up';
}

function updatePlayerUI() {
    const track = db.find(t => t.id === appState.currentTrackId);
    if (!track) return;

    document.getElementById('player-title').innerText = track.title;
    document.getElementById('player-artist').innerText = track.artist;
    document.getElementById('play-icon').innerText = appState.isPlaying ? 'pause' : 'play_arrow';
    document.getElementById('main-play-icon').innerText = appState.isPlaying ? 'pause' : 'play_arrow';

    const cover = document.getElementById('player-cover');
    const placeholder = document.getElementById('player-cover-placeholder');
    if (track.cover) {
        cover.src = track.cover;
        cover.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        cover.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
}

// --- Routing ---
function showPage(pageId, playlistId = null) {
    appState.currentView = pageId;
    appState.currentPlaylistViewId = playlistId;

    document.querySelectorAll('.spa-view').forEach(el => el.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    // Update Nav
    document.querySelectorAll('.nav-links a').forEach(el => {
        if (el.dataset.target === pageId) {
            el.classList.add('bg-surface-variant', 'text-on-surface');
            el.classList.remove('text-on-surface-variant');
        } else {
            el.classList.remove('bg-surface-variant', 'text-on-surface');
            el.classList.add('text-on-surface-variant');
        }
    });

    if (pageId === 'playlist-view' && playlistId) renderPlaylistView(playlistId);
    if (pageId === 'liked-songs-view') renderLikedSongs();
}

// --- Render Views ---
function getTrackHTML(track, index, layout = 'table') {
    const isActive = track.id === appState.currentTrackId;
    const isLiked = appState.favorites.has(track.id);

    if (layout === 'card') {
        return `
            <div class="bg-surface-container p-4 rounded-xl hover:bg-surface-container-high cursor-pointer transition-all group" onclick="playTrack(${track.id})">
                <div class="aspect-square rounded-lg overflow-hidden mb-4 relative">
                    <img src="${track.cover}" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span class="material-symbols-outlined text-white text-4xl">${isActive && appState.isPlaying ? 'pause' : 'play_arrow'}</span>
                    </div>
                </div>
                <h4 class="font-label-lg truncate ${isActive ? 'text-primary' : 'text-on-surface'}">${track.title}</h4>
                <p class="text-body-md text-on-surface-variant truncate">${track.artist}</p>
            </div>
        `;
    }

    return `
        <div class="grid grid-cols-[30px_1fr_40px] md:grid-cols-[40px_minmax(200px,1fr)_minmax(150px,1fr)_minmax(120px,auto)_40px_60px] gap-4 px-4 py-2 hover:bg-surface-variant/50 rounded-lg items-center cursor-pointer group" onclick="playTrack(${track.id})">
            <div class="text-right pr-2 text-on-surface-variant group-hover:hidden">${isActive ? '🔊' : index}</div>
            <div class="hidden group-hover:block text-right pr-2"><span class="material-symbols-outlined text-sm">${isActive && appState.isPlaying ? 'pause' : 'play_arrow'}</span></div>
            <div class="flex items-center gap-3 overflow-hidden">
                <img src="${track.cover}" class="w-10 h-10 rounded object-cover">
                <div class="truncate">
                    <div class="${isActive ? 'text-primary' : 'text-on-surface'} truncate font-label-lg">${track.title}</div>
                    <div class="text-on-surface-variant truncate text-body-md">${track.artist}</div>
                </div>
            </div>
            <div class="hidden md:block text-on-surface-variant truncate text-body-md">${track.album}</div>
            <div class="hidden md:block text-on-surface-variant text-body-md">${track.date}</div>
            <div class="flex justify-center" onclick="event.stopPropagation(); toggleFavorite(${track.id})">
                <span class="material-symbols-outlined ${isLiked ? 'text-primary fill-icon' : 'text-on-surface-variant'}">favorite</span>
            </div>
            <div class="text-on-surface-variant text-right text-body-md">${track.duration}</div>
        </div>
    `;
}

function renderAllViews() {
    const homeContainer = document.getElementById('home-tracks-container');
    homeContainer.innerHTML = db.map((t, i) => getTrackHTML(t, i + 1, 'card')).join('');
}

function toggleFavorite(id) {
    if (appState.favorites.has(id)) appState.favorites.delete(id);
    else appState.favorites.add(id);
    renderLikedSongs();
    if (appState.currentView === 'home-view') renderAllViews();
}

function renderLikedSongs() {
    const container = document.getElementById('liked-songs-container');
    const liked = db.filter(t => appState.favorites.has(t.id));
    container.innerHTML = liked.map((t, i) => getTrackHTML(t, i + 1)).join('');
    document.getElementById('liked-songs-count').innerText = `${liked.length} треков`;
}

// --- Search Logic ---
document.getElementById('global-search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (query) {
        showPage('search-view');
        const results = db.filter(t => t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query));
        const container = document.getElementById('search-results-container');
        container.innerHTML = results.map((t, i) => getTrackHTML(t, i + 1)).join('');
    } else {
        document.getElementById('search-results-container').innerHTML = '<p class="text-on-surface-variant">Введите запрос в строку поиска для поиска треков...</p>';
    }
});

// --- Playlist Modal Logic ---
function openCreatePlaylistModal() {
    document.getElementById('create-playlist-modal').classList.remove('hidden');
    document.getElementById('create-playlist-modal').classList.add('flex');
    tempSelectedTracks.clear();
    renderPlaylistTrackSearch('');
}

function closeCreatePlaylistModal() {
    document.getElementById('create-playlist-modal').classList.add('hidden');
    document.getElementById('create-playlist-modal').classList.remove('flex');
}

function renderPlaylistTrackSearch(query) {
    const results = db.filter(t => t.title.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query));
    const container = document.getElementById('playlist-track-results');
    container.innerHTML = results.map(track => {
        const isSelected = tempSelectedTracks.has(track.id);
        return `
            <div class="flex items-center justify-between p-2 hover:bg-surface-variant rounded cursor-pointer" onclick="toggleTrackSelection(${track.id})">
                <div class="flex items-center gap-3">
                    <img src="${track.cover}" class="w-8 h-8 rounded object-cover">
                    <div class="truncate">
                        <div class="text-on-surface text-sm">${track.title}</div>
                        <div class="text-on-surface-variant text-xs">${track.artist}</div>
                    </div>
                </div>
                <span class="material-symbols-outlined ${isSelected ? 'text-primary' : 'text-on-surface-variant'}">
                    ${isSelected ? 'check_circle' : 'add_circle'}
                </span>
            </div>
        `;
    }).join('');
    document.getElementById('selected-tracks-count').innerText = tempSelectedTracks.size;
}

document.getElementById('playlist-track-search').addEventListener('input', (e) => {
    renderPlaylistTrackSearch(e.target.value.toLowerCase());
});

function toggleTrackSelection(id) {
    if (tempSelectedTracks.has(id)) tempSelectedTracks.delete(id);
    else tempSelectedTracks.add(id);
    renderPlaylistTrackSearch(document.getElementById('playlist-track-search').value.toLowerCase());
}

function savePlaylist() {
    const name = document.getElementById('new-playlist-name').value || 'Новый плейлист';
    const playlist = {
        id: Date.now(),
        name,
        tracks: Array.from(tempSelectedTracks).map(id => db.find(t => t.id === id))
    };
    appState.playlists.push(playlist);
    renderLibrary();
    closeCreatePlaylistModal();
}

function renderLibrary() {
    const sidebar = document.getElementById('user-playlists-nav');
    sidebar.innerHTML = appState.playlists.map(p => `
        <a class="flex items-center gap-4 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-variant transition-colors" href="#" onclick="showPage('playlist-view', ${p.id}); return false;">
            <span class="material-symbols-outlined">queue_music</span> <span class="truncate">${p.name}</span>
        </a>
    `).join('');

    const libContainer = document.getElementById('library-playlists-container');
    libContainer.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">` +
        appState.playlists.map(p => `
            <div class="bg-surface-container p-4 rounded-xl hover:bg-surface-container-high cursor-pointer transition-all" onclick="showPage('playlist-view', ${p.id})">
                <div class="aspect-square bg-surface-variant rounded-lg mb-4 flex items-center justify-center">
                    <span class="material-symbols-outlined text-4xl">queue_music</span>
                </div>
                <h4 class="font-label-lg truncate">${p.name}</h4>
                <p class="text-body-md text-on-surface-variant">${p.tracks.length} треков</p>
            </div>
        `).join('') + `</div>`;
}

function renderPlaylistView(id) {
    const playlist = appState.playlists.find(p => p.id === id);
    if (!playlist) return;
    document.getElementById('playlist-view-title').innerText = playlist.name;
    document.getElementById('playlist-songs-count').innerText = `${playlist.tracks.length} треков`;
    document.getElementById('playlist-songs-container').innerHTML = playlist.tracks.map((t, i) => getTrackHTML(t, i + 1)).join('');
}

// --- Cursor Highlight ---
const cursor = document.getElementById('cursor-highlight');
document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
});

initApp();
