<script lang="ts">
  import { onMount } from "svelte";
  import { admin, fmtIDR } from "$lib/api";
  import { addToast } from "$lib/toast.svelte";
  import { qrDataUrl } from "$lib/qrcode";
  import { useWs } from "$lib/useWs";

  // Satu modal QR dua mode:
  // - merchant diisi → mode CREATE (buat QRIS dinamis dari nol) — ex: /merchants
  // - merchant kosong → mode DISPLAY (tampil QR transaksi/invoice) — ex: /transactions, /billing
  let {
    code,
    qrAmount,
    baseAmount,
    uniqueCode,
    paid = false,
    rejected = false,
    merchant,
    onDone,
    onClose,
  }: {
    code: string;
    qrAmount: number;
    baseAmount?: number;
    uniqueCode?: number;
    paid?: boolean;
    rejected?: boolean;
    merchant?: any;
    onDone?: () => void;
    onClose: () => void;
  } = $props();

  let src = $state("");
  let err = $state("");

  // Mode create state
  let amount = $state("");
  let busy = $state(false);
  let created = $state<any | null>(null);
  let expired = $state(false);
  let createdPaid = $state(false);

  onMount(() => {
    if (!merchant && code) {
      qrDataUrl(code)
        .then((d) => (src = d))
        .catch(() => (err = "Gagal membuat QR"));
    }
  });

  async function create(e: SubmitEvent) {
    e.preventDefault();
    busy = true; err = ""; created = null; src = ""; expired = false; createdPaid = false;
    try {
      const a = parseInt(amount, 10);
      if (!a || a <= 0) throw new Error("Nominal tidak valid");
      const res = await admin.createQris(a, merchant.id);
      created = res.data; amount = ""; onDone?.();
      addToast("success", "QRIS dinamis dibuat.");
      qrDataUrl(created.qris_code).then((d) => (src = d));
    } catch (e: any) { err = e.message; }
    finally { busy = false; }
  }

  // QR yang lagi ditampilkan: expired → tampilkan state expired, terbayar → state sukses.
  useWs((m) => {
    if (m.type === "qris_expired" && created?.qris_id === m.data?.id) expired = true;
    if (m.type === "transaction_updated" && m.data.status === "paid" && created?.trx_id === m.data?.trx_id) createdPaid = true;
  });
</script>

