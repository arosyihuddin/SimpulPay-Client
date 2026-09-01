<script lang="ts">
  import { admin, fmtIDR } from '$lib/api';
  import { addToast } from '$lib/toast.svelte';
  import { onMount } from 'svelte';
  import { qrDataUrl } from '$lib/qrcode';

  let { merchant, onClose, onDone } = $props();

  let amount = $state('');
  let err = $state('');
  let busy = $state(false);
  let created = $state<any | null>(null);
  let qrSrc = $state('');

  async function create(e: SubmitEvent) {
    e.preventDefault();
    busy = true; err = ''; created = null; qrSrc = '';
    try {
      const a = parseInt(amount, 10);
      if (!a || a <= 0) throw new Error('Nominal tidak valid');
      const res = await admin.createQris(a, merchant.id);
      created = res.data; amount = ''; onDone?.();
      addToast('success', 'QRIS dinamis dibuat.');
      qrDataUrl(created.qris_code).then((d) => (qrSrc = d));
    } catch (e: any) { err = e.message; }
    finally { busy = false; }
  }
</script>

<div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
  <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={onClose}></button>
  <div class="tactile-modal w-full max-w-lg p-6 relative z-50 max-h-[90vh] overflow-y-auto">
    <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
      <h3 class="text-lg font-bold"><i class="fa-solid fa-qrcode text-[var(--accent)] mr-2"></i>Buat QRIS — {merchant.name}</h3>
      <button type="button" aria-label="Tutup" onclick={onClose} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
    </div>

    {#if err}<p class="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-4">{err}</p>{/if}

    {#if !merchant.qris_static_set}
      <p class="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30 rounded-2xl px-4 py-3">
        ⚠️ QRIS static belum diatur untuk merchant ini. Konfigurasi dulu lewat tombol Konfigurasi (login GoBiz + scan QRIS static) sebelum buat QR dinamis.
      </p>
    {:else if created}
      <div class="space-y-4">
        <div class="flex justify-center">
          {#if !qrSrc}
            <div class="flex justify-center py-8"><div class="w-8 h-8 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin"></div></div>
          {:else}
            <img src={qrSrc} alt="QRIS" class="w-52 h-52 rounded-xl tactile-inset" />
          {/if}
        </div>
        <div class="tactile-inset p-4 space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-[var(--text-muted)]">Kode Unik</span>
            <span class="font-semibold text-[var(--accent)]">{created.unique_code || 0}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[var(--text-muted)]">Nominal</span>
            <span class="font-semibold">{fmtIDR(created.amount)}</span>
          </div>
          <div class="flex justify-between pt-2 border-t border-[var(--border-subtle)]">
            <span class="font-bold">Total Dibayar</span>
            <span class="font-bold text-[var(--accent)]">{fmtIDR(created.amount_to_pay)}</span>
          </div>
          <p class="text-[10px] text-[var(--text-muted)] font-mono break-all">TRX-ID: {created.trx_id}</p>
        </div>
        <button onclick={onClose} class="tactile-btn w-full py-2.5 font-bold text-[var(--accent)] rounded-xl text-xs">Tutup</button>
      </div>
    {:else}
      <form onsubmit={create} class="space-y-3">
        <p class="text-xs text-[var(--text-muted)]">Masukkan nominal untuk membuat QRIS dinamis. QR kadaluwarsa otomatis.</p>
        <div class="input-well px-4 py-3 flex items-center">
          <i class="fa-solid fa-money-bill text-[var(--text-muted)] mr-3"></i>
          <input type="number" min="1" bind:value={amount} placeholder="Nominal (Rp)" class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]" />
        </div>
        <button type="submit" disabled={busy} class="tactile-btn w-full py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
          <i class="fa-solid fa-qrcode"></i> {busy ? 'Membuat...' : 'Buat QRIS'}
        </button>
      </form>
    {/if}
  </div>
</div>
