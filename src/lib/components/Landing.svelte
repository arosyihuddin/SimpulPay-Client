<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Logo from "$lib/components/Logo.svelte";
  import { auth, readAuthHint } from "$lib/auth.svelte";
  import { theme, toggleTheme } from "$lib/theme.svelte";
  import { API_BASE } from "$lib/api";

  // Landing public — harga dari /public/plans, fallback PLANS statis bila API mati/maintenance.

  let menuOpen = $state(false);
  // Penanda login terakhir (localStorage) — tanpa call /me biar kebal maintenance.
  const hintAuthed = readAuthHint();
  const go = (p: string) => {
    menuOpen = false;
    goto(p);
  };

  const FEATURES = [
    {
      icon: "fa-solid fa-qrcode",
      title: "QRIS Dinamis & Statis",
      desc: "Buat kode QR otomatis untuk setiap transaksi. Kode unik anti-salah-bayar, kadaluwarsa otomatis.",
    },
    {
      icon: "fa-solid fa-key",
      title: "API Key Aman",
      desc: "Integrasi aplikasi kamu lewat API key dengan scope terpisah. Buat & cabut kapan saja.",
    },
    {
      icon: "fa-solid fa-bolt",
      title: "Webhook Realtime",
      desc: "Notifikasi status transaksi langsung ke server kamu. Sukses, kadaluwarsa, atau pending — semua realtime.",
    },
    {
      icon: "fa-solid fa-receipt",
      title: "Transaksi & Laporan",
      desc: "Pantau semua transaksi semua merchant. Riwayat lengkap dengan status dan filter.",
    },
    {
      icon: "fa-solid fa-credit-card",
      title: "Billing & Usage",
      desc: "Pantau pemakaian merchant dan limit transaksi bulanan. Upgrade plan cukup satu klik.",
    },
    {
      icon: "fa-solid fa-shield-halved",
      title: "Keamanan Berlapis",
      desc: "Setiap transaksi punya kode unik, token aman, dan mode maintenance untuk kontrol penuh.",
    },
  ];

  const STEPS = [
    {
      num: "01",
      icon: "fa-solid fa-user-plus",
      title: "Buat Akun",
      desc: "Daftar dan login ke dashboard SimpulPay. Mulai pakai paket gratis tanpa kartu.",
    },
    {
      num: "02",
      icon: "fa-solid fa-store",
      title: "Daftarkan Merchant",
      desc: "Tambahkan channel e-wallet & merchant kamu. Atur limit dan merchant sejak awal.",
    },
    {
      num: "03",
      icon: "fa-solid fa-circle-dollar-to-slot",
      title: "Terima Pembayaran",
      desc: "Bagikan QRIS ke pelanggan. Dana masuk realtime, laporan rapi di dashboard.",
    },
  ];

  const PLAN_FEATURES = ["Qris Dinamis", "Sandbox", "Webhook Realtime", "Api Key"];

  interface LandingPlan {
    name: string;
    price: string;
    suffix: string;
    cls: string;
    featured: boolean;
    features: string[];
  }

  const PLANS: LandingPlan[] = [
    { name: "Free", price: "0", suffix: "selamanya", cls: "", featured: false, features: ["1 merchant", "10 transaksi/hari", ...PLAN_FEATURES] },
    { name: "Starter", price: "49rb", suffix: "/ bulan", cls: "ring-2 ring-[var(--accent)]", featured: true, features: ["3 merchant", "100 transaksi/hari", ...PLAN_FEATURES] },
    { name: "Pro", price: "149rb", suffix: "/ bulan", cls: "", featured: false, features: ["Merchant unlimited", "Transaksi tanpa batas", ...PLAN_FEATURES] },
  ];

  // Harga dinamis dari API — fallback ke PLANS statis bila gagal.
  interface ApiPlan {
    name: string;
    type: string;
    price: number;
    max_merchants: number;
    daily_paid_limit: number | null;
    features_json: string | null;
    is_featured: boolean;
  }
  const parseApiFeatures = (j: string | null): string[] => {
    if (!j) return [];
    try {
      const v: unknown = JSON.parse(j);
      if (Array.isArray(v)) return v.map(String);
      if (typeof v === "object" && v !== null)
        return Object.keys(v).map((k) =>
          k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        );
    } catch {}
    return [];
  };
  const toLanding = (p: ApiPlan): LandingPlan => {
    const featured = p.is_featured === true;
    const feats = parseApiFeatures(p.features_json);
    return {
      name: p.name,
      price: p.price <= 0 ? "0" : p.price.toLocaleString("id-ID"),
      suffix: p.price <= 0 ? "selamanya" : "/ bulan",
      cls: featured ? "ring-2 ring-[var(--accent)]" : "",
      featured,
      features: [`${p.max_merchants} merchant`, p.daily_paid_limit == null ? "Transaksi tanpa batas" : `${p.daily_paid_limit} transaksi/hari`, ...feats],
    };
  };
  let displayPlans = $state<LandingPlan[]>(PLANS);
  onMount(async () => {
    try {
      const r = await fetch(`${API_BASE}/public/plans`);
      if (!r.ok) return;
      const j: unknown = await r.json();
      const rows = (j as { data?: { plans?: unknown } })?.data?.plans;
      if (!Array.isArray(rows) || rows.length === 0) return;
      displayPlans = (rows as ApiPlan[]).map(toLanding);
    } catch {}
  });

  const FAQS = [
    {
      q: "Apa itu SimpulPay?",
      a: "SimpulPay adalah payment gateway berbasis QRIS untuk memudahkan kamu menerima pembayaran digital tanpa perlu mengurus sertifikasi dan fitur payment sendiri. Cukup daftarkan merchant dan integrasikan lewat API.",
    },
    {
      q: "Apakah QRIS bisa langsung saya pakai?",
      a: "Ya. Setelah merchant kamu terdaftar dan memilih plan, kamu langsung bisa membuat QRIS dinamis. Cukup scan-bar temanmu yang bayar, dana masuk ke rekening.",
    },
    {
      q: "Bagaimana cara integrasi webhook?",
      a: "Masuk ke menu Developer → Webhook. Isi URL endpoint kamu, dan SimpulPay akan mengirim notifikasi status transaksi secara realtime saat ada pembayaran.",
    },
    {
      q: "Bisakah upgrade/downgrade plan?",
      a: "Bisa, kapan saja dari menu Billing & Usage. Upgrade langsung aktif setelah invoice dibayar; tagihan prorata dihitung otomatis oleh sistem.",
    },
  ];

  // Grid pseudo-QR (deterministik) buat visual mock card.
  const QR = Array.from({ length: 20 }, (_, y) =>
    Array.from({ length: 20 }, (_, x) => {
      const corner = (cx: number, cy: number) =>
        x >= cx && x <= cx + 6 && y >= cy && y <= cy + 6
          ? x === cx ||
            x === cx + 6 ||
            y === cy ||
            y === cy + 6 ||
            (x >= cx + 2 && x <= cx + 4 && y >= cy + 2 && y <= cy + 4)
          : false;
      const main = corner(0, 0) || corner(13, 0) || corner(0, 13);
      if (main) return true;
      return (x * 7 + y * 3 + x * y) % 5 < 2;
    }),
  );
