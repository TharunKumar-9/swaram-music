// ==========================================================================
// Swaram — Retro Music Player (Tollywood Edition)
// Comprehensive Audio Streaming & YouTube Integration Engine
// ==========================================================================

// --- State Management ---
const state = {
  queue: [],
  currentIndex: -1,
  currentSong: null,
  isPlaying: false,
  isMuted: false,
  volume: 0.8,
  quality: '320', // '320' | '160' | '96'
  repeatMode: 'all', // 'off' | 'all' | 'one'
  isShuffled: false,
  originalQueue: [],
  playbackSource: 'audio', // 'audio' | 'youtube'
  centerMode: 'art', // 'art' | 'vinyl' | 'lyrics' | 'youtube'
  activeTab: 'home',
  likedSongs: JSON.parse(localStorage.getItem('swaram_liked') || '[]'),
  customPlaylists: JSON.parse(localStorage.getItem('swaram_playlists') || '[]'),
  targetSongForPlaylist: null,
  editingPlaylistId: null,
  history: JSON.parse(localStorage.getItem('swaram_history') || '[]').slice(0, 20),
  sleepTimerTimeout: null,
  sleepTimerEndTrack: false,
  ytPlayer: null,
  ytReady: false,
  downloadedSongIds: new Set(),
  isOfflineSource: false,
  currentBlobUrl: null
};

// --- DOM References ---
const audio = document.getElementById('native-audio');
const miniPlayer = document.getElementById('retro-mini-player');
const nowPlayingSheet = document.getElementById('now-playing-sheet');

// Floating Mini Player elements
const miniArt = document.getElementById('mini-art');
const miniTitle = document.getElementById('mini-title');
const miniArtist = document.getElementById('mini-artist');
const miniPlayBtn = document.getElementById('mini-play-btn');
const miniPlayIcon = document.getElementById('mini-play-icon');
const miniPauseIcon = document.getElementById('mini-pause-icon');
const miniPrevBtn = document.getElementById('mini-prev-btn');
const miniNextBtn = document.getElementById('mini-next-btn');
const miniLikeBtn = document.getElementById('mini-like-btn');
const miniProgressFill = document.getElementById('mini-progress-fill');
const miniExpandTrigger = document.getElementById('mini-expand-trigger');
const miniExpandBtn = document.getElementById('mini-expand-btn');

// Full-Screen Now Playing elements
const sheetCloseBtn = document.getElementById('sheet-close-btn');
const sheetArt = document.getElementById('sheet-art');
const sheetVinylSleeveArt = document.getElementById('sheet-vinyl-sleeve-art');
const sheetVinylLabelArt = document.getElementById('sheet-vinyl-label-art');
const sheetTitle = document.getElementById('sheet-title');
const sheetSubtitle = document.getElementById('sheet-subtitle');
const sheetSingers = document.getElementById('sheet-singers');
const sheetLikeBtn = document.getElementById('sheet-like-btn');
const sheetPlayBtn = document.getElementById('sheet-play-btn');
const sheetPlayIcon = document.getElementById('sheet-play-icon');
const sheetPauseIcon = document.getElementById('sheet-pause-icon');
const sheetPrevBtn = document.getElementById('sheet-prev-btn');
const sheetNextBtn = document.getElementById('sheet-next-btn');
const sheetShuffleBtn = document.getElementById('sheet-shuffle-btn');
const sheetRepeatBtn = document.getElementById('sheet-repeat-btn');
const repeatOneIndicator = document.getElementById('repeat-one-indicator');
const sheetSeekSlider = document.getElementById('sheet-seek-slider');
const sheetCurrentTime = document.getElementById('sheet-current-time');
const sheetTotalTime = document.getElementById('sheet-total-time');
const sheetVolumeSlider = document.getElementById('sheet-volume-slider');
const sheetMuteBtn = document.getElementById('sheet-mute-btn');
const volumeHighIcon = document.getElementById('volume-high-icon');
const volumeMutedIcon = document.getElementById('volume-muted-icon');
const qualitySelect = document.getElementById('quality-select');
const qualityBadge = document.getElementById('quality-badge');
const sheetSourceBadge = document.getElementById('sheet-source-badge');
const sheetYtWatchBtn = document.getElementById('sheet-yt-watch-btn');
const lyricsContainer = document.getElementById('lyrics-container');

// Tabs and Views
const navTabs = document.querySelectorAll('.nav-tab');
const tabViews = document.querySelectorAll('.tab-view');
const moodChipsBar = document.getElementById('mood-chips');
const singerChipsBar = document.getElementById('singer-chips');
const categoryChipsBar = document.getElementById('category-chips');
const queueDrawer = document.getElementById('queue-drawer');
const queueList = document.getElementById('queue-list');
const queueCloseBtn = document.getElementById('queue-close-btn');
const queueClearBtn = document.getElementById('queue-clear-btn');
const headerQueueBtn = document.getElementById('header-queue-btn');
const sheetQueueBtn = document.getElementById('sheet-queue-btn');
const queueBadgeCount = document.getElementById('queue-badge-count');
const queueTotalCount = document.getElementById('queue-total-count');

// Search elements
const globalSearch = document.getElementById('global-search');
const searchClearBtn = document.getElementById('search-clear-btn');
const searchSongsTbody = document.getElementById('search-songs-tbody');
const searchAlbumsGrid = document.getElementById('search-albums-grid');
const searchQuerySubtitle = document.getElementById('search-query-subtitle');

// Modals
const sleepTimerBtn = document.getElementById('sleep-timer-btn');
const sleepModal = document.getElementById('sleep-modal');
const sleepModalClose = document.getElementById('sleep-modal-close');
const sleepTimerLabel = document.getElementById('sleep-timer-label');
const newPlaylistBtn = document.getElementById('new-playlist-btn');
const playlistModal = document.getElementById('playlist-modal');
const playlistModalHeading = document.getElementById('playlist-modal-heading');
const playlistModalClose = document.getElementById('playlist-modal-close');
const cancelPlaylistBtn = document.getElementById('cancel-playlist-btn');
const savePlaylistBtn = document.getElementById('save-playlist-btn');
const newPlaylistNameInput = document.getElementById('new-playlist-name');
const newPlaylistDescInput = document.getElementById('new-playlist-desc');

// Add to Playlist Picker Modal elements
const addToPlaylistModal = document.getElementById('add-to-playlist-modal');
const addToPlaylistModalClose = document.getElementById('add-to-playlist-modal-close');
const pickerTargetArt = document.getElementById('picker-target-art');
const pickerTargetTitle = document.getElementById('picker-target-title');
const pickerTargetSub = document.getElementById('picker-target-sub');
const pickerQuickName = document.getElementById('picker-quick-name');
const pickerQuickCreateBtn = document.getElementById('picker-quick-create-btn');
const pickerPlaylistsList = document.getElementById('picker-playlists-list');

// Additional Playlist Action buttons
const sheetPlaylistBtn = document.getElementById('sheet-playlist-btn');
const detailRenameBtn = document.getElementById('detail-rename-btn');
const detailDeleteBtn = document.getElementById('detail-delete-btn');

// --- Toast Notification Helper ---
function showToast(message) {
  let toast = document.getElementById('swaram-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'swaram-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: rgba(20, 24, 33, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
      padding: 12px 24px;
      border-radius: 9999px;
      font-size: 0.88rem;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      transition: all 0.25s cubic-bezier(0.2, 0.9, 0.3, 1);
      backdrop-filter: blur(16px);
      white-space: nowrap;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 3200);
}

// --- IndexedDB Offline Storage Engine ---
const OfflineDB = {
  dbName: 'SwaramOfflineDB',
  dbVersion: 1,
  db: null,

  async init() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported in this browser environment');
        return resolve();
      }
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('downloads')) {
          const store = db.createObjectStore('downloads', { keyPath: 'id' });
          store.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        this.refreshDownloadedIds().then(resolve);
      };
      request.onerror = (e) => {
        console.error('IndexedDB open error:', e);
        resolve();
      };
    });
  },

  async refreshDownloadedIds() {
    try {
      const songs = await this.getAllSongs();
      state.downloadedSongIds = new Set(songs.map(s => s.id));
      updateDownloadsCountBadge();
    } catch (e) {
      console.warn('Could not refresh downloaded IDs:', e);
    }
  },

  isDownloaded(id) {
    return state.downloadedSongIds && state.downloadedSongIds.has(id);
  },

  async saveSong(song, audioBlob, imageBlob) {
    if (!this.db) return false;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('downloads', 'readwrite');
        const store = tx.objectStore('downloads');
        const sizeBytes = audioBlob.size + (imageBlob ? imageBlob.size : 0);
        const record = {
          id: song.id,
          title: song.title,
          movie: song.movie,
          singers: song.singers,
          music: song.music,
          year: song.year || '2024',
          duration: song.duration || 0,
          durationFormatted: song.durationFormatted || '3:30',
          image: song.image,
          imageSmall: song.imageSmall,
          audio_320: song.audio_320,
          audio_160: song.audio_160,
          audio_96: song.audio_96,
          audioBlob,
          imageBlob,
          sizeBytes,
          downloadedAt: Date.now()
        };
        const req = store.put(record);
        req.onsuccess = () => {
          state.downloadedSongIds.add(song.id);
          updateDownloadsCountBadge();
          resolve(true);
        };
        req.onerror = () => resolve(false);
      } catch (err) {
        console.error('saveSong error:', err);
        resolve(false);
      }
    });
  },

  async getSong(id) {
    if (!this.db || !id) return null;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('downloads', 'readonly');
        const store = tx.objectStore('downloads');
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  },

  async getAllSongs() {
    if (!this.db) return [];
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('downloads', 'readonly');
        const store = tx.objectStore('downloads');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          list.sort((a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0));
          resolve(list);
        };
        req.onerror = () => resolve([]);
      } catch (e) {
        resolve([]);
      }
    });
  },

  async deleteSong(id) {
    if (!this.db) return false;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('downloads', 'readwrite');
        const store = tx.objectStore('downloads');
        const req = store.delete(id);
        req.onsuccess = () => {
          state.downloadedSongIds.delete(id);
          updateDownloadsCountBadge();
          resolve(true);
        };
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  async clearAll() {
    if (!this.db) return false;
    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction('downloads', 'readwrite');
        const store = tx.objectStore('downloads');
        const req = store.clear();
        req.onsuccess = () => {
          state.downloadedSongIds.clear();
          updateDownloadsCountBadge();
          resolve(true);
        };
        req.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }
};

function updateDownloadsCountBadge() {
  const badge = document.getElementById('nav-downloads-count');
  if (badge) {
    const count = state.downloadedSongIds ? state.downloadedSongIds.size : 0;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }
}

// Download song for in-app offline listening
async function downloadSongForOffline(song, triggerBtn = null) {
  if (!song) return;
  if (OfflineDB.isDownloaded(song.id)) {
    showToast(`"${song.title}" is already downloaded`);
    return;
  }

  if (triggerBtn) {
    triggerBtn.classList.add('downloading');
    triggerBtn.title = 'Downloading...';
  }
  const sheetDlBtn = document.getElementById('sheet-download-btn');
  if (state.currentSong?.id === song.id && sheetDlBtn) {
    sheetDlBtn.classList.add('downloading');
  }

  showToast(`Downloading "${song.title}" for offline playback...`);

  try {
    const rawAudioUrl = song.audio_320 || song.audio_160 || song.audio_96;
    if (!rawAudioUrl) throw new Error('No audio URL available for this song');

    // Fetch 320 kbps stream as Blob
    const audioStreamUrl = `/api/stream?url=${encodeURIComponent(rawAudioUrl)}`;
    const audioBlob = await fetch(audioStreamUrl).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.blob();
    });

    // Fetch high-res image as Blob
    let imageBlob = null;
    if (song.image) {
      try {
        const imgProxyUrl = `/api/stream?url=${encodeURIComponent(song.image)}`;
        imageBlob = await fetch(imgProxyUrl).then(r => r.ok ? r.blob() : null).catch(() => null);
      } catch (e) {}
    }

    const saved = await OfflineDB.saveSong(song, audioBlob, imageBlob);
    if (saved) {
      showToast(`✅ "${song.title}" saved! Available in Offline Downloads.`);
      if (triggerBtn) {
        triggerBtn.classList.remove('downloading');
        triggerBtn.classList.add('downloaded');
        triggerBtn.title = 'Downloaded (Offline Ready)';
        triggerBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`;
      }
      if (state.currentSong?.id === song.id && sheetDlBtn) {
        sheetDlBtn.classList.remove('downloading');
        sheetDlBtn.classList.add('downloaded');
        sheetDlBtn.title = 'Downloaded (Offline Ready)';
        sheetDlBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`;
      }
      if (state.activeTab === 'downloads') {
        renderDownloadsView();
      }
    } else {
      throw new Error('Failed to save in offline database');
    }
  } catch (err) {
    console.error('Download error:', err);
    showToast(`❌ Download failed: ${err.message}`);
    if (triggerBtn) {
      triggerBtn.classList.remove('downloading');
      triggerBtn.title = 'Download for Offline';
    }
    if (sheetDlBtn) {
      sheetDlBtn.classList.remove('downloading');
    }
  }
}

// Download song to user's local disk
function downloadSongToDisk(song) {
  if (!song) return;
  const rawUrl = song.audio_320 || song.audio_160 || song.audio_96;
  if (!rawUrl) {
    showToast('Download link not available');
    return;
  }
  const dlUrl = `/api/download?url=${encodeURIComponent(rawUrl)}&title=${encodeURIComponent(song.title)}&movie=${encodeURIComponent(song.movie)}`;
  const a = document.createElement('a');
  a.href = dlUrl;
  a.download = `${song.title} - ${song.movie}.m4a`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast(`Saving "${song.title}" to device Downloads folder...`);
}

