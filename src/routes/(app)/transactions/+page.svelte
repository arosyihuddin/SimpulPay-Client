<script lang="ts">
  import { admin, fmtIDR, fmtTime } from '$lib/api';
  import { useWs } from '$lib/useWs';
  import Pagination from '$lib/components/Pagination.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';

  interface Tx { amount: number; status: string; time: string; issuer: string; order_id?: string; transaction_id?: string; }

  const statusBadge = (st: string) =>
    st === 'settlement' || st === 'capture'
      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/30'
      : 'text-slate-500 bg-slate-200/50 dark:bg-slate-700/30 border border-slate-300/40 dark:border-slate-600/30';

  const PAGE_SIZE = 20;

  let txs = $state<Tx[]>([]);
  let grandTotal = $state(0);
  let total = $state(0);
  let page = $state(1);
  let err = $state('');
  let busy = $state(true);

  async function load() {
    busy = true;
    admin.transactions(page, PAGE_SIZE)
      .then((d) => {
        const list: Tx[] = d.data?.transactions || [];
        txs = list; total = d.data?.total || 0;
        grandTotal = list.reduce((a: number, t: Tx) => a + (t.amount || 0), 0);
      })
      .catch((e) => (err = e.message))
      .finally(() => (busy = false));
  }
  $effect(() => { load(); });

  useWs((m) => { if (m.type === 'qris_status') load(); });
</script>

<div class="space-y-6">
  <h1 class="text-xl font-bold tracking-wide">Transaksi (Bulan Ini)</h1>

  <div class="tactile-box p-4 inline-block">
    <p class="text-[11px] text-[var(--text-muted)] font-medium">Total Nominal</p>
    <p class="text-2xl font-extrabold text-[var(--accent)]">{fmtIDR(grandTotal)}</p>
  </div>

  {#if err}
    <p class="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30 rounded-2xl px-4 py-3">
      <i class="fa-solid fa-triangle-exclamation mr-2"></i>{err}
    </p>
  {/if}

  <div class="hidden md:block tactile-box overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
          <th class="px-4 py-3 font-medium">Order ID</th><th class="px-4 py-3 font-medium">Transaksi ID</th>
          <th class="px-4 py-3 font-medium">Nominal</th><th class="px-4 py-3 font-medium">Status</th>
          <th class="px-4 py-3 font-medium">Sumber</th><th class="px-4 py-3 font-medium">Waktu</th>
        </tr>
      </thead>
      <tbody>
        {#if busy}
          {#each Array.from({ length: 5 }) as _, i}
            <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
              {#each Array.from({ length: 6 }) as _, j}
                <td class="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
              {/each}
            </tr>
          {/each}
        {:else}
          {#each txs as t, i}
            <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
              <td class="px-4 py-3 font-mono text-xs">{t.order_id || '-'}</td>
              <td class="px-4 py-3 font-mono text-xs">{t.transaction_id || '-'}</td>
              <td class="px-4 py-3 font-semibold">{fmtIDR(t.amount)}</td>
              <td class="px-4 py-3"><span class="text-xs font-semibold px-2.5 py-1 rounded-full {statusBadge(t.status)}">{t.status}</span></td>
              <td class="px-4 py-3">{t.issuer}</td>
              <td class="px-4 py-3 text-xs">{fmtTime(t.time)}</td>
            </tr>
          {/each}
        {/if}
        {#if !busy && txs.length === 0}
          <tr><td colspan={6} class="px-4 py-8 text-center text-[var(--text-muted)]">Belum ada transaksi</td></tr>
        {/if}
      </tbody>
    </table>
  </div>

  <div class="md:hidden space-y-3">
    {#if busy}
      {#each Array.from({ length: 3 }) as _, i}
        <div class="tactile-box p-4 space-y-2">
          <Skeleton className="h-5 w-32" /><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-40" />
        </div>
      {/each}
    {:else}
      {#each txs as t, i}
        <div class="tactile-box p-4 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-base font-bold">{fmtIDR(t.amount)}</span>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full {statusBadge(t.status)}">{t.status}</span>
          </div>
          <p class="text-xs text-[var(--text-muted)]">{t.issuer}</p>
          <div class="text-xs space-y-1 font-mono">
            <p class="text-[var(--text-muted)]">Order: <span>{t.order_id || '-'}</span></p>
            <p class="text-[var(--text-muted)]">Trx: <span>{t.transaction_id || '-'}</span></p>
          </div>
          <p class="text-xs text-[var(--text-muted)]">{fmtTime(t.time)}</p>
        </div>
      {/each}
    {/if}
    {#if !busy && txs.length === 0}<p class="text-center text-[var(--text-muted)] py-8">Belum ada transaksi</p>{/if}
  </div>

  {#if total > PAGE_SIZE}
    <Pagination {page} {total} pageSize={PAGE_SIZE} onChange={(p) => { page = p; }} />
  {/if}
</div>