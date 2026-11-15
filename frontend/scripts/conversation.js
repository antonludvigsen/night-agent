// One conversation: messages, take over, hand back, close, delete and reply (Exercise 1, 3).
// Uses GET, PATCH, POST and DELETE against the API.
const id = new URLSearchParams(window.location.search).get('id');
const title = document.getElementById('conversation-title');
const meta = document.getElementById('conversation-meta');
const messagesBox = document.getElementById('messages');
const takeOverBtn = document.getElementById('take-over');
const handBackBtn = document.getElementById('hand-back');
const closeBtn = document.getElementById('close');
const deleteBtn = document.getElementById('delete');
const replyForm = document.getElementById('reply-form');
const errorBox = document.getElementById('conversation-error');
const POLL_INTERVAL_MS = 5000;
let renderedCount = -1;

const showError = (err) => {
  errorBox.textContent = err.message;
  errorBox.hidden = false;
};

const render = (conversation) => {
  title.textContent = `Samtale ${conversation.id}`;
  meta.replaceChildren(
    el('span', `badge status-${conversation.status}`, STATUS_LABELS[conversation.status]),
    el('span', 'channel', CHANNEL_LABELS[conversation.channel]),
    el('span', 'number', conversation.guest_number),
  );

  const closed = conversation.status === 'closed';
  takeOverBtn.hidden = closed || conversation.status === 'needs_human';
  handBackBtn.hidden = closed || conversation.status === 'ai';
  closeBtn.hidden = closed;
  replyForm.hidden = closed;

  // Only redraw the messages when something has changed, so the page does not jump while polling.
  const signature = conversation.messages.map((m) => `${m.id}:${m.delivery_status}`).join(',');
  if (signature === renderedCount) return;
  renderedCount = signature;

  messagesBox.replaceChildren();
  for (const message of conversation.messages) {
    const bubble = el('div', `message ${message.direction} author-${message.author}`);
    bubble.append(
      el('div', 'message-author', AUTHOR_LABELS[message.author]),
      el('div', 'message-body', message.body),
      el('div', 'message-meta', `${formatTime(message.created_at)} · ${message.delivery_status || ''}`),
    );
    messagesBox.append(bubble);
  }
  messagesBox.scrollTop = messagesBox.scrollHeight;
};

const load = async () => render(await api(`/api/conversations/${id}`));

const setStatus = async (status) => {
  errorBox.hidden = true;
  await api(`/api/conversations/${id}`, { method: 'PATCH', body: { status } });
  await load();
};

takeOverBtn.addEventListener('click', () => setStatus('needs_human').catch(showError));
handBackBtn.addEventListener('click', () => setStatus('ai').catch(showError));
closeBtn.addEventListener('click', () => setStatus('closed').catch(showError));

// Deleting needs two clicks, so a conversation is not removed by accident.
deleteBtn.addEventListener('click', async () => {
  if (deleteBtn.dataset.confirm !== 'yes') {
    deleteBtn.dataset.confirm = 'yes';
    deleteBtn.textContent = 'Bekræft sletning';
    return;
  }
  try {
    await api(`/api/conversations/${id}`, { method: 'DELETE' });
    window.location.href = '/conversations.html';
  } catch (err) {
    showError(err);
  }
});

replyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  const button = replyForm.querySelector('button');
  button.disabled = true;
  try {
    await api(`/api/conversations/${id}/messages`, { method: 'POST', body: { body: replyForm.body.value } });
    replyForm.reset();
    await load();
  } catch (err) {
    showError(err);
  } finally {
    button.disabled = false;
  }
});

load().catch(showError);
setInterval(() => load().catch(() => {}), POLL_INTERVAL_MS);
