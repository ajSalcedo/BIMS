const sidebar = document.querySelector(".admin-sidebar");
const sidebarToggle = document.querySelector(".sidebar-toggle");
const sidebarBackdrop = document.querySelector(".admin-sidebar-backdrop");
const adminManagementPath = "/admin/manageAdmins.html";
const adminManagementLink = sidebar?.querySelector(`a[href="${adminManagementPath}"]`);
const isAdminManagementPage = window.location.pathname === adminManagementPath;

if (adminManagementLink) {
  adminManagementLink.hidden = true;
}

async function verifyAdminAccess() {
  const response = await fetch("/api/admin-auth/me", { cache: "no-store" });

  if (response.status === 401) {
    window.location.replace("/admin/login.html");
    return false;
  }
  if (!response.ok) {
    throw new Error(`Unable to verify admin session (HTTP ${response.status}).`);
  }

  const data = await response.json();
  const isAdministrator = data.admin.role === "Administrator";

  if (adminManagementLink) {
    adminManagementLink.hidden = !isAdministrator;
  }
  if (isAdminManagementPage && !isAdministrator) {
    window.location.replace("/admin/dashboard.html");
    return false;
  }

  return true;
}

verifyAdminAccess().catch((error) => {
  console.error("Unable to verify admin access.", error);
  if (isAdminManagementPage) {
    window.location.replace("/admin/dashboard.html");
  }
});

window.addEventListener("pagehide", (event) => {
  if (event.persisted) {
    document.documentElement.style.visibility = "hidden";
  }
});

window.addEventListener("pageshow", async (event) => {
  if (!event.persisted) {
    return;
  }

  document.documentElement.style.visibility = "hidden";

  try {
    if (!(await verifyAdminAccess())) {
      return;
    }
    document.documentElement.style.visibility = "";
  } catch (error) {
    console.error("Unable to verify admin session after history navigation.", error);
    window.location.replace("/admin/login.html");
  }
});

if (sidebar && sidebarToggle && sidebarBackdrop) {
  const setSidebarOpen = (isOpen) => {
    document.body.classList.toggle("sidebar-open", isOpen);
    sidebarToggle.setAttribute("aria-expanded", String(isOpen));
    sidebar.setAttribute("aria-hidden", String(!isOpen));
    sidebarBackdrop.setAttribute("aria-hidden", String(!isOpen));
  };

  sidebarToggle.addEventListener("click", () => {
    setSidebarOpen(sidebarToggle.getAttribute("aria-expanded") !== "true");
  });
  sidebarBackdrop.addEventListener("click", () => setSidebarOpen(false));
  sidebar.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      setSidebarOpen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sidebarToggle.getAttribute("aria-expanded") === "true") {
      setSidebarOpen(false);
      sidebarToggle.focus();
    }
  });
}