// Render Offline Downloads View
async function renderDownloadsView() {
  const songs = await OfflineDB.getAllSongs();
  const summaryEl = document.getElementById('downloads-summary-subtitle');
  const emptyState = document.getElementById('downloads-empty-state');
  const tableContainer = document.getElementById('downloads-table-container');
  const tbody = document.getElementById('downloads-tbody');

  let totalBytes = 0;
  songs.forEach(s => totalBytes += (s.sizeBytes || 0));
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);

  if (summaryEl) {
    summaryEl.textContent = `${songs.length} song${songs.length === 1 ? '' : 's'} saved for offline playback • ${totalMB} MB used`;
  }
  updateDownloadsCountBadge();

  if (songs.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    if (tableContainer) tableContainer.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (tableContainer) tableContainer.style.display = 'block';
  if (!tbody) return;
  tbody.innerHTML = '';

  songs.forEach((song, idx) => {
    const tr = document.createElement('tr');
    const isPlayingThis = state.currentSong && state.currentSong.id === song.id;
    if (isPlayingThis) tr.className = 'active-song';

    const songMB = ((song.sizeBytes || 0) / (1024 * 1024)).toFixed(1);

    tr.innerHTML = `
      <td class="col-num">${idx + 1}</td>
      <td class="col-title">
        <div class="song-title-cell">
          <img src="${song.imageSmall || song.image || 'https://c.saavncdn.com/366/Pushpa-2-The-Rule-Telugu-Telugu-2024-20241205211012-500x500.jpg'}" alt="" class="song-cell-art">
          <div class="song-title-info">
            <span class="song-title-text">${song.title}</span>
            <div class="song-mobile-subtitle">${song.movie ? `${song.movie} • ` : ''}${song.singers || song.music || ''}</div>
            <span class="offline-badge">⚡ Offline</span>
          </div>
        </div>
      </td>
      <td class="col-movie">${song.movie}</td>
      <td class="col-artists">${song.singers || song.music}</td>
      <td class="col-time">${songMB} MB</td>
      <td class="col-actions">
        <button class="song-action-btn export-btn" title="Save file to PC (Download)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        </button>
        <button class="song-action-btn delete-btn" title="Remove from offline storage">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </td>
    `;

    tr.querySelector('.col-title').addEventListener('click', () => {
      playSong(song, songs, idx);
    });

    tr.querySelector('.export-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      downloadSongToDisk(song);
    });

    tr.querySelector('.delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm(`Remove "${song.title}" from offline storage?`)) {
        await OfflineDB.deleteSong(song.id);
        showToast(`Removed "${song.title}" from offline storage`);
        renderDownloadsView();
        // Update any visible download buttons
        document.querySelectorAll(`.download-btn[data-id="${song.id}"]`).forEach(btn => {
          btn.classList.remove('downloaded');
          btn.title = 'Download for Offline';
          btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
        });
        if (state.currentSong?.id === song.id) {
          updateSheetDownloadBtn(song.id);
        }
      }
    });

    tbody.appendChild(tr);
  });
}

function updateSheetDownloadBtn(songId) {
  const btn = document.getElementById('sheet-download-btn');
  if (!btn) return;
  const isDownloaded = OfflineDB.isDownloaded(songId);
  btn.classList.toggle('downloaded', isDownloaded);
  btn.title = isDownloaded ? 'Downloaded (Offline Ready)' : 'Download for Offline';
  if (isDownloaded) {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>`;
  } else {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
  }
}

// Wire up Downloads view header actions
function initDownloadsViewEvents() {
  document.getElementById('play-all-downloads-btn')?.addEventListener('click', async () => {
    const songs = await OfflineDB.getAllSongs();
    if (songs.length > 0) {
      playSong(songs[0], songs, 0);
    } else {
      showToast('No downloaded songs available');
    }
  });

  document.getElementById('shuffle-all-downloads-btn')?.addEventListener('click', async () => {
    const songs = await OfflineDB.getAllSongs();
    if (songs.length > 0) {
      const randIdx = Math.floor(Math.random() * songs.length);
      playSong(songs[randIdx], songs, randIdx);
      if (!state.isShuffled) sheetShuffleBtn.click();
    } else {
      showToast('No downloaded songs available');
    }
  });

  document.getElementById('clear-all-downloads-btn')?.addEventListener('click', async () => {
    const songs = await OfflineDB.getAllSongs();
    if (songs.length === 0) {
      showToast('No downloaded songs to clear');
      return;
    }
    if (confirm(`Are you sure you want to remove all ${songs.length} songs from offline storage?`)) {
      await OfflineDB.clearAll();
      showToast('Cleared all offline downloads');
      renderDownloadsView();
    }
  });

  document.getElementById('downloads-explore-btn')?.addEventListener('click', () => switchTab('home'));

  // Sheet download button click
  document.getElementById('sheet-download-btn')?.addEventListener('click', () => {
    if (state.currentSong) {
      downloadSongForOffline(state.currentSong);
    }
  });
}

// Network online/offline event listeners
function initNetworkListeners() {
  const offlineBanner = document.getElementById('offline-banner');
  const updateBanner = () => {
    if (!navigator.onLine) {
      offlineBanner?.classList.remove('hidden');
    } else {
      offlineBanner?.classList.add('hidden');
    }
  };
  window.addEventListener('online', updateBanner);
  window.addEventListener('offline', updateBanner);
  updateBanner();

  document.getElementById('offline-view-btn')?.addEventListener('click', () => {
    switchTab('downloads');
  });
}

// ==========================================================================
// --- Privacy Accounts & Multi-User Profiles Engine ---
// ==========================================================================

const AccountManager = {
  accounts: [],
  activeAccount: null,
  pendingSwitchAccount: null,
  enteredPin: '',

  init() {
    // 1. Load accounts from localStorage
    let storedAccounts = [];
    try {
      storedAccounts = JSON.parse(localStorage.getItem('swaram_accounts') || '[]');
    } catch (e) {
      storedAccounts = [];
    }

    // 2. Migration: If no accounts exist yet, create default account with existing data
    if (!Array.isArray(storedAccounts) || storedAccounts.length === 0) {
      const defaultAccount = {
        id: 'acc_default',
        name: 'My Profile',
        avatar: '🎧',
        pin: null,
        theme: localStorage.getItem('swaram_theme') || 'amoled',
        likedSongs: state.likedSongs || [],
        customPlaylists: state.customPlaylists || [],
        history: state.history || [],
        createdAt: Date.now(),
        lastActive: Date.now()
      };
      storedAccounts = [defaultAccount];
      localStorage.setItem('swaram_accounts', JSON.stringify(storedAccounts));
      localStorage.setItem('swaram_active_account_id', defaultAccount.id);
    }

    this.accounts = storedAccounts;

    // 3. Determine active account
    const activeId = localStorage.getItem('swaram_active_account_id') || this.accounts[0].id;
    let found = this.accounts.find(a => a.id === activeId) || this.accounts[0];
    this.activeAccount = found;

    // 4. Apply active account's private data to global state
    this.applyAccountData(this.activeAccount);

    // 5. Wire DOM events & UI
    this.initUI();

    // 6. Asynchronously sync accounts with backend server
    this.syncWithServer();
  },

  applyAccountData(account) {
    if (!account) return;
    this.activeAccount = account;
    localStorage.setItem('swaram_active_account_id', account.id);

    state.likedSongs = account.likedSongs || [];
    state.customPlaylists = account.customPlaylists || [];
    state.history = (account.history || []).slice(0, 20);

    // Save mirrors for backward compatibility
    localStorage.setItem('swaram_liked', JSON.stringify(state.likedSongs));
    localStorage.setItem('swaram_playlists', JSON.stringify(state.customPlaylists));
    localStorage.setItem('swaram_history', JSON.stringify(state.history));

    // Apply theme
    if (account.theme && typeof applyTheme === 'function') {
      applyTheme(account.theme);
    }

    // Update UI Header & tabs
    this.updateHeaderProfile();
    if (typeof renderLikedCount === 'function') renderLikedCount();
    if (typeof renderCustomPlaylists === 'function') renderCustomPlaylists();
    if (typeof updateHistoryUI === 'function') updateHistoryUI();
    if (typeof renderHistoryCarousel === 'function') renderHistoryCarousel();
    if (state.activeTab === 'history' && typeof renderHistoryView === 'function') renderHistoryView();
  },

  updateHeaderProfile() {
    const avatarEl = document.getElementById('account-avatar');
    const nameEl = document.getElementById('account-name');
    const lockBadge = document.getElementById('account-lock-badge');

    if (avatarEl && this.activeAccount) avatarEl.textContent = this.activeAccount.avatar || '🎧';
    if (nameEl && this.activeAccount) nameEl.textContent = this.activeAccount.name || 'My Profile';
    if (lockBadge) {
      const isLocked = !!(this.activeAccount && this.activeAccount.pin);
      lockBadge.classList.toggle('hidden', !isLocked);
    }
  },

  async syncWithServer() {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.accounts)) {
        // Merge server accounts with local accounts
        data.accounts.forEach(sAcc => {
          const local = this.accounts.find(a => a.id === sAcc.id);
          if (!local) {
            this.accounts.push({
              id: sAcc.id,
              name: sAcc.name,
              avatar: sAcc.avatar,
              hasPin: sAcc.hasPin,
              theme: sAcc.theme,
              likedSongs: [],
              customPlaylists: [],
              history: []
            });
          }
        });
        this.saveAccountsLocally();
      }
    } catch (e) {
      // Offline mode - perfectly fine!
    }
  },

  saveAccountsLocally() {
    try {
      localStorage.setItem('swaram_accounts', JSON.stringify(this.accounts));
    } catch (e) {
      console.error('Error saving accounts locally:', e);
    }
  },

  syncActiveData() {
    if (!this.activeAccount) return;
    this.activeAccount.likedSongs = state.likedSongs;
    this.activeAccount.customPlaylists = state.customPlaylists;
    this.activeAccount.history = state.history;
    this.activeAccount.lastActive = Date.now();
    this.saveAccountsLocally();

    // Async sync to server
    fetch('/api/accounts/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: this.activeAccount.id,
        pin: this.activeAccount.pin,
        likedSongs: state.likedSongs,
        customPlaylists: state.customPlaylists,
        history: state.history,
        theme: this.activeAccount.theme,
        name: this.activeAccount.name,
        avatar: this.activeAccount.avatar
      })
    }).catch(() => {});
  },

  // Open the main profile switcher modal
  openAccountModal() {
    this.renderAccountModal();
    const modal = document.getElementById('account-modal');
    if (modal) modal.classList.remove('hidden');
  },

  closeAccountModal() {
    const modal = document.getElementById('account-modal');
    if (modal) modal.classList.add('hidden');
    // Hide new account form
    const form = document.getElementById('new-account-form-wrap');
    if (form) form.classList.add('hidden');
  },

  renderAccountModal() {
    const act = this.activeAccount;
    if (!act) return;

    // Active Card
    const avatarEl = document.getElementById('active-profile-avatar');
    const nameEl = document.getElementById('active-profile-name');
    if (avatarEl) avatarEl.textContent = act.avatar || '🎧';
    if (nameEl) nameEl.textContent = act.name || 'My Profile';
    
    const pinStatus = document.getElementById('active-profile-pin-status');
    if (pinStatus) {
      if (act.pin) {
        pinStatus.textContent = '🔒 PIN Protected';
        pinStatus.className = 'profile-status-badge locked';
      } else {
        pinStatus.textContent = '🔓 Public';
        pinStatus.className = 'profile-status-badge';
      }
    }

    const statsEl = document.getElementById('active-profile-stats');
    if (statsEl) {
      const likes = (act.likedSongs || []).length;
      const pls = (act.customPlaylists || []).length;
      const hist = (act.history || []).length;
      statsEl.textContent = `${likes} Likes • ${pls} Playlists • ${hist}/20 History`;
    }

    // Profiles Grid
    const grid = document.getElementById('profiles-list-grid');
    const countTag = document.getElementById('accounts-count-tag');
    if (countTag) countTag.textContent = `${this.accounts.length} ${this.accounts.length === 1 ? 'Account' : 'Accounts'}`;

    if (grid) {
      grid.innerHTML = '';
      this.accounts.forEach(acc => {
        const isActive = acc.id === act.id;
        const card = document.createElement('div');
        card.className = `friend-profile-card ${isActive ? 'active' : ''}`;
        card.innerHTML = `
          ${isActive ? '<span class="friend-card-active-pill">ACTIVE</span>' : ''}
          ${acc.pin || acc.hasPin ? '<span class="friend-card-lock-badge">🔒</span>' : ''}
          <div class="friend-card-avatar">${acc.avatar || '🎧'}</div>
          <div class="friend-card-name">${acc.name}</div>
          <div class="friend-card-stats">${(acc.likedSongs || []).length} Likes • ${(acc.customPlaylists || []).length} PLs</div>
        `;

        card.addEventListener('click', () => {
          if (isActive) {
            showToast(`Already using ${acc.name}'s account`);
            return;
          }
          this.requestSwitchTo(acc);
        });

        grid.appendChild(card);
      });
    }
  },

  requestSwitchTo(targetAcc) {
    // If target has a PIN:
    if (targetAcc.pin || targetAcc.hasPin) {
      this.pendingSwitchAccount = targetAcc;
      this.openPinPrompt(targetAcc);
    } else {
      // Switch immediately
      this.switchToAccount(targetAcc);
    }
  },

  async switchToAccount(account, validatedPin = null) {
    // If account data is incomplete (e.g. from server list), unlock from server:
    if ((!account.likedSongs || account.likedSongs.length === 0) && account.id) {
      try {
        const res = await fetch('/api/accounts/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: account.id, pin: validatedPin })
        });
        const data = await res.json();
        if (data && data.success && data.account) {
          account = { ...account, ...data.account };
          const idx = this.accounts.findIndex(a => a.id === account.id);
          if (idx !== -1) this.accounts[idx] = account;
        }
      } catch (e) {}
    }

    this.applyAccountData(account);
    this.saveAccountsLocally();
    this.closeAccountModal();
    this.closePinPrompt();
    showToast(`Switched to ${account.name}'s private account! ✨`);
  },

  openPinPrompt(targetAcc) {
    this.pendingSwitchAccount = targetAcc;
    this.enteredPin = '';
    const modal = document.getElementById('pin-prompt-modal');
    if (!modal) return;

    document.getElementById('pin-prompt-avatar').textContent = targetAcc.avatar || '🎧';
    document.getElementById('pin-prompt-name').textContent = targetAcc.name;
    document.getElementById('pin-error-msg')?.classList.add('hidden');
    
    this.updatePinDots();
    modal.classList.remove('hidden');

    const hiddenInput = document.getElementById('pin-hidden-input');
    if (hiddenInput) {
      hiddenInput.value = '';
      hiddenInput.focus();
    }
  },

  closePinPrompt() {
    const modal = document.getElementById('pin-prompt-modal');
    if (modal) modal.classList.add('hidden');
    this.pendingSwitchAccount = null;
    this.enteredPin = '';
  },

  updatePinDots() {
    const dots = document.querySelectorAll('#pin-dots-display .pin-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('filled', idx < this.enteredPin.length);
    });
  },

  handlePinDigit(digit) {
    if (this.enteredPin.length < 4) {
      this.enteredPin += digit;
      this.updatePinDots();
      document.getElementById('pin-error-msg')?.classList.add('hidden');
      if (this.enteredPin.length === 4) {
        setTimeout(() => this.submitPin(), 150);
      }
    }
  },

  handlePinBackspace() {
    if (this.enteredPin.length > 0) {
      this.enteredPin = this.enteredPin.slice(0, -1);
      this.updatePinDots();
      document.getElementById('pin-error-msg')?.classList.add('hidden');
    }
  },

  handlePinClear() {
    this.enteredPin = '';
    this.updatePinDots();
    document.getElementById('pin-error-msg')?.classList.add('hidden');
  },

  async submitPin() {
    if (!this.pendingSwitchAccount) return;
    const pin = this.enteredPin;
    const target = this.pendingSwitchAccount;

    // Check local PIN first
    if (target.pin) {
      if (target.pin === pin) {
        this.switchToAccount(target, pin);
        return;
      }
    }

    // Check server PIN
    try {
      const res = await fetch('/api/accounts/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: target.id, pin })
      });
      const data = await res.json();
      if (data && data.success && data.account) {
        this.switchToAccount(data.account, pin);
        return;
      }
    } catch (e) {}

    // PIN Failed
    const errorEl = document.getElementById('pin-error-msg');
    if (errorEl) {
      errorEl.textContent = 'Incorrect PIN. Try again.';
      errorEl.classList.remove('hidden');
    }
    this.handlePinClear();
  },

  lockSession() {
    if (!this.activeAccount) return;
    const name = this.activeAccount.name;
    this.closeAccountModal();

    if (!this.activeAccount.pin) {
      showToast('Profile locked. Set a 4-Digit PIN to password-protect your music.');
    } else {
      showToast(`${name}'s profile locked!`);
    }

    this.openAccountModal();
  },

  async createNewAccount(name, avatar, pin) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      showToast('Please enter friend\'s name');
      return;
    }

    const cleanPin = pin && pin.trim().length === 4 ? pin.trim() : null;

    const newAcc = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      avatar: avatar || '🎧',
      pin: cleanPin,
      theme: 'amoled',
      likedSongs: [],
      customPlaylists: [],
      history: [],
      createdAt: Date.now(),
      lastActive: Date.now()
    };

    this.accounts.push(newAcc);
    this.saveAccountsLocally();

    // Also persist to server
    fetch('/api/accounts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newAcc.name,
        avatar: newAcc.avatar,
        pin: newAcc.pin,
        theme: newAcc.theme
      })
    }).then(r => r.json()).then(data => {
      if (data && data.success && data.account) {
        newAcc.id = data.account.id;
        this.saveAccountsLocally();
      }
    }).catch(() => {});

    // Automatically switch to the newly created account!
    this.switchToAccount(newAcc);
    showToast(`Created private account for ${trimmed}! 🎉`);
  },

  initUI() {
    // Open Account Modal Button
    document.getElementById('account-btn')?.addEventListener('click', () => {
      this.openAccountModal();
    });

    document.getElementById('account-modal-close')?.addEventListener('click', () => {
      this.closeAccountModal();
    });

    // Lock Session
    document.getElementById('lock-profile-btn')?.addEventListener('click', () => {
      this.lockSession();
    });

    // Manage PIN button
    document.getElementById('manage-pin-btn')?.addEventListener('click', () => {
      this.openManagePinModal();
    });

    // Toggle Add Account Form
    document.getElementById('toggle-add-account-btn')?.addEventListener('click', () => {
      const form = document.getElementById('new-account-form-wrap');
      form.classList.toggle('hidden');
    });

    document.getElementById('cancel-create-account-btn')?.addEventListener('click', () => {
      document.getElementById('new-account-form-wrap').classList.add('hidden');
    });

    // Avatar picker selection
    let selectedAvatar = '🎧';
    document.querySelectorAll('.avatar-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.avatar-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        selectedAvatar = opt.getAttribute('data-avatar') || '🎧';
      });
    });

    // PIN toggle in create form
    const pinToggle = document.getElementById('new-account-pin-toggle');
    const pinFieldWrap = document.getElementById('new-account-pin-field-wrap');
    if (pinToggle && pinFieldWrap) {
      pinToggle.addEventListener('change', () => {
        pinFieldWrap.classList.toggle('hidden', !pinToggle.checked);
        if (pinToggle.checked) {
          document.getElementById('new-account-pin')?.focus();
        }
      });
    }

    // Submit Create Account
    document.getElementById('submit-create-account-btn')?.addEventListener('click', () => {
      const name = document.getElementById('new-account-name')?.value;
      const isPin = document.getElementById('new-account-pin-toggle')?.checked;
      const pin = isPin ? document.getElementById('new-account-pin')?.value : null;

      if (isPin && (!pin || pin.length !== 4)) {
        showToast('Please enter a 4-digit PIN');
        return;
      }

      this.createNewAccount(name, selectedAvatar, pin);
      document.getElementById('new-account-name').value = '';
      if (document.getElementById('new-account-pin')) document.getElementById('new-account-pin').value = '';
      if (pinToggle) pinToggle.checked = false;
      pinFieldWrap.classList.add('hidden');
    });

    // PIN Unlock Keypad
    document.querySelectorAll('.numeric-keypad .keypad-key[data-digit]').forEach(k => {
      k.addEventListener('click', () => {
        this.handlePinDigit(k.getAttribute('data-digit'));
      });
    });

    document.getElementById('keypad-clear-btn')?.addEventListener('click', () => {
      this.handlePinClear();
    });

    document.getElementById('keypad-backspace-btn')?.addEventListener('click', () => {
      this.handlePinBackspace();
    });

    document.getElementById('submit-pin-btn')?.addEventListener('click', () => {
      this.submitPin();
    });

    document.getElementById('cancel-pin-btn')?.addEventListener('click', () => {
      this.closePinPrompt();
      this.openAccountModal();
    });

    document.getElementById('pin-prompt-modal-close')?.addEventListener('click', () => {
      this.closePinPrompt();
    });

    // Hardware keyboard support for PIN input
    const hiddenPinInput = document.getElementById('pin-hidden-input');
    if (hiddenPinInput) {
      hiddenPinInput.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
        this.enteredPin = val;
        this.updatePinDots();
        if (this.enteredPin.length === 4) {
          setTimeout(() => this.submitPin(), 150);
        }
      });
    }

    // Manage PIN Modal events
    document.getElementById('manage-pin-modal-close')?.addEventListener('click', () => {
      document.getElementById('manage-pin-modal')?.classList.add('hidden');
    });

    document.getElementById('cancel-manage-pin-btn')?.addEventListener('click', () => {
      document.getElementById('manage-pin-modal')?.classList.add('hidden');
    });

    document.getElementById('save-manage-pin-btn')?.addEventListener('click', () => {
      this.savePinChange();
    });
  },

  openManagePinModal() {
    const modal = document.getElementById('manage-pin-modal');
    if (!modal) return;
    const act = this.activeAccount;
    const currentPinGroup = document.getElementById('manage-current-pin-group');
    if (currentPinGroup) {
      currentPinGroup.style.display = act && act.pin ? 'block' : 'none';
    }
    const curIn = document.getElementById('manage-current-pin');
    const newIn = document.getElementById('manage-new-pin');
    if (curIn) curIn.value = '';
    if (newIn) newIn.value = '';
    modal.classList.remove('hidden');
  },

  async savePinChange() {
    const act = this.activeAccount;
    if (!act) return;

    const curIn = document.getElementById('manage-current-pin');
    const newIn = document.getElementById('manage-new-pin');
    const currentPin = curIn ? curIn.value.trim() : '';
    const newPin = newIn ? newIn.value.trim() : '';

    if (act.pin && currentPin !== act.pin) {
      showToast('Current PIN is incorrect');
      return;
    }

    if (newPin && newPin.length !== 4) {
      showToast('New PIN must be exactly 4 digits');
      return;
    }

    act.pin = newPin ? newPin : null;
    this.saveAccountsLocally();
    this.updateHeaderProfile();
    this.renderAccountModal();

    // Sync to server
    fetch('/api/accounts/change-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: act.id,
        currentPin: currentPin,
        newPin: newPin
      })
    }).catch(() => {});

    document.getElementById('manage-pin-modal')?.classList.add('hidden');
    showToast(newPin ? 'Privacy PIN updated successfully! 🔒' : 'PIN removed. Profile is now public. 🔓');
  }
};

