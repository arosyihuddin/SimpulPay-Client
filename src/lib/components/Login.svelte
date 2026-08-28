<script lang="ts">
  import { admin } from '$lib/api';
  import { checkAuth } from '$lib/auth.svelte';
  import { theme, toggleTheme } from '$lib/theme.svelte';
  import { goto } from '$app/navigation';
  import Logo from '$lib/components/Logo.svelte';
  import ErrBox from '$lib/components/ErrBox.svelte';

  let err = $state('');
  let busy = $state(false);
  let username = $state('');
  let password = $state('');
  let showPass = $state(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    err = '';
    try {
      await admin.login(username, password);
      localStorage.setItem('gomerch_username', username);
      await checkAuth();
      goto('/dashboard');
    } catch (e: any) {
      err = e.message;
    } finally {
      busy = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center p-4 relative">
  <button
    onclick={toggleTheme}
    class="tactile-btn absolute top-6 right-6 w-11 h-11 flex items-center justify-center text-[var(--text-muted)]"
    title="Ganti Tema"
  >
    <i class="{theme.dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon'}"></i>
  </button>

  <form onsubmit={submit} class="w-full max-w-sm tactile-box p-8 space-y-5">
    <div class="flex items-center gap-3">
      <div class="tactile-btn w-12 h-12 flex items-center justify-center text-[var(--accent)] text-xl">
        <Logo />
      </div>
      <div>
        <h1 class="text-xl font-bold tracking-wide">GoMerch<span class="text-[var(--accent)]"> API</span></h1>
        <p class="text-xs text-[var(--text-muted)] font-medium">Admin Management</p>
      </div>
    </div>

    <ErrBox msg={err} />

    <div class="space-y-1.5">
      <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Username</label>
      <div class="input-well px-4 py-3 flex items-center">
        <i class="fa-regular fa-user text-[var(--text-muted)] mr-3"></i>
        <input bind:value={username} placeholder="username" class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]" autofocus />
      </div>
    </div>
    <div class="space-y-1.5">
      <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Password</label>
      <div class="input-well px-4 py-3 flex items-center">
        <i class="fa-solid fa-lock text-[var(--text-muted)] mr-3"></i>
        <input
          type={showPass ? 'text' : 'password'}
          bind:value={password}
          placeholder="••••••••"
          class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]"
        />
        <button
          type="button"
          onclick={() => (showPass = !showPass)}
          class="text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer"
          title={showPass ? 'Sembunyikan password' : 'Lihat password'}
        >
          <i class="fa-solid {showPass ? 'fa-eye-slash' : 'fa-eye'} ml-2"></i>
        </button>
      </div>
    </div>

    <button disabled={busy} class="tactile-btn w-full py-4 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
      <i class="fa-solid fa-lock-open"></i>
      {busy ? 'Masuk...' : 'Masuk'}
    </button>
  </form>
</div>
