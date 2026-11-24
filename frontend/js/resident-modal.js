function showResidentModal(message) {
  const dialog = document.createElement("dialog");
  dialog.className = "resident-modal";
  dialog.setAttribute("aria-labelledby", "residentModalTitle");

  const content = document.createElement("div");
  content.className = "resident-modal-content";

  const title = document.createElement("h2");
  title.id = "residentModalTitle";
  title.textContent = "Notice";

  const text = document.createElement("p");
  text.textContent = message;

  const button = document.createElement("button");
  button.className = "resident-modal-ok";
  button.type = "button";
  button.textContent = "OK";

  content.append(title, text, button);
  dialog.append(content);
  document.body.append(dialog);

  return new Promise((resolve) => {
    dialog.addEventListener("close", () => {
      dialog.remove();
      resolve();
    }, { once: true });

    button.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });

    dialog.showModal();
    button.focus();
  });
}
