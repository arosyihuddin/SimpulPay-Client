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
  }

  let form = $state<GatewaySettings>({
    default_currency: 'IDR',
    qris_expiry_minutes: '2',
    min_amount: '100',
    max_amount: '10000000',
    fee_percent: '0',
    pooling_interval: '8',
  });
  let loading = $state(true);
  let err = $state('');

  // Save per-field: 1 request per field, bukan 1 request besar.
  let saving = $state<Record<string, boolean>>({});
  let saved = $state<Record<string, boolean>>({});

  // ponytail: expand list kalau backend dukung mata uang lain
  const CURRENCIES = ['IDR', 'USD', 'SGD'];
  const NUM_KEYS = [
    'min_amount',
    'max_amount',
    'fee_percent',
    'qris_expiry_minutes',
    'pooling_interval',
  ];

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

  // ---- Load & per-field save ----
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

  /** Simpan satu field — PATCH cuma berisi field itu, sisanya server yang merge. */
  async function saveField(key: keyof GatewaySettings) {
    if (NUM_KEYS.includes(key)) {
      const v = Number(form[key]);
      if (isNaN(v) || v < 0) {
        err = `${key} harus angka ≥ 0`;
        return;
      }
      if (key === 'pooling_interval' && v <= 0) {
        err = 'pooling_interval harus > 0 (detik)';
        return;
      }
      if (key === 'fee_percent' && v > 100) {
        err = 'fee_percent maksimal 100';
        return;
      }
      if (key === 'qris_expiry_minutes' && v > 1440) {
        err = 'qris_expiry_minutes maksimal 1440';
        return;
      }
      if (key === 'max_amount' && Number(form.max_amount) < Number(form.min_amount)) {
        err = 'Max amount harus ≥ min amount';
        return;
      }
    }
    err = '';
    saved[key] = false;
    saving[key] = true;
    try {
      const res = await admin.updateSettings({ [key]: form[key] });
      form = { ...(res.data?.settings as GatewaySettings) };
      saved[key] = true;
      setTimeout(() => { saved[key] = false; }, 2000);
    } catch (e: any) {
      err = e.message;
    } finally {
      saving[key] = false;
    }
  }

  // Indikator status per field: spinner saat menyimpan, centang saat tersimpan.
  const fieldStatus = (key: string) => {
    if (saving[key]) return `<i class="fa-solid fa-spinner fa-spin text-[var(--text-muted)]"></i>`;
    if (saved[key]) return `<i class="fa-solid fa-check text-emerald-500"></i>`;
    return '';
  };
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
        <div class="flex items-center gap-2">
          <p class="font-bold text-lg truncate">{auth.name || '—'}</p>
          <span
            class="tactile-pill px-2 py-0.5 text-[10px] font-bold shrink-0 {auth.status === 'active' ? 'pill-green' : 'pill-amber'}"
          >{(auth.status || '—').toUpperCase()}</span>
        </div>
      </div>
      <button
        onclick={openEdit}
        class="tactile-btn w-10 h-10 flex items-center justify-center text-[var(--accent)] shrink-0"
        title="Edit Profil"
      >
        <i class="fa-solid fa-pen"></i>
      </button>
    </div>

    <Row label="Email" val={auth.email || '—'} />
    <Row label="Telepon" val={auth.phone || '—'} />

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
        <p class="text-xs text-[var(--text-muted)]">Tiap field tersimpan otomatis saat berubah</p>
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
          <div class="relative">
            <select
              id="set-currency"
              value={form.default_currency}
              onchange={(e) => {
                form.default_currency = e.currentTarget.value;
                saveField('default_currency');
              }}
              class="w-full tactile-inset px-3 py-2.5 text-sm focus:outline-none cursor-pointer appearance-none pr-8"
            >
              {#each CURRENCIES as c (c)}
                <option value={c}>{c}</option>
              {/each}
            </select>
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none">{@html fieldStatus('default_currency')}</span>
          </div>
        </div>
        <div>
          <label for="set-expiry" class="block text-xs font-bold text-[var(--text-muted)] mb-1">QRIS Expiry (menit)</label>
          <div class="relative">
            <input
              id="set-expiry"
              type="number"
              min="0"
              value={form.qris_expiry_minutes}
              oninput={(e) => { form.qris_expiry_minutes = e.currentTarget.value; saved.qris_expiry_minutes = false; }}
              onblur={() => saveField('qris_expiry_minutes')}
              class="w-full tactile-inset px-4 py-2.5 pr-8 text-sm focus:outline-none"
            />
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none">{@html fieldStatus('qris_expiry_minutes')}</span>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="set-min" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Min Amount</label>
          <div class="relative">
            <input
              id="set-min"
              type="number"
              min="0"
              value={form.min_amount}
              oninput={(e) => { form.min_amount = e.currentTarget.value; saved.min_amount = false; }}
              onblur={() => saveField('min_amount')}
              class="w-full tactile-inset px-4 py-2.5 pr-8 text-sm focus:outline-none"
            />
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none">{@html fieldStatus('min_amount')}</span>
          </div>
        </div>
        <div>
          <label for="set-max" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Max Amount</label>
          <div class="relative">
            <input
              id="set-max"
              type="number"
              min="0"
              value={form.max_amount}
              oninput={(e) => { form.max_amount = e.currentTarget.value; saved.max_amount = false; }}
              onblur={() => saveField('max_amount')}
              class="w-full tactile-inset px-4 py-2.5 pr-8 text-sm focus:outline-none"
            />
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none">{@html fieldStatus('max_amount')}</span>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="set-fee" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Fee (%)</label>
          <div class="relative">
            <input
              id="set-fee"
              type="number"
              min="0"
              step="0.01"
              value={form.fee_percent}
              oninput={(e) => { form.fee_percent = e.currentTarget.value; saved.fee_percent = false; }}
              onblur={() => saveField('fee_percent')}
              class="w-full tactile-inset px-4 py-2.5 pr-8 text-sm focus:outline-none"
            />
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none">{@html fieldStatus('fee_percent')}</span>
          </div>
        </div>
        <div>
          <label for="set-pool" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Pooling Interval (detik)</label>
          <div class="relative">
            <input
              id="set-pool"
              type="number"
              min="1"
              step="1"
              value={form.pooling_interval}
              oninput={(e) => { form.pooling_interval = e.currentTarget.value; saved.pooling_interval = false; }}
              onblur={() => saveField('pooling_interval')}
              class="w-full tactile-inset px-4 py-2.5 pr-8 text-sm focus:outline-none"
            />
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none">{@html fieldStatus('pooling_interval')}</span>
          </div>
        </div>
      </div>
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
