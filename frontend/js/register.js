const form = document.getElementById("registerForm");
const steps = [...form.querySelectorAll(".registration-step")];
const progressItems = [...document.querySelectorAll(".registration-progress li")];
const presentAddressPairs = [
  ["permanentRegion", "presentRegion"],
  ["permanentProvince", "presentProvince"],
  ["permanentCityMunicipality", "presentCityMunicipality"],
  ["permanentBarangay", "presentBarangay"],
  ["permanentPurok", "presentPurok"],
  ["permanentStreet", "presentStreet"],
  ["permanentHouseNumber", "presentHouseNumber"],
  ["permanentZipCode", "presentZipCode"]
];
let activeStep = 0;

function showStep(index) {
  activeStep = index;
  steps.forEach((step, stepIndex) => {
    step.hidden = stepIndex !== index;
    if (stepIndex === index) step.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  progressItems.forEach((item, stepIndex) => {
    item.classList.toggle("active", stepIndex === index);
    if (stepIndex === index) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  if (index === steps.length - 1) renderReview();
}

function validateStep(index) {
  const controls = [...steps[index].querySelectorAll("input, select")];
  for (const control of controls) {
    if (!control.checkValidity()) {
      control.reportValidity();
      return false;
    }
  }

  if (index === 1 && !/^(?:09\d{9}|\+639\d{9})$/.test(
    form.elements.contactNumber.value.replace(/[\s()-]/g, "")
  )) {
    showResidentModal("Enter a valid Philippine mobile number, such as 09XXXXXXXXX.");
    form.elements.contactNumber.focus();
    return false;
  }

  if (index === 2 && !sameAddressCheckbox.checked) {
    const presentFields = presentAddressPairs.map(([, presentName]) => form.elements[presentName]);
    if (presentFields.some(field => field.value.trim()) &&
        presentAddressPairs.slice(0, 5).some(([, presentName]) => !form.elements[presentName].value.trim())) {
      showResidentModal("Complete the region, province, city/municipality, barangay, and purok for the present address.");
      return false;
    }
  }

  if (index === 4) {
    const password = form.elements.password.value;
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      showResidentModal("Password must be at least 10 characters and include letters and numbers.");
      form.elements.password.focus();
      return false;
    }
    if (password !== form.elements.confirmPassword.value) {
      showResidentModal("Passwords do not match.");
      form.elements.confirmPassword.focus();
      return false;
    }
  }

  return true;
}

form.querySelectorAll("[data-next]").forEach(button => {
  button.addEventListener("click", () => {
    if (validateStep(activeStep)) showStep(activeStep + 1);
  });
});

form.querySelectorAll("[data-previous]").forEach(button => {
  button.addEventListener("click", () => showStep(activeStep - 1));
});

form.elements.birthDate.addEventListener("input", () => {
  const birthDate = new Date(`${form.elements.birthDate.value}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const beforeBirthday = today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (beforeBirthday) age -= 1;
  document.getElementById("ageDisplay").textContent =
    form.elements.birthDate.value && !Number.isNaN(birthDate.getTime()) && age >= 0 ? age : "—";
});

const sameAddressCheckbox = form.elements.presentAddressSameAsPermanent;
function syncPresentAddress() {
  presentAddressPairs.forEach(([permanentName, presentName]) => {
    const permanentField = form.elements[permanentName];
    const presentField = form.elements[presentName];
    presentField.readOnly = sameAddressCheckbox.checked;
    if (sameAddressCheckbox.checked) presentField.value = permanentField.value;
  });
}

presentAddressPairs.forEach(([permanentName]) => {
  form.elements[permanentName].addEventListener("input", syncPresentAddress);
});
sameAddressCheckbox.addEventListener("change", syncPresentAddress);
syncPresentAddress();

function renderReview() {
  const labels = [
    ["First name", "firstName"], ["Middle name", "middleName"], ["Last name", "lastName"],
    ["Suffix", "suffix"], ["Date of birth", "birthDate"], ["Age", null],
    ["Sex", "sex"], ["Civil status", "civilStatus"], ["Citizenship", "citizenship"],
    ["Mobile number", "contactNumber"], ["Email", "email"],
    ["Preferred notification", "preferredNotification"],
    ["Permanent address", null], ["Present address", null],
    ["Years of residency", "yearsOfResidency"], ["Landmark", "landmark"],
    ["Previous address", "previousAddress"],
    ["Household reference", "householdReferenceNumber"],
    ["Relationship to household head", "relationshipToHead"],
    ["Household size", "householdSize"], ["Occupation", "occupation"],
    ["Proof document type", "proofDocumentType"], ["Proof file", "proofOfResidency"]
  ];
  const review = document.getElementById("registrationReview");
  review.replaceChildren();

  const list = document.createElement("dl");
  list.className = "registration-review-grid";
  labels.forEach(([label, name]) => {
    let value;
    if (label === "Age") {
      value = document.getElementById("ageDisplay").textContent;
    } else if (label === "Permanent address") {
      value = joinAddress("permanent");
    } else if (label === "Present address") {
      value = sameAddressCheckbox.checked ? joinAddress("permanent") : joinAddress("present");
    } else if (name === "proofOfResidency") {
      value = form.elements.proofOfResidency.files[0]?.name || "";
    } else {
      value = form.elements[name].value;
    }
    if (!value) return;
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    list.append(term, description);
  });
  review.appendChild(list);
}

function joinAddress(prefix) {
  const fields = prefix === "permanent"
    ? ["permanentHouseNumber", "permanentStreet", "permanentPurok", "permanentBarangay",
      "permanentCityMunicipality", "permanentProvince", "permanentZipCode", "permanentRegion"]
    : ["presentHouseNumber", "presentStreet", "presentPurok", "presentBarangay",
      "presentCityMunicipality", "presentProvince", "presentZipCode", "presentRegion"];
  return fields.map(name => form.elements[name].value.trim()).filter(Boolean).join(", ");
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!validateStep(5)) return;

  for (let index = 0; index < 5; index += 1) {
    if (!validateStep(index)) {
      showStep(index);
      return;
    }
  }

  const payload = new FormData(form);
  payload.set("privacyConsent", String(form.elements.privacyConsent.checked));
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const response = await fetch("/api/resident-auth/register", {
      method: "POST",
      body: payload
    });
    const result = await response.json();

    if (!response.ok) {
      await showResidentModal(result.message || "Registration failed.");
      submitButton.disabled = false;
      return;
    }

    await showResidentModal("Account created successfully.");
    window.location.replace("/resident/dashboard.html");
  } catch (error) {
    console.error("Unable to register resident.", error);
    await showResidentModal("Unable to connect to the server.");
    submitButton.disabled = false;
  }
});

showStep(0);
