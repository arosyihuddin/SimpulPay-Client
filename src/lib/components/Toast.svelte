<script lang="ts">
  // Toast — notifikasi floating di kanan atas. Auto-dismiss 3 detik.
  import { toasts, removeToast } from '$lib/toast.svelte';

  const icons = {
    success: 'fa-solid fa-circle-check',
    error: 'fa-solid fa-circle-exclamation',
    info: 'fa-solid fa-circle-info',
  };
  const cls = {
    success: 'bg-emerald-100/90 dark:bg-emerald-500/15 border-emerald-200/60 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    error: 'bg-red-100/90 dark:bg-red-500/15 border-red-200/60 dark:border-red-500/30 text-red-700 dark:text-red-300',
    info: 'bg-blue-100/90 dark:bg-blue-500/15 border-blue-200/60 dark:border-blue-500/30 text-blue-700 dark:text-blue-300',
  };
</script>

{#if toasts.length > 0}
  <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
    {#each toasts as t (t.id)}
      <div
        class="pointer-events-auto tactile-box px-4 py-3 flex items-start gap-3 text-sm font-semibold animate-slide-in {cls[t.type]}"
        role="alert"
      >
        <i class="{icons[t.type]} mt-0.5 shrink-0"></i>
        <span class="flex-1">{t.message}</span>
        <button
          type="button"
          aria-label="Tutup"
          onclick={() => removeToast(t.id)}
          class="shrink-0 opacity-60 hover:opacity-100 cursor-pointer"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  @keyframes slide-in {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  .animate-slide-in {
    animation: slide-in 0.25s ease-out;
  }
</style>