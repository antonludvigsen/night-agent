// Shared by all dashboard pages (Exercise 1, 3).
// api(): fetch() against the JSON API. The login cookie is sent along automatically.
// A 401 means the token is missing, invalid or expired: go to the login page.
const api = async (path, options = {}) => {
  const response = await fetch(path, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (response.status === 401) {
    window.location.href = '/';
    throw new Error('Not logged in');
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((data && data.error) || `Request failed (${response.status})`);
  }
  return data;
};

// Timestamps are stored in UTC ("2026-11-15 11:29:00") and shown in local time.
const formatTime = (timestamp) =>
  new Date(`${timestamp.replace(' ', 'T')}Z`).toLocaleString('da-DK', { dateStyle: 'short', timeStyle: 'short' });

const STATUS_LABELS = { ai: 'Besvaret af AI', needs_human: 'Kræver menneske', closed: 'Lukket' };
const CHANNEL_LABELS = { sms: 'SMS', whatsapp: 'WhatsApp' };
const AUTHOR_LABELS = { guest: 'Gæst', ai: 'AI', staff: 'Personale' };

// Creates an element. Text is always set with textContent, never as HTML,
// so a guest message containing HTML is shown as plain text.
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const showUser = async () => {
  const userLabel = document.getElementById('user-label');
  if (!userLabel) return;
  const me = await api('/api/auth/me');
  userLabel.textContent = `${me.hotel_name} · ${me.email}`;
};

document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  window.location.href = '/';
});

showUser().catch(() => {});