// ==========================================================================
// --- User Custom Playlists Engine ---
// ==========================================================================

function saveCustomPlaylists() {
  try {
    localStorage.setItem('swaram_playlists', JSON.stringify(state.customPlaylists));
    if (typeof AccountManager !== 'undefined' && AccountManager.activeAccount) {
      AccountManager.syncActiveData();
    }
  } catch (e) {
    console.error('Failed to save playlists to localStorage:', e);
  }
}

function createCustomPlaylist(name, desc = '') {
  const trimmed = name ? name.trim() : '';
  if (!trimmed) {
    showToast('Please enter a playlist name');
    return null;
  }
  const playlist = {
    id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    name: trimmed,
    desc: desc ? desc.trim() : 'Custom User Playlist',
    createdAt: Date.now(),
    songs: []
  };
  state.customPlaylists.unshift(playlist);
  saveCustomPlaylists();
  renderCustomPlaylists();
  showToast(`Playlist "${playlist.name}" created!`);
  return playlist;
}

function deleteCustomPlaylist(playlistId) {
  const idx = state.customPlaylists.findIndex(p => p.id === playlistId);
  if (idx === -1) return;
  const pl = state.customPlaylists[idx];
  if (confirm(`Are you sure you want to delete playlist "${pl.name}"?`)) {
    state.customPlaylists.splice(idx, 1);
    saveCustomPlaylists();
    renderCustomPlaylists();
    showToast(`Deleted playlist "${pl.name}"`);
    // If currently viewing this playlist in detail view, return to Library
    if (state.activeTab === 'detail' || document.getElementById('view-detail').classList.contains('active')) {
      switchTab('playlists');
    }
  }
}

function openCreatePlaylistModal() {
  state.editingPlaylistId = null;
  const modal = document.getElementById('playlist-modal');
  const heading = document.getElementById('playlist-modal-heading');
  const nameInput = document.getElementById('new-playlist-name');
  const descInput = document.getElementById('new-playlist-desc');
  if (heading) heading.textContent = 'Create Custom Playlist';
  if (nameInput) nameInput.value = '';
  if (descInput) descInput.value = '';
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
  setTimeout(() => nameInput?.focus(), 60);
}

function closeCreatePlaylistModal() {
  const modal = document.getElementById('playlist-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

function openEditPlaylistModal(playlistId) {
  const pl = state.customPlaylists.find(p => p.id === playlistId);
  if (!pl) return;
  state.editingPlaylistId = playlistId;
  const modal = document.getElementById('playlist-modal');
  const heading = document.getElementById('playlist-modal-heading');
  const nameInput = document.getElementById('new-playlist-name');
  const descInput = document.getElementById('new-playlist-desc');
  if (heading) heading.textContent = 'Edit Playlist';
  if (nameInput) nameInput.value = pl.name;
  if (descInput) descInput.value = pl.desc || '';
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
  setTimeout(() => nameInput?.focus(), 60);
}

function addSongToCustomPlaylist(playlistId, song) {
  if (!song) return false;
  const pl = state.customPlaylists.find(p => p.id === playlistId);
  if (!pl) return false;
  if (pl.songs.some(s => s.id === song.id)) {
    showToast(`"${song.title}" is already in "${pl.name}"`);
    return false;
  }
  pl.songs.push(song);
  saveCustomPlaylists();
  renderCustomPlaylists();
  showToast(`Added "${song.title}" to "${pl.name}"`);
  return true;
}

function removeSongFromCustomPlaylist(playlistId, songId) {
  const pl = state.customPlaylists.find(p => p.id === playlistId);
  if (!pl) return;
  pl.songs = pl.songs.filter(s => s.id !== songId);
  saveCustomPlaylists();
  renderCustomPlaylists();
  showToast('Removed song from playlist');
  // Refresh detail view if currently open on this playlist
  openPlaylistDetail(playlistId);
}

function renderCustomPlaylists() {
  const grid = document.getElementById('custom-playlists-grid');
  if (!grid) return;
  grid.innerHTML = '';

  // Always show "Create Playlist" dashed card first
  const createCard = document.createElement('div');
  createCard.className = 'empty-playlist-card';
  createCard.innerHTML = `
    <div class="empty-playlist-plus">+</div>
    <div style="font-weight:700; margin-bottom:4px; color:var(--text-primary);">Create Playlist</div>
    <div style="font-size:0.8rem; color:var(--text-secondary);">Add your favorite tracks</div>
  `;
  createCard.addEventListener('click', openCreatePlaylistModal);
  grid.appendChild(createCard);

  state.customPlaylists.forEach(pl => {
    const card = document.createElement('div');
    card.className = 'music-card';
    const coverArt = pl.songs.length > 0 && pl.songs[0].image
      ? pl.songs[0].image
      : 'https://c.saavncdn.com/366/Pushpa-2-The-Rule-Telugu-Telugu-2024-20241205211012-500x500.jpg';

    card.innerHTML = `
      <div class="card-art-wrap">
        <img src="${coverArt}" alt="${pl.name}" class="card-art" loading="lazy">
        <button class="card-play-btn" title="Play Playlist">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </button>
        <button class="playlist-card-del-btn" title="Delete Playlist">&times;</button>
      </div>
      <div class="card-title">${pl.name}</div>
      <div class="card-subtitle">${pl.songs.length} song${pl.songs.length === 1 ? '' : 's'}</div>
    `;

    // Click card to open playlist detail
    card.addEventListener('click', () => openPlaylistDetail(pl.id));

    // Play button on card
    card.querySelector('.card-play-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (pl.songs.length > 0) {
        playSong(pl.songs[0], pl.songs, 0);
      } else {
        showToast(`Playlist "${pl.name}" is empty`);
      }
    });

    // Delete button on card
    card.querySelector('.playlist-card-del-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCustomPlaylist(pl.id);
    });

    grid.appendChild(card);
  });
}

function openPlaylistDetail(playlistId) {
  const pl = state.customPlaylists.find(p => p.id === playlistId);
  if (!pl) return;
  const coverArt = pl.songs.length > 0 && pl.songs[0].image
    ? pl.songs[0].image
    : 'https://c.saavncdn.com/366/Pushpa-2-The-Rule-Telugu-Telugu-2024-20241205211012-500x500.jpg';

  renderDetailView(
    pl.name,
    `${pl.desc || 'Custom User Playlist'} • ${pl.songs.length} song${pl.songs.length === 1 ? '' : 's'}`,
    coverArt,
    pl.songs,
    true,
    pl.id
  );
}

function openAddToPlaylistModal(song) {
  if (!song) return;
  state.targetSongForPlaylist = song;

  const targetArt = document.getElementById('picker-target-art');
  const targetTitle = document.getElementById('picker-target-title');
  const targetSub = document.getElementById('picker-target-sub');
  const quickName = document.getElementById('picker-quick-name');
  const modal = document.getElementById('add-to-playlist-modal');

  if (targetArt) {
    targetArt.src = song.imageSmall || song.image || 'https://c.saavncdn.com/366/Pushpa-2-The-Rule-Telugu-Telugu-2024-20241205211012-500x500.jpg';
  }
  if (targetTitle) targetTitle.textContent = song.title;
  if (targetSub) targetSub.textContent = `${song.movie || 'Tollywood'} • ${song.singers || song.music || 'Artist'}`;
  if (quickName) quickName.value = '';

  renderPickerPlaylistsList();
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}

