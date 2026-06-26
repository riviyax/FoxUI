/* --- newtab-core.js --- */

/* ─────────────────────────────────────────────
   DOM Element References
   ───────────────────────────────────────────── */
export const bgVideo          = document.getElementById('bg-video');
export const bgImage          = document.getElementById('bg-image');
export const overlayEl        = document.getElementById('overlay');
export const searchEl         = document.getElementById('search');
export const quickLinksEl     = document.getElementById('quick-links');
export const clockEl          = document.getElementById('clock');
export const greetingEl       = document.getElementById('greeting');
export const currentBgNameEl  = document.getElementById('current-bg-name');

export const audioPlayer      = document.getElementById('audio-player');
export const musicPlayBtn     = document.getElementById('music-play');
export const musicPrevBtn     = document.getElementById('music-prev');
export const musicNextBtn     = document.getElementById('music-next');
export const musicTitleEl     = document.getElementById('music-title');

/* Prepare video for autoplay policies */
if (bgVideo) {
  bgVideo.muted = true;
  bgVideo.setAttribute('muted', 'muted');
  bgVideo.playsInline = true;
  bgVideo.setAttribute('playsinline', '');
  bgVideo.preload = 'auto';
}

/* ─────────────────────────────────────────────
   App State
   ───────────────────────────────────────────── */
export let state = {
  list: [],
  index: 0,
  current: null,
  slideshow: { enabled: false, interval: 8, timerId: null },
  quickLinks: [],
  music: { playlist: [], index: 0 },
};

/* ─────────────────────────────────────────────
   Clock & Greeting
   ───────────────────────────────────────────── */
export function updateClock() {
  const now = new Date();
  if (clockEl) clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const h = now.getHours();
  if (greetingEl) {
    if      (h < 5)  greetingEl.textContent = 'Burning the midnight oil…';
    else if (h < 12) greetingEl.textContent = 'Good morning!';
    else if (h < 17) greetingEl.textContent = 'Good afternoon!';
    else if (h < 21) greetingEl.textContent = 'Good evening!';
    else             greetingEl.textContent = 'Winding down for the night…';
  }
}

setInterval(updateClock, 1000);
updateClock();

/* ─────────────────────────────────────────────
   Daily Quote
   A small curated set — one is chosen by day-of-year
   so it changes daily but stays consistent within a day.
   ───────────────────────────────────────────── */
