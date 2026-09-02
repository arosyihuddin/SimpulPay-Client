<script lang="ts">
  // Admin Invoices — kelola invoice semua user (real API /admin/invoices).
  import { onMount } from "svelte";
  import { admin, fmtIDR } from "$lib/api";
  import { addToast } from "$lib/toast.svelte";
  import { useWs } from "$lib/useWs";
  import ConfirmModal from "$lib/components/ConfirmModal.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";

  interface Invoice {
    id: string;
    user_id: string;
    user_name?: string | null;
    user_email?: string | null;
    amount: number;
    status: "pending" | "paid" | "overdue" | "failed";
    period_start: number;
    period_end: number;
    paid_at: number | null;
    created_at: number;
  }

  let invoices = $state<Invoice[]>([]);
  let err = $state("");
  let loading = $state(true);

  let invTarget = $state<Invoice | null>(null);
  let invAction = $state<"paid" | "reject" | null>(null);
  let invBusy = $state(false);

  const fmtDate = (n: number | null) =>
    n
      ? new Date(n).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "-";

  const hasAction = $derived(
    invoices.some((iv) => iv.status === "pending" || iv.status === "overdue"),
  );

  const invStatusCls = (st: string) =>
    st === "paid" ? "tactile-pill pill-green"
      : st === "pending" ? "tactile-pill pill-amber"
        : "tactile-pill pill-red";

  async function load() {
    loading = true;
    err = "";
    try {
      const iv = await admin.listAllInvoices({ limit: 100 });
      invoices = iv.data.invoices || [];
    } catch (e: any) {
      err = e.message;
    } finally {
      loading = false;
    }
  }
  onMount(load);

  // Realtime scope=admin: ada invoice baru lunas/ditolak (dari pooling atau aksi admin lain).
  useWs((m) => {
    if (m.type === "invoice_paid" || m.type === "invoice_rejected") load();
  });

  async function doInvoiceAction() {
    const target = invTarget;
    const action = invAction;
    if (!target || !action) return;
    invBusy = true;
    err = "";
    try {
      if (action === "paid") await admin.markInvoicePaid(target.id);
      else await admin.rejectInvoice(target.id);
      // Update local state langsung — no skeleton flash
      const idx = invoices.findIndex((iv) => iv.id === target.id);
      if (idx !== -1) invoices[idx] = { ...invoices[idx], status: action === "paid" ? "paid" : "failed" };
      invTarget = null;
      invAction = null;
      addToast(
        "success",
        action === "paid" ? "Invoice ditandai lunas." : "Invoice ditolak.",
      );
    } catch (e: any) {
      err = e.message;
    } finally {
      invBusy = false;
    }
  }
</script>

