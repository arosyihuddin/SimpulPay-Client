export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ||
  "";

export async function api<T = any>(
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

// Tambah merchant_id (query param) ke path kalau ada.
const withMerchant = (path: string, merchantId?: string | null) =>
  merchantId
    ? `${path}${path.includes("?") ? "&" : "?"}merchant_id=${encodeURIComponent(merchantId)}`
    : path;

export const admin = {
  // Setup bootstrap — public, tanpa prefix.
  setupStatus: () =>
    api<{ needsSetup: boolean; configDone: boolean }>("/admin/setup-status"),
  setup: (username: string, password: string) =>
    api("/admin/setup", { method: "POST", body: { username, password } }),

  // Auth — public login/logout, /me pakai cookie session (customer guard).
  login: (username: string, password: string) =>
    api("/login", { method: "POST", body: { username, password } }),
  logout: () => api("/logout", { method: "POST" }),
  me: () => api("/me"),
  changePassword: (
    username: string,
    old_password: string,
    new_password: string,
  ) =>
    api<any>("/change-password", {
      method: "POST",
      body: { username, old_password, new_password },
    }),

  // Merchant CRUD (customer routes, tanpa /admin)
  listMerchants: () => api<any>("/merchants"),
  createMerchant: (name: string, type = "gopay") =>
    api<any>("/merchants", { method: "POST", body: { name, type } }),
  updateMerchant: (id: string, patch: Record<string, unknown>) =>
    api<any>(`/merchants/${id}`, { method: "PATCH", body: patch }),
  deleteMerchant: (id: string) =>
    api<any>(`/merchants/${id}`, { method: "DELETE" }),

  // Per-merchant: dashboard, qris, transaksi, GoBiz (customer routes)
  dashboard: (merchantId?: string | null) =>
    api<any>(withMerchant("/dashboard", merchantId)),
  createQris: (amount: number, merchantId?: string | null) =>
    api<any>(withMerchant("/qris", merchantId), {
      method: "POST",
      body: { amount },
    }),
  listQris: (limit = 50, offset = 0, merchantId?: string | null) =>
    api<any>(withMerchant(`/qris?limit=${limit}&offset=${offset}`, merchantId)),
  transactions: (page = 1, pageSize = 20, merchantId?: string | null) =>
    api<any>(
      withMerchant(
        `/transactions?page=${page}&pageSize=${pageSize}`,
        merchantId,
      ),
    ),
  otpRequest: (phone: string) =>
    api<any>("/otp-request", { method: "POST", body: { phone } }),
  otpVerify: (
    phone: string,
    otp: string,
    otp_token: string,
    unique_id: string | undefined,
    merchantId?: string | null,
  ) =>
    api<any>(withMerchant("/otp-verify", merchantId), {
      method: "POST",
      body: { phone, otp, otp_token, unique_id },
    }),
  refreshSession: (merchantId?: string | null) =>
    api<any>(withMerchant("/refresh-session", merchantId), {
      method: "POST",
    }),
  deleteGoBizSession: (merchantId?: string | null) =>
    api<any>(withMerchant("/gobiz-session", merchantId), {
      method: "DELETE",
    }),
  parseQrisImage: (image: string) =>
    api<any>("/qris-parse", { method: "POST", body: { image } }),
  saveQrisStatic: (code: string, merchantId?: string | null) =>
    api<any>(withMerchant("/qris-static", merchantId), {
      method: "POST",
      body: { code },
    }),
  saveMerchantId: (merchant_id: string, merchantId?: string | null) =>
    api<any>(withMerchant("/merchant-id", merchantId), {
      method: "POST",
      body: { merchant_id },
    }),

  // Settings + API keys (customer routes)
  settings: () => api<any>("/settings"),
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

  // Admin-only: logs, users, billing plans write, subscriptions, invoices
  logs: (limit = 100, offset = 0) =>
    api<any>(`/logs?limit=${limit}&offset=${offset}`),
  listUsers: (limit = 50, offset = 0) =>
    api<any>(`/admin/users?limit=${limit}&offset=${offset}`),
  createUser: (
    username: string,
    password: string,
    role: string,
    extra?: Record<string, unknown>,
  ) =>
    api<any>("/admin/users", {
      method: "POST",
      body: { username, password, role, ...extra },
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
  listInvoices: () => api<any>("/admin/invoices"),
  markInvoicePaid: (id: string) =>
    api<any>(`/admin/invoices/${id}/paid`, { method: "POST" }),
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