function closeAddToPlaylistModal() {
  const modal = document.getElementById('add-to-playlist-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

function renderPickerPlaylistsList() {
  if (!pickerPlaylistsList) return;
  pickerPlaylistsList.innerHTML = '';

  const song = state.targetSongForPlaylist;

  if (state.customPlaylists.length === 0) {
    pickerPlaylistsList.innerHTML = `
      <div style="text-align:center; padding:24px 12px; color:var(--text-muted); font-size:0.88rem;">
        No playlists created yet.<br>Type a name above and tap <strong>Create</strong>!
      </div>
    `;
    return;
  }

  state.customPlaylists.forEach(pl => {
    const hasSong = song && pl.songs.some(s => s.id === song.id);
    const item = document.createElement('div');
    item.className = `picker-playlist-item ${hasSong ? 'has-song' : ''}`;

    const artSrc = pl.songs.length > 0 && pl.songs[0].image ? pl.songs[0].image : '';
    const artHtml = artSrc
      ? `<img src="${artSrc}" alt="" class="picker-playlist-art">`
      : `<div class="picker-playlist-art">🎵</div>`;

    item.innerHTML = `
      <div class="picker-playlist-left">
        ${artHtml}
        <div class="picker-playlist-text">
          <div class="picker-playlist-name">${pl.name}</div>
          <div class="picker-playlist-count">${pl.songs.length} song${pl.songs.length === 1 ? '' : 's'}${hasSong ? ' • Added' : ''}</div>
        </div>
      </div>
      <div class="picker-playlist-status">
        ${hasSong
          ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>'
          : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
        }
      </div>
    `;

    item.addEventListener('click', () => {
      if (hasSong) {
        showToast(`"${song.title}" is already in "${pl.name}"`);
      } else {
        addSongToCustomPlaylist(pl.id, song);
        renderPickerPlaylistsList();
        setTimeout(() => {
          closeAddToPlaylistModal();
        }, 300);
      }
    });

    pickerPlaylistsList.appendChild(item);
  });
}

function initPlaylistEvents() {
  // Open Create Playlist modal
  const newPlBtn = document.getElementById('new-playlist-btn');
  newPlBtn?.addEventListener('click', openCreatePlaylistModal);

  // Close Create/Edit Modal
  document.getElementById('playlist-modal-close')?.addEventListener('click', closeCreatePlaylistModal);
  document.getElementById('cancel-playlist-btn')?.addEventListener('click', closeCreatePlaylistModal);

  // Save/Create Playlist button
  document.getElementById('save-playlist-btn')?.addEventListener('click', () => {
    const nameInput = document.getElementById('new-playlist-name');
    const descInput = document.getElementById('new-playlist-desc');
    const name = nameInput?.value.trim();
    const desc = descInput?.value.trim() || '';

    if (!name) {
      showToast('Please enter a playlist name');
      nameInput?.focus();
      return;
    }

    if (state.editingPlaylistId) {
      // Editing existing playlist
      const pl = state.customPlaylists.find(p => p.id === state.editingPlaylistId);
      if (pl) {
        pl.name = name;
        pl.desc = desc;
        saveCustomPlaylists();
        renderCustomPlaylists();
        showToast(`Updated playlist "${pl.name}"`);
        openPlaylistDetail(pl.id);
      }
      state.editingPlaylistId = null;
    } else {
      createCustomPlaylist(name, desc);
    }
    closeCreatePlaylistModal();
  });

  // Enter key in Create Playlist inputs
  document.getElementById('new-playlist-name')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('save-playlist-btn')?.click();
  });
  document.getElementById('new-playlist-desc')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('save-playlist-btn')?.click();
  });

  // Close Add-to-Playlist picker modal
  document.getElementById('add-to-playlist-modal-close')?.addEventListener('click', closeAddToPlaylistModal);

  // Quick create row inside picker modal
  document.getElementById('picker-quick-create-btn')?.addEventListener('click', () => {
    const qInput = document.getElementById('picker-quick-name');
    const qName = qInput?.value.trim();
    if (!qName) {
      showToast('Please enter a playlist name');
      qInput?.focus();
      return;
    }
    const newPl = createCustomPlaylist(qName, '');
    if (newPl && state.targetSongForPlaylist) {
      addSongToCustomPlaylist(newPl.id, state.targetSongForPlaylist);
    }
    closeAddToPlaylistModal();
  });

  document.getElementById('picker-quick-name')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('picker-quick-create-btn')?.click();
  });

  // Now Playing Sheet Header Playlist Button
  document.getElementById('sheet-playlist-btn')?.addEventListener('click', () => {
    if (state.currentSong) {
      openAddToPlaylistModal(state.currentSong);
    } else {
      showToast('No song currently playing');
    }
  });

  // Backdrop click to close modals
  document.getElementById('playlist-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'playlist-modal') closeCreatePlaylistModal();
  });
  document.getElementById('add-to-playlist-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'add-to-playlist-modal') closeAddToPlaylistModal();
  });
}

// --- Dynamic Palette & Canvas Color Extractor ---
const colorCanvas = document.getElementById('color-extractor-canvas');
const colorCtx = colorCanvas ? colorCanvas.getContext('2d', { willReadFrequently: true }) : null;

function extractDominantColor(imgElement) {
  if (!colorCtx || !imgElement) return;
  const tempImg = new Image();
  tempImg.crossOrigin = 'Anonymous';
  tempImg.onload = () => {
    try {
      colorCanvas.width = 32;
      colorCanvas.height = 32;
      colorCtx.drawImage(tempImg, 0, 0, 32, 32);
      const data = colorCtx.getImageData(0, 0, 32, 32).data;
      
      let bestR = 255, bestG = 51, bestB = 102;
      let maxScore = -1;

      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;

        // Favor vibrant colors, avoid overly dark and pure white
        if (brightness > 40 && brightness < 220 && delta > 30) {
          const score = delta * (1 - Math.abs(brightness - 130) / 130);
          if (score > maxScore) {
            maxScore = score;
            bestR = r;
            bestG = g;
            bestB = b;
          }
        }
      }

      applyDynamicColor(bestR, bestG, bestB);
    } catch (e) {
      // Fallback on CORS error
      applyDynamicColor(255, 51, 102);
    }
  };
  tempImg.src = imgElement.src;
}

