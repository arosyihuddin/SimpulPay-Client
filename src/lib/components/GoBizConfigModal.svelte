<script lang="ts">
  import { admin } from '$lib/api';
  import { addToast } from '$lib/toast.svelte';

  let { merchantId, merchantName, hasLogin, onClose, onDone } = $props();

  let err = $state('');

  // step: 'phone' | 'otp' = login dulu; 'qris' = lanjut konfigurasi QRIS.
  let step = $state<'phone' | 'otp' | 'qris'>('phone');
  $effect(() => { if (hasLogin) step = 'qris'; });

  // Login GoBiz
  let phone = $state('');
  let otpToken = $state('');
  let uniqueId = $state('');
  let otp = $state('');
  let otpBusy = $state(false);
  let resendTimer = $state(0);
  let resendInterval: ReturnType<typeof setInterval> | undefined;
  // Input OTP 4 kotak terpisah — tiap kotak 1 digit.
  let otpRefs = $state<(HTMLInputElement | null)[]>([]);

  function startResendTimer() {
    resendTimer = 30;
    clearInterval(resendInterval);
    resendInterval = setInterval(() => {
      resendTimer--;
      if (resendTimer <= 0) {
        clearInterval(resendInterval);
        resendInterval = undefined;
      }
    }, 1000);
  }
  $effect(() => {
    if (step !== 'otp') {
      clearInterval(resendInterval);
      resendInterval = undefined;
      return;
    }
    startResendTimer();
    return () => clearInterval(resendInterval);
  });

  function onOtpInput(i: number, e: Event) {
    const el = e.target as HTMLInputElement;
    el.value = el.value.replace(/\D/g, '').slice(0, 1);
    otp = otpRefs.map((r) => r?.value || '').join('');
    // Pindah fokus ke kotak berikutnya; kalau digit 4 terisi → auto verify.
    if (el.value && i < 3) otpRefs[i + 1]?.focus();
    else if (otp.length === 4) verifyOtp();
  }
  function onOtpKeydown(i: number, e: KeyboardEvent) {
    if (e.key === 'Backspace' && !otpRefs[i]?.value && i > 0) otpRefs[i - 1]?.focus();
  }
  async function resendOtp() {
    if (resendTimer > 0 || otpBusy) return;
    otpBusy = true; err = '';
    try {
      const res = await admin.otpRequest(merchantId, phone);
      otpToken = res.data.otp_token; uniqueId = res.data.unique_id;
      otp = ''; otpRefs.forEach((r) => { if (r) r.value = ''; });
      otpRefs[0]?.focus();
      startResendTimer();
      addToast('info', `OTP dikirim ulang ke ${phone}`);
    } catch (e: any) { err = e.message; }
    finally { otpBusy = false; }
  }

  // Konfigurasi QRIS static
  let qrisImg = $state<string | null>(null);
  let qrisParsed = $state<any | null>(null);
  let qrisBusy = $state(false);

  async function requestOtp(e: SubmitEvent) {
    e.preventDefault(); otpBusy = true; err = '';
    try {
      const res = await admin.otpRequest(merchantId, phone);
      otpToken = res.data.otp_token; uniqueId = res.data.unique_id; step = 'otp'; addToast('info', `OTP dikirim ke ${phone}`);
    } catch (e: any) { err = e.message; }
    finally { otpBusy = false; }
  }

  async function verifyOtp(e?: SubmitEvent) {
    e?.preventDefault(); otpBusy = true; err = '';
    try {
      const res = await admin.otpVerify(merchantId, phone, otp, otpToken, uniqueId);
      addToast('success', `Login GoBiz sukses: ${res.data.outlet_name} (${res.data.phone_number})`);
      step = 'qris'; phone = ''; otp = ''; otpToken = ''; uniqueId = '';
      onDone?.();
    } catch (e: any) { err = e.message; }
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
    try { const res = await admin.parseQrisImage(qrisImg, merchantId); qrisParsed = res.data; addToast('info', `QRIS terbaca: ${res.data.merchant_name || res.data.merchant_id || 'merchant'}`); onDone?.(); }
    catch (e: any) { err = e.message; }
    finally { qrisBusy = false; }
  }
</script>

