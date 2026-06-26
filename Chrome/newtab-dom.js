/* --- newtab-dom.js --- */

import {
  state,
  bgVideo,
  audioPlayer,
  searchEl,
  musicPlayBtn,
  musicNextBtn,
  musicPrevBtn,
  musicTitleEl,
  applyBackground,
  applyOverlay,
  renderQuickLinks,
  startSlideshow,
  stopSlideshow,
  loadDailyQuote,
} from './newtab-core.js';

import {
  saveSettings,
  loadSettings,
  fetchConfigs,
  buildList,
  loadPlaylist,
  saveMusicIndex,
  saveCardOrder,
  loadCardOrder,
} from './newtab-config.js';

import { initSpotify } from './spotify.js';

let configs = null;

/* ─────────────────────────────────────────────
   Music helpers
   ───────────────────────────────────────────── */
function updateMusicUI() {
  const active = state.music.playlist[state.music.index];
  if (musicTitleEl) musicTitleEl.textContent = active ? active.name : '—';
}

function playCurrentTrack() {
  const track = state.music.playlist[state.music.index];
  if (!track || !audioPlayer) return;
  audioPlayer.src = track.src;
  audioPlayer.play()
    .then(() => {
      if (musicPlayBtn) musicPlayBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
      if (musicTitleEl) musicTitleEl.textContent = track.name;
    })
    .catch(() => {
      if (musicTitleEl) musicTitleEl.textContent = track.name;
    });
}

function togglePlayPause() {
  if (!audioPlayer) return;
  if (audioPlayer.paused) {
    if (!audioPlayer.src) playCurrentTrack();
    else audioPlayer.play().catch(() => {});
    if (musicPlayBtn) musicPlayBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
  } else {
    audioPlayer.pause();
    if (musicPlayBtn) musicPlayBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
  }
}

function nextMusic() {
  if (!state.music.playlist.length) return;
  state.music.index = (state.music.index + 1) % state.music.playlist.length;
  playCurrentTrack();
  saveMusicIndex();
}

function prevMusic() {
  if (!state.music.playlist.length) return;
  state.music.index = (state.music.index - 1 + state.music.playlist.length) % state.music.playlist.length;
  playCurrentTrack();
  saveMusicIndex();
}

/* ─────────────────────────────────────────────
   Quick-link editor (settings panel only)
   ───────────────────────────────────────────── */
function renderQuickEditor(list, container) {
  if (!container) return;
  container.innerHTML = '';
  (list || []).forEach((q, idx) => {
    const row = document.createElement('div');
    row.className = 'quick-editor-row';

    const title = document.createElement('input');
    title.value       = q.title;
    title.placeholder = 'Label';

    const url = document.createElement('input');
    url.value       = q.url;
    url.placeholder = 'https://…';
    url.style.flex  = '2';

    const remove = document.createElement('button');
    remove.textContent = '✕';
    remove.type        = 'button';
    remove.className   = 'btn';
    remove.style.padding = '6px 10px';
    remove.addEventListener('click', () => {
      list.splice(idx, 1);
      renderQuickEditor(list, container);
      renderQuickLinks(list);
    });

    title.addEventListener('input', () => { list[idx].title = title.value; renderQuickLinks(list); });
    url.addEventListener('input',   () => { list[idx].url   = url.value;   renderQuickLinks(list); });

    row.append(title, url, remove);
    container.appendChild(row);
  });
}

/* ─────────────────────────────────────────────
   Drag & Drop (flex reorder, not absolute)
   Cards live in a flex column; we reorder them in DOM.
   ───────────────────────────────────────────── */
