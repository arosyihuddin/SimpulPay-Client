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

export async function checkAuth() {
  try {
    const r = await admin.me();
    auth.authed = true;
    auth.maintenance = false;
    const d = r.data as any;
    auth.id = d?.id || "";
    auth.email = d?.email || "";
    auth.name = d?.name || "";
    auth.phone = d?.phone || "";
    auth.role = d?.role || "admin";
    auth.status = d?.status || "";
  } catch (e: any) {
    auth.authed = false;
    auth.maintenance = !!e?.maintenance_mode;
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
