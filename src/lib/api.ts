export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ||
  "";

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
    throw err;
  }
  return data as T;
}

const withMerchant = (path: string, merchantId?: string | null) =>
  merchantId
    ? `${path}${path.includes("?") ? "&" : "?"}merchant_id=${encodeURIComponent(merchantId)}`
    : path;

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
  createQris: (amount: number, merchantId?: string | null) =>
    api<any>(withMerchant("/qris", merchantId), {
      method: "POST",
      body: { amount },
    }),
  getTransactionCode: (id: string) =>
    api<{ data: { code: string } }>(`/transactions/${id}/code`),

  // Semua transaksi — semua merchant user, filter lewat query
  transactions: (limit = 50, offset = 0, merchantId?: string | null) =>
    api<any>(
      `/transactions?limit=${limit}&offset=${offset}${merchantId ? `&merchant_id=${encodeURIComponent(merchantId)}` : ""}`,
    ),
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
  listNotifications: () => api<any>("/notifications"),
  markNotificationRead: (id: number) =>
    api<any>(`/notifications/${id}/read`, { method: "POST" }),

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
  myInvoices: () => api<any>("/invoices"),
  subscribe: (planId: string, amount = 0) =>
    api<any>("/subscriptions", { method: "POST", body: { plan_id: planId, amount } }),

  // Admin-only: logs, users, billing plans write, subscriptions, invoices
  logs: (limit = 100, offset = 0) =>
    api<any>(`/logs?limit=${limit}&offset=${offset}`),
  listUsers: (limit = 50, offset = 0) =>
    api<any>(`/admin/users?limit=${limit}&offset=${offset}`),
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
  listSubscriptions: () => api<any>("/admin/subscriptions"),
  cancelSubscription: (id: string) =>
    api<any>(`/admin/subscriptions/${id}/cancel`, { method: "POST" }),

  // Admin invoice management
  listAllInvoices: (params?: { user_id?: string; subscription_id?: string; status?: string; limit?: number; offset?: number }) =>
    api<any>(`/admin/invoices?${new URLSearchParams((params || {}) as any).toString()}`),
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

export const fmtTime = (iso: string | number | null | undefined) => {
  if (!iso) return "-";
  const d = new Date(typeof iso === "number" ? iso : iso);
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleString("id-ID");
};