</script>

<svelte:head>
  <title>SimpulPay — Payment Gateway QRIS</title>
</svelte:head>

<div class="min-h-screen flex flex-col">
  <!-- ===== NAVBAR ===== -->
  <nav
    class="sticky top-0 z-40 backdrop-blur-md border-b border-[var(--border-subtle)]/60"
    style="background: color-mix(in srgb, var(--bg-base) 80%, transparent)"
  >
    <div
      class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3"
    >
      <a href="/" class="flex items-center gap-3">
        <div
          class="tactile-btn w-10 h-10 flex items-center justify-center text-[var(--accent)]"
        >
          <Logo />
        </div>
        <span class="font-extrabold text-lg tracking-wide"
          >Simpul<span class="text-[var(--accent)]">Pay</span></span
        >
      </a>

      <div
        class="hidden md:flex items-center gap-6 text-sm font-semibold text-[var(--text-muted)]"
      >
        <a href="#fitur" class="hover:text-[var(--accent)] transition-colors"
          >Fitur</a
        >
        <a href="#cara" class="hover:text-[var(--accent)] transition-colors"
          >Cara Kerja</a
        >
        <a href="#harga" class="hover:text-[var(--accent)] transition-colors"
          >Harga</a
        >
        <a href="#faq" class="hover:text-[var(--accent)] transition-colors"
          >FAQ</a
        >
      </div>

      <div class="flex items-center gap-2">
        <button
          onclick={toggleTheme}
          class="tactile-btn w-10 h-10 flex items-center justify-center text-[var(--text-muted)]"
          title="Ganti Tema"
          aria-label="Ganti tema"
        >
          <i class={theme.dark ? "fa-solid fa-sun" : "fa-solid fa-moon"}></i>
        </button>
        {#if auth.authed || hintAuthed}
          <button
            onclick={() => go("/dashboard")}
            class="tactile-btn w-10 h-10 flex items-center justify-center text-[var(--accent)]"
            title="Dashboard"
            aria-label="Dashboard"
          >
            <i class="fa-solid fa-user"></i>
          </button>
        {:else}
          <button
            onclick={() => go("/login")}
            class="tactile-btn px-4 py-2 text-sm font-bold text-[var(--text-muted)]"
            >Masuk</button
          >
          <a
            href="/login"
            class="hidden md:inline-flex px-4 py-2 text-sm font-bold text-white rounded-xl bg-[var(--accent)] shadow-[3px_3px_6px_var(--shadow-dark),-3px_-3px_6px_var(--shadow-light)] hover:opacity-90 transition"
            >Daftar</a
          >
        {/if}
        <button
          class="md:hidden tactile-btn w-10 h-10 flex items-center justify-center text-[var(--text-muted)]"
          onclick={() => (menuOpen = !menuOpen)}
          aria-label="Buka menu"
        >
          <i class="fa-solid {menuOpen ? 'fa-xmark' : 'fa-bars'}"></i>
        </button>
      </div>
    </div>

    {#if menuOpen}
      <div class="md:hidden border-t border-[var(--border-subtle)]/60">
        <div
          class="max-w-6xl mx-auto px-4 py-3 space-y-1 text-sm font-semibold"
        >
          <a
            href="#fitur"
            onclick={() => (menuOpen = false)}
            class="block py-2.5 text-[var(--text-muted)] hover:text-[var(--accent)]"
            >Fitur</a
          >
          <a
            href="#cara"
            onclick={() => (menuOpen = false)}
            class="block py-2.5 text-[var(--text-muted)] hover:text-[var(--accent)]"
            >Cara Kerja</a
          >
          <a
            href="#harga"
            onclick={() => (menuOpen = false)}
            class="block py-2.5 text-[var(--text-muted)] hover:text-[var(--accent)]"
            >Harga</a
          >
          <a
            href="#faq"
            onclick={() => (menuOpen = false)}
            class="block py-2.5 text-[var(--text-muted)] hover:text-[var(--accent)]"
            >FAQ</a
          >
        </div>
      </div>
    {/if}
  </nav>

  <!-- ===== HERO ===== -->
  <header
    class="max-w-6xl mx-auto w-full px-4 pt-14 pb-16 md:pt-20 md:pb-24 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center"
  >
    <div>
      <span
        class="tactile-pill pill-green px-3 py-1.5 text-xs font-bold inline-flex items-center gap-2"
      >
        <i class="fa-solid fa-bolt"></i> Payment Gateway berbasis QRIS
      </span>
      <h1 class="text-4xl md:text-5xl font-extrabold leading-tight mt-5">
        Terima pembayaran QRIS<br class="hidden md:block" />
        <span class="text-[var(--accent)]">cepat & tanpa repot</span>
      </h1>
      <p
        class="text-base md:text-lg text-[var(--text-muted)] mt-5 leading-relaxed max-w-xl"
      >
        SimpulPay menghubungkan aplikasi kamu ke ekosistem pembayaran QRIS.
        Kelola merchant, pantau transaksi realtime, dan atur billing dalam satu
        dashboard yang rapi.
      </p>
      <div class="flex flex-wrap gap-3 mt-8">
        <a
          href="/login"
          class="px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-[var(--accent)] shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] hover:opacity-90 transition inline-flex items-center gap-2"
        >
          <i class="fa-solid fa-rocket"></i> Mulai Sekarang
        </a>
        <a
          href="#harga"
          class="tactile-btn px-6 py-3.5 text-sm font-bold text-[var(--text-muted)] inline-flex items-center gap-2"
        >
          Lihat Harga <i class="fa-solid fa-arrow-down"></i>
        </a>
      </div>
      <div
        class="flex flex-wrap gap-6 mt-10 text-sm text-[var(--text-muted)] font-medium"
      >
        <span class="flex items-center gap-2"
          ><i class="fa-solid fa-circle-check text-[var(--accent)]"></i> Realtime
          webhook</span
        >
        <span class="flex items-center gap-2"
          ><i class="fa-solid fa-circle-check text-[var(--accent)]"></i> API key
          aman</span
        >
        <span class="flex items-center gap-2"
          ><i class="fa-solid fa-circle-check text-[var(--accent)]"></i> Tanpa sertifikasi
          ribet</span
        >
      </div>
    </div>

    <!-- Mock QR card -->
    <div class="relative">
      <div class="tactile-box p-6 max-w-sm mx-auto">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2.5">
            <div
              class="tactile-btn w-9 h-9 flex items-center justify-center text-[var(--accent)]"
            >
              <Logo />
            </div>
            <div>
              <p class="font-bold text-sm leading-tight">SimpulPay QRIS</p>
              <p class="text-[10px] text-[var(--text-muted)]">
                Dynamic Transaction
              </p>
            </div>
          </div>
          <span
            class="tactile-pill pill-amber text-[10px] font-bold px-2.5 py-1"
            >MENUNGGU</span
          >
        </div>
        <div class="tactile-inset p-4">
          <div
            class="grid gap-px aspect-square bg-[var(--inset-dark)]/40 p-2 rounded-lg"
            style="grid-template-columns: repeat(20, minmax(0, 1fr))"
          >
            {#each QR as row, y}
              {#each row as on, x}
                <div
                  class="{on
                    ? 'bg-[var(--text-main)]'
                    : 'bg-transparent'} rounded-[1px]"
                ></div>
              {/each}
            {/each}
          </div>
        </div>
        <div class="mt-4 space-y-1.5 text-sm">
          <div class="flex justify-between">
            <span class="text-xs text-[var(--text-muted)]">Kode Unik</span>
            <span class="font-bold text-[var(--accent)]">123</span>
          </div>
          <div class="flex justify-between">
            <span class="text-xs text-[var(--text-muted)]">Total Dibayar</span>
            <span class="font-extrabold">Rp 1.234.000</span>
          </div>
        </div>
      </div>
      <!-- Decorative bubble -->
      <div
        class="absolute -top-5 -right-2 md:-right-6 tactile-pill pill-green px-4 py-2 text-xs font-bold rotate-3 shadow-lg"
      >
        <i class="fa-solid fa-shield-halved mr-1.5"></i> Anti salah-bayar
      </div>
    </div>
  </header>

  <!-- ===== FITUR ===== -->
  <section id="fitur" class="w-full border-t border-[var(--border-subtle)]/60">
    <div class="max-w-6xl mx-auto px-4 py-16 md:py-24">
      <div class="text-center max-w-2xl mx-auto">
        <span class="tactile-pill pill-violet px-3 py-1.5 text-xs font-bold"
          >Fitur Unggulan</span
        >
        <h2 class="text-3xl md:text-4xl font-extrabold mt-4">
          Semua yang kamu butuhkan<br /><span class="text-[var(--accent)]"
            >untuk menerima pembayaran</span
          >
        </h2>
        <p class="text-[var(--text-muted)] mt-4">
          Dari QRIS sampai billing — dirancang untuk developer dan bisnis skala
          kecil-menengah.
        </p>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-12">
        {#each FEATURES as f (f.title)}
          <div
            class="tactile-box p-6 space-y-3 hover:-translate-y-1 transition-transform duration-200"
          >
            <div
              class="tactile-btn w-11 h-11 flex items-center justify-center text-[var(--accent)]"
            >
              <i class={f.icon}></i>
            </div>
            <h3 class="font-bold">{f.title}</h3>
            <p class="text-sm text-[var(--text-muted)] leading-relaxed">
              {f.desc}
            </p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- ===== CARA KERJA ===== -->
  <section id="cara" class="w-full">
    <div class="max-w-6xl mx-auto px-4 py-16 md:py-24">
      <div class="text-center max-w-2xl mx-auto">
        <span class="tactile-pill pill-blue px-3 py-1.5 text-xs font-bold"
          >Cara Kerja</span
        >
        <h2 class="text-3xl md:text-4xl font-extrabold mt-4">
          Mulai dalam 3 langkah
        </h2>
        <p class="text-[var(--text-muted)] mt-4">
          Sederhana. Dari akun baru sampai transaksi pertama tidak sampai sejam.
        </p>
      </div>
      <div class="grid md:grid-cols-3 gap-4 md:gap-6 mt-12">
        {#each STEPS as s (s.num)}
          <div class="tactile-box p-6 relative overflow-hidden">
            <span
              class="absolute -top-3 right-3 text-6xl font-extrabold text-[var(--text-muted)]/10 select-none"
              >{s.num}</span
            >
            <div
              class="tactile-btn w-11 h-11 flex items-center justify-center text-[var(--accent)]"
            >
              <i class={s.icon}></i>
            </div>
            <h3 class="font-bold mt-4">{s.title}</h3>
            <p class="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
              {s.desc}
            </p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- ===== HARGA ===== -->
  <section id="harga" class="w-full border-t border-[var(--border-subtle)]/60">
    <div class="max-w-6xl mx-auto px-4 py-16 md:py-24">
      <div class="text-center max-w-2xl mx-auto">
        <span class="tactile-pill pill-green px-3 py-1.5 text-xs font-bold"
          >Harga</span
        >
        <h2 class="text-3xl md:text-4xl font-extrabold mt-4">
          Paket fleksibel,<br /><span class="text-[var(--accent)]"
            >mulai dari gratis</span
          >
        </h2>
        <p class="text-[var(--text-muted)] mt-4">
          Upgrade dan downgrade kapan saja. Tagihan prorata otomatis.
        </p>
      </div>
      <div class="grid gap-4 md:gap-6 mt-12 items-stretch {displayPlans.length <= 1 ? 'grid-cols-1 max-w-md mx-auto' : displayPlans.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto' : 'md:grid-cols-3'}">
        {#each displayPlans as p (p.name)}
          <div
            class="tactile-box p-6 flex flex-col relative {p.cls} {p.featured
              ? 'md:-translate-y-2'
              : ''}"
          >
            {#if p.featured}
              <span
                class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold text-white shadow-lg"
                >POPULER</span
              >
            {/if}
            <p class="font-bold text-lg">{p.name}</p>
            <div class="mt-3 flex items-baseline gap-1">
              <span
                class="text-3xl md:text-4xl font-extrabold text-[var(--accent)]"
                >Rp {p.price}</span
              >
              <span class="text-xs text-[var(--text-muted)] font-sans"
                >{p.suffix}</span
              >
            </div>
            <ul class="mt-5 space-y-2.5 text-sm flex-1">
              {#each p.features as ft (ft)}
                <li class="flex items-start gap-2">
                  <i
                    class="fa-solid fa-circle-check text-emerald-500 dark:text-emerald-400 mt-0.5 text-xs"
                  ></i>
                  <span>{ft}</span>
                </li>
              {/each}
            </ul>
            <a
              href="/login"
              class="mt-6 w-full py-3 rounded-xl text-sm font-bold text-center {p.featured
                ? 'text-white bg-[var(--accent)] shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)]'
                : 'tactile-btn text-[var(--text-muted)]'}"
              >{p.name === "Free" ? "Mulai Gratis" : "Pilih " + p.name}</a
            >
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- ===== CTA BANNER ===== -->
  <section class="w-full">
    <div class="max-w-6xl mx-auto px-4 pb-16 md:pb-24">
      <div
        class="tactile-box p-8 md:p-12 flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden"
      >
        <div class="max-w-xl text-center lg:text-left">
          <h2 class="text-2xl md:text-3xl font-extrabold">
            Siap mulai menerima pembayaran digital?
          </h2>
          <p class="text-[var(--text-muted)] mt-3 text-sm md:text-base">
            Buat akun gratis sekarang. Tanpa kartu kredit, tanpa komitmen.
          </p>
        </div>
        <a
          href="/login"
          class="shrink-0 px-8 py-4 rounded-xl text-sm font-bold text-white bg-[var(--accent)] shadow-[4px_4px_8px_var(--shadow-dark),-4px_-4px_8px_var(--shadow-light)] hover:opacity-90 transition inline-flex items-center gap-2"
        >
          <i class="fa-solid fa-rocket"></i> Mulai Gratis
        </a>
      </div>
    </div>
  </section>

  <!-- ===== FAQ ===== -->
  <section id="faq" class="w-full border-t border-[var(--border-subtle)]/60">
    <div class="max-w-3xl mx-auto px-4 py-16 md:py-24">
      <div class="text-center">
        <span class="tactile-pill pill-amber px-3 py-1.5 text-xs font-bold"
          >FAQ</span
        >
        <h2 class="text-3xl md:text-4xl font-extrabold mt-4">
          Pertanyaan umum
        </h2>
      </div>
      <div class="space-y-3 mt-10">
        {#each FAQS as f (f.q)}
          <details class="tactile-box p-0 group">
            <summary
              class="list-none cursor-pointer px-5 py-4 flex items-center justify-between gap-3 font-bold text-sm select-none"
            >
              {f.q}
              <i
                class="fa-solid fa-chevron-down text-[var(--text-muted)] group-open:rotate-180 transition-transform shrink-0"
              ></i>
            </summary>
            <p
              class="px-5 pb-5 text-sm text-[var(--text-muted)] leading-relaxed"
            >
              {f.a}
            </p>
          </details>
        {/each}
      </div>
    </div>
  </section>

  <!-- ===== FOOTER ===== -->
  <footer class="w-full border-t border-[var(--border-subtle)]/60 mt-auto">
    <div
      class="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-6"
    >
      <div class="flex items-center gap-3">
        <div
          class="tactile-btn w-9 h-9 flex items-center justify-center text-[var(--accent)]"
        >
          <Logo />
        </div>
        <div>
          <p class="font-bold">
            Simpul<span class="text-[var(--accent)]">Pay</span>
          </p>
          <p class="text-xs text-[var(--text-muted)]">Payment Gateway QRIS</p>
        </div>
      </div>
      <div
        class="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-[var(--text-muted)] font-medium"
      >
        <a href="#fitur" class="hover:text-[var(--accent)] transition-colors"
          >Fitur</a
        >
        <a href="#cara" class="hover:text-[var(--accent)] transition-colors"
          >Cara Kerja</a
        >
        <a href="#harga" class="hover:text-[var(--accent)] transition-colors"
          >Harga</a
        >
        <a href="#faq" class="hover:text-[var(--accent)] transition-colors"
          >FAQ</a
        >
        <a href="/login" class="hover:text-[var(--accent)] transition-colors"
          >Masuk</a
        >
      </div>
      <p class="text-xs text-[var(--text-muted)]">
        &copy; 2026 SimpulPay. All rights reserved.
      </p>
    </div>
  </footer>
</div>
