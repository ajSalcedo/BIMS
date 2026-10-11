const accountForm = document.getElementById("accountForm");
const accountMessage = document.getElementById("accountMessage");
const cancelAccountChanges = document.getElementById("cancelAccountChanges");
let savedProfile;

function showMessage(message, isError = false) {
  accountMessage.textContent = message;
  accountMessage.classList.toggle("error", isError);
}

function populateForm(profile) {
  for (const [name, value] of Object.entries(profile)) {
    const field = accountForm.elements.namedItem(name);
    if (field instanceof HTMLInputElement) {
      field.value = value;
    }
  }
  accountForm.elements.namedItem("currentPassword").value = "";
  accountForm.elements.namedItem("newPassword").value = "";
  accountForm.elements.namedItem("confirmPassword").value = "";
}

async function loadProfile() {
  const response = await fetch("/api/admin-auth/profile", { cache: "no-store" });

  if (response.status === 401) {
    window.location.replace("/admin/login.html");
    return;
  }
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || "Unable to load your account details.");
  }

  savedProfile = result.profile;
  populateForm(savedProfile);
}

accountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("");

  const formData = new FormData(accountForm);
  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");
  if (newPassword && newPassword !== confirmPassword) {
    showMessage("New password and confirmation do not match.", true);
    return;
  }

  const profile = Object.fromEntries(formData.entries());
  delete profile.confirmPassword;

  try {
    const response = await fetch("/api/admin-auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    const result = await response.json();
    if (!response.ok) {
      showMessage(result.message || "Unable to update your account.", true);
      return;
    }

    savedProfile = {
      username: profile.username,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      address: profile.address,
      contactNumber: profile.contactNumber
    };
    populateForm(savedProfile);
    showMessage(result.message);
  } catch (error) {
    console.error("Unable to update admin account.", error);
    showMessage("Unable to reach the server. Please try again.", true);
  }
});

cancelAccountChanges.addEventListener("click", () => {
  if (savedProfile) {
    populateForm(savedProfile);
  }
  showMessage("");
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  await fetch("/api/admin-auth/logout", { method: "POST" });
  window.location.replace("/");
});

loadProfile().catch((error) => {
  console.error("Unable to load admin account.", error);
  showMessage(error.message || "Unable to load your account details.", true);
});
