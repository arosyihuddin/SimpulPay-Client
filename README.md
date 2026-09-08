# SimpulPay Client

Admin dashboard SPA (SvelteKit + adapter-static + Tailwind v4) untuk SimpulPay. Dipisah dari backend — development pakai Vite dev server + proxy ke API.

## Setup

```bash
bun install
bun run dev          # :5173, proxy api/admin/qr/health/docs/ws ke localhost:3000
```

Build statis untuk production:

```bash
bun run build        # build/ (SPA, fallback index.html)
bun run preview      # preview build lokal
```

Type check:

```bash
bun run check
```

## Struktur

```
src/
  routes/
    +layout.svelte        ← init theme + auth check
    +page.svelte          ← gate / → Login/Setup/redirect
    +error.svelte         ← 404
    setup/+page.svelte    ← wizard pertama kali
    (app)/+layout.svelte  ← shell sidebar + header + guard authed
    (app)/dashboard|qris|transactions|logs|settings|developer/+page.svelte
    (app)/settings/password/+page.svelte
  lib/
    api.ts                ← fetch wrapper + admin methods + fmtIDR/fmtTime
    auth.svelte.ts        ← auth store ($state, checkAuth)
    theme.svelte.ts       ← theme store (dark/light persist)
    useWs.ts              ← WebSocket scope=admin + auto-reconnect
    components/           ← Logo, ErrBox, Row, Stat, Skeleton, Pagination
  app.css                 ← Tailwind + tactile 3D utilities
  app.html                ← template, font-awesome CDN
```

## Catatan

- SPA murni (`export const ssr = false` di `+layout.ts`). Semua request same-origin (cookie httpOnly admin session).
- Routing file-based: `/dashboard`, `/qris`, `/transactions`, `/logs`, `/settings`, `/settings/password`, `/developer`, `/setup`.
- Auth guard di `(app)/+layout.svelte`: kalau belum login → redirect `/`.
- Prod: `build/` bisa diserve backend (reverse-proxy) atau hosting statis (S3/CF Pages). WS `/ws` dan `/docs` juga diproxy.
