// Hotel knowledge: read with GET, change with PUT (Exercise 1, 3).
// Each text is a card with title, description and an "Ændre" button that opens a dialog.
// Saving approves the text: the server stores a new SHA-256 fingerprint with it.
// Changing the title renames the text (the title is the key the AI sees).
const container = document.getElementById('hotel-info-list');
const dialog = document.getElementById('edit-dialog');
const form = document.getElementById('edit-form');
const titleInput = document.getElementById('edit-title');
const textInput = document.getElementById('edit-text');
const errorText = document.getElementById('edit-error');
const saveButton = document.getElementById('edit-save');
let editing = null; // the row being edited

// Seed keys are snake_case ("late_arrival"); show them as "Late arrival".
const titleOf = (key) => (/^[a-z0-9_]+$/.test(key)
  ? key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
  : key);

const render = (rows) => {
  container.replaceChildren();
  for (const row of rows) {
    const card = el('article', 'info-card');

    const header = el('div', 'info-header');
    header.append(
      el('strong', null, titleOf(row.key)),
      el('span', row.intact ? 'intact' : 'error', row.intact ? 'Uændret siden godkendelse' : 'Ændret uden om dashboardet'),
    );

    const meta = el('div', 'info-meta');
    meta.append(
      el('span', 'info-meta-label', 'Opdateret tidspunkt'),
      el('span', null, formatTime(row.updated_at)),
    );

    const button = el('button', null, 'Ændre');
    button.type = 'button';
    button.addEventListener('click', () => open(row));

    const footer = el('div', 'info-footer');
    footer.append(meta, button);

    card.append(header, el('p', 'info-text', row.text), footer);
    container.append(card);
  }
};

const open = (row) => {
  editing = row;
  titleInput.value = titleOf(row.key);
  textInput.value = row.text;
  errorText.hidden = true;
  saveButton.disabled = false;
  dialog.showModal();
  textInput.focus();
};

document.getElementById('edit-cancel').addEventListener('click', () => dialog.close());

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!editing) return;
  const title = titleInput.value.trim();
  // Only rename when the title was actually changed.
  const body = { text: textInput.value };
  if (title !== titleOf(editing.key)) body.title = title;

  saveButton.disabled = true;
  try {
    await api(`/api/hotel-info/${encodeURIComponent(editing.key)}`, { method: 'PUT', body });
    dialog.close();
    await load();
  } catch (err) {
    errorText.textContent = err.message === 'A text with that title already exists'
      ? 'Der findes allerede en tekst med den titel.'
      : 'Kunne ikke gemme. Tjek titel og beskrivelse.';
    errorText.hidden = false;
    saveButton.disabled = false;
  }
});

const load = async () => render(await api('/api/hotel-info'));

load().catch(console.error);
