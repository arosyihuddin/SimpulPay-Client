<script lang="ts">
  import { onMount } from 'svelte';
  import { admin, API_BASE } from '$lib/api';

  interface SwaggerDoc { info: { title: string; version: string; description?: string }; paths: Record<string, Record<string, any>>; }

  const METHOD_BADGE: Record<string, string> = {
    get: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    post: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    put: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    delete: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
    patch: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  };

  const docsUrl = `${API_BASE}/docs`;
  const baseUrl = API_BASE || location.origin;

  let apiKey = $state('');
  let copied = $state(false);
  let showKey = $state(false);
  let doc = $state<SwaggerDoc | null>(null);
  let docErr = $state('');
  let open = $state<string | null>(null);
  let copiedCurl = $state(false);
  let copiedBody = $state<string | null>(null);

  onMount(() => {
    admin.settings().then((d) => (apiKey = d.data.api_key || '')).catch(() => {});
    fetch(`${API_BASE}/docs/json`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j) => (doc = j))
      .catch((e) => (docErr = e.message));
  });

  const copy = (text: string, after: () => void) => {
    navigator.clipboard.writeText(text).then(() => { after(); setTimeout(after, 2000); }).catch(() => {});
  };

  const copyKey = () => { if (apiKey) copy(apiKey, () => (copied = true)); };

  const curl = $derived(`curl -H "Authorization: Bearer ${apiKey || 'API_KEY'}" \\
  ${baseUrl}/api/v1/health`);

  const paths = $derived(Object.entries(doc?.paths || {}));
</script>

