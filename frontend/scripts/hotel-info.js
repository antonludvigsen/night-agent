// Hotel knowledge: read with GET, save with PUT (Exercise 1, 3).
// Saving a text approves it; the server stores a SHA-256 fingerprint with it.
const container = document.getElementById('hotel-info-list');

const render = (rows) => {
  container.replaceChildren();
  for (const row of rows) {
    const card = el('form', 'info-card');
    const header = el('div', 'info-header');
    header.append(
      el('strong', null, row.key),
      el('span', row.intact ? 'intact' : 'error', row.intact ? 'Uændret siden godkendelse' : 'Ændret uden om dashboardet'),
    );

    const textarea = el('textarea');
    textarea.value = row.text;
    textarea.maxLength = 1000;
    textarea.required = true;

    const footer = el('div', 'info-footer');
    const status = el('span', 'muted', `Godkendt af ${row.approved_by || 'ukendt'}, ${formatTime(row.updated_at)}`);
    const button = el('button', null, 'Gem og godkend');
    button.type = 'submit';
    footer.append(status, button);

    card.append(header, textarea, footer);
    card.addEventListener('submit', async (event) => {
      event.preventDefault();
      button.disabled = true;
      try {
        await api(`/api/hotel-info/${row.key}`, { method: 'PUT', body: { text: textarea.value } });
        await load();
      } catch (err) {
        status.textContent = err.message;
        status.className = 'error';
        button.disabled = false;
      }
    });
    container.append(card);
  }
};

const load = async () => render(await api('/api/hotel-info'));

load().catch(console.error);
