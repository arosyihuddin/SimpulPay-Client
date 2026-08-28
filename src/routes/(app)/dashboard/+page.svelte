<script lang="ts">
  import { onMount } from 'svelte';
  import { admin, fmtIDR, fmtTime } from '$lib/api';
  import { useWs } from '$lib/useWs';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import Stat from '$lib/components/Stat.svelte';

  interface DashboardData {
    stats: {
      today_income: number;
      month_income: number | null;
      total_transactions: number | null;
      active_qris: number;
      total_qris: number;
    };
    gobiz_session: {
      exists: boolean;
      phone?: string;
      outlet?: string;
      merchant_id?: string | null;
      expired?: boolean;
      expires_at?: string | null;
    };
    month_fetch_error?: string | null;
  }

  let data = $state<DashboardData | null>(null);
  let amount = $state('');
  let created = $state<any>(null);
  let err = $state('');
  let busy = $state(false);
  let qrisStaticSet = $state<boolean | null>(null);

  async function load() {
    admin.dashboard().then((d) => (data = d.data)).catch((e) => (err = e.message));
  }

  onMount(() => { load(); });

  useWs((m) => {
    if (m.type === 'qris_created' || m.type === 'qris_status') load();
  });

  onMount(() => {
    admin.settings().then((d) => (qrisStaticSet = !!d.data.qris_static_set)).catch(() => {});
  });

  async function createQris(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    err = '';
    created = null;
    try {
      const a = parseInt(amount, 10);
      if (!a || a <= 0) throw new Error('Nominal tidak valid');
      const res = await admin.createQris(a);
      created = res.data;
      amount = '';
      load();
    } catch (e: any) {
      err = e.message;
    } finally {
      busy = false;
    }
  }

  const s = $derived(data?.stats);
  const session = $derived(data?.gobiz_session);
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-xl font-bold tracking-wide">Dashboard</h1>
  </div>

  {#if session?.exists === false}
    <div class="bg-amber-100/70 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30 rounded-2xl px-4 py-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
      ⚠️ Sesi GoBiz belum ada. Login OTP lewat <a href="/settings" class="underline">Settings</a>.
    </div>
  {/if}

  {#if !data}
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {#each Array.from({ length: 5 }) as _, i}
        <div class="tactile-box p-4 space-y-2">
          <div class="flex items-center gap-3">
            <Skeleton className="w-4 h-4" />
            <Skeleton className="h-3 flex-1" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      {/each}
    </div>
  {/if}

  {#if data}
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <Stat icon="fa-solid fa-money-bill-trend-up" label="Hari Ini" value={fmtIDR(s?.today_income)} />
      <Stat icon="fa-solid fa-chart-line" label="Bulan Ini" value={s?.month_income == null ? '—' : fmtIDR(s.month_income)} />
      <Stat icon="fa-solid fa-receipt" label="Transaksi" value={String(s?.total_transactions ?? '—')} />
      <Stat icon="fa-solid fa-qrcode" label="QRIS Aktif" value={String(s?.active_qris ?? 0)} />
      <Stat icon="fa-solid fa-folder" label="Total QRIS" value={String(s?.total_qris ?? 0)} />
    </div>
  {/if}

  {#if data?.month_fetch_error}
    <p class="text-xs text-[var(--text-muted)]">Catatan: {data.month_fetch_error}</p>
  {/if}

  {#if session?.exists}
    <div class="tactile-box p-5 text-sm space-y-2.5">
      <div class="flex items-center gap-3">
        <div class="tactile-btn w-10 h-10 flex items-center justify-center text-emerald-500 text-sm font-bold">
          {(session.outlet || 'G').slice(0, 1)}
        </div>
        <span class="font-semibold">{session.outlet || 'Outlet'}</span>
      </div>
      <div class="flex justify-between gap-3">
        <span class="text-[var(--text-muted)] shrink-0">HP</span>
        <span class="break-all text-right">{session.phone || '-'}</span>
      </div>
      <div class="flex justify-between gap-3">
        <span class="text-[var(--text-muted)] shrink-0">Merchant ID</span>
        <span class="break-all text-right">{session.merchant_id || '-'}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-[var(--text-muted)]">Token</span>
        <span class={session.expired ? 'text-red-500' : 'text-emerald-500'}>
          <i class="fa-solid {session.expired ? 'fa-circle-xmark' : 'fa-circle-check'} mr-1"></i>
          {session.expired ? 'Expired' : 'Valid'} · {fmtTime(session.expires_at)}
        </span>
      </div>
    </div>
  {/if}

  <div class="tactile-box p-5 space-y-4">
    <form onsubmit={createQris} class="space-y-4">
      <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-qrcode text-[var(--accent)]"></i> Buat QRIS Dinamis</h2>
      {#if err}<p class="text-xs font-semibold text-red-500">{err}</p>{/if}
      {#if qrisStaticSet === false}
        <div class="bg-amber-100/70 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30 rounded-2xl px-4 py-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
          ⚠️ QRIS static belum diatur. Scan QRIS static dulu di <a href="/settings" class="underline">Settings → Konfigurasi QRIS</a> sebelum buat QR dinamis.
        </div>
      {/if}
      <div class="input-well px-4 py-3 flex items-center">
        <i class="fa-solid fa-money-bill text-[var(--text-muted)] mr-3"></i>
        <input
          type="number" min="1" bind:value={amount}
          placeholder="Nominal (Rp)" class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]"
        />
      </div>
      <button
        type="submit"
        disabled={busy || qrisStaticSet === false}
        class="tactile-btn w-full py-4 font-bold text-[var(--accent)] flex items-center justify-center gap-2"
      >
        <i class="fa-solid fa-plus"></i>
        {busy ? 'Buat...' : 'Buat QRIS'}
      </button>
      {#if created}
        <div class="bg-emerald-100/70 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/30 rounded-2xl p-4 space-y-2 text-sm">
          <p class="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
            <i class="fa-solid fa-circle-check"></i> QRIS dibuat!
          </p>
          <div class="flex justify-between gap-3">
            <span class="text-[var(--text-muted)] shrink-0">TRX-ID</span>
            <span class="font-mono text-xs break-all text-right">{created.trx_id}</span>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-[var(--text-muted)] shrink-0">Halaman</span>
            <a href={created.qris_url} target="_blank" rel="noreferrer" class="text-xs text-[var(--accent)] underline whitespace-nowrap">
              <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>buka
            </a>
          </div>
        </div>
      {/if}
    </form>
  </div>
</div>
