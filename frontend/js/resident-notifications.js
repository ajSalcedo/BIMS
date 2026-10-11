async function load() {
  const [requestRes, concernRes] = await Promise.all([
    fetch('/api/requests/notifications'),
    fetch('/api/concerns/notifications')
  ]);

  if (requestRes.status === 401 || concernRes.status === 401) {
    return (location.href = '/resident/login.html');
  }

  const requestData = await requestRes.json();
  const concernData = await concernRes.json();

  const items = [
    ...(requestData.notifications || []).map((n) => ({
      ...n,
      kind: 'Document Request',
      readUrl: `/api/requests/notifications/${n.notification_id}/read`
    })),
    ...(concernData.notifications || []).map((n) => ({
      ...n,
      kind: 'Community Concern',
      readUrl: `/api/concerns/notifications/${n.notification_id}/read`
    }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const notificationsEl = document.getElementById('notifications');
  if (!notificationsEl) {
    return;
  }

  notificationsEl.innerHTML = items.length
    ? items
        .map(
          (n, i) => `
            <article class="notification ${n.is_read ? 'read' : ''}">
              <b>${n.kind}: ${n.title}</b>
              <p>${n.message}</p>
              <small>${new Date(n.created_at).toLocaleString()}</small>
              ${!n.is_read ? `<button onclick="readNotification(${i})">Mark as read</button>` : ''}
            </article>
          `
        )
        .join('')
    : '<p>No notifications.</p>';

  window._notificationItems = items;
}

async function readNotification(i) {
  const notification = window._notificationItems?.[i];
  if (!notification) {
    return;
  }

  await fetch(notification.readUrl, { method: 'PATCH' });
  load();
}

const logoutButton = document.getElementById('logoutButton');
if (logoutButton) {
  logoutButton.onclick = async () => {
    await fetch('/api/resident-auth/logout', { method: 'POST' });
    location.href = '/';
  };
}

load();