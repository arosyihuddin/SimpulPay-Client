<script lang="ts">
  // Admin billing — kelola paket langganan (CRUD) + langganan subscriber (real API /admin/plans & /admin/subscriptions).
  import { onMount } from 'svelte';
  import { admin } from '$lib/api';
  import { addToast } from '$lib/toast.svelte';

  interface Plan {
    id: string; name: string; type: 'free' | 'paid'; price: number; max_merchants: number;
    daily_paid_limit: number | null; features_json: string | null; active: boolean; created_at: number; updated_at: number;
  }
  interface Subscription {
    id: string; user_id: string; plan_id: string; status: 'active' | 'cancelled' | 'expired';
    starts_at: number; ends_at: number | null; created_at: number; updated_at: number;
    plan_name?: string; username?: string;
  }

  let plans = $state<Plan[]>([]);
  let subs = $state<Subscription[]>([]);
  let err = $state('');
  let loading = $state(true);

  let planModal = $state(false);
  let editingPlan = $state<Plan | null>(null);
  let planForm = $state({ name: '', type: 'paid', price: '0', max_merchants: '1', daily_paid_limit: '', features: [] as string[] });

  let cancelSub = $state<Subscription | null>(null);

  const parseFeatures = (j: string | null): string[] => {
    if (!j) return [];
    try {
      const v = JSON.parse(j);
      // array: ["3 API key", "10.000 transaksi"]
      if (Array.isArray(v)) return v.map(String);
      // object: {priority_support: true} → ["Priority Support"]
      if (typeof v === 'object' && v !== null)
        return Object.keys(v).map((k) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    } catch {}
    return [];
  };
  const fmtFeatures = (j: string | null) => parseFeatures(j).join(' · ');
  const fmtPrice = (p: number) => p <= 0 ? 'Gratis' : 'Rp ' + p.toLocaleString('id-ID') + ' / bln';
  const fmtDate = (n: number | null) =>
    n ? new Date(n).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  async function load() {
    loading = true; err = '';
    try {
      const [p, s] = await Promise.all([admin.listPlans(), admin.listSubscriptions()]);
      plans = p.data.plans;
      subs = s.data.subscriptions;
    } catch (e: any) { err = e.message; }
    finally { loading = false; }
  }
  onMount(load);

  function openPlanAdd() {
    editingPlan = null;
    planForm = { name: '', type: 'paid', price: '0', max_merchants: '1', daily_paid_limit: '', features: [] as string[] };
    planModal = true;
  }
  function openPlanEdit(p: Plan) {
    editingPlan = p;
    planForm = {
      name: p.name, type: p.type, price: String(p.price), max_merchants: String(p.max_merchants),
      daily_paid_limit: p.daily_paid_limit == null ? '' : String(p.daily_paid_limit),
      features: parseFeatures(p.features_json),
    };
    planModal = true;
  }
  async function savePlan() {
    err = '';
    const body: Record<string, unknown> = {
      name: planForm.name,
      type: planForm.type,
      price: parseInt(planForm.price || '0', 10),
      max_merchants: parseInt(planForm.max_merchants || '1', 10),
      daily_paid_limit: planForm.daily_paid_limit === '' ? null : parseInt(planForm.daily_paid_limit, 10),
      features_json: planForm.features.map((f) => f.trim()).filter(Boolean),
      active: true,
    };
    try {
      if (editingPlan) await admin.updatePlan(editingPlan.id, body);
      else await admin.createPlan(body);
      planModal = false;
      load();
      addToast('success', editingPlan ? 'Paket diperbarui.' : 'Paket ditambahkan.');
    } catch (e: any) { err = e.message; }
  }
  async function delPlan(p: Plan) {
    if (!confirm(`Hapus paket "${p.name}"?`)) return;
    err = '';
    try { await admin.deletePlan(p.id); load(); addToast('success', 'Paket dihapus.'); }
    catch (e: any) { err = e.message; }
  }

  async function doCancel() {
    if (!cancelSub) return;
    err = '';
    try { await admin.cancelSubscription(cancelSub.id); cancelSub = null; load(); addToast('success', 'Langganan dibatalkan.'); }
    catch (e: any) { err = e.message; }
  }

  const active = $derived(subs.filter((s) => s.status === 'active').length);
  const cancelled = $derived(subs.filter((s) => s.status === 'cancelled').length);
  const expired = $derived(subs.filter((s) => s.status === 'expired').length);

  const statusCls = (st: string) =>
    st === 'active' ? 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30'
    : st === 'cancelled' ? 'bg-red-100/70 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-500/30'
    : 'bg-amber-100/70 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/30';
</script>

<div class="space-y-6">
  {#if err}<p class="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-2xl px-4 py-3"><i class="fa-solid fa-circle-exclamation mr-2"></i>{err}</p>{/if}

  <!-- Ringkasan -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="tactile-box p-4">
      <p class="text-[11px] text-[var(--text-muted)] font-medium">Total Langganan</p>
      <p class="text-xl font-extrabold">{subs.length}</p>
    </div>
    <div class="tactile-box p-4">
      <p class="text-[11px] text-[var(--text-muted)] font-medium">Aktif</p>
      <p class="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{active}</p>
    </div>
    <div class="tactile-box p-4">
      <p class="text-[11px] text-[var(--text-muted)] font-medium">Dibatalkan</p>
      <p class="text-xl font-extrabold text-red-600 dark:text-red-400">{cancelled}</p>
    </div>
    <div class="tactile-box p-4">
      <p class="text-[11px] text-[var(--text-muted)] font-medium">Kedaluwarsa</p>
      <p class="text-xl font-extrabold text-amber-600 dark:text-amber-400">{expired}</p>
    </div>
  </div>

  <!-- Paket Langganan (CRUD) -->
  <div class="tactile-box p-5 space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-tags text-[var(--accent)]"></i> Paket Langganan</h2>
      <button onclick={openPlanAdd} class="tactile-btn px-3 py-2 text-xs font-bold text-[var(--accent)] flex items-center gap-1.5">
        <i class="fa-solid fa-plus"></i> Tambah
      </button>
    </div>
    {#if loading}
      <p class="text-xs text-[var(--text-muted)]">Memuat...</p>
    {:else if plans.length === 0}
      <p class="text-xs text-[var(--text-muted)]">Belum ada paket. Tambah paket pertama.</p>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {#each plans as p (p.id)}
          <div class="tactile-inset p-4 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <p class="font-bold flex items-center gap-2">{p.name}
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide {p.type === 'free'
                  ? 'bg-slate-200/60 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-slate-600/40'
                  : 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30'}">{p.type}</span>
              </p>
              <div class="flex gap-1 shrink-0">
                <button type="button" aria-label="Edit {p.name}" onclick={() => openPlanEdit(p)} class="text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer px-1"><i class="fa-solid fa-pen"></i></button>
                <button type="button" aria-label="Hapus {p.name}" onclick={() => delPlan(p)} class="text-[var(--text-muted)] hover:text-red-500 cursor-pointer px-1"><i class="fa-solid fa-trash-can"></i></button>
              </div>
            </div>
            <p class="text-lg font-extrabold text-[var(--accent)]">{fmtPrice(p.price)}</p>
            {#if !p.active}<p class="text-[10px] font-semibold text-red-500">● Nonaktif</p>{/if}
            <div class="space-y-1 text-xs">
              <div class="flex justify-between border-b border-[var(--border-subtle)] pb-1">
                <span class="text-[var(--text-muted)]">Maks Merchant</span>
                <span class="font-bold">{p.max_merchants}</span>
              </div>
              <div class="flex justify-between border-b border-[var(--border-subtle)] pb-1">
                <span class="text-[var(--text-muted)]">Limit Transaksi/Hari</span>
                <span class="font-bold">{p.daily_paid_limit == null ? 'Unlimited' : p.daily_paid_limit}</span>
              </div>
            </div>
            {#if parseFeatures(p.features_json).length > 0}
              <div class="space-y-1 pt-1">
                {#each parseFeatures(p.features_json) as f (f)}
                  <p class="text-xs flex items-start gap-1.5">
                    <i class="fa-solid fa-circle-check text-emerald-500 dark:text-emerald-400 mt-0.5 text-[10px]"></i>
                    <span class="text-[var(--text-muted)]">{f}</span>
                  </p>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Daftar langganan subscriber -->
  <div class="hidden md:block tactile-box overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
          <th class="px-4 py-3 font-medium">Subscriber</th>
          <th class="px-4 py-3 font-medium">Plan</th>
          <th class="px-4 py-3 font-medium">Status</th>
          <th class="px-4 py-3 font-medium">Mulai</th>
          <th class="px-4 py-3 font-medium">Berakhir</th>
          <th class="px-4 py-3 font-medium text-right">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {#if subs.length === 0}
          <tr>
            <td colspan={6} class="px-4 py-8 text-center text-[var(--text-muted)]">Belum ada langganan</td>
          </tr>
        {:else}
          {#each subs as s (s.id)}
            <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
              <td class="px-4 py-3">
                <p class="font-bold">{s.username || '—'}</p>
                <p class="text-xs font-mono text-[var(--text-muted)]">{s.id}</p>
              </td>
              <td class="px-4 py-3 font-semibold">{s.plan_name || s.plan_id}</td>
              <td class="px-4 py-3"><span class="text-xs font-semibold px-2.5 py-1 rounded-full {statusCls(s.status)}">{s.status}</span></td>
              <td class="px-4 py-3 text-xs">{fmtDate(s.starts_at)}</td>
              <td class="px-4 py-3 text-xs">{fmtDate(s.ends_at)}</td>
              <td class="px-4 py-3 text-right">
                {#if s.status === 'active'}
                  <button class="tactile-btn px-3 py-1.5 text-xs font-bold text-red-500" onclick={() => (cancelSub = s)}>Batalkan</button>
                {:else}
                  <span class="text-xs text-[var(--text-muted)]">—</span>
                {/if}
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Mobile cards -->
  <div class="md:hidden space-y-3">
    {#if subs.length === 0}
      <p class="text-center text-[var(--text-muted)] py-8 text-sm">Belum ada langganan</p>
    {:else}
      {#each subs as s (s.id)}
      <div class="tactile-box p-4 space-y-2">
        <div class="flex items-center justify-between">
          <p class="font-bold">{s.username || '—'}</p>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full {statusCls(s.status)}">{s.status}</span>
        </div>
        <p class="text-xs font-mono text-[var(--text-muted)]">{s.id} · {s.plan_name || s.plan_id}</p>
        <div class="text-xs text-[var(--text-muted)] flex justify-between">
          <span>Mulai: {fmtDate(s.starts_at)}</span>
          <span>Berakhir: {fmtDate(s.ends_at)}</span>
        </div>
        {#if s.status === 'active'}
          <button class="tactile-btn w-full py-2 text-xs font-bold text-red-500" onclick={() => (cancelSub = s)}>Batalkan</button>
        {/if}
        </div>
      {/each}
      {/if}
  </div>
</div>

<!-- Edit/Tambah plan modal -->
{#if planModal}
  <div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={() => (planModal = false)}></button>
    <div class="tactile-modal w-full max-w-md p-6 relative z-50">
      <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
        <h3 class="text-lg font-bold">{editingPlan ? 'Edit Paket' : 'Tambah Paket'}</h3>
        <button type="button" aria-label="Tutup" onclick={() => (planModal = false)} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="space-y-4">
        <div>
          <label for="plan-name" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Nama Paket</label>
          <input id="plan-name" bind:value={planForm.name} placeholder="Pro" class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="plan-type" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Tipe</label>
            <select id="plan-type" bind:value={planForm.type} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none cursor-pointer">
              <option value="paid">Berbayar</option>
              <option value="free">Gratis</option>
            </select>
          </div>
          <div>
            <label for="plan-price" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Harga (Rp/bln)</label>
            <input id="plan-price" type="number" min="0" bind:value={planForm.price} placeholder="349000" class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="plan-max" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Maks Merchant</label>
            <input id="plan-max" type="number" min="1" bind:value={planForm.max_merchants} placeholder="1" class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
          </div>
          <div>
            <label for="plan-daily" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Limit Transaksi / Hari</label>
            <input id="plan-daily" type="number" min="0" bind:value={planForm.daily_paid_limit} placeholder="0 = unlimited" class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
          </div>
        </div>
        <div>
          <span class="block text-xs font-bold text-[var(--text-muted)] mb-1">Fitur</span>
          <div class="space-y-2">
            {#each planForm.features as f, i (i)}
              <div class="flex gap-2 items-center">
                <div class="input-well px-3 py-2 flex items-center flex-1">
                  <i class="fa-solid fa-circle-check text-[var(--accent)] mr-2 text-xs"></i>
                  <input
                    type="text"
                    value={f}
                    oninput={(e) => (planForm.features[i] = (e.target as HTMLInputElement).value)}
                    placeholder="contoh: 3 API key"
                    class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Hapus fitur"
                  onclick={() => planForm.features = planForm.features.filter((_, j) => j !== i)}
                  class="tactile-btn w-9 h-9 flex items-center justify-center text-red-500 shrink-0"
                >
                  <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
              </div>
            {/each}
          </div>
          <button
            type="button"
            onclick={() => planForm.features = [...planForm.features, '']}
            class="tactile-btn w-full mt-2 py-2.5 text-xs font-bold text-[var(--accent)] flex items-center justify-center gap-1.5"
          >
            <i class="fa-solid fa-plus"></i> Tambah Fitur
          </button>
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

<!-- Cancel subscription confirm -->
{#if cancelSub}
  <div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={() => (cancelSub = null)}></button>
    <div class="tactile-modal w-full max-w-sm p-6 relative z-50">
      <h3 class="text-lg font-bold mb-2">Batalkan Langganan</h3>
      <p class="text-sm text-[var(--text-muted)]">Batalkan langganan <span class="font-semibold text-[var(--text-main)]">{cancelSub.username || cancelSub.id}</span>? Aksi tidak bisa dibatalkan.</p>
      <div class="flex gap-2 pt-4">
        <button onclick={doCancel} class="tactile-btn flex-1 py-3 font-bold text-red-500 flex items-center justify-center gap-2"><i class="fa-solid fa-ban"></i> Batalkan</button>
        <button onclick={() => (cancelSub = null)} class="tactile-btn px-5 py-3 text-sm text-[var(--text-muted)]">Tutup</button>
      </div>
    </div>
  </div>
{/if}
