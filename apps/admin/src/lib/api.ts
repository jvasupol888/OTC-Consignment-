/** API client บาง ๆ สำหรับเรียก backend NestJS */
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = opts;
  const res = await fetch(`${BASE}/api${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<{ accessToken: string; refreshToken: string; user: unknown }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
};
