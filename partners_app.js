// Config
const API_BASE = "https://lolaelo-api.onrender.com";
const SESSION_KEY = "lolaelo_session"; // bearer token stored by login page
const LOGIN_PAGE = "partners_login.html"; // your login filename

// DOM
const elEmail = document.getElementById("partnerEmail");
const elLogout = document.getElementById("logoutBtn");
const form = document.getElementById("propertyForm");
const toast = document.getElementById("toast");

const $ = (id) => document.getElementById(id);

function getToken() {
  return localStorage.getItem(SESSION_KEY);
}

function setToast(msg, ok = true) {
  toast.textContent = msg;
  toast.className = `toast ${ok ? "ok" : "err"}`;
}

async function fetchWithAuth(path, opts = {}) {
  const token = getToken();
  if (!token) {
    location.href = LOGIN_PAGE;
    return;
  }
  const headers = Object.assign({}, opts.headers || {}, {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  });
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers, credentials: "omit" });
  if (res.status === 401) {
    // Session invalid
    localStorage.removeItem(SESSION_KEY);
    location.href = LOGIN_PAGE;
    return;
  }
  return res;
}

async function ensureSession() {
  const res = await fetchWithAuth("/extranet/session", { method: "GET" });
  if (!res || !res.ok) {
    return;
  }
  const data = await res.json();
  // Show email if present
  if (data && data.email) elEmail.textContent = data.email;
}

async function loadProperty() {
  const res = await fetchWithAuth("/extranet/property", { method: "GET" });
  if (!res) return;
  if (res.status === 404) {
    // First time, nothing saved yet
    return;
  }
  if (!res.ok) {
    setToast("Failed to load profile", false);
    return;
  }
  const p = await res.json();
  $("name").value = p.name || "";
  $("addressLine").value = p.addressLine || "";
  $("city").value = p.city || "";
  $("country").value = p.country || "";
  $("contactEmail").value = p.contactEmail || "";
  $("phone").value = p.phone || "";
  $("description").value = p.description || "";
}

async function saveProperty(evt) {
  evt.preventDefault();
  setToast("", true);
  const payload = {
    name: $("name").value.trim(),
    addressLine: $("addressLine").value.trim() || null,
    city: $("city").value.trim() || null,
    country: $("country").value.trim() || null,
    contactEmail: $("contactEmail").value.trim() || null,
    phone: $("phone").value.trim() || null,
    description: $("description").value.trim() || null,
  };
  if (!payload.name) {
    setToast("Property Name is required", false);
    return;
  }
  const res = await fetchWithAuth("/extranet/property", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!res) return;
  if (res.ok) {
    setToast("Saved");
  } else {
    const err = await res.json().catch(() => ({}));
    setToast(err.message || "Save failed", false);
  }
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  location.href = LOGIN_PAGE;
}

(async function init() {
  const token = getToken();
  if (!token) {
    location.href = LOGIN_PAGE;
    return;
  }
  elLogout.addEventListener("click", logout);
  form.addEventListener("submit", saveProperty);
  await ensureSession();
  await loadProperty();
})();
