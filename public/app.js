// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  currentPage: 'dashboard',
  tickets: [],
  currentFilter: '',
  searchQuery: '',
  searchTimer: null,
};

// ─── API Helpers ──────────────────────────────────────────────────────────────
const API = '/api';

async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigate(page, param = '') {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  state.currentPage = page;

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  const navBtn = document.querySelector(`[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');

  // Load page-specific data
  if (page === 'dashboard') loadDashboard();
  if (page === 'tickets') loadTickets();
  if (page === 'detail' && param) loadTicketDetail(param);
  if (page === 'create') {
    resetForm();
    clearAlerts();
  }

  window.scrollTo(0, 0);
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const stats = await apiFetch('/stats');
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-open').textContent = stats.open;
    document.getElementById('stat-inProgress').textContent = stats.inProgress;
    document.getElementById('stat-closed').textContent = stats.closed;

    const tickets = await apiFetch('/tickets');
    const container = document.getElementById('dashboard-tickets');
    if (tickets.length === 0) {
      container.innerHTML = emptyState('No tickets yet', 'Create your first support ticket to get started.');
    } else {
      container.innerHTML = tickets.slice(0, 8).map(renderTicketRow).join('');
    }
  } catch (err) {
    console.error(err);
  }
}

// ─── Ticket List ──────────────────────────────────────────────────────────────
async function loadTickets() {
  const container = document.getElementById('tickets-list');
  const countEl = document.getElementById('tickets-count');
  container.innerHTML = `<div class="loading">Loading tickets…</div>`;

  try {
    const params = new URLSearchParams();
    if (state.currentFilter) params.set('status', state.currentFilter);
    if (state.searchQuery) params.set('search', state.searchQuery);

    const tickets = await apiFetch(`/tickets?${params.toString()}`);
    state.tickets = tickets;

    countEl.textContent = `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`;
    if (tickets.length === 0) {
      container.innerHTML = emptyState('No tickets found', 'Try adjusting your search or filter.');
    } else {
      container.innerHTML = tickets.map(renderTicketRow).join('');
    }
  } catch (err) {
    container.innerHTML = `<div class="loading">Failed to load tickets.</div>`;
  }
}

function renderTicketRow(ticket) {
  const badge = statusBadge(ticket.status);
  const priority = priorityBadge(ticket.priority);
  const date = formatDate(ticket.created_at);
  return `
    <div class="ticket-row" onclick="navigate('detail', '${ticket.ticket_id}')">
      <span class="ticket-id">${ticket.ticket_id}</span>
      <span class="ticket-name">${escHtml(ticket.customer_name)}</span>
      <span class="ticket-subject">${escHtml(ticket.subject)}</span>
      <span>${badge}</span>
      <span>${priority}</span>
      <span class="ticket-date">${date}</span>
    </div>
  `;
}

// ─── Search & Filter ──────────────────────────────────────────────────────────
function handleSearch() {
  const val = document.getElementById('search-input').value;
  state.searchQuery = val;
  document.getElementById('clear-search').style.display = val ? 'block' : 'none';
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(loadTickets, 280);
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  state.searchQuery = '';
  document.getElementById('clear-search').style.display = 'none';
  loadTickets();
}

function setFilter(btn, status) {
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.currentFilter = status;
  loadTickets();
}

// ─── Create Ticket ────────────────────────────────────────────────────────────
async function submitTicket() {
  clearAlerts();
  const name = document.getElementById('f-name').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const subject = document.getElementById('f-subject').value.trim();
  const description = document.getElementById('f-description').value.trim();
  const priority = document.getElementById('f-priority').value;

  // Client-side validation
  let valid = true;
  ['f-name', 'f-email', 'f-subject', 'f-description'].forEach(id => {
    document.getElementById(id).classList.remove('error');
  });

  if (!name) { document.getElementById('f-name').classList.add('error'); valid = false; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('f-email').classList.add('error'); valid = false;
  }
  if (!subject) { document.getElementById('f-subject').classList.add('error'); valid = false; }
  if (!description) { document.getElementById('f-description').classList.add('error'); valid = false; }

  if (!valid) {
    showError('Please fill in all fields correctly.');
    return;
  }

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  try {
    const result = await apiFetch('/tickets', {
      method: 'POST',
      body: JSON.stringify({ customer_name: name, customer_email: email, subject, description, priority }),
    });

    showSuccess(`Ticket ${result.ticket_id} created successfully! Click to view it.`, result.ticket_id);
    resetForm();
  } catch (err) {
    showError(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Ticket';
  }
}

function resetForm() {
  ['f-name', 'f-email', 'f-subject', 'f-description'].forEach(id => {
    const el = document.getElementById(id);
    el.value = '';
    el.classList.remove('error');
  });
}

function clearAlerts() {
  document.getElementById('create-success').style.display = 'none';
  document.getElementById('create-error').style.display = 'none';
}

function showSuccess(msg, ticketId) {
  const el = document.getElementById('create-success');
  el.style.display = 'block';
  el.innerHTML = `✓ ${msg}${ticketId ? ` <a href="#" style="text-decoration:underline" onclick="navigate('detail','${ticketId}')">View ticket →</a>` : ''}`;
}

function showError(msg) {
  const el = document.getElementById('create-error');
  el.style.display = 'block';
  el.textContent = `✕ ${msg}`;
}

// ─── Ticket Detail ────────────────────────────────────────────────────────────
async function loadTicketDetail(ticketId) {
  const container = document.getElementById('ticket-detail-content');
  container.innerHTML = `<div class="loading">Loading ticket…</div>`;

  try {
    const ticket = await apiFetch(`/tickets/${ticketId}`);
    container.innerHTML = renderDetailView(ticket);
  } catch (err) {
    container.innerHTML = `<div class="loading">Ticket not found.</div>`;
  }
}

function renderDetailView(ticket) {
  const badge = statusBadge(ticket.status);
  const notes = ticket.notes || [];

  return `
    <div class="detail-card">
      <div class="detail-header">
  <div>
    <div class="detail-ticket-id">${ticket.ticket_id}</div>
    <div class="detail-subject">${escHtml(ticket.subject)}</div>
  </div>
  <div style="display:flex; gap:8px; align-items:center;">
    ${badge}
    ${priorityBadge(ticket.priority)}
  </div>
</div>
      <div class="detail-meta">
        <div class="meta-item">
          <div class="meta-label">Customer Name</div>
          <div class="meta-value">${escHtml(ticket.customer_name)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Customer Email</div>
          <div class="meta-value">${escHtml(ticket.customer_email)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Created</div>
          <div class="meta-value">${formatDateFull(ticket.created_at)}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Last Updated</div>
          <div class="meta-value">${formatDateFull(ticket.updated_at)}</div>
        </div>
      </div>
      <div class="section-title" style="margin-bottom:8px">Description</div>
      <div class="detail-description">${escHtml(ticket.description)}</div>
    </div>

    <div class="update-card">
      <div class="update-title">Update Ticket</div>
      <div id="update-alert"></div>
      <div class="update-row">
        <div>
          <div class="form-label" style="margin-bottom:6px">Status</div>
          <select class="status-select" id="detail-status">
            <option value="Open" ${ticket.status === 'Open' ? 'selected' : ''}>Open</option>
            <option value="In Progress" ${ticket.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Closed" ${ticket.status === 'Closed' ? 'selected' : ''}>Closed</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="updateTicket('${ticket.ticket_id}')">Save Changes</button>
      </div>
    </div>

    <div class="notes-card">
      <div class="section-title" style="margin-bottom:12px">Notes & Comments (${notes.length})</div>
      <div class="notes-list" id="notes-list">
        ${notes.length === 0 ? '<div style="color:var(--text-dim);font-size:13px">No notes yet.</div>' : notes.map(renderNote).join('')}
      </div>
      <div class="note-input-area">
        <textarea id="note-input" class="form-input form-textarea" placeholder="Add a note or internal comment…" rows="2"></textarea>
        <button class="btn btn-primary" onclick="addNote('${ticket.ticket_id}')">Add Note</button>
      </div>
    </div>
  `;
}

function renderNote(note) {
  return `
    <div class="note-item">
      <div class="note-text">${escHtml(note.note_text)}</div>
      <div class="note-time">${formatDateFull(note.created_at)}</div>
    </div>
  `;
}

async function updateTicket(ticketId) {
  const status = document.getElementById('detail-status').value;
  const alertEl = document.getElementById('update-alert');
  alertEl.innerHTML = '';

  try {
    await apiFetch(`/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    alertEl.innerHTML = `<div class="alert alert-success" style="margin-bottom:12px">✓ Status updated to "${status}"</div>`;
    setTimeout(() => { alertEl.innerHTML = ''; }, 3000);
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-error" style="margin-bottom:12px">✕ ${err.message}</div>`;
  }
}

async function addNote(ticketId) {
  const noteInput = document.getElementById('note-input');
  const note_text = noteInput.value.trim();
  if (!note_text) return;

  try {
    await apiFetch(`/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify({ note_text }),
    });

    // Reload the detail view to show the new note
    noteInput.value = '';
    loadTicketDetail(ticketId);
  } catch (err) {
    alert('Failed to add note: ' + err.message);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusBadge(status) {
  const cls = status === 'Open' ? 'badge-open' : status === 'In Progress' ? 'badge-progress' : 'badge-closed';
  return `<span class="badge ${cls}">${status}</span>`;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateFull(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function emptyState(title, sub) {
  return `
    <div class="empty-state">
      <span class="empty-icon">◻</span>
      <div class="empty-title">${title}</div>
      <div style="font-size:13px;color:var(--text-dim)">${sub}</div>
    </div>
  `;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  navigate('dashboard');
});

function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  document.getElementById('theme-btn').textContent = isLight ? '☽ Dark' : '☀ Light';
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// Remember theme on page load
if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light');
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('theme-btn').textContent = '☽ Dark';
  });
}

function priorityBadge(priority) {
  const cls = priority === 'High' ? 'badge-open' : priority === 'Low' ? 'badge-closed' : 'badge-progress';
  return `<span class="badge ${cls}">${priority || 'Medium'}</span>`;
}