<script lang="ts">
  import { admin, fmtIDR, fmtTime } from "$lib/api";
  import { addToast } from "$lib/toast.svelte";
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
      ? "tactile-pill pill-green"
      : st === "expired"
        ? "tactile-pill pill-red"
        : "tactile-pill pill-amber";

  const PAGE_SIZE = 20;

  let rows = $state<TxRow[]>([]);
  const hasPending = $derived(rows.some((r) => r.status === "pending"));
  let total = $state(0);
  let pendingCount = $state(0);
  let paidCount = $state(0);
  let expiredCount = $state(0);
  let curPage = $state(1);
  let err = $state("");
  let loadedOnce = $state(false);
  let qrCode = $state("");
  let qrAmount = $state(0);
  let qrBase = $state(0);
  let qrUnique = $state(0);
  let qrBusyId = $state<string | null>(null);
  let copiedId = $state("");

  const copyTrx = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      copiedId = id;
      addToast('success', 'TRX ID disalin!');
      setTimeout(() => (copiedId = ""), 2000);
    }).catch(() => {});
  };

  // Filter & search (dikirim ke backend via query params)
  let fStatus = $state("");
  let fQ = $state("");
  let fCreatedFrom = $state("");
  let fCreatedTo = $state("");
  let fExpiresFrom = $state("");
  let fExpiresTo = $state("");

  const dayFrom = (d: string) => (d ? new Date(d + "T00:00:00").getTime() : undefined);
  const dayTo = (d: string) => (d ? new Date(d + "T23:59:59").getTime() : undefined);

  const hasFilter = $derived(!!(fStatus || fQ || fCreatedFrom || fCreatedTo || fExpiresFrom || fExpiresTo));
  // Pagination total: kalau filter aktif pakai jumlah baris hasil filter, selain itu global.
  const pagerTotal = $derived(hasFilter ? rows.length : total);

  // Klik card ringkasan → set filter status otomatis (klik lagi → reset)
  const setStatus = (st: string) => {
    fStatus = fStatus === st ? "" : st;
  };
  const cardCls = (st: string) =>
    `cursor-pointer transition ${fStatus === st ? "ring-2 ring-[var(--accent)]" : ""}`;
  const resetFilter = () => {
    fStatus = ""; fQ = ""; fCreatedFrom = ""; fCreatedTo = ""; fExpiresFrom = ""; fExpiresTo = "";
  };

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

  async function load() {
    const params = {
      limit: PAGE_SIZE,
      offset: (curPage - 1) * PAGE_SIZE,
      ...(fStatus ? { status: fStatus } : {}),
      ...(fQ ? { q: fQ } : {}),
      created_from: dayFrom(fCreatedFrom),
      created_to: dayTo(fCreatedTo),
      expires_from: dayFrom(fExpiresFrom),
      expires_to: dayTo(fExpiresTo),
    };
    try {
      const d = await admin.transactions(params);
      rows = d.data?.transactions || [];
      total = d.data?.total || 0;
      pendingCount = d.data?.pending_count ?? 0;
      paidCount = d.data?.paid_count ?? 0;
      expiredCount = d.data?.expired_count ?? 0;
    } catch (e: any) {
      err = e.message;
    } finally {
      loadedOnce = true;
    }
  }
  // Reload tiap filter berubah (debounce 300ms).
  $effect(() => {
    void fStatus; void fQ; void fCreatedFrom; void fCreatedTo; void fExpiresFrom; void fExpiresTo; void curPage;
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
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

  <!-- Ringkasan count -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <button class="tactile-box p-4 text-left w-full" onclick={() => setStatus("")}>
      <p class="text-[11px] text-[var(--text-muted)] font-medium">Total Transaksi</p>
      {#if !loadedOnce}
        <Skeleton className="h-6 w-16 mt-2" />
      {:else}
        <p class="text-xl font-extrabold">{total}</p>
      {/if}
    </button>
    <button class="tactile-box p-4 text-left w-full {cardCls('pending')}" onclick={() => setStatus('pending')}>
      <p class="text-[11px] text-[var(--text-muted)] font-medium">Pending</p>
      {#if !loadedOnce}
        <Skeleton className="h-6 w-16 mt-2" />
      {:else}
        <p class="text-xl font-extrabold text-amber-600 dark:text-amber-400">{pendingCount}</p>
      {/if}
    </button>
    <button class="tactile-box p-4 text-left w-full {cardCls('paid')}" onclick={() => setStatus('paid')}>
      <p class="text-[11px] text-[var(--text-muted)] font-medium">Dibayar</p>
      {#if !loadedOnce}
        <Skeleton className="h-6 w-16 mt-2" />
      {:else}
        <p class="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{paidCount}</p>
      {/if}
    </button>
    <button class="tactile-box p-4 text-left w-full {cardCls('expired')}" onclick={() => setStatus('expired')}>
      <p class="text-[11px] text-[var(--text-muted)] font-medium">Kedaluwarsa</p>
      {#if !loadedOnce}
        <Skeleton className="h-6 w-16 mt-2" />
      {:else}
        <p class="text-xl font-extrabold text-red-600 dark:text-red-400">{expiredCount}</p>
      {/if}
    </button>
  </div>

  <!-- Filter & search -->
  <div class="tactile-box p-3 space-y-2">
    <div class="flex flex-wrap gap-2 items-center">
      <div class="input-well px-3 py-1.5 flex items-center gap-2 flex-1 min-w-[160px]">
        <i class="fa-solid fa-magnifying-glass text-[var(--text-muted)] text-xs"></i>
        <input type="text" bind:value={fQ} placeholder="Cari trx-id/merchant..." class="bg-transparent w-full text-xs focus:outline-none placeholder:text-[var(--text-muted)]" />
      </div>
      <select bind:value={fStatus} class="tactile-inset px-3 py-1.5 text-xs focus:outline-none cursor-pointer">
        <option value="">Semua</option>
        <option value="pending">Pending</option>
        <option value="paid">Dibayar</option>
        <option value="expired">Kedaluwarsa</option>
      </select>
      {#if hasFilter}
        <button onclick={resetFilter} class="tactile-btn px-3 py-1.5 text-xs font-bold text-[var(--text-muted)]"><i class="fa-solid fa-xmark mr-1"></i>Reset</button>
      {/if}
    </div>
    <div class="flex flex-wrap gap-2 items-center text-xs">
      <span class="text-[var(--text-muted)] font-medium">Dibuat</span>
      <input type="date" bind:value={fCreatedFrom} class="tactile-inset px-2 py-1 text-xs focus:outline-none" title="Dibuat dari" />
      <input type="date" bind:value={fCreatedTo} class="tactile-inset px-2 py-1 text-xs focus:outline-none" title="Dibuat sampai" />
      <span class="text-[var(--text-muted)] font-medium ml-2">Kadaluwarsa</span>
      <input type="date" bind:value={fExpiresFrom} class="tactile-inset px-2 py-1 text-xs focus:outline-none" title="Kadaluwarsa dari" />
      <input type="date" bind:value={fExpiresTo} class="tactile-inset px-2 py-1 text-xs focus:outline-none" title="Kadaluwarsa sampai" />
    </div>
  </div>

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
        {#if !loadedOnce}
          {#each Array.from({ length: 5 }) as _, i}
            <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
              {#each Array.from({ length: 6 }) as _, j}
                <td class="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
              {/each}
            </tr>
          {/each}
        {:else if rows.length === 0}
          <tr
            ><td
              colspan={hasPending ? 7 : 6}
              class="px-4 py-8 text-center text-[var(--text-muted)]"
              >{hasFilter ? "Tidak ada hasil filter" : "Belum ada transaksi"}</td
            ></tr
          >
        {:else}
          {#each rows as r (r.id)}
            <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
              <td class="px-4 py-3">
                <button onclick={() => copyTrx(r.trx_id)} title="Salin trx-id" class="font-mono text-xs flex items-center gap-1.5 hover:text-[var(--accent)] transition group">
                  <span>{r.trx_id}</span>
                  <i class="fa-solid {copiedId === r.trx_id ? 'fa-check text-emerald-500 pop' : 'fa-copy opacity-0 group-hover:opacity-100'} text-[10px]"></i>
                </button>
              </td>
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
                      ><i class="fa-solid fa-qrcode"></i>{qrBusyId === r.id
                        ? " Memuat..."
                        : " QR"}</button
                    >
                  {:else}
                    <span class="text-xs text-[var(--text-muted)]">—</span>
                  {/if}
                </td>
              {/if}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Mobile cards -->
  <div class="md:hidden space-y-3">
    {#if !loadedOnce}
      {#each Array.from({ length: 3 }) as _, i}
        <div class="tactile-box p-4 space-y-2">
          <Skeleton className="h-4 w-24" /><Skeleton
            className="h-5 w-32"
          /><Skeleton className="h-3 w-40" />
        </div>
      {/each}
    {:else if rows.length === 0}
      <p class="text-center text-[var(--text-muted)] py-8 text-sm">
        {hasFilter ? "Tidak ada hasil filter" : "Belum ada transaksi"}
      </p>
    {:else}
      {#each rows as r (r.id)}
        <div class="tactile-box p-4 space-y-2">
          <div class="flex items-center justify-between">
            <button onclick={() => copyTrx(r.trx_id)} title="Salin trx-id" class="font-mono text-[var(--accent)] text-xs flex items-center gap-1.5 hover:opacity-80 transition">
              <span>{r.trx_id}</span>
              <i class="fa-solid {copiedId === r.trx_id ? 'fa-check text-emerald-500 pop' : 'fa-copy'} text-[10px]"></i>
            </button>
            <span
              class="text-xs font-semibold px-2.5 py-1 rounded-full {statusBadge(
                r.status,
              )}">{r.status.toUpperCase()}</span
            >
          </div>
          <div class="flex items-center justify-between flex-wrap gap-x-2">
            <span class="text-base font-bold">{fmtIDR(r.amount)}</span>
            {#if r.unique_code > 0}<span
                class="text-[10px] text-[var(--text-muted)]"
                >= {fmtIDR(r.base_amount || r.amount - r.unique_code)} + {r.unique_code}</span
              >{/if}
          </div>
          <p class="text-xs font-semibold text-[var(--text-main)]">
            {r.merchant_name || r.merchant_id}
          </p>
          <div class="text-xs text-[var(--text-muted)] space-y-0.5">
            <span class="flex justify-between"
              ><span>Dibuat</span><span>{fmtTime(r.created_at)}</span></span
            >
            <span class="flex justify-between"
              ><span>Kadaluwarsa</span><span>{fmtTime(r.expires_at)}</span
              ></span
            >
          </div>
          {#if r.status === "pending"}
            <button
              onclick={() => openQr(r)}
              disabled={qrBusyId === r.id}
              class="tactile-btn w-full py-2 text-xs font-bold text-[var(--accent)]"
              ><i class="fa-solid fa-qrcode"></i>{qrBusyId === r.id
                ? " Memuat..."
                : " QR"}</button
            >
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  {#if pagerTotal > PAGE_SIZE}
    <Pagination
      page={curPage}
      total={pagerTotal}
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