function applyDynamicColor(r, g, b) {
  document.documentElement.style.setProperty('--accent-color', `rgb(${r}, ${g}, ${b})`);
  document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
  document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.45)`);
  document.documentElement.style.setProperty('--accent-light', `rgba(${r}, ${g}, ${b}, 0.15)`);
}

// --- Web Audio API Visualizer ---
let audioCtx = null;
let analyser = null;
let visualizerSource = null;
const canvas = document.getElementById('visualizer-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

function initVisualizer() {
  if (audioCtx) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    visualizerSource = audioCtx.createMediaElementSource(audio);
    visualizerSource.connect(analyser);
    analyser.connect(audioCtx.destination);
    renderVisualizer();
  } catch (err) {
    console.warn('Web Audio API not supported or user gesture needed:', err.message);
  }
}

function renderVisualizer() {
  requestAnimationFrame(renderVisualizer);
  if (!ctx || !analyser) return;

  const width = canvas.width = canvas.clientWidth || 300;
  const height = canvas.height = canvas.clientHeight || 26;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, width, height);
  const barCount = 28;
  const barWidth = (width / barCount) - 3;
  let x = 0;

  for (let i = 0; i < barCount; i++) {
    const val = dataArray[Math.floor(i * (bufferLength / barCount))] || 0;
    const barHeight = Math.max(3, (val / 255) * height);
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#ff3366';

    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.roundRect(x, height - barHeight, barWidth, barHeight, 3);
    ctx.fill();

    x += barWidth + 3;
  }
}

// --- YouTube IFrame API Handler ---
window.onYouTubeIframeAPIReady = function() {
  state.ytPlayer = new YT.Player('yt-iframe-placeholder', {
    height: '100%',
    width: '100%',
    videoId: 'wQksDYahKZs', // Default Pushpa 2
    playerVars: {
      autoplay: 0,
      controls: 1,
      modestbranding: 1,
      rel: 0
    },
    events: {
      'onReady': () => {
        state.ytReady = true;
      },
      'onStateChange': onYTPlayerStateChange
    }
  });
};

function onYTPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    state.isPlaying = true;
    updatePlayPauseUI(true);
    audio.pause();
  } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    state.isPlaying = false;
    updatePlayPauseUI(false);
    if (event.data === YT.PlayerState.ENDED) {
      playNext();
    }
  }
}

// Play specific YouTube Video
function playYouTubeVideo(videoId, title, channel, thumbnail) {
  state.playbackSource = 'youtube';
  audio.pause();

  const fakeSong = {
    id: videoId,
    title: title || 'Tollywood Video Song',
    movie: channel || 'YouTube Tollywood',
    singers: channel || 'Telugu Music Label',
    duration: 240,
    durationFormatted: '4:00',
    image: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    type: 'youtube'
  };

  state.currentSong = fakeSong;
  updateNowPlayingDisplay(fakeSong);
  switchCenterMode('youtube');
  openNowPlayingSheet();

  if (state.ytPlayer && state.ytReady && state.ytPlayer.loadVideoById) {
    state.ytPlayer.loadVideoById(videoId);
    state.ytPlayer.playVideo();
  } else {
    const iframePlaceholder = document.getElementById('yt-iframe-placeholder');
    if (iframePlaceholder) {
      iframePlaceholder.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
  }

  state.isPlaying = true;
  updatePlayPauseUI(true);
}

// --- Audio Playback Engine ---

function getAudioUrl(song) {
  if (!song) return '';
  if (state.quality === '96' && song.audio_96) return song.audio_96;
  if (state.quality === '160' && song.audio_160) return song.audio_160;
  return song.audio_320 || song.audio_160 || song.audio_96 || '';
}

async function playSong(song, newQueue = null, index = -1) {
  if (!song) return;

  if (newQueue) {
    state.queue = [...newQueue];
    state.originalQueue = [...newQueue];
    state.currentIndex = index >= 0 ? index : state.queue.findIndex(s => s.id === song.id);
  } else {
    // If song is not in queue, add it
    const existingIdx = state.queue.findIndex(s => s.id === song.id);
    if (existingIdx !== -1) {
      state.currentIndex = existingIdx;
    } else {
      state.queue.push(song);
      state.currentIndex = state.queue.length - 1;
    }
  }

  state.currentSong = song;
  state.playbackSource = 'audio';

  // If YouTube video was playing, pause it
  if (state.ytPlayer && state.ytReady && state.ytPlayer.pauseVideo) {
    state.ytPlayer.pauseVideo();
  }

  // Revoke previous blob URL if needed
  if (state.currentBlobUrl) {
    URL.revokeObjectURL(state.currentBlobUrl);
    state.currentBlobUrl = null;
  }

  // Check if song exists in Offline Storage
  const offlineSong = await OfflineDB.getSong(song.id);
  if (offlineSong && offlineSong.audioBlob) {
    state.currentBlobUrl = URL.createObjectURL(offlineSong.audioBlob);
    audio.src = state.currentBlobUrl;
    state.isOfflineSource = true;
  } else {
    state.isOfflineSource = false;

    if (!navigator.onLine) {
      showToast('⚠️ You are offline. Only downloaded songs can be played.');
      switchTab('downloads');
      return;
    }

    const rawUrl = getAudioUrl(song);
    if (!rawUrl) {
      console.error('No audio URL found for song, switching to YouTube');
      playYouTubeForSong(song);
      return;
    }

    // Use streaming proxy to guarantee range scrubbing & bypass CORS
    const streamUrl = `/api/stream?url=${encodeURIComponent(rawUrl)}`;
    audio.src = streamUrl;
  }

  audio.volume = state.volume;

  // Initialize Web Audio API on first user play
  initVisualizer();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  audio.play().then(() => {
    state.isPlaying = true;
    updatePlayPauseUI(true);
  }).catch(err => {
    console.warn('Direct stream play failed, trying fallback:', err.message);
  });

  updateNowPlayingDisplay(song);
  updateSheetDownloadBtn(song.id);
  renderQueue();
  saveHistory(song);
  updateMediaSession(song);
  loadLyrics(song.id);
}

function togglePlayPause() {
  if (state.playbackSource === 'youtube') {
    if (state.ytPlayer && state.ytReady) {
      const pState = state.ytPlayer.getPlayerState();
      if (pState === YT.PlayerState.PLAYING) {
        state.ytPlayer.pauseVideo();
      } else {
        state.ytPlayer.playVideo();
      }
    }
    return;
  }

  if (!state.currentSong) {
    if (state.queue.length > 0) {
      playSong(state.queue[0], state.queue, 0);
    }
    return;
  }

  if (state.isPlaying) {
    audio.pause();
    state.isPlaying = false;
    updatePlayPauseUI(false);
  } else {
    audio.play().then(() => {
      state.isPlaying = true;
      updatePlayPauseUI(true);
    }).catch(e => console.error(e));
  }
}

function playNext() {
  if (state.sleepTimerEndTrack) {
    pausePlayback();
    resetSleepTimer();
    return;
  }

  if (state.repeatMode === 'one' && state.currentSong) {
    audio.currentTime = 0;
    audio.play();
    return;
  }

  if (state.queue.length === 0) return;

  let nextIdx = state.currentIndex + 1;
  if (nextIdx >= state.queue.length) {
    if (state.repeatMode === 'all') {
      nextIdx = 0;
    } else {
      state.isPlaying = false;
      updatePlayPauseUI(false);
      return;
    }
  }

  playSong(state.queue[nextIdx], null, nextIdx);
}

function playPrev() {
  if (audio.currentTime > 4) {
    audio.currentTime = 0;
    return;
  }
  if (state.queue.length === 0) return;

  let prevIdx = state.currentIndex - 1;
  if (prevIdx < 0) {
    prevIdx = state.queue.length - 1;
  }
  playSong(state.queue[prevIdx], null, prevIdx);
}

function pausePlayback() {
  audio.pause();
  if (state.ytPlayer && state.ytReady && state.ytPlayer.pauseVideo) {
    state.ytPlayer.pauseVideo();
  }
  state.isPlaying = false;
  updatePlayPauseUI(false);
}

function updatePlayPauseUI(playing) {
  document.body.classList.toggle('is-playing', playing);

  miniPlayIcon.classList.toggle('hidden', playing);
  miniPauseIcon.classList.toggle('hidden', !playing);
  sheetPlayIcon.classList.toggle('hidden', playing);
  sheetPauseIcon.classList.toggle('hidden', !playing);

  // Animate mini progress bar
  if (!playing) {
    document.title = state.currentSong ? `${state.currentSong.title} — Swaram` : 'Swaram — Tollywood Retro Music';
  } else {
    document.title = `▶ ${state.currentSong?.title} — Swaram`;
  }
}

// Update Now Playing Display Elements & Palette
function updateNowPlayingDisplay(song) {
  miniPlayer.classList.remove('hidden');

  const img = song.image || 'https://c.saavncdn.com/366/Pushpa-2-The-Rule-Telugu-Telugu-2024-20241205211012-500x500.jpg';
  miniArt.src = img;
  miniTitle.textContent = song.title;
  miniArtist.textContent = `${song.movie} • ${song.singers || song.music}`;

  sheetArt.src = img;
  sheetVinylSleeveArt.src = img;
  sheetVinylLabelArt.src = img;
  sheetTitle.textContent = song.title;
  sheetSubtitle.textContent = song.movie;
  sheetSingers.textContent = song.singers ? `Vocals: ${song.singers}` : `Music: ${song.music}`;

  sheetTotalTime.textContent = song.durationFormatted || '3:30';
  sheetSeekSlider.value = 0;
  sheetCurrentTime.textContent = '0:00';
  miniProgressFill.style.width = '0%';

  updateLikeBtnState(song.id);
  extractDominantColor(sheetArt);

  // Update source badge
  if (state.playbackSource === 'youtube') {
    sheetSourceBadge.textContent = '🔴 YouTube Video';
    sheetSourceBadge.style.color = '#ff4d4d';
  } else if (state.isOfflineSource) {
    sheetSourceBadge.textContent = '💾 Offline (Local Storage)';
    sheetSourceBadge.style.color = '#00e676';
  } else {
    sheetSourceBadge.textContent = `⚡ HQ ${state.quality}k Audio`;
    sheetSourceBadge.style.color = '';
  }
}

// Media Session API for Lock Screen & OS Media Keys
function updateMediaSession(song) {
  if (!('mediaSession' in navigator) || !song) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title,
    artist: song.singers || song.music || 'Tollywood Artists',
    album: song.movie || 'Telugu Cinema',
    artwork: [
      { src: song.imageSmall || song.image, sizes: '150x150', type: 'image/jpeg' },
      { src: song.image, sizes: '500x500', type: 'image/jpeg' }
    ]
  });

  navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
  navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
  navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
  navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details.seekTime && audio.duration) {
      audio.currentTime = details.seekTime;
    }
  });
}

// --- Audio Event Listeners ---
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const current = audio.currentTime;
  const total = audio.duration;
  const pct = (current / total) * 100;

  sheetSeekSlider.value = pct;
  miniProgressFill.style.width = `${pct}%`;
  sheetCurrentTime.textContent = formatTime(current);
  sheetTotalTime.textContent = formatTime(total);
});

audio.addEventListener('ended', () => {
  playNext();
});

audio.addEventListener('error', (e) => {
  console.error('Audio playback error encountered:', e);
});

// Seek slider interaction
sheetSeekSlider.addEventListener('input', () => {
  if (!audio.duration) return;
  const pct = parseFloat(sheetSeekSlider.value);
  audio.currentTime = (pct / 100) * audio.duration;
});

// Volume slider
sheetVolumeSlider.addEventListener('input', () => {
  state.volume = parseFloat(sheetVolumeSlider.value);
  audio.volume = state.volume;
  state.isMuted = state.volume === 0;
  updateVolumeUI();
});

sheetMuteBtn.addEventListener('click', () => {
  state.isMuted = !state.isMuted;
  audio.volume = state.isMuted ? 0 : state.volume;
  updateVolumeUI();
});

function updateVolumeUI() {
  volumeHighIcon.classList.toggle('hidden', state.isMuted);
  volumeMutedIcon.classList.toggle('hidden', !state.isMuted);
}

// Shuffle & Repeat
sheetShuffleBtn.addEventListener('click', () => {
  state.isShuffled = !state.isShuffled;
  sheetShuffleBtn.classList.toggle('active', state.isShuffled);

  if (state.isShuffled) {
    const cur = state.queue[state.currentIndex];
    const rest = state.queue.filter((_, idx) => idx !== state.currentIndex);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    state.queue = [cur, ...rest];
    state.currentIndex = 0;
  } else {
    state.queue = [...state.originalQueue];
    state.currentIndex = state.queue.findIndex(s => s.id === state.currentSong?.id);
  }
  renderQueue();
});

sheetRepeatBtn.addEventListener('click', () => {
  if (state.repeatMode === 'all') {
    state.repeatMode = 'one';
    repeatOneIndicator.classList.remove('hidden');
    sheetRepeatBtn.classList.add('active');
  } else if (state.repeatMode === 'one') {
    state.repeatMode = 'off';
    repeatOneIndicator.classList.add('hidden');
    sheetRepeatBtn.classList.remove('active');
  } else {
    state.repeatMode = 'all';
    repeatOneIndicator.classList.add('hidden');
    sheetRepeatBtn.classList.add('active');
  }
});

// Quality dropdown
qualitySelect.addEventListener('change', (e) => {
  state.quality = e.target.value;
  qualityBadge.textContent = `HQ ${state.quality}k`;
  if (state.currentSong) {
    const curTime = audio.currentTime;
    const wasPlaying = state.isPlaying;
    const rawUrl = getAudioUrl(state.currentSong);
    audio.src = `/api/stream?url=${encodeURIComponent(rawUrl)}`;
    audio.currentTime = curTime;
    if (wasPlaying) audio.play();
  }
});

// Center Mode Switcher (Art / Vinyl / Lyrics / Video)
const modePills = document.querySelectorAll('.mode-pill');
modePills.forEach(pill => {
  pill.addEventListener('click', () => {
    switchCenterMode(pill.getAttribute('data-mode'));
  });
});

function switchCenterMode(mode) {
  state.centerMode = mode;
  modePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-mode') === mode));

  document.getElementById('mode-art-view').classList.toggle('active', mode === 'art');
  document.getElementById('mode-vinyl-view').classList.toggle('active', mode === 'vinyl');
  document.getElementById('mode-lyrics-view').classList.toggle('active', mode === 'lyrics');
  document.getElementById('mode-youtube-view').classList.toggle('active', mode === 'youtube');

  if (mode === 'youtube' && state.currentSong) {
    loadYouTubeForCurrentSong();
  }
}

// Watch Video quick button
sheetYtWatchBtn.addEventListener('click', () => {
  switchCenterMode('youtube');
});

// Search & play YouTube song
async function loadYouTubeForCurrentSong() {
  if (!state.currentSong) return;
  const ytMsg = document.getElementById('yt-status-msg');
  if (ytMsg) ytMsg.textContent = 'Searching YouTube for official video...';

  const q = state.currentSong.youtubeQuery || `${state.currentSong.title} ${state.currentSong.movie} telugu song`;
  const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => null);

  if (res && res.videos && res.videos.length > 0) {
    const topVideo = res.videos[0];
    if (ytMsg) ytMsg.textContent = `Playing: ${topVideo.title}`;
    if (state.ytPlayer && state.ytReady && state.ytPlayer.loadVideoById) {
      audio.pause();
      state.ytPlayer.loadVideoById(topVideo.id);
      state.ytPlayer.playVideo();
      state.playbackSource = 'youtube';
      state.isPlaying = true;
      updatePlayPauseUI(true);
    }
  } else {
    if (ytMsg) ytMsg.textContent = 'No matching video found on YouTube.';
  }
}

function playYouTubeForSong(song) {
  loadYouTubeForCurrentSong();
  switchCenterMode('youtube');
  openNowPlayingSheet();
}

// --- Lyrics Loader ---
async function loadLyrics(songId) {
  lyricsContainer.innerHTML = '<div class="lyrics-loading">Fetching Telugu lyrics...</div>';
  const data = await fetch(`/api/lyrics?id=${songId}`).then(r => r.json()).catch(() => null);

  if (data && data.lyrics) {
    lyricsContainer.innerHTML = `<div class="lyrics-content">${data.lyrics}</div>`;
  } else {
    lyricsContainer.innerHTML = `
      <div class="lyrics-not-found">
        <p>🎵 Lyrics for <strong>${state.currentSong?.title}</strong></p>
        <p style="margin-top:8px; font-size:0.88rem; color:var(--text-muted);">
          Tap <strong>YouTube Video</strong> mode to sing along with the official lyrical video!
        </p>
      </div>`;
  }
}

// --- Up Next Queue Management ---
function renderQueue() {
  queueList.innerHTML = '';
  queueBadgeCount.textContent = state.queue.length;
  queueTotalCount.textContent = `${state.queue.length} songs`;

  state.queue.forEach((song, idx) => {
    const item = document.createElement('div');
    item.className = `queue-item ${idx === state.currentIndex ? 'active-item' : ''}`;
    item.innerHTML = `
      <div class="queue-item-left">
        <img src="${song.imageSmall || song.image}" alt="" class="queue-item-art">
        <div style="min-width:0;">
          <div class="queue-item-title">${song.title}</div>
          <div class="queue-item-artist">${song.movie}</div>
        </div>
      </div>
      <button class="queue-item-del-btn" title="Remove">&times;</button>
    `;

    item.querySelector('.queue-item-left').addEventListener('click', () => {
      playSong(song, null, idx);
    });

    item.querySelector('.queue-item-del-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromQueue(idx);
    });

    queueList.appendChild(item);
  });
}

function removeFromQueue(index) {
  state.queue.splice(index, 1);
  if (index === state.currentIndex) {
    playNext();
  } else if (index < state.currentIndex) {
    state.currentIndex--;
  }
  renderQueue();
}

queueClearBtn.addEventListener('click', () => {
  state.queue = state.currentSong ? [state.currentSong] : [];
  state.currentIndex = 0;
  renderQueue();
});

// Drawers & Modals
headerQueueBtn.addEventListener('click', () => queueDrawer.classList.toggle('active'));
sheetQueueBtn.addEventListener('click', () => queueDrawer.classList.toggle('active'));
queueCloseBtn.addEventListener('click', () => queueDrawer.classList.remove('active'));

// Sheet Open / Close
miniExpandTrigger.addEventListener('click', openNowPlayingSheet);
miniExpandBtn.addEventListener('click', openNowPlayingSheet);
sheetCloseBtn.addEventListener('click', closeNowPlayingSheet);

function openNowPlayingSheet() {
  nowPlayingSheet.classList.add('active');
}

function closeNowPlayingSheet() {
  nowPlayingSheet.classList.remove('active');
}

// Control button event listeners
miniPlayBtn.addEventListener('click', togglePlayPause);
sheetPlayBtn.addEventListener('click', togglePlayPause);
miniNextBtn.addEventListener('click', playNext);
sheetNextBtn.addEventListener('click', playNext);
miniPrevBtn.addEventListener('click', playPrev);
sheetPrevBtn.addEventListener('click', playPrev);

// --- Like / Favorites Management ---
function isSongLiked(id) {
  return state.likedSongs.some(s => s.id === id);
}

function toggleLike(song) {
  if (!song) return;
  const idx = state.likedSongs.findIndex(s => s.id === song.id);
  if (idx !== -1) {
    state.likedSongs.splice(idx, 1);
  } else {
    state.likedSongs.unshift(song);
  }
  localStorage.setItem('swaram_liked', JSON.stringify(state.likedSongs));
  updateLikeBtnState(song.id);
  renderLikedCount();
  if (typeof AccountManager !== 'undefined' && AccountManager.activeAccount) {
    AccountManager.syncActiveData();
  }
}

function updateLikeBtnState(songId) {
  const liked = isSongLiked(songId);
  miniLikeBtn.classList.toggle('liked', liked);
  sheetLikeBtn.classList.toggle('liked', liked);
  miniLikeBtn.querySelector('svg').style.fill = liked ? 'var(--accent-color)' : 'none';
  sheetLikeBtn.querySelector('svg').style.fill = liked ? 'var(--accent-color)' : 'none';
}

miniLikeBtn.addEventListener('click', () => toggleLike(state.currentSong));
sheetLikeBtn.addEventListener('click', () => toggleLike(state.currentSong));

function renderLikedCount() {
  const countEl = document.getElementById('liked-count-text');
  if (countEl) countEl.textContent = `${state.likedSongs.length} favorite Telugu tracks`;
}

document.getElementById('play-liked-btn')?.addEventListener('click', () => {
  if (state.likedSongs.length > 0) {
    playSong(state.likedSongs[0], state.likedSongs, 0);
  } else {
    alert('You have no liked songs yet! Click the heart icon on any song to save it.');
  }
});

// --- Tab Navigation ---
navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.getAttribute('data-tab');
    switchTab(target);
  });
});

function switchTab(tabId) {
  state.activeTab = tabId;
  navTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tabId));
  tabViews.forEach(v => v.classList.toggle('active', v.id === `view-${tabId}`));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (tabId === 'downloads') {
    renderDownloadsView();
  } else if (tabId === 'playlists') {
    renderCustomPlaylists();
    updateHistoryUI();
  } else if (tabId === 'history') {
    renderHistoryView();
  }
}

// Brand click -> home
document.querySelector('.brand').addEventListener('click', () => switchTab('home'));

// --- Theme Switcher ---
const themeBtn = document.getElementById('theme-btn');
const themeDropdown = document.getElementById('theme-dropdown');
themeBtn.addEventListener('click', () => themeDropdown.classList.toggle('hidden'));

function applyTheme(theme) {
  if (!theme) return;
  document.body.className = `theme-${theme}`;
  document.querySelectorAll('.dropdown-item').forEach(i => {
    i.classList.toggle('active', i.getAttribute('data-theme') === theme);
  });
  localStorage.setItem('swaram_theme', theme);
}

document.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('click', () => {
    const theme = item.getAttribute('data-theme');
    applyTheme(theme);
    themeDropdown.classList.add('hidden');
    if (typeof AccountManager !== 'undefined' && AccountManager.activeAccount) {
      AccountManager.activeAccount.theme = theme;
      AccountManager.syncActiveData();
    }
  });
});

// Load saved theme
const savedTheme = localStorage.getItem('swaram_theme') || 'amoled';
applyTheme(savedTheme);

// --- Sleep Timer ---
sleepTimerBtn.addEventListener('click', () => sleepModal.classList.remove('hidden'));
sleepModalClose.addEventListener('click', () => sleepModal.classList.add('hidden'));

document.querySelectorAll('.timer-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    const mins = opt.getAttribute('data-mins');
    setSleepTimer(mins);
    sleepModal.classList.add('hidden');
  });
});

function setSleepTimer(val) {
  if (state.sleepTimerTimeout) clearTimeout(state.sleepTimerTimeout);
  state.sleepTimerEndTrack = false;

  if (val === '0') {
    sleepTimerLabel.textContent = 'Timer';
    return;
  }
  if (val === 'end') {
    state.sleepTimerEndTrack = true;
    sleepTimerLabel.textContent = 'End of Song';
    return;
  }

  const mins = parseInt(val, 10);
  sleepTimerLabel.textContent = `${mins}m`;
  state.sleepTimerTimeout = setTimeout(() => {
    pausePlayback();
    resetSleepTimer();
    alert('Sleep timer reached. Good night!');
  }, mins * 60 * 1000);
}

function resetSleepTimer() {
  if (state.sleepTimerTimeout) clearTimeout(state.sleepTimerTimeout);
  state.sleepTimerTimeout = null;
  state.sleepTimerEndTrack = false;
  sleepTimerLabel.textContent = 'Timer';
}

// --- History Management (Strictly Last 20 Played Songs) ---
function saveHistory(song) {
  if (!song || !song.id) return;
  state.history = [song, ...state.history.filter(s => s.id !== song.id)].slice(0, 20);
  localStorage.setItem('swaram_history', JSON.stringify(state.history));
  updateHistoryUI();
  renderHistoryCarousel();
  if (typeof AccountManager !== 'undefined' && AccountManager.activeAccount) {
    AccountManager.syncActiveData();
  }
}

function updateHistoryUI() {
  const count = state.history ? state.history.length : 0;
  
  // Navigation tab badge
  const navBadge = document.getElementById('nav-history-count');
  if (navBadge) navBadge.textContent = count;

  // Library hero card count
  const libraryCount = document.getElementById('history-library-count-text');
  if (libraryCount) libraryCount.textContent = `${count} / 20 recent songs played`;

  // History tab view subtitle
  const historySub = document.getElementById('history-summary-subtitle');
  if (historySub) historySub.textContent = `Last ${count} of 20 played tracks`;
}

function renderHistoryView() {
  const emptyState = document.getElementById('history-empty-state');
  const tableContainer = document.getElementById('history-table-container');
  const tbody = document.getElementById('history-tbody');

  updateHistoryUI();

  if (!state.history || state.history.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    if (tableContainer) tableContainer.style.display = 'none';
    if (tbody) tbody.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (tableContainer) tableContainer.style.display = 'block';
  if (tbody) {
    tbody.innerHTML = '';
    state.history.forEach((song, i) => {
      tbody.appendChild(renderSongRow(song, i, state.history, null, true));
    });
  }
}

function removeFromHistory(songId) {
  state.history = state.history.filter(s => s.id !== songId);
  localStorage.setItem('swaram_history', JSON.stringify(state.history));
  updateHistoryUI();
  renderHistoryView();
  renderHistoryCarousel();
  showToast('Removed song from history');
}

function clearHistory() {
  if (!state.history || state.history.length === 0) {
    showToast('History is already empty');
    return;
  }
  if (confirm('Clear all songs from your listening history?')) {
    state.history = [];
    localStorage.setItem('swaram_history', JSON.stringify([]));
    updateHistoryUI();
    renderHistoryView();
    renderHistoryCarousel();
    showToast('Listening history cleared');
  }
}

function renderHistoryCarousel() {
  const section = document.getElementById('home-history-section');
  const carousel = document.getElementById('history-carousel');
  if (!section || !carousel) return;

  if (!state.history || state.history.length === 0) {
    section.style.display = 'none';
    carousel.innerHTML = '';
    return;
  }

  section.style.display = 'block';
  carousel.innerHTML = '';
  state.history.forEach(song => {
    carousel.appendChild(createSongCard(song, state.history));
  });
}

function initHistoryEvents() {
  document.getElementById('play-all-history-btn')?.addEventListener('click', () => {
    if (state.history.length > 0) {
      playSong(state.history[0], state.history, 0);
      showToast(`Playing ${state.history.length} songs from History`);
    } else {
      showToast('No history tracks to play');
    }
  });

  document.getElementById('shuffle-all-history-btn')?.addEventListener('click', () => {
    if (state.history.length > 0) {
      const shuffled = [...state.history].sort(() => Math.random() - 0.5);
      playSong(shuffled[0], shuffled, 0);
      showToast(`Shuffling ${state.history.length} songs from History`);
    } else {
      showToast('No history tracks to play');
    }
  });

  document.getElementById('clear-all-history-btn')?.addEventListener('click', () => {
    clearHistory();
  });

  document.getElementById('history-explore-btn')?.addEventListener('click', () => {
    switchTab('home');
  });

  document.getElementById('play-history-btn')?.addEventListener('click', () => {
    if (state.history.length > 0) {
      playSong(state.history[0], state.history, 0);
      showToast(`Playing ${state.history.length} songs from History`);
    } else {
      showToast('No history tracks yet. Start listening to build your history!');
    }
  });

  document.getElementById('view-history-tab-btn')?.addEventListener('click', () => {
    switchTab('history');
  });

  document.getElementById('home-view-history-btn')?.addEventListener('click', () => {
    switchTab('history');
  });
}


// --- Helpers ---
function formatTime(seconds) {
  const s = Math.floor(seconds) || 0;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem < 10 ? '0' : ''}${rem}`;
}

