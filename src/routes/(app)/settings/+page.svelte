<script lang="ts">
  import { onMount } from 'svelte';
  import { admin } from '$lib/api';
  import { auth, checkAuth } from '$lib/auth.svelte';
  import Row from '$lib/components/Row.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import { addToast } from '$lib/toast.svelte';

  interface GatewaySettings {
    default_currency: string;
    qris_expiry_minutes: string;
    min_amount: string;
    max_amount: string;
    fee_percent: string;
    pooling_interval: string;
    webhook_enabled: string;
  }

  let form = $state<GatewaySettings>({
    default_currency: 'IDR',
    qris_expiry_minutes: '15',
    min_amount: '100',
    max_amount: '10000000',
    fee_percent: '0',
    pooling_interval: '5000',
    webhook_enabled: 'false',
  });
  let loading = $state(true);
  let saving = $state(false);
  let err = $state('');

  // ponytail: expand list kalau backend dukung mata uang lain
  const CURRENCIES = ['IDR', 'USD', 'SGD'];

  // ---- Edit profil ----
  let editOpen = $state(false);
  let pForm = $state({ name: '', email: '', phone: '' });
  let pBusy = $state(false);
  let pErr = $state('');
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function openEdit() {
    pForm = {
      name: auth.name || '',
      email: auth.email || '',
      phone: auth.phone || '',
    };
    pErr = '';
    editOpen = true;
  }

  async function saveProfile() {
    pErr = '';
    const email = pForm.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { pErr = 'Format email tidak valid.'; return; }
    pBusy = true;
    try {
      await admin.updateProfile({
        name: pForm.name.trim(),
        email,
        phone: pForm.phone.trim(),
      });
      await checkAuth();
      editOpen = false;
      addToast('success', 'Profil diperbarui.');
    } catch (e: any) {
      pErr = e.message;
    } finally {
      pBusy = false;
    }
  }

  async function load() {
    loading = true;
    err = '';
    try {
      const r = await admin.settings();
      form = { ...(r.data?.settings as GatewaySettings) };
    } catch (e: any) {
      err = e.message;
    } finally {
      loading = false;
    }
  }
  onMount(load);

  async function saveSettings() {
    err = '';
    const min = Number(form.min_amount);
    const max = Number(form.max_amount);
    const nums: [string, number][] = [
      ['min_amount', min],
      ['max_amount', max],
      ['fee_percent', Number(form.fee_percent)],
      ['qris_expiry_minutes', Number(form.qris_expiry_minutes)],
      ['pooling_interval', Number(form.pooling_interval)],
    ];
    for (const [k, v] of nums) {
      if (isNaN(v) || v < 0) {
        err = `${k} harus angka ≥ 0`;
        return;
      }
    }
    if (max < min) {
      err = 'Max amount harus ≥ min amount';
      return;
    }
    if (form.webhook_enabled !== 'true' && form.webhook_enabled !== 'false') {
      err = 'Webhook enabled tidak valid';
      return;
    }
    saving = true;
    try {
      const res = await admin.updateSettings({ ...form });
      form = { ...(res.data?.settings as GatewaySettings) };
      addToast('success', 'Konfigurasi gateway disimpan.');
    } catch (e: any) {
      err = e.message;
    } finally {
      saving = false;
    }
  }

</script>

