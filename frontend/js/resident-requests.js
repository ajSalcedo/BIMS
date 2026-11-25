const list = document.getElementById('requestList');
const detail = document.getElementById('requestDetail');
const detailContent = document.getElementById('requestDetailContent');

function money(value) {
  return `₱${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function showDetails() {
  if (detail && !detail.open) {
    detail.showModal();
  }
}

function render(rows) {
  if (!list) {
    return;
  }

  list.innerHTML = rows.length
    ? rows
        .map((request) => {
          const status = String(request.status || '');
          return `
            <button class="request-item" data-tracking-number="${escapeHtml(request.tracking_number)}">
              <span>
                <b>${escapeHtml(request.tracking_number)}</b>
                <small>${escapeHtml(request.service_type)} • ${escapeHtml(new Date(request.submitted_at).toLocaleString())}</small>
              </span>
              <strong class="status status-${escapeHtml(status.replaceAll(' ', '-').toLowerCase())}">${escapeHtml(status)}</strong>
            </button>
          `;
        })
        .join('')
    : '<p>No requests yet.</p>';

  document.querySelectorAll('.request-item').forEach((button) => {
    button.onclick = () => loadDetail(button.dataset.trackingNumber);
  });
}

async function load() {
  const response = await fetch('/api/requests/mine');

  if (response.status === 401) {
    return (location.href = '/resident/login.html');
  }

  const data = await response.json();
  render(data.requests || []);
}

async function loadDetail(trackingNumber) {
  try {
    const response = await fetch(`/api/requests/mine/${encodeURIComponent(trackingNumber)}`);
    if (response.status === 401) {
      return (location.href = '/resident/login.html');
    }

    const data = await response.json();
    if (!detail || !detailContent) {
      return;
    }

    if (!response.ok || !data || !data.request) {
      detailContent.innerHTML = `<p>${escapeHtml(data && data.message || 'Unable to load this request.')}</p>`;
      showDetails();
      return;
    }

    detailContent.innerHTML = `
      <h3>${escapeHtml(data.request.tracking_number)}</h3>
      <div class="info-grid">
        <div class="info-item"><small>Document</small>${escapeHtml(data.request.service_type)}</div>
        <div class="info-item"><small>Status</small>${escapeHtml(data.request.status)}</div>
        <div class="info-item"><small>Purpose</small>${escapeHtml(data.request.purpose)}</div>
        <div class="info-item"><small>Fee</small>${escapeHtml(money(data.request.fee))}</div>
        <div class="info-item"><small>Payment</small>${escapeHtml(data.request.payment_status)}</div>
        <div class="info-item"><small>Submitted</small>${escapeHtml(new Date(data.request.submitted_at).toLocaleString())}</div>
      </div>
      <h4>Status History</h4>
      <div class="request-history">
        ${(Array.isArray(data.history) ? data.history : [])
          .map(historyItem => `
            <div class="request-history-item">
              <b>${escapeHtml(historyItem.status)}</b>
              <span>${escapeHtml(historyItem.remarks)}</span>
              <small>${escapeHtml(new Date(historyItem.changed_at).toLocaleString())}</small>
            </div>
          `)
          .join('')}
      </div>
    `;
    showDetails();
  } catch (error) {
    console.error('Unable to load request details.', error);
    if (detailContent) {
      detailContent.innerHTML = '<p>Unable to load this request. Please try again.</p>';
      showDetails();
    }
  }
}

const searchButton = document.getElementById('searchButton');
if (searchButton) {
  searchButton.onclick = async () => {
    const trackingSearch = document.getElementById('trackingSearch');
    const trackingNumber = trackingSearch ? trackingSearch.value.trim() : '';

    if (!trackingNumber) {
      return load();
    }

    await loadDetail(trackingNumber);
  };
}

const closeDetailButton = document.getElementById('closeRequestDetail');
if (closeDetailButton && detail) {
  closeDetailButton.addEventListener('click', () => detail.close());
  detail.addEventListener('click', event => {
    if (event.target === detail) detail.close();
  });
}

const logoutButton = document.getElementById('logoutButton');
if (logoutButton) {
  logoutButton.onclick = async () => {
    const response = await fetch('/api/resident-auth/logout', { method: 'POST' });
    if (!response.ok) throw new Error('Unable to log out.');
    location.replace('/');
  };
}

load();
