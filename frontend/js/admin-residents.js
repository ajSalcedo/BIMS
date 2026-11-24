const table = document.getElementById("residentTable");
const details = document.getElementById("residentDetails");
const householdDetails = document.getElementById("householdDetails");

async function loadResidents(query = "") {
  const response = await fetch(`/api/residents?q=${encodeURIComponent(query)}`);

  if (response.status === 401) {
    window.location.href = "/admin/login.html";
    return;
  }

  const data = await response.json();

  table.innerHTML = data.residents.map(r => `
    <tr data-id="${r.resident_id}">
      <td>${escapeHtml(r.full_name)}</td>
      <td>${escapeHtml(r.address)}</td>
      <td>${escapeHtml(r.contact_number || "-")}</td>
    </tr>
  `).join("") || `<tr><td colspan="3">No residents found.</td></tr>`;

  table.querySelectorAll("tr[data-id]").forEach(row => {
    row.addEventListener("click", () => loadResident(row.dataset.id));
  });
}

async function loadResident(id) {
  const response = await fetch(`/api/residents/${id}`);

  if (!response.ok) {
    details.innerHTML = "<h2>Resident Details</h2><p>Unable to load resident.</p>";
    return;
  }

  const data = await response.json();
  const p = data.resident;

  details.innerHTML = `
    <h2>${escapeHtml(fullName(p))}</h2>
    <p class="muted">Resident ID: ${p.resident_id}</p>
    <div class="info-grid">
      ${info("Birth Date", p.birth_date)}
      ${info("Sex", p.sex)}
      ${info("Civil Status", p.civil_status)}
      ${info("Citizenship", p.citizenship)}
      ${info("Address", p.address)}
      ${info("Region", p.permanent_region)}
      ${info("Province", p.permanent_province)}
      ${info("City / Municipality", p.permanent_city_municipality)}
      ${info("Barangay", p.permanent_barangay)}
      ${info("Purok / Sitio / Zone", p.permanent_purok || p.purok)}
      ${info("Street", p.permanent_street)}
      ${info("House Number", p.permanent_house_number)}
      ${info("ZIP Code", p.permanent_zip_code)}
      ${info("Present Address", p.present_address_same_as_permanent ? "Same as permanent address" : formatPresentAddress(p))}
      ${info("Contact", p.contact_number)}
      ${info("Email", p.email)}
      ${info("Preferred Notification", p.preferred_notification)}
      ${info("Years of Residency", p.years_of_residency)}
      ${info("Landmark", p.landmark)}
      ${info("Previous Address", p.previous_address)}
      ${info("Household Reference", p.household_reference_number || p.household_number)}
      ${info("Reported Household Size", p.reported_household_size)}
      ${info("Relationship to Household Head", p.relationship_to_head)}
      ${info("Proof of Residency", p.proof_document_type)}
      ${p.proof_document_type ? `<div class="info-item"><small>Proof document</small><a href="/api/residents/${p.resident_id}/proof-of-residency">Download proof of residency</a></div>` : ""}
      ${info("Occupation", p.occupation)}
      ${info("Voter Status", p.voter_status)}
      ${info("Status", p.status)}
    </div>
    <div class="detail-actions">
      <button onclick="showEditForm(${p.resident_id})">Edit Information</button>
    </div>
    <div id="editArea"></div>
  `;

  if (data.household) {
    householdDetails.innerHTML = `
      <h2>Household Information</h2>
      <div class="info-grid">
        ${info("Household Number", data.household.household_number)}
        ${info("Address", data.household.household_address)}
        ${info("Purok", data.household.purok)}
        ${info("Status", data.household.status)}
      </div>
      <h3>Household Members (${data.members.length})</h3>
      <ul>${data.members.map(m => `<li>${escapeHtml(m.full_name)} — ${escapeHtml(m.relationship_to_head || "Member")}</li>`).join("")}</ul>
    `;
  } else {
    householdDetails.innerHTML = "<h2>Household Information</h2><p class='muted'>No household linked.</p>";
  }
}

async function showEditForm(id) {
  const response = await fetch(`/api/residents/${id}`);
  const { resident: p } = await response.json();
  const editArea = document.getElementById("editArea");

  editArea.innerHTML = `
    <form class="edit-form" id="editResidentForm">
      ${editInput("first_name", "First Name", p.first_name)}
      ${editInput("middle_name", "Middle Name", p.middle_name)}
      ${editInput("last_name", "Last Name", p.last_name)}
      ${editInput("suffix", "Suffix", p.suffix)}
      ${editInput("birth_date", "Birth Date", p.birth_date, "date")}
      ${editInput("citizenship", "Citizenship", p.citizenship)}
      ${editInput("permanent_region", "Region", p.permanent_region)}
      ${editInput("permanent_province", "Province", p.permanent_province)}
      ${editInput("permanent_city_municipality", "City / Municipality", p.permanent_city_municipality)}
      ${editInput("permanent_barangay", "Barangay", p.permanent_barangay)}
      ${editInput("permanent_purok", "Purok / Sitio / Zone", p.permanent_purok || p.purok)}
      ${editInput("permanent_street", "Street", p.permanent_street)}
      ${editInput("permanent_house_number", "House Number", p.permanent_house_number)}
      ${editInput("permanent_zip_code", "ZIP Code", p.permanent_zip_code)}
      ${editInput("contact_number", "Contact Number", p.contact_number)}
      ${editInput("preferred_notification", "Preferred Notification", p.preferred_notification)}
      ${editInput("years_of_residency", "Years of Residency", p.years_of_residency, "number")}
      ${editInput("landmark", "Landmark", p.landmark)}
      ${editInput("previous_address", "Previous Address", p.previous_address)}
      ${editInput("household_reference_number", "Household Reference Number", p.household_reference_number)}
      ${editInput("reported_household_size", "Household Size", p.reported_household_size, "number")}
      ${editInput("relationship_to_head", "Relationship to Household Head", p.relationship_to_head)}
      ${editInput("occupation", "Occupation", p.occupation)}
      ${editInput("employment_status", "Employment Status", p.employment_status)}
      ${editInput("educational_attainment", "Educational Attainment", p.educational_attainment)}
      ${editInput("emergency_contact", "Emergency Contact", p.emergency_contact)}
      ${editInput("emergency_contact_number", "Emergency Contact Number", p.emergency_contact_number)}
      <div><button class="button" type="submit">Save Changes</button></div>
      <p id="editMessage" class="form-message"></p>
    </form>
  `;

  document.getElementById("editResidentForm").addEventListener("submit", async e => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());

    const result = await fetch(`/api/residents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await result.json();
    document.getElementById("editMessage").textContent = data.message || "Saved.";

    if (result.ok) {
      setTimeout(() => loadResident(id), 400);
    }
  });
}

function editInput(name, label, value, type = "text") {
  return `<label>${label}<input name="${name}" type="${type}" value="${escapeAttr(value || "")}"></label>`;
}
function info(label, value) {
  return `<div class="info-item"><small>${label}</small>${escapeHtml(value || "-")}</div>`;
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
function escapeAttr(value) {
  return escapeHtml(value);
}

document.getElementById("searchButton").addEventListener("click", () => {
  loadResidents(document.getElementById("searchInput").value);
});
document.getElementById("searchInput").addEventListener("keydown", e => {
  if (e.key === "Enter") loadResidents(e.target.value);
});
document.getElementById("logoutButton").addEventListener("click", async () => {
  await fetch("/api/admin-auth/logout", { method: "POST" });
  window.location.replace("/");
});

loadResidents();
