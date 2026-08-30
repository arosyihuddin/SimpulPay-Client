<script lang="ts">
  import Pagination from '$lib/components/Pagination.svelte';
  import { admin } from '$lib/api';

  // User sistem GoMerch — data dari backend (GET /admin/users).
  // Field billing (name/email/plan/status/key/next) opsional; terisi setelah backend di-update.

  interface User {
    id: string;
    username: string;
    role: string;
    created_at: number;
    updated_at: number;
    name?: string;
    email?: string;
    plan?: string;
    status?: string;
    next?: string;
    key?: string;
    lastActive?: string;
    joined?: string;
  }

  let users = $state<User[]>([]);
  let loading = $state(true);
  let loadErr = $state('');

  async function load() {
    loading = true;
    loadErr = '';
    try {
      const r = await admin.listUsers();
      users = r.data.users;
    } catch (e: any) {
      loadErr = e.message;
    } finally {
      loading = false;
    }
  }
  $effect(() => { load(); });

  let q = $state('');
  const PAGE_SIZE = 5;
  let page = $state(1);
  const filtered = $derived(users.filter((u) =>
    (u.name || u.username).toLowerCase().includes(q.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(q.toLowerCase()) ||
    u.role.toLowerCase().includes(q.toLowerCase())));
  const pageItems = $derived(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
  function setPage(p: number) { page = p; }
  $effect(() => { if (page > Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))) page = 1; });

  const active = $derived(users.filter((u) => u.status === 'Active').length);
  const trial = $derived(users.filter((u) => u.status === 'Trial').length);
  const overdue = $derived(users.filter((u) => u.status === 'Overdue').length);
  const suspended = $derived(users.filter((u) => u.status === 'Suspended').length);

  const ROLES = ['admin', 'user'];
  const STATUSES = ['Active', 'Trial', 'Overdue', 'Suspended'];
  const PLAN_OPTS = ['Basic', 'Pro', 'Enterprise'];
  const KEY_STATUSES = ['Aktif', 'Terbatas', 'Nonaktif'];

  const roleLabel = (r: string) => (r === 'admin' ? 'admin' : 'customer');
  const roleCls = (r: string) =>
    r === 'admin'
      ? 'bg-violet-100/70 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-500/30'
      : 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30';
  const statusCls = (st: string | undefined) =>
    st === 'Active' ? 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30'
    : st === 'Trial' ? 'bg-blue-100/70 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/30'
    : st === 'Overdue' ? 'bg-amber-100/70 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/30'
    : 'bg-red-100/70 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-500/30';

  const displayName = (u: User) => u.name || u.username;
  const initials = (u: User) => displayName(u).split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const fmtDate = (iso: string | number | undefined) =>
    iso ? new Date(typeof iso === 'number' ? iso : iso + (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? 'T00:00:00' : '')).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtTime = (ts: number) => ts ? new Date(ts).toLocaleString('id-ID') : '—';
  const avatarCls = (u: User) =>
    u.status === 'Active' ? 'text-emerald-600 dark:text-emerald-300'
    : u.status === 'Trial' ? 'text-blue-600 dark:text-blue-300'
    : u.status === 'Overdue' ? 'text-amber-600 dark:text-amber-300'
    : 'text-red-600 dark:text-red-300';

  // ---- Detail user modal ----
  let detailOpen = $state(false);
  let sel = $state<User | null>(null);
  function openDetail(u: User) { sel = u; detailOpen = true; }

  // ---- Form tambah / edit ----
  let editOpen = $state(false);
  let editing = $state<User | null>(null);
  const emptyForm = () => ({ username: '', password: '', role: 'user', name: '', email: '', plan: 'Basic', status: 'Active', next: '', key: 'Aktif' });
  let form = $state(emptyForm());
  let showPass = $state(false);
  let formErr = $state('');
  let saving = $state(false);

  function openEdit(u: User) {
    editing = u;
    showPass = false;
    formErr = '';
    form = { username: u.username, password: '', role: u.role, name: u.name || '', email: u.email || '', plan: u.plan || 'Basic', status: u.status || 'Active', next: u.next || '', key: u.key || 'Aktif' };
    editOpen = true;
  }
  function openAdd() {
    editing = null;
    showPass = false;
    formErr = '';
    form = emptyForm();
    editOpen = true;
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  async function save() {
    formErr = '';
    const username = form.username.trim();
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name || !email) { formErr = 'Nama dan email wajib diisi.'; return; }
    if (!EMAIL_RE.test(email)) { formErr = 'Format email tidak valid.'; return; }
    if (username.length < 3) { formErr = 'Username minimal 3 karakter.'; return; }
    if (!editing && form.password.length < 8) { formErr = 'Password minimal 8 karakter.'; return; }
    if (editing && form.password && form.password.length < 8) { formErr = 'Password minimal 8 karakter.'; return; }
    if (!ROLES.includes(form.role)) { formErr = 'Role tidak valid.'; return; }
    const extra = { name, email, plan: form.plan, status: form.status, next: form.next, key: form.key };
    saving = true;
    try {
      if (editing) {
        const patch: any = { username, role: form.role, ...extra };
        if (form.password) patch.password = form.password;
        await admin.updateUser(editing.id, patch);
      } else {
        await admin.createUser(username, form.password, form.role, extra);
      }
      await load();
      editOpen = false;
    } catch (e: any) {
      formErr = e.message;
    } finally {
      saving = false;
    }
  }

  // ---- Hapus user ----
  let delTarget = $state<User | null>(null);
  let delBusy = $state(false);
  let delErr = $state('');
  async function confirmDelete() {
    if (!delTarget) return;
    const id = delTarget.id;
    delBusy = true;
    delErr = '';
    try {
      await admin.deleteUser(id);
      users = users.filter((u) => u.id !== id);
      delTarget = null;
    } catch (e: any) {
      delErr = e.message;
    } finally {
      delBusy = false;
    }
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

  <!-- Cari + Tambah -->
  <div class="flex items-center gap-3">
    <div class="relative flex-1 max-w-md">
      <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm"></i>
      <input
        type="text"
        bind:value={q}
        placeholder="Cari nama, email, atau role..."
        class="w-full tactile-inset pl-10 pr-4 py-2.5 text-sm focus:outline-none placeholder:text-[var(--text-muted)]"
      />
    </div>
    <button onclick={openAdd} class="tactile-btn px-4 py-2.5 font-bold text-[var(--accent)] text-sm flex items-center gap-2 whitespace-nowrap">
      <i class="fa-solid fa-plus"></i> Tambah
    </button>
  </div>

  {#if loadErr}
    <p class="text-sm font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
      <span>{loadErr}</span>
      <button onclick={load} class="text-[var(--accent)] font-bold">Coba lagi</button>
    </p>
  {:else if loading}
    <div class="tactile-box divide-y divide-[var(--border-subtle)]/50">
      {#each Array(5) as _}
        <div class="p-4 flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-[var(--border-subtle)]/60 animate-pulse"></div>
          <div class="space-y-2 flex-1">
            <div class="h-3 w-1/3 bg-[var(--border-subtle)]/60 animate-pulse rounded"></div>
            <div class="h-2.5 w-1/4 bg-[var(--border-subtle)]/60 animate-pulse rounded"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Tabel desktop -->
    <div class="hidden md:block tactile-box overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
            <th class="px-4 py-3 font-medium">User</th>
            <th class="px-4 py-3 font-medium">Plan</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium">Role</th>
            <th class="px-4 py-3 font-medium">Tagihan</th>
            <th class="px-4 py-3 font-medium">API Key</th>
            <th class="px-4 py-3 font-medium text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each pageItems as u (u.id)}
            <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-emerald-500/10 tactile-inset flex items-center justify-center text-xs font-extrabold {avatarCls(u)}">
                    {initials(u)}
                  </div>
                  <div>
                    <p class="font-bold">{displayName(u)}</p>
                    <p class="text-xs text-[var(--text-muted)]">{u.email || '—'}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 font-semibold">{u.plan || '—'}</td>
              <td class="px-4 py-3">
                {#if u.status}
                  <span class="text-xs font-semibold px-2.5 py-1 rounded-full {statusCls(u.status)}">{u.status}</span>
                {:else}
                  <span class="text-xs text-[var(--text-muted)]">—</span>
                {/if}
              </td>
              <td class="px-4 py-3"><span class="text-xs font-semibold px-2.5 py-1 rounded-full {roleCls(u.role)}">{roleLabel(u.role)}</span></td>
              <td class="px-4 py-3 text-xs text-[var(--text-muted)]">{fmtDate(u.next)}</td>
              <td class="px-4 py-3 text-xs text-[var(--text-muted)]">{u.key || '—'}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button class="tactile-btn px-3 py-1.5 text-xs font-bold text-[var(--accent)]" onclick={() => openDetail(u)}>Lihat</button>
                  <button aria-label="Edit {u.username}" class="tactile-btn px-3 py-1.5 text-xs font-bold text-[var(--text-muted)]" onclick={() => openEdit(u)}><i class="fa-solid fa-pen"></i></button>
                  <button aria-label="Hapus {u.username}" class="tactile-btn px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400" onclick={() => (delTarget = u)}><i class="fa-solid fa-trash-can"></i></button>
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
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 tactile-inset flex items-center justify-center text-xs font-extrabold {avatarCls(u)}">
              {initials(u)}
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-bold truncate">{displayName(u)}</p>
              <p class="text-xs text-[var(--text-muted)] truncate">{u.email || u.username}</p>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full {roleCls(u.role)}">{roleLabel(u.role)}</span>
          </div>
          <div class="flex items-center gap-2">
            {#if u.status}
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full {statusCls(u.status)}">{u.status}</span>
            {/if}
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--border-subtle)]/50 text-[var(--text-muted)]">{u.plan || '—'}</span>
            <span class="text-xs font-mono text-[var(--text-muted)] ml-auto">{u.id}</span>
          </div>
          <div class="text-xs text-[var(--text-muted)] flex justify-between">
            <span>Tagihan: {fmtDate(u.next)}</span>
            <span>Key: {u.key || '—'}</span>
          </div>
          <div class="flex gap-2">
            <button class="tactile-btn flex-1 py-2 text-xs font-bold text-[var(--accent)]" onclick={() => openDetail(u)}>Lihat</button>
            <button aria-label="Edit {u.username}" class="tactile-btn px-3 py-2 text-xs font-bold text-[var(--text-muted)]" onclick={() => openEdit(u)}><i class="fa-solid fa-pen"></i></button>
            <button aria-label="Hapus {u.username}" class="tactile-btn px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400" onclick={() => (delTarget = u)}><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
      {/each}
      {#if filtered.length === 0}
        <p class="text-center text-sm text-[var(--text-muted)] py-8 font-semibold">Tidak ada user cocok dengan pencarian.</p>
      {:else}
        <Pagination {page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      {/if}
    </div>
  {/if}
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
        <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 tactile-inset flex items-center justify-center font-extrabold {avatarCls(sel)}">
          {initials(sel)}
        </div>
        <div>
          <p class="font-bold">{displayName(sel)}</p>
          <p class="text-xs text-[var(--text-muted)]">{sel.email || sel.username}</p>
        </div>
      </div>

      <div class="text-sm space-y-2.5">
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)]">User ID</span>
          <span class="font-mono text-xs">{sel.id}</span>
        </div>
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)]">Username</span>
          <span class="font-semibold">{sel.username}</span>
        </div>
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)]">Role</span>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full {roleCls(sel.role)}">{roleLabel(sel.role)}</span>
        </div>
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)]">Plan</span>
          <span class="font-semibold">{sel.plan || '—'}</span>
        </div>
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)]">Status</span>
          {#if sel.status}
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full {statusCls(sel.status)}">{sel.status}</span>
          {:else}
            <span class="text-[var(--text-muted)]">—</span>
          {/if}
        </div>
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)]">Status API Key</span>
          <span class="font-semibold">{sel.key || '—'}</span>
        </div>
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)]">Tagihan Berikutnya</span>
          <span class="font-semibold">{fmtDate(sel.next)}</span>
        </div>
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)]">Aktif Terakhir</span>
          <span class="font-semibold">{sel.lastActive || '—'}</span>
        </div>
        <div class="flex justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <span class="text-[var(--text-muted)]">Dibuat</span>
          <span class="font-semibold">{fmtTime(sel.created_at)}</span>
        </div>
        <div class="flex justify-between gap-3 pb-2">
          <span class="text-[var(--text-muted)]">Diperbarui</span>
          <span class="font-semibold">{fmtTime(sel.updated_at)}</span>
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

