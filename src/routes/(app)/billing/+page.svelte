<script lang="ts">
  // Mockup billing — langganan USER sistem GoMerch (pemakai API key), bukan merchant payment channel.

  const SUBS = [
    {
      id: 'SUB-1042', name: 'CV Nusantara Digital', plan: 'Pro', status: 'Active',
      statusCls: 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30',
      next: '2026-09-12', since: '2026-08-12', key: 'Aktif',
    },
    {
      id: 'SUB-1041', name: 'PT Aplikasi Prima', plan: 'Enterprise', status: 'Active',
      statusCls: 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30',
      next: '2026-09-05', since: '2026-08-05', key: 'Aktif',
    },
    {
      id: 'SUB-1039', name: 'Toko Online Berkah', plan: 'Basic', status: 'Trial',
      statusCls: 'bg-blue-100/70 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/30',
      next: '2026-09-02', since: '2026-08-19', key: 'Aktif',
    },
    {
      id: 'SUB-1036', name: 'Kafe Digital Nusantara', plan: 'Pro', status: 'Overdue',
      statusCls: 'bg-amber-100/70 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/30',
      next: '2026-08-28', since: '2026-07-28', key: 'Terbatas',
    },
    {
      id: 'SUB-1028', name: 'Gadget Indo Sejahtera', plan: 'Basic', status: 'Suspended',
      statusCls: 'bg-red-100/70 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-500/30',
      next: '2026-08-15', since: '2026-07-15', key: 'Nonaktif',
    },
  ];

  type Plan = { name: string; price: number | string; features: string };
  const PLANS: Plan[] = [
    { name: 'Basic', price: 99000, features: '1 API key, 1.000 transaksi/bln' },
    { name: 'Pro', price: 349000, features: '3 API key, 10.000 transaksi/bln' },
    { name: 'Enterprise', price: 'Custom', features: 'Unlimited, SLA, dedicated support' },
  ];

  // Harga disimpan angka murni; format tampilan ditangani di sini.
  const fmtPrice = (p: number | string) =>
    p === 'Custom' ? 'Custom' : 'Rp ' + Number(p).toLocaleString('id-ID') + ' / bln';

  // ---- Edit subscriber (mockup, update array lokal) ----
  const STATUSES = ['Active', 'Trial', 'Overdue', 'Suspended'];
  const KEY_STATUSES = ['Aktif', 'Terbatas', 'Nonaktif'];
  let subs = $state(SUBS);

  const fmtDate = (iso: string) =>
    iso ? new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  let plans = $state(PLANS);
  let modalOpen = $state(false);
  let editing = $state<any>(null);
  let form = $state({ name: '', plan: 'Basic', status: 'Active', next: '', key: 'Aktif' });


  // ---- Edit plan ----
  let planModal = $state(false);
  let editingPlan = $state<any>(null);
  let planForm = $state({ name: '', price: '' as number | string, features: '' });
  const PLANS_LIST = $derived(plans.map((p) => p.name));

  function openPlanEdit(p: any) {
    editingPlan = p;
    planForm = { name: p.name, price: p.price, features: p.features };
    planModal = true;
  }
  function savePlan() {
    const exists = plans.some((p) => p.name === editingPlan.name);
    if (exists) {
      plans = plans.map((p) => (p.name === editingPlan.name ? { ...p, name: planForm.name, price: planForm.price, features: planForm.features } : p));
    } else {
      plans = [...plans, { name: planForm.name, price: planForm.price, features: planForm.features }];
    }
    planModal = false;
  }

  const statusCls = (st: string) =>
    st === 'Active' ? 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30'
    : st === 'Trial' ? 'bg-blue-100/70 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/30'
    : st === 'Overdue' ? 'bg-amber-100/70 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/30'
    : 'bg-red-100/70 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-500/30';

  function openEdit(s: any) {
    editing = s;
    form = { name: s.name, plan: s.plan, status: s.status, next: s.next, key: s.key };
    modalOpen = true;
  }
  function save() {
    subs = subs.map((s) => (s.id === editing.id ? { ...s, name: form.name, plan: form.plan, status: form.status, next: form.next, key: form.key, statusCls: statusCls(form.status) } : s));
    modalOpen = false;
  }

  const active = $derived(subs.filter((s) => s.status === 'Active').length);
  const trial = $derived(subs.filter((s) => s.status === 'Trial').length);
  const overdue = $derived(subs.filter((s) => s.status === 'Overdue').length);
  const suspended = $derived(subs.filter((s) => s.status === 'Suspended').length);
