<script lang="ts">
  import { onMount } from 'svelte';
  import { admin } from '$lib/api';
  import { addToast } from '$lib/toast.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import ConfirmModal from '$lib/components/ConfirmModal.svelte';

  let maintenance = $state(false);
  let loading = $state(true);
  let saving = $state(false);
  let err = $state('');
  let confirm = $state<'aktif' | 'mati' | null>(null);

  async function load() {
    loading = true;
    err = '';
    try {
      const r = await admin.getMaintenance();
      maintenance = !!r.data?.maintenance;
    } catch (e: any) {
      err = e.message;
    } finally {
      loading = false;
    }
  }
  onMount(load);

  async function toggle(target: boolean) {
    saving = true;
    err = '';
    try {
      const r = await admin.setMaintenance(target);
      maintenance = !!r.data?.maintenance;
      addToast('success', 'Mode maintenance ' + (maintenance ? 'diaktifkan.' : 'dimatikan.'));
    } catch (e: any) {
      err = e.message;
    } finally {
      saving = false;
      confirm = null;
    }
  }
</script>

<div class="space-y-6">
  {#if err}
    <p class="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-2xl px-4 py-3"><i class="fa-solid fa-circle-exclamation mr-2"></i>{err}</p>
  {/if}

  <div class="tactile-box p-5 space-y-4">
    <div class="flex items-center gap-2">
      <i class="fa-solid fa-screwdriver-wrench text-[var(--accent)]"></i>
      <div>
        <h2 class="font-semibold">Mode Maintenance</h2>
        <p class="text-xs text-[var(--text-muted)]">Sistem settings untuk admin — matikan akses sementara semua user</p>
      </div>
    </div>

    {#if loading}
      <div class="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-full" />
      </div>
    {:else}
      <div class="flex items-center justify-between gap-4 tactile-inset rounded-2xl p-4">
        <div>
          <p class="font-bold text-sm">{maintenance ? 'Maintenance AKTIF' : 'Sistem normal'}</p>
          <p class="text-xs text-[var(--text-muted)] mt-0.5">
            {maintenance
              ? 'Semua user tidak bisa mengakses sistem sampai dimatikan.'
              : 'Layanan berjalan normal. Aktifkan untuk memblokir akses user.'}
          </p>
        </div>
        <button
          onclick={() => (confirm = maintenance ? 'mati' : 'aktif')}
          disabled={saving}
          class="tactile-btn px-5 py-3 text-sm font-bold shrink-0 disabled:opacity-50 disabled:cursor-not-allowed {maintenance
            ? 'text-red-500'
            : 'text-[var(--accent)]'}"
        >
          <i class="fa-solid {maintenance ? 'fa-power-off' : 'fa-circle-check'} mr-2"></i>
          {saving ? 'Menyimpan...' : maintenance ? 'Matikan' : 'Aktifkan'}
        </button>
      </div>

      {#if maintenance}
        <p class="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-xl px-4 py-3">
          <i class="fa-solid fa-triangle-exclamation mr-2"></i>Mode maintenance aktif. Semua request user ditolak sampai mode ini dimatikan.
        </p>
      {/if}
    {/if}
  </div>
</div>

<ConfirmModal
  open={confirm !== null}
  title={confirm === 'aktif' ? 'Aktifkan Mode Maintenance' : 'Matikan Mode Maintenance'}
  confirmLabel={confirm === 'aktif' ? 'Ya, Aktifkan' : 'Ya, Matikan'}
  busyLabel="Menyimpan..."
  icon={confirm === 'aktif' ? 'fa-power-off' : 'fa-circle-check'}
  busy={saving}
  onConfirm={() => toggle(confirm === 'aktif')}
  onClose={() => (confirm = null)}
>
  <p class="text-sm text-[var(--text-muted)] leading-relaxed">
    {confirm === 'aktif'
      ? 'Aktifkan mode maintenance? Semua user tidak bisa mengakses sistem sampai mode ini dimatikan.'
      : 'Matikan mode maintenance? Semua user bisa mengakses sistem kembali.'}
  </p>
</ConfirmModal>
