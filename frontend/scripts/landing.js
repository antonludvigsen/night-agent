// Landing page: live data-flow visual, scroll reveals and nav state.
// All text is set with textContent (no innerHTML from data), as in the dashboard.
document.documentElement.classList.add('js');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, reduceMotion ? 0 : ms));

// Example scenarios built on the seed data for the fictional Hotel CBS.
// Numbers are masked examples; the AI output follows the JSON contract in services/ai.js,
// and a needs_human reply sends the worker's fixed fallback text instead of the AI answer.
const FALLBACK =
  'Tak for din besked. En medarbejder vender tilbage hurtigst muligt. / Thank you for your message. A member of staff will get back to you as soon as possible.';

const SCENARIOS = [
  {
    channel: 'sms',
    from: '+4531••••40',
    to: '+4593709060',
    body: 'Hej, vores fly er forsinket, og vi lander først kl. 01. Kan vi stadig checke ind?',
    kb: 'late_arrival, reception_hours',
    answer: 'Hej! Ja. Ankommer I efter kl. 22, checker I ind med nøgleboksen ved hovedindgangen. Koden sendes på SMS på ankomstdagen til nummeret på bookingen.',
    needsHuman: false,
    reason: 'Late arrival is covered by approved knowledge',
  },
  {
    channel: 'whatsapp',
    from: 'whatsapp:+4471••••09',
    to: 'whatsapp:+14155238886',
    body: 'Hi! Is there parking at the hotel, and how do I open the gate at night?',
    kb: 'parking',
    answer: 'Yes, parking is available in the courtyard for DKK 200 per day. The gate opens with the same code as the key box.',
    needsHuman: false,
    reason: 'Parking and gate code are in approved knowledge',
  },
  {
    channel: 'sms',
    from: '+4522••••18',
    to: '+4593709060',
    body: 'Nøgleboksen virker ikke, og vi står udenfor med to små børn.',
    kb: 'late_arrival, night_bell',
    answer: 'Brug natklokken ved hovedindgangen. Den forbinder dig til den vagthavende medarbejder.',
    needsHuman: true,
    reason: 'Urgent: guest is locked out, staff must follow up',
  },
];

const hex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
const b64 = (n) => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(n))));

const steps = [...document.querySelectorAll('#steps li')];
const statuses = Object.fromEntries([...document.querySelectorAll('#o-status .st')].map((s) => [s.dataset.st, s]));
const tabs = [...document.querySelectorAll('#scenarios button')];
let run = 0; // increases on every new run, so an old run stops when a new one starts
let current = 0;
let started = false; // true once the first example has been shown

// Renders the AI's JSON with colour spans (built as DOM nodes, not HTML strings).
function renderJson(target, data) {
  target.textContent = '';
  const add = (text, cls) => {
    const node = cls ? document.createElement('span') : document.createTextNode(text);
    if (cls) { node.className = cls; node.textContent = text; }
    target.appendChild(node);
  };
  add('{\n  ');
  add('"answer"', 'k'); add(': '); add(JSON.stringify(data.answer), 's'); add(',\n  ');
  add('"needs_human"', 'k'); add(': '); add(String(data.needs_human), data.needs_human ? 't' : 'f'); add(',\n  ');
  add('"reason"', 'k'); add(': '); add(JSON.stringify(data.reason), 's'); add('\n}');
}

function reset(s) {
  const wa = s.channel === 'whatsapp';
  for (const id of ['f-chan', 'o-chan']) {
    $(id).textContent = wa ? 'WhatsApp' : 'SMS';
    $(id).classList.toggle('wa', wa);
  }
  $('f-from').textContent = s.from;
  $('f-to').textContent = s.to;
  $('f-body').textContent = '';
  $('f-sid').textContent = '';
  $('f-sig').textContent = '';
  $('f-ack').textContent = 'Venter på besked';
  $('s-kb').textContent = 'hotel_info';
  $('core-sub').textContent = 'Klar';
  $('core').classList.remove('busy');
  steps.forEach((li) => li.classList.remove('active', 'done', 'warn'));
  $('o-json').textContent = '// venter på svar fra AI API';
  $('o-json').classList.add('dim');
  const bubble = $('o-bubble');
  bubble.textContent = '';
  bubble.classList.remove('show');
  bubble.classList.toggle('wa', wa);
  Object.values(statuses).forEach((st) => st.classList.remove('on'));
  statuses.human.hidden = !s.needsHuman;
  statuses.mail.hidden = !s.needsHuman;
  statuses.delivered.hidden = false;
  document.querySelectorAll('.wire i').forEach((dot) => dot.getAnimations().forEach((a) => a.cancel()));
}

// Sends five dots once along a wire, from start to end, and resolves when the last one
// has arrived. Horizontal on wide screens, vertical when the cards are stacked.
function pulse(wire) {
  if (reduceMotion) return Promise.resolve();
  const vertical = wire.offsetHeight > wire.offsetWidth;
  const prop = vertical ? 'top' : 'left';
  const dots = [...wire.querySelectorAll('i')];
  const runs = dots.map((dot, i) => dot.animate([
    { [prop]: '0px', opacity: 0, offset: 0 },
    { opacity: 1, offset: 0.18 },
    { opacity: 1, offset: 0.82 },
    { [prop]: 'calc(100% - 10px)', opacity: 0, offset: 1 },
  ], { duration: 1100, delay: i * 160, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'none' }).finished.catch(() => {}));
  return Promise.all(runs);
}

