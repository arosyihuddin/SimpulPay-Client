<script lang="ts">
  import { onMount } from 'svelte';
  import { admin } from '$lib/api';
  import { merchants, loadMerchants, setActiveMerchant } from '$lib/merchant.svelte';
  import Row from '$lib/components/Row.svelte';
  import { addToast } from '$lib/toast.svelte';

  interface ApiKey { id: string; label: string | null; key_masked: string; status: string; }
  interface SettingsData { merchants: unknown[]; api_keys: ApiKey[]; }

  let s = $state<SettingsData | null>(null);
  let err = $state('');
  const displayUser = $state(typeof localStorage !== 'undefined' ? localStorage.getItem('gomerch_username') || '' : '');

  // Sesi GoBiz (per-merchant, dari dashboard)
  let session = $state<{ exists: boolean; phone?: string; outlet?: string; merchant_id?: string | null; expired?: boolean; expires_at?: string | null } | null>(null);

  // Login GoBiz
  let phone = $state('');
  let otpToken = $state('');
  let uniqueId = $state('');
  let otp = $state('');
  let step = $state<'phone' | 'otp'>('phone');
  let otpBusy = $state(false);

  // Konfigurasi QRIS static
  let qrisImg = $state<string | null>(null);
  let qrisParsed = $state<any | null>(null);
  let qrisBusy = $state(false);

  // API key baru
  let newKeyLabel = $state('');
  let newKey = $state('');

  async function load() {
    if (!merchants.active) return;
    admin.settings().then((d) => (s = d.data)).catch((e) => (err = e.message));
    admin.dashboard(merchants.active.id).then((d) => (session = d.data.gobiz_session)).catch(() => {});
  }
  onMount(() => { loadMerchants(); });
  $effect(() => { load(); });

  async function requestOtp(e: SubmitEvent) {
    e.preventDefault(); otpBusy = true; err = '';
    try {
      const res = await admin.otpRequest(phone);
      otpToken = res.data.otp_token; uniqueId = res.data.unique_id; step = 'otp'; addToast('info', `OTP dikirim ke ${phone}`);
    } catch (e: any) { err = e.message; }
    finally { otpBusy = false; }
  }

  async function verifyOtp(e: SubmitEvent) {
    e.preventDefault(); otpBusy = true; err = '';
    try {
      const res = await admin.otpVerify(phone, otp, otpToken, uniqueId, merchants.active?.id);
      addToast('success', `Login GoBiz sukses: ${res.data.outlet_name} (${res.data.phone_number})`);
      step = 'phone'; phone = ''; otp = ''; otpToken = ''; uniqueId = ''; load();
    } catch (e: any) { err = e.message; }
    finally { otpBusy = false; }
  }

  async function refreshGoBiz() {
    otpBusy = true; err = '';
    try { const res = await admin.refreshSession(merchants.active?.id); addToast('success', `Sesi GoBiz di-refresh, berlaku hingga ${res.data.expires_at}`); }
    catch (e: any) { err = e.message; }
    finally { otpBusy = false; }
  }

  async function deleteGoBiz() {
    if (!confirm('Hapus sesi GoBiz? Login OTP ulang diperlukan.')) return;
    otpBusy = true; err = '';
    try { await admin.deleteGoBizSession(merchants.active?.id); addToast('success', 'Sesi GoBiz dihapus. Login OTP ulang untuk akses transaksi.'); step = 'phone'; load(); }
    catch (e: any) { err = e.message; }
    finally { otpBusy = false; }
  }

  function onQrisFile(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    qrisParsed = null;
    const reader = new FileReader();
    reader.onload = () => (qrisImg = reader.result as string);
    reader.readAsDataURL(f);
  }

  async function parseQrisImage() {
    if (!qrisImg) return;
    qrisBusy = true; err = '';
    try { const res = await admin.parseQrisImage(qrisImg); qrisParsed = res.data; addToast('info', `QRIS terbaca: ${res.data.merchant_name || res.data.merchant_id || 'merchant'}`); }
    catch (e: any) { err = e.message; }
    finally { qrisBusy = false; }
  }

  async function saveQrisStatic() {
    if (!qrisParsed) return;
    qrisBusy = true; err = '';
    try {
      await admin.saveQrisStatic(qrisParsed.code, merchants.active?.id);
      if (qrisParsed.merchant_id) await admin.saveMerchantId(qrisParsed.merchant_id, merchants.active?.id).catch(() => {});
      addToast('success', 'QRIS static & merchant ID tersimpan. QR dinamis sekarang bisa dibuat.');
      qrisParsed = null; qrisImg = null; load();
    } catch (e: any) { err = e.message; }
    finally { qrisBusy = false; }
  }

  async function genKey() {
    err = '';
    try { const res = await admin.createApiKey(newKeyLabel || undefined); newKey = res.data.api_key; newKeyLabel = ''; load(); }
    catch (e: any) { err = e.message; }
  }

  async function delKey(id: string) {
    if (!confirm('Hapus API key? Endpoint publik akan mati.')) return;
    err = '';
    try { await admin.deleteApiKey(id); addToast('success', 'API key dihapus.'); load(); }
    catch (e: any) { err = e.message; }
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
              <button onclick={() => delKey(k.id)} aria-label="Hapus API key" class="tactile-btn px-3 py-2 text-xs font-bold text-red-500 shrink-0"><i class="fa-solid fa-trash-can"></i></button>
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

  <!-- SECTION MERCHANT -->
  <section class="tactile-box p-5 space-y-4">
    <div class="flex items-center gap-2">
      <i class="fa-solid fa-store text-[var(--accent)]"></i>
      <div><h2 class="font-semibold">Merchant</h2><p class="text-xs text-[var(--text-muted)]">Login GoBiz, QRIS, dan identitas merchant</p></div>
    </div>

    {#if merchants.list.length > 1}
      <div class="flex items-center gap-3">
        <label for="set-merchant" class="text-xs font-bold text-[var(--text-muted)] whitespace-nowrap">Merchant</label>
        <select
          id="set-merchant"
          value={merchants.activeId ?? ''}
          onchange={(e) => setActiveMerchant((e.target as HTMLSelectElement).value)}
          class="w-full tactile-inset px-3 py-2.5 text-sm focus:outline-none cursor-pointer"
        >
          {#each merchants.list as m (m.id)}
            <option value={m.id}>{m.name}</option>
          {/each}
        </select>
      </div>
    {/if}

    {#if session && !session.exists}
      <div class="space-y-3">
        <p class="text-xs text-[var(--text-muted)]">Login OTP untuk mengakses API transaksi GoPay.</p>
        {#if step === 'phone'}
          <form onsubmit={requestOtp} class="space-y-3">
            <div class="input-well px-4 py-3 flex items-center">
              <i class="fa-solid fa-phone text-[var(--text-muted)] mr-3"></i>
              <input type="text" bind:value={phone} placeholder="Nomor HP (contoh: 085119772671)" class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]" />
            </div>
            <button disabled={otpBusy} class="tactile-btn w-full py-4 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
              <i class="fa-solid fa-paper-plane"></i> {otpBusy ? 'Mengirim...' : 'Kirim OTP'}
            </button>
          </form>
        {:else}
          <form onsubmit={verifyOtp} class="space-y-3">
            <p class="text-sm text-[var(--text-main)]">OTP dikirim ke {phone}</p>
            <div class="input-well px-4 py-3 flex items-center">
              <i class="fa-solid fa-key text-[var(--text-muted)] mr-3"></i>
              <input type="text" bind:value={otp} placeholder="Kode OTP (4 digit)" class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]" />
            </div>
            <div class="flex gap-2">
              <button disabled={otpBusy} class="tactile-btn flex-1 py-4 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
                <i class="fa-solid fa-check"></i> {otpBusy ? 'Verifikasi...' : 'Verifikasi OTP'}
              </button>
              <button onclick={() => { step = 'phone'; otp = ''; }} class="tactile-btn px-5 py-3 text-sm text-[var(--text-muted)]">Batal</button>
            </div>
          </form>
        {/if}
      </div>
    {:else if session}
      <div class="space-y-3">
        <p class="text-xs text-[var(--text-muted)]">Token berlaku 24 jam, auto-refresh handled backend.</p>
        <Row label="Sesi GoBiz" val={session.outlet || 'Aktif'} />
        {#if session.merchant_id}<Row label="Merchant ID" val={session.merchant_id} />{/if}
        <div class="flex gap-2">
          <button onclick={refreshGoBiz} disabled={otpBusy} class="tactile-btn flex-1 py-4 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
            <i class="fa-solid fa-arrows-rotate"></i> Refresh
          </button>
          <button onclick={deleteGoBiz} disabled={otpBusy} class="tactile-btn px-5 py-4 font-bold text-red-500 flex items-center gap-2">
            <i class="fa-solid fa-trash-can"></i> Hapus
          </button>
        </div>
      </div>
    {/if}

    <!-- Konfigurasi QRIS -->
    <div class="border-t border-[var(--border-subtle)] pt-4 space-y-3">
      <h3 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Konfigurasi QRIS</h3>
      <p class="text-xs text-[var(--text-muted)]">Upload gambar QRIS static dari merchant GoBiz. Dipakai bikin QR dinamis.</p>

      {#if merchants.active?.qris_static_set}
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)] shrink-0 text-sm">QRIS Static</span>
          <span class="font-mono text-xs break-all text-right text-emerald-600 dark:text-emerald-400"><i class="fa-solid fa-circle-check mr-1"></i>Terpasang</span>
        </div>
      {/if}
      {#if merchants.active?.gopay_merchant_id}
        <Row label="Merchant ID" val={merchants.active.gopay_merchant_id} />
      {/if}

      <label class="input-well px-4 py-3 flex items-center gap-3 cursor-pointer">
        <i class="fa-solid fa-image text-[var(--text-muted)]"></i>
        <span class="text-sm text-[var(--text-muted)]">{qrisImg ? 'Gambar dipilih — klik Upload untuk proses' : 'Pilih gambar QRIS static (PNG/JPG)'}</span>
        <input type="file" accept="image/*" class="hidden" onchange={onQrisFile} />
      </label>

      {#if qrisParsed}
        <div class="text-sm space-y-1 p-4 rounded-xl bg-[var(--bg-base)] shadow-[inset_4px_4px_8px_var(--inset-dark),inset_-4px_-4px_8px_var(--inset-light)]">
          <p class="flex justify-between"><span class="text-[var(--text-muted)]">Tipe</span><span class="font-semibold">{qrisParsed.type === 'static' ? 'Static' : 'Dinamis'}</span></p>
          <p class="flex justify-between"><span class="text-[var(--text-muted)]">Merchant</span><span class="font-mono text-xs">{qrisParsed.merchant_name || '—'}</span></p>
          <p class="flex justify-between"><span class="text-[var(--text-muted)]">Merchant ID</span><span class="font-mono text-xs">{qrisParsed.merchant_id || '—'}</span></p>
          <p class="flex justify-between"><span class="text-[var(--text-muted)]">Kota</span><span class="font-mono text-xs">{qrisParsed.city || '—'}</span></p>
        </div>
      {/if}

      <div class="flex gap-2">
        <button onclick={parseQrisImage} disabled={qrisBusy || !qrisImg} class="tactile-btn flex-1 py-4 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
          <i class="fa-solid fa-wand-magic-sparkles"></i> {qrisBusy ? 'Membaca...' : 'Baca QRIS'}
        </button>
        {#if qrisParsed}
          <button onclick={saveQrisStatic} class="tactile-btn flex-1 py-4 font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2">
            <i class="fa-solid fa-floppy-disk"></i> Simpan QRIS
          </button>
        {/if}
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
