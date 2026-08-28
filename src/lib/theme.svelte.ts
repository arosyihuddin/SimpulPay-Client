// Theme store (Svelte 5 runes) — ganti useTheme React. Dark toggle + persist localStorage.
// Module singleton: state dibagi semua komponen. Init dipanggil di +layout.
export const theme = $state({
  dark: true,
  ready: false,
});

let key = 'settings_theme';

export function themeInit() {
  if (theme.ready) return;
  theme.ready = true;
  if (typeof window === 'undefined') return;
  const saved = localStorage.getItem(key);
  theme.dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme();
}

export function toggleTheme() {
  theme.dark = !theme.dark;
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, theme.dark ? 'dark' : 'light');
    applyTheme();
  }
}

function applyTheme() {
  document.documentElement.classList.toggle('dark', theme.dark);
}