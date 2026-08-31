<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { admin } from '$lib/api';
  import { merchants, loadMerchants, setActiveMerchant } from '$lib/merchant.svelte';
  import { addToast } from '$lib/toast.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';
  import GoBizConfigModal from '$lib/components/GoBizConfigModal.svelte';
  import QrisModal from '$lib/components/QrisModal.svelte';

  const TYPE_META: Record<string, { label: string; img: string }> = {
    gopay: { label: 'GoPay', img: '/gopay.webp' },
    shopeepay: { label: 'ShopeePay', img: '/shopeepay.webp' },
  };
  const typeMeta = (t: string) => TYPE_META[t] || TYPE_META.gopay;

  const statusCls = (st: string) =>
    st === 'active'
      ? 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30'
      : 'bg-slate-200/60 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-slate-600/40';

  let err = $state('');
  const fmtDate = (n: number) => new Date(n).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  let delTarget = $state<any | null>(null);
  let deleting = $state(false);

  let configTarget = $state<any | null>(null);
  let qrisTarget = $state<any | null>(null);
  let editTarget = $state<any | null>(null);
  let editName = $state('');
  let editSaving = $state(false);
  let editErr = $state('');
  let menuFor = $state<string | null>(null);

  // Konfigurasi lengkap = punya merchant ID GoBiz + QRIS static terpasang.
  const isConfigured = (m: any) => !!m.merchant_id && m.qris_static_set;

  onMount(() => { loadMerchants(); });

  async function toggleStatus(m: any) {
    err = '';
    try {
      await admin.updateMerchant(m.id, { status: m.status === 'active' ? 'inactive' : 'active' });
      await loadMerchants();
      addToast('success', `Merchant "${m.name}" ${m.status === 'active' ? 'dinonaktifkan' : 'diaktifkan'}.`);
    } catch (e: any) { err = e.message; }
  }
  async function remove() {
    const target = delTarget;
    if (!target) return;
    deleting = true;
    err = '';
    try { await admin.deleteMerchant(target.id); delTarget = null; await loadMerchants(); addToast('success', `Merchant "${target.name}" dihapus.`); }
    catch (e: any) { err = e.message; delTarget = null; }
    finally { deleting = false; }
  }
  async function refreshSession(m: any) {
    err = '';
    try {
      await admin.refreshSession(m.id);
      await loadMerchants();
      addToast('success', `Sesi GoBiz "${m.name}" di-refresh.`);
    } catch (e: any) { err = e.message; }
  }

  // ---- Tambah Merchant ----
  const PROVIDERS = [
    { key: 'gopay', name: 'GoPay', img: '/gopay.webp', icon: 'fa-solid fa-mobile-screen', cls: '', desc: 'Instant QR & Wallet API' },
    { key: 'shopeepay', name: 'ShopeePay', img: '/shopeepay.webp', icon: 'fa-solid fa-bag-shopping', cls: '', desc: 'Segera hadir' },
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

  async function saveEdit() {
    const t = editTarget;
    if (!t) return;
    const nm = editName.trim();
    if (nm.length < 2) { editErr = 'Nama merchant minimal 2 karakter.'; return; }
    editSaving = true; editErr = '';
    try {
      await admin.updateMerchant(t.id, { name: nm });
      editTarget = null; await loadMerchants(); addToast('success', 'Nama merchant diubah.');
    } catch (e: any) { editErr = e.message; }
    finally { editSaving = false; }
  }
</script>

<div class="space-y-6">
  {#if err}<p class="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-2xl px-4 py-3"><i class="fa-solid fa-circle-exclamation mr-2"></i>{err}</p>{/if}

  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4">
    <div class="flex gap-2">
      <button onclick={loadMerchants} title="Refresh daftar merchant" aria-label="Refresh" class="tactile-btn px-4 py-2.5 font-bold text-[var(--text-muted)] flex items-center gap-2">
        <i class="fa-solid fa-rotate"></i>
      </button>
      <button onclick={openAdd} class="tactile-btn px-5 py-2.5 font-bold text-[var(--accent)] flex items-center gap-2">
        <i class="fa-solid fa-plus"></i> Tambah Merchant
      </button>
    </div>
  </div>

  {#if merchants.loading && merchants.list.length === 0}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each Array.from({ length: 3 }) as _, i}
        <div class="tactile-box p-5 space-y-4">
          <div class="flex items-center justify-between">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div class="flex items-center space-x-3">
            <Skeleton className="w-12 h-12 rounded-2xl" />
            <div class="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div class="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
      {/each}
    </div>
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
              <div class="relative">
                <button onclick={() => (menuFor = menuFor === m.id ? null : m.id)} aria-label="Menu merchant" class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]">
                  <i class="fa-solid fa-ellipsis-vertical"></i>
                </button>
                {#if menuFor === m.id}
                  <button type="button" aria-label="Tutup menu" class="fixed inset-0 z-40 cursor-default" onclick={() => (menuFor = null)}></button>
                  <div class="absolute right-0 mt-2 w-48 rounded-xl tactile-box p-2 z-50 text-xs space-y-1">
                    <button onclick={() => { toggleStatus(m); menuFor = null; }} class="w-full text-left flex items-center gap-2 p-2.5 rounded-lg hover:bg-[var(--inset-dark)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0.5 font-semibold {m.status === 'active' ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}">
                      <i class="fa-solid fa-power-off w-4"></i> {m.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    {#if !!m.merchant_id}
                      <button onclick={() => { refreshSession(m); menuFor = null; }} class="w-full text-left flex items-center gap-2 p-2.5 rounded-lg hover:bg-[var(--inset-dark)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0.5 font-semibold text-[var(--text-main)]">
                        <i class="fa-solid fa-rotate w-4"></i> Refresh
                      </button>
                    {/if}
                    <button onclick={() => { configTarget = m; menuFor = null; }} class="w-full text-left flex items-center gap-2 p-2.5 rounded-lg hover:bg-[var(--inset-dark)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0.5 font-semibold text-[var(--text-main)]">
                      <i class="fa-solid fa-gear w-4"></i> Reconfigure
                    </button>
                    <button onclick={() => { editTarget = m; editName = m.name; editErr = ''; menuFor = null; }} class="w-full text-left flex items-center gap-2 p-2.5 rounded-lg hover:bg-[var(--inset-dark)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0.5 font-semibold text-[var(--text-main)]">
                      <i class="fa-solid fa-pen w-4"></i> Edit
                    </button>
                  </div>
                {/if}
              </div>
            </div>
            <div class="flex items-center space-x-3 mb-4">
              <div class="w-12 h-12 rounded-2xl bg-emerald-100/70 dark:bg-emerald-900/40 flex items-center justify-center tactile-inset">
                <img src={typeMeta(m.type).img} alt={typeMeta(m.type).label} class="w-7 h-7 object-contain" />
              </div>
              <div>
                <h4 class="font-bold">{m.name}</h4>
                <p class="text-xs text-[var(--text-muted)] font-bold">{typeMeta(m.type).label}</p>
              </div>
            </div>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span class="text-[var(--text-muted)] font-bold">Merchant ID</span>
                <span class="font-mono font-bold">{m.merchant_id || '—'}</span>
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
          <div class="flex gap-2 mt-4">
            {#if isConfigured(m)}
              <button onclick={() => { setActiveMerchant(m.id); goto(`/merchants/transaction?merchant_id=${m.id}`); }} class="tactile-btn flex-1 py-2.5 text-[var(--accent)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-receipt"></i> Transaksi
              </button>
            {:else}
              <button onclick={() => (configTarget = m)} class="tactile-btn flex-1 py-2.5 text-[var(--accent)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-gear"></i> Konfigurasi
              </button>
            {/if}
            <button onclick={() => (m.qris_static_set ? (qrisTarget = m) : (configTarget = m))} class="tactile-btn flex-1 py-2.5 text-[var(--text-muted)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-qrcode"></i> Buat QRIS
            </button>
            <button onclick={() => (delTarget = m)} aria-label="Hapus {m.name}" class="tactile-btn px-3.5 py-2.5 text-red-500 font-bold text-xs rounded-xl flex items-center justify-center">
              <i class="fa-solid fa-trash-can"></i>
            </button>
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
                <div class="w-12 h-12 rounded-[1.25rem] bg-emerald-500/10 flex items-center justify-center {p.cls}"><i class="{p.icon} text-lg"></i></div>
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

<!-- Hapus merchant confirm -->
<ConfirmModal
  open={delTarget !== null}
  title="Hapus Merchant"
  confirmLabel="Ya, Hapus"
  busy={deleting}
  onConfirm={remove}
  onClose={() => (delTarget = null)}
>
  <p class="text-sm text-[var(--text-muted)] leading-relaxed">Hapus merchant <span class="font-bold text-[var(--text-main)]">"{delTarget?.name}"</span>? Sesi GoBiz ikut terhapus.</p>
</ConfirmModal>

<!-- Konfigurasi lanjutan merchant -->
{#if configTarget}
  <GoBizConfigModal
    merchantId={configTarget.id}
    merchantName={configTarget.name}
    hasLogin={!!configTarget.merchant_id}
    onClose={() => (configTarget = null)}
    onDone={() => loadMerchants()}
  />
{/if}

<!-- Buat QRIS dinamis -->
{#if qrisTarget}
  <QrisModal
    merchant={qrisTarget}
    onClose={() => (qrisTarget = null)}
    onDone={() => loadMerchants()}
  />
{/if}

<!-- Edit merchant -->
{#if editTarget}
  <div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={() => (editTarget = null)}></button>
    <div class="tactile-modal w-full max-w-md p-6 relative z-50">
      <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
        <h3 class="text-lg font-bold">Edit Merchant</h3>
        <button type="button" aria-label="Tutup" onclick={() => (editTarget = null)} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
      </div>
      {#if editErr}<p class="text-xs font-semibold text-red-500 mb-3">{editErr}</p>{/if}
      <div class="space-y-4">
        <div>
          <label for="edit-name" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Nama Merchant ({typeMeta(editTarget.type).label})</label>
          <input id="edit-name" bind:value={editName} placeholder="Nama merchant" class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <button onclick={saveEdit} disabled={editSaving} class="tactile-btn w-full py-3 font-bold text-[var(--accent)]">
          <i class="fa-solid fa-floppy-disk mr-1"></i> {editSaving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  </div>
{/if}
