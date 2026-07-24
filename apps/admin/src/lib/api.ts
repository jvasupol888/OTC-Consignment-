/** API client for calling NestJS backend */
export const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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
    let msg = body.message ?? `API error ${res.status}`;
    if (body.errors?.fieldErrors) {
      const errs = Object.values(body.errors.fieldErrors).flat();
      if (errs.length > 0) msg += `: ${errs.join(', ')}`;
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiFetch<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: (token: string) =>
    apiFetch<{ id: string; username: string; role: string; fullName: string }>('/auth/me', {
      token,
    }),
};

export const productsApi = {
  list: (token: string) =>
    apiFetch<any[]>('/products', { token }),
  get: (id: string, token: string) =>
    apiFetch<any>(`/products/${id}`, { token }),
  create: (data: any, token: string) =>
    apiFetch<any>('/products', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
  bulkImport: (data: any[], token: string) =>
    apiFetch<any>('/products/bulk', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any, token: string) =>
    apiFetch<any>(`/products/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    }),
  delete: (id: string, token: string) =>
    apiFetch<any>(`/products/${id}`, {
      method: 'DELETE',
      token,
    }),
};

export const storesApi = {
  list: (token: string) =>
    apiFetch<any[]>('/stores', { token }),
  get: (id: string, token: string) =>
    apiFetch<any>(`/stores/${id}`, { token }),
  create: (data: any, token: string) =>
    apiFetch<any>('/stores', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
  bulkImport: (data: any[], token: string) =>
    apiFetch<any>('/stores/bulk', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any, token: string) =>
    apiFetch<any>(`/stores/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    }),
  transfer: (storeId: string, newUserId: string, token: string) =>
    apiFetch<any>('/stores/transfer', {
      method: 'POST',
      token,
      body: JSON.stringify({ storeId, newUserId }),
    }),
  delete: (id: string, token: string) =>
    apiFetch<any>(`/stores/${id}`, {
      method: 'DELETE',
      token,
    }),
};

export const usersApi = {
  list: (token: string) =>
    apiFetch<any[]>('/users', { token }),
  get: (id: string, token: string) =>
    apiFetch<any>(`/users/${id}`, { token }),
  create: (data: any, token: string) =>
    apiFetch<any>('/users', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
  bulkImport: (data: any[], token: string) =>
    apiFetch<any>('/users/bulk', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any, token: string) =>
    apiFetch<any>(`/users/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(data),
    }),
  delete: (id: string, token: string) =>
    apiFetch<any>(`/users/${id}`, {
      method: 'DELETE',
      token,
    }),
};

export const inventoryApi = {
  list: (token: string, query?: { locationType?: string; saleUserId?: string }) => {
    const params = new URLSearchParams();
    if (query?.locationType) params.append('locationType', query.locationType);
    if (query?.saleUserId) params.append('saleUserId', query.saleUserId);
    const qStr = params.toString();
    return apiFetch<any[]>(`/inventory${qStr ? '?' + qStr : ''}`, { token });
  },
};

export const transactionsApi = {
  list: (token: string, query?: { createdBy?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (query?.createdBy) params.append('createdBy', query.createdBy);
    if (query?.status) params.append('status', query.status);
    const qStr = params.toString();
    return apiFetch<any[]>(`/transactions${qStr ? '?' + qStr : ''}`, { token });
  },
  pending: (token: string) =>
    apiFetch<any[]>('/transactions/pending', { token }),
  get: (docNo: string, token: string) =>
    apiFetch<any>(`/transactions/${docNo}`, { token }),
  submit: (data: any, token: string) =>
    apiFetch<any>('/transactions', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    }),
  approve: (docNo: string, token: string) =>
    apiFetch<any>(`/transactions/${docNo}/approve`, {
      method: 'POST',
      token,
    }),
  reject: (docNo: string, remark: string, token: string) =>
    apiFetch<any>(`/transactions/${docNo}/reject`, {
      method: 'POST',
      token,
      body: JSON.stringify({ remark }),
    }),
  cancel: (docNo: string, remark: string, token: string) =>
    apiFetch<any>(`/transactions/${docNo}/cancel`, {
      method: 'POST',
      token,
      body: JSON.stringify({ remark }),
    }),
};

export const dashboardApi = {
  getStats: (token: string, query?: { startDate?: string; endDate?: string; saleUserId?: string }) => {
    const params = new URLSearchParams();
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.saleUserId) params.append('saleUserId', query.saleUserId);
    const qStr = params.toString();
    return apiFetch<any>(`/dashboard/stats${qStr ? '?' + qStr : ''}`, { token });
  },
  getMobileStats: (token: string) =>
    apiFetch<any>('/dashboard/mobile', { token }),
};

export const uploadApi = {
  uploadFile: async (file: File, token: string) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE}/api/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `File upload error ${res.status}`);
    }
    return res.json() as Promise<{ fileName: string; evidenceKey: string; url: string }>;
  },
};
