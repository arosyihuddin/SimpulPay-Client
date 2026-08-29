<script lang="ts">
  import Pagination from '$lib/components/Pagination.svelte';
  // Mockup users — akun user sistem GoMerch (pemakai API key). UI-only, data contoh.

  const USERS = [
    {
      id: 'U-2041', name: 'Rizki Ramadhan', email: 'rizki@nusantaradigital.co.id',
      plan: 'Pro', status: 'Active', role: 'Owner',
      statusCls: 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30',
      apiKey: 'gomerch_live_••••••••9f2a', key: 'Aktif', next: '2026-09-12', lastActive: '2 menit lalu', joined: '2026-08-12',
    },
    {
      id: 'U-2040', name: 'Sari Dewi Lestari', email: 'sari@aplikasiprima.id',
      plan: 'Enterprise', status: 'Active', role: 'Owner',
      statusCls: 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30',
      apiKey: 'gomerch_live_••••••••c1d8', key: 'Aktif', next: '2026-09-05', lastActive: '15 menit lalu', joined: '2026-08-05',
    },
    {
      id: 'U-2037', name: 'Bagus Pratama', email: 'bagus@berkah.online',
      plan: 'Basic', status: 'Trial', role: 'Member',
      statusCls: 'bg-blue-100/70 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/30',
      apiKey: 'gomerch_test_••••••••7b4e', key: 'Aktif', next: '2026-09-02', lastActive: '1 jam lalu', joined: '2026-08-19',
    },
    {
      id: 'U-2031', name: 'Nadia Ayu', email: 'nadia@kafedigital.id',
      plan: 'Pro', status: 'Overdue', role: 'Member',
      statusCls: 'bg-amber-100/70 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/30',
      apiKey: 'gomerch_live_••••••••5e10', key: 'Terbatas', next: '2026-08-28', lastActive: '2 hari lalu', joined: '2026-07-28',
    },
    {
      id: 'U-2025', name: 'Andi Saputra', email: 'andi@gadgetindo.co.id',
      plan: 'Basic', status: 'Suspended', role: 'Owner',
      statusCls: 'bg-red-100/70 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-500/30',
      apiKey: 'gomerch_live_••••••••3f77', key: 'Nonaktif', next: '2026-08-15', lastActive: '2 minggu lalu', joined: '2026-07-15',
    },
  ];

  const ROLES = ['Owner', 'Member'];
  const STATUSES = ['Active', 'Trial', 'Overdue', 'Suspended'];
  const PLAN_OPTS = ['Basic', 'Pro', 'Enterprise'];
  const KEY_STATUSES = ['Aktif', 'Terbatas', 'Nonaktif'];

  let users = $state(USERS);
  let q = $state('');
  const PAGE_SIZE = 3;
  let page = $state(1);
  const filtered = $derived(users.filter((u) =>
    u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())));
  const pageItems = $derived(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
  function setPage(p: number) { page = p; }
  $effect(() => { if (page > Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))) page = 1; });

  const active = $derived(users.filter((u) => u.status === 'Active').length);
  const trial = $derived(users.filter((u) => u.status === 'Trial').length);
  const overdue = $derived(users.filter((u) => u.status === 'Overdue').length);
  const suspended = $derived(users.filter((u) => u.status === 'Suspended').length);

  const fmtDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  const initials = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const avatarCls = (st: string) =>
    st === 'Active' ? 'text-emerald-600 dark:text-emerald-300'
    : st === 'Trial' ? 'text-blue-600 dark:text-blue-300'
    : st === 'Overdue' ? 'text-amber-600 dark:text-amber-300'
    : 'text-red-600 dark:text-red-300';

  // ---- Detail user modal ----
  let detailOpen = $state(false);
  let sel = $state<any>(null);
  function openDetail(u: any) { sel = u; detailOpen = true; }

  // ---- Edit user modal ----
  const statusCls = (st: string) =>
    st === 'Active' ? 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30'
    : st === 'Trial' ? 'bg-blue-100/70 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/30'
    : st === 'Overdue' ? 'bg-amber-100/70 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/30'
    : 'bg-red-100/70 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-500/30';

  let editOpen = $state(false);
  let editing = $state<any>(null);
  let form = $state({ name: '', email: '', plan: 'Basic', role: 'Owner', status: 'Active', next: '', key: 'Aktif' });
  function openEdit(u: any) {
    editing = u;
    form = { name: u.name, email: u.email, plan: u.plan, role: u.role, status: u.status, next: u.next, key: u.key };
    editOpen = true;
  }
  function saveEdit() {
    if (!form.name.trim() || !form.email.trim()) return;
    users = users.map((u) =>
      u.id === editing.id
        ? { ...u, name: form.name, email: form.email, plan: form.plan, role: form.role, status: form.status, next: form.next, key: form.key, statusCls: statusCls(form.status) }
        : u);
    editOpen = false;
  }