</script>

<div class="space-y-6">
  <!-- Ringkasan -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="tactile-box p-4">
      <p class="text-[11px] text-[var(--text-muted)] font-medium">Total Subscriber</p>
      <p class="text-xl font-extrabold">{subs.length}</p>
    </div>
    <div class="tactile-box p-4">
      <p class="text-[11px] text-[var(--text-muted)] font-medium">Aktif</p>
      <p class="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{active}</p>
    </div>
    <div class="tactile-box p-4">
      <p class="text-[11px] text-[var(--text-muted)] font-medium">Trial</p>
      <p class="text-xl font-extrabold text-blue-600 dark:text-blue-400">{trial}</p>
    </div>
    <div class="tactile-box p-4">
      <p class="text-[11px] text-[var(--text-muted)] font-medium">Overdue / Suspended</p>
      <p class="text-xl font-extrabold text-amber-600 dark:text-amber-400">{overdue} / {suspended}</p>
    </div>
  </div>

  <!-- Plan -->
  <div class="tactile-box p-5 space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-tags text-[var(--accent)]"></i> Paket Langganan</h2>
      <button onclick={() => openPlanEdit({ name: 'Basic', price: 99000, features: '1 API key, 1.000 transaksi/bln' })} class="tactile-btn px-3 py-2 text-xs font-bold text-[var(--accent)] flex items-center gap-1.5">
        <i class="fa-solid fa-plus"></i> Tambah
      </button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      {#each plans as p (p.name)}
        <div class="tactile-inset p-4 space-y-1.5">
          <div class="flex items-center justify-between">
            <p class="font-bold">{p.name}</p>
            <button type="button" aria-label="Edit {p.name}" onclick={() => openPlanEdit(p)} class="text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer">
              <i class="fa-solid fa-pen"></i>
            </button>
          </div>
          <p class="text-lg font-extrabold text-[var(--accent)]">{fmtPrice(p.price)}</p>
          <p class="text-xs text-[var(--text-muted)]">{p.features}</p>
        </div>
      {/each}
    </div>
  </div>

  <!-- Daftar subscriber -->
  <div class="hidden md:block tactile-box overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
          <th class="px-4 py-3 font-medium">Subscriber</th>
          <th class="px-4 py-3 font-medium">Plan</th>
          <th class="px-4 py-3 font-medium">Status</th>
          <th class="px-4 py-3 font-medium">Tagihan Berikutnya</th>
          <th class="px-4 py-3 font-medium">API Key</th>
          <th class="px-4 py-3 font-medium text-right">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {#each subs as s (s.id)}
          <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
            <td class="px-4 py-3">
              <p class="font-bold">{s.name}</p>
              <p class="text-xs font-mono text-[var(--text-muted)]">{s.id}</p>
            </td>
            <td class="px-4 py-3 font-semibold">{s.plan}</td>
            <td class="px-4 py-3"><span class="text-xs font-semibold px-2.5 py-1 rounded-full {s.statusCls}">{s.status}</span></td>
            <td class="px-4 py-3 text-xs">{fmtDate(s.next)}</td>
            <td class="px-4 py-3 text-xs text-[var(--text-muted)]">{s.key}</td>
            <td class="px-4 py-3 text-right">
              <button class="tactile-btn px-3 py-1.5 text-xs font-bold text-[var(--accent)]" onclick={() => openEdit(s)}>Kelola</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Mobile cards -->
  <div class="md:hidden space-y-3">
    {#each subs as s (s.id)}
      <div class="tactile-box p-4 space-y-2">
        <div class="flex items-center justify-between">
          <p class="font-bold">{s.name}</p>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full {s.statusCls}">{s.status}</span>
        </div>
        <p class="text-xs font-mono text-[var(--text-muted)]">{s.id} · {s.plan}</p>
        <div class="text-xs text-[var(--text-muted)] flex justify-between">
          <span>Tagihan: {fmtDate(s.next)}</span>
          <span>Key: {s.key}</span>
        </div>
        <button class="tactile-btn w-full py-2 text-xs font-bold text-[var(--accent)]" onclick={() => openEdit(s)}>Kelola</button>
      </div>
    {/each}
  </div>
</div>

<!-- Edit subscriber modal -->
{#if modalOpen}
  <div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={() => (modalOpen = false)}></button>
    <div class="tactile-modal w-full max-w-lg p-6 relative z-50">
      <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
        <h3 class="text-lg font-bold">Kelola Langganan</h3>
        <button type="button" aria-label="Tutup" onclick={() => (modalOpen = false)} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="space-y-4">
        <div>
          <label for="sub-name" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Nama Subscriber</label>
          <input id="sub-name" bind:value={form.name} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="sub-plan" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Plan</label>
            <select id="sub-plan" bind:value={form.plan} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none cursor-pointer">
              {#each PLANS_LIST as p (p)}
                <option value={p}>{p}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="sub-status" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Status</label>
            <select id="sub-status" bind:value={form.status} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none cursor-pointer">
              {#each STATUSES as st (st)}
                <option value={st}>{st}</option>
              {/each}
            </select>
          </div>
        </div>
        <div>
          <label for="sub-next" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Tagihan Berikutnya</label>
          <input id="sub-next" type="date" bind:value={form.next} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <div>
          <label for="sub-key" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Status API Key</label>
          <select id="sub-key" bind:value={form.key} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none cursor-pointer">
            {#each KEY_STATUSES as k (k)}
              <option value={k}>{k}</option>
            {/each}
          </select>
        </div>

        <div class="flex gap-2 pt-2">
          <button onclick={save} class="tactile-btn flex-1 py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
            <i class="fa-solid fa-floppy-disk"></i> Simpan
          </button>
          <button onclick={() => (modalOpen = false)} class="tactile-btn px-5 py-3 text-sm text-[var(--text-muted)]">Batal</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Edit/Tambah plan modal -->
{#if planModal}
  <div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={() => (planModal = false)}></button>
    <div class="tactile-modal w-full max-w-md p-6 relative z-50">
      <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
        <h3 class="text-lg font-bold">Kelola Paket</h3>
        <button type="button" aria-label="Tutup" onclick={() => (planModal = false)} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="space-y-4">
        <div>
          <label for="plan-name" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Nama Paket</label>
          <input id="plan-name" bind:value={planForm.name} placeholder="Pro" class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <div>
          <label for="plan-price" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Harga (per bulan)</label>
          <input id="plan-price" type="number" bind:value={planForm.price} placeholder="349000" class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <div>
          <label for="plan-features" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Fitur</label>
          <input id="plan-features" bind:value={planForm.features} placeholder="3 API key, 10.000 transaksi/bln" class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>

        <div class="flex gap-2 pt-2">
          <button onclick={savePlan} class="tactile-btn flex-1 py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
            <i class="fa-solid fa-floppy-disk"></i> Simpan
          </button>
          <button onclick={() => (planModal = false)} class="tactile-btn px-5 py-3 text-sm text-[var(--text-muted)]">Batal</button>
        </div>
      </div>
    </div>
  </div>
{/if}
