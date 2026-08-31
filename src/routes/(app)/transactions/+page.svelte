<script lang="ts">
  import { admin, fmtIDR, fmtTime } from "$lib/api";
  import { useWs } from "$lib/useWs";
  import Pagination from "$lib/components/Pagination.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";

  interface TxRow {
    id: string;
    trx_id: string;
    merchant_id: string;
    amount: number;
    base_amount: number;
    unique_code: number;
    status: string;
    created_at: number;
    expires_at: number;
  }

  const statusBadge = (st: string) =>
    st === "PAID" || st === "settlement" || st === "capture"
      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/30"
      : st === "EXPIRED" || st === "expired"
        ? "text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30"
        : "text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30";

  const PAGE_SIZE = 20;

  let rows = $state<TxRow[]>([]);
  let total = $state(0);
  let curPage = $state(1);
  let err = $state("");
  let loading = $state(true);

  async function load() {
    loading = true;
    admin
      .transactions(PAGE_SIZE, (curPage - 1) * PAGE_SIZE)
      .then((d) => {
        rows = d.data?.transactions || [];
        total = d.data?.total || 0;
      })
      .catch((e) => (err = e.message))
      .finally(() => (loading = false));
  }
  $effect(() => {
    load();
  });

  useWs((m) => {
    if (m.type === "qris_status" || m.type === "qris_created") load();
  });
</script>

<div class="space-y-6">
  {#if err}
    <p
      class="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30 rounded-2xl px-4 py-3"
    >
      <i class="fa-solid fa-triangle-exclamation mr-2"></i>{err}
    </p>
  {/if}

  <!-- Desktop table -->
  <div class="hidden md:block tactile-box overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr
          class="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]"
        >
          <th class="px-4 py-3 font-medium">TRX-ID</th><th
            class="px-4 py-3 font-medium">Merchant</th
          >
          <th class="px-4 py-3 font-medium">Nominal</th><th
            class="px-4 py-3 font-medium">Status</th
          >
          <th class="px-4 py-3 font-medium">Dibuat</th><th
            class="px-4 py-3 font-medium">Kadaluwarsa</th
          >
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
              <td class="px-4 py-3 font-mono text-xs">{r.trx_id}</td>
              <td class="px-4 py-3 font-mono text-xs text-[var(--text-muted)]"
                >{r.merchant_id}</td
              >
              <td class="px-4 py-3 font-semibold">
                {fmtIDR(r.amount)}
                {#if r.unique_code > 0}
                  <span
                    class="block text-[10px] text-[var(--text-muted)] font-normal"
                    >= {fmtIDR(r.base_amount || r.amount - r.unique_code)} + {r.unique_code}</span
                  >
                {/if}
              </td>
              <td class="px-4 py-3"
                ><span
                  class="text-xs font-semibold px-2.5 py-1 rounded-full {statusBadge(
                    r.status,
                  )}">{r.status}</span
                ></td
              >
              <td class="px-4 py-3 text-xs">{fmtTime(r.created_at)}</td>
              <td class="px-4 py-3 text-xs">{fmtTime(r.expires_at)}</td>
            </tr>
          {/each}
        {/if}
        {#if !loading && rows.length === 0}
          <tr
            ><td
              colspan={6}
              class="px-4 py-8 text-center text-[var(--text-muted)]"
              >Belum ada transaksi</td
            ></tr
          >
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Mobile cards -->
  <div class="md:hidden space-y-3">
    {#if loading}
      {#each Array.from({ length: 3 }) as _, i}
        <div class="tactile-box p-4 space-y-2">
          <Skeleton className="h-4 w-24" /><Skeleton
            className="h-5 w-32"
          /><Skeleton className="h-3 w-40" />
        </div>
      {/each}
    {:else}
      {#each rows as r (r.id)}
        <div class="tactile-box p-4 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-mono text-[var(--accent)] text-xs"
              >{r.trx_id}</span
            >
            <span
              class="text-xs font-semibold px-2.5 py-1 rounded-full {statusBadge(
                r.status,
              )}">{r.status}</span
            >
          </div>
          <div class="flex items-center justify-between">
            <span class="text-base font-bold">{fmtIDR(r.amount)}</span>
            {#if r.unique_code > 0}<span
                class="text-[10px] text-[var(--text-muted)]"
                >= {fmtIDR(r.base_amount || r.amount - r.unique_code)} + {r.unique_code}</span
              >{/if}
          </div>
          <p class="text-xs font-mono text-[var(--text-muted)]">
            {r.merchant_id}
          </p>
          <div class="text-xs text-[var(--text-muted)] flex justify-between">
            <span>Dibuat: {fmtTime(r.created_at)}</span><span
              >Kadaluwarsa: {fmtTime(r.expires_at)}</span
            >
          </div>
        </div>
      {/each}
    {/if}
    {#if !loading && rows.length === 0}<p
        class="text-center text-[var(--text-muted)] py-8"
      >
        Belum ada transaksi
      </p>{/if}
  </div>

  {#if total > PAGE_SIZE}
    <Pagination
      page={curPage}
      {total}
      pageSize={PAGE_SIZE}
      onChange={(p) => {
        curPage = p;
      }}
    />
  {/if}
</div>
