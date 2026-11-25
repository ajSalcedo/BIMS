const accountLink = document.getElementById("accountLink");
const primaryAction = document.getElementById("primaryAction");
const verifiedResidents = document.getElementById("verifiedResidents");
const completedRequests = document.getElementById("completedRequests");
const requestSteps = [...document.querySelectorAll("#requestProgressLabels li")];
const progressStatuses = ["Pending", "Processing", "Ready for Pickup", "Completed"];

function formatUpdatedAt(value) {
  if (!value) return "Recently updated";

  const updatedAt = new Date(value);
  if (Number.isNaN(updatedAt.getTime())) return "Recently updated";

  const minutes = Math.max(0, Math.floor((Date.now() - updatedAt.getTime()) / 60000));
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
}

function renderRequest(request) {
  const tag = document.getElementById("requestTag");
  const progress = document.getElementById("requestProgress");
  const progressLabels = document.getElementById("requestProgressLabels");

  if (!request) {
    tag.textContent = "No requests yet";
    document.getElementById("requestService").textContent = "Your latest request will appear here";
    document.getElementById("requestCode").textContent = "";
    document.getElementById("requestUpdated").textContent = "Submit a document request to track its status.";
    document.getElementById("requestStatus").textContent = "No active request";
    document.getElementById("requestPayment").textContent = "—";
    progress.hidden = true;
    progressLabels.hidden = true;
    return;
  }

  tag.textContent = "Latest request";
  document.getElementById("requestService").textContent = request.service_type;
  document.getElementById("requestCode").textContent = request.tracking_number;
  document.getElementById("requestUpdated").textContent = formatUpdatedAt(request.updated_at || request.submitted_at);
  document.getElementById("requestStatus").textContent = request.status;
  document.getElementById("requestPayment").textContent = request.payment_status;
  progress.hidden = false;
  progressLabels.hidden = false;

  const statusIndex = progressStatuses.indexOf(request.status);
  requestSteps.forEach((step, index) => {
    step.classList.toggle("on", statusIndex >= 0 && index < statusIndex);
    step.classList.toggle("now", statusIndex === index);
  });
}

function renderSampleRequest() {
  document.getElementById("requestTag").textContent = "Sample request";
  document.getElementById("requestService").textContent = "Certificate of Residency";
  document.getElementById("requestCode").textContent = "DOC-2026-K7M39QXA";
  document.getElementById("requestUpdated").textContent = "Updated a few minutes ago";
  document.getElementById("requestStatus").textContent = "Ready for pickup";
  document.getElementById("requestPayment").textContent = "Verified by staff";
  document.getElementById("requestProgress").hidden = false;
  document.getElementById("requestProgressLabels").hidden = false;

  requestSteps.forEach((step, index) => {
    step.classList.toggle("on", index < 2);
    step.classList.toggle("now", index === 2);
  });
}

function showLoadError() {
  verifiedResidents.textContent = "Unavailable";
  completedRequests.textContent = "Unavailable";
  document.getElementById("requestTag").textContent = "Status unavailable";
  document.getElementById("requestService").textContent = "Unable to load request status";
  document.getElementById("requestCode").textContent = "";
  document.getElementById("requestUpdated").textContent = "Please refresh the page to try again.";
  document.getElementById("requestStatus").textContent = "Unavailable";
  document.getElementById("requestPayment").textContent = "—";
  document.getElementById("requestProgress").hidden = true;
  document.getElementById("requestProgressLabels").hidden = true;
}

async function loadLandingData() {
  try {
    const response = await fetch("/api/dashboard/public", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Public dashboard request failed with status ${response.status}.`);
    }

    const data = await response.json();
    verifiedResidents.textContent = Number(data.verifiedResidents).toLocaleString();
    completedRequests.textContent = Number(data.completedRequests).toLocaleString();
    if (data.resident) {
      renderRequest(data.latestRequest);
    } else {
      renderSampleRequest();
    }

    accountLink.textContent = data.resident ? "Resident portal" : "Log in";
    accountLink.href = data.resident ? "/resident/dashboard.html" : "/resident/login.html";
    primaryAction.textContent = data.resident ? "Request a document" : "Register Now";
    primaryAction.href = data.resident ? "/resident/request.html" : "/resident/regisForm.html";
  } catch (error) {
    console.error("Unable to load landing page data.", error);
    showLoadError();
  }
}

loadLandingData();
window.setInterval(loadLandingData, 30000);

const header = document.querySelector(".landing .site-header");
const navToggle = document.querySelector(".landing .nav-toggle");
const nav = document.getElementById("site-nav");

function updateHeader() {
  if (header) {
    header.classList.toggle("scrolled", window.scrollY > 24);
  }
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      nav.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const reveals = document.querySelectorAll(".reveal");

if (reduceMotion || !("IntersectionObserver" in window)) {
  reveals.forEach((element) => element.classList.add("in"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  reveals.forEach((element) => revealObserver.observe(element));
}
