async function loadAdmin() {
  const meResponse = await fetch("/api/admin-auth/me");
  if (meResponse.status === 401) {
    window.location.href = "/admin/login.html";
    return;
  }

  const me = await meResponse.json();
  document.getElementById("adminName").textContent = me.admin.fullName;

  const response = await fetch("/api/dashboard/admin");
  if (!response.ok) return;

  const data = await response.json();
  document.getElementById("residentCount").textContent = data.residents;
  document.getElementById("householdCount").textContent = data.households;
  document.getElementById("adminCount").textContent = data.admins;
}

document.getElementById("logoutButton").addEventListener("click", async () => {
  await fetch("/api/admin-auth/logout", { method: "POST" });
  window.location.href = "/";
});

loadAdmin();
