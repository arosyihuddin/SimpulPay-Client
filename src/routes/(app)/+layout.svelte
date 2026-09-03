<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { admin } from "$lib/api";
  import { auth, checkAuth } from "$lib/auth.svelte";
  import { theme, toggleTheme } from "$lib/theme.svelte";
  import Logo from "$lib/components/Logo.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";
  import Toast from "$lib/components/Toast.svelte";
  import { addToast } from "$lib/toast.svelte";
  import { useWs } from "$lib/useWs";
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
      label: "Billing & Usage",
      icon: "fa-solid fa-credit-card",
      title: "Billing & Usage",
      subtitle: "Langganan, tagihan & pemakaian",
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
    {
      to: "/developer/webhook",
      label: "Webhook",
      icon: "fa-solid fa-bolt",
      title: "Webhook",
      subtitle: "Notifikasi transaksi ke URL aplikasi kamu",
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
      to: "/admin/plans",
      label: "Plans",
      icon: "fa-solid fa-tags",
      title: "Plans",
      subtitle: "Kelola paket langganan",
    },
    {
      to: "/admin/subscribers",
      label: "Subscribers",
      icon: "fa-solid fa-user-group",
      title: "Subscribers",
      subtitle: "Kelola langganan semua subscriber",
    },
    {
      to: "/admin/invoices",
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
    {
      to: "/admin/maintenance",
      label: "Maintenance",
      icon: "fa-solid fa-screwdriver-wrench",
      title: "Mode Maintenance",
      subtitle: "Aktifkan/nonaktifkan mode maintenance",
    },
  ];
  const ALL_LINKS = [...USER_LINKS, ...ADMIN_LINKS];
  // Mobile: 4 item utama di bottom nav, sisanya masuk drawer "Lainnya".
  const MOBILE_PRIMARY = USER_LINKS.slice(0, 4);
  const MOBILE_MORE = $derived([
    ...USER_LINKS.slice(4),
    ...(auth.role === "admin" ? ADMIN_LINKS : []),
  ]);
  // Halaman yang diblokir untuk non-admin.
  const ADMIN_ONLY = ["/admin/announcements", "/admin/plans", "/admin/subscribers", "/admin/invoices", "/admin/users", "/admin/maintenance"];

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

  const activePath = $derived(page.url.pathname);

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
    activePath === to || activePath.startsWith(to + "/");
  // Lainnya ikut aktif kalau halaman sekarang masuk drawer mobile.
  const moreActive = $derived(MOBILE_MORE.some((l) => isActive(l.to)));
  // Developer collapse — auto-buka/tutup ikut route aktif.
  let devOpen = $state(false);
  $effect(() => {
    devOpen = activePath.startsWith(DEVELOPER.to);
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
  const NOTIF_PAGE = 20;
  let notifLoaded = $state(0); // jumlah baris real yg udah di-fetch (offset berikutnya)
  let notifHasMore = $state(false);
  let notifBusy = $state(false); // lagi muat halaman berikutnya
  async function loadNotifs(reset = true) {
    if (notifBusy || (!reset && !notifHasMore)) return;
    if (reset) {
      notifLoading = true;
      notifs = [];
      notifLoaded = 0;
    }
    notifBusy = true;
    try {
      const r = await admin.listNotifications({ limit: NOTIF_PAGE, offset: notifLoaded });
      const fresh: Notif[] = r.data.notifications;
      if (reset) {
        notifs = fresh;
      } else {
        // skip yg udah ada (id dummy inject WS negatif gak clash)
        const seen = new Set(notifs.map((n) => n.id));
        notifs = [...notifs, ...fresh.filter((n) => !seen.has(n.id))];
      }
      notifLoaded += fresh.length;
      notifHasMore = fresh.length === NOTIF_PAGE;
      unread = r.data.unread;
    } catch {
      /* non-kritis, diam */
    } finally {
      notifLoading = false;
      notifBusy = false;
    }
  }
  // Muat lagi saat scroll dropdown nyaris nyentuh bawah (infinite scroll).
  function notifOnScroll(e: Event) {
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) loadNotifs(false);
  }
  // Fetch notifikasi saat layout dipasang.
  onMount(() => loadNotifs(true));

  // Realtime: event "notification" (notifyUser dari backend) → toast + inject langsung ke notif list.
  useWs((m) => {
    if (m.type === "notification") {
      const n = m.data ?? {};
      addToast("info", `${n.title}: ${n.message}`);
      // Inject langsung, tanpa refetch — id dummy (negatif biar gak clash dg real).
      const id = -(Date.now() + Math.floor(Math.random() * 9999));
      notifs = [{ id, type: n.type, title: n.title, message: n.message, read: false, created_at: n.created_at ?? Date.now() }, ...notifs];
      unread += 1;
    }
  });
  const notifCount = $derived(unread);
  const NOTIF_META: Record<string, { icon: string; cls: string; bg: string }> = {
    payment_success: { icon: "fa-solid fa-circle-check", cls: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100/70 dark:bg-emerald-500/10" },
    payment_received: { icon: "fa-solid fa-circle-check", cls: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100/70 dark:bg-emerald-500/10" },
    invoice_pending: { icon: "fa-solid fa-clock", cls: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100/70 dark:bg-amber-500/10" },
    invoice_paid: { icon: "fa-solid fa-file-invoice-dollar", cls: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100/70 dark:bg-emerald-500/10" },
    invoice_rejected: { icon: "fa-solid fa-file-circle-xmark", cls: "text-red-500 dark:text-red-400", bg: "bg-red-100/70 dark:bg-red-500/10" },
    subscription_cancelled: { icon: "fa-solid fa-calendar-xmark", cls: "text-red-500 dark:text-red-400", bg: "bg-red-100/70 dark:bg-red-500/10" },
    token_warning: { icon: "fa-solid fa-triangle-exclamation", cls: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100/70 dark:bg-amber-500/10" },
  };
  const notifMeta = (type: string) =>
    NOTIF_META[type] ?? { icon: "fa-solid fa-bell", cls: "text-[var(--accent)]", bg: "bg-[var(--inset-dark)]" };
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
  // Klik notif → tandai dibaca + arahkan ke halaman sesuai tipe.
  const NOTIF_ROUTE: Record<string, string> = {
    payment_success: "/transactions",
    payment_received: "/transactions",
    invoice_pending: "/admin/invoices",
    invoice_paid: "/admin/invoices",
    invoice_rejected: "/admin/invoices",
    subscription_cancelled: "/admin/subscribers",
    token_warning: "/developer/api-keys",
  };
  function openNotif(n: Notif) {
    notifOpen = false;
    markRead(n);
    const to = NOTIF_ROUTE[n.type];
    if (to) goto(to);
  }
  async function markAllRead() {
    const unreadList = notifs.filter((n) => !n.read);
    notifs = notifs.map((x) => ({ ...x, read: true }));
    unread = 0;
    await Promise.all(
      unreadList.map((n) => admin.markNotificationRead(n.id).catch(() => {})),
    );
  }

  let moreOpen = $state(false);

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

      <div class="flex-1 min-h-0 overflow-y-auto -mr-2 pr-2 pb-4 no-scrollbar">
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
              class="tactile-btn w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold {activePath === '/developer'
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
                    class="tactile-btn flex items-center gap-3 px-4 py-2.5 text-sm font-semibold {(l.to === '/developer' ? activePath === '/developer' : isActive(l.to))
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
      {#each MOBILE_PRIMARY as l (l.to)}
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
      {#if MOBILE_MORE.length > 0}
        <button
          onclick={() => (moreOpen = !moreOpen)}
          class="flex flex-col items-center gap-0.5 flex-1 py-1.5 px-1 rounded-xl text-[10px] font-semibold {moreActive
            ? 'active text-[var(--accent)]'
            : 'text-[var(--text-muted)]'} hover:text-[var(--accent)] cursor-pointer"
          title="Menu lainnya"
          aria-expanded={moreOpen}
        >
          <i class="fa-solid fa-ellipsis text-base leading-none"></i>
          Lainnya
        </button>
      {/if}
    </nav>

    <!-- Drawer mobile: menu lainnya -->
    {#if moreOpen}
      <button
        type="button"
        aria-label="Tutup"
        class="fixed inset-0 z-40 lg:hidden bg-stone-900/60 backdrop-blur-sm cursor-default"
        onclick={() => (moreOpen = false)}
      ></button>
      <div
        class="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-[var(--bg-base)] rounded-t-3xl tactile-box p-4 pb-6 max-h-[70vh] overflow-y-auto no-scrollbar"
      >
        <div class="flex items-center justify-between mb-3">
          <p class="font-bold">Menu Lainnya</p>
          <button
            onclick={() => (moreOpen = false)}
            class="tactile-btn w-9 h-9 flex items-center justify-center text-[var(--text-muted)]"
            title="Tutup"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="space-y-1.5">
          {#each MOBILE_MORE as l (l.to)}
            <a
              href={l.to}
              onclick={() => (moreOpen = false)}
              class="tactile-btn flex items-center gap-3 px-4 py-3 text-sm font-semibold {isActive(
                l.to,
              )
                ? 'active text-[var(--accent)]'
                : 'text-slate-500 dark:text-slate-400'}"
            >
              <i class="{l.icon} w-5"></i>
              <span>{l.label}</span>
            </a>
          {/each}
          <button
            onclick={logout}
            class="tactile-btn w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-500 cursor-pointer"
          >
            <i class="fa-solid fa-right-from-bracket w-5"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>
    {/if}

    <!-- Main wrapper -->
    <div
      class="flex-1 min-w-0 lg:ml-72 flex flex-col justify-between min-h-screen py-8 px-4 sm:px-6 lg:px-8"
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
                class="absolute right-0 mt-3 w-[calc(100vw-1.5rem)] max-w-[32rem] sm:w-[32rem] rounded-2xl tactile-box p-4 z-50"
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
                <div
                  class="space-y-2 text-xs max-h-[55vh] overflow-y-auto pr-1 no-scrollbar"
                  onscroll={notifOnScroll}
                >
                  {#if notifLoading && notifs.length === 0}
                    {#each Array.from({ length: 4 }) as _, i}
                      <div class="flex items-start space-x-2 p-2">
                        <Skeleton className="w-6 h-6 rounded-lg shrink-0" />
                        <div class="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-2.5 w-full" />
                          <Skeleton className="h-2 w-1/3" />
                        </div>
                      </div>
                    {/each}
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
                        onclick={() => openNotif(n)}
                        class="w-full text-left p-2.5 rounded-xl tactile-inset flex items-start gap-3 {!n.read
                          ? 'opacity-100'
                          : 'opacity-50'}"
                      >
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 {notifMeta(n.type).bg}">
                          <i class="{notifMeta(n.type).icon} {notifMeta(n.type).cls} text-sm"></i>
                        </div>
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
                    {#if notifHasMore}
                      <div class="flex justify-center py-2">
                        <div
                          class="w-4 h-4 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin"
                        ></div>
                      </div>
                    {/if}
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
