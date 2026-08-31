<script lang="ts">
  import { onMount } from "svelte";
  import { admin, fmtIDR, fmtTime } from "$lib/api";
  import { useWs } from "$lib/useWs";
  import Skeleton from "$lib/components/Skeleton.svelte";
  import Stat from "$lib/components/Stat.svelte";
  import DashboardPanels from "$lib/components/DashboardPanels.svelte";
  import {
    merchants,
    loadMerchants,
  } from "$lib/merchant.svelte";

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
  }

  let data = $state<DashboardData | null>(null);
  let err = $state("");

  interface Announcement {
    id: number;
    title: string;
    message: string;
    type: string;
    active: boolean;
    created_at: number;
  }
  let announcements = $state<Announcement[]>([]);
  const ANNO_TYPE_CLS: Record<string, string> = {
    info: "bg-blue-100/70 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/30 text-blue-700 dark:text-blue-300",
    warning:
      "bg-amber-100/70 dark:bg-amber-500/10 border-amber-200/60 dark:border-amber-500/30 text-amber-700 dark:text-amber-300",
    important:
      "bg-red-100/70 dark:bg-red-500/10 border-red-200/60 dark:border-red-500/30 text-red-700 dark:text-red-300",
  };
  const ANNO_ICON: Record<string, string> = {
    info: "fa-solid fa-circle-info",
    warning: "fa-solid fa-triangle-exclamation",
    important: "fa-solid fa-shield-halved",
  };
  async function loadAnnouncements() {
    try {
      const r = await admin.listAnnouncements({ active: true });
      announcements = r.data.announcements;
    } catch {
      /* non-kritis */
    }
  }

  async function load() {
    admin
      .dashboard(merchants.active?.id)
      .then((d) => (data = d.data))
      .catch((e) => (err = e.message));
  }

  onMount(() => {
    loadMerchants();
    loadAnnouncements();
  });
  $effect(() => {
    load();
  });

  useWs((m) => {
    if (m.type === "qris_created" || m.type === "qris_status") load();
  });

  const s = $derived(data?.stats);
  const session = $derived(data?.gobiz_session);
</script>

<div class="space-y-6">
  
  <!-- Announcements aktif — broadcast admin ke user -->
  {#if announcements.length > 0}
    <div class="space-y-3">
      {#each announcements as a (a.id)}
        <div
          class="rounded-2xl border px-4 py-3 text-sm {ANNO_TYPE_CLS[a.type] ||
            ANNO_TYPE_CLS.info}"
        >
          <p class="font-bold flex items-center gap-2">
            <i class={ANNO_ICON[a.type] || ANNO_ICON.info}></i>{a.title}
          </p>
          {#if a.message}<p class="text-xs mt-1 opacity-90">{a.message}</p>{/if}
        </div>
      {/each}
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
      <Stat
        icon="fa-solid fa-money-bill-trend-up"
        label="Hari Ini"
        value={fmtIDR(s?.today_income)}
      />
      <Stat
        icon="fa-solid fa-chart-line"
        label="Bulan Ini"
        value={fmtIDR(s?.month_income)}
      />
      <Stat
        icon="fa-solid fa-receipt"
        label="Transaksi"
        value={String(s?.total_transactions ?? 0)}
      />
      <Stat
        icon="fa-solid fa-qrcode"
        label="QRIS Aktif"
        value={String(s?.active_qris ?? 0)}
      />
      <Stat
        icon="fa-solid fa-folder"
        label="Total QRIS"
        value={String(s?.total_qris ?? 0)}
      />
    </div>
  {/if}

  {#if session?.exists}
    <div class="tactile-box p-5 text-sm space-y-2.5">
      <div class="flex items-center gap-3">
        <div
          class="tactile-btn w-10 h-10 flex items-center justify-center text-emerald-500 text-sm font-bold"
        >
          {(session.outlet || "G").slice(0, 1)}
        </div>
        <span class="font-semibold">{session.outlet || "Outlet"}</span>
      </div>
      <div class="flex justify-between gap-3">
        <span class="text-[var(--text-muted)] shrink-0">HP</span>
        <span class="break-all text-right">{session.phone || "-"}</span>
      </div>
      <div class="flex justify-between gap-3">
        <span class="text-[var(--text-muted)] shrink-0">Merchant ID</span>
        <span class="break-all text-right">{session.merchant_id || "-"}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-[var(--text-muted)]">Token</span>
        <span class={session.expired ? "text-red-500" : "text-emerald-500"}>
          <i
            class="fa-solid {session.expired
              ? 'fa-circle-xmark'
              : 'fa-circle-check'} mr-1"
          ></i>
          {session.expired ? "Expired" : "Valid"} · {fmtTime(
            session.expires_at,
          )}
        </span>
      </div>
    </div>
  {/if}

  <DashboardPanels />
</div>
