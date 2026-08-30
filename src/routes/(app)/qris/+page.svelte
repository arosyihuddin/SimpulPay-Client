<script lang="ts">
  import { admin, fmtIDR, fmtTime, API_BASE } from '$lib/api';
  import { merchants } from '$lib/merchant.svelte';
  import { useWs } from '$lib/useWs';
  import Pagination from '$lib/components/Pagination.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';

  interface QrisRow {
    id: string; code: string; amount: number; base_amount: number; unique_code: number;
    trx_id: string; status: string; transaction_json: string | null; created_at: number; expires_at: number;
  }

  const statusBadge = (st: string) =>
    st === 'PAID'
      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/30'
      : st === 'EXPIRED'
        ? 'text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30'
        : 'text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30';

  const PAGE_SIZE = 10;

  let rows = $state<QrisRow[]>([]);
  let total = $state(0);
  let page = $state(1);
  let amount = $state('');
  let created = $state<any>(null);
  let err = $state('');
  let busy = $state(false);
  let loading = $state(true);

  async function load() {
    loading = true;
    admin.listQris(PAGE_SIZE, (page - 1) * PAGE_SIZE, merchants.active?.id)
      .then((d) => { rows = d.data.qris; total = d.data.total; })
      .catch((e) => (err = e.message))
      .finally(() => (loading = false));
  }
  $effect(() => { load(); });

  useWs((m) => {
    if (m.type === 'qris_status' && m.data?.id) {
      rows = rows.map((r) =>
        r.id === m.data.id
          ? { ...r, status: m.data.status, transaction_json: m.data.transaction_json ?? r.transaction_json }
          : r
      );
    } else if (m.type === 'qris_created') {
      load();
    }
  });

  async function create(e: SubmitEvent) {
    e.preventDefault();
    busy = true; err = ''; created = null;
    try {
      const a = parseInt(amount, 10);
      if (!a || a <= 0) throw new Error('Nominal tidak valid');
      const res = await admin.createQris(a, merchants.active?.id);
      created = res.data; amount = ''; load();
    } catch (e: any) { err = e.message; }
    finally { busy = false; }
  }
</script>

