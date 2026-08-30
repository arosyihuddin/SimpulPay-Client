<script lang="ts">
  import { onMount } from 'svelte';
  import { admin } from '$lib/api';
  import { merchants, loadMerchants, setActiveMerchant } from '$lib/merchant.svelte';
  import { addToast } from '$lib/toast.svelte';

  const TYPE_META: Record<string, { label: string; icon: string; cls: string }> = {
    gopay: { label: 'GoPay', icon: 'fa-solid fa-mobile-screen', cls: 'text-emerald-600 dark:text-emerald-400' },
    shopeepay: { label: 'ShopeePay', icon: 'fa-solid fa-bag-shopping', cls: 'text-orange-500' },
  };
  const typeMeta = (t: string) => TYPE_META[t] || TYPE_META.gopay;

  const statusCls = (st: string) =>
    st === 'active'
      ? 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30'
      : 'bg-slate-200/60 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-slate-600/40';

  let err = $state('');
  const fmtDate = (n: number) => new Date(n).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  onMount(() => { loadMerchants(); });

  async function toggleStatus(m: any) {
    err = '';
    try {
      await admin.updateMerchant(m.id, { status: m.status === 'active' ? 'inactive' : 'active' });
      await loadMerchants();
      addToast('success', `Merchant "${m.name}" ${m.status === 'active' ? 'dinonaktifkan' : 'diaktifkan'}.`);
    } catch (e: any) { err = e.message; }
  }
  async function remove(m: any) {
    if (!confirm(`Hapus merchant "${m.name}"? Sesi GoBiz ikut terhapus.`)) return;
    err = '';
    try { await admin.deleteMerchant(m.id); await loadMerchants(); addToast('success', `Merchant "${m.name}" dihapus.`); }
    catch (e: any) { err = e.message; }
  }

  // ---- Tambah Merchant ----
  const PROVIDERS = [
    { key: 'gopay', name: 'GoPay', icon: 'fa-solid fa-mobile-screen', cls: 'text-emerald-600 dark:text-emerald-400', desc: 'Instant QR & Wallet API' },
    { key: 'shopeepay', name: 'ShopeePay', icon: 'fa-solid fa-bag-shopping', cls: 'text-orange-500', desc: 'Segera hadir' },
  ];
  let modalOpen = $state(false);
  let provider = $state('');
  let name = $state('');
  let saving = $state(false);
  let modalErr = $state('');

  function openAdd() { modalOpen = true; provider = ''; name = ''; modalErr = ''; }
  async function submit() {
    if (!provider) { modalErr = 'Pilih provider dulu.'; return; }
    if (provider === 'shopeepay') { modalErr = 'ShopeePay merchant masih placeholder — tunggu update berikutnya.'; return; }
    const nm = name.trim();
    if (nm.length < 2) { modalErr = 'Nama merchant minimal 2 karakter.'; return; }
    saving = true; modalErr = '';
    try {
      await admin.createMerchant(nm, provider);
      await loadMerchants();
      modalOpen = false;
      addToast('success', 'Merchant ditambahkan.');
    } catch (e: any) { modalErr = e.message; }
    finally { saving = false; }
  }
</script>

