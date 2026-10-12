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

    try {
      const response = await fetch('/api/concerns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (response.ok) {
        event.target.reset();
        await showResidentModal(`Submitted successfully. Tracking number: ${data.trackingNumber}`);
      } else {
        await showResidentModal(data.message || 'Unable to submit concern.');
      }
    } catch (error) {
      console.error('Unable to submit concern.', error);
      await showResidentModal('Unable to connect to the server. Please try again.');
    }
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
