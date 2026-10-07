async function checkAdmin() {
  const response = await fetch("/api/admin-auth/me");
  if (response.status === 401) {
    window.location.href = "/admin/login.html";
  }
}
checkAdmin();

document.getElementById("adminForm").addEventListener("submit", async e => {
  e.preventDefault();

  const message = document.getElementById("message");
  const data = Object.fromEntries(new FormData(e.currentTarget).entries());

  const response = await fetch("/api/admin-auth/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  const result = await response.json();
  message.textContent = result.message || "Done.";

  if (response.ok) e.currentTarget.reset();
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  await fetch("/api/admin-auth/logout", { method: "POST" });
  window.location.href = "/";
});
