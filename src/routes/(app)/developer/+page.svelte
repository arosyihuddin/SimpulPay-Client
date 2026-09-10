<script lang="ts">
  import { onMount } from 'svelte';
  import { API_BASE } from '$lib/api';

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

  let doc = $state<SwaggerDoc | null>(null);
  let docErr = $state('');
  let open = $state<string | null>(null);
  let copiedBody = $state<string | null>(null);

  onMount(() => {
    fetch(`${API_BASE}/docs/json`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j) => (doc = j))
      .catch((e) => (docErr = e.message));
  });

  const copy = (text: string, after: () => void) => {
    navigator.clipboard.writeText(text).then(() => { after(); setTimeout(after, 2000); }).catch(() => {});
  };

  const paths = $derived(Object.entries(doc?.paths || {}));
  type WhLang = 'node' | 'php' | 'python' | 'go';
  let whLang = $state<WhLang>('node');
  let copiedWh = $state<string | null>(null);

  const WH_LANGS: { id: WhLang; label: string }[] = [
    { id: 'node', label: 'Node.js' },
    { id: 'php', label: 'PHP' },
    { id: 'python', label: 'Python' },
    { id: 'go', label: 'Go' },
  ];

  const WH_EVENTS = [
    { name: 'transaction.paid', desc: 'QRIS dibayar lunas.', fields: 'trx_id, amount, base_amount, unique_code, fee_amount, merchant_id, merchant_name, paid_at' },
    { name: 'transaction.expired', desc: 'QRIS kedaluwarsa tanpa bayar.', fields: 'trx_id, amount, base_amount, unique_code, fee_amount, merchant_id, expired_at' },
  ];

  const WH_PAYLOAD = '{\n  "event": "transaction.paid",\n  "timestamp": 1736400000000,\n  "data": {\n    "trx_id": "TRX-XXXX",\n    "amount": 50123,\n    "base_amount": 50000,\n    "unique_code": 123,\n    "fee_amount": 0,\n    "merchant_id": "m_xxx",\n    "merchant_name": "Toko Saya",\n    "paid_at": 1736400000000\n  }\n}';
  const WH_PAYLOAD_EXPIRED = '{\n  "event": "transaction.expired",\n  "timestamp": 1736400000000,\n  "data": {\n    "trx_id": "TRX-XXXX",\n    "amount": 50123,\n    "base_amount": 50000,\n    "unique_code": 123,\n    "fee_amount": 0,\n    "merchant_id": "m_xxx",\n    "expired_at": 1736400000000\n  }\n}';

  const WH_SNIPPETS: Record<WhLang, string> = {
    node: "import { createHmac, timingSafeEqual } from 'node:crypto';\nimport express from 'express';\n\nconst app = express();\n// Wajib raw body — jangan pakai express.json() di route ini\napp.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {\n  const rawBody = req.body.toString('utf8');\n  const secret = process.env.SIMPULPAY_WEBHOOK_SECRET || '';\n  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');\n  const sig = String(req.headers['x-simpulpay-signature'] || '');\n  const ok = sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));\n  if (!ok) return res.status(401).send('invalid signature');\n  const payload = JSON.parse(rawBody);\n  if (payload.test) return res.send('ok'); // kiriman tombol tes\n  console.log(payload.event, payload.data);\n  res.send('ok');\n});",
    php: "<?php\n$secret = getenv('SIMPULPAY_WEBHOOK_SECRET');\n$rawBody = file_get_contents('php://input');\n$sig = $_SERVER['HTTP_X_SIMPULPAY_SIGNATURE'] ?? '';\n$expected = hash_hmac('sha256', $rawBody, $secret);\nif (!hash_equals($expected, $sig)) {\n    http_response_code(401);\n    exit('invalid signature');\n}\n$payload = json_decode($rawBody, true);\nif (!empty($payload['test'])) { http_response_code(200); exit('ok'); }\n// $payload['event'], $payload['data']\nhttp_response_code(200);",
    python: "import hmac, hashlib, os\nfrom flask import Flask, request, abort\n\napp = Flask(__name__)\n\n@app.post('/webhook')\ndef webhook():\n    secret = os.environ['SIMPULPAY_WEBHOOK_SECRET'].encode()\n    raw = request.get_data()\n    sig = request.headers.get('X-SimpulPay-Signature', '')\n    expected = hmac.new(secret, raw, hashlib.sha256).hexdigest()\n    if not hmac.compare_digest(expected, sig):\n        abort(401)\n    payload = request.get_json(force=True)\n    if payload.get('test'):\n        return 'ok'\n    print(payload['event'], payload['data'])\n    return 'ok'",
    go: "package main\n\nimport (\n    \"crypto/hmac\"\n    \"crypto/sha256\"\n    \"encoding/hex\"\n    \"io\"\n    \"net/http\"\n    \"os\"\n)\n\nfunc webhook(w http.ResponseWriter, r *http.Request) {\n    secret := os.Getenv(\"SIMPULPAY_WEBHOOK_SECRET\")\n    raw, _ := io.ReadAll(r.Body)\n    mac := hmac.New(sha256.New, []byte(secret))\n    mac.Write(raw)\n    expected := hex.EncodeToString(mac.Sum(nil))\n    if !hmac.Equal([]byte(r.Header.Get(\"X-SimpulPay-Signature\")), []byte(expected)) {\n        http.Error(w, \"invalid signature\", 401)\n        return\n    }\n    w.Write([]byte(\"ok\"))\n}",
  };

  const copyWh = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { copiedWh = key; setTimeout(() => (copiedWh = null), 2000); }).catch(() => {});
  };
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
  <div class="tactile-box p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-flask text-[var(--accent)]"></i> Sandbox QRIS</h2>
      <p class="text-xs text-[var(--text-muted)] mt-1">QRIS dummy tanpa merchant + tombol simulasi bayar</p>
    </div>
    <a href="/developer/sandbox" class="tactile-btn px-5 py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2 shrink-0">
      <i class="fa-solid fa-flask"></i> Buka Sandbox
    </a>
  </div>

  <div class="tactile-box p-5 space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-bolt text-[var(--accent)]"></i> Webhook</h2>
      <a href="/developer/webhook" class="tactile-btn px-4 py-2 text-xs font-bold text-[var(--accent)] flex items-center justify-center gap-2 shrink-0">
        <i class="fa-solid fa-paper-plane"></i> Kirim Tes
      </a>
    </div>
    <div class="tactile-inset rounded-2xl px-4 py-3 flex flex-col gap-2.5">
      <div class="flex items-center gap-2.5 flex-wrap">
        <span class="text-[10px] font-bold font-mono px-2 py-1 rounded-lg text-center border bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">POST</span>
        <p class="text-xs">JSON ke <code class="font-mono text-[var(--accent)] font-bold">webhook_url</code> kamu tiap transaksi QRIS dibayar / kedaluwarsa</p>
      </div>
      <div class="flex items-center gap-x-4 gap-y-1.5 flex-wrap text-[11px] text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-2.5">
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-clock text-[var(--accent)]"></i>Timeout 10 dtk</span>
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-rotate-right text-[var(--accent)]"></i>Retry 3x (1m, 5m, 30m)</span>
        <span class="flex items-center gap-1.5"><i class="fa-solid fa-trash-can text-[var(--accent)]"></i>Non-2xx dibuang + log ERROR</span>
      </div>
    </div>
    <div class="grid sm:grid-cols-3 gap-2 text-xs">
      <div class="tactile-inset rounded-2xl px-3 py-2.5"><p class="font-bold"><span class="text-[var(--accent)] font-mono mr-1">1</span>Event terjadi</p><p class="text-[var(--text-muted)]">QRIS dibayar / kedaluwarsa.</p></div>
      <div class="tactile-inset rounded-2xl px-3 py-2.5"><p class="font-bold"><span class="text-[var(--accent)] font-mono mr-1">2</span>POST bertanda</p><p class="text-[var(--text-muted)]">Body JSON + signature HMAC.</p></div>
      <div class="tactile-inset rounded-2xl px-3 py-2.5"><p class="font-bold"><span class="text-[var(--accent)] font-mono mr-1">3</span>Balas 200</p><p class="text-[var(--text-muted)]">Selain 2xx = antri retry otomatis.</p></div>
    </div>
    <div>
      <p class="text-xs font-bold text-[var(--text-muted)] mb-2">Event <span class="font-normal">({WH_EVENTS.length})</span></p>
      <div class="grid sm:grid-cols-2 gap-2">
        {#each WH_EVENTS as ev (ev.name)}
          <div class="tactile-inset rounded-2xl px-3 py-2.5 space-y-1">
            <div class="flex items-center gap-2">
              <code class="font-mono text-xs font-bold text-[var(--accent)] break-all flex-1">{ev.name}</code>
              <button onclick={() => copyWh(ev.name, 'ev-' + ev.name)} class="tactile-btn w-6 h-6 flex items-center justify-center text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] shrink-0" title="Salin nama event">
                <i class="fa-solid {copiedWh === 'ev-' + ev.name ? 'fa-check text-emerald-500' : 'fa-copy'}"></i>
              </button>
            </div>
            <p class="text-[11px] text-[var(--text-muted)]">{ev.desc}</p>
            <p class="text-[10px] font-mono text-[var(--text-muted)] break-all opacity-80">{ev.fields}</p>
          </div>
        {/each}
      </div>
    </div>
    <div class="grid sm:grid-cols-2 gap-2 text-xs">
      <div class="tactile-inset rounded-2xl px-3 py-2.5 space-y-1">
        <p class="font-bold">Bentuk payload</p>
        <p class="font-mono break-all">{'{ event, timestamp, test?, data }'}</p>
        <p class="text-[var(--text-muted)] text-[11px]"><code class="font-mono">trx_id</code> dari respon buat QRIS. Detail status via <code class="font-mono">GET /v1/qris/{'{id}'}</code>.</p>
      </div>
      <div class="tactile-inset rounded-2xl px-3 py-2.5 space-y-1">
        <p class="font-bold">Header</p>
        <p class="font-mono break-all"><span class="text-[var(--accent)]">X-SimpulPay-Signature</span> — hex HMAC-SHA256(secret, raw body)</p>
        <p class="font-mono break-all"><span class="text-[var(--accent)]">X-SimpulPay-Event</span> — nama event</p>
      </div>
    </div>
    <div>
      <div class="flex items-center justify-between mb-1">
        <p class="text-xs font-bold text-[var(--text-muted)]">Verifikasi signature</p>
        <button onclick={() => copyWh(WH_SNIPPETS[whLang], 'wh-' + whLang)} class="tactile-btn px-3 py-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent)]" title="Salin contoh">
          <i class="fa-solid {copiedWh === 'wh-' + whLang ? 'fa-check text-emerald-500' : 'fa-copy'} mr-1"></i>
          {copiedWh === 'wh-' + whLang ? 'Disalin!' : 'Salin'}
        </button>
      </div>
      <div class="flex gap-1.5 mb-2 flex-wrap">
        {#each WH_LANGS as l (l.id)}
          <button onclick={() => (whLang = l.id)} class="tactile-btn px-3 py-1.5 text-xs font-bold {whLang === l.id ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}">{l.label}</button>
        {/each}
      </div>
      <pre class="text-[11px] bg-[var(--bg-base)] p-3 rounded-xl shadow-[inset_3px_3px_6px_var(--inset-dark),inset_-3px_-3px_6px_var(--inset-light)] overflow-x-auto whitespace-pre break-all">{WH_SNIPPETS[whLang]}</pre>
    </div>
    <div class="space-y-3">
      <div class="flex items-center justify-between mb-1">
        <p class="text-xs font-bold text-[var(--text-muted)]">Contoh payload <span class="font-mono text-[var(--accent)]">transaction.paid</span></p>
        <button onclick={() => copyWh(WH_PAYLOAD, 'wh-payload')} class="tactile-btn px-3 py-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent)]" title="Salin payload">
          <i class="fa-solid {copiedWh === 'wh-payload' ? 'fa-check text-emerald-500' : 'fa-copy'} mr-1"></i>
          {copiedWh === 'wh-payload' ? 'Disalin!' : 'Salin'}
        </button>
      </div>
      <pre class="text-[11px] bg-[var(--bg-base)] p-3 rounded-xl shadow-[inset_3px_3px_6px_var(--inset-dark),inset_-3px_-3px_6px_var(--inset-light)] overflow-x-auto whitespace-pre break-all">{WH_PAYLOAD}</pre>
      <div class="flex items-center justify-between mb-1">
        <p class="text-xs font-bold text-[var(--text-muted)]">Contoh payload <span class="font-mono text-[var(--accent)]">transaction.expired</span></p>
        <button onclick={() => copyWh(WH_PAYLOAD_EXPIRED, 'wh-payload-expired')} class="tactile-btn px-3 py-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--accent)]" title="Salin payload">
          <i class="fa-solid {copiedWh === 'wh-payload-expired' ? 'fa-check text-emerald-500' : 'fa-copy'} mr-1"></i>
          {copiedWh === 'wh-payload-expired' ? 'Disalin!' : 'Salin'}
        </button>
      </div>
      <pre class="text-[11px] bg-[var(--bg-base)] p-3 rounded-xl shadow-[inset_3px_3px_6px_var(--inset-dark),inset_-3px_-3px_6px_var(--inset-light)] overflow-x-auto whitespace-pre break-all">{WH_PAYLOAD_EXPIRED}</pre>
    </div>
    <p class="text-[11px] text-[var(--text-muted)]">WebSocket dashboard (bukan webhook HTTP, tidak ke URL kamu): <span class="font-mono">payment_received, transaction_updated, qris_expired, qris_created, invoice_rejected, pooling_status</span>.</p>
  </div>

  <div class="tactile-box p-5 space-y-3">
    <h2 class="font-semibold flex items-center gap-2"><i class="fa-solid fa-list text-[var(--accent)]"></i> Endpoint API v1</h2>
    <p class="text-xs text-[var(--text-muted)]">Base URL: <code class="font-mono text-[var(--accent)] break-all">{baseUrl}</code></p>

    {#if docErr}<p class="text-xs font-semibold text-red-500">Gagal muat docs: {docErr}</p>{/if}
    {#if !doc && !docErr}<p class="text-xs text-[var(--text-muted)]">Memuat dokumentasi...</p>{/if}

    {#if paths.length > 0}
      <div class="space-y-2">
        {#each paths as [path, methods] (path)}
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