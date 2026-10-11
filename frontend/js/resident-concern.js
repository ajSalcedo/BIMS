async function load() {
  const profileResponse = await fetch('/api/residents/me/profile');

  if (!profileResponse.ok) {
    return (location.href = '/resident/login.html');
  }

  const profileData = await profileResponse.json();
  const welcomeUser = document.getElementById('welcomeUser');

  if (welcomeUser) {
    welcomeUser.textContent =
      `${profileData.profile?.first_name || ''} ${profileData.profile?.last_name || ''}`.trim() || 'Resident';
  }

  const categoriesResponse = await fetch('/api/concerns/categories');
  const categoryData = await categoriesResponse.json();
  const categorySelect = document.getElementById('category');

  if (categorySelect) {
    categorySelect.innerHTML = (categoryData.categories || [])
      .map((category) => `<option>${category}</option>`)
      .join('');
  }
}

const concernForm = document.getElementById('concernForm');
if (concernForm) {
  concernForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const message = document.getElementById('message');
    if (message) {
      message.textContent = 'Submitting...';
    }

    const categoryField = document.getElementById('category');
    const subjectField = document.getElementById('subject');
    const descriptionField = document.getElementById('description');
    const locationField = document.getElementById('location');
    const urgencyField = document.getElementById('urgency');

    const body = {
      category: categoryField ? categoryField.value : '',
      subject: subjectField ? subjectField.value : '',
      description: descriptionField ? descriptionField.value : '',
      location: locationField ? locationField.value : '',
      urgency: urgencyField ? urgencyField.value : ''
    };

    const response = await fetch('/api/concerns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (message) {
      if (response.ok) {
        message.textContent = `Submitted successfully. Tracking number: ${data.trackingNumber}`;
        event.target.reset();
      } else {
        message.textContent = data.message || 'Unable to submit concern.';
      }
    }
  });
}

const logoutButton = document.getElementById('logoutButton');
if (logoutButton) {
  logoutButton.onclick = async () => {
    await fetch('/api/resident-auth/logout', { method: 'POST' });
    location.href = '/';
  };
}

load();
