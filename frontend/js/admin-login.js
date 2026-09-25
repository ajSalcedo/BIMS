document.getElementById("adminLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = document.getElementById("message");
  message.textContent = "Logging in...";

  const response = await fetch("/api/admin-auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: document.getElementById("username").value.trim(),
      password: document.getElementById("password").value
    })
  });

  const data = await response.json();

  if (response.ok) {
    window.location.href = "/admin/dashboard.html";
  } else {
    message.textContent = data.message || "Login failed.";
  }
});
