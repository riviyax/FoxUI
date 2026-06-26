/* --- spotify.js — Spotify embed + playlist picker --- */

import { loadSettings, saveSettings } from './newtab-config.js';

export const SPOTIFY_PRESETS = [
  { id: '37i9dQZF1DXcBWIGoYBM5M', name: 'Top Hits', type: 'playlist' },
  { id: '37i9dQZF1DX3WvGXE8Fq99', name: 'Chill Hits', type: 'playlist' },
  { id: '37i9dQZF1DWXRqgorGG26c', name: 'Rock Classics', type: 'playlist' },
  { id: '37i9dQZF1DX4sWSpwq3LiO', name: 'Peaceful Piano', type: 'playlist' },
  { id: '37i9dQZF1DWYfNJLV7OBMA', name: 'Sinhala Pop', type: 'playlist' },
  { id: '37i9dQZF1DWZeKCadgRdKQ', name: 'Deep Focus', type: 'playlist' },
  { id: '37i9dQZF1DX0SM0LYsmbMT', name: 'Jazz Vibes', type: 'playlist' },
  { id: '37i9dQZF1DX3rxVfae1B2l', name: 'Mood Booster', type: 'playlist' },
  { id: '37i9dQZF1DWSSXTJwS0YF0', name: 'Indie Mix', type: 'playlist' },
  { id: '37i9dQZF1DWUa8ZRTfalHk', name: 'RapCaviar', type: 'playlist' },
];

export function parseSpotifyUrl(input) {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) {
    return { type: 'playlist', id: trimmed };
  }

  const patterns = [
    /open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/,
    /spotify:(playlist|album|track):([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return { type: match[1], id: match[2] };
  }

  return null;
}

export function buildEmbedSrc({ id, type }) {
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
}

function defaultNameForType(type) {
  if (type === 'album') return 'Custom Album';
  if (type === 'track') return 'Custom Track';
  return 'Custom Playlist';
}

export function initSpotify(saved = {}) {
  const iframe = document.getElementById('spotify-player');
  const presetsEl = document.getElementById('spotify-presets');
  const badgeEl = document.getElementById('spotify-now-playing');
  const urlInput = document.getElementById('spotify-url-input');
  const loadBtn = document.getElementById('spotify-load-btn');
  const errEl = document.getElementById('spotify-err');

  if (!iframe || !presetsEl) return;

  let current = saved.spotify || { ...SPOTIFY_PRESETS[0] };
  let customPlaylists = Array.isArray(saved.spotifyCustom) ? saved.spotifyCustom : [];

  function persist(extra = {}) {
    loadSettings().then(s => {
      if (!s) s = {};
      s.spotify = current;
      s.spotifyCustom = customPlaylists;
      Object.assign(s, extra);
      saveSettings(s);
    });
  }

  function setPlaylist(item, persist = true) {
    current = { ...item };
    iframe.src = buildEmbedSrc(current);
    if (badgeEl) badgeEl.textContent = current.name || 'Spotify';
    renderPresets();
    if (persist) persist();
  }

  function addCustom(parsed, displayName) {
    const item = {
      id: parsed.id,
      type: parsed.type,
      name: displayName || defaultNameForType(parsed.type),
    };

    const exists = customPlaylists.some(p => p.id === item.id && p.type === item.type);
    if (!exists) {
      customPlaylists = [item, ...customPlaylists].slice(0, 10);
      persist();
    }
    setPlaylist(item);
  }

  function renderPresets() {
    const all = [...customPlaylists, ...SPOTIFY_PRESETS];
    presetsEl.innerHTML = '';

    all.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'spotify-chip';
      if (current.id === item.id && current.type === item.type) btn.classList.add('active');
      btn.textContent = item.name;
      btn.addEventListener('click', () => setPlaylist(item));
      presetsEl.appendChild(btn);
    });
  }

  function showErr(msg) {
    if (!errEl) return;
    errEl.textContent = msg;
    if (msg) {
      setTimeout(() => {
        if (errEl.textContent === msg) errEl.textContent = '';
      }, 4500);
    }
  }

  if (loadBtn && urlInput) {
    const handleLoad = () => {
      const parsed = parseSpotifyUrl(urlInput.value);
      if (!parsed) {
        showErr('Paste a valid Spotify playlist, album, or track link.');
        return;
      }
      showErr('');
      addCustom(parsed);
      urlInput.value = '';
    };

    loadBtn.addEventListener('click', handleLoad);
    urlInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleLoad();
    });
  }

  renderPresets();
  setPlaylist(current, false);
}
