<script lang="ts">
  let { page, total, pageSize, onChange }: {
    page: number;
    total: number;
    pageSize: number;
    onChange: (page: number) => void;
  } = $props();

  const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));
  const pages = $derived(Array.from({ length: totalPages }, (_, i) => i + 1));
</script>

<div class="flex items-center justify-center gap-1 pt-2">
  <button
    onclick={() => onChange(page - 1)}
    disabled={page <= 1}
    class="tactile-btn w-9 h-9 flex items-center justify-center text-xs text-[var(--text-muted)] disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <i class="fa-solid fa-chevron-left"></i>
  </button>
  {#each pages as p (p)}
    <button onclick={() => onChange(p)} class="w-9 h-9 flex items-center justify-center text-xs font-bold rounded-xl {p === page ? 'active text-[var(--accent)]' : 'text-[var(--text-muted)]'}">
      {p}
    </button>
  {/each}
  <button
    onclick={() => onChange(page + 1)}
    disabled={page >= totalPages}
    class="tactile-btn w-9 h-9 flex items-center justify-center text-xs text-[var(--text-muted)] disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <i class="fa-solid fa-chevron-right"></i>
  </button>
</div>