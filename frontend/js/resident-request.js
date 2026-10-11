const form = document.getElementById("requestForm");
const serviceType = document.getElementById("serviceType");
const copies = document.getElementById("copies");
const fee = document.getElementById("fee");
const message = document.getElementById("message");
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
  e.preventDefault(); message.textContent = "Submitting...";
  const response = await fetch("/api/requests", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
    serviceType: serviceType.value, purpose: document.getElementById("purpose").value.trim(), copies: Number(copies.value), paymentMethod: document.getElementById("paymentMethod").value
  })});
  const data = await response.json();
  if (response.ok) { message.textContent = `Request submitted. Tracking number: ${data.trackingNumber}`; form.reset(); copies.value=1; updateFee(); }
  else message.textContent = data.message || "Unable to submit request.";
});
document.getElementById("logoutButton").addEventListener("click", async () => { await fetch("/api/resident-auth/logout", {method:"POST"}); window.location.href="/"; });
loadServices();
