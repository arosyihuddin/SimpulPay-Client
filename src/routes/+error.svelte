<script lang="ts">
  import { page } from '$app/state';
</script>

<div class="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-base)]">
  <div class="tactile-box p-10 text-center max-w-md w-full">
    <div class="text-6xl font-black text-[var(--accent)] mb-2">{page.status}</div>
    <p class="text-sm text-[var(--text-muted)] mb-6">Halaman tidak ditemukan.</p>
    <a href="/dashboard" class="tactile-btn inline-flex px-6 py-3 font-bold text-[var(--accent)] items-center gap-2">
      <i class="fa-solid fa-arrow-left"></i> Kembali ke Dashboard
    </a>
  </div>
</div>