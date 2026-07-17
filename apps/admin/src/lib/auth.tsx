'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore, type AuthUser } from './api';

interface AuthCtx {
  user: AuthUser | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(tokenStore.getUser());
    setReady(true);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api<{ accessToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.user.role === 'SALE') {
      throw new Error('บัญชีเซลล์ให้ใช้งานผ่านแอปมือถือ');
    }
    tokenStore.set(res.accessToken, res.user);
    setUser(res.user);
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
    window.location.href = '/login';
  };

  return <Ctx.Provider value={{ user, ready, login, logout }}>{children}</Ctx.Provider>;
}
