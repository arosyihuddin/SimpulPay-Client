<script lang="ts">
  import { onMount } from 'svelte';
  import { admin } from '$lib/api';
  import { addToast } from '$lib/toast.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';

  interface WebhookInfo {
    webhook_url: string;
    webhook_enabled: string;
    webhook_secret: string;
  }

  let webhook = $state<WebhookInfo | null>(null);
  let loading = $state(true);
  let urlSaving = $state(false);
  let toggling = $state(false);
  let whBusy = $state(false);
  let showSecret = $state(false);
  let err = $state('');

  async function load(silent = false) {
    if (!silent) loading = true;
    err = '';
    try {
      const r = await admin.webhookInfo();
      webhook = r.data as WebhookInfo;
    } catch (e: any) {
      err = e.message;
    } finally {
      loading = false;
    }
  }
  onMount(() => load());

  const URL_RE = /^https?:\/\/.+/i;

  async function saveUrl() {
    if (!webhook) return;
    err = '';
    const url = webhook.webhook_url.trim();
    if (url && !URL_RE.test(url)) {
      err = 'Webhook URL harus diawali http:// atau https://';
      return;
    }
    urlSaving = true;
    try {
      await admin.updateSettings({ webhook_url: webhook.webhook_url });
      // Refresh diam-diam — backend bisa generate secret saat URL pertama kali di-set.
      await load(true);
      addToast('success', 'Webhook URL disimpan.');
    } catch (e: any) {
      err = e.message;
    } finally {
      urlSaving = false;
    }
  }

  async function toggleEnabled() {
    if (!webhook) return;
    err = '';
    toggling = true;
    try {
      const next = webhook.webhook_enabled === 'true' ? 'false' : 'true';
      await admin.updateSettings({ webhook_enabled: next });
      webhook = { ...webhook, webhook_enabled: next };
      addToast('success', next === 'true' ? 'Webhook diaktifkan.' : 'Webhook dinonaktifkan.');
    } catch (e: any) {
      err = e.message;
    } finally {
      toggling = false;
    }
  }

  async function rotateSecret() {
    whBusy = true;
    err = '';
    try {
      await admin.updateSettings({ webhook_secret: 'regenerate' });
      await load(true);
      addToast('success', 'Webhook secret diganti.');
    } catch (e: any) {
      err = e.message;
    } finally {
      whBusy = false;
    }
  }

  async function copySecret() {
    if (!webhook?.webhook_secret) return;
    try {
      await navigator.clipboard.writeText(webhook.webhook_secret);
      addToast('success', 'Secret disalin.');
    } catch {
      addToast('error', 'Gagal menyalin secret.');
    }
  }

  let testBusy = $state(false);
  let testResult = $state<{ ok: boolean; status: number | null; error: string | null } | null>(null);
  async function sendTest() {
    if (!webhook?.webhook_url) {
      err = 'Isi Webhook URL dulu';
      return;
    }
    testBusy = true;
    testResult = null;
    err = '';
    try {
      const r = await admin.testWebhook();
      testResult = r.data as { ok: boolean; status: number | null; error: string | null };
      if (r.data?.ok) addToast('success', `Tes terkirim (HTTP ${r.data.status}).`);
      else err = r.data?.error || 'Tes gagal';
    } catch (e: any) {
      err = e.message;
    } finally {
      testBusy = false;
    }
  }
</script>

