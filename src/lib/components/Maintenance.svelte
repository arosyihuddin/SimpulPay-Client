<script lang="ts">
  import { theme, toggleTheme } from "$lib/theme.svelte";
  import Logo from "$lib/components/Logo.svelte";
  import Login from "$lib/components/Login.svelte";

  // Admin belum login saat maintenance — buka form login lewat tombol di bawah.
  let showLogin = $state(false);
  // Auto-reload tiap 30 detik biar SPA masuk lagi otomatis pas mode dimatiin.
  // Stop selagi form login kebuka biar isian nggak ke-reset.
  $effect(() => {
    if (showLogin) return;
    const t = setTimeout(() => location.reload(), 30000);
    return () => clearTimeout(t);
  });
</script>

{#if showLogin}
  <Login />
{:else}
  <div class="min-h-screen flex items-center justify-center p-4 relative">
    <button
      onclick={toggleTheme}
      class="tactile-btn absolute top-6 right-6 w-11 h-11 flex items-center justify-center text-[var(--text-muted)]"
      title="Ganti Tema"
    >
      <i class={theme.dark ? "fa-solid fa-sun" : "fa-solid fa-moon"}></i>
    </button>

    <div class="w-full max-w-sm tactile-box p-8 space-y-5 text-center">
      <div class="flex items-center justify-center gap-3">
        <div
          class="tactile-btn w-12 h-12 flex items-center justify-center text-[var(--accent)] text-xl"
        >
          <Logo />
        </div>
        <h1 class="text-xl font-bold tracking-wide">
          Simpul<span class="text-[var(--accent)]">Pay</span>
        </h1>
      </div>

      <div
        class="w-20 h-20 mx-auto rounded-full tactile-inset flex items-center justify-center text-[var(--accent)] text-3xl"
      >
        <i class="fa-solid fa-screwdriver-wrench"></i>
      </div>

      <div>
        <h2 class="text-lg font-bold">Sedang Maintenance</h2>
        <p class="text-sm text-[var(--text-muted)] mt-1">
          Sistem sedang dalam perawatan. Coba lagi beberapa saat.
        </p>
      </div>

      <button
        onclick={() => location.reload()}
        class="tactile-btn w-full py-3 text-sm font-bold text-[var(--accent)] flex items-center justify-center gap-2"
      >
        <i class="fa-solid fa-rotate"></i> Coba Lagi
      </button>
      <button
        onclick={() => (showLogin = true)}
        class="tactile-btn w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
        title="Masuk"
      >
        <i class="fa-solid fa-right-to-bracket"></i> Coba Login
      </button>
      <p class="text-[11px] text-[var(--text-muted)]">
        Mengecek ulang otomatis tiap 30 detik.
      </p>
    </div>
  </div>
{/if}
