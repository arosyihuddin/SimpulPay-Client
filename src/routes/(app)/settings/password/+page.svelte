<script lang="ts">
  import { admin } from '$lib/api';
  import { goto } from '$app/navigation';

  let oldPw = $state('');
  let newPw = $state('');
  let confirm = $state('');
  let show = $state(false);
  let busy = $state(false);
  let err = $state('');
  const username = $state(typeof localStorage !== 'undefined' ? localStorage.getItem('gomerch_username') || '' : '');

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    busy = true; err = '';
    try {
      if (newPw.length < 8) throw new Error('Password baru minimal 8 karakter');
      if (newPw !== confirm) throw new Error('Konfirmasi password tidak cocok');
      await admin.changePassword(username, oldPw, newPw);
      goto('/settings');
    } catch (e: any) { err = e.message; }
    finally { busy = false; }
  }
</script>

<div class="max-w-md mx-auto space-y-5">
  <a href="/settings" class="tactile-btn w-11 h-11 flex items-center justify-center text-[var(--text-muted)]" title="Kembali ke Settings">
    <i class="fa-solid fa-arrow-left"></i>
  </a>

  <form onsubmit={submit} class="tactile-box p-8 space-y-5">
    <div class="flex items-center gap-3">
      <div class="tactile-btn w-12 h-12 flex items-center justify-center text-[var(--accent)] text-xl">
        <i class="fa-solid fa-key"></i>
      </div>
      <div>
        <h1 class="text-lg font-bold tracking-wide">Ganti Password</h1>
        <p class="text-xs text-[var(--text-muted)] font-medium">Akun: {username || '—'}</p>
      </div>
    </div>

    {#if err}<p class="text-xs font-semibold text-red-500 bg-red-100/70 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/30 rounded-xl px-3 py-2">{err}</p>{/if}

    <div class="space-y-1.5">
      <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Password Lama</label>
      <div class="input-well px-4 py-3 flex items-center">
        <i class="fa-solid fa-lock text-[var(--text-muted)] mr-3"></i>
        <input type={show ? 'text' : 'password'} bind:value={oldPw} placeholder="password saat ini" class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]" autofocus />
      </div>
    </div>
    <div class="space-y-1.5">
      <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Password Baru</label>
      <div class="input-well px-4 py-3 flex items-center">
        <i class="fa-solid fa-lock text-[var(--text-muted)] mr-3"></i>
        <input type={show ? 'text' : 'password'} bind:value={newPw} placeholder="minimal 8 karakter" class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]" />
      </div>
    </div>
    <div class="space-y-1.5">
      <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Konfirmasi Password Baru</label>
      <div class="input-well px-4 py-3 flex items-center">
        <i class="fa-solid fa-lock text-[var(--text-muted)] mr-3"></i>
        <input type={show ? 'text' : 'password'} bind:value={confirm} placeholder="ulangi password baru" class="bg-transparent w-full text-sm focus:outline-none placeholder:text-[var(--text-muted)]" />
        <button type="button" onclick={() => (show = !show)} class="text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer" title={show ? 'Sembunyikan password' : 'Lihat password'}>
          <i class="fa-solid {show ? 'fa-eye-slash' : 'fa-eye'} ml-2"></i>
        </button>
      </div>
    </div>

    <div class="flex gap-2 pt-2">
      <button disabled={busy} class="tactile-btn flex-1 py-4 font-bold text-[var(--accent)] flex items-center justify-center gap-2">
        <i class="fa-solid fa-floppy-disk"></i> {busy ? 'Menyimpan...' : 'Simpan'}
      </button>
      <a href="/settings" class="tactile-btn px-5 py-3 text-sm text-[var(--text-muted)]">Batal</a>
    </div>
  </form>
</div>