const API_BASE = "/api/auth";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

const User = {
  async me() {
    return apiFetch(`${API_BASE}/me`);
  },

  async login(username, password) {
    const data = await apiFetch(`${API_BASE}/login`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (data.token) localStorage.setItem("token", data.token);
    return data.user;
  },

  async register(username, password, fullName, cargo) {
    const data = await apiFetch(`${API_BASE}/register`, {
      method: "POST",
      body: JSON.stringify({ username, password, fullName, cargo }),
    });
    if (data.token) localStorage.setItem("token", data.token);
    return data.user;
  },

  async update(profile) {
    return apiFetch(`${API_BASE}/me`, {
      method: "PUT",
      body: JSON.stringify(profile),
    });
  },

  async logout() {
    localStorage.removeItem("token");
  },

  // Admin: gestión de usuarios
  async listAll() {
    return apiFetch(`${API_BASE}/users`);
  },

  async create(username, password, fullName, cargo) {
    return apiFetch(`${API_BASE}/users`, {
      method: "POST",
      body: JSON.stringify({ username, password, fullName, cargo }),
    });
  },

  async updateUser(id, data) {
    return apiFetch(`${API_BASE}/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async resetPassword(id, password) {
    return apiFetch(`${API_BASE}/users/${id}/password`, {
      method: "PUT",
      body: JSON.stringify({ password }),
    });
  },

  async setPin(id, pin) {
    return apiFetch(`${API_BASE}/users/${id}/pin`, {
      method: "PUT",
      body: JSON.stringify({ pin }),
    });
  },

  async deleteUser(id) {
    return apiFetch(`${API_BASE}/users/${id}`, { method: "DELETE" });
  },

  async verifyPin(pin) {
    return apiFetch(`${API_BASE}/verify-pin`, {
      method: "POST",
      body: JSON.stringify({ pin }),
    });
  },
};

export default User;
