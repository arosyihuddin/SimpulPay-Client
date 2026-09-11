// Auth store (Svelte 5 runes) — state shared via module singleton.
import { admin } from "./api";

export const auth = $state({
  authed: false,
  ready: false,
  maintenance: false,
  id: "",
  email: "",
  name: "",
  phone: "" as string | null,
  role: "user" as string,
  status: "",
});

// Hint login terakhir buat landing — cookie sesi HttpOnly tak bisa dibaca JS,
// jadi landing pakai penanda UI ini (bukan bukti auth; guard tetap via /me).
const AUTH_HINT_KEY = "sp_authed";

function writeHint(v: boolean) {
  try {
    if (typeof window === "undefined") return;
    if (v) localStorage.setItem(AUTH_HINT_KEY, "1");
    else localStorage.removeItem(AUTH_HINT_KEY);
  } catch {}
}

export function readAuthHint(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AUTH_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

interface MeData {
  id?: unknown;
  email?: unknown;
  name?: unknown;
  phone?: unknown;
  role?: unknown;
  status?: unknown;
}

function str(v: unknown, fb = ""): string {
  return typeof v === "string" ? v : fb;
}

export async function checkAuth() {
  try {
    const r: { data?: MeData } = await admin.me();
    auth.authed = true;
    auth.maintenance = false;
    writeHint(true);
    const d = r.data ?? {};
    auth.id = str(d.id);
    auth.email = str(d.email);
    auth.name = str(d.name);
    auth.phone = str(d.phone, "");
    auth.role = str(d.role, "admin");
    auth.status = str(d.status);
  } catch (e: unknown) {
    auth.authed = false;
    auth.maintenance =
      !!e && typeof e === "object" && "maintenance_mode" in e
        ? e.maintenance_mode === true
        : false;
    // Maintenance bukan logout — hint login dipertahankan biar tombol
    // Dashboard di landing tidak kedip jadi Masuk.
    if (!auth.maintenance) writeHint(false);
    auth.id = "";
    auth.email = "";
    auth.name = "";
    auth.phone = "";
    auth.role = "user";
    auth.status = "";
  } finally {
    auth.ready = true;
  }
}
