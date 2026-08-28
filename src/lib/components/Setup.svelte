<script lang="ts">
  import { onMount } from 'svelte';
  import { admin } from '$lib/api';
  import { checkAuth } from '$lib/auth.svelte';
  import { theme, toggleTheme } from '$lib/theme.svelte';
  import Logo from '$lib/components/Logo.svelte';
  import ErrBox from '$lib/components/ErrBox.svelte';

  // Setup wizard (first-run) — panduan bertahap: Database → Admin. Terpisah dari Login.
  const STEPS = ['Database', 'Admin', 'Selesai'];
  const DRIVERS = ['sqlite', 'postgres'] as const;

  let step = $state(0);
  let restart = $state(false);
  let err = $state('');
  let busy = $state(false);

  // Step DB
  let driver = $state<'sqlite' | 'postgres'>('sqlite');
  let dbUrl = $state('');

  // Step admin
  let username = $state('');
  let password = $state('');
  let confirm = $state('');
  let showPass = $state(false);

  // Deteksi kondisi awal: sudah ada user → bukan setup; DB sudah dikonfigurasi → lompat ke admin.
  onMount(() => {
    admin.setupStatus()
      .then((r) => {
        if (!r.needsSetup) return checkAuth();
        if (r.configDone) step = 1;
      })
      .catch(() => checkAuth());
  });

  async function submitDb(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    err = '';
    try {
      const r = await admin.setupDb(driver, driver === 'postgres' ? dbUrl : undefined);
      if (r.needsRestart) restart = true;
      else step = 1;
    } catch (e: any) {
      err = e.message;
    } finally {
      busy = false;
    }
  }

  async function submitAdmin(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    err = '';
    try {
      if (password.length < 8) throw new Error('Password minimal 8 karakter');
      if (password !== confirm) throw new Error('Konfirmasi password tidak cocok');
      await admin.setup(username, password);
      localStorage.setItem('gomerch_username', username);
      await checkAuth();
    } catch (e: any) {
      err = e.message;
    } finally {
      busy = false;
    }
  }

  const restartNow = () => window.location.reload();

  function back() {
    err = '';
    if (restart) { restart = false; step = 0; return; }
    if (step === 1) step = 0;
  }
</script>

