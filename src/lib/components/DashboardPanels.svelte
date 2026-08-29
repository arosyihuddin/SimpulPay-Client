<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { theme } from '$lib/theme.svelte';
  import { admin, fmtIDR, fmtTime } from '$lib/api';
  import Skeleton from '$lib/components/Skeleton.svelte';

  // ---- Chart volume (data sample ala mockup, tak ada backend time-series) ----
  let range = $state('7');
  let chart: any = null;
  let canvasRef = $state<HTMLCanvasElement | null>(null);

  const RANGES: Record<string, { labels: string[]; data: number[] }> = {
    '7': { labels: ['22 Mei', '23 Mei', '24 Mei', '25 Mei', '26 Mei', '27 Mei', '28 Mei'], data: [1.2, 2.4, 3.1, 2.8, 4.9, 3.8, 4.82] },
    '30': { labels: Array.from({ length: 10 }, (_, i) => `${i * 3 + 1} Mei`), data: [1.0, 1.8, 2.5, 2.1, 3.4, 4.1, 3.0, 3.9, 4.5, 4.8] },
    today: { labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'], data: [0.4, 0.2, 1.8, 3.2, 2.7, 2.1] },
  };

  function drawChart() {
    const el = canvasRef;
    if (!el || typeof (window as any).Chart === 'undefined') return;
    const d = RANGES[range] || RANGES['7'];
    const isDark = theme.dark;
    const tickColor = isDark ? '#a3a3a3' : '#064e3b';
    const gridColor = isDark ? 'rgba(38, 38, 38, 0.5)' : 'rgba(203, 222, 212, 0.4)';
    if (chart) chart.destroy();
    chart = new (window as any).Chart(el, {
      type: 'line',
      data: {
        labels: d.labels,
        datasets: [{
          label: 'Volume (Miliar Rp)',
          data: d.data,
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.1)',
          borderWidth: 3,
          pointBackgroundColor: '#059669',
          pointBorderColor: isDark ? '#141414' : '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.35,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11, weight: 'bold' } } },
          x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 11, weight: 'bold' } } },
        },
      },
    });
  }

  $effect(() => { drawChart(); }); // re-draw saat theme/range berubah
  onMount(() => { drawChart(); });
  onMount(() => { return () => { chart?.destroy(); }; });

  // ---- Transaksi terbaru (data asli backend) ----
  let txs = $state<any[] | null>(null);

  // ---- Data contoh panel lain ----
  const PAYOUT = { batch: '#9420', amount: 340_500_000, pct: 82 };
  const CHANNELS = ['BCA VA', 'Mandiri VA', 'QRIS Gateway', 'E-Wallets'];
  const TOP = [
    { icon: 'fa-solid fa-bag-shopping', cls: 'text-emerald-600 dark:text-emerald-300', name: 'PT Toko Digital', vol: 'Rp 1.2B / bln', tier: 'Tier 1', tierCls: 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30' },
    { icon: 'fa-solid fa-shirt', cls: 'text-emerald-600 dark:text-emerald-300', name: 'Fashion Nusantara', vol: 'Rp 850M / bln', tier: 'Tier 1', tierCls: 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30' },
    { icon: 'fa-solid fa-mobile-screen', cls: 'text-amber-600 dark:text-amber-300', name: 'Gadget Online', vol: 'Rp 620M / bln', tier: 'Tier 2', tierCls: 'bg-blue-100/70 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/30' },
    { icon: 'fa-solid fa-mug-hot', cls: 'text-emerald-600 dark:text-emerald-300', name: 'Kopi Nusantara', vol: 'Rp 340M / bln', tier: 'Tier 2', tierCls: 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30' },
  ];
  const INFRA = [
    { name: 'API Gateway Core', ok: true },
    { name: 'Payment Switcher', ok: true },
    { name: 'Webhook Dispatcher', ok: true },
    { name: 'Fraud Engine (AI)', ok: true },
    { name: 'Settlement DB', ok: false, label: 'Syncing' },
    { name: 'SSL / TLS Shield', ok: true, label: 'Secure' },
  ];

  onMount(() => {
    admin.transactions(1, 5).then((d) => (txs = d.data?.transactions || [])).catch(() => (txs = []));
  });
</script>

<div class="space-y-6">
  <!-- Chart + Routing Channels -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="tactile-box p-6 lg:col-span-2 flex flex-col justify-between">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold flex items-center gap-2"><i class="fa-solid fa-chart-line text-[var(--accent)]"></i> Volume Transaksi Gateway</h3>
        <select bind:value={range} class="tactile-inset text-xs font-bold py-2 px-3 cursor-pointer outline-none">
          <option value="7">7 Hari Terakhir</option>
          <option value="30">30 Hari Terakhir</option>
          <option value="today">Hari Ini</option>
        </select>
      </div>
      <div class="relative w-full h-64 sm:h-72">
        <canvas bind:this={canvasRef}></canvas>
      </div>
    </div>

    <div class="tactile-box p-6 flex flex-col justify-between">
      <h3 class="font-bold mb-3 flex items-center gap-2"><i class="fa-solid fa-earth-asia text-[var(--accent)]"></i> Routing Channels</h3>
      <div class="relative w-full h-48 rounded-2xl tactile-inset flex items-center justify-center overflow-hidden">
        <div class="absolute inset-0 flex items-center justify-center opacity-30">
          <div class="w-40 h-40 border-4 border-dashed border-emerald-700 rounded-full animate-spin"></div>
        </div>
        <div class="z-10 text-center p-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2 shadow-lg animate-pulse">
            <i class="fa-solid fa-server"></i>
          </div>
          <span class="text-xs font-bold px-3 py-1 rounded-full bg-white/90 dark:bg-black/80 text-emerald-800 dark:text-emerald-300 shadow">Active Multi-Acquirer Router</span>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2 mt-4 text-xs">
        {#each CHANNELS as c (c)}
          <div class="tactile-inset p-2.5 flex justify-between items-center">
            <span class="font-bold">{c}</span>
            <span class="font-extrabold text-emerald-600 dark:text-emerald-400">Online</span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- 4 Panel -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <!-- Transaksi Terbaru (real) -->
    <div class="tactile-box p-5 flex flex-col justify-between">
      <div>
        <h3 class="font-bold mb-4 flex items-center gap-2"><i class="fa-solid fa-activity text-[var(--accent)]"></i> Transaksi Terbaru</h3>
        <div class="space-y-3 text-xs">
          {#if txs === null}
            {#each Array.from({ length: 3 }) as _, i}
              <div class="space-y-1.5"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></div>
            {/each}
          {:else if txs.length === 0}
            <p class="text-center text-[var(--text-muted)] py-6">Belum ada transaksi</p>
          {:else}
            {#each txs.slice(0, 4) as t, i (i)}
              <div class="flex items-start justify-between pb-2 border-b border-[var(--border-subtle)] last:border-0">
                <div class="flex items-start space-x-2 min-w-0">
                  <i class="fa-solid fa-arrow-down-left text-emerald-500 mt-0.5"></i>
                  <div class="min-w-0">
                    <p class="font-bold truncate">{fmtIDR(t.amount)}</p>
                    <p class="text-[var(--text-muted)] font-medium truncate">{t.issuer}</p>
                  </div>
                </div>
                <span class="text-[10px] text-[var(--text-muted)] whitespace-nowrap font-bold">{fmtTime(t.time)}</span>
              </div>
            {/each}
          {/if}
        </div>
      </div>
      <a href="/transactions" class="tactile-btn w-full mt-4 py-2.5 text-[var(--accent)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
        <i class="fa-solid fa-eye"></i> Lihat Semua
      </a>
    </div>

    <!-- Payout Queue (sample) -->
    <div class="tactile-box p-5 flex flex-col justify-between">
      <div>
        <h3 class="font-bold mb-4 flex items-center gap-2"><i class="fa-solid fa-wallet text-[var(--accent)]"></i> Payout Queue</h3>
        <div class="tactile-inset p-3 space-y-1.5">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold">Batch {PAYOUT.batch}</span>
            <span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100/70 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/30">Processing</span>
          </div>
          <p class="text-sm font-extrabold">{fmtIDR(PAYOUT.amount)}</p>
          <div class="w-full h-2.5 rounded-full bg-[var(--shadow-dark)]/30 dark:bg-[#262626] overflow-hidden">
            <div class="bg-emerald-600 h-2.5 rounded-full" style="width: {PAYOUT.pct}%"></div>
          </div>
          <span class="text-[10px] text-[var(--text-muted)] block text-right font-bold">{PAYOUT.pct}% Completed</span>
        </div>
        <div class="space-y-2 mt-3 text-xs">
          {#each ['BCA Auto-Settlement', 'Mandiri Transfer API', 'BRI Direct Debit'] as b (b)}
            <div class="flex items-center justify-between p-2 rounded-lg tactile-inset">
              <span class="font-bold">{b}</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-extrabold">Active</span>
            </div>
          {/each}
        </div>
      </div>
      <button class="tactile-btn w-full mt-4 py-2.5 text-[var(--accent)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5" onclick={() => goto('/transactions')}>
        <i class="fa-solid fa-gear"></i> Kelola Payout
      </button>
    </div>

    <!-- Top Merchants (sample) -->
    <div class="tactile-box p-5 flex flex-col justify-between">
      <div>
        <h3 class="font-bold mb-4 flex items-center gap-2"><i class="fa-solid fa-store text-[var(--accent)]"></i> Top Merchants</h3>
        <div class="space-y-3 text-xs">
          {#each TOP as m (m.name)}
            <div class="flex items-center justify-between p-2 rounded-xl tactile-inset">
              <div class="flex items-center space-x-2 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <i class="{m.icon} {m.cls}"></i>
                </div>
                <div class="min-w-0">
                  <p class="font-bold truncate">{m.name}</p>
                  <p class="text-[10px] text-[var(--text-muted)] font-bold">{m.vol}</p>
                </div>
              </div>
              <span class="px-2 py-1 text-[10px] font-bold rounded-md shrink-0 {m.tierCls}">{m.tier}</span>
            </div>
          {/each}
        </div>
      </div>
      <a href="/admin/settings" class="tactile-btn w-full mt-4 py-2.5 text-[var(--accent)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
        <i class="fa-solid fa-users"></i> Semua Merchant
      </a>
    </div>

    <!-- Infrastructure (sample) -->
    <div class="tactile-box p-5 flex flex-col justify-between">
      <div>
        <h3 class="font-bold mb-4 flex items-center gap-2"><i class="fa-solid fa-shield-halved text-[var(--accent)]"></i> Infrastructure</h3>
        <div class="space-y-3 text-xs">
          {#each INFRA as s (s.name)}
            <div class="flex items-center justify-between p-2 rounded-xl tactile-inset">
              <span class="font-bold">{s.name}</span>
              <span class="px-2 py-0.5 font-bold rounded text-[10px] {s.ok
                ? 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30'
                : 'bg-amber-100/70 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/30'}">
                {s.label || 'Operational'}
              </span>
            </div>
          {/each}
        </div>
      </div>
      <button class="tactile-btn w-full mt-4 py-2.5 text-[var(--accent)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5" onclick={() => goto('/logs')}>
        <i class="fa-solid fa-server"></i> Detail Server
      </button>
    </div>
  </div>
</div>
