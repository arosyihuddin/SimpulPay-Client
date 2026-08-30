// Auth store (Svelte 5 runes) — ganti useAuth context React. State shared via module singleton.
import { admin } from "./api";

export const auth = $state({
  authed: false,
  needsSetup: false,
  ready: false,
  role: "user" as string,
});

export async function checkAuth() {
  try {
    const r = await admin.me();
    auth.authed = true;
    auth.needsSetup = false;
    auth.role = (r.data as any)?.role || "admin";
  } catch {
    auth.authed = false;
    auth.role = "user";
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
