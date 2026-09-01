<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { admin } from "$lib/api";
  import { auth, checkAuth } from "$lib/auth.svelte";
  import { theme, toggleTheme } from "$lib/theme.svelte";
  import Logo from "$lib/components/Logo.svelte";
  import Toast from "$lib/components/Toast.svelte";
  let { children } = $props();

  // Grup menu: USER_LINKS untuk semua role, ADMIN_LINKS khusus admin.
  // Logs/Settings/Developer terbuka juga untuk user; Plans & Users admin-only.
  const USER_LINKS = [
    {
      to: "/dashboard",
      label: "Dashboard",
      icon: "fa-solid fa-chart-pie",
      title: "Dashboard",
      subtitle: "Statistik dan ringkasan performa gateway",
    },
    {
      to: "/merchants",
      label: "Merchants",
      icon: "fa-solid fa-store",
      title: "Merchants",
      subtitle: "Kelola channel e-wallet & gateway merchant",
    },
    {
      to: "/transactions",
      label: "Transaksi",
      icon: "fa-solid fa-receipt",
      title: "Transaksi",
      subtitle: "Semua transaksi pembayaran dari semua merchant",
    },
    {
      to: "/billing",
      label: "Billing",
      icon: "fa-solid fa-credit-card",
      title: "Billing",
      subtitle: "Langganan & tagihan saya",
    },
    {
      to: "/logs",
      label: "Logs",
      icon: "fa-solid fa-list",
      title: "Aktivitas Sistem",
      subtitle: "Log aksi dan event sistem gateway",
    },
    {
      to: "/settings",
      label: "Settings",
      icon: "fa-solid fa-gear",
      title: "Pengaturan Akun",
      subtitle: "Kredensial dan keamanan akun",
    },
  ];
  // Developer = group collapse: Docs + API Key.
  const DEVELOPER = {
    to: "/developer",
    label: "Developer",
    icon: "fa-solid fa-code",
  };
  const DEV_LINKS = [
    {
      to: "/developer",
      label: "Docs",
      icon: "fa-solid fa-book",
      title: "Dokumentasi API",
      subtitle: "Dokumentasi API v1 & Swagger UI",
    },
    {
      to: "/developer/api-keys",
      label: "API Key",
      icon: "fa-solid fa-key",
      title: "API Keys",
      subtitle: "Kelola API key untuk integrasi aplikasi",
    },
  ];
  const ADMIN_LINKS = [
    {
      to: "/admin/announcements",
      label: "Announcements",
      icon: "fa-solid fa-bullhorn",
      title: "Announcements",
      subtitle: "Broadcast pengumuman ke semua user",
    },
    {
      to: "/admin/billing",
      label: "Plans",
      icon: "fa-solid fa-tags",
      title: "Plans",
      subtitle: "Kelola paket langganan",
    },
    {
      to: "/admin/billing/subscribers",
      label: "Subscribers",
      icon: "fa-solid fa-user-group",
      title: "Subscribers",
      subtitle: "Kelola langganan semua subscriber",
    },
    {
      to: "/admin/billing/invoices",
      label: "Invoices",
      icon: "fa-solid fa-file-invoice",
      title: "Invoices",
      subtitle: "Kelola & approve invoice pembayaran",
    },
    {
      to: "/admin/users",
      label: "Users",
      icon: "fa-solid fa-users",
      title: "Users",
      subtitle: "Kelola akun pengguna sistem",
    },
  ];
  const ALL_LINKS = [...USER_LINKS, ...ADMIN_LINKS];
  const LINKS = $derived(auth.role === "admin" ? ALL_LINKS : USER_LINKS);
  // Halaman yang diblokir untuk non-admin.
  const ADMIN_ONLY = ["/admin/announcements", "/admin/billing", "/admin/users"];

  const TITLES: Record<string, [string, string]> = Object.fromEntries(
    [...ALL_LINKS, ...DEV_LINKS].map((l) => [l.to, [l.title, l.subtitle]]),
  );
  TITLES["/settings/password"] = [
    "Ganti Password",
    "Ubah kata sandi akun admin",
  ];
  TITLES["/merchants/transaction"] = [
    "Transaksi Merchant",
    "Transaksi dari merchant terpilih",
  ];

  const activePath = $derived($page.url.pathname);

  // Auth guard — redirect unauthed, block non-admin from admin pages.
  $effect(() => {
    if (auth.ready && !auth.authed) goto("/");
    else if (
      auth.ready &&
      auth.authed &&
      auth.role !== "admin" &&
      ADMIN_ONLY.some((p) => activePath.startsWith(p))
    )
      goto("/dashboard");
  });
  const isActive = (to: string) =>
    activePath === to || (to === "/merchants" && activePath.startsWith("/merchants/"));
  // Developer collapse — auto-buka kalau route aktif di dalamnya.
  let devOpen = $state(false);
  $effect(() => {
    if (activePath.startsWith(DEVELOPER.to)) devOpen = true;
  });
  const meta = $derived.by(() => {
    const [t, s] = TITLES[activePath] || TITLES["/dashboard"];
    return { title: t, subtitle: s };
  });

  // Notifikasi — data real dari backend (GET /admin/notifications).
  let notifOpen = $state(false);
  let notifLoading = $state(false);
  interface Notif {
    id: number;
    type: string;
    title: string;
    message: string;
    read: boolean;
    created_at: number;
  }
  let notifs = $state<Notif[]>([]);
  let unread = $state(0);
  async function loadNotifs() {
    if (notifLoading) return;
    notifLoading = true;
    try {
      const r = await admin.listNotifications();
      notifs = r.data.notifications;
      unread = r.data.unread;
    } catch {
      /* non-kritis, diam */
    } finally {
      notifLoading = false;
    }
  }
  const notifCount = $derived(unread);
  const notifMeta = (type: string) =>
    type === "payout" || type === "settlement"
      ? { icon: "fa-solid fa-arrow-down-left", cls: "text-emerald-500" }
      : type === "fraud" || type === "warning"
        ? { icon: "fa-solid fa-shield-alert", cls: "text-rose-500" }
        : type === "info"
          ? { icon: "fa-solid fa-circle-info", cls: "text-blue-500" }
          : { icon: "fa-solid fa-bell", cls: "text-[var(--accent)]" };
  const fmtNotifTime = (n: number) => {
    const d = new Date(n);
    const m = Math.round((Date.now() - n) / 60000);
    if (m < 1) return "baru saja";
    if (m < 60) return `${m} menit lalu`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} jam lalu`;
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  };
  async function markRead(n: Notif) {
    if (n.read) return;
    notifs = notifs.map((x) => (x.id === n.id ? { ...x, read: true } : x));
    unread = Math.max(0, unread - 1);
    await admin.markNotificationRead(n.id).catch(() => {});
  }
  async function markAllRead() {
    const unreadList = notifs.filter((n) => !n.read);
    notifs = notifs.map((x) => ({ ...x, read: true }));
    unread = 0;
    await Promise.all(
      unreadList.map((n) => admin.markNotificationRead(n.id).catch(() => {})),
    );
  }

  async function logout() {
    await admin.logout().catch(() => {});
    await checkAuth();
    goto("/");
  }
</script>

{#if auth.ready && auth.authed}
  <div class="min-h-screen flex">
    <!-- Sidebar — desktop only, clay (style baru via app.css) -->
    <aside
      class="hidden lg:flex fixed inset-y-0 left-0 z-50 w-72 p-6 flex-col justify-between bg-[var(--bg-base)] border-r border-slate-300/40 dark:border-slate-800/40"
    >
      <div>
        <div class="flex items-center gap-3 mb-8">
          <div
            class="tactile-btn w-12 h-12 flex items-center justify-center text-[var(--accent)] text-xl"
          >
            <span class="text-[var(--accent)]"><Logo /></span>
          </div>
          <div>
            <h1 class="text-xl font-bold tracking-wide">
              GoMerch<span class="text-[var(--accent)]"> API</span>
            </h1>
            <p class="text-xs text-[var(--text-muted)] font-medium">
              Merchant Gateway
            </p>
          </div>
        </div>

        <nav class="space-y-3">
          {#each USER_LINKS as l (l.to)}
            <a
              href={l.to}
              class="tactile-btn flex items-center gap-3 px-4 py-3.5 text-sm font-semibold {isActive(
                l.to,
              )
                ? 'active text-[var(--accent)]'
                : 'text-slate-500 dark:text-slate-400'}"
            >
              <i class="{l.icon} w-5"></i>
              <span>{l.label}</span>
            </a>
          {/each}

          <!-- Developer group (collapse) -->
          <div class="space-y-1.5">
            <button
              onclick={() => (devOpen = !devOpen)}
              class="tactile-btn w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold {devOpen
                ? 'active text-[var(--accent)]'
                : 'text-slate-500 dark:text-slate-400'} cursor-pointer"
              aria-expanded={devOpen}
            >
              <i class="{DEVELOPER.icon} w-5"></i>
              <span class="flex-1 text-left">{DEVELOPER.label}</span>
              <i
                class="fa-solid fa-chevron-down text-[10px] transition-transform {devOpen
                  ? 'rotate-180'
                  : ''}"
              ></i>
            </button>
            {#if devOpen}
              <div class="space-y-1.5 pl-3">
                {#each DEV_LINKS as l (l.to)}
                  <a
                    href={l.to}
                    class="tactile-btn flex items-center gap-3 px-4 py-2.5 text-sm font-semibold {isActive(
                      l.to,
                    )
                      ? 'active text-[var(--accent)]'
                      : 'text-slate-500 dark:text-slate-400'}"
                  >
                    <i class="{l.icon} w-5"></i>
                    <span>{l.label}</span>
                  </a>
                {/each}
              </div>
            {/if}
          </div>

          {#if auth.role === "admin"}
            <div
              class="pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
            >
              Admin
            </div>
            {#each ADMIN_LINKS as l (l.to)}
              <a
                href={l.to}
                class="tactile-btn flex items-center gap-3 px-4 py-3.5 text-sm font-semibold {isActive(
                  l.to,
                )
                  ? 'active text-[var(--accent)]'
                  : 'text-slate-500 dark:text-slate-400'}"
              >
                <i class="{l.icon} w-5"></i>
                <span>{l.label}</span>
              </a>
            {/each}
          {/if}
        </nav>
      </div>

      <!-- User + logout -->
      <div
        class="tactile-inset p-4 rounded-xl mt-6 flex items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2 min-w-0">
          <div
            class="tactile-btn w-9 h-9 flex items-center justify-center text-[var(--accent)] shrink-0"
          >
            <i class="fa-solid fa-user"></i>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-bold truncate">{auth.name || auth.email}</p>
            <p class="text-[11px] text-[var(--text-muted)]">
              {auth.role === "admin" ? "Admin" : "User"}
            </p>
          </div>
        </div>
        <button
          onclick={logout}
          class="tactile-btn w-9 h-9 flex items-center justify-center hover:text-red-500 shrink-0"
          title="Logout"
        >
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </aside>

    <!-- Bottom nav mobile — tambah logout untuk customer (admin punya di Settings) -->
    <nav
      class="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-[var(--bg-base)]/95 backdrop-blur border-t border-slate-300/40 dark:border-slate-800/40 px-2 py-1.5 flex items-center"
    >
      {#each LINKS as l (l.to)}
        <a
          href={l.to}
          class="flex flex-col items-center gap-0.5 flex-1 py-1.5 px-1 rounded-xl text-[10px] font-semibold transition-all duration-200 active:scale-[0.95] {isActive(
            l.to,
          )
            ? 'active text-[var(--accent)]'
            : 'text-[var(--text-muted)]'}"
        >
          <i class="{l.icon} text-base leading-none"></i>
          {l.label}
        </a>
      {/each}
      <button
        onclick={logout}
        class="flex flex-col items-center gap-0.5 flex-1 py-1.5 px-1 rounded-xl text-[10px] font-semibold text-[var(--text-muted)] hover:text-red-500 cursor-pointer"
        title="Logout"
      >
        <i class="fa-solid fa-right-from-bracket text-base leading-none"></i>
        Logout
      </button>
    </nav>

    <!-- Main wrapper -->
    <div
      class="flex-1 lg:ml-72 flex flex-col justify-between min-h-screen py-8 px-4 sm:px-6 lg:px-8"
    >
      <!-- Top header -->
      <header
        class="max-w-6xl mx-auto w-full flex justify-between items-center gap-3 mb-8 px-2"
      >
        <div class="min-w-0">
          <h2 class="text-lg font-bold tracking-wide">{meta.title}</h2>
          <p class="text-xs text-[var(--text-muted)] font-medium truncate">
            {meta.subtitle}
          </p>
        </div>
        <div class="flex items-center gap-3 sm:gap-4">
          <!-- Search box (UI-only, dekoratif ala mockup) -->
          <div class="relative hidden md:block w-56 lg:w-72">
            <i
              class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm"
            ></i>
            <input
              type="text"
              placeholder="Cari transaksi, merchant..."
              class="w-full tactile-inset pl-10 pr-4 py-2.5 text-sm focus:outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>

          <button
            onclick={toggleTheme}
            class="tactile-btn w-11 h-11 flex items-center justify-center hover:text-[var(--accent)]"
            title="Ganti Tema Light/Dark"
          >
            <i class={theme.dark ? "fa-solid fa-sun" : "fa-solid fa-moon"}></i>
          </button>

          <!-- Notifications -->
          <div class="relative">
            <button
              onclick={() => {
                notifOpen = !notifOpen;
                if (!notifOpen) return;
                loadNotifs();
              }}
              class="tactile-btn w-11 h-11 flex items-center justify-center relative hover:text-[var(--accent)]"
              title="Notifikasi"
            >
              <i class="fa-solid fa-bell"></i>
              {#if notifCount > 0}
                <span
                  class="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow"
                  >{notifCount}</span
                >
              {/if}
            </button>
            {#if notifOpen}
              <!-- Backdrop tutup saat klik luar -->
              <button
                type="button"
                aria-label="Tutup notifikasi"
                class="fixed inset-0 z-40 cursor-default"
                onclick={() => (notifOpen = false)}
              ></button>
              <div
                class="absolute right-0 mt-3 w-80 rounded-2xl tactile-box p-4 z-50"
              >
                <div
                  class="flex justify-between items-center mb-3 pb-2 border-b border-[var(--border-subtle)]"
                >
                  <span class="font-bold text-sm">Notifikasi Gateway</span>
                  {#if notifCount > 0}
                    <button
                      type="button"
                      class="text-xs text-[var(--accent)] font-semibold cursor-pointer"
                      onclick={markAllRead}>Tandai dibaca</button
                    >
                  {/if}
                </div>
                <div class="space-y-2 text-xs">
                  {#if notifLoading && notifs.length === 0}
                    <p
                      class="text-center text-[var(--text-muted)] py-4 font-semibold"
                    >
                      Memuat...
                    </p>
                  {:else if notifs.length === 0}
                    <p
                      class="text-center text-[var(--text-muted)] py-4 font-semibold"
                    >
                      Belum ada notifikasi
                    </p>
                  {:else}
                    {#each notifs as n (n.id)}
                      <button
                        type="button"
                        onclick={() => markRead(n)}
                        class="w-full text-left p-2.5 rounded-xl tactile-inset flex items-start space-x-2 {!n.read
                          ? 'opacity-100'
                          : 'opacity-50'}"
                      >
                        <i
                          class="{notifMeta(n.type).icon} {notifMeta(n.type)
                            .cls} mt-0.5 flex-shrink-0"
                        ></i>
                        <div class="min-w-0">
                          <p class="font-semibold truncate">{n.title}</p>
                          {#if n.message}<p
                              class="text-[var(--text-muted)] truncate"
                            >
                              {n.message}
                            </p>{/if}
                          <span class="text-[var(--text-muted)] text-[10px]"
                            >{fmtNotifTime(n.created_at)}</span
                          >
                        </div>
                        {#if !n.read}<span
                            class="ml-auto mt-1 w-2 h-2 rounded-full bg-rose-500 shrink-0"
                          ></span>{/if}
                      </button>
                    {/each}
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </header>

      <!-- Dynamic view -->
      <main class="max-w-6xl mx-auto w-full flex-1 pb-16 lg:pb-0">
        {@render children()}
      </main>

      <footer
        class="max-w-6xl mx-auto w-full text-center text-xs text-slate-400 dark:text-slate-500 mt-8 pb-16 lg:pb-0"
      >
        <p>&copy; 2026 GoMerch API Merchant Gateway. All rights reserved.</p>
      </footer>
    </div>
  </div>

  <Toast />
{/if}