<div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
  <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={onClose}></button>
  <div class="tactile-modal w-full max-w-lg p-6 relative z-50 max-h-[90vh] overflow-y-auto">
    <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
      <h3 class="text-lg font-bold"><i class="fa-solid fa-qrcode text-[var(--accent)] mr-2"></i>{merchant ? `Buat QRIS — ${merchant.name}` : "QRIS Pembayaran"}</h3>
      <button type="button" aria-label="Tutup" onclick={onClose} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
    </div>

    {#if merchant}
      <!-- ===== MODE CREATE ===== -->
      {#if err}<p class="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-4">{err}</p>{/if}
      {#if !merchant.qris_static_set}
        <p class="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30 rounded-2xl px-4 py-3">
          ⚠️ QRIS static belum diatur untuk merchant ini. Konfigurasi dulu lewat tombol Konfigurasi (login GoBiz + scan QRIS static) sebelum buat QR dinamis.
        </p>
      {:else if expired}
        <div class="text-center py-6 space-y-3">
          <div class="w-16 h-16 mx-auto rounded-full bg-red-100/80 dark:bg-red-500/10 flex items-center justify-center">
            <i class="fa-solid fa-clock text-2xl text-red-500"></i>
          </div>
          <p class="font-bold text-lg">QRIS Kedaluwarsa</p>
          <p class="text-xs text-[var(--text-muted)]">QRIS ini sudah kadaluwarsa dan tidak bisa digunakan lagi. Buat ulang untuk melanjutkan.</p>
          <button onclick={onClose} class="tactile-btn w-full py-2.5 font-bold text-[var(--accent)] rounded-xl text-xs">Tutup</button>
        </div>
      {:else if createdPaid}
        <div class="text-center py-6 space-y-3">
          <div class="w-20 h-20 mx-auto rounded-full bg-emerald-100/80 dark:bg-emerald-500/10 flex items-center justify-center animate-bounce-in">
            <i class="fa-solid fa-circle-check text-4xl text-emerald-500"></i>
          </div>
          <p class="font-bold text-lg">Pembayaran Berhasil</p>
          <p class="text-xs text-[var(--text-muted)]">Transaksi sudah dibayar dan sedang diproses.</p>
          <button onclick={onClose} class="tactile-btn w-full py-2.5 font-bold text-[var(--accent)] rounded-xl text-xs">Tutup</button>
        </div>
      {:else if created}
        <div class="space-y-4">
          <div class="flex justify-center">
            {#if !src}
              <div class="flex justify-center py-8"><div class="w-8 h-8 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin"></div></div>
            {:else}
              <img src={src} alt="QRIS" class="w-52 h-52 rounded-xl tactile-inset" />
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
            <i class="fa-solid fa-qrcode"></i> {busy ? "Membuat..." : "Buat QRIS"}
          </button>
        </form>
      {/if}
    {:else}
      <!-- ===== MODE DISPLAY ===== -->
      {#if paid}
        <div class="text-center py-6 space-y-4">
          <div class="w-20 h-20 mx-auto rounded-full bg-emerald-100/80 dark:bg-emerald-500/10 flex items-center justify-center animate-bounce-in">
            <i class="fa-solid fa-circle-check text-4xl text-emerald-500"></i>
          </div>
          <p class="font-bold text-xl">Pembayaran Berhasil</p>
          <p class="text-xs text-[var(--text-muted)]">Transaksi sudah dibayar dan sedang diproses.</p>
          <button onclick={onClose} class="tactile-btn w-full py-2.5 font-bold text-[var(--accent)] rounded-xl text-xs">Tutup</button>
        </div>
      {:else if rejected}
        <div class="text-center py-6 space-y-4">
          <div class="w-20 h-20 mx-auto rounded-full bg-red-100/80 dark:bg-red-500/10 flex items-center justify-center animate-bounce-in">
            <i class="fa-solid fa-circle-xmark text-4xl text-red-500"></i>
          </div>
          <p class="font-bold text-xl">Pembayaran Ditolak</p>
          <p class="text-xs text-[var(--text-muted)]">Invoice ditolak oleh admin. Langganan tidak diaktifkan.</p>
          <button onclick={onClose} class="tactile-btn w-full py-2.5 font-bold text-[var(--accent)] rounded-xl text-xs">Tutup</button>
        </div>
      {:else}
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
            <div class="tactile-inset p-4 space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-[var(--text-muted)]">Biaya Layanan</span>
                <span class="font-semibold">{fmtIDR(uniqueCode ?? 0)}</span>
              </div>
              {#if baseAmount}
                <div class="flex justify-between">
                  <span class="text-[var(--text-muted)]">Harga Paket</span>
                  <span class="font-semibold">{fmtIDR(baseAmount)}</span>
                </div>
              {/if}
              <div class="flex justify-between pt-2 border-t border-[var(--border-subtle)]">
                <span class="font-bold">Total Dibayar</span>
                <span class="font-bold text-[var(--accent)]">{fmtIDR(qrAmount)}</span>
              </div>
            </div>
          {/if}
          <button onclick={onClose} class="tactile-btn w-full py-2.5 font-bold text-[var(--accent)] rounded-xl text-xs">Tutup</button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  @keyframes bounce-in {
    0% { transform: scale(0); }
    50% { transform: scale(1.15); }
    70% { transform: scale(0.95); }
    100% { transform: scale(1); }
  }
  .animate-bounce-in {
    animation: bounce-in 0.4s ease-out;
  }
</style>
