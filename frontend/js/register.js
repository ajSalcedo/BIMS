document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const message = document.getElementById("message");

  if (data.password !== data.confirmPassword) {
    message.textContent = "Passwords do not match.";
    return;
  }

  delete data.confirmPassword;
  message.textContent = "Creating account...";

  try {
    const response = await fetch("/api/resident-auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok) {
      message.textContent = "Account created. Redirecting...";
      setTimeout(() => {
        window.location.href = "/resident/dashboard.html";
      }, 500);
    } else {
      message.textContent = result.message || "Registration failed.";
    }
  } catch {
    message.textContent = "Unable to connect to the server.";
  }
});
