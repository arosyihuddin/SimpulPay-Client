<script lang="ts">
  let merchants = $state([
    {
      id: '#M-1024', badge: 'Active', badgeCls: 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30',
      icon: 'fa-solid fa-bag-shopping', iconCls: 'text-emerald-600 dark:text-emerald-300', name: 'PT Toko Digital', prov: 'GoPay & BCA Gateway',
      vol: 'Rp 1.2B', tx: '14,280 tx', rate: '99.8%',
    },
    {
      id: '#M-1025', badge: 'Active', badgeCls: 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30',
      icon: 'fa-solid fa-shirt', iconCls: 'text-teal-600 dark:text-teal-300', name: 'Fashion Nusantara', prov: 'ShopeePay & QRIS',
      vol: 'Rp 850M', tx: '9,410 tx', rate: '99.5%',
    },
    {
      id: '#M-1026', badge: 'Reviewing', badgeCls: 'bg-amber-100/70 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/30',
      icon: 'fa-solid fa-mobile-screen', iconCls: 'text-amber-600 dark:text-amber-300', name: 'Gadget Online', prov: 'Mandiri VA & GoPay',
      vol: 'Rp 620M', tx: '6,120 tx', rate: '97.2%',
    },
  ]);

  // ---- Tambah Merchant (UI-only multi-step, ala mockup) ----
  const PROVIDERS = [
    { name: 'GoPay', icon: 'fa-solid fa-mobile-screen', cls: 'text-emerald-600 dark:text-emerald-400' },
    { name: 'ShopeePay', icon: 'fa-solid fa-bag-shopping', cls: 'text-orange-500' },
  ];
  let modalOpen = $state(false);
  let step = $state<'provider' | 'phone' | 'otp'>('provider');
  let provider = $state('');
  let phone = $state('');
  let err = $state('');

  function openAdd() { modalOpen = true; step = 'provider'; provider = ''; phone = ''; err = ''; }
  function next() { step = 'phone'; err = ''; }
  function sendOtp() {
    if (!phone || phone.length < 9) { err = 'Nomor HP tidak valid (min 9 digit).'; return; }
    step = 'otp'; err = '';
  }
  function verify() {
    const newM = {
      id: `#M-${1000 + merchants.length + 24}`,
      badge: 'Active', badgeCls: 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30',
      icon: 'fa-solid fa-store', iconCls: 'text-emerald-600 dark:text-emerald-300',
      name: `Toko Baru ${provider}`, prov: `${provider} Merchant`,
      vol: 'Rp 0', tx: '0 tx', rate: '100%',
    };
    merchants = [newM, ...merchants];
    modalOpen = false;
  }
</script>

<div class="space-y-6">
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4">
    <button onclick={openAdd} class="tactile-btn px-5 py-2.5 font-bold text-[var(--accent)] flex items-center gap-2">
      <i class="fa-solid fa-plus"></i> Tambah Merchant
    </button>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each merchants as m (m.id)}
      <div class="tactile-box p-5 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider {m.badgeCls}">{m.badge}</span>
            <span class="text-xs text-[var(--text-muted)] font-bold">{m.id}</span>
          </div>
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-12 h-12 rounded-2xl bg-emerald-100/70 dark:bg-emerald-900/40 flex items-center justify-center tactile-inset">
              <i class="{m.icon} {m.iconCls} text-lg"></i>
            </div>
            <div>
              <h4 class="font-bold">{m.name}</h4>
              <p class="text-xs text-[var(--text-muted)] font-bold">{m.prov}</p>
            </div>
          </div>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between py-1 border-b border-[var(--border-subtle)]">
              <span class="text-[var(--text-muted)] font-bold">Volume Bulanan</span>
              <span class="font-bold">{m.vol}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-[var(--border-subtle)]">
              <span class="text-[var(--text-muted)] font-bold">Total Transaksi</span>
              <span class="font-bold text-emerald-600 dark:text-emerald-400">{m.tx}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-[var(--text-muted)] font-bold">Success Rate</span>
              <span class="font-bold text-emerald-600 dark:text-emerald-400">{m.rate}</span>
            </div>
          </div>
        </div>
        <button class="tactile-btn w-full mt-4 py-2.5 text-[var(--accent)] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-gear"></i> Kelola Gateway
        </button>
      </div>
    {/each}
  </div>
</div>

<!-- Tambah Merchant modal -->
{#if modalOpen}
  <div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={() => (modalOpen = false)}></button>
    <div class="tactile-modal w-full max-w-lg p-6 relative z-50">
      <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
        <h3 class="text-lg font-bold">
          {#if step === 'provider'}Tambah Merchant Baru
          {:else if step === 'phone'}Daftar {provider}
          {:else}Verifikasi OTP {provider}{/if}
        </h3>
        <button type="button" aria-label="Tutup" onclick={() => (modalOpen = false)} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
      </div>

      {#if err}<p class="text-xs font-semibold text-red-500 mb-3">{err}</p>{/if}

      {#if step === 'provider'}
        <div class="space-y-4">
          <p class="text-xs font-bold text-[var(--text-muted)]">Pilih channel e-wallet atau akun gateway merchant yang ingin dihubungkan:</p>
          <div class="grid grid-cols-2 gap-4 pt-2">
            {#each PROVIDERS as p (p.name)}
              <button
                onclick={() => { provider = p.name; next(); }}
                class="tactile-box p-4 text-center cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center {p.cls}"><i class="{p.icon} text-lg"></i></div>
                <span class="font-bold text-sm">{p.name} Merchant</span>
                <span class="text-[10px] text-[var(--text-muted)] font-bold">Instant QR & Wallet API</span>
              </button>
            {/each}
          </div>
        </div>
      {:else if step === 'phone'}
        <div class="space-y-4">
          <div class="p-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
            <i class="fa-solid fa-circle-info flex-shrink-0"></i>
            <span>Pastikan nomor handphone terdaftar pada akun bisnis {provider} Anda.</span>
          </div>
          <div>
            <label for="merchant-phone" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Nomor WhatsApp / HP ({provider})</label>
            <div class="flex items-center">
              <span class="bg-slate-200/60 dark:bg-slate-800 text-sm font-bold px-3 py-2.5 rounded-l-xl border border-r-0 border-[var(--border-subtle)]">+62</span>
              <input id="merchant-phone" type="number" bind:value={phone} placeholder="81234567890" class="w-full tactile-inset px-4 py-2.5 rounded-l-none text-sm focus:outline-none" />
            </div>
          </div>
          <button onclick={sendOtp} class="tactile-btn w-full py-3 font-bold text-[var(--accent)]">Kirim Kode OTP</button>
        </div>
      {:else}
        <div class="space-y-4 text-center">
          <p class="text-xs font-bold text-[var(--text-muted)]">Kode OTP 6-digit telah dikirimkan via SMS/WhatsApp ke nomor <strong>+62{phone}</strong>.</p>
          <div class="flex justify-center gap-2 py-2">
            {#each Array.from({ length: 6 }) as _, i}
              <input type="text" maxlength="1" value={[4, 8, 9, 1, 2, 0][i]} class="w-12 h-12 text-center text-lg font-bold tactile-inset outline-none" aria-label="Digit OTP {i + 1}" />
            {/each}
          </div>
          <button onclick={verify} class="tactile-btn w-full py-3 font-bold text-[var(--accent)]">Verifikasi & Hubungkan Merchant</button>
        </div>
      {/if}
    </div>
  </div>
{/if}