<div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
  <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={onClose}></button>
  <div class="tactile-modal w-full max-w-lg p-6 relative z-50 max-h-[90vh] overflow-y-auto">
    <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
      <h3 class="text-lg font-bold"><i class="fa-solid fa-store text-[var(--accent)] mr-2"></i>Konfigurasi {merchantName}</h3>
      <button type="button" aria-label="Tutup" onclick={onClose} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
    </div>

    {#if err}<p class="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-4">{err}</p>{/if}

    {#if step === 'qris'}
      <!-- Konfigurasi QRIS -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Konfigurasi QRIS</h3>
          {#if hasLogin}
            <button onclick={() => { step = 'phone'; qrisParsed = null; qrisImg = null; }} class="text-xs font-bold text-[var(--accent)] flex items-center gap-1">
              <i class="fa-solid fa-rotate"></i> Login Ulang
            </button>
          {/if}
        </div>
        <p class="text-xs text-[var(--text-muted)]">Upload gambar QRIS static dari merchant GoBiz. Dipakai bikin QR dinamis.</p>

        {#if !qrisParsed}
          <label class="input-well px-4 py-3 flex items-center gap-3 cursor-pointer">
            <i class="fa-solid fa-image text-[var(--text-muted)]"></i>
            <span class="text-sm text-[var(--text-muted)]">{qrisImg ? 'Gambar dipilih — klik Ekstrak untuk proses' : 'Pilih gambar QRIS static (PNG/JPG)'}</span>
            <input type="file" accept="image/*" class="hidden" onchange={onQrisFile} />
          </label>

          <button onclick={parseQrisImage} disabled={qrisBusy || !qrisImg} class="tactile-btn w-full py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
            <i class="fa-solid fa-wand-magic-sparkles"></i> {qrisBusy ? 'Mengekstrak...' : 'Ekstrak QRIS'}
          </button>
        {:else}
          <div class="text-sm space-y-1 p-4 rounded-xl bg-[var(--bg-base)] shadow-[inset_4px_4px_8px_var(--inset-dark),inset_-4px_-4px_8px_var(--inset-light)]">
            <p class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold mb-2"><i class="fa-solid fa-circle-check"></i> QRIS static tersimpan otomatis</p>
            <p class="flex justify-between"><span class="text-[var(--text-muted)]">Tipe</span><span class="font-semibold">{qrisParsed.type === 'static' ? 'Static' : 'Dinamis'}</span></p>
            <p class="flex justify-between"><span class="text-[var(--text-muted)]">Merchant</span><span class="font-mono text-xs">{qrisParsed.merchant_name || '—'}</span></p>
            <p class="flex justify-between"><span class="text-[var(--text-muted)]">Merchant ID</span><span class="font-mono text-xs">{qrisParsed.merchant_id || '—'}</span></p>
            <p class="flex justify-between"><span class="text-[var(--text-muted)]">Kota</span><span class="font-mono text-xs">{qrisParsed.city || '—'}</span></p>
          </div>
          <button onclick={() => { qrisParsed = null; qrisImg = null; }} class="tactile-btn w-full py-2.5 text-xs font-bold text-[var(--text-muted)] rounded-xl">Ekstrak QRIS lain</button>
        {/if}
      </div>
    {:else}
      <!-- Login GoBiz -->
      <div class="space-y-3">
        <h3 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Login GoBiz</h3>
        <p class="text-xs text-[var(--text-muted)]">Verifikasi nomor HP yang terdaftar di GoBiz untuk mengakses API transaksi GoPay.</p>
        {#if step === 'phone'}
          <form onsubmit={requestOtp} class="space-y-3">
            <div class="input-well px-4 py-3 flex items-center">
              <i class="fa-solid fa-phone text-[var(--text-muted)] mr-3"></i>
              <input type="tel" inputmode="numeric" oninput={(e) => (phone = (e.currentTarget.value).replace(/\D/g, ''))} value={phone} placeholder="Nomor HP (contoh: 085119772671)" class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]" />
            </div>
            <button disabled={otpBusy} class="tactile-btn w-full py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
              <i class="fa-solid fa-paper-plane"></i> {otpBusy ? 'Mengirim...' : 'Kirim OTP'}
            </button>
          </form>
        {:else}
          <form onsubmit={verifyOtp} class="space-y-3">
            <p class="text-sm text-[var(--text-main)]">OTP dikirim ke {phone}</p>
            <button type="button" onclick={() => { step = 'phone'; otp = ''; }} class="text-[11px] text-[var(--text-muted)] underline hover:text-[var(--accent)] cursor-pointer">Bukan nomor ini? Ganti nomor</button>
            <!-- 4 kotak OTP — auto-submit saat 4 digit terisi -->
            <div class="flex gap-2 justify-center">
              {#each Array.from({ length: 4 }) as _, i}
                <input
                  bind:this={otpRefs[i]}
                  type="text"
                  inputmode="numeric"
                  maxlength="1"
                  autocomplete="one-time-code"
                  oninput={(e) => onOtpInput(i, e)}
                  onkeydown={(e) => onOtpKeydown(i, e)}
                  class="w-12 h-14 text-center text-xl font-extrabold tactile-inset focus:outline-none"
                />
              {/each}
            </div>
            <div class="flex gap-2 items-center justify-center text-xs">
              {#if resendTimer > 0}
                <span class="text-[var(--text-muted)] font-semibold">Kirim ulang dalam {resendTimer}s</span>
              {:else}
                <button type="button" onclick={resendOtp} disabled={otpBusy} class="text-[var(--accent)] font-bold flex items-center gap-1">
                  <i class="fa-solid fa-rotate"></i> Kirim Ulang OTP
                </button>
              {/if}
            </div>
            <button type="submit" disabled={otpBusy || otp.length !== 4} class="tactile-btn w-full py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
              <i class="fa-solid fa-check"></i> {otpBusy ? 'Verifikasi...' : 'Verifikasi OTP'}
            </button>
          </form>
        {/if}
      </div>
    {/if}
  </div>
</div>
