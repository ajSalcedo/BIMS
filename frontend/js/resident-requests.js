const list = document.getElementById('requestList');
const detail = document.getElementById('requestDetail');

function money(value) {
  return `₱${Number(value || 0).toFixed(2)}`;
}

function render(rows) {
  if (!list) {
    return;
  }

  list.innerHTML = rows.length
    ? rows
        .map(
          (request) => `
            <button class="request-item" data-id="${request.request_id}">
              <span>
                <b>${request.tracking_number}</b>
                <small>${request.service_type} • ${new Date(request.submitted_at).toLocaleString()}</small>
              </span>
              <strong class="status status-${request.status.replaceAll(' ', '-').toLowerCase()}">${request.status}</strong>
            </button>
          `
        )
        .join('')
    : '<p>No requests yet.</p>';

  document.querySelectorAll('.request-item').forEach((button) => {
    button.onclick = () => loadDetail(button.dataset.id);
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

async function loadDetail(id) {
  const response = await fetch(`/api/requests/mine/${id}`);
  const data = await response.json();

  if (!response.ok || !data || !data.request) {
    return;
  }

  if (!detail) {
    return;
  }

  detail.innerHTML = `
    <h3>${data.request.tracking_number}</h3>
    <div class="info-grid">
      <div class="info-item"><small>Document</small>${data.request.service_type}</div>
      <div class="info-item"><small>Status</small>${data.request.status}</div>
      <div class="info-item"><small>Purpose</small>${data.request.purpose}</div>
      <div class="info-item"><small>Fee</small>${money(data.request.fee)}</div>
      <div class="info-item"><small>Payment</small>${data.request.payment_status}</div>
      <div class="info-item"><small>Submitted</small>${new Date(data.request.submitted_at).toLocaleString()}</div>
    </div>
    <h4>Status History</h4>
    <div class="timeline">
      ${data.history
        .map(
          (historyItem) => `
            <div>
              <b>${historyItem.status}</b>
              <span>${historyItem.remarks || ''}</span>
              <small>${new Date(historyItem.changed_at).toLocaleString()}</small>
            </div>
          `
        )
        .join('')}
    </div>
  `;
}

const searchButton = document.getElementById('searchButton');
if (searchButton) {
  searchButton.onclick = async () => {
    const trackingSearch = document.getElementById('trackingSearch');
    const trackingNumber = trackingSearch ? trackingSearch.value.trim() : '';

    if (!trackingNumber) {
      return load();
    }

    const response = await fetch(`/api/requests/mine/${encodeURIComponent(trackingNumber)}`);
    const data = await response.json();

    if (!detail) {
      return;
    }

    detail.innerHTML = response.ok
      ? `
        <h3>${data.request.tracking_number}</h3>
        <p>${data.request.service_type} — <b>${data.request.status}</b></p>
        <p>${data.request.purpose}</p>
      `
      : `<p>${data.message}</p>`;
  };
}

const logoutButton = document.getElementById('logoutButton');
if (logoutButton) {
  logoutButton.onclick = async () => {
    await fetch('/api/resident-auth/logout', { method: 'POST' });
    location.href = '/';
  };
}

load();
