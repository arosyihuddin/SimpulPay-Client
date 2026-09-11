export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ||
  "";

export const googleLoginUrl = `${API_BASE}/auth/google`;

async function api<T = any>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method || "GET",
    credentials: "include",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    const err: any = new Error(`Gagal terhubung ke server (${path})`);
    err.status = 502;
    throw err;
  }
  if (!res.ok) {
    const err: any = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    if (data?.maintenance_mode) err.maintenance_mode = true;
    throw err;
  }
  return data as T;
}

export const admin = {
  // Auth — public login/logout, /me pakai cookie session (customer guard).
  login: (email: string, password: string) =>
    api("/login", { method: "POST", body: { email, password } }),
  logout: () => api("/logout", { method: "POST" }),
  me: () => api("/me"),
  updateProfile: (patch: { name?: string; phone?: string; email?: string }) =>
    api<any>("/profile", { method: "PATCH", body: patch }),
  changePassword: (
    email: string,
    old_password: string,
    new_password: string,
  ) =>
    api<any>("/change-password", {
      method: "POST",
      body: { email, old_password, new_password },
    }),

  // Merchant CRUD (customer routes, tanpa /admin)
  listMerchants: () => api<any>("/merchants"),
  merchantSummary: () => api<any>("/merchants/summary"),
  createMerchant: (name: string, type = "gopay") =>
    api<any>("/merchants", { method: "POST", body: { name, type } }),
  updateMerchant: (id: string, patch: Record<string, unknown>) =>
    api<any>(`/merchants/${id}`, { method: "PATCH", body: patch }),
  deleteMerchant: (id: string) =>
    api<any>(`/merchants/${id}`, { method: "DELETE" }),

  // Per-merchant: dashboard, qris, GoBiz (customer routes)
  dashboard: () => api<any>("/dashboard"),
  createQris: (amount: number, merchantId: string) =>
    api<any>(`/merchants/${merchantId}/qris`, {
      method: "POST",
      body: { amount },
    }),
  getTransactionCode: (id: string) =>
    api<{ data: { code: string; status: string; created_at: number; expires_at: number; merchant_id: string; merchant_name: string } }>(`/transactions/${id}/code`),
  createSandboxQris: (amount: number) =>
    api<any>(`/sandbox/qris`, { method: "POST", body: { amount } }),
  simulateSandboxPay: (id: string) =>
    api<any>(`/sandbox/qris/${id}/simulate-pay`, { method: "POST" }),
  simulateSandboxExpire: (id: string) =>
    api<any>(`/sandbox/qris/${id}/simulate-expire`, { method: "POST" }),

  // Semua transaksi — semua merchant user, filter lewat query
  transactions: (params?: {
    limit?: number;
    offset?: number;
    merchant_id?: string;
    status?: string;
    q?: string;
    created_from?: number;
    created_to?: number;
    expires_from?: number;
    expires_to?: number;
  }) => {
    const clean = Object.fromEntries(
      Object.entries((params as Record<string, unknown>) || {}).filter(
        ([, v]) => v !== undefined && v !== null && v !== "",
      ),
    );
    return api<any>(`/transactions?${new URLSearchParams(clean as any).toString()}`);
  },
  // Transaksi per-merchant
  merchantTransactions: (merchantId: string, limit = 50, offset = 0) =>
    api<any>(`/merchants/${merchantId}/transactions?limit=${limit}&offset=${offset}`),
  recentTransactions: (limit = 5) =>
    api<any>(`/transactions/recent?limit=${limit}`),
  transactionVolume: (range = "7") =>
    api<any>(`/transactions/volume?range=${range}`),

  // GoBiz (customer routes, path `/merchants/:id/*`)
  otpRequest: (merchantId: string, phone: string) =>
    api<any>(`/merchants/${merchantId}/otp-request`, {
      method: "POST",
      body: { phone },
    }),
  otpVerify: (
    merchantId: string,
    phone: string,
    otp: string,
    otp_token: string,
    unique_id?: string,
  ) =>
    api<any>(`/merchants/${merchantId}/otp-verify`, {
      method: "POST",
      body: { phone, otp, otp_token, unique_id },
    }),
  refreshSession: (merchantId: string) =>
    api<any>(`/merchants/${merchantId}/refresh`, { method: "POST" }),
  parseQrisImage: (image: string, merchantId: string) =>
    api<any>(`/merchants/${merchantId}/qris-parse`, {
      method: "POST",
      body: { image },
    }),

  // Konfigurasi gateway per-user (customer routes)
  settings: () => api<any>("/settings"),
  updateSettings: (patch: Record<string, unknown>) =>
    api<any>("/settings", { method: "PATCH", body: patch }),
  webhookInfo: () => api<any>("/settings/webhook"),
  testWebhook: () =>
    api<any>(`/settings/webhook/test`, { method: "POST" }),

  // API keys (customer routes)
  createApiKey: (label?: string, merchantId?: string | null) =>
    api<any>("/api-keys", {
      method: "POST",
      body: {
        ...(label ? { label } : {}),
        merchant_id: merchantId || undefined,
      },
    }),
  listApiKeys: () => api<any>("/api-keys"),
  deleteApiKey: (id: string) =>
    api<any>(`/api-keys/${id}`, { method: "DELETE" }),

  // Notifications (customer routes)
  listNotifications: (opts: { limit?: number; offset?: number } = {}) =>
    api<any>(`/notifications?limit=${opts.limit ?? 50}&offset=${opts.offset ?? 0}`),
  markNotificationRead: (id: number) =>
    api<any>(`/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: () =>
    api<any>(`/notifications/read-all`, { method: "POST" }),

  // Announcements read (customer) + write (admin)
  listAnnouncements: (
    opts: { active?: boolean; limit?: number; offset?: number } = {},
  ) =>
    api<any>(
      `/announcements?${new URLSearchParams({
        limit: String(opts.limit ?? 50),
        offset: String(opts.offset ?? 0),
        ...(opts.active ? { active: "1" } : {}),
      })}`,
    ),
  markAnnouncementRead: (id: number) =>
    api<any>(`/announcements/${id}/read`, { method: "POST" }),
  createAnnouncement: (body: {
    title: string;
    message: string;
    type?: string;
    active?: boolean;
  }) => api<any>("/admin/announcements", { method: "POST", body }),
  updateAnnouncement: (id: number, patch: Record<string, unknown>) =>
    api<any>(`/admin/announcements/${id}`, { method: "PATCH", body: patch }),
  deleteAnnouncement: (id: number) =>
    api<any>(`/admin/announcements/${id}`, { method: "DELETE" }),

  // Langganan saya + invoice (customer)
  mySubscription: () => api<any>("/subscriptions"),
  myInvoices: (params?: { limit?: number; offset?: number }) => {
    const clean = Object.fromEntries(
      Object.entries((params as Record<string, unknown>) || {}).filter(
        ([, v]) => v !== undefined && v !== null && v !== "",
      ),
    );
    return api<any>(`/invoices?${new URLSearchParams(clean as any).toString()}`);
  },
  subscribe: (planId: string, amount = 0) =>
    api<any>("/subscriptions", { method: "POST", body: { plan_id: planId, amount } }),

  // Admin-only: logs, users, billing plans write, subscriptions, invoices, maintenance
  logs: (limit = 100, offset = 0) =>
    api<any>(`/logs?limit=${limit}&offset=${offset}`),
  getMaintenance: () => api<any>("/admin/maintenance"),
  setMaintenance: (on: boolean) =>
    api<any>("/admin/maintenance", { method: "POST", body: { maintenance: on } }),
  listUsers: (params?: { q?: string; limit?: number; offset?: number }) => {
    const clean = Object.fromEntries(
      Object.entries((params as Record<string, unknown>) || {}).filter(
        ([, v]) => v !== undefined && v !== null && v !== "",
      ),
    );
    return api<any>(`/admin/users?${new URLSearchParams(clean as any).toString()}`);
  },
  createUser: (
    email: string,
    password: string,
    role: string,
    extra?: Record<string, unknown>,
  ) =>
    api<any>("/admin/users", {
      method: "POST",
      body: { email, password, role, ...extra },
    }),
  updateUser: (id: string, patch: Record<string, unknown>) =>
    api<any>(`/admin/users/${id}`, { method: "PATCH", body: patch }),
  deleteUser: (id: string) =>
    api<any>(`/admin/users/${id}`, { method: "DELETE" }),
  listPlans: () => api<any>("/plans"),
  createPlan: (plan: Record<string, unknown>) =>
    api<any>("/admin/plans", { method: "POST", body: plan }),
  updatePlan: (id: string, patch: Record<string, unknown>) =>
    api<any>(`/admin/plans/${id}`, { method: "PATCH", body: patch }),
  deletePlan: (id: string) =>
    api<any>(`/admin/plans/${id}`, { method: "DELETE" }),
  listSubscriptions: (params?: {
    user_id?: string;
    status?: string;
    start_from?: number;
    start_to?: number;
    end_from?: number;
    end_to?: number;
    include_free?: boolean;
    q?: string;
    limit?: number;
    offset?: number;
  }) => {
    // Buang key kosong/undefined — jangan serialize jadi "undefined" di URL.
    const clean = Object.fromEntries(
      Object.entries((params as Record<string, unknown>) || {}).filter(
        ([, v]) => v !== undefined && v !== null && v !== "",
      ),
    );
    return api<any>(`/admin/subscribers?${new URLSearchParams(clean as any).toString()}`);
  },
  cancelSubscription: (id: string) =>
    api<any>(`/admin/subscribers/${id}/cancel`, { method: "POST" }),

  // Admin invoice management
  listAllInvoices: (params?: { user_id?: string; subscription_id?: string; status?: string; q?: string; limit?: number; offset?: number }) => {
    // Buang key kosong/undefined — jangan serialize jadi "undefined" di URL.
    const clean = Object.fromEntries(
      Object.entries((params as Record<string, unknown>) || {}).filter(
        ([, v]) => v !== undefined && v !== null && v !== "",
      ),
    );
    return api<any>(`/admin/invoices?${new URLSearchParams(clean as any).toString()}`);
  },
  markInvoicePaid: (id: string) =>
    api<any>(`/admin/invoices/${id}/paid`, { method: "POST" }),
  rejectInvoice: (id: string) =>
    api<any>(`/admin/invoices/${id}/reject`, { method: "POST" }),
};

export const fmtIDR = (n: number | null | undefined) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n ?? 0);

export const fmtTime = (ts: string | number | null | undefined) => {
  if (ts == null || ts === "") return "-";
  const ms = typeof ts === "number" ? ts : /^\d+$/.test(String(ts).trim()) ? Number(ts) : Date.parse(String(ts));
  if (!Number.isFinite(ms)) return String(ts);
  const d = new Date(ms);
  return isNaN(d.getTime()) ? String(ts) : d.toLocaleString("id-ID");
};