<div class="space-y-6">
  <div class="tactile-box p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-book text-[var(--accent)]"></i> Dokumentasi Interaktif</h2>
      <p class="text-xs text-[var(--text-muted)] mt-1">Swagger UI dengan tombol Authorize (Bearer API key)</p>
    </div>
    <a href={docsUrl} target="_blank" class="tactile-btn px-5 py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2 shrink-0">
      <i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Swagger
    </a>
  </div>

  <div class="tactile-box p-5 space-y-3">
    <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-key text-[var(--accent)]"></i> API Key</h2>
    {#if apiKey}
      <div class="input-well px-4 py-3 flex items-center">
        <code class="font-mono text-xs flex-1 break-all">{showKey ? apiKey : apiKey.slice(0, 4) + '****' + apiKey.slice(-4)}</code>
        <button onclick={() => (showKey = !showKey)} class="text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer shrink-0 ml-1" title={showKey ? 'Sembunyikan' : 'Tampilkan'}>
          <i class="fa-solid {showKey ? 'fa-eye-slash' : 'fa-eye'}"></i>
        </button>
        <button onclick={copyKey} class="text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer shrink-0 ml-2" title="Salin API key">
          <i class="fa-solid {copied ? 'fa-check text-emerald-500' : 'fa-copy'}"></i>
        </button>
      </div>
    {:else}
      <button
        onclick={async () => {
          try {
            const res = await admin.generateApiKey('generate');
            apiKey = res.data.api_key; showKey = true;
            copy(res.data.api_key, () => (copied = true));
          } catch (e: any) { docErr = e.message; }
        }}
        class="tactile-btn w-full py-3 text-xs font-bold text-[var(--accent)] flex items-center justify-center gap-2"
      >
        <i class="fa-solid fa-key"></i> Generate API Key
      </button>
    {/if}
    <p class="text-xs text-[var(--text-muted)]">Gunakan sebagai Bearer token atau header <code class="font-mono">X-Api-Key</code>.</p>
    <div class="relative">
      <button
        onclick={() => copy(curl, () => (copiedCurl = true))}
        class="absolute top-3 right-3 tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)]"
        title="Salin contoh curl"
      >
        <i class="fa-solid {copiedCurl ? 'fa-check text-emerald-500' : 'fa-copy'}"></i>
      </button>
      <pre class="text-xs bg-[var(--bg-base)] p-4 pr-12 rounded-xl shadow-[inset_4px_4px_8px_var(--inset-dark),inset_-4px_-4px_8px_var(--inset-light)] overflow-x-auto whitespace-pre-wrap break-all">{curl}</pre>
    </div>
  </div>

  <div class="tactile-box p-5 space-y-3">
    <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-list text-[var(--accent)]"></i> Endpoint API v1</h2>
    <p class="text-xs text-[var(--text-muted)]">Base URL: <code class="font-mono text-[var(--accent)] break-all">{baseUrl}</code></p>

    {#if docErr}<p class="text-xs font-semibold text-red-500">Gagal muat docs: {docErr}</p>{/if}
    {#if !doc && !docErr}<p class="text-xs text-[var(--text-muted)]">Memuat dokumentasi...</p>{/if}

    {#if paths.length > 0}
      <div class="space-y-2">
        {#each paths as [path, methods] ([path])}
          {#each Object.entries(methods) as [method, op] (`${method} ${path}`)}
            {#snippet body()}
              <div class="rounded-xl bg-[var(--bg-base)] shadow-[inset_3px_3px_6px_var(--inset-dark),inset_-3px_-3px_6px_var(--inset-light)] overflow-hidden">
                <button onclick={() => (open = open === `${method} ${path}` ? null : `${method} ${path}`)} class="w-full flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 text-left cursor-pointer hover:opacity-80 transition-opacity">
                  <span class="flex items-center gap-3 w-full sm:w-auto sm:flex-none">
                    <span class="text-[10px] font-bold font-mono w-14 shrink-0 px-2 py-1 rounded-lg text-center border {METHOD_BADGE[method] || METHOD_BADGE.get}">{method.toUpperCase()}</span>
                    <span class="font-mono text-xs text-[var(--accent)] break-all">{path}</span>
                  </span>
                  <span class="hidden sm:block text-[11px] text-[var(--text-muted)] truncate max-w-[160px]">{op.summary}</span>
                  <i class="fa-solid fa-chevron-{open === `${method} ${path}` ? 'up' : 'down'} text-[10px] text-[var(--text-muted)] sm:ml-auto"></i>
                </button>
                {#if open === `${method} ${path}`}
                  <div class="px-4 pb-4 space-y-2 border-t border-[var(--border-subtle)] pt-3">
                    {#if op.summary}<p class="text-sm font-semibold">{op.summary}</p>{/if}
                    {#if op.description}<p class="text-xs text-[var(--text-muted)]">{op.description}</p>{/if}
                    {#if op.parameters?.length > 0}
                      <div class="text-xs space-y-1">
                        <p class="font-semibold text-[var(--text-muted)]">Parameter</p>
                        {#each op.parameters as p, i (i)}
                          <p class="flex gap-2"><span class="font-mono {p.required ? 'text-red-500' : 'text-[var(--accent)]'}">{p.name}</span><span class="text-[var(--text-muted)]">({p.in})</span></p>
                        {/each}
                      </div>
                    {/if}
                    {#if op.requestBody}
                      <div>
                        <div class="flex items-center justify-between mb-1">
                          <p class="text-xs font-semibold text-[var(--text-muted)]">Request Body</p>
                          <button onclick={() => copy(JSON.stringify(op.requestBody, null, 2), () => (copiedBody = `${method} ${path}`))} class="tactile-btn w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)]" title="Salin body">
                            <i class="fa-solid {copiedBody === `${method} ${path}` ? 'fa-check text-emerald-500' : 'fa-copy'}"></i>
                          </button>
                        </div>
                        <pre class="text-[11px] bg-[var(--bg-base)] p-3 rounded-xl shadow-[inset_3px_3px_6px_var(--inset-dark),inset_-3px_-3px_6px_var(--inset-light)] overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(op.requestBody, null, 2)}</pre>
                      </div>
                    {/if}
                    <div class="text-[11px] flex gap-2 flex-wrap">
                      {#each Object.keys(op.responses || {}) as code (code)}
                        <span class="px-2 py-0.5 rounded-lg border font-mono {code.startsWith('2') ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : code.startsWith('4') ? 'border-amber-500/30 text-amber-600 dark:text-amber-400' : 'border-red-500/30 text-red-600 dark:text-red-400'}">{code}</span>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/snippet}
            {@render body()}
          {/each}
        {/each}
      </div>
    {/if}
  </div>
</div>