function formatLanguageName(lang) {
  if (!lang || lang === 'all') return 'Pan-India';
  const l = lang.toLowerCase();
  if (l.includes('telugu')) return 'Telugu';
  if (l.includes('hindi')) return 'Hindi';
  if (l.includes('tamil')) return 'Tamil';
  if (l.includes('kannada')) return 'Kannada';
  if (l.includes('malayalam')) return 'Malayalam';
  if (l.includes('punjabi')) return 'Punjabi';
  if (l.includes('bengali')) return 'Bengali';
  if (l.includes('marathi')) return 'Marathi';
  if (l.includes('english')) return 'English';
  return l.charAt(0).toUpperCase() + l.slice(1);
}

function getCleanSongKey(song) {
  if (!song) return '';
  const title = (song.title || '')
    .toLowerCase()
    .replace(/&quot;/g, '')
    .replace(/&#039;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/telugu|hindi|tamil|kannada|malayalam|punjabi/gi, '')
    .replace(/lyrical|audio|video|remix|lofi|reprise|version|full song|from/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
  
  if (title.length < 3) {
    const movie = (song.movie || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 8);
    return `${title}_${movie}`;
  }
  return title;
}

// --- Card & Table Generators ---
function createSongCard(song, songList) {
  const card = document.createElement('div');
  card.className = 'music-card';
  const langClass = (song.language || 'telugu').toLowerCase();
  const langText = song.languageName || formatLanguageName(langClass);

  card.innerHTML = `
    <div class="card-art-wrap">
      <img src="${song.image}" alt="${song.title}" class="card-art" loading="lazy">
      <span class="card-lang-tag ${langClass}">${langText}</span>
      <button class="card-play-btn" title="Play">
        <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
      </button>
      <button class="card-add-playlist-btn" title="Add to Playlist">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h7M3 6h.01M3 12h.01M3 18h.01M18 15v6m-3-3h6"></path></svg>
      </button>
    </div>
    <div class="card-title">${song.title}</div>
    <div class="card-subtitle">${song.movie}</div>
  `;

  card.addEventListener('click', () => {
    playSong(song, songList);
  });

  card.querySelector('.card-add-playlist-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openAddToPlaylistModal(song);
  });

  return card;
}

function renderSongRow(song, index, songList, currentPlaylistId = null, isHistoryView = false) {
  const tr = document.createElement('tr');
  const isPlayingThis = state.currentSong && state.currentSong.id === song.id;
  if (isPlayingThis) tr.className = 'active-song';

  const isDownloaded = OfflineDB.isDownloaded(song.id);
  const langClass = (song.language || 'telugu').toLowerCase();
  const langText = song.languageName || formatLanguageName(langClass);

  tr.innerHTML = `
    <td class="col-num">${index + 1}</td>
    <td class="col-title">
      <div class="song-title-cell">
        <img src="${song.imageSmall || song.image}" alt="" class="song-cell-art">
        <div class="song-title-info">
          <div class="song-title-row">
            <span class="song-title-text">${song.title}</span>
            <span class="lang-tag ${langClass}">${langText}</span>
          </div>
          <div class="song-mobile-subtitle">${song.movie ? `${song.movie} • ` : ''}${song.singers || song.music || ''}</div>
          ${isDownloaded ? '<span class="offline-badge">⚡ Offline</span>' : ''}
        </div>
      </div>
    </td>
    <td class="col-movie">${song.movie}</td>
    <td class="col-artists">${song.singers || song.music}</td>
    <td class="col-time">${song.durationFormatted || '3:30'}</td>
    <td class="col-actions">
      <button class="song-action-btn playlist-add-btn" title="Add to Playlist">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h7M3 6h.01M3 12h.01M3 18h.01M18 15v6m-3-3h6"></path></svg>
      </button>
      <button class="song-action-btn download-btn ${isDownloaded ? 'downloaded' : ''}" data-id="${song.id}" title="${isDownloaded ? 'Downloaded (Offline Ready)' : 'Download for Offline'}">
        ${isDownloaded
          ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>'
          : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>'
        }
      </button>
      <button class="song-action-btn like-btn ${isSongLiked(song.id) ? 'liked' : ''}" title="Favorite">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="${isSongLiked(song.id) ? 'var(--accent-color)' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
      </button>
      <button class="song-action-btn queue-add-btn" title="Add to Queue">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>
      </button>
      ${currentPlaylistId ? `
      <button class="song-action-btn playlist-remove-btn" title="Remove from this Playlist">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>` : ''}
      ${isHistoryView ? `
      <button class="song-action-btn history-remove-btn" title="Remove from History">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>` : ''}
    </td>
  `;

  tr.querySelector('.col-title').addEventListener('click', () => {
    playSong(song, songList, index);
  });

  tr.querySelector('.playlist-add-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openAddToPlaylistModal(song);
  });

  const dlBtn = tr.querySelector('.download-btn');
  dlBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (OfflineDB.isDownloaded(song.id)) {
      showToast(`"${song.title}" is already downloaded`);
      return;
    }
    downloadSongForOffline(song, dlBtn);
  });

  tr.querySelector('.like-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleLike(song);
    const liked = isSongLiked(song.id);
    tr.querySelector('.like-btn').classList.toggle('liked', liked);
    tr.querySelector('.like-btn svg').style.fill = liked ? 'var(--accent-color)' : 'none';
  });

  tr.querySelector('.queue-add-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    state.queue.push(song);
    renderQueue();
    showToast(`Added "${song.title}" to queue`);
  });

  if (currentPlaylistId) {
    tr.querySelector('.playlist-remove-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Remove "${song.title}" from this playlist?`)) {
        removeSongFromCustomPlaylist(currentPlaylistId, song.id);
      }
    });
  }

  if (isHistoryView) {
    tr.querySelector('.history-remove-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromHistory(song.id);
    });
  }

  return tr;
}

// --- Data Fetching & Initial Population ---

// 1. Trending Songs by Industry / Pan-India
async function loadTrending(industry = 'all') {
  state.currentLanguage = industry;

  // Sync industry chips on home view
  document.querySelectorAll('#industry-chips .category-chip').forEach(c => {
    const chipLang = c.getAttribute('data-lang');
    c.classList.toggle('active', chipLang === industry);
  });

  // Sync language chips in songs tab
  document.querySelectorAll('#songs-lang-chips .songs-lang-chip').forEach(c => {
    const chipLang = c.getAttribute('data-lang');
    c.classList.toggle('active', chipLang === industry);
  });

  const res = await fetch(`/api/trending?industry=${industry}`).then(r => r.json()).catch(() => null);
  if (!res || !res.songs) return;

  const carousel = document.getElementById('trending-carousel');
  const tbody = document.getElementById('all-songs-tbody');
  if (carousel) carousel.innerHTML = '';
  if (tbody) tbody.innerHTML = '';

  res.songs.forEach((song, i) => {
    if (carousel) carousel.appendChild(createSongCard(song, res.songs));
    if (tbody) tbody.appendChild(renderSongRow(song, i, res.songs));
  });

  const langName = formatLanguageName(industry);
  const subtitleEl = document.getElementById('songs-count-subtitle');
  if (subtitleEl) {
    if (industry === 'all') {
      subtitleEl.textContent = `${res.songs.length} top Pan-Indian chartbusters across Bollywood, Tollywood, Kollywood & Sandalwood • Zero repeats`;
    } else {
      subtitleEl.textContent = `${res.songs.length} authentic ${langName} hits • Zero repeats`;
    }
  }

  // Hero section setup
  if (res.songs.length > 0) {
    const featured = res.songs[0];
    document.getElementById('hero-title').textContent = featured.movie || featured.title;
    document.getElementById('hero-subtitle').textContent = `${featured.title} • ${featured.singers || featured.music}`;
    document.getElementById('hero-art').src = featured.image;
    
    document.getElementById('hero-play-btn').onclick = () => playSong(featured, res.songs, 0);
    document.getElementById('hero-queue-btn').onclick = () => {
      state.queue.push(featured);
      renderQueue();
      showToast(`Added "${featured.title}" to queue`);
    };
    document.getElementById('hero-yt-btn').onclick = () => playYouTubeForSong(featured);
  }
}

// 2. Curated Carousels (Language-wise & Moods with Global Deduplication)
async function loadCarousels() {
  const loads = [
    { cat: 'telugu_hits', containerId: 'telugu-carousel' },
    { cat: 'bollywood_hits', containerId: 'bollywood-carousel' },
    { cat: 'kollywood_hits', containerId: 'kollywood-carousel' },
    { cat: 'sandalwood_hits', containerId: 'sandalwood-carousel' },
    { cat: 'mollywood_hits', containerId: 'mollywood-carousel' },
    { cat: 'punjabi_hits', containerId: 'punjabi-carousel' },
    { cat: 'anirudh', containerId: 'anirudh-carousel' },
    { cat: 'thaman', containerId: 'thaman-carousel' },
    { cat: 'sai_abhyankkar', containerId: 'sai-carousel' },
    { cat: 'dsp', containerId: 'dsp-carousel' },
    { cat: 'melody', containerId: 'melody-carousel' },
    { cat: 'energetic', containerId: 'energetic-carousel' },
    { cat: 'anger', containerId: 'anger-carousel' },
    { cat: 'gym', containerId: 'gym-carousel' },
    { cat: 'motivation', containerId: 'motivation-carousel' },
    { cat: 'love', containerId: 'love-carousel' },
    { cat: 'breakup', containerId: 'breakup-carousel' },
    { cat: 'classics', containerId: 'classics-carousel' }
  ];

  // Wire up "See More" category buttons
  document.querySelectorAll('.view-all-btn[data-category]').forEach(btn => {
    btn.onclick = () => {
      const catId = btn.getAttribute('data-category');
      if (catId) openCategoryDetail(catId);
    };
  });

  // Global set to eliminate repeating songs across all Home carousels
  const homeSeenKeys = new Set();

  for (const item of loads) {
    const container = document.getElementById(item.containerId);
    if (!container) continue;
    const res = await fetch(`/api/category?id=${item.cat}`).then(r => r.json()).catch(() => null);
    if (res && res.songs) {
      container.innerHTML = '';
      const uniqueForCarousel = [];
      for (const song of res.songs) {
        const key = getCleanSongKey(song);
        if (key && homeSeenKeys.has(key)) continue;
        if (key) homeSeenKeys.add(key);
        uniqueForCarousel.push(song);
        if (uniqueForCarousel.length >= 10) break;
      }
      uniqueForCarousel.forEach(song => {
        container.appendChild(createSongCard(song, uniqueForCarousel));
      });
    }
  }
}

