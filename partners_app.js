// travel/partners_app.js

// ==== Config ====
const API_BASE = "https://lolaelo-api.onrender.com";
const SESSION_KEY = "lolaelo_session";
const LOGIN_PAGE = "partners_login.html";

// ==== DOM helpers ====
const $ = (id) => document.getElementById(id);
const elEmail = $("partnerEmail");
const elLogout = $("logoutBtn");
const form = $("propertyForm");
const toast = $("toast");
const saveBtn = $("saveBtn");

function getToken() {
  return localStorage.getItem(SESSION_KEY);
}

function setToast(msg, ok = true) {
  if (!toast) return;
  toast.textContent = msg || "";
  toast.className = `toast ${ok ? "ok" : "err"}`;
}

async function fetchWithAuth(path, opts = {}) {
  const token = getToken();
  if (!token) { location.replace(LOGIN_PAGE); return; }
  const headers = Object.assign({}, opts.headers || {}, {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    "x-partner-token": token,
  });
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers, credentials: "omit" });
  if (res && res.status === 401) {
    localStorage.removeItem(SESSION_KEY);
    location.replace(LOGIN_PAGE);
    return;
  }
  return res;
}

async function ensureSession() {
  const res = await fetchWithAuth("/extranet/session", { method: "GET" });
  if (!res || !res.ok) return;
  const data = await res.json().catch(() => ({}));
  if (data?.email && elEmail) elEmail.textContent = data.email;
}

async function loadProperty() {
  const res = await fetchWithAuth("/extranet/property", { method: "GET" });
  if (!res) return;
  if (res.status === 404) return;
  if (!res.ok) { setToast("Failed to load profile", false); return; }
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
  setToast("");
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving…"; }
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
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save Profile"; }
    return;
  }
  const res = await fetchWithAuth("/extranet/property", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!res) return;
  if (res.ok) setToast("Saved");
  else {
    const err = await res.json().catch(() => ({}));
    setToast(err.message || "Save failed", false);
  }
  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save Profile"; }
}

async function logout() {
  const token = getToken();
  try {
    await fetch(`${API_BASE}/extranet/logout`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "x-partner-token": token }
    }).catch(() => {});
  } finally {
    localStorage.removeItem(SESSION_KEY);
    // Replace so Back won't re-open this page
    location.replace(LOGIN_PAGE);
  }
}

// ==== Init ====
(async function init() {
  if (!getToken()) { location.replace(LOGIN_PAGE); return; }
  elLogout?.addEventListener("click", logout);
  form?.addEventListener("submit", saveProperty);
  await ensureSession();
  await loadProperty();
})();

// Re-validate when coming back from BFCache or Back
window.addEventListener("pageshow", (e) => {
  const nav = performance.getEntriesByType("navigation")[0];
  const fromBF = e.persisted || (nav && nav.type === "back_forward");
  if (fromBF) {
    if (!getToken()) {
      location.replace(LOGIN_PAGE);
    } else {
      ensureSession(); // if token revoked server-side, this will bounce
    }
  }
});

// Force a reload (and thus JS re-run) on back navigation to this page
window.addEventListener("popstate", () => {
  if (!getToken()) location.replace(LOGIN_PAGE);
  else location.reload();
});
