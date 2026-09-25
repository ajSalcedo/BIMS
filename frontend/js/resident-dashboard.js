async function loadDashboard() {
  const profileResponse = await fetch("/api/residents/me/profile");

  if (profileResponse.status === 401) {
    window.location.href = "/resident/login.html";
    return;
  }

  const data = await profileResponse.json();
  const p = data.profile;

  document.getElementById("welcomeUser").textContent = `Welcome, ${p.first_name}`;
  document.getElementById("profileSummary").innerHTML = `
    <div class="info-grid">
      <div class="info-item"><small>Full Name</small>${escapeHtml(fullName(p))}</div>
      <div class="info-item"><small>Address</small>${escapeHtml(p.address || "-")}</div>
      <div class="info-item"><small>Contact Number</small>${escapeHtml(p.contact_number || "-")}</div>
      <div class="info-item"><small>Resident ID</small>${p.resident_id}</div>
    </div>`;
}

function fullName(p) {
  return [p.first_name, p.middle_name, p.last_name, p.suffix].filter(Boolean).join(" ");
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}
document.getElementById("logoutButton").addEventListener("click", async () => {
  await fetch("/api/resident-auth/logout", { method: "POST" });
  window.location.href = "/";
});
loadDashboard();