// 3. Category & Mood Pills (Industries + Song Types + Singers)
async function loadCategories() {
  const res = await fetch('/api/categories').then(r => r.json()).catch(() => null);
  if (!res) return;

  // 1. Industries / Cinemas (All India, Tollywood, Bollywood, Kollywood, Sandalwood, Mollywood, Punjabi)
  const indChipsBar = document.getElementById('industry-chips');
  if (indChipsBar && res.industries) {
    indChipsBar.innerHTML = '';
    res.industries.forEach((ind, idx) => {
      const chip = document.createElement('button');
      chip.className = `category-chip ${idx === 0 ? 'active' : ''}`;
      chip.setAttribute('data-lang', ind.id);
      chip.innerHTML = `<span>${ind.title}</span>`;
      chip.addEventListener('click', () => {
        loadTrending(ind.id);
      });
      indChipsBar.appendChild(chip);
    });
  }

  // 2. Moods & Song Types (Melody, Energetic, Anger, Gym, Motivation, Love, Breakup)
  if (moodChipsBar && res.moods) {
    moodChipsBar.innerHTML = '';
    res.moods.forEach((m) => {
      const chip = document.createElement('button');
      chip.className = 'category-chip';
      chip.setAttribute('data-mood', m.id);
      chip.innerHTML = `<span>${m.icon || '🎶'}</span> <span>${m.title}</span>`;
      chip.addEventListener('click', () => {
        document.querySelectorAll('#mood-chips .category-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        openCategoryDetail(m.id);
      });
      moodChipsBar.appendChild(chip);
    });
  }

  // 3. Top Singers & Music Directors (Arijit, Anirudh, Thaman, Sai Abhyankkar, Pritam, Rahman, Diljit, etc.)
  if (singerChipsBar && res.singers) {
    singerChipsBar.innerHTML = '';
    res.singers.forEach((s) => {
      const chip = document.createElement('button');
      chip.className = 'category-chip';
      chip.innerHTML = `<span>🎤</span> <span>${s.name}</span>`;
      chip.addEventListener('click', () => {
        document.querySelectorAll('#singer-chips .category-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        openCategoryDetail(s.id);
      });
      singerChipsBar.appendChild(chip);
    });
  }
}

// 4. Artists & Heroes Grid
async function loadArtists() {
  const res = await fetch('/api/artists').then(r => r.json()).catch(() => null);
  if (!res || !res.artists) return;

  const grid = document.getElementById('artists-grid');
  grid.innerHTML = '';

  const artistAvatars = {
    // Composers & Singers
    arijit: 'https://c.saavncdn.com/artists/Arijit_Singh_002_20230323062147_500x500.jpg',
    pritam: 'https://c.saavncdn.com/artists/Pritam_500x500.jpg',
    ar_rahman: 'https://c.saavncdn.com/artists/A_R_Rahman_002_20210219092828_500x500.jpg',
    shreya: 'https://c.saavncdn.com/artists/Shreya_Ghoshal_500x500.jpg',
    diljit: 'https://c.saavncdn.com/artists/Diljit_Dosanjh_004_20221006184544_500x500.jpg',
    karan_aujla: 'https://c.saavncdn.com/artists/Karan_Aujla_002_20230818105747_500x500.jpg',
    anirudh: 'https://c.saavncdn.com/artists/Anirudh_Ravichander_500x500.jpg',
    yuvan: 'https://c.saavncdn.com/artists/Yuvan_Shankar_Raja_500x500.jpg',
    ravi_basrur: 'https://c.saavncdn.com/artists/Ravi_Basrur_500x500.jpg',
    sanjith_hegde: 'https://c.saavncdn.com/artists/Sanjith_Hegde_500x500.jpg',
    sushin_shyam: 'https://c.saavncdn.com/artists/Sushin_Shyam_500x500.jpg',
    thaman: 'https://c.saavncdn.com/artists/Thaman_S_003_20201103072847_500x500.jpg',
    dsp: 'https://c.saavncdn.com/artists/Devi_Sri_Prasad_002_20201208064952_500x500.jpg',
    sid_sriram: 'https://c.saavncdn.com/artists/Sid_Sriram_003_20230602123512_500x500.jpg',
    sai_abhyankkar: 'https://c.saavncdn.com/artists/Sai_Abhyankkar_500x500.jpg',
    spb: 'https://c.saavncdn.com/artists/S_P_Balasubrahmanyam_500x500.jpg',

    // Heroes & Superstars
    srk: 'https://c.saavncdn.com/artists/Shah_Rukh_Khan_500x500.jpg',
    salman: 'https://c.saavncdn.com/artists/Salman_Khan_500x500.jpg',
    vijay: 'https://c.saavncdn.com/artists/Vijay_500x500.jpg',
    rajinikanth: 'https://c.saavncdn.com/artists/Rajinikanth_500x500.jpg',
    yash: 'https://c.saavncdn.com/artists/Yash_500x500.jpg',
    rishab_shetty: 'https://c.saavncdn.com/artists/Rishab_Shetty_500x500.jpg',
    fahadh_faasil: 'https://c.saavncdn.com/artists/Fahadh_Faasil_500x500.jpg',
    allu_arjun: 'https://c.saavncdn.com/366/Pushpa-2-The-Rule-Telugu-Telugu-2024-20241205211012-500x500.jpg',
    prabhas: 'https://c.saavncdn.com/392/Kalki-2898-AD-Telugu-Telugu-2024-20240710174026-500x500.jpg',
    mahesh_babu: 'https://c.saavncdn.com/514/Guntur-Kaaram-Telugu-2024-20240112191001-500x500.jpg',
    jr_ntr: 'https://c.saavncdn.com/979/Devara-Part-1-Telugu-Telugu-2024-20240927063116-500x500.jpg',
    ram_charan: 'https://c.saavncdn.com/001/RRR-Telugu-2021-20211209211002-500x500.jpg'
  };

  res.artists.forEach(artist => {
    const card = document.createElement('div');
    card.className = 'artist-card';
    const avatarUrl = artistAvatars[artist.id] || 'https://c.saavncdn.com/366/Pushpa-2-The-Rule-Telugu-Telugu-2024-20241205211012-500x500.jpg';
    card.innerHTML = `
      <div class="artist-avatar-wrap">
        <img src="${avatarUrl}" alt="${artist.name}" class="artist-avatar" onerror="this.src='https://c.saavncdn.com/366/Pushpa-2-The-Rule-Telugu-Telugu-2024-20241205211012-500x500.jpg'">
      </div>
      <div class="artist-name">${artist.name}</div>
      <div class="artist-role">${artist.role}</div>
    `;

    card.addEventListener('click', () => openArtistDetail(artist.id, avatarUrl));
    grid.appendChild(card);
  });
}

// 5. Blockbuster Albums Grid (Bollywood, Kollywood, Sandalwood, Tollywood, Mollywood)
async function loadAlbums() {
  const albumsList = [
    // Bollywood Hits
    { title: 'Stree 2', artist: 'Sachin-Jigar • Bollywood', query: 'Stree 2 Songs', img: 'https://c.saavncdn.com/264/Stree-2-Hindi-2024-20240816132454-500x500.jpg' },
    { title: 'Animal', artist: 'Pritam, Harshavardhan • Bollywood', query: 'Animal Hindi Songs', img: 'https://c.saavncdn.com/092/Animal-Hindi-2023-20231124191036-500x500.jpg' },
    { title: 'Jawan', artist: 'Anirudh Ravichander • Bollywood', query: 'Jawan Hindi Songs', img: 'https://c.saavncdn.com/026/Jawan-Hindi-2023-20230905183856-500x500.jpg' },

    // Kollywood Hits
    { title: 'Leo', artist: 'Anirudh Ravichander • Kollywood', query: 'Leo Tamil Songs', img: 'https://c.saavncdn.com/022/Leo-Tamil-2023-20231019183856-500x500.jpg' },
    { title: 'Jailer', artist: 'Anirudh Ravichander • Kollywood', query: 'Jailer Tamil Songs', img: 'https://c.saavncdn.com/791/Jailer-Tamil-2023-20230728183856-500x500.jpg' },

    // Sandalwood Hits
    { title: 'K.G.F: Chapter 2', artist: 'Ravi Basrur • Sandalwood', query: 'KGF Chapter 2 Kannada', img: 'https://c.saavncdn.com/391/KGF-Chapter-2-Kannada-2022-20220414183856-500x500.jpg' },
    { title: 'Kantara', artist: 'B. Ajaneesh Loknath • Sandalwood', query: 'Kantara Songs Kannada', img: 'https://c.saavncdn.com/832/Kantara-Kannada-2022-20221008183856-500x500.jpg' },

    // Mollywood Hits
    { title: 'Aavesham', artist: 'Sushin Shyam • Mollywood', query: 'Aavesham Malayalam Songs', img: 'https://c.saavncdn.com/045/Aavesham-Malayalam-2024-20240410183856-500x500.jpg' },
    { title: 'Manjummel Boys', artist: 'Sushin Shyam • Mollywood', query: 'Manjummel Boys Malayalam', img: 'https://c.saavncdn.com/561/Manjummel-Boys-Malayalam-2024-20240214183856-500x500.jpg' },

    // Tollywood Hits
    { title: 'Pushpa 2: The Rule', artist: 'Devi Sri Prasad (DSP) • Tollywood', query: 'Pushpa 2 The Rule Telugu', img: 'https://c.saavncdn.com/366/Pushpa-2-The-Rule-Telugu-Telugu-2024-20241205211012-500x500.jpg' },
    { title: 'Devara: Part 1', artist: 'Anirudh Ravichander • Tollywood', query: 'Devara Telugu Songs', img: 'https://c.saavncdn.com/979/Devara-Part-1-Telugu-Telugu-2024-20240927063116-500x500.jpg' },
    { title: 'Kalki 2898 AD', artist: 'Santhosh Narayanan • Pan-India', query: 'Kalki 2898 AD Telugu', img: 'https://c.saavncdn.com/392/Kalki-2898-AD-Telugu-Telugu-2024-20240710174026-500x500.jpg' },
    { title: 'RRR', artist: 'M. M. Keeravani • Pan-India', query: 'RRR Telugu Songs', img: 'https://c.saavncdn.com/001/RRR-Telugu-2021-20211209211002-500x500.jpg' },
    { title: 'Ala Vaikunthapurramuloo', artist: 'Thaman S • Tollywood', query: 'Ala Vaikunthapurramuloo Telugu', img: 'https://c.saavncdn.com/469/Ala-Vaikunthapurramuloo-Telugu-2019-20200113110940-500x500.jpg' }
  ];

  const grid = document.getElementById('albums-grid');
  grid.innerHTML = '';

  albumsList.forEach(album => {
    const card = document.createElement('div');
    card.className = 'music-card';
    card.innerHTML = `
      <div class="card-art-wrap">
        <img src="${album.img}" alt="${album.title}" class="card-art" loading="lazy" onerror="this.src='https://c.saavncdn.com/366/Pushpa-2-The-Rule-Telugu-Telugu-2024-20241205211012-500x500.jpg'">
        <button class="card-play-btn" title="Play Album">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </button>
      </div>
      <div class="card-title">${album.title}</div>
      <div class="card-subtitle">${album.artist}</div>
    `;

    card.addEventListener('click', () => openSearchDetail(album.query, album.title, album.img));
    grid.appendChild(card);
  });
}

// 6. Open Category or Search Detail View
async function openCategoryDetail(catId) {
  const res = await fetch(`/api/category?id=${catId}`).then(r => r.json()).catch(() => null);
  if (!res || !res.songs) return;

  renderDetailView(res.category.title, res.category.desc, res.songs[0]?.image, res.songs);
}

async function openArtistDetail(artistId, avatarUrl) {
  const res = await fetch(`/api/artist?id=${artistId}`).then(r => r.json()).catch(() => null);
  if (!res || !res.songs) return;

  renderDetailView(res.artist.name, `${res.artist.role} • Pan-India Cinema Collection`, avatarUrl || res.songs[0]?.image, res.songs);
}

async function openSearchDetail(query, title, cover) {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`).then(r => r.json()).catch(() => null);
  if (!res || !res.songs) return;

  renderDetailView(title, 'Original Motion Picture Soundtrack', cover || res.songs[0]?.image, res.songs);
}

function renderDetailView(title, desc, cover, songs, isCustomPlaylist = false, playlistId = null) {
  const tagEl = document.getElementById('detail-tag');
  if (tagEl) tagEl.textContent = isCustomPlaylist ? 'PLAYLIST' : 'ALBUM';

  document.getElementById('detail-title').textContent = title;
  document.getElementById('detail-desc').textContent = desc;
  document.getElementById('detail-cover').src = cover || 'https://c.saavncdn.com/366/Pushpa-2-The-Rule-Telugu-Telugu-2024-20241205211012-500x500.jpg';

  const addSongsBtn = document.getElementById('detail-add-songs-btn');
  const renameBtn = document.getElementById('detail-rename-btn');
  const deleteBtn = document.getElementById('detail-delete-btn');
  const addSection = document.getElementById('playlist-add-section');

  if (addSongsBtn) {
    addSongsBtn.style.display = isCustomPlaylist ? 'inline-flex' : 'none';
    addSongsBtn.onclick = () => {
      if (addSection) {
        addSection.style.display = 'block';
        addSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('playlist-search-input')?.focus();
      }
    };
  }

  if (renameBtn) {
    renameBtn.style.display = isCustomPlaylist ? 'inline-flex' : 'none';
    renameBtn.onclick = () => openEditPlaylistModal(playlistId);
  }
  if (deleteBtn) {
    deleteBtn.style.display = isCustomPlaylist ? 'inline-flex' : 'none';
    deleteBtn.onclick = () => deleteCustomPlaylist(playlistId);
  }

  const tbody = document.getElementById('detail-songs-tbody');
  tbody.innerHTML = '';
  if (songs.length === 0) {
    if (isCustomPlaylist) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="padding: 0;">
            <div class="empty-playlist-cta-card">
              <div class="empty-cta-icon-wrap">
                <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h7M3 6h.01M3 12h.01M3 18h.01M18 15v6m-3-3h6"></path></svg>
              </div>
              <h3>Your playlist "${title}" is empty</h3>
              <p>Choose songs from the suggestions below or search any song across Indian cinema to add it.</p>
              <button class="btn btn-primary" id="empty-focus-search-btn">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>+ Add Songs Below</span>
              </button>
            </div>
          </td>
        </tr>
      `;
      document.getElementById('empty-focus-search-btn')?.addEventListener('click', () => {
        const searchBox = document.getElementById('playlist-search-input');
        searchBox?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchBox?.focus();
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="padding:40px; text-align:center; color:var(--text-muted); font-size:0.95rem;">No songs found for this collection.</td></tr>';
    }
  } else {
    songs.forEach((s, idx) => {
      tbody.appendChild(renderSongRow(s, idx, songs, playlistId));
    });
  }

  // Setup the embedded Add Songs Section
  if (addSection) {
    addSection.style.display = isCustomPlaylist ? 'block' : 'none';
    if (isCustomPlaylist) {
      document.getElementById('playlist-add-heading').textContent = `Find & Add Songs to "${title}"`;
      initPlaylistAddSection(playlistId);
    }
  }

  document.getElementById('detail-play-btn').onclick = () => {
    if (songs.length > 0) playSong(songs[0], songs, 0);
    else showToast('Playlist is empty. Add songs from below!');
  };
  document.getElementById('detail-queue-btn').onclick = () => {
    if (songs.length > 0) {
      state.queue.push(...songs);
      renderQueue();
      showToast(`Added ${songs.length} songs to queue`);
    } else {
      showToast('Playlist is empty');
    }
  };
  document.getElementById('detail-back-btn').onclick = () => {
    if (isCustomPlaylist) {
      switchTab('playlists');
    } else {
      switchTab('home');
    }
  };

  tabViews.forEach(v => v.classList.remove('active'));
  document.getElementById('view-detail').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Embedded Playlist Add Songs Section Logic ---
let playlistSearchDebounce = null;
let currentPlaylistAddId = null;

function initPlaylistAddSection(playlistId) {
  currentPlaylistAddId = playlistId;
  const searchInput = document.getElementById('playlist-search-input');
  const clearBtn = document.getElementById('playlist-search-clear');
  const chipsContainer = document.getElementById('playlist-quick-chips');

  if (searchInput) searchInput.value = '';
  if (clearBtn) clearBtn.classList.add('hidden');

  // Reset active chip to trending
  if (chipsContainer) {
    chipsContainer.querySelectorAll('.category-chip').forEach((c, idx) => {
      c.classList.toggle('active', idx === 0);
    });
  }

  // Load initial suggestions
  loadPlaylistAddSuggestions('trending');

  // Wire up category chips
  chipsContainer?.querySelectorAll('.category-chip').forEach(chip => {
    chip.onclick = () => {
      chipsContainer.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const source = chip.getAttribute('data-source');
      loadPlaylistAddSuggestions(source);
    };
  });

  // Wire up live search with debounce
  if (searchInput) {
    searchInput.oninput = () => {
      const q = searchInput.value.trim();
      clearBtn?.classList.toggle('hidden', !q);
      clearTimeout(playlistSearchDebounce);

      if (!q) {
        const activeChip = chipsContainer?.querySelector('.category-chip.active');
        const source = activeChip ? activeChip.getAttribute('data-source') : 'trending';
        loadPlaylistAddSuggestions(source);
        return;
      }

      playlistSearchDebounce = setTimeout(async () => {
        const resultsEl = document.getElementById('playlist-search-results');
        if (resultsEl) resultsEl.innerHTML = '<div style="padding:24px; color:var(--text-secondary); text-align:center;">Searching Indian cinema songs...</div>';
        
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => null);
        if (res && res.songs && res.songs.length > 0) {
          renderPlaylistSearchResults(res.songs, currentPlaylistAddId);
        } else {
          if (resultsEl) resultsEl.innerHTML = '<div style="padding:24px; color:var(--text-muted); text-align:center;">No matching songs found. Try searching another title, hero, or singer.</div>';
        }
      }, 260);
    };
  }

  // Clear button
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (searchInput) searchInput.value = '';
      clearBtn.classList.add('hidden');
      const activeChip = chipsContainer?.querySelector('.category-chip.active');
      const source = activeChip ? activeChip.getAttribute('data-source') : 'trending';
      loadPlaylistAddSuggestions(source);
    };
  }
}

