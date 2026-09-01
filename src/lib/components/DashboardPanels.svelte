<script lang="ts">
  import { onMount } from 'svelte';
  import { theme } from '$lib/theme.svelte';
  import { admin, fmtIDR, fmtTime } from '$lib/api';
  import { merchants } from '$lib/merchant.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';

  // ---- Chart volume (real backend: /transactions/volume) ----
  let range = $state('7');
  let chart: any = null;
  let canvasRef = $state<HTMLCanvasElement | null>(null);
  let volume = $state<{ labels: string[]; data: number[]; total: number } | null>(null);

  function drawChart() {
    const el = canvasRef;
    if (!el || typeof (window as any).Chart === 'undefined' || !volume) return;
    // Snapshot biar Chart.js pegang plain object — dia mutasi data (tambah _meta),
    // kalau dapat proxy $state langsung, Svelte lempar state_descriptors_fixed.
    const v = $state.snapshot(volume);
    const isDark = theme.dark;
    const tickColor = isDark ? '#a3a3a3' : '#064e3b';
    const gridColor = isDark ? 'rgba(38, 38, 38, 0.5)' : 'rgba(203, 222, 212, 0.4)';
    const maxVal = Math.max(...v.data, 1);
    if (chart) chart.destroy();
    chart = new (window as any).Chart(el, {
      type: 'line',
      data: {
        labels: v.labels,
        datasets: [{
          label: 'Volume (Rp)',
          data: v.data,
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
          y: { beginAtZero: true, max: maxVal, grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11, weight: 'bold' } } },
          x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 11, weight: 'bold' } } },
        },
      },
    });
  }

  $effect(() => { drawChart(); }); // re-draw saat volume/theme berubah
  onMount(() => { return () => { chart?.destroy(); }; });

  // ---- Transaksi terbaru (real backend: /transactions/recent) ----
  let txs = $state<any[] | null>(null);

  // ---- Ringkasan merchant (real backend: /merchants/summary, diisi store) ----

  // ---- Top Merchants (real endpoint /top-merchants) ----
  let topMerchants = $state<any[] | null>(null);

  // ---- Konfigurasi Gateway (real endpoint /settings) ----
  let gtwSettings = $state<Record<string, string> | null>(null);

  const statusCls = (st: string) =>
    st === 'active'
      ? 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30'
      : 'bg-slate-200/60 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-slate-600/40';

  $effect(() => {
    admin.recentTransactions(5).then((d) => (txs = d.data?.transactions || [])).catch(() => (txs = []));
    admin.transactionVolume(range).then((d) => (volume = d.data)).catch(() => (volume = null));
    admin.topMerchants(5).then((d) => (topMerchants = d.data?.merchants || [])).catch(() => (topMerchants = []));
    admin.settings().then((d) => (gtwSettings = d.data?.settings || null)).catch(() => (gtwSettings = null));
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
        {#if volume === null}
          <div class="absolute inset-0 flex flex-col justify-center gap-3 px-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        {/if}
        <canvas bind:this={canvasRef}></canvas>
      </div>
    </div>

    <div class="tactile-box p-6 flex flex-col justify-between">
      <h3 class="font-bold mb-3 flex items-center gap-2"><i class="fa-solid fa-store text-[var(--accent)]"></i> Merchant</h3>
      <div class="relative w-full h-48 rounded-2xl tactile-inset flex items-center justify-center overflow-hidden">
        <div class="absolute inset-0 flex items-center justify-center opacity-30">
          <div class="w-40 h-40 border-4 border-dashed border-emerald-700 rounded-full animate-spin"></div>
        </div>
        <div class="z-10 text-center p-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2 shadow-lg animate-pulse">
            <i class="fa-solid fa-qrcode"></i>
          </div>
          <span class="text-xs font-bold px-3 py-1 rounded-full bg-white/90 dark:bg-black/80 text-emerald-800 dark:text-emerald-300 shadow">{merchants.summary.length} Merchant</span>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2 mt-4 text-xs">
        {#each merchants.summary.slice(0, 4) as m (m.id)}
          <div class="tactile-inset p-2.5 flex justify-between items-center">
            <span class="font-bold truncate">{m.name}</span>
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full {statusCls(m.status)}">{m.status}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- 3 Panel -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <p class="text-[var(--text-muted)] font-medium truncate">{t.merchant_name || t.merchant_id || '—'}</p>
                  </div>
                </div>
                <span class="text-[10px] text-[var(--text-muted)] whitespace-nowrap font-bold">{fmtTime(t.created_at)}</span>
              </div>
            {/each}
          {/if}
        </div>
      </div>
      <a href="/transactions" class="tactile-btn w-full mt-4 py-2.5 text-[var(--accent)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
        <i class="fa-solid fa-eye"></i> Lihat Semua
      </a>
    </div>

    <!-- Top Merchants (real endpoint /top-merchants) -->
    <div class="tactile-box p-5 flex flex-col justify-between">
      <div>
        <h3 class="font-bold mb-4 flex items-center gap-2"><i class="fa-solid fa-store text-[var(--accent)]"></i> Top Merchants</h3>
        {#if topMerchants === null}
          <div class="space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        {:else if topMerchants.length === 0}
          <p class="text-center text-[var(--text-muted)] py-6 text-xs">Belum ada data merchant bulan ini</p>
        {:else}
          <div class="space-y-3 text-xs">
            {#each topMerchants as m (m.merchant_id || m.rank)}
              <div class="flex items-center justify-between p-2 rounded-xl tactile-inset">
                <div class="flex items-center space-x-2 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 font-bold text-[var(--accent)]">
                    #{m.rank}
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold truncate">{m.merchant_name || m.merchant_id || '—'}</p>
                    <p class="text-[10px] text-[var(--text-muted)] font-bold">{fmtIDR(m.total)}</p>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      <a href="/merchants" class="tactile-btn w-full mt-4 py-2.5 text-[var(--accent)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
        <i class="fa-solid fa-users"></i> Semua Merchant
      </a>
    </div>

    <!-- Konfigurasi Gateway (real endpoint /settings) -->
    <div class="tactile-box p-5 flex flex-col justify-between">
      <div>
        <h3 class="font-bold mb-4 flex items-center gap-2"><i class="fa-solid fa-sliders text-[var(--accent)]"></i> Konfigurasi Gateway</h3>
        {#if gtwSettings === null}
          <div class="space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        {:else}
          <div class="space-y-2 text-xs">
            <div class="flex items-center justify-between p-2 rounded-xl tactile-inset">
              <span class="font-bold">Mata Uang</span>
              <span class="font-mono">{gtwSettings.default_currency || '—'}</span>
            </div>
            <div class="flex items-center justify-between p-2 rounded-xl tactile-inset">
              <span class="font-bold">QRIS Expiry</span>
              <span class="font-mono">{gtwSettings.qris_expiry_minutes || '—'} mnt</span>
            </div>
            <div class="flex items-center justify-between p-2 rounded-xl tactile-inset">
              <span class="font-bold">Min Amount</span>
              <span class="font-mono">{fmtIDR(Number(gtwSettings.min_amount))}</span>
            </div>
            <div class="flex items-center justify-between p-2 rounded-xl tactile-inset">
              <span class="font-bold">Max Amount</span>
              <span class="font-mono">{fmtIDR(Number(gtwSettings.max_amount))}</span>
            </div>
            <div class="flex items-center justify-between p-2 rounded-xl tactile-inset">
              <span class="font-bold">Fee</span>
              <span class="font-mono">{gtwSettings.fee_percent || '0'}%</span>
            </div>
          </div>
        {/if}
      </div>
      <a href="/settings" class="tactile-btn w-full mt-4 py-2.5 text-[var(--accent)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
        <i class="fa-solid fa-gear"></i> Kelola Konfigurasi
      </a>
    </div>
  </div>
</div>
