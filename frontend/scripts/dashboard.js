// Dashboard front page: key figures from the other pages (Exercise 1, 3).
// Uses the same JSON API as the other pages; nothing new on the server.
const POLL_INTERVAL_MS = 5000;
const set = (id, value) => { document.getElementById(id).textContent = value; };

const formatUptime = (seconds) => {
  const s = Math.floor(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} d ${h} t`;
  if (h > 0) return `${h} t ${m} min`;
  return `${m} min`;
};

// GET /health: round trip measured in the browser, processing time from X-Response-Time.
const measureHealth = async () => {
  const started = performance.now();
  const response = await fetch('/health', { cache: 'no-store' });
  const rtt = performance.now() - started;
  const data = await response.json();
  return { ok: response.ok && data.status === 'ok', rtt, server: response.headers.get('X-Response-Time'), ...data };
};

const loadHotel = async () => {
  const me = await api('/api/auth/me');
  set('hotel-name', me.hotel_name || 'Ukendt hotel');
};

const loadConversations = async () => {
  const conversations = await api('/api/conversations');
  const count = (status) => conversations.filter((c) => c.status === status).length;
  set('k-total', conversations.length);
  set('k-human', count('needs_human'));
  set('k-ai', count('ai'));
  set('k-closed', count('closed'));

  const waiting = conversations.filter((c) => c.status === 'needs_human');
  const list = document.getElementById('human-list');
  list.replaceChildren();
  document.getElementById('human-empty').hidden = waiting.length > 0;
  for (const conversation of waiting) {
    const item = el('li', `conversation status-${conversation.status}`);
    const link = el('a');
    link.href = `/conversation.html?id=${conversation.id}`;
    const top = el('div', 'conversation-top');
    top.append(
      el('span', 'badge', STATUS_LABELS[conversation.status]),
      el('span', 'channel', CHANNEL_LABELS[conversation.channel]),
    );
    link.append(top, el('span', 'number', conversation.guest_number));
    if (conversation.last_message) {
      const { author, body } = conversation.last_message;
      link.append(el('p', 'preview', `${AUTHOR_LABELS[author]}: ${body}`));
    }
    link.append(el('span', 'time', formatTime(conversation.updated_at)));
    item.append(link);
    list.append(item);
  }
};

const loadHotelInfo = async () => {
  const rows = await api('/api/hotel-info');
  const intact = rows.filter((row) => row.intact).length;
  set('k-info', rows.length);
  set('k-intact', intact);
  set('k-changed', rows.length - intact);
  document.getElementById('k-changed').classList.toggle('alert-num', rows.length - intact > 0);
  const latest = rows.map((row) => row.updated_at).sort().pop();
  set('k-latest', latest ? formatTime(latest) : '-');
};

const loadHealth = async () => {
  try {
    const health = await measureHealth();
    set('k-status', health.ok ? 'Online' : 'Fejl');
    set('k-rtt', `${Math.round(health.rtt)} ms`);
    set('k-server', health.server ? `${parseFloat(health.server).toFixed(1)} ms` : '-');
    set('k-uptime', formatUptime(health.uptime));
  } catch {
    set('k-status', 'Offline');
  }
};

const refresh = () => Promise.all([loadConversations(), loadHotelInfo(), loadHealth()]).catch(console.error);

loadHotel().catch(console.error);
refresh();
setInterval(refresh, POLL_INTERVAL_MS);
