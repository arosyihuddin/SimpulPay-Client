<script lang="ts">
  import { onMount } from 'svelte';
  import { admin, fmtIDR, fmtTime } from '$lib/api';
  import { useWs } from '$lib/useWs';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import Stat from '$lib/components/Stat.svelte';
  import DashboardPanels from '$lib/components/DashboardPanels.svelte';
  import { merchants, loadMerchants, setActiveMerchant } from '$lib/merchant.svelte';

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

  async function load() {
    if (!merchants.active) return;
    admin.dashboard(merchants.active.id).then((d) => (data = d.data)).catch((e) => (err = e.message));
  }

  onMount(() => { loadMerchants(); });
  $effect(() => { load(); });

  useWs((m) => {
    if (m.type === 'qris_created' || m.type === 'qris_status') load();
  });

  async function createQris(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    err = '';
    created = null;
    try {
      const a = parseInt(amount, 10);
      if (!a || a <= 0) throw new Error('Nominal tidak valid');
      const res = await admin.createQris(a, merchants.active?.id);
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
  {#if merchants.list.length > 1}
    <div class="flex items-center gap-3">
      <label for="dash-merchant" class="text-xs font-bold text-[var(--text-muted)] whitespace-nowrap"><i class="fa-solid fa-store mr-1"></i> Merchant</label>
      <select
        id="dash-merchant"
        value={merchants.activeId ?? ''}
        onchange={(e) => setActiveMerchant((e.target as HTMLSelectElement).value)}
        class="w-full max-w-xs tactile-inset px-3 py-2.5 text-sm focus:outline-none cursor-pointer"
      >
        {#each merchants.list as m (m.id)}
          <option value={m.id}>{m.name}</option>
        {/each}
      </select>
    </div>
  {/if}
  {#if session?.exists === false}
    <div class="bg-amber-100/70 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30 rounded-2xl px-4 py-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
      ⚠️ Sesi GoBiz belum ada. Login OTP lewat <a href="/admin/settings" class="underline">Settings</a>.
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
    <!-- Skeleton card info merchant -->
    <div class="tactile-box p-5 text-sm space-y-2.5">
      <div class="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
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

  <DashboardPanels />
</div>
