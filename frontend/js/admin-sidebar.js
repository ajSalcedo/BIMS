const sidebar = document.querySelector(".admin-sidebar");
const sidebarToggle = document.querySelector(".sidebar-toggle");
const sidebarBackdrop = document.querySelector(".admin-sidebar-backdrop");

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
