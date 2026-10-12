window.addEventListener("pageshow", (event) => {
  if (!event.persisted) {
    return;
  }

  document.body.style.visibility = "hidden";

  fetch("/api/resident-auth/me", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        window.location.replace("/resident/login.html");
        return;
      }

      document.body.style.visibility = "";
    })
    .catch((error) => {
      console.error("Unable to verify the resident session after restoring the page.", error);
      window.location.replace("/resident/login.html");
    });
});