<!-- Form tambah / edit modal -->
{#if editOpen}
  <div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={() => (editOpen = false)}></button>
    <div class="tactile-modal w-full max-w-md p-6 relative z-50">
      <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
        <h3 class="text-lg font-bold">{editing ? 'Edit User' : 'Tambah User'}</h3>
        <button type="button" aria-label="Tutup" onclick={() => (editOpen = false)} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="space-y-4">
        {#if formErr}
          <p class="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{formErr}</p>
        {/if}
        <div>
          <label for="user-name" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Nama</label>
          <input id="user-name" bind:value={form.name} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <div>
          <label for="user-email" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Email</label>
          <input id="user-email" type="email" bind:value={form.email} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <div>
          <label for="user-username" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Username</label>
          <input id="user-username" bind:value={form.username} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="user-role" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Role</label>
            <select id="user-role" bind:value={form.role} class="w-full tactile-inset px-3 py-2.5 text-sm focus:outline-none cursor-pointer">
              <option value="admin">admin</option>
              <option value="user">customer</option>
            </select>
          </div>
          <div>
            <label for="user-plan" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Plan</label>
            <select id="user-plan" bind:value={form.plan} class="w-full tactile-inset px-3 py-2.5 text-sm focus:outline-none cursor-pointer">
              {#each PLAN_OPTS as p (p)}
                <option value={p}>{p}</option>
              {/each}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="user-status" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Status</label>
            <select id="user-status" bind:value={form.status} class="w-full tactile-inset px-3 py-2.5 text-sm focus:outline-none cursor-pointer">
              {#each STATUSES as st (st)}
                <option value={st}>{st}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="user-key" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Status API Key</label>
            <select id="user-key" bind:value={form.key} class="w-full tactile-inset px-3 py-2.5 text-sm focus:outline-none cursor-pointer">
              {#each KEY_STATUSES as k (k)}
                <option value={k}>{k}</option>
              {/each}
            </select>
          </div>
        </div>
        <div>
          <label for="user-next" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Tagihan Berikutnya</label>
          <input id="user-next" type="date" bind:value={form.next} class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <div>
          <label for="user-pass" class="block text-xs font-bold text-[var(--text-muted)] mb-1">{editing ? 'Password Baru (opsional)' : 'Password'}</label>
          <div class="relative">
            <input
              id="user-pass"
              type={showPass ? 'text' : 'password'}
              bind:value={form.password}
              class="w-full tactile-inset pl-4 pr-11 py-2.5 text-sm focus:outline-none"
            />
            <button
              type="button"
              onclick={() => (showPass = !showPass)}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer"
              title={showPass ? 'Sembunyikan password' : 'Lihat password'}
            >
              <i class="fa-solid {showPass ? 'fa-eye-slash' : 'fa-eye'}"></i>
            </button>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button disabled={saving} onclick={save} class="tactile-btn flex-1 py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
            <i class="fa-solid fa-floppy-disk"></i> {saving ? 'Menyimpan...' : editing ? 'Simpan' : 'Tambah'}
          </button>
          <button onclick={() => (editOpen = false)} class="tactile-btn px-5 py-3 text-sm text-[var(--text-muted)]">Batal</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Konfirmasi hapus -->
{#if delTarget}
  <div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={() => (delTarget = null)}></button>
    <div class="tactile-modal w-full max-w-sm p-6 relative z-50">
      <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
        <h3 class="text-lg font-bold text-red-600 dark:text-red-400">Hapus User</h3>
        <button type="button" aria-label="Tutup" onclick={() => (delTarget = null)} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <p class="text-sm text-[var(--text-muted)]">
        Yakin hapus user <span class="font-bold text-[var(--text)]">'{delTarget.name || delTarget.username}'</span>? Tindakan ini tidak bisa dibatalkan.
      </p>
      {#if delErr}
        <p class="mt-3 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{delErr}</p>
      {/if}
      <div class="flex gap-2 pt-5">
        <button disabled={delBusy} onclick={confirmDelete} class="tactile-btn flex-1 py-3 font-bold text-red-600 dark:text-red-400 flex items-center justify-center gap-2">
          <i class="fa-solid fa-trash-can"></i> {delBusy ? 'Menghapus...' : 'Hapus'}
        </button>
        <button onclick={() => (delTarget = null)} class="tactile-btn px-5 py-3 text-sm text-[var(--text-muted)]">Batal</button>
      </div>
    </div>
  </div>
{/if}
