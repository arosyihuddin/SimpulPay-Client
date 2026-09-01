<script lang="ts">
  let { page, total, pageSize, onChange }: {
    page: number;
    total: number;
    pageSize: number;
    onChange: (page: number) => void;
  } = $props();

  const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));

  // Window: selalu tampilkan 1, totalPages, dan sekitar halaman aktif; sisanya "…".
  // Mencegah overflow horizontal di mobile (sebelumnya render semua halaman).
  const pages = $derived.by(() => {
    const t = totalPages;
    const p = page;
    if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
    const want = [1, p - 1, p, p + 1, t];
    const out: (number | "gap")[] = [];
    let prev = 0;
    for (const n of want) {
      if (n <= prev) continue;
      if (n > prev + 1) out.push("gap");
      if (n >= 1 && n <= t) out.push(n);
      prev = n;
    }
    return out;
  });
</script>

<div class="flex items-center justify-center gap-1 pt-2 flex-wrap">
  <button
    onclick={() => onChange(page - 1)}
    disabled={page <= 1}
    aria-label="Halaman sebelumnya"
    class="tactile-btn w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-xs text-[var(--text-muted)] disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <i class="fa-solid fa-chevron-left"></i>
  </button>
  {#each pages as p, i (i)}
    {#if p === "gap"}
      <span class="text-[var(--text-muted)] px-1 select-none">…</span>
    {:else}
      <button
        onclick={() => onChange(p)}
        class="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-xs font-bold rounded-xl {p === page ? 'active text-[var(--accent)]' : 'text-[var(--text-muted)]'}"
      >
        {p}
      </button>
    {/if}
  {/each}
  <button
    onclick={() => onChange(page + 1)}
    disabled={page >= totalPages}
    aria-label="Halaman berikutnya"
    class="tactile-btn w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-xs text-[var(--text-muted)] disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <i class="fa-solid fa-chevron-right"></i>
  </button>
</div>
