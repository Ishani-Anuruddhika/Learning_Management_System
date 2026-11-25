const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const KEY = 'edulanka-auth';

export type Tokens = { access: string; refresh: string };
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function getTokens(): Tokens | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
export function setTokens(t: Tokens | null) {
  try { t ? localStorage.setItem(KEY, JSON.stringify(t)) : localStorage.removeItem(KEY); } catch { /* ignore */ }
}

function send(path: string, init: RequestInit, token?: string) {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body && !(init.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API}${path}`, { ...init, headers });
}

/** JSON API helper: attaches the token and transparently refreshes it once on 401. */
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const t = getTokens();
  let res = await send(path, init, t?.access);

  if (res.status === 401 && t?.refresh) {
    const r = await send('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: t.refresh }) });
    if (r.ok) {
      const d = await r.json();
      setTokens({ access: d.token, refresh: d.refreshToken });
      res = await send(path, init, d.token);
    } else {
      setTokens(null);
    }
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? 'Request failed');
  return data as T;
}

export const body = (v: unknown): RequestInit => ({ body: JSON.stringify(v) });
