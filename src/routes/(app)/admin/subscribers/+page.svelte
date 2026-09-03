<script lang="ts">
  // Admin Subscribers — kelola langganan semua subscriber (real API /admin/subscribers).
  import { admin } from "$lib/api";
  import { addToast } from "$lib/toast.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";
  import Pagination from "$lib/components/Pagination.svelte";

  interface Subscription {
    id: string;
    user_id: string;
    plan_id: string;
    status: "active" | "cancelled" | "expired";
    starts_at: number;
    ends_at: number | null;
    plan_name?: string;
    user_name?: string | null;
    user_email?: string | null;
  }

  let subs = $state<Subscription[]>([]);
  let err = $state("");
  let loading = $state(true);
  let loadedOnce = $state(false);
  let totalCount = $state(0);
  let activeCount = $state(0);
  let cancelledCount = $state(0);
  let expiredCount = $state(0);

  let cancelSub = $state<Subscription | null>(null);
  let cancelBusy = $state(false);

  // Filter & search (dikirim ke backend via query params)
  let fStatus = $state("active");
  let fStartFrom = $state("");
  let fStartTo = $state("");
  let fEndFrom = $state("");
  let fEndTo = $state("");
  let q = $state("");

  const PAGE_SIZE = 20;
  let page = $state(1);

  // Total buat pagination — pakai count yang match status filter aktif.
  const pageTotal = $derived(
    fStatus === "active" ? activeCount
      : fStatus === "cancelled" ? cancelledCount
        : fStatus === "expired" ? expiredCount
          : totalCount,
  );

  const dayFrom = (d: string) => (d ? new Date(d + "T00:00:00").getTime() : undefined);
  const dayTo = (d: string) => (d ? new Date(d + "T23:59:59").getTime() : undefined);

  const hasFilter = $derived(!!(fStatus || q || fStartFrom || fStartTo || fEndFrom || fEndTo));

  const fmtDate = (n: number | null) =>
    n
      ? new Date(n).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "-";

  async function load() {
    loading = true;
    err = "";
    try {
      const params = {
        ...(fStatus ? { status: fStatus } : {}),
        ...(q ? { q } : {}),
        start_from: dayFrom(fStartFrom),
        start_to: dayTo(fStartTo),
        end_from: dayFrom(fEndFrom),
        end_to: dayTo(fEndTo),
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      };
      const s = await admin.listSubscriptions(params);
      subs = s.data.subscriptions || [];
      totalCount = s.data.total ?? subs.length;
      activeCount = s.data.active_count ?? 0;
      cancelledCount = s.data.cancelled_count ?? 0;
      expiredCount = s.data.expired_count ?? 0;
    } catch (e: any) {
      err = e.message;
    } finally {
      loading = false;
      loadedOnce = true;
    }
  }
  // Reset ke halaman 1 saat filter/search berubah.
  $effect(() => {
    void fStatus; void q; void fStartFrom; void fStartTo; void fEndFrom; void fEndTo;
    page = 1;
  });
  // Reload tiap filter/halaman berubah (debounce 300ms biar gak spam backend pas ngetik).
  $effect(() => {
    void fStatus; void q; void fStartFrom; void fStartTo; void fEndFrom; void fEndTo; void page;
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  });

  async function doCancel() {
    const target = cancelSub;
    if (!target) return;
    cancelBusy = true;
    err = "";
    try {
      await admin.cancelSubscription(target.id);
      // Card count: pindah dari aktif ke dibatalkan (backend count di-update saat reload berikutnya).
      activeCount = Math.max(0, activeCount - 1);
      cancelledCount += 1;
      // Filter default "active" → sub yang dicancel langsung keluar tabel;
      // kalau filter lain/empty, status di-update dan tetap tampil.
      subs = subs
        .map((s) => (s.id === target.id ? { ...s, status: "cancelled" as const } : s))
        .filter((s) => fStatus !== "active" || s.status !== "cancelled");
      cancelSub = null;
      addToast("success", "Langganan dibatalkan.");
    } catch (e: any) {
      err = e.message;
    } finally {
      cancelBusy = false;
    }
  }

  // Ringkasan card — dari count backend (global, gak terpengaruh filter).
  const active = $derived(activeCount);
  const hasAction = $derived(subs.some((s) => s.status === "active"));
  const cancelled = $derived(cancelledCount);
  const expired = $derived(expiredCount);

  const statusCls = (st: string) =>
    st === "active"
      ? "tactile-pill pill-green"
      : st === "cancelled"
        ? "tactile-pill pill-red"
        : "tactile-pill pill-amber";

  // Klik card ringkasan → set filter status otomatis (klik lagi → reset)
  const setStatus = (st: string) => {
    fStatus = fStatus === st ? "" : st;
  };
  const cardCls = (st: string) =>
    `cursor-pointer transition ${fStatus === st ? "ring-2 ring-[var(--accent)]" : ""}`;