<div class="space-y-6">
  <div class="tactile-box p-5 space-y-4">
    <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-qrcode text-[var(--accent)]"></i> Buat QRIS Dinamis</h2>
    {#if err}<p class="text-xs font-semibold text-red-500">{err}</p>{/if}
    {#if merchants.active && !merchants.active.qris_static_set}
      <div class="bg-amber-100/70 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30 rounded-2xl px-4 py-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
        ⚠️ QRIS static belum diatur. Scan QRIS static dulu di <a href="/admin/settings" class="underline">Settings → Konfigurasi QRIS</a> sebelum buat QR dinamis.
      </div>
    {/if}
    <form onsubmit={create} class="flex gap-2">
      <div class="input-well px-4 py-3 flex items-center flex-1">
        <i class="fa-solid fa-money-bill text-[var(--text-muted)] mr-3"></i>
        <input type="number" min="1" bind:value={amount} placeholder="Nominal (Rp)" class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]" />
      </div>
      <button type="submit" disabled={busy || (merchants.active && !merchants.active.qris_static_set)} class="tactile-btn px-5 py-3 font-bold text-[var(--accent)] flex items-center gap-2">
        <i class="fa-solid fa-plus"></i> {busy ? 'Buat...' : 'Buat'}
      </button>
    </form>
    {#if created}
      <div class="bg-emerald-100/70 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/30 rounded-2xl p-4 space-y-2 text-sm">
        <p class="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2"><i class="fa-solid fa-circle-check"></i> QRIS dibuat!</p>
        <p class="flex justify-between gap-3"><span class="text-[var(--text-muted)] shrink-0">TRX-ID</span><span class="font-mono text-xs break-all text-right">{created.trx_id}</span></p>
        <div class="flex items-center justify-between gap-3">
          <span class="text-[var(--text-muted)] shrink-0">Halaman</span>
          <a href={created.qris_url} target="_blank" rel="noreferrer" class="text-xs text-[var(--accent)] underline whitespace-nowrap"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>buka</a>
        </div>
      </div>
    {/if}
  </div>

  <!-- Desktop table -->
  <div class="hidden md:block tactile-box overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
          <th class="px-4 py-3 font-medium">QRIS ID</th><th class="px-4 py-3 font-medium">TRX-ID</th>
          <th class="px-4 py-3 font-medium">Nominal</th><th class="px-4 py-3 font-medium">Status</th>
          <th class="px-4 py-3 font-medium">Dibuat</th><th class="px-4 py-3 font-medium">Kadaluwarsa</th>
        </tr>
      </thead>
      <tbody>
        {#if loading}
          {#each Array.from({ length: 5 }) as _, i}
            <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
              {#each Array.from({ length: 6 }) as _, j}
                <td class="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
              {/each}
            </tr>
          {/each}
        {:else}
          {#each rows as r (r.id)}
            <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
              <td class="px-4 py-3"><span class="text-[var(--accent)] font-mono">{r.id}</span>
                <div class="text-xs"><a href={`${API_BASE}/qr/${r.id}`} target="_blank" class="text-[var(--text-muted)] hover:text-[var(--accent)]"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>buka</a></div>
              </td>
              <td class="px-4 py-3 font-mono text-xs">{r.trx_id}</td>
              <td class="px-4 py-3 font-semibold">
                {fmtIDR(r.amount)}
                {#if r.unique_code > 0}
                  <span class="block text-[10px] text-[var(--text-muted)] font-normal">= {fmtIDR(r.base_amount || r.amount - r.unique_code)} + {r.unique_code}</span>
                {/if}
              </td>
              <td class="px-4 py-3"><span class="text-xs font-semibold px-2.5 py-1 rounded-full {statusBadge(r.status)}">{r.status}</span></td>
              <td class="px-4 py-3 text-xs">{fmtTime(r.created_at)}</td>
              <td class="px-4 py-3 text-xs">{fmtTime(r.expires_at)}</td>
            </tr>
          {/each}
        {/if}
        {#if !loading && rows.length === 0}
          <tr><td colspan={6} class="px-4 py-8 text-center text-[var(--text-muted)]">Belum ada QRIS</td></tr>
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Mobile cards -->
  <div class="md:hidden space-y-3">
    {#if loading}
      {#each Array.from({ length: 3 }) as _, i}
        <div class="tactile-box p-4 space-y-2">
          <Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-32" /><Skeleton className="h-3 w-40" />
        </div>
      {/each}
    {:else}
      {#each rows as r (r.id)}
        <div class="tactile-box p-4 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-mono text-[var(--accent)] text-xs">{r.id}</span>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full {statusBadge(r.status)}">{r.status}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-base font-bold">{fmtIDR(r.amount)}</span>
            {#if r.unique_code > 0}<span class="text-[10px] text-[var(--text-muted)]">= {fmtIDR(r.base_amount || r.amount - r.unique_code)} + {r.unique_code}</span>{/if}
            <a href={`${API_BASE}/qr/${r.id}`} target="_blank" class="text-xs text-[var(--accent)] underline"><i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>buka</a>
          </div>
          <p class="text-xs font-mono text-[var(--text-muted)]">{r.trx_id}</p>
          <div class="text-xs text-[var(--text-muted)] flex justify-between">
            <span>Dibuat: {fmtTime(r.created_at)}</span><span>Kadaluwarsa: {fmtTime(r.expires_at)}</span>
          </div>
        </div>
      {/each}
    {/if}
    {#if !loading && rows.length === 0}<p class="text-center text-[var(--text-muted)] py-8">Belum ada QRIS</p>{/if}
  </div>

  {#if total > PAGE_SIZE}
    <Pagination {page} {total} pageSize={PAGE_SIZE} onChange={(p) => { page = p; }} />
  {/if}
</div>