async function loadPlaylistAddSuggestions(source = 'trending') {
  const resultsEl = document.getElementById('playlist-search-results');
  if (!resultsEl) return;
  resultsEl.innerHTML = '<div style="padding:24px; color:var(--text-secondary); text-align:center;">Loading songs...</div>';

  let songs = [];
  try {
    if (source === 'trending') {
      const res = await fetch('/api/trending?industry=all').then(r => r.json()).catch(() => null);
      songs = res?.songs || [];
    } else if (source === 'tollywood') {
      const res = await fetch('/api/trending?industry=tollywood').then(r => r.json()).catch(() => null);
      songs = res?.songs || [];
    } else {
      const res = await fetch(`/api/category?id=${source}`).then(r => r.json()).catch(() => null);
      songs = res?.songs || [];
    }
  } catch (err) {
    console.warn('Error loading playlist suggestions:', err);
  }

  if (songs.length > 0) {
    renderPlaylistSearchResults(songs, currentPlaylistAddId);
  } else {
    resultsEl.innerHTML = '<div style="padding:24px; color:var(--text-muted); text-align:center;">No songs available right now.</div>';
  }
}

function renderPlaylistSearchResults(songs, playlistId) {
  const resultsEl = document.getElementById('playlist-search-results');
  if (!resultsEl) return;
  resultsEl.innerHTML = '';

  const pl = state.customPlaylists.find(p => p.id === playlistId);
  if (!pl) return;

  songs.forEach(song => {
    const isAdded = pl.songs.some(s => s.id === song.id);
    const item = document.createElement('div');
    item.className = 'playlist-search-item';

    item.innerHTML = `
      <div class="playlist-search-left">
        <img src="${song.imageSmall || song.image || 'https://c.saavncdn.com/366/Pushpa-2-The-Rule-Telugu-Telugu-2024-20241205211012-500x500.jpg'}" alt="" class="playlist-search-art">
        <div class="playlist-search-info">
          <div class="playlist-search-title">${song.title}</div>
          <div class="playlist-search-sub">${song.movie || 'Tollywood'} • ${song.singers || song.music || 'Artist'}</div>
        </div>
      </div>
      <div class="playlist-search-right">
        <span class="playlist-search-time">${song.durationFormatted || '3:30'}</span>
        <button class="btn ${isAdded ? 'btn-added' : 'btn-add-to-pl'}" data-song-id="${song.id}">
          ${isAdded ? '✓ Added' : '+ Add'}
        </button>
      </div>
    `;

    const addBtn = item.querySelector('button');
    addBtn.onclick = (e) => {
      e.stopPropagation();
      const alreadyIn = pl.songs.some(s => s.id === song.id);
      if (alreadyIn) {
        showToast(`"${song.title}" is already in "${pl.name}"`);
        return;
      }
      
      // Add song to custom playlist
      pl.songs.push(song);
      saveCustomPlaylists();

      // Transform button to Added
      addBtn.className = 'btn btn-added';
      addBtn.innerHTML = '✓ Added';

      // Update cover art if first song
      if (pl.songs.length === 1) {
        const coverEl = document.getElementById('detail-cover');
        if (coverEl) coverEl.src = song.image || song.imageSmall;
      }

      // Update description text count
      const descEl = document.getElementById('detail-desc');
      if (descEl) descEl.textContent = `${pl.desc || 'Custom User Playlist'} • ${pl.songs.length} song${pl.songs.length === 1 ? '' : 's'}`;

      // Refresh table rows above
      const tbody = document.getElementById('detail-songs-tbody');
      if (tbody) {
        if (tbody.querySelector('.empty-playlist-cta-card')) {
          tbody.innerHTML = '';
        }
        tbody.appendChild(renderSongRow(song, pl.songs.length - 1, pl.songs, pl.id));
      }

      showToast(`✅ Added "${song.title}" to "${pl.name}"!`);
    };

    resultsEl.appendChild(item);
  });
}

// 7. YouTube Live View Integration
const ytSearchInput = document.getElementById('yt-search-input');
const ytSearchBtn = document.getElementById('yt-search-btn');
const ytGrid = document.getElementById('youtube-grid');

async function searchAndRenderYouTube(query) {
  ytGrid.innerHTML = '<div style="color:var(--text-secondary); padding:20px;">Searching YouTube across Indian cinema...</div>';
  const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`).then(r => r.json()).catch(() => null);

  if (!res || !res.videos || res.videos.length === 0) {
    ytGrid.innerHTML = '<div style="color:var(--text-muted); padding:20px;">No videos found on YouTube. Try another search.</div>';
    return;
  }

  ytGrid.innerHTML = '';
  res.videos.forEach(v => {
    const card = document.createElement('div');
    card.className = 'yt-video-card';
    card.innerHTML = `
      <div class="yt-thumb-wrap">
        <img src="${v.thumbnail}" alt="" class="yt-thumb" loading="lazy">
        <span class="yt-duration-badge">${v.length}</span>
        <div class="yt-play-overlay">
          <div class="yt-play-btn">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </div>
        </div>
      </div>
      <div class="yt-card-info">
        <div class="yt-card-title">${v.title}</div>
        <div class="yt-card-channel">${v.channel}</div>
      </div>
    `;

    card.addEventListener('click', () => {
      playYouTubeVideo(v.id, v.title, v.channel, v.thumbnail);
    });

    ytGrid.appendChild(card);
  });
}

ytSearchBtn?.addEventListener('click', () => {
  const q = ytSearchInput.value.trim();
  if (q) searchAndRenderYouTube(q);
});

ytSearchInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const q = ytSearchInput.value.trim();
    if (q) searchAndRenderYouTube(q);
  }
});

document.querySelectorAll('.yt-filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.yt-filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    searchAndRenderYouTube(chip.getAttribute('data-q'));
  });
});

// 8. Global Instant Search with Debounce
let searchDebounceTimer = null;
globalSearch.addEventListener('input', () => {
  const query = globalSearch.value.trim();
  searchClearBtn.classList.toggle('hidden', !query);

  clearTimeout(searchDebounceTimer);
  if (!query) {
    if (state.activeTab === 'search-results') switchTab('home');
    return;
  }

  searchDebounceTimer = setTimeout(async () => {
    searchQuerySubtitle.textContent = `Results for "${query}"`;
    tabViews.forEach(v => v.classList.remove('active'));
    document.getElementById('view-search-results').classList.add('active');

    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`).then(r => r.json()).catch(() => null);
    if (!res) return;

    searchSongsTbody.innerHTML = '';
    searchAlbumsGrid.innerHTML = '';

    if (res.songs && res.songs.length > 0) {
      res.songs.forEach((s, idx) => {
        searchSongsTbody.appendChild(renderSongRow(s, idx, res.songs));
      });
    } else {
      searchSongsTbody.innerHTML = '<tr><td colspan="6" style="padding:20px; color:var(--text-muted); text-align:center;">No songs found</td></tr>';
    }

    if (res.albums && res.albums.length > 0) {
      res.albums.forEach(album => {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.innerHTML = `
          <div class="card-art-wrap">
            <img src="${album.image || 'https://c.saavncdn.com/366/Pushpa-2-The-Rule-Telugu-Telugu-2024-20241205211012-500x500.jpg'}" alt="" class="card-art">
          </div>
          <div class="card-title">${album.title}</div>
          <div class="card-subtitle">${album.subtitle}</div>
        `;
        card.addEventListener('click', () => openSearchDetail(album.title, album.title, album.image));
        searchAlbumsGrid.appendChild(card);
      });
    }
  }, 280);
});

searchClearBtn.addEventListener('click', () => {
  globalSearch.value = '';
  searchClearBtn.classList.add('hidden');
  switchTab('home');
});

// Play All & Shuffle All buttons in Songs Tab
document.getElementById('play-all-songs-btn')?.addEventListener('click', () => {
  const rows = document.querySelectorAll('#all-songs-tbody tr');
  if (rows.length > 0) rows[0].querySelector('.col-title').click();
});

document.getElementById('shuffle-all-songs-btn')?.addEventListener('click', () => {
  const rows = document.querySelectorAll('#all-songs-tbody tr');
  if (rows.length > 0) {
    const randomIdx = Math.floor(Math.random() * rows.length);
    rows[randomIdx].querySelector('.col-title').click();
    sheetShuffleBtn.click();
  }
});

// --- Keyboard Shortcuts ---
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;

  if (e.code === 'Space') {
    e.preventDefault();
    togglePlayPause();
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    audio.currentTime = Math.min(audio.currentTime + 5, audio.duration || 0);
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    audio.currentTime = Math.max(audio.currentTime - 5, 0);
  } else if (e.code === 'ArrowUp') {
    e.preventDefault();
    state.volume = Math.min(state.volume + 0.05, 1);
    audio.volume = state.volume;
    sheetVolumeSlider.value = state.volume;
  } else if (e.code === 'ArrowDown') {
    e.preventDefault();
    state.volume = Math.max(state.volume - 0.05, 0);
    audio.volume = state.volume;
    sheetVolumeSlider.value = state.volume;
  } else if (e.key === 'm' || e.key === 'M') {
    sheetMuteBtn.click();
  } else if (e.key === 'l' || e.key === 'L') {
    toggleLike(state.currentSong);
  } else if (e.key === 'n' || e.key === 'N') {
    playNext();
  } else if (e.key === 'p' || e.key === 'P') {
    playPrev();
  } else if (e.key === 'Escape') {
    closeNowPlayingSheet();
    queueDrawer.classList.remove('active');
    sleepModal.classList.add('hidden');
    closeCreatePlaylistModal();
    closeAddToPlaylistModal();
  }
});

// --- Language Category Filter Listener for Songs Tab ---
function initSongsLangFilter() {
  const container = document.getElementById('songs-lang-chips');
  if (!container) return;
  container.querySelectorAll('.songs-lang-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const lang = chip.getAttribute('data-lang') || 'all';
      container.querySelectorAll('.songs-lang-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      // Sync industry chips on home view too
      document.querySelectorAll('#industry-chips .category-chip').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-lang') === lang);
      });

      loadTrending(lang);
    });
  });
}

// --- Initialization ---
function initApp() {
  // Purge legacy service worker caches
  if ('caches' in window) {
    caches.keys().then(keys => {
      keys.forEach(k => {
        if (k !== 'swaram-v6') caches.delete(k);
      });
    }).catch(() => {});
  }

  // Synchronous UI setups first - immediate user interactivity!
  AccountManager.init();
  renderLikedCount();
  renderCustomPlaylists();
  initPlaylistEvents();
  initSongsLangFilter();
  initDownloadsViewEvents();
  initNetworkListeners();
  updateHistoryUI();
  renderHistoryCarousel();
  initHistoryEvents();

  // Async storage & data catalog loading
  OfflineDB.init().then(() => {
    updateDownloadsCountBadge();
  }).catch(() => {});

  loadCategories();
  loadTrending();
  loadCarousels();
  loadArtists();
  loadAlbums();
  searchAndRenderYouTube('pan india top hit songs 2024');

  // Register Service Worker for offline app loading
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update().catch(() => {});
      console.log('Swaram ServiceWorker v2 registered');
    }).catch(err => {
      console.warn('ServiceWorker registration warning:', err);
    });
  }
}

initApp();