<div class="space-y-6">
  {#if err}<p
      class="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-2xl px-4 py-3"
    >
      <i class="fa-solid fa-circle-exclamation mr-2"></i>{err}
    </p>{/if}

  <div class="tactile-box p-5 space-y-4">
    <div class="flex items-center gap-2">
      <i class="fa-solid fa-bolt text-[var(--accent)]"></i>
      <div class="flex-1">
        <h2 class="font-semibold">Webhook</h2>
        <p class="text-xs text-[var(--text-muted)]">Notifikasi transaksi dikirim ke URL ini</p>
      </div>
      {#if webhook}
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs font-bold {webhook.webhook_enabled === 'true' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-muted)]'}">
            {toggling ? 'Menyimpan...' : (webhook.webhook_enabled === 'true' ? 'Aktif' : 'Nonaktif')}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={webhook.webhook_enabled === 'true'}
            aria-label="Toggle webhook"
            onclick={toggleEnabled}
            disabled={toggling}
            class="relative w-14 h-8 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed {webhook.webhook_enabled === 'true' ? 'tactile-btn bg-emerald-500/20 shadow-[3px_3px_6px_var(--inset-dark),-3px_-3px_6px_var(--inset-light)]' : 'tactile-inset bg-[var(--bg-base)]'}"
          >
            <span
              class="absolute top-1.5 left-1.5 w-5 h-5 rounded-full transition-all duration-200 {webhook.webhook_enabled === 'true' ? 'translate-x-6 bg-emerald-500 tactile-btn' : 'bg-[var(--text-muted)] tactile-inset'}"
            ></span>
          </button>
        </div>
      {/if}
    </div>

    {#if loading}
      <div class="space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-4 w-40" />
      </div>
    {:else if webhook}
      <div>
        <label for="webhook-url" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Webhook URL</label>
        <div class="flex gap-2">
          <input
            id="webhook-url"
            type="url"
            placeholder="https://example.com/webhook"
            value={webhook.webhook_url}
            oninput={(e) => (webhook!.webhook_url = e.currentTarget.value)}
            class="flex-1 min-w-0 tactile-inset px-4 py-2.5 text-sm focus:outline-none"
          />
          <button
            onclick={saveUrl}
            disabled={urlSaving}
            class="tactile-btn px-4 py-2.5 font-bold text-[var(--accent)] text-sm flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i class="fa-solid {urlSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}"></i>
            {urlSaving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
        <p class="text-[10px] text-[var(--text-muted)] mt-1">URL kosong = webhook nonaktif.</p>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs font-bold text-[var(--text-muted)]">Webhook Secret</p>
          <div class="flex gap-2">
            <button
              onclick={() => (showSecret = !showSecret)}
              class="tactile-btn px-3 py-1.5 text-xs font-bold text-[var(--text-muted)]"
            >
              <i class="fa-solid {showSecret ? 'fa-eye-slash' : 'fa-eye'} mr-1"></i>
              {showSecret ? 'Sembunyikan' : 'Lihat'}
            </button>
            <button
              onclick={copySecret}
              class="tactile-btn px-3 py-1.5 text-xs font-bold text-[var(--text-muted)]"
              title="Salin secret"
            >
              <i class="fa-solid fa-copy"></i>
            </button>
            <button
              onclick={rotateSecret}
              disabled={whBusy}
              class="tactile-btn px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i class="fa-solid fa-rotate mr-1"></i>
              {whBusy ? 'Mengganti...' : 'Ganti'}
            </button>
          </div>
        </div>
        {#if webhook.webhook_secret}
          <code
            class="block w-full tactile-inset px-4 py-2.5 text-xs font-mono break-all {showSecret ? '' : 'select-none'}"
          >{showSecret ? webhook.webhook_secret : '•'.repeat(Math.min(webhook.webhook_secret.length, 32))}</code>
        {:else}
          <p class="text-xs text-[var(--text-muted)]">
            Belum ada secret. Isi Webhook URL di atas — secret dibuat otomatis.
          </p>
        {/if}
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-xs font-bold text-[var(--text-muted)]">Tes Pengiriman</p>
          <button
            onclick={sendTest}
            disabled={testBusy || !webhook.webhook_url}
            class="tactile-btn px-4 py-2 text-xs font-bold text-[var(--accent)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i class="fa-solid {testBusy ? 'fa-spinner fa-spin' : 'fa-paper-plane'}"></i>
            {testBusy ? 'Mengirim...' : 'Kirim Tes'}
          </button>
        </div>
        <p class="text-[10px] text-[var(--text-muted)]">Kirim payload dummy <code class="font-mono">transaction.paid</code> + flag <code class="font-mono">test: true</code> ke URL di atas.</p>
        {#if testResult}
          <p class="text-xs font-mono px-4 py-2.5 rounded-xl border {testResult.ok ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'border-red-500/30 text-red-500'}">
            {testResult.ok ? `OK — HTTP ${testResult.status}` : `Gagal — ${testResult.error ?? 'unknown'}`}
          </p>
        {/if}
      </div>
    {/if}
  </div>
</div>
