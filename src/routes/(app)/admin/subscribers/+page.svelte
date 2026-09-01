<script lang="ts">
  // Admin Subscribers — kelola langganan semua subscriber (real API /admin/subscribers).
  import { onMount } from "svelte";
  import { admin } from "$lib/api";
  import { addToast } from "$lib/toast.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";

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

  let cancelSub = $state<Subscription | null>(null);
  let cancelBusy = $state(false);

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
      const s = await admin.listSubscriptions();
      subs = s.data.subscriptions;
    } catch (e: any) {
      err = e.message;
    } finally {
      loading = false;
    }
  }
  onMount(load);

  async function doCancel() {
    const target = cancelSub;
    if (!target) return;
    cancelBusy = true;
    err = "";
    try {
      await admin.cancelSubscription(target.id);
      cancelSub = null;
      load();
      addToast("success", "Langganan dibatalkan.");
    } catch (e: any) {
      err = e.message;
    } finally {
      cancelBusy = false;
    }
  }

  const active = $derived(subs.filter((s) => s.status === "active").length);
  const hasAction = $derived(subs.some((s) => s.status === "active"));
  const cancelled = $derived(
    subs.filter((s) => s.status === "cancelled").length,
  );
  const expired = $derived(subs.filter((s) => s.status === "expired").length);

  const statusCls = (st: string) =>
    st === "active"
      ? "bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30"
      : st === "cancelled"
        ? "bg-red-100/70 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-500/30"
        : "bg-amber-100/70 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/30";
</script>

<div class="space-y-6">
  {#if err}<p
      class="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-2xl px-4 py-3"
    >
      <i class="fa-solid fa-circle-exclamation mr-2"></i>{err}
    </p>{/if}

  <!-- Ringkasan -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {#if loading}
      {#each Array.from({ length: 4 }) as _, i}
        <div class="tactile-box p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      {/each}
    {:else}
      <div class="tactile-box p-4">
        <p class="text-[11px] text-[var(--text-muted)] font-medium">
          Total Langganan
        </p>
        <p class="text-xl font-extrabold">{subs.length}</p>
      </div>
      <div class="tactile-box p-4">
        <p class="text-[11px] text-[var(--text-muted)] font-medium">Aktif</p>
        <p
          class="text-xl font-extrabold text-emerald-600 dark:text-emerald-400"
        >
          {active}
        </p>
      </div>
      <div class="tactile-box p-4">
        <p class="text-[11px] text-[var(--text-muted)] font-medium">
          Dibatalkan
        </p>
        <p class="text-xl font-extrabold text-red-600 dark:text-red-400">
          {cancelled}
        </p>
      </div>
      <div class="tactile-box p-4">
        <p class="text-[11px] text-[var(--text-muted)] font-medium">
          Kedaluwarsa
        </p>
        <p class="text-xl font-extrabold text-amber-600 dark:text-amber-400">
          {expired}
        </p>
      </div>
    {/if}
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
              >Belum ada langganan</td
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
                  )}">{s.status}</span
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
        Belum ada langganan
      </p>
    {:else}
      {#each subs as s (s.id)}
        <div class="tactile-box p-4 space-y-2">
          <div class="flex items-center justify-between">
            <p class="font-bold">{s.user_name || s.user_email || s.user_id || "—"}</p>
            <span
              class="text-xs font-semibold px-2.5 py-1 rounded-full {statusCls(
                s.status,
              )}">{s.status}</span
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
