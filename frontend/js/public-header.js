(() => {
  const header = document.querySelector(".site-header--interior");
  const navToggle = header?.querySelector(".nav-toggle");
  const nav = header?.querySelector(".site-nav");

  if (!header || !navToggle || !nav) return;

  function setMenuOpen(isOpen) {
    nav.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  }

  navToggle.addEventListener("click", () => {
    setMenuOpen(navToggle.getAttribute("aria-expanded") !== "true");
  });

  nav.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      setMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenuOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (event.target instanceof Node && !header.contains(event.target)) {
      setMenuOpen(false);
    }
  });
})();
