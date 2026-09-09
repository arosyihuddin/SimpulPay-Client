<script lang="ts">
  import { admin, fmtTime } from '$lib/api';
  import { useWs } from '$lib/useWs';
  import Pagination from '$lib/components/Pagination.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';

  interface LogRow { id: number; timestamp: string | number; type: string; message: string; details_json: string | null; }

  const badgeOf = (t: string) =>
    t === 'ERROR' ? 'tactile-pill pill-red'
    : t === 'WARNING' ? 'tactile-pill pill-amber'
    : t === 'SUCCESS' ? 'tactile-pill pill-green'
    : 'tactile-pill pill-gray';

  const iconOf = (t: string) =>
    t === 'ERROR' ? 'fa-solid fa-circle-exclamation'
    : t === 'WARNING' ? 'fa-solid fa-triangle-exclamation'
    : t === 'SUCCESS' ? 'fa-solid fa-circle-check'
    : 'fa-solid fa-circle-info';

  const PAGE_SIZE = 20;

  let logs = $state<LogRow[]>([]);
  let total = $state(0);
  let page = $state(1);
  let err = $state('');
  let busy = $state(true);

  async function load() {
    busy = true;
    admin.logs(PAGE_SIZE, (page - 1) * PAGE_SIZE)
      .then((d) => { logs = d.data.logs; total = d.data.total; })
      .catch((e) => (err = e.message))
      .finally(() => (busy = false));
  }
  $effect(() => { load(); });

  useWs((m) => { if (m.type === 'qris_status' || m.type === 'qris_created' || m.type === 'log' || m.type === 'qris_expired' || m.type === 'transaction_updated') load(); });
</script>

<div class="space-y-6">
  {#if err}<p class="text-xs font-semibold text-red-500">{err}</p>{/if}
  <div class="space-y-2.5">
    {#if busy}
      {#each Array.from({ length: 5 }) as _, i}
        <div class="tactile-box px-4 py-3 flex gap-3 items-start">
          <Skeleton className="h-5 w-14 shrink-0" />
          <div class="flex-1 space-y-1.5"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></div>
          <Skeleton className="h-3 w-20 shrink-0" />
        </div>
      {/each}
    {:else}
      {#each logs as l (l.id)}
        <div class="tactile-box px-4 py-3 flex gap-3 items-start">
          <span class="text-xs font-semibold px-2 py-1 rounded-full shrink-0 flex items-center gap-1.5 {badgeOf(l.type)}">
            <i class={iconOf(l.type)}></i>{l.type}
          </span>
          <div class="flex-1 min-w-0">
            <p class="text-sm break-all">{l.message}</p>
            {#if l.details_json}<pre class="text-xs text-[var(--text-muted)] mt-1 overflow-x-auto">{l.details_json}</pre>{/if}
          </div>
          <span class="text-xs text-[var(--text-muted)] shrink-0 whitespace-nowrap">{fmtTime(l.timestamp)}</span>
        </div>
      {/each}
    {/if}
    {#if !busy && logs.length === 0}<p class="text-center text-[var(--text-muted)] py-8">Belum ada log</p>{/if}
  </div>
  {#if total > PAGE_SIZE}
    <Pagination {page} {total} pageSize={PAGE_SIZE} onChange={(p) => { page = p; }} />
  {/if}
</div>