</script>

<div class="space-y-6">
  {#if err}<p
      class="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-2xl px-4 py-3"
    >
      <i class="fa-solid fa-circle-exclamation mr-2"></i>{err}
    </p>{/if}

  <!-- Ringkasan -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {#if !loadedOnce}
      {#each Array.from({ length: 4 }) as _, i}
        <div class="tactile-box p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      {/each}
    {:else}
      <button class="tactile-box p-4 text-left w-full" onclick={() => setStatus("")}>
        <p class="text-[11px] text-[var(--text-muted)] font-medium">
          Total Langganan
        </p>
        <p class="text-xl font-extrabold">{totalCount}</p>
      </button>
      <button class="tactile-box p-4 text-left w-full {cardCls('active')}" onclick={() => setStatus('active')}>
        <p class="text-[11px] text-[var(--text-muted)] font-medium">Aktif</p>
        <p
          class="text-xl font-extrabold text-emerald-600 dark:text-emerald-400"
        >
          {active}
        </p>
      </button>
      <button class="tactile-box p-4 text-left w-full {cardCls('cancelled')}" onclick={() => setStatus('cancelled')}>
        <p class="text-[11px] text-[var(--text-muted)] font-medium">
          Dibatalkan
        </p>
        <p class="text-xl font-extrabold text-red-600 dark:text-red-400">
          {cancelled}
        </p>
      </button>
      <button class="tactile-box p-4 text-left w-full {cardCls('expired')}" onclick={() => setStatus('expired')}>
        <p class="text-[11px] text-[var(--text-muted)] font-medium">
          Kedaluwarsa
        </p>
        <p class="text-xl font-extrabold text-amber-600 dark:text-amber-400">
          {expired}
        </p>
      </button>
    {/if}
  </div>

  <!-- Filter & search -->
  <div class="tactile-box p-3 space-y-2">
    <div class="flex flex-wrap gap-2 items-center">
      <div class="input-well px-3 py-1.5 flex items-center gap-2 flex-1 min-w-[160px]">
        <i class="fa-solid fa-magnifying-glass text-[var(--text-muted)] text-xs"></i>
        <input type="text" bind:value={q} placeholder="Cari subscriber/plan..." class="bg-transparent w-full text-xs focus:outline-none placeholder:text-[var(--text-muted)]" />
      </div>
      <select bind:value={fStatus} class="tactile-inset px-3 py-1.5 text-xs focus:outline-none cursor-pointer">
        <option value="">Semua</option>
        <option value="active">Aktif</option>
        <option value="cancelled">Dibatalkan</option>
        <option value="expired">Kedaluwarsa</option>
      </select>
      {#if hasFilter}
        <button onclick={() => { fStatus = "active"; q = ""; fStartFrom = ""; fStartTo = ""; fEndFrom = ""; fEndTo = ""; }} class="tactile-btn px-3 py-1.5 text-xs font-bold text-[var(--text-muted)]"><i class="fa-solid fa-xmark mr-1"></i>Reset</button>
      {/if}
    </div>
    <div class="flex flex-wrap gap-2 items-center text-xs">
      <span class="text-[var(--text-muted)] font-medium">Mulai</span>
      <input type="date" bind:value={fStartFrom} class="tactile-inset px-2 py-1 text-xs focus:outline-none" title="Mulai dari" />
      <input type="date" bind:value={fStartTo} class="tactile-inset px-2 py-1 text-xs focus:outline-none" title="Mulai sampai" />
      <span class="text-[var(--text-muted)] font-medium ml-2">Berakhir</span>
      <input type="date" bind:value={fEndFrom} class="tactile-inset px-2 py-1 text-xs focus:outline-none" title="Berakhir dari" />
      <input type="date" bind:value={fEndTo} class="tactile-inset px-2 py-1 text-xs focus:outline-none" title="Berakhir sampai" />
    </div>
  </div>

  <!-- Daftar langganan subscriber -->
  <div class="hidden md:block tactile-box overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr
          class="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]"
        >
          <th class="px-4 py-3 font-medium">Subscriber</th>
          <th class="px-4 py-3 font-medium">Plan</th>
          <th class="px-4 py-3 font-medium">Status</th>
          <th class="px-4 py-3 font-medium">Mulai</th>
          <th class="px-4 py-3 font-medium">Berakhir</th>
          {#if hasAction}
            <th class="px-4 py-3 font-medium text-right">Aksi</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#if loading}
          {#each Array.from({ length: 3 }) as _, i}
            <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
              {#each Array.from({ length: 6 }) as _, j}
                <td class="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
              {/each}
            </tr>
          {/each}
        {:else if subs.length === 0}
          <tr>
            <td
              colspan={hasAction ? 6 : 5}
              class="px-4 py-8 text-center text-[var(--text-muted)]"
              >{hasFilter ? "Tidak ada hasil filter" : "Belum ada langganan"}</td
            >
          </tr>
        {:else}
          {#each subs as s (s.id)}
            <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
              <td class="px-4 py-3">
                <p class="font-bold">{s.user_name || s.user_email || s.user_id || "—"}</p>
                <p class="text-xs text-[var(--text-muted)]">{s.user_email || s.user_id}</p>
              </td>
              <td class="px-4 py-3 font-semibold">{s.plan_name || s.plan_id}</td
              >
              <td class="px-4 py-3"
                ><span
                  class="text-xs font-semibold px-2.5 py-1 rounded-full {statusCls(
                    s.status,
                  )}">{s.status.toUpperCase()}</span
                ></td
              >
              <td class="px-4 py-3 text-xs">{fmtDate(s.starts_at)}</td>
              <td class="px-4 py-3 text-xs">{fmtDate(s.ends_at)}</td>
              {#if hasAction}
                <td class="px-4 py-3 text-right">
                  {#if s.status === "active"}
                    <button
                      class="tactile-btn px-3 py-1.5 text-xs font-bold text-red-500"
                      onclick={() => (cancelSub = s)}>Batalkan</button
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
    {#if pageTotal > PAGE_SIZE}
      <div class="px-4 py-3">
        <Pagination page={page} total={pageTotal} pageSize={PAGE_SIZE} onChange={(p) => { page = p; }} />
      </div>
    {/if}
  </div>

  <!-- Mobile cards -->
  <div class="md:hidden space-y-3">
    {#if loading}
      {#each Array.from({ length: 3 }) as _, i}
        <div class="tactile-box p-4 space-y-2">
          <Skeleton className="h-4 w-32" /><Skeleton
            className="h-3 w-full"
          /><Skeleton className="h-3 w-24" />
        </div>
      {/each}
    {:else if subs.length === 0}
      <p class="text-center text-[var(--text-muted)] py-8 text-sm">
        {hasFilter ? "Tidak ada hasil filter" : "Belum ada langganan"}
      </p>
    {:else}
      {#each subs as s (s.id)}
        <div class="tactile-box p-4 space-y-2">
          <div class="flex items-center justify-between">
            <p class="font-bold">{s.user_name || s.user_email || s.user_id || "—"}</p>
            <span
              class="text-xs font-semibold px-2.5 py-1 rounded-full {statusCls(
                s.status,
              )}">{s.status.toUpperCase()}</span
            >
          </div>
          <p class="text-xs text-[var(--text-muted)]">
            {s.user_email || s.user_id} · {s.plan_name || s.plan_id}
          </p>
          <div class="text-xs text-[var(--text-muted)] flex justify-between">
            <span>Mulai: {fmtDate(s.starts_at)}</span>
            <span>Berakhir: {fmtDate(s.ends_at)}</span>
          </div>
          {#if s.status === "active"}
            <button
              class="tactile-btn w-full py-2 text-xs font-bold text-red-500"
              onclick={() => (cancelSub = s)}>Batalkan</button
            >
          {/if}
        </div>
      {/each}
      {#if pageTotal > PAGE_SIZE}
        <Pagination page={page} total={pageTotal} pageSize={PAGE_SIZE} onChange={(p) => { page = p; }} />
      {/if}
    {/if}
  </div>
</div>

<!-- Cancel subscription confirm -->
{#if cancelSub}
  <div
    class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4"
  >
    <button
      type="button"
      aria-label="Tutup"
      class="fixed inset-0 z-40 cursor-default"
      onclick={() => (cancelSub = null)}
    ></button>
    <div class="tactile-modal w-full max-w-sm p-6 relative z-50">
      <h3 class="text-lg font-bold mb-2">Batalkan Langganan</h3>
      <p class="text-sm text-[var(--text-muted)]">
        Batalkan langganan <span class="font-semibold text-[var(--text-main)]"
          >{cancelSub.user_id || cancelSub.id}</span
        >? Aksi tidak bisa dibatalkan.
      </p>
      <div class="flex gap-2 pt-4">
        <button
          disabled={cancelBusy}
          onclick={doCancel}
          class="tactile-btn flex-1 py-3 font-bold text-red-500 flex items-center justify-center gap-2"
          ><i class="fa-solid fa-ban"></i>
          {cancelBusy ? "Membatalkan..." : "Batalkan"}</button
        >
        <button
          onclick={() => (cancelSub = null)}
          class="tactile-btn px-5 py-3 text-sm text-[var(--text-muted)]"
          >Tutup</button
        >
      </div>
    </div>
  </div>
{/if}
