<script lang="ts">
  import { onMount } from 'svelte';
  import { admin } from '$lib/api';
  import { addToast } from '$lib/toast.svelte';
  import { merchants, loadMerchants } from '$lib/merchant.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';

  interface ApiKey {
    id: string;
    label: string | null;
    key_masked: string;
    merchant_id: string | null;
    status: string;
    last_used_at: number | null;
    created_at: number;
  }

  let keys = $state<ApiKey[]>([]);
  let loading = $state(true);
  let err = $state('');

  let modal = $state(false);
  let label = $state('');
  let merchantId = $state('');
  let saving = $state(false);
  let modalErr = $state('');

  let freshKey = $state<{ api_key: string } | null>(null);
  let copied = $state(false);

  let delTarget = $state<ApiKey | null>(null);
  let deleting = $state(false);

  const fmtDate = (n: number | null) =>
    n ? new Date(n).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  async function load() {
    loading = true; err = '';
    try {
      const r = await admin.listApiKeys();
      keys = r.data.api_keys;
    } catch (e: any) { err = e.message; }
    finally { loading = false; }
  }
  onMount(() => { load(); loadMerchants(); });

  function openAdd() {
    modal = true;
    label = '';
    merchantId = merchants.active?.id ?? '';
    modalErr = '';
  }
  async function submit() {
    saving = true; modalErr = '';
    try {
      const res = await admin.createApiKey(label.trim() || undefined, merchantId);
      freshKey = res.data;
      // Local push — backend balikin id + masked, sisanya default.
      keys = [
        ...keys,
        {
          id: res.data.id,
          label: label.trim() || null,
          key_masked: res.data.api_key_masked,
          merchant_id: merchantId || null,
          status: 'active',
          last_used_at: null,
          created_at: Date.now(),
        },
      ];
      copied = false;
      modal = false;
    } catch (e: any) { modalErr = e.message; }
    finally { saving = false; }
  }
  async function del() {
    const target = delTarget;
    if (!target) return;
    deleting = true;
    try {
      await admin.deleteApiKey(target.id);
      keys = keys.filter((x) => x.id !== target.id);
      delTarget = null;
      addToast('success', 'API key dihapus.');
    } catch (e: any) { err = e.message; delTarget = null; }
    finally { deleting = false; }
  }
  const merchantName = (id: string | null) =>
    id ? merchants.list.find((m) => m.id === id)?.name || id : 'Random / unbound';
  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      copied = true;
      setTimeout(() => (copied = false), 2000);
    }).catch(() => {});
  };
</script>

<div class="space-y-6">
  {#if err}<p class="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-2xl px-4 py-3"><i class="fa-solid fa-circle-exclamation mr-2"></i>{err}</p>{/if}

  {#if freshKey}
    <div class="bg-emerald-100/70 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-xs space-y-1">
      <p class="font-semibold text-emerald-700 dark:text-emerald-300"><i class="fa-solid fa-circle-check mr-2"></i>API key dibuat — salin sekarang, tidak akan ditampilkan lagi:</p>
      <div class="flex items-center gap-2">
        <code class="font-mono break-all flex-1 text-emerald-700 dark:text-emerald-300">{freshKey.api_key}</code>
        <button onclick={() => copy(freshKey?.api_key ?? '')} class="tactile-btn px-3 py-1.5 text-xs font-bold text-[var(--accent)] shrink-0"><i class="fa-solid {copied ? 'fa-check' : 'fa-copy'} mr-1"></i>{copied ? 'Tersalin' : 'Salin'}</button>
      </div>
    </div>
  {/if}

<!-- Hapus API key confirm -->
<ConfirmModal
  open={delTarget !== null}
  title="Hapus API Key"
  confirmLabel="Ya, Hapus"
  busy={deleting}
  onConfirm={del}
  onClose={() => (delTarget = null)}
>
  <p class="text-sm text-[var(--text-muted)] leading-relaxed">
    Hapus API key <span class="font-bold text-[var(--text-main)]">{delTarget?.label || 'Tanpa label'}</span>
    (<code class="font-mono text-[var(--accent)]">{delTarget?.key_masked}</code>)?<br />
    Endpoint publik yang pakai key ini langsung mati dan tidak bisa dikembalikan.
  </p>
</ConfirmModal>

  <div class="flex items-center justify-between gap-3">
    <div class="text-xs text-[var(--text-muted)] font-medium">
      <span class="font-bold text-[var(--text-main)]">{keys.length}</span> API key
    </div>
    <button onclick={openAdd} class="tactile-btn px-4 py-2.5 font-bold text-[var(--accent)] text-sm flex items-center gap-2">
      <i class="fa-solid fa-plus"></i> Buat API Key
    </button>
  </div>

  {#if loading}
    <div class="space-y-3">
      {#each Array.from({ length: 3 }) as _, i}
        <div class="tactile-box p-4 space-y-2.5">
          <div class="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      {/each}
    </div>
  {:else if keys.length === 0}
    <div class="tactile-box p-10 text-center text-sm text-[var(--text-muted)]">
      Belum ada API key. Klik <span class="font-bold text-[var(--accent)]">Buat API Key</span> untuk generate.
    </div>
  {:else}
    <div class="space-y-3">
      {#each keys as k (k.id)}
        <div class="tactile-box p-4 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-sm font-bold truncate">{k.label || 'Tanpa label'}</p>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full {k.status === 'active' ? 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30' : 'bg-slate-200/60 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300'}">{k.status}</span>
            </div>
            <p class="font-mono text-xs text-[var(--text-muted)] mt-1">{k.key_masked}</p>
            <p class="text-[10px] text-[var(--text-muted)] mt-1">
              <i class="fa-solid fa-store mr-1"></i>Merchant {merchantName(k.merchant_id)} · Dibuat {fmtDate(k.created_at)} · Terakhir dipakai {fmtDate(k.last_used_at)}
            </p>
          </div>
          <button onclick={() => (delTarget = k)} aria-label="Hapus API key" class="tactile-btn px-3 py-2 text-xs font-bold text-red-500 shrink-0"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Buat API Key modal -->
{#if modal}
  <div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={() => (modal = false)}></button>
    <div class="tactile-modal w-full max-w-md p-6 relative z-50">
      <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
        <h3 class="text-lg font-bold">Buat API Key</h3>
        <button type="button" aria-label="Tutup" onclick={() => (modal = false)} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
      </div>

      {#if modalErr}<p class="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-4">{modalErr}</p>{/if}

      <div class="space-y-4">
        <div>
          <label for="key-label" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Label (opsional)</label>
          <input id="key-label" bind:value={label} placeholder="Contoh: Production Gateway" class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <div>
          <label for="key-merchant" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Merchant (opsional)</label>
          <select id="key-merchant" bind:value={merchantId} class="w-full tactile-inset px-3 py-2.5 text-sm focus:outline-none cursor-pointer">
            <option value="">Random / belum di-binding</option>
            {#each merchants.list as m (m.id)}
              <option value={m.id}>{m.name}</option>
            {/each}
          </select>
          <p class="text-[10px] text-[var(--text-muted)] mt-1">Kosongkan untuk random merchant per generate — dipakai sebagai Bearer token di API v1.</p>
        </div>
        <div class="flex gap-2 pt-2">
          <button disabled={saving} onclick={submit} class="tactile-btn flex-1 py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
            <i class="fa-solid fa-key"></i> {saving ? 'Membuat...' : 'Generate'}
          </button>
          <button onclick={() => (modal = false)} class="tactile-btn px-5 py-3 text-sm text-[var(--text-muted)]">Batal</button>
        </div>
      </div>
    </div>
  </div>
{/if}
