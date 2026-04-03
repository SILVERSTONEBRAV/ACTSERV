const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function getTokens() {
  if (typeof window === 'undefined') return null;
  const access = localStorage.getItem('access_token');
  return access ? { access, refresh: localStorage.getItem('refresh_token') } : null;
}

function authHeaders(): Record<string, string> {
  const tokens = getTokens();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (tokens?.access) {
    headers['Authorization'] = `Bearer ${tokens.access}`;
  }
  return headers;
}

export async function apiGet(path: string) {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
  if (res.status === 401) {
    // Try refresh
    const refreshed = await refreshToken();
    if (refreshed) {
      const res2 = await fetch(`${API_URL}${path}`, { headers: authHeaders() });
      return res2.json();
    }
    // Redirect to login on failed refresh
    logout();
    return {};
  }
  return res.json();
}

export async function apiPost(path: string, body: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      const res2 = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      return res2.json();
    }
    logout();
    return {};
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function apiDelete(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (res.status === 401) { logout(); return null; }
  return res;
}

export async function apiPatch(path: string, body: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (res.status === 401) { logout(); return {}; }
  return res.json();
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/auth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  localStorage.setItem('access_token', data.access);
  localStorage.setItem('refresh_token', data.refresh);
  return data;
}

export async function register(username: string, email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

async function refreshToken(): Promise<boolean> {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('access_token', data.access);
    return true;
  } catch {
    return false;
  }
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  window.location.href = '/login';
}

export function isLoggedIn() {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('access_token');
}
