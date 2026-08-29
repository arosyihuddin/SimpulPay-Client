<script lang="ts">
  import { onMount } from 'svelte';
  import { admin } from '$lib/api';
  import Row from '$lib/components/Row.svelte';

  interface SettingsData {
    port: string; api_key_set: boolean; api_key_masked: string; api_key: string;
    qris_static_set: boolean; qris_static_masked: string; gopay_merchant_id: string;
    gobiz_session_exists: boolean; database_path: string;
  }

  let s = $state<SettingsData | null>(null);
  let err = $state('');
  let msg = $state('');
  const displayUser = $state(typeof localStorage !== 'undefined' ? localStorage.getItem('gomerch_username') || '' : '');

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

  async function load() {
    admin.settings().then((d) => (s = d.data)).catch((e) => (err = e.message));
  }
  onMount(() => { load(); });

  async function requestOtp(e: SubmitEvent) {
    e.preventDefault(); otpBusy = true; err = '';
    try {
      const res = await admin.otpRequest(phone);
      otpToken = res.data.otp_token; uniqueId = res.data.unique_id; step = 'otp'; msg = `OTP dikirim ke ${phone}`;
    } catch (e: any) { err = e.message; }
    finally { otpBusy = false; }
  }

  async function verifyOtp(e: SubmitEvent) {
    e.preventDefault(); otpBusy = true; err = '';
    try {
      const res = await admin.otpVerify(phone, otp, otpToken, uniqueId);
      msg = `Login GoBiz sukses: ${res.data.outlet_name} (${res.data.phone_number})`;
      step = 'phone'; phone = ''; otp = ''; otpToken = ''; uniqueId = ''; load();
    } catch (e: any) { err = e.message; }
    finally { otpBusy = false; }
  }

  async function refreshGoBiz() {
    otpBusy = true; err = '';
    try { const res = await admin.refreshSession(); msg = `Sesi GoBiz di-refresh, berlaku hingga ${res.data.expires_at}`; }
    catch (e: any) { err = e.message; }
    finally { otpBusy = false; }
  }

  async function deleteGoBiz() {
    if (!confirm('Hapus sesi GoBiz? Login OTP ulang diperlukan.')) return;
    otpBusy = true; err = '';
    try { await admin.deleteGoBizSession(); msg = 'Sesi GoBiz dihapus. Login OTP ulang untuk akses transaksi.'; step = 'phone'; load(); }
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
    try { const res = await admin.parseQrisImage(qrisImg); qrisParsed = res.data; msg = `QRIS terbaca: ${res.data.merchant_name || res.data.merchant_id || 'merchant'}`; }
    catch (e: any) { err = e.message; }
    finally { qrisBusy = false; }
  }

  async function saveQrisStatic() {
    if (!qrisParsed) return;
    qrisBusy = true; err = '';
    try {
      await admin.saveQrisStatic(qrisParsed.code);
      if (qrisParsed.merchant_id) await admin.saveMerchantId(qrisParsed.merchant_id).catch(() => {});
      msg = 'QRIS static & merchant ID tersimpan. QR dinamis sekarang bisa dibuat.';
      qrisParsed = null; qrisImg = null; load();
    } catch (e: any) { err = e.message; }
    finally { qrisBusy = false; }
  }

  async function regenKey() {
    if (s?.api_key_set && !confirm('Regenerate API key? Aplikasi lama pakai key lama akan gagal.')) return;
    err = '';
    try { const res = await admin.generateApiKey('generate'); msg = `API key baru dibuat: ${res.data.api_key}`; load(); }
    catch (e: any) { err = e.message; }
  }

  async function delKey() {
    if (!confirm('Hapus API key? Endpoint publik akan mati.')) return;
    err = '';
    try { await admin.generateApiKey('delete'); msg = 'API key dihapus.'; load(); }
    catch (e: any) { err = e.message; }
  }

  async function logout() {
    await admin.logout().catch(() => {});
    location.href = '/';
  }
</script>