const QUOTES = [
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'In the middle of every difficulty lies opportunity.', author: 'Albert Einstein' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Life is what happens when you\'re busy making other plans.', author: 'John Lennon' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
  { text: 'Strive not to be a success, but rather to be of value.', author: 'Albert Einstein' },
  { text: 'The mind is everything. What you think you become.', author: 'Buddha' },
  { text: 'An unexamined life is not worth living.', author: 'Socrates' },
  { text: 'Spread love everywhere you go. Let no one ever come to you without leaving happier.', author: 'Mother Teresa' },
  { text: 'When you reach the end of your rope, tie a knot in it and hang on.', author: 'Franklin D. Roosevelt' },
  { text: 'Always remember that you are absolutely unique. Just like everyone else.', author: 'Margaret Mead' },
  { text: 'Do not go where the path may lead. Go instead where there is no path and leave a trail.', author: 'Ralph Waldo Emerson' },
  { text: 'You will face many defeats in life, but never let yourself be defeated.', author: 'Maya Angelou' },
  { text: 'The greatest glory in living lies not in never falling, but in rising every time we fall.', author: 'Nelson Mandela' },
  { text: 'In the end, it\'s not the years in your life that count. It\'s the life in your years.', author: 'Abraham Lincoln' },
  { text: 'Never let the fear of striking out keep you from playing the game.', author: 'Babe Ruth' },
  { text: 'Life is either a daring adventure or nothing at all.', author: 'Helen Keller' },
  { text: 'Many of life\'s failures are people who did not realize how close they were to success when they gave up.', author: 'Thomas A. Edison' },
  { text: 'You have brains in your head. You have feet in your shoes. You can steer yourself any direction you choose.', author: 'Dr. Seuss' },
  { text: 'If life were predictable it would cease to be life, and be without flavor.', author: 'Eleanor Roosevelt' },
  { text: 'If you look at what you have in life, you\'ll always have more.', author: 'Oprah Winfrey' },
  { text: 'If you want to live a happy life, tie it to a goal, not to people or things.', author: 'Albert Einstein' },
  { text: 'Never let the fear of striking out keep you from playing the game.', author: 'Babe Ruth' },
  { text: 'Money and success don\'t change people; they merely amplify what is already there.', author: 'Will Smith' },
  { text: 'Your time is limited, so don\'t waste it living someone else\'s life.', author: 'Steve Jobs' },
  { text: 'Not how long, but how well you have lived is the main thing.', author: 'Seneca' },
  { text: 'If life is not smiling at you, give it a good tickling.', author: 'Unknown' },
  { text: 'I have not failed. I\'ve just found 10,000 ways that won\'t work.', author: 'Thomas A. Edison' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
  { text: 'Life is not measured by the number of breaths we take, but by the moments that take our breath away.', author: 'Maya Angelou' },
];

export function loadDailyQuote() {
  const quoteTextEl   = document.getElementById('quote-text');
  const quoteAuthorEl = document.getElementById('quote-author');
  if (!quoteTextEl || !quoteAuthorEl) return;

  const now    = new Date();
  const start  = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  const quote  = QUOTES[dayOfYear % QUOTES.length];

  quoteTextEl.textContent   = quote.text;
  quoteAuthorEl.textContent = '— ' + quote.author;
}

/* ─────────────────────────────────────────────
   Icon Loader
   ───────────────────────────────────────────── */
const ICON_CACHE = new Map();
export const LOCAL_FALLBACK_ICON = chrome.runtime.getURL('assets/default-icon.png');

function testImageUrl(url, timeout = 4000) {
  return new Promise(resolve => {
    try {
      const img = new Image();
      let done = false;
      const tidy = ok => { if (done) return; done = true; img.onload = img.onerror = null; resolve(ok); };
      img.onload  = () => tidy(true);
      img.onerror = () => tidy(false);
      img.src = url;
      setTimeout(() => tidy(!!img.complete && img.naturalWidth > 0), timeout);
    } catch (e) { resolve(false); }
  });
}

export async function getBestIconForSite(siteUrl) {
  try {
    const domain = new URL(siteUrl).hostname;
    if (!domain) return LOCAL_FALLBACK_ICON;
    if (ICON_CACHE.has(domain)) return ICON_CACHE.get(domain);

    const sources = [
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      `https://logo.clearbit.com/${domain}`,
      `https://api.faviconkit.com/${domain}/64`,
    ];

    for (const src of sources) {
      if (await testImageUrl(src, 3000)) { ICON_CACHE.set(domain, src); return src; }
    }
    ICON_CACHE.set(domain, LOCAL_FALLBACK_ICON);
    return LOCAL_FALLBACK_ICON;
  } catch (e) { return LOCAL_FALLBACK_ICON; }
}

/* ─────────────────────────────────────────────
   Quick Links
   ───────────────────────────────────────────── */
export function renderQuickLinks(links) {
  if (!quickLinksEl) return;
  quickLinksEl.innerHTML = '';

  (links || []).forEach(l => {
    const a = document.createElement('a');
    a.href   = l.url;
    a.target = '_blank';
    a.rel    = 'noopener noreferrer';
    a.className = 'link';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'link-icon-wrap';

    const icon = document.createElement('img');
    icon.className = 'link-icon';
    icon.alt       = l.title || '';
    icon.loading   = 'lazy';
    icon.src       = LOCAL_FALLBACK_ICON;

    const label = document.createElement('div');
    label.className   = 'link-label';
    label.textContent = l.title || l.url;

    iconWrap.appendChild(icon);
    a.appendChild(iconWrap);
    a.appendChild(label);
    quickLinksEl.appendChild(a);

    getBestIconForSite(l.url)
      .then(best => { if (best && icon.src !== best) icon.src = best; })
      .catch(() => { icon.src = LOCAL_FALLBACK_ICON; });
  });
}

/* ─────────────────────────────────────────────
   Overlay
   ───────────────────────────────────────────── */
export function applyOverlay(val) {
  if (!overlayEl) return;
  const v = val || 0.45;
  overlayEl.style.background =
    `linear-gradient(160deg, rgba(4,8,20,${(v * 0.6).toFixed(2)}) 0%, rgba(4,8,20,${v}) 60%, rgba(4,8,20,${Math.min(v + 0.15, 1).toFixed(2)}) 100%)`;
}

/* ─────────────────────────────────────────────
   Video preloader
   ───────────────────────────────────────────── */
function preloadVideo(src) {
  return new Promise((res, rej) => {
    if (!src) return rej(new Error('no-src'));
    const tv = document.createElement('video');
    tv.muted = true;
    tv.setAttribute('muted', 'muted');
    tv.playsInline = true;
    tv.preload = 'auto';
    tv.src = src;

    const cleanup = () => { try { tv.src = ''; tv.removeAttribute('src'); } catch (e) {} tv.load && tv.load(); };
    const onReady = () => { tv.removeEventListener('canplaythrough', onReady); tv.removeEventListener('canplay', onReady); tv.removeEventListener('error', onError); res(tv); };
    const onError = e => { tv.removeEventListener('canplaythrough', onReady); tv.removeEventListener('canplay', onReady); tv.removeEventListener('error', onError); cleanup(); rej(e || new Error('video-preload-error')); };

    tv.addEventListener('canplaythrough', onReady, { once: true });
    tv.addEventListener('canplay', onReady, { once: true });
    tv.addEventListener('error', onError, { once: true });
    setTimeout(() => { if (tv.readyState >= 3) onReady(); else onError(new Error('preload-timeout')); }, 7000);
  });
}

/* ─────────────────────────────────────────────
   Apply Background
   ───────────────────────────────────────────── */
export async function applyBackground(bg) {
  if (!bg) {
    state.current = null;
    if (bgVideo) bgVideo.classList.remove('visible');
    if (bgImage) bgImage.classList.remove('visible');
    return;
  }

  state.current = bg;
  if (currentBgNameEl) currentBgNameEl.textContent = bg.name || 'Background';
  applyOverlay(bg.overlay || 0.45);

  if (bg.type === 'video') {
    if (bgImage) bgImage.classList.remove('visible');
    try {
      await preloadVideo(bg.src);
      try { bgVideo && bgVideo.pause(); } catch (e) {}
      if (bgVideo) {
        bgVideo.src = bg.src;
        bgVideo.load();
        bgVideo.muted = true;
        bgVideo.setAttribute('muted', 'muted');
        const p = bgVideo.play();
        if (p !== undefined) {
          p.then(() => bgVideo.classList.add('visible')).catch(() => bgVideo.classList.add('visible'));
        } else {
          bgVideo.classList.add('visible');
        }
      }
    } catch (e) {
      try { bgVideo && bgVideo.pause(); } catch (err) {}
      if (bgVideo) { bgVideo.src = bg.src; bgVideo.load(); bgVideo.muted = true; bgVideo.classList.add('visible'); bgVideo.play().catch(() => {}); }
    }
  } else if (bg.type === 'image') {
    try { bgVideo && bgVideo.pause(); } catch (e) {}
    const img = new Image();
    img.src = bg.src;
    img.onload = () => {
      if (bgImage) { bgImage.src = bg.src; bgImage.classList.add('visible'); bgVideo && bgVideo.classList.remove('visible'); }
    };
  } else if (bg.type === 'color') {
    try { bgVideo && bgVideo.pause(); } catch (e) {}
    document.body.style.background = bg.color || '#060a14';
    bgVideo && bgVideo.classList.remove('visible');
    if (bgImage) bgImage.classList.remove('visible');
  }

  if (bg.id) {
    const idx = state.list.findIndex(x => x.id === bg.id);
    if (idx !== -1) state.index = idx;
  }
}

/* ─────────────────────────────────────────────
   Slideshow
   ───────────────────────────────────────────── */
export function startSlideshow() {
  if (state.slideshow.timerId) clearInterval(state.slideshow.timerId);
  if (!state.slideshow.enabled) return;
  state.slideshow.timerId = setInterval(() => {
    if (!state.list || state.list.length === 0) return;
    state.index = (state.index + 1) % state.list.length;
    applyBackground(state.list[state.index]);
  }, Math.max(3000, (state.slideshow.interval || 8) * 1000));
}

export function stopSlideshow() {
  if (state.slideshow.timerId) { clearInterval(state.slideshow.timerId); state.slideshow.timerId = null; }
}