<div class="min-h-screen flex flex-col items-center justify-center p-4 relative">
  <button
    onclick={toggleTheme}
    class="tactile-btn absolute top-6 right-6 w-11 h-11 flex items-center justify-center text-[var(--text-muted)]"
    title="Ganti Tema"
  >
    <i class="{theme.dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'}"></i>
  </button>

  <div class="w-full max-w-md mx-auto space-y-6">
    <!-- Header + progress -->
    <div class="flex items-center gap-3 justify-center">
      <div class="tactile-btn w-12 h-12 flex items-center justify-center text-[var(--accent)] text-xl">
        <Logo />
      </div>
      <div>
        <h1 class="text-xl font-bold tracking-wide">Selamat Datang 👋</h1>
        <p class="text-xs text-[var(--text-muted)] font-medium">Siapkan gateway dalam beberapa langkah</p>
      </div>
    </div>

    <!-- Progress bar segmen -->
    <div class="flex gap-2">
      {#each STEPS as label, i}
        <div class="flex-1 space-y-1.5">
          <div class="h-1.5 rounded-full transition-all duration-500 {i <= step ? 'bg-[var(--accent)]' : 'bg-slate-200 dark:bg-slate-700'}"></div>
          <p class="text-[10px] font-bold text-center uppercase tracking-wider transition-colors duration-300 {i === step ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}">
            {label}
          </p>
        </div>
      {/each}
    </div>

    <!-- Panel konten — slide-in tiap ganti langkah -->
    <div class="w-full tactile-box p-8 space-y-5 slide-in">
      {#if restart}
        <button type="button" onclick={back} class="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1.5 cursor-pointer">
          <i class="fa-solid fa-arrow-left"></i> Kembali pilih DB
        </button>
        <div class="tactile-btn w-14 h-14 mx-auto flex items-center justify-center text-[var(--accent)] text-2xl">
          <i class="fa-solid fa-rotate"></i>
        </div>
        <h1 class="text-lg font-bold text-center">Database tersimpan</h1>
        <p class="text-xs text-[var(--text-muted)] text-center">
          Database <b>{driver}</b> sudah disimpan & diuji. Restart server (<code>bun dev</code>)
          supaya runtime pakai konfigurasi baru, lalu klik tombol di bawah untuk lanjut bikin admin.
        </p>
        <button class="tactile-btn w-full py-4 font-bold text-[var(--accent)]" onclick={restartNow}>
          Saya sudah restart
        </button>
      {:else if step === 0}
        <form onsubmit={submitDb} class="space-y-5">
          <div class="flex items-center gap-3">
            <div class="tactile-btn w-12 h-12 flex items-center justify-center text-[var(--accent)] text-xl">
              <i class="fa-solid fa-database"></i>
            </div>
            <div>
              <h1 class="text-lg font-bold tracking-wide">Pilih Database</h1>
              <p class="text-xs text-[var(--text-muted)] font-medium">Penyimpanan data gateway</p>
            </div>
          </div>

          <ErrBox msg={err} />

          <fieldset class="space-y-1.5 border-0 p-0 m-0">
            <legend class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Driver</legend>
            <div class="grid grid-cols-2 gap-2">
              {#each DRIVERS as d}
                <button
                  type="button"
                  onclick={() => (driver = d)}
                  aria-pressed={driver === d}
                  class="tactile-btn py-3 text-sm font-bold capitalize {driver === d ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}"
                >
                  {d}
                </button>
              {/each}
            </div>
          </fieldset>

          {#if driver === 'postgres'}
            <div class="space-y-1.5">
              <label for="setup-dburl" class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">DATABASE_URL</label>
              <div class="input-well px-4 py-3 flex items-center">
                <i class="fa-solid fa-link text-[var(--text-muted)] mr-3"></i>
                <input id="setup-dburl" bind:value={dbUrl} placeholder="postgresql://user:pass@host:5432/db" class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]" />
              </div>
              <p class="text-[11px] text-[var(--text-muted)]">Koneksi divalidasi & tabel dibuat otomatis saat simpan.</p>
            </div>
          {:else}
            <p class="text-[11px] text-[var(--text-muted)]">
              SQLite: pakai file lokal <code>data/gateway.db</code>, tanpa konfigurasi tambahan.
            </p>
          {/if}

          <button disabled={busy} class="tactile-btn w-full py-4 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
            <i class="fa-solid fa-floppy-disk"></i>
            {busy ? 'Menyimpan...' : 'Simpan & Lanjut'}
          </button>
        </form>
      {:else if step === 1}
        <form onsubmit={submitAdmin} class="space-y-5">
          <button type="button" onclick={back} class="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1.5 cursor-pointer">
            <i class="fa-solid fa-arrow-left"></i> Kembali
          </button>
          <div class="flex items-center gap-3">
            <div class="tactile-btn w-12 h-12 flex items-center justify-center text-[var(--accent)] text-xl">
              <i class="fa-solid fa-user-shield"></i>
            </div>
            <div>
              <h1 class="text-lg font-bold tracking-wide">Buat Admin</h1>
              <p class="text-xs text-[var(--text-muted)] font-medium">Kredensial masuk dashboard</p>
            </div>
          </div>

          <ErrBox msg={err} />

          <div class="space-y-1.5">
            <label for="setup-user" class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Username</label>
            <div class="input-well px-4 py-3 flex items-center">
              <i class="fa-regular fa-user text-[var(--text-muted)] mr-3"></i>
              <input id="setup-user" bind:value={username} placeholder="username" class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]" />
            </div>
          </div>
          <div class="space-y-1.5">
            <label for="setup-pass" class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Password</label>
            <div class="input-well px-4 py-3 flex items-center">
              <i class="fa-solid fa-lock text-[var(--text-muted)] mr-3"></i>
              <input id="setup-pass" type={showPass ? 'text' : 'password'} bind:value={password} placeholder="••••••••" class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]" />
              <button type="button" onclick={() => (showPass = !showPass)} class="text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer" title={showPass ? 'Sembunyikan password' : 'Lihat password'}>
                <i class="fa-solid {showPass ? 'fa-eye-slash' : 'fa-eye'} ml-2"></i>
              </button>
            </div>
          </div>
          <div class="space-y-1.5">
            <label for="setup-confirm" class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Konfirmasi Password</label>
            <div class="input-well px-4 py-3 flex items-center">
              <i class="fa-solid fa-lock text-[var(--text-muted)] mr-3"></i>
              <input id="setup-confirm" type={showPass ? 'text' : 'password'} bind:value={confirm} placeholder="ulangi password" class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]" />
            </div>
          </div>

          <button disabled={busy} class="tactile-btn w-full py-4 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
            <i class="fa-solid fa-check"></i>
            {busy ? 'Menyiapkan...' : 'Buat Admin & Lanjut'}
          </button>
        </form>
      {:else}
        <div class="space-y-5 text-center">
          <div class="tactile-btn w-14 h-14 mx-auto flex items-center justify-center text-[var(--accent)] text-2xl">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <h1 class="text-lg font-bold">Setup selesai 🎉</h1>
          <p class="text-xs text-[var(--text-muted)]">Gateway siap dipakai. Diarahkan ke dashboard...</p>
        </div>
      {/if}
    </div>
  </div>
</div>
