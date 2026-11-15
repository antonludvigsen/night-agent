// Conversation list with fetch() and polling every few seconds (Exercise 1, 3).
// Status colours: green = ai, red = needs_human, grey = closed.
const list = document.getElementById('conversation-list');
const empty = document.getElementById('conversation-empty');
const filterButtons = document.querySelectorAll('.filters button');
const POLL_INTERVAL_MS = 5000;
let currentStatus = '';

const render = (conversations) => {
  list.replaceChildren();
  empty.hidden = conversations.length > 0;

  for (const conversation of conversations) {
    const item = el('li', `conversation status-${conversation.status}`);
    const link = el('a');
    link.href = `/conversation.html?id=${conversation.id}`;

    const top = el('div', 'conversation-top');
    top.append(
      el('span', 'badge', STATUS_LABELS[conversation.status]),
      el('span', 'channel', CHANNEL_LABELS[conversation.channel]),
      el('span', 'number', conversation.guest_number),
      el('span', 'time', formatTime(conversation.updated_at)),
    );
    link.append(top);

    if (conversation.last_message) {
      const { author, body } = conversation.last_message;
      link.append(el('p', 'preview', `${AUTHOR_LABELS[author]}: ${body}`));
    }
    item.append(link);
    list.append(item);
  }
};

const load = async () => {
  const query = currentStatus ? `?status=${currentStatus}` : '';
  render(await api(`/api/conversations${query}`));
};

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentStatus = button.dataset.status;
    filterButtons.forEach((other) => other.classList.toggle('active', other === button));
    load().catch(console.error);
  });
});

load().catch(console.error);
setInterval(() => load().catch(console.error), POLL_INTERVAL_MS);
