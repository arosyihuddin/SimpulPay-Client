<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { admin, fmtIDR } from '$lib/api';
  import { qrDataUrl } from '$lib/qrcode';
  import { useWs } from '$lib/useWs';

  let amount = $state('');
  let busy = $state(false);
  let payBusy = $state(false);
  let expireBusy = $state(false);
  let created = $state<any | null>(null);
  let qr = $state('');
  let err = $state('');
  let paid = $state(false);
  let expired = $state(false);
  let copied = $state<string | null>(null);
  let payId = $state('');
  let simMsg = $state('');
  let now = $state(Date.now());
  let timer: ReturnType<typeof setInterval> | null = null;
  const remaining = $derived(created ? Math.max(0, created.expires_at - now) : 0);
  const remainingTxt = $derived.by(() => {
    const s = Math.floor(remaining / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  });

  onMount(() => {
    timer = setInterval(() => (now = Date.now()), 1000);
  });
  onDestroy(() => {
    if (timer) clearInterval(timer);
  });

  useWs((m) => {
    if (m.type === 'transaction_updated' && created?.trx_id === m.data?.trx_id) {
      if (m.data?.status === 'paid') paid = true;
      if (m.data?.status === 'expired') { expired = true; err = 'QRIS sandbox kedaluwarsa. Buat ulang untuk lanjut.'; }
    }
    if (m.type === 'payment_received' && created?.trx_id === m.data?.trx_id) paid = true;
    if (m.type === 'qris_expired' && created?.trx_id === m.data?.trx_id) { expired = true; err = 'QRIS sandbox kedaluwarsa. Buat ulang untuk lanjut.'; }
  });

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { copied = key; setTimeout(() => (copied = null), 2000); }).catch(() => {});
  };

  async function create(e: SubmitEvent) {
    e.preventDefault();
    busy = true; err = ''; simMsg = ''; created = null; qr = ''; paid = false; expired = false;
    try {
      const a = parseInt(amount, 10);
      if (!a || a <= 0) throw new Error('Nominal tidak valid');
      const res = await admin.createSandboxQris(a);
      created = res.data; amount = '';
      payId = created.trx_id;
      qrDataUrl(created.qris_code).then((d) => (qr = d));
    } catch (e: any) { err = e.message; }
    finally { busy = false; }
  }
  function reset() { created = null; qr = ''; paid = false; expired = false; payId = ''; err = ''; simMsg = ''; amount = ''; }
  async function pay(e?: SubmitEvent) {
    e?.preventDefault();
    const id = (payId || created?.trx_id || '').trim();
    if (!id) { err = 'Isi trx_id dulu'; return; }
    payBusy = true; err = ''; simMsg = '';
    try {
      await admin.simulateSandboxPay(id);
      if (created?.trx_id === id) paid = true;
      simMsg = `Simulasi bayar terkirim (${id}) — card QR ikut berubah kalau TRX sama.`;
    } catch (e: any) { err = e.message; }
    finally { payBusy = false; }
  }
  async function expire() {
    const id = (payId || created?.trx_id || '').trim();
    if (!id) { err = 'Isi trx_id dulu'; return; }
    expireBusy = true; err = ''; simMsg = '';
    try {
      await admin.simulateSandboxExpire(id);
      if (created?.trx_id === id) expired = true;
      simMsg = `Simulasi expired terkirim (${id}) — card QR ikut berubah kalau TRX sama.`;
    } catch (e: any) { err = e.message; }
    finally { expireBusy = false; }
  }
</script>

