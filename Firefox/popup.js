/**
 * popup.js — Extension popup: quote, clock, stats
 */

const QUOTES = [
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'In the middle of every difficulty lies opportunity.', author: 'Albert Einstein' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
  { text: 'The mind is everything. What you think you become.', author: 'Buddha' },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: 'Steve Jobs' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
];

function initPopup() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  const q = QUOTES[dayOfYear % QUOTES.length];

  const quoteEl = document.getElementById('popup-quote');
  if (quoteEl) quoteEl.textContent = `${q.text} — ${q.author}`;

  const dayEl = document.getElementById('stat-day');
  if (dayEl) dayEl.textContent = '#' + dayOfYear;

  try {
    const tasks = JSON.parse(localStorage.getItem('newtab_todo_tasks') || '[]');
    const done = tasks.filter(t => t.completed).length;
    const taskEl = document.getElementById('stat-tasks');
    if (taskEl) taskEl.textContent = done + '/' + tasks.length;
  } catch (e) {
    const taskEl = document.getElementById('stat-tasks');
    if (taskEl) taskEl.textContent = '0/0';
  }

  updateTime();
  setInterval(updateTime, 1000);
}

function updateTime() {
  const t = new Date();
  const el = document.getElementById('stat-time');
  if (el) el.textContent = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

document.addEventListener('DOMContentLoaded', initPopup);
