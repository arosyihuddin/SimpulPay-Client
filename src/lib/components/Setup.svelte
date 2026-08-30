<script lang="ts">
  import { onMount } from 'svelte';
  import { admin } from '$lib/api';
  import { checkAuth } from '$lib/auth.svelte';
  import { theme, toggleTheme } from '$lib/theme.svelte';
  import Logo from '$lib/components/Logo.svelte';
  import ErrBox from '$lib/components/ErrBox.svelte';

  // Setup wizard (first-run) — bikin admin pertama. Terpisah dari Login.
  const STEPS = ['Admin', 'Selesai'];

  let step = $state(1);
  let err = $state('');
  let busy = $state(false);

  // Step admin
  let username = $state('');
  let password = $state('');
  let confirm = $state('');
  let showPass = $state(false);

  // Deteksi kondisi awal: sudah ada user → bukan setup.
  onMount(() => {
    admin.setupStatus()
      .then((r) => { if (!r.needsSetup) return checkAuth(); })
      .catch(() => checkAuth());
  });

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
      {#if step === 1}
        <form onsubmit={submitAdmin} class="space-y-5">
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
