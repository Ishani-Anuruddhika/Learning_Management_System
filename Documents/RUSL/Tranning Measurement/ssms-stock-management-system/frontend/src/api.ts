const BASE: string = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
const TOKEN_KEY = 'ssms_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string | null): void => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized: (() => void) | null = null;
/** App registers a callback so an expired / revoked token sends the user back to sign-in. */
export const setUnauthorizedHandler = (fn: (() => void) | null): void => {
  onUnauthorized = fn;
};

function messageFrom(body: any, fallback: string): string {
  if (body?.errors && typeof body.errors === 'object') {
    const first = Object.values(body.errors)[0];
    if (Array.isArray(first) && first.length > 0) return String(first[0]);
  }
  return body?.message ? String(body.message) : fallback;
}

async function parseBody(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function headers(hasBody: boolean): HeadersInit {
  const token = getToken();
  return {
    Accept: 'application/json',
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(body !== undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && path !== '/login') {
    setToken(null);
    onUnauthorized?.();
  }

  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(messageFrom(data, res.statusText || 'Request failed'), res.status);
  return data as T;
}

/** Fetch a PDF (or any file) with the bearer token and hand it to the browser as a download. */
async function download(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { headers: { ...headers(false), Accept: 'application/pdf' } });

  if (!res.ok) {
    const data = await parseBody(res);
    throw new ApiError(messageFrom(data, 'Could not generate the report'), res.status);
  }

  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const filename = match ? decodeURIComponent(match[1]) : fallbackName;

  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  del: <T>(path: string) => request<T>('DELETE', path),
  download,
};

export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : 'Something went wrong');
