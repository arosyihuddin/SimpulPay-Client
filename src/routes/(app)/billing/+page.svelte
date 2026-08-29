<script lang="ts">
  // Mockup billing — portal USER. Plan yang dibeli + riwayat pembelian sendiri.
  // Management (kelola paket, semua subscriber/invoice) ada di /admin/billing.

  const MY_PLAN = {
    name: 'Pro', price: 349000, features: '3 API key, 10.000 transaksi/bln',
    status: 'Aktif', statusCls: 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30',
    since: '2026-08-12', next: '2026-09-12',
  };

  const fmtPrice = (p: number) => 'Rp ' + p.toLocaleString('id-ID') + ' / bln';
  const fmtDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  const MY_INVOICES = [
    { id: 'INV-2026-0901', plan: 'Pro', amount: 'Rp 349.000', date: '2026-09-01', method: 'Auto-debit BCA', status: 'Lunas', statusCls: 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30' },
    { id: 'INV-2026-0801', plan: 'Pro', amount: 'Rp 349.000', date: '2026-08-01', method: 'Auto-debit BCA', status: 'Lunas', statusCls: 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30' },
    { id: 'INV-2026-0701', plan: 'Pro', amount: 'Rp 349.000', date: '2026-07-01', method: 'Transfer BCA', status: 'Lunas', statusCls: 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30' },
  ];
</script>

<div class="space-y-6">
  <!-- Plan Saya -->
  <div class="tactile-box p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <p class="text-[11px] text-[var(--text-muted)] font-medium mb-1">Plan Aktif</p>
      <div class="flex items-center gap-3">
        <h2 class="text-2xl font-extrabold">{MY_PLAN.name}</h2>
        <span class="text-xs font-semibold px-2.5 py-1 rounded-full {MY_PLAN.statusCls}">{MY_PLAN.status}</span>
      </div>
      <p class="text-sm text-[var(--text-muted)] mt-1">{fmtPrice(MY_PLAN.price)} · {MY_PLAN.features}</p>
    </div>
    <div class="text-sm space-y-1.5 sm:text-right">
      <p class="flex sm:justify-end gap-3"><span class="text-[var(--text-muted)]">Mulai</span><span class="font-semibold">{fmtDate(MY_PLAN.since)}</span></p>
      <p class="flex sm:justify-end gap-3"><span class="text-[var(--text-muted)]">Tagihan Berikutnya</span><span class="font-semibold text-[var(--accent)]">{fmtDate(MY_PLAN.next)}</span></p>
      <button class="tactile-btn px-4 py-2 text-xs font-bold text-[var(--accent)] mt-1">Perpanjang Langganan</button>
    </div>
  </div>

  <!-- Riwayat Pembelian -->
  <div class="hidden md:block tactile-box overflow-x-auto">
    <div class="px-4 pt-4 pb-2">
      <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-receipt text-[var(--accent)]"></i> Riwayat Pembelian</h2>
    </div>
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
          <th class="px-4 py-3 font-medium">Invoice</th>
          <th class="px-4 py-3 font-medium">Plan</th>
          <th class="px-4 py-3 font-medium">Jumlah</th>
          <th class="px-4 py-3 font-medium">Tanggal</th>
          <th class="px-4 py-3 font-medium">Metode</th>
          <th class="px-4 py-3 font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        {#each MY_INVOICES as i (i.id)}
          <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
            <td class="px-4 py-3 font-mono text-xs font-bold">{i.id}</td>
            <td class="px-4 py-3 text-xs text-[var(--text-muted)]">{i.plan}</td>
            <td class="px-4 py-3 font-semibold">{i.amount}</td>
            <td class="px-4 py-3 text-xs text-[var(--text-muted)]">{fmtDate(i.date)}</td>
            <td class="px-4 py-3 text-xs text-[var(--text-muted)]">{i.method}</td>
            <td class="px-4 py-3"><span class="text-xs font-semibold px-2.5 py-1 rounded-full {i.statusCls}">{i.status}</span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Card mobile -->
  <div class="md:hidden space-y-3">
    <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-receipt text-[var(--accent)]"></i> Riwayat Pembelian</h2>
    {#each MY_INVOICES as i (i.id)}
      <div class="tactile-box p-4 space-y-2">
        <div class="flex items-center justify-between">
          <p class="font-bold">{i.amount}</p>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full {i.statusCls}">{i.status}</span>
        </div>
        <p class="text-xs font-mono text-[var(--text-muted)]">{i.id} · {i.plan}</p>
        <div class="text-xs text-[var(--text-muted)] flex justify-between">
          <span>{fmtDate(i.date)}</span>
          <span>{i.method}</span>
        </div>
      </div>
    {/each}
  </div>
</div>
