// Auth store (Svelte 5 runes) — ganti useAuth context React. State shared via module singleton.
import { admin } from './api';

export const auth = $state({
  authed: false,
  needsSetup: false,
  ready: false,
});

export async function checkAuth() {
  try {
    await admin.me();
    auth.authed = true;
    auth.needsSetup = false;
  } catch {
    auth.authed = false;
    try {
      const r = await admin.setupStatus();
      auth.needsSetup = r.needsSetup;
    } catch {
      auth.needsSetup = false;
    }
  } finally {
    auth.ready = true;
  }
}