const API_BASE = "/api/entities";

function getToken() {
  return localStorage.getItem("token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch(url, options = {}) {
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

export async function getSequence(type) {
  const data = await apiFetch(`/api/sequence/${type}`);
  return data.number;
}

export class BaseEntity {
  static get _entity() {
    throw new Error("Override _entity");
  }

  static async list(sort = "-createdAt", limit = 500) {
    return apiFetch(`${API_BASE}/${this._entity}?sort=${sort}&limit=${limit}`);
  }

  static async filter(conditions = {}, sort = "-createdAt", limit = 500) {
    const params = new URLSearchParams({ sort, limit });
    for (const [k, v] of Object.entries(conditions)) {
      if (v !== undefined && v !== null) params.set(k, v);
    }
    return apiFetch(`${API_BASE}/${this._entity}?${params}`);
  }

  static async get(id) {
    return apiFetch(`${API_BASE}/${this._entity}/${id}`);
  }

  static async create(data) {
    return apiFetch(`${API_BASE}/${this._entity}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  static async update(id, data) {
    return apiFetch(`${API_BASE}/${this._entity}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  static async delete(id) {
    return apiFetch(`${API_BASE}/${this._entity}/${id}`, { method: "DELETE" });
  }

  static async bulkCreate(items) {
    return apiFetch(`${API_BASE}/${this._entity}/bulk`, {
      method: "POST",
      body: JSON.stringify(items),
    });
  }
}
