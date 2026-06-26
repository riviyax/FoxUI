/* --- newtab-config.js --- */
import { state } from './newtab-core.js';

/* ─────────────────────────────────────────────
   Storage helpers
   sync  → small settings (overlay, slideshow, quickLinks, musicIndex, current bg id)
   local → large blobs (uploaded files, card positions)
   ───────────────────────────────────────────── */

export function saveSettings(settings) {
  // Strip uploads from sync (too large); they live in local storage
  const { uploads, uploadedAudio, ...syncSafe } = settings;
  chrome.storage.sync.set({ chromeui_settings: syncSafe });

  // Persist uploads separately in local
  if (uploads !== undefined) {
    chrome.storage.local.set({ chromeui_uploads: uploads });
  }
  if (uploadedAudio !== undefined) {
    chrome.storage.local.set({ chromeui_audio: uploadedAudio });
  }
}

export function loadSettings() {
  return new Promise((res) => {
    chrome.storage.sync.get(['chromeui_settings'], (syncData) => {
      const base = (syncData && syncData.chromeui_settings) || {};

      // Also load local blobs and merge them in
      chrome.storage.local.get(['chromeui_uploads', 'chromeui_audio'], (localData) => {
        if (localData.chromeui_uploads) base.uploads = localData.chromeui_uploads;
        if (localData.chromeui_audio) base.uploadedAudio = localData.chromeui_audio;
        res(Object.keys(base).length ? base : null);
      });
    });
  });
}

/* ─────────────────────────────────────────────
   Fetch packaged configs
   ───────────────────────────────────────────── */
export async function fetchConfigs() {
  const imgs = await fetch(chrome.runtime.getURL('config/images.json')).then(r => r.json()).catch(() => []);
  const vds  = await fetch(chrome.runtime.getURL('config/videos.json')).then(r => r.json()).catch(() => []);
  let mus = [];
  try { mus = await fetch(chrome.runtime.getURL('config/music.json')).then(r => r.json()); } catch (e) {}
  return { images: imgs, videos: vds, music: mus };
}

export function buildList(configs, saved) {
  const list = [];
  const overlayVal = (saved && saved.overlay) || 0.45;

  (configs.videos || []).forEach(v =>
    list.push({ type: 'video', src: chrome.runtime.getURL(v.path), name: v.name, id: v.id, overlay: overlayVal })
  );
  (configs.images || []).forEach(i =>
    list.push({ type: 'image', src: chrome.runtime.getURL(i.path), name: i.name, id: i.id, overlay: overlayVal })
  );
  if (saved && saved.uploads && Array.isArray(saved.uploads)) {
    saved.uploads.forEach(u => {
      if (!u.id) u.id = 'upload-' + Date.now();
      list.unshift(u);
    });
  }
  return list;
}

/* ─────────────────────────────────────────────
   Music helpers
   ───────────────────────────────────────────── */
export function saveMusicIndex() {
  loadSettings().then(s => {
    if (!s) s = {};
    s.musicIndex = state.music.index;
    saveSettings(s);
  });
}

export function loadPlaylist(configMusic, saved) {
  const playlist = [];
  (configMusic || []).forEach(m => {
    playlist.push({ name: m.name, src: chrome.runtime.getURL(m.path), id: m.id || 'music-' + m.name });
  });
  if (saved && saved.uploadedAudio && Array.isArray(saved.uploadedAudio)) {
    saved.uploadedAudio.forEach(a => playlist.unshift(a));
  }
  state.music.playlist = playlist;
  if (saved && typeof saved.musicIndex === 'number') state.music.index = saved.musicIndex;
}

/* ─────────────────────────────────────────────
   Card order (positions stored in local)
   ───────────────────────────────────────────── */
export function saveCardOrder(order) {
  chrome.storage.local.set({ chromeui_card_order: order });
}

export function loadCardOrder() {
  return new Promise(res => {
    chrome.storage.local.get(['chromeui_card_order'], data => {
      res((data && data.chromeui_card_order) || null);
    });
  });
}