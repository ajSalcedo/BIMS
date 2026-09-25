async function loadProfile() {
  const [profileResponse, householdResponse] = await Promise.all([
    fetch("/api/residents/me/profile"),
    fetch("/api/residents/me/household")
  ]);

  if (profileResponse.status === 401) {
    window.location.href = "/resident/login.html";
    return;
  }

  const { profile: p } = await profileResponse.json();
  const { household, members } = await householdResponse.json();

  const fields = [
    ["Resident ID", p.resident_id],
    ["Full Name", fullName(p)],
    ["Birth Date", p.birth_date],
    ["Sex", p.sex],
    ["Civil Status", p.civil_status],
    ["Place of Birth", p.place_of_birth],
    ["Nationality", p.nationality],
    ["Religion", p.religion],
    ["Address", p.address],
    ["Purok", p.purok],
    ["Contact Number", p.contact_number],
    ["Employment Status", p.employment_status],
    ["Occupation", p.occupation],
    ["Educational Attainment", p.educational_attainment],
    ["Voter Status", p.voter_status]
  ];

  document.getElementById("profileDetails").innerHTML = `<div class="info-grid">${
    fields.map(([label, value]) =>
      `<div class="info-item"><small>${label}</small>${escapeHtml(value || "-")}</div>`
    ).join("")
  }</div>`;

  if (!household) {
    document.getElementById("householdDetails").innerHTML =
      `<p class="muted">No household record is currently linked to your profile.</p>`;
    return;
  }

  document.getElementById("householdDetails").innerHTML = `
    <div class="info-grid">
      <div class="info-item"><small>Household Number</small>${escapeHtml(household.household_number)}</div>
      <div class="info-item"><small>Address</small>${escapeHtml(household.household_address)}</div>
      <div class="info-item"><small>Purok</small>${escapeHtml(household.purok)}</div>
      <div class="info-item"><small>Members</small>${members.length}</div>
    </div>
    <h3>Household Members</h3>
    <ul class="member-list">${
      members.map(m => `<li>${escapeHtml(fullName(m))} — ${escapeHtml(m.relationship_to_head || "Member")}</li>`).join("")
    }</ul>`;
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
loadProfile();
