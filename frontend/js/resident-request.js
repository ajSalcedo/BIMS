const form = document.getElementById("requestForm");
const serviceType = document.getElementById("serviceType");
const copies = document.getElementById("copies");
const fee = document.getElementById("fee");
let services = [];

async function loadServices() {
  const response = await fetch("/api/requests/types");
  if (response.status === 401) return (window.location.href = "/resident/login.html");
  const data = await response.json();
  services = data.services;
  serviceType.innerHTML = '<option value="">Select document</option>' + services.map(s => `<option value="${s.name}">${s.name} — ₱${Number(s.fee).toFixed(2)}</option>`).join("");
  updateFee();
}
function updateFee() {
  const selected = services.find(s => s.name === serviceType.value);
  fee.textContent = `₱${((selected?.fee || 0) * Math.max(1, Number(copies.value) || 1)).toFixed(2)}`;
}
serviceType.addEventListener("change", updateFee); copies.addEventListener("input", updateFee);
form.addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const response = await fetch("/api/requests", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
      serviceType: serviceType.value, purpose: document.getElementById("purpose").value.trim(), copies: Number(copies.value), paymentMethod: document.getElementById("paymentMethod").value
    })});
    const data = await response.json();
    if (response.ok) {
      form.reset();
      copies.value = 1;
      updateFee();
      await showResidentModal(`Request submitted. Tracking number: ${data.trackingNumber}`);
    } else {
      await showResidentModal(data.message || "Unable to submit request.");
    }
  } catch (error) {
    console.error("Unable to submit request.", error);
    await showResidentModal("Unable to connect to the server. Please try again.");
  }
});
document.getElementById("logoutButton").addEventListener("click", async () => {
  const response = await fetch("/api/resident-auth/logout", { method: "POST" });
  if (!response.ok) throw new Error("Unable to log out.");
  window.location.replace("/");
});
loadServices();
