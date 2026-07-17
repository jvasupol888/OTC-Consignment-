const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const TOKEN_KEY = 'otc_token';
const USER_KEY = 'otc_user';

export interface AuthUser {
  sub: string;
  username: string;
  role: 'SYSTEM_ADMIN' | 'ADMIN' | 'SALE';
  fullName: string;
}

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)),
  getUser: (): AuthUser | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
  set: (token: string, user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = unknown>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
  if (res.status === 401) {
    tokenStore.clear();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'กรุณาเข้าสู่ระบบใหม่');
  }
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, body?.message ?? `เกิดข้อผิดพลาด (${res.status})`);
  }
  return body as T;
}

/** ดาวน์โหลดไฟล์ (xlsx/pdf) ผ่าน token */
export async function apiBlob(path: string): Promise<Blob> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `ดาวน์โหลดไม่สำเร็จ (${res.status})`);
  return res.blob();
}

/** อัปโหลด multipart (xlsx import) */
export async function apiUpload<T = unknown>(path: string, file: File): Promise<T> {
  const token = tokenStore.get();
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE}/api${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, body?.message ?? 'อัปโหลดไม่สำเร็จ');
  return body as T;
}

export function openFile(blob: Blob, download?: string) {
  const url = URL.createObjectURL(blob);
  if (download) {
    const a = document.createElement('a');
    a.href = url;
    a.download = download;
    a.click();
  } else {
    window.open(url, '_blank');
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export const API_BASE = BASE;
