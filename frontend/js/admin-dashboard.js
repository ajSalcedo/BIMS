async function loadAdmin() {
  const meResponse = await fetch("/api/admin-auth/me");

  if (meResponse.status === 401) {
    return (location.href = "/admin/login.html");
  }

  const me = await meResponse.json();
  adminName.textContent = me.admin.fullName;

  const response = await fetch("/api/dashboard/admin");
  if (response.ok) {
    const data = await response.json();
    residentCount.textContent = data.residents;
    householdCount.textContent = data.households;
    adminCount.textContent = data.admins;
  }
}

document.getElementById("logoutButton").onclick = async () => {
  await fetch("/api/admin-auth/logout", { method: "POST" });
  location.replace("/");
};

async function loadCounts() {
  const [requestResponse, concernResponse] = await Promise.all([
    fetch("/api/requests/admin"),
    fetch("/api/concerns/admin")
  ]);

  if (requestResponse.ok) {
    const data = await requestResponse.json();
    requestCount.textContent = data.requests.length;
  }

  if (concernResponse.ok) {
    const data = await concernResponse.json();
    const openConcerns = data.concerns.filter(
      (concern) => concern.status !== "Resolved" && concern.status !== "Rejected"
    );
    const concernCountElement = document.getElementById("concernCount");

    if (concernCountElement) {
      concernCountElement.textContent = openConcerns.length;
    }
  }
}

loadAdmin();
loadCounts();
