'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, body, getTokens, setTokens } from '@/lib/api';
import type { User } from '@/lib/types';

type AuthResponse = { token: string; refreshToken: string; user: User };
type Ctx = {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (v: { fullName: string; email: string; password: string; stream: string }) => Promise<void>;
  logout: () => void;
};
const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getTokens()) { setLoading(false); return; }
    api<User>('/auth/me').then(setUser).catch(() => setTokens(null)).finally(() => setLoading(false));
  }, []);

  const finish = (r: AuthResponse) => { setTokens({ access: r.token, refresh: r.refreshToken }); setUser(r.user); };

  const login = useCallback(async (email: string, password: string) => {
    finish(await api<AuthResponse>('/auth/login', { method: 'POST', ...body({ email, password }) }));
  }, []);
  const register = useCallback(async (v: { fullName: string; email: string; password: string; stream: string }) => {
    finish(await api<AuthResponse>('/auth/register', { method: 'POST', ...body(v) }));
  }, []);
  const logout = useCallback(() => { setTokens(null); setUser(null); }, []);

  return <AuthCtx.Provider value={{ user, loading, login, register, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>');
  return c;
}
