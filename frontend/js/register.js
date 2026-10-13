document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  data.email = data.email.trim();
  data.contactNumber = data.contactNumber.trim();

  if (!data.email && !data.contactNumber) {
    await showResidentModal("Provide an email address or contact number to use for login.");
    return;
  }

  if (data.password !== data.confirmPassword) {
    await showResidentModal("Passwords do not match.");
    return;
  }

  delete data.confirmPassword;

  try {
    const response = await fetch("/api/resident-auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok) {
      await showResidentModal("Account created successfully.");
      window.location.replace("/resident/dashboard.html");
    } else {
      await showResidentModal(result.message || "Registration failed.");
    }
  } catch (error) {
    console.error("Unable to register resident.", error);
    await showResidentModal("Unable to connect to the server.");
  }
});
