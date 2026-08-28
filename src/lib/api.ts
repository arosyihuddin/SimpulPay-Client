// fetch wrapper — cookie httpOnly admin session, JSON.
// VITE_API_BASE: base URL backend. Kosong => same-origin (dev via proxy / deploy gabung).
// Deploy terpisah: isi mis. https://api.gomerch.com
export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') || '';

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method || 'GET',
    credentials: 'include',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data: any = {};
  try { data = await res.json(); } catch {
    const err: any = new Error(`Gagal terhubung ke server (${path})`);
    err.status = 502;
    throw err;
  }
  if (!res.ok) {
    const err: any = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const admin = {
  setupStatus: () => api<{ needsSetup: boolean; configDone: boolean }>('/admin/setup-status'),
  setupDb: (driver: 'sqlite' | 'postgres', url?: string) => api<{ needsRestart: boolean }>('/admin/setup-db', { method: 'POST', body: { driver, url } }),
  setup: (username: string, password: string) => api('/admin/setup', { method: 'POST', body: { username, password } }),
  login: (username: string, password: string) => api('/admin/login', { method: 'POST', body: { username, password } }),
  logout: () => api('/admin/logout', { method: 'POST' }),
  me: () => api('/admin/me'),
  dashboard: () => api<any>('/admin/dashboard'),
  createQris: (amount: number) => api<any>('/admin/qris', { method: 'POST', body: { amount } }),
  listQris: (limit = 50, offset = 0) => api<any>(`/admin/qris?limit=${limit}&offset=${offset}`),
  transactions: (page = 1, pageSize = 20) => api<any>(`/admin/transactions?page=${page}&pageSize=${pageSize}`),
  logs: (limit = 100, offset = 0) => api<any>(`/admin/logs?limit=${limit}&offset=${offset}`),
  settings: () => api<any>('/admin/settings'),
  otpRequest: (phone: string) => api<any>('/admin/otp-request', { method: 'POST', body: { phone } }),
  otpVerify: (phone: string, otp: string, otp_token: string, unique_id?: string) => api<any>('/admin/otp-verify', { method: 'POST', body: { phone, otp, otp_token, unique_id } }),
  refreshSession: () => api<any>('/admin/refresh-session', { method: 'POST' }),
  deleteGoBizSession: () => api<any>('/admin/gobiz-session', { method: 'DELETE' }),
  parseQrisImage: (image: string) => api<any>('/admin/qris-parse', { method: 'POST', body: { image } }),
  saveQrisStatic: (code: string) => api<any>('/admin/qris-static', { method: 'POST', body: { code } }),
  saveMerchantId: (merchant_id: string) => api<any>('/admin/merchant-id', { method: 'POST', body: { merchant_id } }),
  generateApiKey: (action: 'generate' | 'delete' = 'generate') => api<any>('/admin/api-key', { method: 'POST', body: { action } }),
  changePassword: (username: string, old_password: string, new_password: string) => api<any>('/admin/change-password', { method: 'POST', body: { username, old_password, new_password } }),
};

export const fmtIDR = (n: number | null | undefined) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n ?? 0);

export const fmtTime = (iso: string | number | null | undefined) => {
  if (!iso) return '-';
  const d = new Date(typeof iso === 'number' ? iso : iso);
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleString('id-ID');
};