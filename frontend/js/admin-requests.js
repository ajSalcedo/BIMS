let allRequests = [];
const table = document.getElementById('requestTable');
const detail = document.getElementById('detail');

function render() {
  const searchInput = document.getElementById('search');
  const statusFilter = document.getElementById('statusFilter');

  if (!searchInput || !statusFilter || !table) {
    return;
  }

  const query = searchInput.value.toLowerCase();
  const filter = statusFilter.value;

  const rows = allRequests.filter((request) => {
    const matchesFilter = !filter || request.status === filter;
    const matchesQuery =
      !query ||
      request.tracking_number.toLowerCase().includes(query) ||
      request.resident_name.toLowerCase().includes(query);

    return matchesFilter && matchesQuery;
  });

  table.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Tracking No.</th>
          <th>Resident</th>
          <th>Service</th>
          <th>Status</th>
          <th>Submitted</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (request) => `
              <tr data-id="${request.request_id}">
                <td>${request.tracking_number}</td>
                <td>${request.resident_name}</td>
                <td>${request.service_type}</td>
                <td>${request.status}</td>
                <td>${new Date(request.submitted_at).toLocaleDateString()}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;

  document.querySelectorAll('#requestTable tr[data-id]').forEach((row) => {
    row.onclick = () => loadDetail(row.dataset.id);
  });
}

async function load() {
  const response = await fetch('/api/requests/admin');

  if (response.status === 401) {
    return (location.href = '/admin/login.html');
  }

  const data = await response.json();
  allRequests = data.requests;
  render();
}

async function loadDetail(id) {
  const response = await fetch(`/api/requests/admin/${id}`);
  const data = await response.json();

  if (!response.ok || !data || !data.request) {
    return;
  }

  const request = data.request;

  detail.innerHTML = `
    <h2>${request.tracking_number}</h2>
    <div class="info-grid">
      <div class="info-item"><small>Resident</small>${request.resident_name}</div>
      <div class="info-item"><small>Contact</small>${request.contact_number || '—'}</div>
      <div class="info-item"><small>Address</small>${request.address}</div>
      <div class="info-item"><small>Service</small>${request.service_type}</div>
      <div class="info-item"><small>Purpose</small>${request.purpose}</div>
      <div class="info-item"><small>Copies / Fee</small>${request.copies} / ₱${Number(request.fee).toFixed(2)}</div>
      <div class="info-item"><small>Payment</small>${request.payment_status} (${request.payment_method})</div>
      <div class="info-item"><small>Submitted</small>${new Date(request.submitted_at).toLocaleString()}</div>
    </div>
    <form id="updateForm" class="request-update-form">
      <label>
        Status
        <select id="newStatus">
          ${['Pending', 'Processing', 'Ready for Pickup', 'Completed', 'Rejected', 'Cancelled']
            .map((status) => `<option ${status === request.status ? 'selected' : ''}>${status}</option>`)
            .join('')}
        </select>
      </label>
      <label>
        Payment Status
        <select id="paymentStatus">
          <option ${request.payment_status === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
          <option ${request.payment_status === 'Paid' ? 'selected' : ''}>Paid</option>
          <option ${request.payment_status === 'Not Required' ? 'selected' : ''}>Not Required</option>
        </select>
      </label>
      <label>
        Remarks
        <textarea id="remarks" rows="4">${request.remarks || ''}</textarea>
      </label>
      <button class="button" type="submit">Update Request</button>
    </form>
    <h3>Status History</h3>
    <div class="timeline">
      ${data.history
        .map(
          (historyItem) => `
            <div>
              <b>${historyItem.status}</b>
              <span>${historyItem.remarks || ''}</span>
              <small>${new Date(historyItem.changed_at).toLocaleString()} ${historyItem.changed_by_name ? '— ' + historyItem.changed_by_name : ''}</small>
            </div>
          `
        )
        .join('')}
    </div>
  `;

  const updateForm = document.getElementById('updateForm');
  updateForm.onsubmit = async (event) => {
    event.preventDefault();

    const statusField = document.getElementById('newStatus');
    const paymentStatusField = document.getElementById('paymentStatus');
    const remarksField = document.getElementById('remarks');

    const responseUpdate = await fetch(`/api/requests/admin/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: statusField.value,
        paymentStatus: paymentStatusField.value,
        remarks: remarksField.value
      })
    });

    const result = await responseUpdate.json();
    alert(result.message);

    if (responseUpdate.ok) {
      await load();
      await loadDetail(id);
    }
  };
}

const searchInput = document.getElementById('search');
if (searchInput) {
  searchInput.oninput = render;
}

const statusFilter = document.getElementById('statusFilter');
if (statusFilter) {
  statusFilter.onchange = render;
}

const logoutButton = document.getElementById('logoutButton');
if (logoutButton) {
  logoutButton.onclick = async () => {
    await fetch('/api/admin-auth/logout', { method: 'POST' });
    location.href = '/admin/login.html';
  };
}

load();