function setupDragAndDrop() {
  const cardArea = document.getElementById('card-area');
  if (!cardArea) return;

  let dragSrc = null;

  function getDraggableCards() {
    return [...cardArea.querySelectorAll('[draggable="true"]')];
  }

  function getCardAtY(y) {
    const cards = getDraggableCards().filter(c => c !== dragSrc);
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (y < midY) return { card, before: true };
    }
    return null;
  }

  cardArea.addEventListener('dragstart', e => {
    dragSrc = e.target.closest('[draggable="true"]');
    if (!dragSrc) return;
    dragSrc.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragSrc.id);
  });

  cardArea.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const hit = getCardAtY(e.clientY);
    // Remove old indicators
    getDraggableCards().forEach(c => c.classList.remove('drag-over-top', 'drag-over-bottom'));
    if (hit) hit.card.classList.add(hit.before ? 'drag-over-top' : 'drag-over-bottom');
  });

  cardArea.addEventListener('dragleave', e => {
    if (!cardArea.contains(e.relatedTarget)) {
      getDraggableCards().forEach(c => c.classList.remove('drag-over-top', 'drag-over-bottom'));
    }
  });

  cardArea.addEventListener('drop', e => {
    e.preventDefault();
    getDraggableCards().forEach(c => c.classList.remove('drag-over-top', 'drag-over-bottom'));
    if (!dragSrc) return;

    const hit = getCardAtY(e.clientY);
    if (hit) {
      if (hit.before) cardArea.insertBefore(dragSrc, hit.card);
      else hit.card.insertAdjacentElement('afterend', dragSrc);
    } else {
      cardArea.appendChild(dragSrc);
    }

    saveCurrentCardOrder();
  });

  cardArea.addEventListener('dragend', e => {
    getDraggableCards().forEach(c => { c.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom'); });
    dragSrc = null;
  });
}

function saveCurrentCardOrder() {
  const cardArea = document.getElementById('card-area');
  if (!cardArea) return;
  const order = [...cardArea.querySelectorAll('[draggable="true"]')].map(c => c.id);
  saveCardOrder(order);
}

async function restoreCardOrder() {
  const saved = await loadCardOrder();
  if (!saved || !Array.isArray(saved)) return; // positions object from old version or null — skip
  const cardArea = document.getElementById('card-area');
  if (!cardArea) return;
  saved.forEach(id => {
    const el = document.getElementById(id);
    if (el) cardArea.appendChild(el); // re-appending in order reorders the flex children
  });
}

/* ─────────────────────────────────────────────
   Hide/show panel helpers
   ───────────────────────────────────────────── */
function applyPanelVisibility() {
  const pairs = [
    { storageKey: 'bgHidden',      selector: '#bg-controls-card',    toggleId: 'bg-toggle' },
    { storageKey: 'spotifyHidden', selector: '#spotify-player-card', toggleId: 'spotify-toggle' },
    { storageKey: 'todoHidden',    selector: '#todo-card-module',     toggleId: 'todo-toggle' },
  ];
  pairs.forEach(({ storageKey, selector, toggleId }) => {
    const el     = document.querySelector(selector);
    const toggle = document.getElementById(toggleId);
    if (localStorage.getItem(storageKey) === 'true') {
      if (el) el.style.display = 'none';
      if (toggle) toggle.checked = true;
    }
  });
}

/* ─────────────────────────────────────────────
   DOMContentLoaded — main wiring
   ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {

  /* --- Element refs --- */
  const settingsDialog   = document.getElementById('settings');
  const openSettings     = document.getElementById('open-settings');
  const closeBtn         = document.getElementById('close-btn');
  const saveBtn          = document.getElementById('save-btn');
  const overlayRange     = document.getElementById('overlay-range');
  const overlayValEl     = document.getElementById('overlay-val');
  const imgSelect        = document.getElementById('image-select');
  const vidSelect        = document.getElementById('video-select');
  const togglePlay       = document.getElementById('toggle-play');
  const prevBg           = document.getElementById('prev-bg');
  const nextBg           = document.getElementById('next-bg');
  const slideshowEnable  = document.getElementById('slideshow-enable');
  const slideshowInterval = document.getElementById('slideshow-interval');
  const quickTitle       = document.getElementById('quick-title');
  const quickUrl         = document.getElementById('quick-url');
  const addQuick         = document.getElementById('add-quick');
  const quickEditor      = document.getElementById('quick-list-editor');
  const musicSelect      = document.getElementById('music-select');
  const lockToggle       = document.getElementById('lock-toggle');

  /* --- Load daily quote --- */
  loadDailyQuote();

  /* --- Settings dialog open/close --- */
  if (openSettings) openSettings.addEventListener('click', () => settingsDialog && settingsDialog.showModal());
  if (closeBtn)     closeBtn.addEventListener('click',     () => settingsDialog && settingsDialog.close());

  /* --- Overlay range live readout --- */
  if (overlayRange && overlayValEl) {
    overlayRange.addEventListener('input', () => {
      overlayValEl.textContent = parseFloat(overlayRange.value).toFixed(2);
      applyOverlay(overlayRange.value);
    });
  }

  /* --- Search bar --- */
  if (searchEl) {
    searchEl.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const q = e.target.value.trim();
      if (!q) return;
      const url = q.includes(' ') || !q.includes('.')
        ? `https://www.google.com/search?q=${encodeURIComponent(q)}`
        : q.startsWith('http') ? q : `https://${q}`;
      window.location.href = url;
    });
  }

  /* --- Background navigation controls --- */
  if (togglePlay) {
    togglePlay.addEventListener('click', () => {
      if (!bgVideo || !bgVideo.classList.contains('visible')) return;
      if (bgVideo.paused) {
        bgVideo.play();
        togglePlay.innerHTML = '<i class="bi bi-pause-fill"></i>';
      } else {
        bgVideo.pause();
        togglePlay.innerHTML = '<i class="bi bi-play-fill"></i>';
      }
    });
  }

  if (prevBg) prevBg.addEventListener('click', () => {
    if (!state.list.length) return;
    state.index = (state.index - 1 + state.list.length) % state.list.length;
    applyBackground(state.list[state.index]);
  });

  if (nextBg) nextBg.addEventListener('click', () => {
    if (!state.list.length) return;
    state.index = (state.index + 1) % state.list.length;
    applyBackground(state.list[state.index]);
  });

  /* --- Load configs and settings --- */
  configs = await fetchConfigs();
  const saved = (await loadSettings()) || {};
  const list  = buildList(configs, saved);
  state.list  = list;

  /* --- Populate dropdowns --- */
  (configs.images || []).forEach(i => {
    const opt = document.createElement('option');
    opt.value = i.id; opt.textContent = i.name;
    if (imgSelect) imgSelect.appendChild(opt);
  });

  (configs.videos || []).forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id; opt.textContent = v.name;
    if (vidSelect) vidSelect.appendChild(opt);
  });

  (configs.music || []).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id || m.name; opt.textContent = m.name;
    if (musicSelect) musicSelect.appendChild(opt);
  });

  /* --- Quick links --- */
  const defaults = { quickLinks: [
    { title: 'Gmail',   url: 'https://mail.google.com' },
    { title: 'YouTube', url: 'https://www.youtube.com' },
    { title: 'ChatGPT', url: 'https://chatgpt.com/' },
    { title: 'GitHub',  url: 'https://github.com' },
    { title: 'Discord', url: 'https://discord.com/' },
  ]};
  state.quickLinks = saved.quickLinks || defaults.quickLinks;
  renderQuickLinks(state.quickLinks);
  renderQuickEditor(state.quickLinks, quickEditor);

  /* --- Background initial load --- */
  let currentBgId = null;

  if (saved.current) {
    const found = state.list.find(x => x.id === saved.current.id);
    if (found) saved.current = { ...found, overlay: saved.overlay || found.overlay };
    applyBackground(saved.current);
    if (saved.current.id) {
      currentBgId = saved.current.id;
      const idx = state.list.findIndex(x => x.id === saved.current.id);
      if (idx !== -1) state.index = idx;
    }
  } else if (list.length > 0) {
    state.index = 0;
    applyBackground(list[0]);
    currentBgId = list[0].id;
  }

  if (currentBgId) {
    const currentBg = state.list.find(x => x.id === currentBgId);
    if (currentBg) {
      if (currentBg.type === 'image' && imgSelect) imgSelect.value = currentBgId;
      else if (currentBg.type === 'video' && vidSelect) vidSelect.value = currentBgId;
    }
  }

  /* --- Overlay init --- */
  const savedOverlay = saved.overlay || 0.45;
  if (overlayRange) overlayRange.value = savedOverlay;
  if (overlayValEl) overlayValEl.textContent = parseFloat(savedOverlay).toFixed(2);
  applyOverlay(savedOverlay);

  /* --- Slideshow init --- */
  state.slideshow.enabled  = !!(saved.slideshow && saved.slideshow.enabled);
  state.slideshow.interval = (saved.slideshow && saved.slideshow.interval) || 8;
  if (slideshowEnable) slideshowEnable.checked = state.slideshow.enabled;
  if (slideshowInterval) slideshowInterval.value = state.slideshow.interval;
  if (state.slideshow.enabled) startSlideshow();

  /* --- Music init --- */
  loadPlaylist((configs && configs.music) || [], saved);
  if (saved.musicIndex !== undefined) state.music.index = saved.musicIndex;
  updateMusicUI();

  /* --- Spotify player --- */
  initSpotify(saved);

  /* --- Add quick link --- */
  if (addQuick) {
    addQuick.addEventListener('click', () => {
      const t = (quickTitle && quickTitle.value.trim()) || '';
      const u = (quickUrl  && quickUrl.value.trim())   || '';
      if (!t || !u) return;
      state.quickLinks.push({ title: t, url: u });
      if (quickTitle) quickTitle.value = '';
      if (quickUrl)   quickUrl.value   = '';
      renderQuickLinks(state.quickLinks);
      renderQuickEditor(state.quickLinks, quickEditor);
    });
  }

  /* ─── Save Button ─── */
  if (saveBtn) {
    saveBtn.addEventListener('click', ev => {
      ev.preventDefault();
      const selImg           = imgSelect ? imgSelect.value : null;
      const selVid           = vidSelect ? vidSelect.value : null;
      const overlayVal       = parseFloat(overlayRange ? overlayRange.value : 0.45);
      const slideshowEnabled = slideshowEnable ? slideshowEnable.checked : false;
      const slideshowInt     = parseInt(slideshowInterval ? slideshowInterval.value : 8) || 8;
      const selMusic         = musicSelect ? musicSelect.value : null;

      loadSettings().then(s => {
        if (!s) s = {};
        s.overlay  = overlayVal;
        s.slideshow = { enabled: slideshowEnabled, interval: slideshowInt };
        s.quickLinks = state.quickLinks;

        const currentBgId = selVid || selImg;
        const currentBg   = currentBgId ? state.list.find(item => item.id === currentBgId) : null;

        if (currentBg) {
          s.current = { ...currentBg, overlay: overlayVal };
        } else if (s.current) {
          s.current.overlay = overlayVal;
        }

        if (configs && selMusic) {
          const mi = (configs.music || []).findIndex(m => (m.id || m.name) === selMusic);
          if (mi !== -1) {
            const target = configs.music[mi];
            const src    = chrome.runtime.getURL(target.path);
            const pidx   = state.music.playlist.findIndex(p => p.src === src);
            if (pidx !== -1) state.music.index = pidx;
            s.musicIndex = state.music.index;
          }
        }

        saveSettings(s);
        applyBackground(s.current);
        state.slideshow.enabled  = slideshowEnabled;
        state.slideshow.interval = slideshowInt;
        if (state.slideshow.enabled) startSlideshow();
        else stopSlideshow();

        /* Panel visibility toggles */
        [
          { toggleId: 'bg-toggle',      selector: '#bg-controls-card',    key: 'bgHidden' },
          { toggleId: 'spotify-toggle', selector: '#spotify-player-card', key: 'spotifyHidden' },
          { toggleId: 'todo-toggle',    selector: '#todo-card-module',     key: 'todoHidden' },
        ].forEach(({ toggleId, selector, key }) => {
          const toggle = document.getElementById(toggleId);
          const el     = document.querySelector(selector);
          if (toggle && el) {
            el.style.display = toggle.checked ? 'none' : '';
            localStorage.setItem(key, toggle.checked);
          }
        });

        settingsDialog && settingsDialog.close();
      });
    });
  }

  /* ─── Lock Toggle (FIXED: inside DOMContentLoaded) ─── */
  if (lockToggle) {
    const draggable = localStorage.getItem('draggableCards');
    // Checked = locked (dragging disabled)
    lockToggle.checked = draggable !== 'true';

    lockToggle.addEventListener('change', () => {
      const locked = lockToggle.checked;
      localStorage.setItem('draggableCards', locked ? 'false' : 'true');
      // Reload so drag setup re-runs with correct value
      setTimeout(() => location.reload(), 150);
    });
  }

  /* ─── Restore panel visibility ─── */
  applyPanelVisibility();

  /* ─── Music controls wiring ─── */
  if (musicPlayBtn) musicPlayBtn.addEventListener('click', togglePlayPause);
  if (musicNextBtn) musicNextBtn.addEventListener('click', nextMusic);
  if (musicPrevBtn) musicPrevBtn.addEventListener('click', prevMusic);

  if (audioPlayer) {
    audioPlayer.addEventListener('ended', () => { nextMusic(); });
  }

  /* ─── Restore card order ─── */
  await restoreCardOrder();

  /* ─── Setup drag & drop if unlocked ─── */
  if (localStorage.getItem('draggableCards') === 'true') {
    setupDragAndDrop();
  }

}); // end DOMContentLoaded