<div class="space-y-6">
  {#if err}<p class="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-2xl px-4 py-3"><i class="fa-solid fa-circle-exclamation mr-2"></i>{err}</p>{/if}

  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4">
    <button onclick={openAdd} class="tactile-btn px-5 py-2.5 font-bold text-[var(--accent)] flex items-center gap-2">
      <i class="fa-solid fa-plus"></i> Tambah Merchant
    </button>
  </div>

  {#if merchants.loading && merchants.list.length === 0}
    <p class="text-xs text-[var(--text-muted)]">Memuat merchant...</p>
  {:else if merchants.list.length === 0}
    <div class="tactile-box p-10 text-center text-sm text-[var(--text-muted)]">
      Belum ada merchant. Klik <span class="font-bold text-[var(--accent)]">Tambah Merchant</span> untuk mulai.
    </div>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each merchants.list as m (m.id)}
        <div class="tactile-box p-5 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider {statusCls(m.status)}">{m.status}</span>
              {#if m.id === merchants.active?.id}
                <span class="text-[10px] font-bold text-[var(--accent)]"><i class="fa-solid fa-circle-check mr-1"></i>Aktif</span>
              {:else}
                <span class="text-xs text-[var(--text-muted)] font-bold font-mono">{m.id}</span>
              {/if}
            </div>
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-12 h-12 rounded-2xl bg-emerald-100/70 dark:bg-emerald-900/40 flex items-center justify-center tactile-inset">
                <i class="{typeMeta(m.type).icon} {typeMeta(m.type).cls} text-lg"></i>
              </div>
              <div>
                <h4 class="font-bold">{m.name}</h4>
                <p class="text-xs text-[var(--text-muted)] font-bold">{typeMeta(m.type).label}</p>
              </div>
            </div>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span class="text-[var(--text-muted)] font-bold">Merchant ID</span>
                <span class="font-mono font-bold">{m.gopay_merchant_id || '—'}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span class="text-[var(--text-muted)] font-bold">QRIS Static</span>
                <span class="font-bold {m.qris_static_set ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-muted)]'}">{m.qris_static_set ? 'Terpasang' : 'Belum'}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-[var(--text-muted)] font-bold">Dibuat</span>
                <span class="font-bold">{fmtDate(m.created_at)}</span>
              </div>
            </div>
          </div>
          <div class="space-y-2 mt-4">
            {#if m.id !== merchants.active?.id && m.status === 'active'}
              <button onclick={() => setActiveMerchant(m.id)} class="tactile-btn w-full py-2.5 text-[var(--accent)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-circle-check"></i> Jadikan Aktif
              </button>
            {/if}
            <div class="flex gap-2">
              <button onclick={() => toggleStatus(m)} class="tactile-btn flex-1 py-2.5 text-[var(--text-muted)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
                <i class="fa-solid {m.status === 'active' ? 'fa-pause' : 'fa-play'}"></i> {m.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
              <button onclick={() => remove(m)} aria-label="Hapus {m.name}" class="tactile-btn px-3.5 py-2.5 text-red-500 font-bold text-xs rounded-xl flex items-center justify-center">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Tambah Merchant modal -->
{#if modalOpen}
  <div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={() => (modalOpen = false)}></button>
    <div class="tactile-modal w-full max-w-lg p-6 relative z-50">
      <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
        <h3 class="text-lg font-bold">Tambah Merchant Baru</h3>
        <button type="button" aria-label="Tutup" onclick={() => (modalOpen = false)} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
      </div>

      {#if modalErr}<p class="text-xs font-semibold text-red-500 mb-3">{modalErr}</p>{/if}

      {#if !provider}
        <div class="space-y-4">
          <p class="text-xs font-bold text-[var(--text-muted)]">Pilih channel e-wallet atau akun gateway merchant yang ingin dihubungkan:</p>
          <div class="grid grid-cols-2 gap-4 pt-2">
            {#each PROVIDERS as p (p.key)}
              <button
                onclick={() => { provider = p.key; modalErr = ''; }}
                class="tactile-box p-4 text-center cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center {p.cls}"><i class="{p.icon} text-lg"></i></div>
                <span class="font-bold text-sm">{p.name} Merchant</span>
                <span class="text-[10px] text-[var(--text-muted)] font-bold">{p.desc}</span>
              </button>
            {/each}
          </div>
        </div>
      {:else}
        <div class="space-y-4">
          <button onclick={() => { provider = ''; modalErr = ''; }} class="text-xs font-bold text-[var(--accent)] flex items-center gap-1"><i class="fa-solid fa-arrow-left"></i> Ganti provider</button>
          <div>
            <label for="merchant-name" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Nama Merchant ({typeMeta(provider).label})</label>
            <input id="merchant-name" bind:value={name} placeholder="PT Toko Digital" class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
          </div>
          <button onclick={submit} disabled={saving} class="tactile-btn w-full py-3 font-bold text-[var(--accent)]">
            <i class="fa-solid fa-plus mr-1"></i> {saving ? 'Menyimpan...' : 'Tambah Merchant'}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