<div class="space-y-6">
  {#if err}<p class="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-2xl px-4 py-3"><i class="fa-solid fa-circle-exclamation mr-2"></i>{err}</p>{/if}
  {#if msg}<p class="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/30 rounded-2xl px-4 py-3"><i class="fa-solid fa-circle-check mr-2"></i>{msg}</p>{/if}

  <!-- SECTION USER -->
  <section class="tactile-box p-5 space-y-4">
    <div class="flex items-center gap-2">
      <i class="fa-solid fa-user text-[var(--accent)]"></i>
      <div><h2 class="font-semibold">User</h2><p class="text-xs text-[var(--text-muted)]">Kredensial & keamanan akun admin</p></div>
    </div>

    <Row label="Username" val={displayUser || '—'} />

    <a href="/admin/settings/password" class="tactile-btn w-full py-3 text-xs font-bold text-[var(--accent)] flex items-center justify-center gap-2">
      <i class="fa-solid fa-key"></i> Ganti Password
    </a>

    <div class="border-t border-[var(--border-subtle)] pt-4 space-y-2.5">
      <h3 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">API Key</h3>
      <Row label="API Key Publik" val={s?.api_key_set ? s.api_key_masked : '—'} />
      <div class="flex gap-2">
        <button onclick={regenKey} class="tactile-btn flex-1 py-3 text-xs font-bold text-[var(--accent)] flex items-center justify-center gap-2">
          <i class="fa-solid fa-rotate"></i> {s?.api_key_set ? 'Regenerate' : 'Generate API Key'}
        </button>
        {#if s?.api_key_set}
          <button onclick={delKey} aria-label="Hapus API Key" class="tactile-btn px-4 py-3 text-xs font-bold text-red-500 flex items-center justify-center gap-2"><i class="fa-solid fa-trash-can"></i></button>
        {/if}
      </div>
    </div>
  </section>

  <!-- SECTION MERCHANT -->
  <section class="tactile-box p-5 space-y-4">
    <div class="flex items-center gap-2">
      <i class="fa-solid fa-store text-[var(--accent)]"></i>
      <div><h2 class="font-semibold">Merchant</h2><p class="text-xs text-[var(--text-muted)]">Login GoBiz, QRIS, dan identitas merchant</p></div>
    </div>

    {#if !s?.gobiz_session_exists}
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
              <button onclick={() => { step = 'phone'; otp = ''; msg = ''; }} class="tactile-btn px-5 py-3 text-sm text-[var(--text-muted)]">Batal</button>
            </div>
          </form>
        {/if}
      </div>
    {:else}
      <div class="space-y-3">
        <p class="text-xs text-[var(--text-muted)]">Token berlaku 24 jam, auto-refresh handled backend.</p>
        <Row label="Sesi GoBiz" val="Aktif" />
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

      {#if s?.qris_static_set}
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)] shrink-0 text-sm">QRIS Static</span>
          <span class="font-mono text-xs break-all text-right text-emerald-600 dark:text-emerald-400"><i class="fa-solid fa-circle-check mr-1"></i>Terpasang ({s.qris_static_masked}...)</span>
        </div>
      {/if}
      {#if s?.gopay_merchant_id}
        <Row label="Merchant ID" val={s.gopay_merchant_id} />
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

  <!-- INFO SERVER (read-only) -->
  <div class="tactile-box p-5 space-y-2">
    <div class="flex items-center gap-2">
      <i class="fa-solid fa-server text-[var(--text-muted)]"></i>
      <h2 class="font-semibold">Info Server <span class="text-[10px] text-[var(--text-muted)] font-normal">(read-only)</span></h2>
    </div>
    {#if s}
      <div class="text-sm space-y-2">
        <Row label="Port" val={s.port} />
        <Row label="Database" val={s.database_path} />
      </div>
    {/if}
  </div>

  <!-- Mobile only — developer & logout -->
  <div class="lg:hidden tactile-box p-5 space-y-2.5">
    <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-arrow-right-from-bracket text-[var(--accent)]"></i> Akun</h2>
    <a href="/admin/developer" class="tactile-btn flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-[var(--text-muted)]">
      <i class="fa-solid fa-code w-5"></i><span>Developer API</span>
    </a>
    <button onclick={logout} class="tactile-btn flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-red-500 w-full">
      <i class="fa-solid fa-right-from-bracket w-5"></i><span>Logout</span>
    </button>
  </div>
</div>