</script>

<div class="space-y-6">
  <!-- Ringkasan -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="tactile-box p-4">
      <p class="text-[11px] text-[var(--text-muted)] font-medium">Total User</p>
      <p class="text-xl font-extrabold">{users.length}</p>
    </div>
    <div class="tactile-box p-4">
      <p class="text-[11px] text-[var(--text-muted)] font-medium">Aktif</p>
      <p class="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{active}</p>
    </div>
    <div class="tactile-box p-4">
      <p class="text-[11px] text-[var(--text-muted)] font-medium">Trial</p>
      <p class="text-xl font-extrabold text-blue-600 dark:text-blue-400">{trial}</p>
    </div>
    <div class="tactile-box p-4">
      <p class="text-[11px] text-[var(--text-muted)] font-medium">Overdue / Suspended</p>
      <p class="text-xl font-extrabold text-amber-600 dark:text-amber-400">{overdue} / {suspended}</p>
    </div>
  </div>

  <!-- Filter -->
  <div class="relative max-w-md">
    <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm"></i>
    <input
      type="text"
      bind:value={q}
      placeholder="Cari nama atau email..."
      class="w-full tactile-inset pl-10 pr-4 py-2.5 text-sm focus:outline-none placeholder:text-[var(--text-muted)]"
    />
  </div>

  <!-- Tabel desktop -->
  <div class="hidden md:block tactile-box overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
          <th class="px-4 py-3 font-medium">User</th>
          <th class="px-4 py-3 font-medium">Plan</th>
          <th class="px-4 py-3 font-medium">Status</th>
          <th class="px-4 py-3 font-medium">Tagihan Berikutnya</th>
          <th class="px-4 py-3 font-medium">API Key</th>
          <th class="px-4 py-3 font-medium text-right">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {#each pageItems as u (u.id)}
          <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-emerald-500/10 tactile-inset flex items-center justify-center text-xs font-extrabold {avatarCls(u.status)}">
                  {initials(u.name)}
                </div>
                <div>
                  <p class="font-bold">{u.name}</p>
                  <p class="text-xs text-[var(--text-muted)]">{u.email}</p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 font-semibold">{u.plan}</td>
            <td class="px-4 py-3"><span class="text-xs font-semibold px-2.5 py-1 rounded-full {u.statusCls}">{u.status}</span></td>
            <td class="px-4 py-3 text-xs text-[var(--text-muted)]">{fmtDate(u.next)}</td>
            <td class="px-4 py-3 text-xs text-[var(--text-muted)]">{u.key}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <button class="tactile-btn px-3 py-1.5 text-xs font-bold text-[var(--accent)]" onclick={() => openDetail(u)}>Lihat</button>
                <button aria-label="Edit {u.name}" class="tactile-btn px-3 py-1.5 text-xs font-bold text-[var(--text-muted)]" onclick={() => openEdit(u)}><i class="fa-solid fa-pen"></i></button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    {#if filtered.length === 0}
      <p class="text-center text-sm text-[var(--text-muted)] py-8 font-semibold">Tidak ada user cocok dengan pencarian.</p>
    {:else}
      <Pagination {page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
    {/if}
  </div>

  <!-- Card mobile -->
  <div class="md:hidden space-y-3">
    {#each pageItems as u (u.id)}
      <div class="tactile-box p-4 space-y-2">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 tactile-inset flex items-center justify-center text-xs font-extrabold {avatarCls(u.status)}">
            {initials(u.name)}
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-bold truncate">{u.name}</p>
            <p class="text-xs text-[var(--text-muted)] truncate">{u.email}</p>
          </div>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full {u.statusCls}">{u.status}</span>
        </div>
        <p class="text-xs font-mono text-[var(--text-muted)]">{u.id} · {u.plan} · {u.role}</p>
        <div class="text-xs text-[var(--text-muted)] flex justify-between">
          <span>Tagihan: {fmtDate(u.next)}</span>
          <span>Key: {u.key}</span>
        </div>
        <div class="flex gap-2">
          <button class="tactile-btn flex-1 py-2 text-xs font-bold text-[var(--accent)]" onclick={() => openDetail(u)}>Lihat</button>
          <button aria-label="Edit {u.name}" class="tactile-btn px-3 py-2 text-xs font-bold text-[var(--text-muted)]" onclick={() => openEdit(u)}><i class="fa-solid fa-pen"></i></button>
        </div>
      </div>
    {/each}
    {#if filtered.length === 0}
      <p class="text-center text-sm text-[var(--text-muted)] py-8 font-semibold">Tidak ada user cocok dengan pencarian.</p>
    {:else}
      <Pagination {page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
    {/if}
  </div>
</div>

<!-- Detail user modal -->
{#if detailOpen && sel}
  <div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={() => (detailOpen = false)}></button>
    <div class="tactile-modal w-full max-w-md p-6 relative z-50">
      <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
        <h3 class="text-lg font-bold">Detail User</h3>
        <button type="button" aria-label="Tutup" onclick={() => (detailOpen = false)} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 tactile-inset flex items-center justify-center font-extrabold {avatarCls(sel.status)}">
          {initials(sel.name)}
        </div>
        <div>
          <p class="font-bold">{sel.name}</p>
          <p class="text-xs text-[var(--text-muted)]">{sel.email}</p>
        </div>
      </div>

      <div class="text-sm space-y-2.5">
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)]">User ID</span>
          <span class="font-mono text-xs">{sel.id}</span>
        </div>
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)]">Plan</span>
          <span class="font-semibold">{sel.plan}</span>
        </div>
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)]">Role</span>
          <span class="font-semibold">{sel.role}</span>
        </div>
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)]">Status</span>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full {sel.statusCls}">{sel.status}</span>
        </div>
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)]">API Key</span>
          <span class="font-mono text-xs">{sel.apiKey}</span>
        </div>
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)]">Aktif Terakhir</span>
          <span class="font-semibold">{sel.lastActive}</span>
        </div>
        <div class="flex justify-between gap-3 pb-2">
          <span class="text-[var(--text-muted)]">Bergabung</span>
          <span class="font-semibold">{fmtDate(sel.joined)}</span>
        </div>
      </div>

      <div class="flex gap-2 pt-5">
        <button onclick={() => (detailOpen = false)} class="tactile-btn flex-1 py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
          <i class="fa-solid fa-check"></i> Tutup
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Edit user modal -->
{#if editOpen && editing}
  <div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={() => (editOpen = false)}></button>
    <div class="tactile-modal w-full max-w-md p-6 relative z-50">
      <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
        <h3 class="text-lg font-bold">Edit User</h3>
        <button type="button" aria-label="Tutup" onclick={() => (editOpen = false)} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="space-y-4">
        <div>
          <label for="user-name" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Nama</label>
          <input id="user-name" bind:value={form.name} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <div>
          <label for="user-email" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Email</label>
          <input id="user-email" type="email" bind:value={form.email} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label for="user-plan" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Plan</label>
            <select id="user-plan" bind:value={form.plan} class="w-full tactile-inset px-3 py-2.5 text-sm focus:outline-none cursor-pointer">
              {#each PLAN_OPTS as p (p)}
                <option value={p}>{p}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="user-role" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Role</label>
            <select id="user-role" bind:value={form.role} class="w-full tactile-inset px-3 py-2.5 text-sm focus:outline-none cursor-pointer">
              {#each ROLES as r (r)}
                <option value={r}>{r}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="user-status" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Status</label>
            <select id="user-status" bind:value={form.status} class="w-full tactile-inset px-3 py-2.5 text-sm focus:outline-none cursor-pointer">
              {#each STATUSES as st (st)}
                <option value={st}>{st}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="user-next" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Tagihan Berikutnya</label>
            <input id="user-next" type="date" bind:value={form.next} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
          </div>
          <div>
            <label for="user-key" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Status API Key</label>
            <select id="user-key" bind:value={form.key} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none cursor-pointer">
              {#each KEY_STATUSES as k (k)}
                <option value={k}>{k}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button onclick={saveEdit} class="tactile-btn flex-1 py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
            <i class="fa-solid fa-floppy-disk"></i> Simpan
          </button>
          <button onclick={() => (editOpen = false)} class="tactile-btn px-5 py-3 text-sm text-[var(--text-muted)]">Batal</button>
        </div>
      </div>
    </div>
  </div>
{/if}
