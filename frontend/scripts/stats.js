// Operations page: live measurements of GET /health with fetch() (Exercise 1, 3, 7).
// Round trip time is measured in the browser; X-Response-Time is the server's own
// processing time. The pid shows which instance behind the load balancer answered.
const POLL_INTERVAL_MS = 5000;
const MAX_LOG = 9;
const log = [];
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

const renderLog = () => {
  const list = document.getElementById('s-log');
  list.replaceChildren();
  for (const entry of log) {
    const item = el('li', 'stat-card');
    item.append(
      el('span', 'kpi-label', entry.time),
      el('strong', 'kpi-value small', `${entry.rtt} ms`),
      el('span', 'muted', entry.ok ? `Instans ${entry.pid}, server ${entry.server}` : 'Ingen forbindelse'),
    );
    list.append(item);
  }
};

const measure = async () => {
  const time = new Date().toLocaleTimeString('da-DK');
  try {
    const started = performance.now();
    const response = await fetch('/health', { cache: 'no-store' });
    const rtt = Math.round(performance.now() - started);
    const data = await response.json();
    const server = response.headers.get('X-Response-Time');
    const serverMs = server ? `${parseFloat(server).toFixed(1)} ms` : '-';
    const ok = response.ok && data.status === 'ok';

    set('s-status', ok ? 'Online' : 'Fejl');
    set('s-pid', `Instans (pid) ${data.pid}`);
    set('s-rtt', `${rtt} ms`);
    set('s-server', `Serverens behandlingstid ${serverMs}`);
    set('s-uptime', formatUptime(data.uptime));
    log.unshift({ time, rtt, ok, pid: data.pid, server: serverMs });
  } catch {
    set('s-status', 'Offline');
    log.unshift({ time, rtt: '-', ok: false });
  }
  log.splice(MAX_LOG);
  renderLog();
};

measure();
setInterval(measure, POLL_INTERVAL_MS);