<div class="space-y-6">
  {#if err}<p
      class="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-2xl px-4 py-3"
    >
      <i class="fa-solid fa-circle-exclamation mr-2"></i>{err}
    </p>{/if}

  <div class="hidden md:block tactile-box overflow-x-auto">
    <div class="px-4 pt-4 pb-2">
      <h2 class="font-semibold flex items-center gap-2">
        <i class="fa-solid fa-file-invoice text-[var(--accent)]"></i> Invoice
      </h2>
    </div>
    <table class="w-full text-sm">
      <thead>
        <tr
          class="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]"
        >
          <th class="px-4 py-3 font-medium">Invoice</th>
          <th class="px-4 py-3 font-medium">Subscriber</th>
          <th class="px-4 py-3 font-medium">Jumlah</th>
          <th class="px-4 py-3 font-medium">Periode</th>
          <th class="px-4 py-3 font-medium">Status</th>
          {#if hasAction}
            <th class="px-4 py-3 font-medium text-right">Aksi</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#if loading}
          {#each Array.from({ length: 3 }) as _, i}
            <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
              {#each Array.from({ length: 6 }) as _, j}
                <td class="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
              {/each}
            </tr>
          {/each}
        {:else if invoices.length === 0}
          <tr>
            <td
              colspan={hasAction ? 6 : 5}
              class="px-4 py-8 text-center text-[var(--text-muted)]"
              >Belum ada invoice</td
            >
          </tr>
        {:else}
          {#each invoices as iv (iv.id)}
            <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
              <td class="px-4 py-3 font-mono text-xs font-bold">{iv.id}</td>
              <td class="px-4 py-3">
                <p class="font-bold">{iv.user_name || iv.user_email || iv.user_id || "—"}</p>
                <p class="text-xs text-[var(--text-muted)]">
                  {iv.user_email || iv.user_id}
                </p>
              </td>
              <td class="px-4 py-3 font-semibold">{fmtIDR(iv.amount)}</td>
              <td class="px-4 py-3 text-xs text-[var(--text-muted)]">
                {fmtDate(iv.period_start)} — {fmtDate(iv.period_end)}
              </td>
              <td class="px-4 py-3"
                ><span
                  class="text-xs font-semibold px-2.5 py-1 rounded-full {invStatusCls(
                    iv.status,
                  )}">{iv.status.toUpperCase()}</span
                ></td
              >
              {#if hasAction}
                <td class="px-4 py-3 text-right">
                  {#if iv.status === "pending" || iv.status === "overdue"}
                    <button
                      class="tactile-btn px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                      onclick={() => {
                        invTarget = iv;
                        invAction = "paid";
                      }}>Lunas</button
                    >
                    <button
                      class="tactile-btn px-3 py-1.5 text-xs font-bold text-red-500 ml-1"
                      onclick={() => {
                        invTarget = iv;
                        invAction = "reject";
                      }}>Tolak</button
                    >
                  {:else}
                    <span class="text-xs text-[var(--text-muted)]">—</span>
                  {/if}
                </td>
              {/if}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Mobile cards -->
  <div class="md:hidden space-y-3">
    <h2 class="font-semibold flex items-center gap-2">
      <i class="fa-solid fa-file-invoice text-[var(--accent)]"></i> Invoice
    </h2>
    {#if loading}
      {#each Array.from({ length: 3 }) as _, i}
        <div class="tactile-box p-4 space-y-2">
          <Skeleton className="h-4 w-24" /><Skeleton
            className="h-3 w-full"
          /><Skeleton className="h-8 w-full" />
        </div>
      {/each}
    {:else if invoices.length === 0}
      <p class="text-center text-[var(--text-muted)] py-6 text-sm">
        Belum ada invoice
      </p>
    {:else}
      {#each invoices as iv (iv.id)}
        <div class="tactile-box p-4 space-y-2">
          <div class="flex items-center justify-between">
            <p class="font-mono text-xs font-bold">{iv.id}</p>
            <span
              class="text-xs font-semibold px-2.5 py-1 rounded-full {invStatusCls(
                iv.status,
              )}">{iv.status.toUpperCase()}</span
            >
          </div>
          <p class="font-bold">{fmtIDR(iv.amount)}</p>
          <div class="text-xs text-[var(--text-muted)] flex justify-between">
            <span>{fmtDate(iv.period_start)} — {fmtDate(iv.period_end)}</span>
          </div>
          {#if iv.status === "pending" || iv.status === "overdue"}
            <div class="flex gap-2 pt-1">
              <button
                class="tactile-btn flex-1 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                onclick={() => {
                  invTarget = iv;
                  invAction = "paid";
                }}>Lunas</button
              >
              <button
                class="tactile-btn flex-1 py-2 text-xs font-bold text-red-500"
                onclick={() => {
                  invTarget = iv;
                  invAction = "reject";
                }}>Tolak</button
              >
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>

<!-- Konfirmasi aksi invoice -->
<ConfirmModal
  open={invTarget !== null && invAction !== null}
  title={invAction === "paid" ? "Tandai Lunas" : "Tolak Invoice"}
  confirmLabel={invAction === "paid" ? "Ya, Lunas" : "Ya, Tolak"}
  busy={invBusy}
  onConfirm={doInvoiceAction}
  onClose={() => {
    invTarget = null;
    invAction = null;
  }}
>
  <p class="text-sm text-[var(--text-muted)] leading-relaxed">
    {#if invAction === "paid"}
      Tandai invoice <span class="font-bold text-[var(--text-main)]"
        >"{invTarget?.id}"</span
      > sebagai lunas? Subscription pending akan langsung aktif.
    {:else}
      Tolak invoice <span class="font-bold text-[var(--text-main)]"
        >"{invTarget?.id}"</span
      >? Subscription pending akan dibatalkan.
    {/if}
  </p>
</ConfirmModal>