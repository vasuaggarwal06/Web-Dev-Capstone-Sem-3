// Thin Fetch API wrapper: attaches the access token and transparently
// refreshes it once when the server answers 401 (expired access token).

const STORAGE_KEY = 'attendtrack_tokens';

export const tokenStore = {
  get() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
  },
  set(tokens) { localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens)); },
  clear() { localStorage.removeItem(STORAGE_KEY); },
};

let onAuthFailure = () => {};
export const setAuthFailureHandler = (fn) => { onAuthFailure = fn; };

let refreshPromise = null;
const refreshTokens = async () => {
  const tokens = tokenStore.get();
  if (!tokens?.refreshToken) throw new Error('No refresh token');
  if (!refreshPromise) {
    refreshPromise = fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Session expired');
        tokenStore.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        return data.accessToken;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

export class ApiRequestError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const request = async (method, path, body, retry = true) => {
  const tokens = tokenStore.get();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry && tokens?.refreshToken && !path.startsWith('/auth/')) {
    try {
      await refreshTokens();
      return request(method, path, body, false);
    } catch {
      tokenStore.clear();
      onAuthFailure();
      throw new ApiRequestError('Session expired, please log in again', 401);
    }
  }

  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new ApiRequestError(data.message || 'Request failed', res.status, data.details);
  return data;
};

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body ?? {}),
  put: (path, body) => request('PUT', path, body ?? {}),
  patch: (path, body) => request('PATCH', path, body ?? {}),
  delete: (path) => request('DELETE', path),
};

export const errorText = (err) => {
  if (err?.details?.length) return err.details.map((d) => d.message).join(', ');
  return err?.message || 'Something went wrong';
};
