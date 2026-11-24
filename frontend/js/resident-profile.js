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
    ["Citizenship", p.citizenship],
    ["Sex", p.sex],
    ["Civil Status", p.civil_status],
    ["Permanent Address", p.address],
    ["Region", p.permanent_region],
    ["Province", p.permanent_province],
    ["City / Municipality", p.permanent_city_municipality],
    ["Barangay", p.permanent_barangay],
    ["Purok / Sitio / Zone", p.permanent_purok || p.purok],
    ["Street", p.permanent_street],
    ["House Number", p.permanent_house_number],
    ["ZIP Code", p.permanent_zip_code],
    ["Present Address", p.present_address_same_as_permanent ? "Same as permanent address" : formatPresentAddress(p)],
    ["Years of Residency", p.years_of_residency],
    ["Landmark", p.landmark],
    ["Previous Address", p.previous_address],
    ["Contact Number", p.contact_number],
    ["Email", p.email],
    ["Preferred Notification", p.preferred_notification],
    ["Household Reference", p.household_reference_number || p.household_number],
    ["Household Size", p.reported_household_size],
    ["Relationship to Household Head", p.relationship_to_head],
    ["Occupation", p.occupation],
    ["Proof of Residency", p.proof_document_type]
  ];

  document.getElementById("profileDetails").innerHTML = `<div class="info-grid">${
    fields.map(([label, value]) =>
      `<div class="info-item"><small>${label}</small>${escapeHtml(value === null || value === undefined || value === "" ? "-" : value)}</div>`
    ).join("")
  }${p.proof_document_type ? `<div class="info-item"><small>Proof document</small><a href="/api/resident-auth/me/proof-of-residency">Download proof of residency</a></div>` : ""}
  </div>`;

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
function formatPresentAddress(p) {
  return [
    p.present_house_number, p.present_street, p.present_purok, p.present_barangay,
    p.present_city_municipality, p.present_province, p.present_zip_code, p.present_region
  ].filter(Boolean).join(", ");
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}
document.getElementById("logoutButton").addEventListener("click", async () => {
  const response = await fetch("/api/resident-auth/logout", { method: "POST" });
  if (!response.ok) throw new Error("Unable to log out.");
  window.location.replace("/");
});
loadProfile();