async function play(index) {
  const id = ++run;
  const alive = () => id === run;
  const s = SCENARIOS[index];
  current = index;
  tabs.forEach((t, i) => { t.classList.toggle('active', i === index); t.setAttribute('aria-selected', String(i === index)); });
  // Fade the previous example out before clearing it, then fade the new one in.
  const flowEl = document.querySelector('.flow');
  if (started) {
    flowEl.classList.add('fading');
    await sleep(450);
    if (!alive()) return;
  }
  started = true;
  reset(s);
  flowEl.classList.remove('fading');
  await sleep(500);

  // 1. The guest types; Twilio posts the webhook.
  const body = $('f-body');
  body.classList.add('caret');
  if (reduceMotion) {
    body.textContent = s.body;
  } else {
    for (const ch of s.body) {
      if (!alive()) return;
      body.textContent += ch;
      await sleep(ch === ' ' ? 18 : 26);
    }
  }
  body.classList.remove('caret');
  $('f-sid').textContent = `SM${hex(16)}`;
  $('f-sig').textContent = `${b64(20).slice(0, 27)}=`;
  if (!alive()) return;

  // 2. The webhook travels to the core; processing starts when it has arrived.
  await pulse($('w1'));
  if (!alive()) return;
  $('core').classList.add('busy');
  $('core-sub').textContent = 'Behandler besked';
  const stepDelay = { sig: 520, enc: 620, queue: 520, kb: 700, ai: 1500 };
  for (const li of steps) {
    if (!alive()) return;
    li.classList.add('active');
    if (li.dataset.step === 'kb') $('s-kb').textContent = s.kb;
    await sleep(stepDelay[li.dataset.step]);
    if (!alive()) return;
    li.classList.remove('active');
    li.classList.add('done');
    if (li.dataset.step === 'queue') $('f-ack').textContent = '200 OK, tom TwiML';
    if (li.dataset.step === 'ai' && s.needsHuman) li.classList.add('warn');
  }
  $('core').classList.remove('busy');
  $('core-sub').textContent = s.needsHuman ? 'Overdrager til personalet' : 'Svar klar';

  // 3. The reply travels to the output; then the AI's JSON, the message and its status callbacks.
  await pulse($('w2'));
  if (!alive()) return;
  renderJson($('o-json'), { answer: s.answer, needs_human: s.needsHuman, reason: s.reason });
  $('o-json').classList.remove('dim');
  $('o-json').classList.remove('enter');
  void $('o-json').offsetWidth; // restart the fade-in
  $('o-json').classList.add('enter');
  await sleep(900);
  if (!alive()) return;
  $('o-bubble').textContent = s.needsHuman ? FALLBACK : s.answer;
  $('o-bubble').classList.add('show');
  const sequence = s.needsHuman ? ['human', 'queued', 'sent', 'delivered', 'mail'] : ['queued', 'sent', 'delivered'];
  for (const st of sequence) {
    await sleep(600);
    if (!alive()) return;
    statuses[st].classList.add('on');
  }

  await sleep(4200);
  if (alive() && !reduceMotion) play((index + 1) % SCENARIOS.length);
}

tabs.forEach((tab) => tab.addEventListener('click', () => play(Number(tab.dataset.i))));

// Start the visual when it is on screen.
const flow = document.querySelector('.flow-wrap');
if (flow) {
  let started = false;
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting && !started) { started = true; obs.disconnect(); play(0); }
  }, { threshold: 0.2 }).observe(flow);
}

// Reveal sections as they scroll into view.
const revealer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) { entry.target.classList.add('in'); revealer.unobserve(entry.target); }
  }
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach((el) => revealer.observe(el));

// Statement: words light up as the paragraph scrolls through the viewport.
const statement = $('statement');
if (statement) {
  const words = statement.textContent.trim().split(/\s+/);
  statement.textContent = '';
  const spans = words.map((word, i) => {
    const span = document.createElement('span');
    span.className = 'w';
    span.textContent = word;
    statement.appendChild(span);
    if (i < words.length - 1) statement.appendChild(document.createTextNode(' '));
    return span;
  });
  // The whole text lights up at once when it is well inside the viewport, and dims again when it leaves.
  const light = () => {
    const rect = statement.getBoundingClientRect();
    const vh = window.innerHeight;
    const inView = rect.top < vh * 0.7 && rect.bottom > vh * 0.15;
    spans.forEach((span) => span.classList.toggle('lit', inView));
  };
  if (reduceMotion) spans.forEach((span) => span.classList.add('lit'));
  else { window.addEventListener('scroll', light, { passive: true }); light(); }
}

// Nav gets a stronger shadow once the page is scrolled.
const nav = $('site-nav');
const onScroll = () => nav && nav.classList.toggle('scrolled', window.scrollY > 24);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();
