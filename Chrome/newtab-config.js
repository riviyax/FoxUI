/* --- newtab-config.js --- */
import { state } from './newtab-core.js';

/* ─────────────────────────────────────────────
   Storage helpers
   sync  → settings (overlay, slideshow, quickLinks, musicIndex, current bg id)
   local → card positions
   ───────────────────────────────────────────── */

export function saveSettings(settings) {
  chrome.storage.sync.set({ chromeui_settings: settings });
}

export function loadSettings() {
  return new Promise((res) => {
    chrome.storage.sync.get(['chromeui_settings'], (syncData) => {
      const base = (syncData && syncData.chromeui_settings) || null;
      res(base);
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