<script lang="ts">
  import { onMount } from 'svelte';
  import { admin, fmtIDR } from '$lib/api';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import QrCodeModal from '$lib/components/QrCodeModal.svelte';
  import { addToast } from '$lib/toast.svelte';

  interface Plan {
    id: string; name: string; type: string; price: number;
    max_merchants: number; daily_paid_limit: number | null;
    features_json: string | null; active: boolean;
  }
  interface Subscription {
    id: string;
    plan_id: string;
    plan_name: string;
    status: string;
    starts_at: number;
    ends_at: number;
    created_at: number;
  }
  interface Invoice {
    id: string;
    amount: number;
    status: string;
    period_start: number;
    period_end: number;
    paid_at: number | null;
    created_at: number;
  }

  let sub = $state<Subscription | null>(null);
  let invoices = $state<Invoice[]>([]);
  let loading = $state(true);
  let err = $state('');
  let plans = $state<Plan[]>([]);
  let showPlans = $state(false);

  const fmtDate = (n: number | null) =>
    n ? new Date(n).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const statusCls = (st: string) =>
    st === 'active' || st === 'paid' || st === 'PAID' || st === 'Lunas'
      ? 'tactile-pill pill-green'
    : st === 'pending'
      ? 'tactile-pill pill-amber'
    : st === 'overdue' || st === 'failed'
      ? 'tactile-pill pill-red'
    : 'tactile-pill pill-gray';

  const parseFeatures = (j: string | null): string[] => {
    if (!j) return [];
    try {
      const v = JSON.parse(j);
      if (Array.isArray(v)) return v.map(String);
      if (typeof v === 'object' && v !== null)
        return Object.keys(v).map((k) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    } catch {}
    return [];
  };
  const fmtPrice = (p: number) => p <= 0 ? 'Gratis' : fmtIDR(p) + ' / bln';

  async function load() {
    loading = true; err = '';
    try {
      const [sRes, iRes, pRes] = await Promise.all([admin.mySubscription(), admin.myInvoices(), admin.listPlans()]);
      const s = sRes.data?.subscription;
      sub = s ?? null;
      invoices = iRes.data?.invoices || [];
      plans = pRes.data?.plans || [];
    } catch (e: any) { err = e.message; }
    finally { loading = false; }
  }
  onMount(load);

  function openPlans() { showPlans = true; }
  function closePlans() { showPlans = false; }

  let subscribing = $state('');
  let pay = $state<any | null>(null);
  async function subscribe(p: Plan) {
    subscribing = p.id; err = '';
    try {
      const res = await admin.subscribe(p.id, p.price);
      closePlans();
      const d = res.data || {};
      if (d.qris_code) {
        pay = { code: d.qris_code, amount: d.amount_to_pay || d.amount, trx_id: d.trx_id || '' };
      } else {
        addToast('success', 'Langganan ' + p.name + ' aktif.');
        load();
      }
    } catch (e: any) { err = e.message; addToast('error', e.message); }
    finally { subscribing = ''; }
  }
</script>

<div class="space-y-6">
  {#if err}
    <p class="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-2xl px-4 py-3"><i class="fa-solid fa-circle-exclamation mr-2"></i>{err}</p>
  {/if}

  <!-- Plan Aktif -->
  <div class="tactile-box p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    {#if loading}
      <div class="w-full space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div class="w-full sm:w-auto space-y-2 sm:text-right">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-40" />
      </div>
    {:else if sub}
      <div>
        <p class="text-[11px] text-[var(--text-muted)] font-medium mb-1">Plan Aktif</p>
        <div class="flex items-center gap-3">
          <h2 class="text-2xl font-extrabold">{sub.plan_name}</h2>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full {statusCls(sub.status)}">{sub.status === 'active' ? 'Aktif' : sub.status}</span>
        </div>
      </div>
      <div class="text-sm space-y-1.5 sm:text-right">
        {#if sub.plan_id !== 'p_free'}
          <p class="flex sm:justify-end gap-3"><span class="text-[var(--text-muted)]">Mulai</span><span class="font-semibold">{fmtDate(sub.starts_at)}</span></p>
          <p class="flex sm:justify-end gap-3"><span class="text-[var(--text-muted)]">Tagihan Berikutnya</span><span class="font-semibold text-[var(--accent)]">{fmtDate(sub.ends_at)}</span></p>
        {/if}
        <button onclick={openPlans} class="tactile-btn px-4 py-2 text-xs font-bold text-[var(--accent)] mt-1">{sub.plan_id === 'p_free' ? 'Upgrade Plan' : 'Perpanjang Langganan'}</button>
      </div>
    {:else}
      <div class="w-full text-center py-6">
        <p class="text-[var(--text-muted)] text-sm">Belum ada langganan aktif.</p>
        <a href="/admin/plans" class="tactile-btn inline-flex px-4 py-2 text-xs font-bold text-[var(--accent)] mt-3">Lihat Paket</a>
      </div>
    {/if}
  </div>

  <!-- Riwayat Pembelian -->
  {#if invoices.length > 0}
    <div class="hidden md:block tactile-box overflow-x-auto">
      <div class="px-4 pt-4 pb-2">
        <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-receipt text-[var(--accent)]"></i> Riwayat Pembelian</h2>
      </div>
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
            <th class="px-4 py-3 font-medium">Invoice</th>
            <th class="px-4 py-3 font-medium">Jumlah</th>
            <th class="px-4 py-3 font-medium">Periode</th>
            <th class="px-4 py-3 font-medium">Dibayar</th>
            <th class="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {#each invoices as i (i.id)}
            <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
              <td class="px-4 py-3 font-mono text-xs font-bold">{i.id}</td>
              <td class="px-4 py-3 font-semibold">{fmtIDR(i.amount)}</td>
              <td class="px-4 py-3 text-xs text-[var(--text-muted)]">{fmtDate(i.period_start)} — {fmtDate(i.period_end)}</td>
              <td class="px-4 py-3 text-xs text-[var(--text-muted)]">{i.paid_at ? fmtDate(i.paid_at) : '—'}</td>
              <td class="px-4 py-3"><span class="text-xs font-semibold px-2.5 py-1 rounded-full {statusCls(i.status)}">{i.status}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="md:hidden space-y-3">
      <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-receipt text-[var(--accent)]"></i> Riwayat Pembelian</h2>
      {#each invoices as i (i.id)}
        <div class="tactile-box p-4 space-y-2">
          <div class="flex items-center justify-between">
            <p class="font-bold">{fmtIDR(i.amount)}</p>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full {statusCls(i.status)}">{i.status}</span>
          </div>
          <p class="text-xs font-mono text-[var(--text-muted)]">{i.id}</p>
          <div class="text-xs text-[var(--text-muted)] flex justify-between">
            <span>{fmtDate(i.period_start)} — {fmtDate(i.period_end)}</span>
            <span>{i.paid_at ? fmtDate(i.paid_at) : '—'}</span>
          </div>
        </div>
      {/each}
    </div>
  {:else if !loading}
    <div class="tactile-box p-10 text-center text-sm text-[var(--text-muted)]">
      Belum ada riwayat pembelian.
    </div>
  {/if}
</div>

<!-- Pilih paket modal -->
{#if showPlans}
  <div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={closePlans}></button>
    <div class="tactile-modal w-full max-w-3xl p-6 relative z-50 max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
        <h3 class="text-lg font-bold">Pilih Paket</h3>
        <button type="button" aria-label="Tutup" onclick={closePlans} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 auto-rows-fr gap-4 pt-2">
        {#each plans.filter(p => p.active) as p (p.id)}
          <div class="tactile-box p-5 space-y-3 flex flex-col {p.id === sub?.plan_id ? 'ring-2 ring-[var(--accent)]' : ''}">
            <div class="flex items-center justify-between">
              <p class="font-bold text-lg">{p.name}</p>
              {#if p.id === sub?.plan_id}
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30">Aktif</span>
              {/if}
            </div>
            <p class="text-2xl font-extrabold text-[var(--accent)]">{fmtPrice(p.price)}</p>
            <div class="space-y-1 text-xs">
              <div class="flex justify-between border-b border-[var(--border-subtle)] pb-1">
                <span class="text-[var(--text-muted)]">Maks Merchant</span>
                <span class="font-bold">{p.max_merchants}</span>
              </div>
              <div class="flex justify-between border-b border-[var(--border-subtle)] pb-1">
                <span class="text-[var(--text-muted)]">Limit Transaksi/Hari</span>
                <span class="font-bold">{p.daily_paid_limit == null ? 'Unlimited' : p.daily_paid_limit}</span>
              </div>
            </div>
            {#if parseFeatures(p.features_json).length > 0}
              <div class="space-y-1">
                {#each parseFeatures(p.features_json) as f (f)}
                  <p class="text-xs flex items-start gap-1.5">
                    <i class="fa-solid fa-circle-check text-emerald-500 dark:text-emerald-400 mt-0.5 text-[10px]"></i>
                    <span class="text-[var(--text-muted)]">{f}</span>
                  </p>
                {/each}
              </div>
            {/if}
            {#if p.id !== sub?.plan_id}
              <button
                class="w-full py-2.5 text-sm font-bold text-white bg-[var(--accent)] rounded-xl shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] mt-auto disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={subscribing !== ''}
                onclick={() => subscribe(p)}
              >{subscribing === p.id ? 'Memproses...' : 'Pilih ' + p.name}</button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<!-- QRIS pembayaran langganan -->
{#if pay}
  <QrCodeModal code={pay.code} qrAmount={pay.amount} onClose={() => (pay = null)} />
{/if}