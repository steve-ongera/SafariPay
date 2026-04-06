/**
 * SafariPay API Service
 * Pure fetch — no Axios dependency.
 * Handles JWT storage, auto-refresh, and typed error surfacing.
 */

const BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1";

// ── Token store (memory + localStorage fallback) ──────────────────────────
let _access  = null;
let _refresh = null;

const TOKEN_KEYS = { access: "sp_at", refresh: "sp_rt" };

export function loadTokens() {
  _access  = localStorage.getItem(TOKEN_KEYS.access);
  _refresh = localStorage.getItem(TOKEN_KEYS.refresh);
}

export function saveTokens(access, refresh) {
  _access  = access;
  _refresh = refresh;
  localStorage.setItem(TOKEN_KEYS.access,  access);
  localStorage.setItem(TOKEN_KEYS.refresh, refresh);
}

export function clearTokens() {
  _access = _refresh = null;
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
}

export function isAuthenticated() {
  return Boolean(_access || localStorage.getItem(TOKEN_KEYS.access));
}

export function getPublicId() {
  const t = _access || localStorage.getItem(TOKEN_KEYS.access);
  if (!t) return null;
  try {
    const payload = JSON.parse(atob(t.split(".")[1]));
    return payload.pid ?? null;
  } catch { return null; }
}

// ── Core fetch wrapper ────────────────────────────────────────────────────
async function request(path, { method = "GET", body, auth = true, retry = true } = {}) {
  const token = _access || localStorage.getItem(TOKEN_KEYS.access);
  const headers = { "Content-Type": "application/json" };
  if (auth && token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh on 401
  if (res.status === 401 && retry) {
    const refreshed = await _tryRefresh();
    if (refreshed) return request(path, { method, body, auth, retry: false });
    clearTokens();
    window.dispatchEvent(new Event("sp:logout"));
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = _extractError(data) || `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, data);
  }

  return data;
}

async function _tryRefresh() {
  const rToken = _refresh || localStorage.getItem(TOKEN_KEYS.refresh);
  if (!rToken) return false;
  try {
    const res = await fetch(`${BASE}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: rToken }),
    });
    if (!res.ok) return false;
    const { access, refresh } = await res.json();
    saveTokens(access, refresh ?? rToken);
    return true;
  } catch { return false; }
}

function _extractError(data) {
  if (!data || typeof data !== "object") return null;
  for (const key of ["detail", "error", "message", "non_field_errors"]) {
    if (data[key]) return Array.isArray(data[key]) ? data[key][0] : data[key];
  }
  // DRF field errors
  const first = Object.values(data)[0];
  if (Array.isArray(first)) return first[0];
  return null;
}

export class ApiError extends Error {
  constructor(status, message, data = {}) {
    super(message);
    this.status = status;
    this.data   = data;
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────
export const auth = {
  register: (payload) =>
    request("/auth/register/", { method: "POST", body: payload, auth: false }),

  login: async (email, password) => {
    const data = await request("/auth/token/", {
      method: "POST", body: { email, password }, auth: false,
    });
    saveTokens(data.access, data.refresh);
    return data;
  },

  logout: async () => {
    const rToken = _refresh || localStorage.getItem(TOKEN_KEYS.refresh);
    try {
      await request("/auth/token/logout/", { method: "POST", body: { refresh: rToken } });
    } finally {
      clearTokens();
    }
  },

  me:     ()       => request("/auth/me/"),
  updateMe: (data) => request("/auth/me/", { method: "PATCH", body: data }),
  setPin:   (data) => request("/auth/set-pin/", { method: "POST", body: data }),
};

// ── Wallets ───────────────────────────────────────────────────────────────
export const wallets = {
  list:   ()           => request("/wallets/"),
  create: (currency)   => request("/wallets/create/", { method: "POST", body: { currency } }),
  send:   (payload)    => request("/wallets/send/",   { method: "POST", body: payload }),
  deposit:(payload)    => request("/wallets/deposit/",{ method: "POST", body: payload }),
};

// ── Transactions ──────────────────────────────────────────────────────────
export const transactions = {
  list:     (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/transactions/${q ? "?" + q : ""}`);
  },
  get: (ref) => request(`/transactions/${ref}/`),
};

// ── Loans ─────────────────────────────────────────────────────────────────
export const loans = {
  list:   ()        => request("/loans/"),
  apply:  (payload) => request("/loans/apply/",  { method: "POST", body: payload }),
  repay:  (payload) => request("/loans/repay/",  { method: "POST", body: payload }),
};

// ── Savings ───────────────────────────────────────────────────────────────
export const savings = {
  list:    ()        => request("/savings/"),
  create:  (payload) => request("/savings/create/",  { method: "POST", body: payload }),
  deposit: (payload) => request("/savings/deposit/", { method: "POST", body: payload }),
};