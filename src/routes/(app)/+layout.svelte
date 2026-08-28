<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { admin } from '$lib/api';
  import { auth, checkAuth } from '$lib/auth.svelte';
  import { theme, toggleTheme } from '$lib/theme.svelte';
  import Logo from '$lib/components/Logo.svelte';
  let { children } = $props();

  const LINKS = [
    { to: '/dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-pie', title: 'Dashboard', subtitle: 'Statistik dan ringkasan performa gateway' },
    { to: '/qris', label: 'QRIS', icon: 'fa-solid fa-qrcode', title: 'QRIS Dinamis', subtitle: 'Buat dan kelola kode QRIS pembayaran' },
    { to: '/transactions', label: 'Transaksi', icon: 'fa-solid fa-receipt', title: 'Daftar Transaksi', subtitle: 'Arsip transaksi yang berhasil diproses' },
    { to: '/logs', label: 'Logs', icon: 'fa-solid fa-list', title: 'Aktivitas Sistem', subtitle: 'Log aksi dan event sistem gateway' },
    { to: '/settings', label: 'Settings', icon: 'fa-solid fa-gear', title: 'Pengaturan API', subtitle: 'Login GoBiz, kunci API, dan konfigurasi' },
    { to: '/developer', label: 'Developer', icon: 'fa-solid fa-code', title: 'Developer API', subtitle: 'Dokumentasi API v1 untuk integrasi aplikasi' },
  ];

  const TITLES: Record<string, [string, string]> = Object.fromEntries(LINKS.map((l) => [l.to, [l.title, l.subtitle]]));
  TITLES['/settings/password'] = ['Ganti Password', 'Ubah kata sandi akun admin'];

  let username = $state(typeof localStorage !== 'undefined' ? localStorage.getItem('gomerch_username') || 'Admin' : 'Admin');

  $effect(() => {
    if (auth.ready && !auth.authed) goto('/');
  });

  const activePath = $derived($page.url.pathname);
  const isActive = (to: string) => to === '/settings' ? activePath.startsWith('/settings') : activePath === to;
  const meta = $derived.by(() => {
    const [t, s] = TITLES[activePath] || TITLES['/dashboard'];
    return { title: t, subtitle: s };
  });

  async function logout() {
    await admin.logout().catch(() => {});
    await checkAuth();
    goto('/');
  }
</script>

{#if auth.ready && auth.authed}
  <div class="min-h-screen flex">
    <!-- Sidebar — desktop only -->
    <aside class="hidden lg:flex fixed inset-y-0 left-0 z-50 w-72 p-6 flex-col justify-between bg-[var(--bg-base)] border-r border-slate-300/40 dark:border-slate-800/40">
      <div>
        <div class="flex items-center gap-3 mb-8">
          <div class="tactile-btn w-12 h-12 flex items-center justify-center text-[var(--accent)] text-xl">
            <span class="text-[var(--accent)]"><Logo /></span>
          </div>
          <div>
            <h1 class="text-xl font-bold tracking-wide">GoMerch<span class="text-[var(--accent)]"> API</span></h1>
            <p class="text-xs text-[var(--text-muted)] font-medium">Merchant Gateway</p>
          </div>
        </div>

        <nav class="space-y-3">
          {#each LINKS as l (l.to)}
            <a
              href={l.to}
              class="tactile-btn flex items-center gap-3 px-4 py-3.5 text-sm font-semibold {isActive(l.to) ? 'active text-[var(--accent)]' : 'text-slate-500 dark:text-slate-400'}"
            >
              <i class="{l.icon} w-5"></i>
              <span>{l.label}</span>
            </a>
          {/each}
        </nav>
      </div>

      <!-- User + logout -->
      <div class="tactile-inset p-4 rounded-xl mt-6 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 min-w-0">
          <div class="tactile-btn w-9 h-9 flex items-center justify-center text-[var(--accent)] shrink-0">
            <i class="fa-solid fa-user"></i>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold truncate">{username}</p>
            <p class="text-[11px] text-[var(--text-muted)]">Admin</p>
          </div>
        </div>
        <button onclick={logout} class="tactile-btn w-9 h-9 flex items-center justify-center hover:text-red-500 shrink-0" title="Logout">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    </aside>

    <!-- Bottom nav mobile — developer diluar (di Settings) -->
    <nav class="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-[var(--bg-base)]/95 backdrop-blur border-t border-slate-300/40 dark:border-slate-800/40 px-2 py-1.5 flex">
      {#each LINKS.filter((l) => l.to !== '/developer') as l (l.to)}
        <a
          href={l.to}
          class="flex flex-col items-center gap-0.5 flex-1 py-1.5 px-1 rounded-xl text-[10px] font-semibold transition-all duration-200 active:scale-[0.95] {isActive(l.to) ? 'active text-[var(--accent)]' : 'text-[var(--text-muted)]'}"
        >
          <i class="{l.icon} text-base leading-none"></i>
          {l.label}
        </a>
      {/each}
    </nav>

    <!-- Main wrapper -->
    <div class="flex-1 lg:ml-72 flex flex-col justify-between min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <!-- Top header -->
      <header class="max-w-6xl mx-auto w-full flex justify-between items-center mb-8 px-2">
        <div>
          <h2 class="text-lg font-bold tracking-wide">{meta.title}</h2>
          <p class="text-xs text-[var(--text-muted)] font-medium">{meta.subtitle}</p>
        </div>
        <div class="flex items-center gap-3 sm:gap-4">
          <button onclick={toggleTheme} class="tactile-btn w-11 h-11 flex items-center justify-center hover:text-[var(--accent)]" title="Ganti Tema Light/Dark">
            <i class="{theme.dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'}"></i>
          </button>
        </div>
      </header>

      <!-- Dynamic view -->
      <main class="max-w-6xl mx-auto w-full flex-1 pb-16 lg:pb-0">{@render children()}</main>

      <footer class="max-w-6xl mx-auto w-full text-center text-xs text-slate-400 dark:text-slate-500 mt-8 pb-16 lg:pb-0">
        <p>&copy; 2026 GoMerch API Merchant Gateway. All rights reserved.</p>
      </footer>
    </div>
  </div>
{/if}
