<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { admin, fmtIDR, fmtTime } from "$lib/api";
  import { useWs } from "$lib/useWs";
  import Pagination from "$lib/components/Pagination.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";
  import QrCodeModal from "$lib/components/QrCodeModal.svelte";

  interface TxRow {
    id: string;
    trx_id: string;
    merchant_id: string;
    merchant_name?: string;
    amount: number;
    base_amount: number;
    unique_code: number;
    status: string;
    created_at: number;
    expires_at: number;
  }

  const statusBadge = (st: string) =>
    st === "paid" || st === "settlement" || st === "capture"
      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/30"
      : st === "expired"
        ? "text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30"
        : "text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30";

  const PAGE_SIZE = 20;

  let rows = $state<TxRow[]>([]);
  const hasPending = $derived(rows.some((r) => r.status === "pending"));
  let total = $state(0);
  let curPage = $state(1);
  let err = $state("");
  let loading = $state(true);
  let qrCode = $state("");
  let qrAmount = $state(0);
  let qrBase = $state(0);
  let qrUnique = $state(0);
  let qrBusyId = $state<string | null>(null);

  async function openQr(tx: TxRow) {
    qrBusyId = tx.id;
    try {
      const res = await admin.getTransactionCode(tx.id);
      qrCode = res.data.code;
      qrAmount = tx.amount;
      qrBase = tx.base_amount;
      qrUnique = tx.unique_code;
    } catch {
      qrCode = "";
    }
    qrBusyId = null;
  }

  const mid = $derived($page.url.searchParams.get("merchant_id"));
  $effect(() => { mid; curPage = 1; }); // reset halaman saat ganti filter merchant

  async function load() {
    loading = true;
    const p = (curPage - 1) * PAGE_SIZE;
    const req = mid
      ? admin.merchantTransactions(mid, PAGE_SIZE, p)
      : admin.transactions(PAGE_SIZE, p);
    req
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
  <button
    onclick={() => goto("/merchants")}
    class="tactile-btn px-4 py-2 text-xs font-bold text-[var(--text-muted)] flex items-center gap-2"
  >
    <i class="fa-solid fa-arrow-left"></i> Kembali
  </button>

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
          {#if hasPending}
            <th class="px-4 py-3 font-medium text-right">Aksi</th>
          {/if}
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
              <td class="px-4 py-3 font-semibold"
                >{r.merchant_name || r.merchant_id}</td
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
                  )}">{r.status.toUpperCase()}</span
                ></td
              >
              <td class="px-4 py-3 text-xs">{fmtTime(r.created_at)}</td>
              <td class="px-4 py-3 text-xs">{fmtTime(r.expires_at)}</td>
              {#if hasPending}
                <td class="px-4 py-3 text-right">
                  {#if r.status === "pending"}
                  <button
                    onclick={() => openQr(r)}
                    disabled={qrBusyId === r.id}
                    class="tactile-btn px-3 py-1.5 text-xs font-bold text-[var(--accent)]"
                  ><i class="fa-solid fa-qrcode"></i>{qrBusyId === r.id ? ' Memuat...' : ' QR'}</button>
                  {:else}
                  <span class="text-xs text-[var(--text-muted)]">—</span>
                  {/if}
                </td>
              {/if}
            </tr>
          {/each}
        {/if}
        {#if !loading && rows.length === 0}
          <tr
            ><td
              colspan={hasPending ? 7 : 6}
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
              )}">{r.status.toUpperCase()}</span
            >
          </div>
          <div class="flex items-center justify-between">
            <span class="text-base font-bold">{fmtIDR(r.amount)}</span>
            {#if r.unique_code > 0}<span
                class="text-[10px] text-[var(--text-muted)]"
                >= {fmtIDR(r.base_amount || r.amount - r.unique_code)} + {r.unique_code}</span
              >{/if}
          </div>
          <p class="text-xs font-semibold text-[var(--text-main)]">
            {r.merchant_name || r.merchant_id}
          </p>
          <div class="text-xs text-[var(--text-muted)] flex justify-between">
            <span>Dibuat: {fmtTime(r.created_at)}</span><span
              >Kadaluwarsa: {fmtTime(r.expires_at)}</span
            >
          </div>
          {#if r.status === "pending"}
          <button
            onclick={() => openQr(r)}
            disabled={qrBusyId === r.id}
            class="tactile-btn w-full py-2 text-xs font-bold text-[var(--accent)]"
          ><i class="fa-solid fa-qrcode"></i>{qrBusyId === r.id ? ' Memuat...' : ' QR'}</button>
          {/if}
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

{#if qrCode}
  <QrCodeModal code={qrCode} {qrAmount} baseAmount={qrBase} uniqueCode={qrUnique} onClose={() => (qrCode = "")} />
{/if}
