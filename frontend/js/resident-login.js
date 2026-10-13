document.getElementById("residentLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const response = await fetch("/api/resident-auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: document.getElementById("identifier").value.trim(),
        password: document.getElementById("password").value
      })
    });

    const data = await response.json();
    if (response.ok) {
      await showResidentModal("Login successful.");
      window.location.replace("/resident/dashboard.html");
    } else {
      await showResidentModal(data.message || "Login failed.");
    }
  } catch (error) {
    console.error("Unable to log in resident.", error);
    await showResidentModal("Unable to connect to the server.");
  }
});
