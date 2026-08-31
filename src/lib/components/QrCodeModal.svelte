<script lang="ts">
  import { onMount } from "svelte";
  import { qrDataUrl } from "$lib/qrcode";
  import { fmtIDR } from "$lib/api";

  let { code, qrAmount, onClose } = $props();
  let src = $state("");
  let err = $state("");

  onMount(() => {
    qrDataUrl(code)
      .then((d) => (src = d))
      .catch(() => (err = "Gagal membuat QR"));
  });
</script>

<div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
  <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={onClose}></button>
  <div class="tactile-modal w-full max-w-sm p-6 relative z-50">
    <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
      <h3 class="text-lg font-bold"><i class="fa-solid fa-qrcode text-[var(--accent)] mr-2"></i>QRIS Pembayaran</h3>
      <button type="button" aria-label="Tutup" onclick={onClose} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="space-y-4">
      {#if err}
        <p class="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{err}</p>
      {:else if !src}
        <div class="flex justify-center py-8"><div class="w-8 h-8 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin"></div></div>
      {:else}
        <div class="flex justify-center">
          <img src={src} alt="QRIS" class="w-52 h-52 rounded-xl tactile-inset" />
        </div>
      {/if}
      {#if qrAmount}
        <p class="text-center text-sm"><span class="text-[var(--text-muted)]">Nominal</span><span class="font-bold text-[var(--accent)] ml-2">{fmtIDR(qrAmount)}</span></p>
      {/if}
      <button onclick={onClose} class="tactile-btn w-full py-2.5 font-bold text-[var(--accent)] rounded-xl text-xs">Tutup</button>
    </div>
  </div>
</div>
