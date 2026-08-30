<script lang="ts">
  // Admin announcements — broadcast informasi ke semua user (CRUD real /admin/announcements).
  import { onMount } from 'svelte';
  import { admin } from '$lib/api';
  import { addToast } from '$lib/toast.svelte';

  interface Announcement {
    id: number;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'important';
    active: boolean;
    created_at: number;
  }

  const TYPE_META: Record<string, { label: string; icon: string; cls: string }> = {
    info: { label: 'Info', icon: 'fa-solid fa-circle-info', cls: 'bg-blue-100/70 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/30' },
    warning: { label: 'Peringatan', icon: 'fa-solid fa-triangle-exclamation', cls: 'bg-amber-100/70 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/30' },
    important: { label: 'Penting', icon: 'fa-solid fa-shield-halved', cls: 'bg-red-100/70 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-500/30' },
  };
  const typeMeta = (t: string) => TYPE_META[t] || TYPE_META.info;

  let items = $state<Announcement[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let err = $state('');

  let modal = $state(false);
  let editing = $state<Announcement | null>(null);
  let form = $state({ title: '', message: '', type: 'info', active: true });
  let formErr = $state('');
  let saving = $state(false);

  const fmtDate = (n: number) => new Date(n).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = (n: number) => new Date(n).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  async function load() {
    loading = true; err = '';
    try {
      const r = await admin.listAnnouncements();
      items = r.data.announcements;
      total = r.data.total;
    } catch (e: any) { err = e.message; }
    finally { loading = false; }
  }
  onMount(load);

  function openAdd() {
    editing = null;
    form = { title: '', message: '', type: 'info', active: true };
    formErr = '';
    modal = true;
  }
  function openEdit(a: Announcement) {
    editing = a;
    form = { title: a.title, message: a.message, type: a.type, active: a.active };
    formErr = '';
    modal = true;
  }
  async function save() {
    formErr = '';
    const title = form.title.trim();
    const message = form.message.trim();
    if (title.length < 2) { formErr = 'Judul minimal 2 karakter.'; return; }
    if (message.length < 2) { formErr = 'Isi minimal 2 karakter.'; return; }
    saving = true;
    try {
      const body = { title, message, type: form.type, active: form.active };
      if (editing) await admin.updateAnnouncement(editing.id, body);
      else await admin.createAnnouncement(body);
      modal = false;
      load();
      addToast('success', editing ? 'Pengumuman diperbarui.' : 'Pengumuman dikirim.');
    } catch (e: any) { formErr = e.message; }
    finally { saving = false; }
  }
  async function toggleActive(a: Announcement) {
    try {
      await admin.updateAnnouncement(a.id, { active: !a.active });
      items = items.map((x) => (x.id === a.id ? { ...x, active: !a.active } : x));
      addToast('success', a.active ? 'Pengumuman dinonaktifkan.' : 'Pengumuman diaktifkan.');
    } catch (e: any) { err = e.message; }
  }
  async function del(a: Announcement) {
    if (!confirm(`Hapus pengumuman "${a.title}"?`)) return;
    try {
      await admin.deleteAnnouncement(a.id);
      items = items.filter((x) => x.id !== a.id);
      total--;
      addToast('success', 'Pengumuman dihapus.');
    } catch (e: any) { err = e.message; }
  }
</script>

<div class="space-y-6">
  {#if err}<p class="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-2xl px-4 py-3"><i class="fa-solid fa-circle-exclamation mr-2"></i>{err}</p>{/if}

  <div class="flex items-center justify-between gap-3">
    <div class="text-xs text-[var(--text-muted)] font-medium">
      <span class="font-bold text-[var(--text-main)]">{total}</span> pengumuman total
    </div>
    <button onclick={openAdd} class="tactile-btn px-4 py-2.5 font-bold text-[var(--accent)] text-sm flex items-center gap-2">
      <i class="fa-solid fa-bullhorn"></i> Buat Pengumuman
    </button>
  </div>

  {#if loading}
    <p class="text-xs text-[var(--text-muted)]">Memuat...</p>
  {:else if items.length === 0}
    <div class="tactile-box p-10 text-center text-sm text-[var(--text-muted)]">
      Belum ada pengumuman. Klik <span class="font-bold text-[var(--accent)]">Buat Pengumuman</span> untuk broadcast ke semua user.
    </div>
  {:else}
    <div class="hidden md:block tactile-box overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
            <th class="px-4 py-3 font-medium">Judul</th>
            <th class="px-4 py-3 font-medium">Tipe</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium">Dibuat</th>
            <th class="px-4 py-3 font-medium text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each items as a (a.id)}
            <tr class="border-b border-[var(--border-subtle)]/50 last:border-0">
              <td class="px-4 py-3">
                <p class="font-bold">{a.title}</p>
                <p class="text-xs text-[var(--text-muted)] truncate max-w-xs">{a.message}</p>
              </td>
              <td class="px-4 py-3"><span class="text-xs font-semibold px-2.5 py-1 rounded-full {typeMeta(a.type).cls}">{a.type}</span></td>
              <td class="px-4 py-3">
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full {a.active ? 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30' : 'bg-slate-200/60 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-slate-600/40'}">{a.active ? 'Aktif' : 'Nonaktif'}</span>
              </td>
              <td class="px-4 py-3 text-xs">{fmtDate(a.created_at)}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button class="tactile-btn px-3 py-1.5 text-xs font-bold text-[var(--text-muted)]" onclick={() => toggleActive(a)} title={a.active ? 'Nonaktifkan' : 'Aktifkan'} aria-label={a.active ? 'Nonaktifkan pengumuman' : 'Aktifkan pengumuman'}><i class="fa-solid {a.active ? 'fa-eye-slash' : 'fa-eye'}"></i></button>
                  <button class="tactile-btn px-3 py-1.5 text-xs font-bold text-[var(--accent)]" onclick={() => openEdit(a)} aria-label="Edit pengumuman"><i class="fa-solid fa-pen"></i></button>
                  <button class="tactile-btn px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400" onclick={() => del(a)} aria-label="Hapus pengumuman"><i class="fa-solid fa-trash-can"></i></button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="md:hidden space-y-3">
      {#each items as a (a.id)}
        <div class="tactile-box p-4 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <p class="font-bold flex items-center gap-2">{a.title}
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full {typeMeta(a.type).cls}">{a.type}</span>
            </p>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full {a.active ? 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30' : 'bg-slate-200/60 dark:bg-slate-700/40 text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-slate-600/40'}">{a.active ? 'Aktif' : 'Nonaktif'}</span>
          </div>
          <p class="text-xs text-[var(--text-muted)]">{a.message}</p>
          <p class="text-[10px] text-[var(--text-muted)]">{fmtTime(a.created_at)}</p>
          <div class="flex gap-2">
            <button class="tactile-btn flex-1 py-2 text-xs font-bold text-[var(--text-muted)]" onclick={() => toggleActive(a)}><i class="fa-solid {a.active ? 'fa-eye-slash' : 'fa-eye'} mr-1"></i>{a.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
            <button class="tactile-btn px-3 py-2 text-xs font-bold text-[var(--accent)]" onclick={() => openEdit(a)} aria-label="Edit pengumuman"><i class="fa-solid fa-pen"></i></button>
            <button class="tactile-btn px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400" onclick={() => del(a)} aria-label="Hapus pengumuman"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Tambah/Edit modal -->
{#if modal}
  <div class="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup" class="fixed inset-0 z-40 cursor-default" onclick={() => (modal = false)}></button>
    <div class="tactile-modal w-full max-w-md p-6 relative z-50">
      <div class="flex justify-between items-center mb-4 pb-2 border-b border-[var(--border-subtle)]">
        <h3 class="text-lg font-bold">{editing ? 'Edit Pengumuman' : 'Buat Pengumuman'}</h3>
        <button type="button" aria-label="Tutup" onclick={() => (modal = false)} class="tactile-btn w-8 h-8 flex items-center justify-center text-[var(--text-muted)]"><i class="fa-solid fa-xmark"></i></button>
      </div>

      {#if formErr}
        <p class="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-4">{formErr}</p>
      {/if}

      <div class="space-y-4">
        <div>
          <label for="ann-title" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Judul</label>
          <input id="ann-title" bind:value={form.title} placeholder="Maintenance malam ini" class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <div>
          <label for="ann-message" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Isi</label>
          <textarea id="ann-message" bind:value={form.message} rows="4" placeholder="Detail informasi untuk user..." class="w-full tactile-inset px-4 py-2.5 text-sm focus:outline-none resize-none"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="ann-type" class="block text-xs font-bold text-[var(--text-muted)] mb-1">Tipe</label>
            <select id="ann-type" bind:value={form.type} class="w-full tactile-inset px-3 py-2.5 text-sm focus:outline-none cursor-pointer">
              <option value="info">Info</option>
              <option value="warning">Peringatan</option>
              <option value="important">Penting</option>
            </select>
          </div>
          <div>
            <span class="block text-xs font-bold text-[var(--text-muted)] mb-1">Status</span>
            <button
              type="button"
              onclick={() => (form.active = !form.active)}
              class="tactile-btn w-full py-2.5 text-sm font-bold {form.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-muted)]'} flex items-center justify-center gap-2"
            >
              <i class="fa-solid {form.active ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
              {form.active ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button disabled={saving} onclick={save} class="tactile-btn flex-1 py-3 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
            <i class="fa-solid fa-bullhorn"></i> {saving ? 'Menyimpan...' : editing ? 'Simpan' : 'Kirim'}
          </button>
          <button onclick={() => (modal = false)} class="tactile-btn px-5 py-3 text-sm text-[var(--text-muted)]">Batal</button>
        </div>
      </div>
    </div>
  </div>
{/if}
