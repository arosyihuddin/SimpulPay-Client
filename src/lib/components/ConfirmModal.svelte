<script lang="ts">
  let { open, title, message = '', confirmLabel = 'Hapus', busyLabel = 'Menghapus...', busy = false, icon = 'fa-trash-can', onConfirm, onClose, children } = $props();
</script>

{#if open}
  <div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={onClose}></button>
    <div class="tactile-modal w-full max-w-md p-6 relative z-50">
      <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
        <h3 class="text-lg font-bold text-red-500"><i class="fa-solid fa-circle-exclamation mr-2"></i>{title}</h3>
        <button type="button" aria-label="Tutup" onclick={onClose} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
      </div>
      {#if children}
        {@render children()}
      {:else if message}
        <p class="text-sm text-[var(--text-muted)] leading-relaxed">{message}</p>
      {/if}
      <div class="flex gap-2 pt-5">
        <button disabled={busy} onclick={onConfirm} class="tactile-btn flex-1 py-3 font-bold text-red-500 flex items-center justify-center gap-2">
          <i class="fa-solid {icon}"></i> {busy ? busyLabel : confirmLabel}
        </button>
        <button onclick={onClose} class="tactile-btn px-5 py-3 text-sm text-[var(--text-muted)]">Batal</button>
      </div>
    </div>
  </div>
{/if}
