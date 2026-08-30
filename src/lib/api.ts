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

// Tambah merchant_id (query param) ke path kalau ada.
const withMerchant = (path: string, merchantId?: string | null) =>
  merchantId ? `${path}${path.includes('?') ? '&' : '?'}merchant_id=${encodeURIComponent(merchantId)}` : path;

export const admin = {
  setupStatus: () => api<{ needsSetup: boolean; configDone: boolean }>('/admin/setup-status'),
  setup: (username: string, password: string) => api('/admin/setup', { method: 'POST', body: { username, password } }),
  login: (username: string, password: string) => api('/admin/login', { method: 'POST', body: { username, password } }),
  logout: () => api('/admin/logout', { method: 'POST' }),
  me: () => api('/admin/me'),
  changePassword: (username: string, old_password: string, new_password: string) => api<any>('/admin/change-password', { method: 'POST', body: { username, old_password, new_password } }),

  // Merchant
  listMerchants: () => api<any>('/admin/merchants'),
  createMerchant: (name: string, type = 'gopay') => api<any>('/admin/merchants', { method: 'POST', body: { name, type } }),
  updateMerchant: (id: string, patch: Record<string, unknown>) => api<any>(`/admin/merchants/${id}`, { method: 'PATCH', body: patch }),
  deleteMerchant: (id: string) => api<any>(`/admin/merchants/${id}`, { method: 'DELETE' }),

  // Per-merchant: dashboard, qris, transaksi, GoBiz
  dashboard: (merchantId?: string | null) => api<any>(withMerchant('/admin/dashboard', merchantId)),
  createQris: (amount: number, merchantId?: string | null) => api<any>(withMerchant('/admin/qris', merchantId), { method: 'POST', body: { amount } }),
  listQris: (limit = 50, offset = 0, merchantId?: string | null) => api<any>(withMerchant(`/admin/qris?limit=${limit}&offset=${offset}`, merchantId)),
  transactions: (page = 1, pageSize = 20, merchantId?: string | null) => api<any>(withMerchant(`/admin/transactions?page=${page}&pageSize=${pageSize}`, merchantId)),
  logs: (limit = 100, offset = 0) => api<any>(`/admin/logs?limit=${limit}&offset=${offset}`),
  otpRequest: (phone: string) => api<any>('/admin/otp-request', { method: 'POST', body: { phone } }),
  otpVerify: (phone: string, otp: string, otp_token: string, unique_id: string | undefined, merchantId?: string | null) => api<any>(withMerchant('/admin/otp-verify', merchantId), { method: 'POST', body: { phone, otp, otp_token, unique_id } }),
  refreshSession: (merchantId?: string | null) => api<any>(withMerchant('/admin/refresh-session', merchantId), { method: 'POST' }),
  deleteGoBizSession: (merchantId?: string | null) => api<any>(withMerchant('/admin/gobiz-session', merchantId), { method: 'DELETE' }),
  parseQrisImage: (image: string) => api<any>('/admin/qris-parse', { method: 'POST', body: { image } }),
  saveQrisStatic: (code: string, merchantId?: string | null) => api<any>(withMerchant('/admin/qris-static', merchantId), { method: 'POST', body: { code } }),
  saveMerchantId: (merchant_id: string, merchantId?: string | null) => api<any>(withMerchant('/admin/merchant-id', merchantId), { method: 'POST', body: { merchant_id } }),

  // Settings + API keys
  settings: () => api<any>('/admin/settings'),
  createApiKey: (label?: string) => api<any>('/admin/api-keys', { method: 'POST', body: label ? { label } : {} }),
  listApiKeys: () => api<any>('/admin/api-keys'),
  deleteApiKey: (id: string) => api<any>(`/admin/api-keys/${id}`, { method: 'DELETE' }),

  // Users
  listUsers: (limit = 50, offset = 0) => api<any>(`/admin/users?limit=${limit}&offset=${offset}`),
  createUser: (username: string, password: string, role: string, extra?: Record<string, unknown>) => api<any>('/admin/users', { method: 'POST', body: { username, password, role, ...extra } }),
  updateUser: (id: string, patch: Record<string, unknown>) => api<any>(`/admin/users/${id}`, { method: 'PATCH', body: patch }),
  deleteUser: (id: string) => api<any>(`/admin/users/${id}`, { method: 'DELETE' }),

  // Billing
  listPlans: () => api<any>('/admin/plans'),
  createPlan: (plan: Record<string, unknown>) => api<any>('/admin/plans', { method: 'POST', body: plan }),
  updatePlan: (id: string, patch: Record<string, unknown>) => api<any>(`/admin/plans/${id}`, { method: 'PATCH', body: patch }),
  deletePlan: (id: string) => api<any>(`/admin/plans/${id}`, { method: 'DELETE' }),
  listSubscriptions: () => api<any>('/admin/subscriptions'),
  cancelSubscription: (id: string) => api<any>(`/admin/subscriptions/${id}/cancel`, { method: 'POST' }),
  listInvoices: () => api<any>('/admin/invoices'),
  markInvoicePaid: (id: string) => api<any>(`/admin/invoices/${id}/paid`, { method: 'POST' }),

  // Notifications
  listNotifications: () => api<any>('/admin/notifications'),
  markNotificationRead: (id: number) => api<any>(`/admin/notifications/${id}/read`, { method: 'POST' }),
};

export const fmtIDR = (n: number | null | undefined) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n ?? 0);

export const fmtTime = (iso: string | number | null | undefined) => {
  if (!iso) return '-';
  const d = new Date(typeof iso === 'number' ? iso : iso);
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleString('id-ID');
};