<div class="space-y-6">
  {#if err}<p
      class="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-2xl px-4 py-3"
    >
      <i class="fa-solid fa-circle-exclamation mr-2"></i>{err}
    </p>{/if}

  <!-- USER & KEAMANAN -->
  <section class="tactile-box p-5 space-y-4">
    <div class="flex items-center gap-4">
      <div class="tactile-btn w-16 h-16 rounded-full flex items-center justify-center text-xl font-extrabold text-[var(--accent)] shrink-0">
        {auth.name
          ? auth.name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
          : (auth.email || '?').slice(0, 2).toUpperCase()}
      </div>
      <div class="min-w-0 flex-1">
        <p class="font-bold text-lg truncate">{auth.name || '—'}</p>
        <p class="text-xs text-[var(--text-muted)] truncate">{auth.email || '—'}</p>
      </div>
      <button
        onclick={openEdit}
        class="tactile-btn w-10 h-10 flex items-center justify-center text-[var(--accent)] shrink-0"
        title="Edit Profil"
      >
        <i class="fa-solid fa-pen"></i>
      </button>
    </div>

    <Row label="Telepon" val={auth.phone || '—'} />
    <Row label="Role" val={auth.role} />
    <Row label="Status" val={auth.status || '—'} />

    <a
      href="/settings/password"
      class="tactile-btn w-full py-3 text-xs font-bold text-[var(--accent)] flex items-center justify-center gap-2"
    >
      <i class="fa-solid fa-key"></i> Ganti Password
    </a>
  </section>

  <!-- KONFIGURASI GATEWAY -->
  <section class="tactile-box p-5 space-y-4">
    <div class="flex items-center gap-2">
      <i class="fa-solid fa-sliders text-[var(--accent)]"></i>
      <div>
        <h2 class="font-semibold">Konfigurasi Gateway</h2>
        <p class="text-xs text-[var(--text-muted)]">Default per-user untuk QRIS & transaksi</p>
      </div>
    </div>

    {#if loading}
      <div class="space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    {:else}
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="set-currency" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Mata Uang</label>
          <select
            id="set-currency"
            bind:value={form.default_currency}
            class="w-full tactile-inset px-3 py-2.5 text-sm focus:outline-none cursor-pointer"
          >
            {#each CURRENCIES as c (c)}
              <option value={c}>{c}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="set-expiry" class="block text-xs font-bold text-[var(--text-muted)] mb-1">QRIS Expiry (menit)</label>
          <input
            id="set-expiry"
            type="number"
            min="0"
            bind:value={form.qris_expiry_minutes}
            class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none"
          />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="set-min" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Min Amount</label>
          <input
            id="set-min"
            type="number"
            min="0"
            bind:value={form.min_amount}
            class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label for="set-max" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Max Amount</label>
          <input
            id="set-max"
            type="number"
            min="0"
            bind:value={form.max_amount}
            class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none"
          />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="set-fee" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Fee (%)</label>
          <input
            id="set-fee"
            type="number"
            min="0"
            step="0.01"
            bind:value={form.fee_percent}
            class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label for="set-pool" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Pooling Interval (ms)</label>
          <input
            id="set-pool"
            type="number"
            min="0"
            bind:value={form.pooling_interval}
            class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none"
          />
        </div>
      </div>

      <button
        onclick={() => (form.webhook_enabled = form.webhook_enabled === 'true' ? 'false' : 'true')}
        class="tactile-btn w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 {form.webhook_enabled === 'true'
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-[var(--text-muted)]'}"
      >
        <i class="fa-solid {form.webhook_enabled === 'true' ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
        Webhook {form.webhook_enabled === 'true' ? 'Aktif' : 'Nonaktif'}
      </button>

      <button
        onclick={saveSettings}
        disabled={saving}
        class="tactile-btn w-full py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <i class="fa-solid fa-floppy-disk"></i>
        {saving ? 'Menyimpan...' : 'Simpan'}
      </button>
    {/if}
  </section>
</div>

<!-- Edit profil modal -->
{#if editOpen}
  <div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={() => (editOpen = false)}></button>
    <div class="tactile-modal w-full max-w-sm p-6 relative z-50">
      <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
        <h3 class="text-lg font-bold">Edit Profil</h3>
        <button type="button" aria-label="Tutup" onclick={() => (editOpen = false)} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="space-y-4">
        {#if pErr}
          <p class="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{pErr}</p>
        {/if}
        <div>
          <label for="pf-name" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Nama</label>
          <input id="pf-name" bind:value={pForm.name} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <div>
          <label for="pf-email" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Email</label>
          <input id="pf-email" type="email" bind:value={pForm.email} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <div>
          <label for="pf-phone" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Telepon</label>
          <input id="pf-phone" bind:value={pForm.phone} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>

        <div class="flex gap-2 pt-2">
          <button disabled={pBusy} onclick={saveProfile} class="tactile-btn flex-1 py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
            <i class="fa-solid fa-floppy-disk"></i> {pBusy ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button onclick={() => (editOpen = false)} class="tactile-btn px-5 py-3 text-sm text-[var(--text-muted)]">Batal</button>
        </div>
      </div>
    </div>
  </div>
{/if}