<div class="space-y-6">
  {#if err}<p class="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{err}</p>{/if}

  <div class="tactile-box p-5 space-y-4">
    <div>
      <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-qrcode text-[var(--accent)]"></i> Buat QRIS Sandbox</h2>
      <p class="text-xs text-[var(--text-muted)] mt-1">QRIS dummy tanpa merchant — format respon sama kayak QRIS asli, tapi tidak bisa dibayar sungguhan.</p>
    </div>
    {#if !created}
    <form onsubmit={create} class="space-y-3">
      <div class="input-well px-4 py-3 flex items-center">
        <i class="fa-solid fa-money-bill text-[var(--text-muted)] mr-3"></i>
        <input type="number" min="1" bind:value={amount} placeholder="Nominal (Rp)" class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]" />
      </div>
      <button type="submit" disabled={busy} class="tactile-btn w-full py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2 disabled:opacity-50">
        <i class="fa-solid fa-qrcode"></i> {busy ? "Membuat..." : "Buat QRIS Sandbox"}
      </button>
    </form>
    {/if}
    {#if created}
      {#if paid}
        <div class="text-center py-4 space-y-3 pt-2 border-t border-[var(--border-subtle)]">
          <div class="w-16 h-16 mx-auto rounded-full bg-emerald-100/80 dark:bg-emerald-500/10 flex items-center justify-center">
            <i class="fa-solid fa-circle-check text-3xl text-emerald-500"></i>
          </div>
          <p class="font-bold text-lg">QRIS Lunas</p>
          <p class="text-xs text-[var(--text-muted)]">TRX <code class="font-mono text-[var(--accent)]">{created.trx_id}</code></p>
          <button onclick={reset} class="tactile-btn w-full py-2.5 font-bold text-[var(--accent)] rounded-xl text-xs">Buat Lagi</button>
        </div>
      {:else if expired}
        <div class="text-center py-4 space-y-3 pt-2 border-t border-[var(--border-subtle)]">
          <div class="w-16 h-16 mx-auto rounded-full bg-red-100/80 dark:bg-red-500/10 flex items-center justify-center">
            <i class="fa-solid fa-hourglass-end text-3xl text-red-500"></i>
          </div>
          <p class="font-bold text-lg">QRIS Kedaluwarsa</p>
          <p class="text-xs text-[var(--text-muted)]">TRX <code class="font-mono text-[var(--accent)]">{created.trx_id}</code></p>
          <button onclick={reset} class="tactile-btn w-full py-2.5 font-bold text-[var(--accent)] rounded-xl text-xs">Buat Lagi</button>
        </div>
      {:else}
        <div class="space-y-4 pt-2 border-t border-[var(--border-subtle)]">
          <div class="flex justify-center pt-2">
            {#if !qr}
              <div class="flex justify-center py-8"><div class="w-8 h-8 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin"></div></div>
            {:else}
              <img src={qr} alt="QRIS sandbox" class="w-52 h-52 rounded-xl tactile-inset" />
            {/if}
          </div>
          <p class="text-center text-xs font-bold {remaining > 0 ? 'text-[var(--accent)]' : 'text-red-500'}">
            {#if remaining > 0}Berlaku {remainingTxt}{:else}Kedaluwarsa{/if}
          </p>
          <div class="tactile-inset p-4 space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-[var(--text-muted)]">Nominal</span>
              <span class="font-semibold">{fmtIDR(created.amount)}</span>
            </div>
            {#if created.fee_amount > 0}
              <div class="flex justify-between">
                <span class="text-[var(--text-muted)]">Biaya Layanan</span>
                <span class="font-semibold">{fmtIDR(created.fee_amount)}</span>
              </div>
            {/if}
            <div class="flex justify-between">
              <span class="text-[var(--text-muted)]">Kode Unik</span>
              <span class="font-semibold">{fmtIDR(created.unique_code || 0)}</span>
            </div>
            <div class="flex justify-between pt-2 border-t border-[var(--border-subtle)]">
              <span class="font-bold">Total Dibayar</span>
              <span class="font-bold text-[var(--accent)]">{fmtIDR(created.amount_to_pay)}</span>
            </div>
            <div class="flex justify-between items-center gap-2">
              <span class="text-[var(--text-muted)] text-xs font-mono">trx_id: {created.trx_id}</span>
              <button onclick={() => copy(created.trx_id, 'trx')} class="tactile-btn w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)]" title="Salin trx_id">
                <i class="fa-solid {copied === 'trx' ? 'fa-check text-emerald-500' : 'fa-copy'}"></i>
              </button>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <div class="tactile-box p-5 space-y-4">
    <div>
      <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-money-bill-wave text-[var(--accent)]"></i> Simulasi Bayar / Expired</h2>
      <p class="text-xs text-[var(--text-muted)] mt-1">Flip status jadi paid / expired + kirim webhook asli (kalau webhook aktif).</p>
    </div>
    {#if simMsg}<p class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">{simMsg}</p>{/if}
    <form onsubmit={pay} class="space-y-3">
      <div class="input-well px-4 py-3 flex items-center">
        <i class="fa-solid fa-barcode text-[var(--text-muted)] mr-3"></i>
        <input bind:value={payId} placeholder="trx_id sandbox (ex: TRX-XXXX)" class="bg-transparent w-full text-sm font-mono focus:outline-none placeholder:text-[var(--text-muted)]" />
      </div>
      <button type="submit" disabled={payBusy || expireBusy || !payId.trim()} class="tactile-btn w-full py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2 disabled:opacity-50">
        <i class="fa-solid fa-money-bill-wave"></i> {payBusy ? "Memproses..." : "Simulasi Bayar"}
      </button>
      <button type="button" onclick={expire} disabled={payBusy || expireBusy || !payId.trim()} class="tactile-btn w-full py-3 font-bold text-red-500 flex items-center justify-center gap-2 disabled:opacity-50">
        <i class="fa-solid fa-hourglass-end"></i> {expireBusy ? "Memproses..." : "Simulasi Expired"}
      </button>
    </form>
  </div>
</div>
