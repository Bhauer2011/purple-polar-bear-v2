function getDefaultApiBase() {
  const host = globalThis.location?.hostname;
  if (!host || host === "localhost" || host === "127.0.0.1") {
    return "http://127.0.0.1:8000";
  }

  return `http://${host}:8000`;
}

export const apiBase =
  globalThis.localStorage?.getItem("ppb-api-base") ||
  globalThis.PPB_API_BASE ||
  getDefaultApiBase();

function buildUrl(path) {
  return `${apiBase}${path}`;
}

async function parseResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.detail || data?.message || "Request failed";
    throw new Error(message);
  }

  return data;
}

export async function apiGet(path, token) {
  const response = await fetch(buildUrl(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return parseResponse(response);
}

export async function apiSend(path, method, body, token) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  return parseResponse(response);
}

export async function loadHomeData(token) {
  const [status, menu, events, photos, reviews, about] = await Promise.all([
    apiGet("/api/business-status", token).catch(() => null),
    apiGet("/api/menu", token).catch(() => []),
    apiGet("/api/upcoming-events", token).catch(() => []),
    apiGet("/api/event-photos", token).catch(() => []),
    apiGet("/api/reviews", token).catch(() => []),
    apiGet("/api/about-us", token).catch(() => null)
  ]);

  return { status, menu, events, photos, reviews, about };
}

export async function loadAdminData(token) {
  const [status, menu, requests, events, about, photos, reviews] = await Promise.all([
    apiGet("/api/business-status", token),
    apiGet("/api/menu", token),
    apiGet("/api/admin/event-requests", token),
    apiGet("/api/upcoming-events", token),
    apiGet("/api/about-us", token),
    apiGet("/api/event-photos", token),
    apiGet("/api/admin/reviews", token)
  ]);

  return { status, menu, requests, events, about, photos, reviews };
}

export async function login(username, password) {
  return apiSend("/api/admin/login", "POST", { username, password });
}
