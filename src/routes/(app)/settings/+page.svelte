<script lang="ts">
  import { onMount } from 'svelte';
  import { admin } from '$lib/api';
  import Row from '$lib/components/Row.svelte';
  import { addToast } from '$lib/toast.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';

  interface ApiKey { id: string; label: string | null; key_masked: string; status: string; }
  interface SettingsData { api_keys: ApiKey[]; }

  let s = $state<SettingsData | null>(null);
  let err = $state('');
  const displayUser = $state(typeof localStorage !== 'undefined' ? localStorage.getItem('gomerch_username') || '' : '');

  // API key baru
  let newKeyLabel = $state('');
  let newKey = $state('');

  // Confirm modal
  let delKeyId = $state<string | null>(null);
  let deleting = $state(false);

  async function load() {
    admin.settings().then((d) => (s = d.data)).catch((e) => (err = e.message));
  }
  onMount(load);

  async function genKey() {
    err = '';
    try { const res = await admin.createApiKey(newKeyLabel || undefined); newKey = res.data.api_key; newKeyLabel = ''; load(); }
    catch (e: any) { err = e.message; }
  }

  async function delKey() {
    const id = delKeyId;
    if (!id) return;
    deleting = true; err = '';
    try { await admin.deleteApiKey(id); delKeyId = null; addToast('success', 'API key dihapus.'); load(); }
    catch (e: any) { err = e.message; delKeyId = null; }
    finally { deleting = false; }
  }

  async function logout() {
    await admin.logout().catch(() => {});
    location.href = '/';
  }
</script>

<div class="space-y-6">
  {#if err}<p class="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-2xl px-4 py-3"><i class="fa-solid fa-circle-exclamation mr-2"></i>{err}</p>{/if}
  {#if newKey}
    <div class="bg-emerald-100/70 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/30 rounded-2xl px-4 py-3 text-xs space-y-1">
      <p class="font-semibold text-emerald-700 dark:text-emerald-300"><i class="fa-solid fa-circle-check mr-2"></i>API key baru dibuat — salin sekarang, tidak akan ditampilkan lagi:</p>
      <p class="font-mono break-all text-emerald-700 dark:text-emerald-300">{newKey}</p>
    </div>
  {/if}

  <!-- SECTION USER -->
  <section class="tactile-box p-5 space-y-4">
    <div class="flex items-center gap-2">
      <i class="fa-solid fa-user text-[var(--accent)]"></i>
      <div><h2 class="font-semibold">User</h2><p class="text-xs text-[var(--text-muted)]">Kredensial & keamanan akun admin</p></div>
    </div>

    <Row label="Username" val={displayUser || '—'} />

    <a href="/settings/password" class="tactile-btn w-full py-3 text-xs font-bold text-[var(--accent)] flex items-center justify-center gap-2">
      <i class="fa-solid fa-key"></i> Ganti Password
    </a>

    <div class="border-t border-[var(--border-subtle)] pt-4 space-y-2.5">
      <h3 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">API Key</h3>
      {#if s?.api_keys.length}
        <div class="space-y-2">
          {#each s.api_keys as k (k.id)}
            <div class="flex items-center justify-between gap-2 tactile-inset px-3 py-2.5 rounded-xl">
              <div class="min-w-0">
                <p class="text-xs font-semibold truncate">{k.label || 'Tanpa label'}</p>
                <p class="font-mono text-xs text-[var(--text-muted)] break-all">{k.key_masked}</p>
              </div>
              <button onclick={() => (delKeyId = k.id)} aria-label="Hapus API key" class="tactile-btn px-3 py-2 text-xs font-bold text-red-500 shrink-0"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-xs text-[var(--text-muted)]">Belum ada API key.</p>
      {/if}
      <div class="flex gap-2">
        <div class="input-well px-3 py-2 flex items-center flex-1">
          <i class="fa-solid fa-tag text-[var(--text-muted)] mr-2"></i>
          <input type="text" bind:value={newKeyLabel} placeholder="Label (opsional)" class="bg-transparent w-full text-xs focus:outline-none placeholder:text-[var(--text-muted)]" />
        </div>
        <button onclick={genKey} class="tactile-btn px-4 py-2 text-xs font-bold text-[var(--accent)] shrink-0"><i class="fa-solid fa-plus mr-1"></i>Buat</button>
      </div>
    </div>
  </section>

  <!-- Mobile only — developer & logout -->
  <div class="lg:hidden tactile-box p-5 space-y-2.5">
    <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-arrow-right-from-bracket text-[var(--accent)]"></i> Akun</h2>
    <a href="/developer" class="tactile-btn flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-[var(--text-muted)]">
      <i class="fa-solid fa-code w-5"></i><span>Developer API</span>
    </a>
    <button onclick={logout} class="tactile-btn flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-red-500 w-full">
      <i class="fa-solid fa-right-from-bracket w-5"></i><span>Logout</span>
    </button>
  </div>
</div>

<!-- Hapus API key confirm -->
<ConfirmModal
  open={delKeyId !== null}
  title="Hapus API Key"
  confirmLabel="Ya, Hapus"
  busy={deleting}
  onConfirm={delKey}
  onClose={() => (delKeyId = null)}
>
  <p class="text-sm text-[var(--text-muted)] leading-relaxed">Hapus API key? Endpoint publik yang pakai key ini langsung mati.</p>
</ConfirmModal>
