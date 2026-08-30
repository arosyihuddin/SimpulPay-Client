// Merchant store — multi-merchant. List merchant milik user login + pilih aktif.
// Shared state via module singleton (pola sama auth.svelte.ts).
import { admin } from './api';

export interface Merchant {
  id: string;
  type: 'gopay' | 'shopeepay';
  name: string;
  status: string;
  gopay_merchant_id: string | null;
  qris_static_set: boolean;
  created_at: number;
  updated_at: number;
}

export const merchants = $state<{
  list: Merchant[];
  activeId: string | null;
  loading: boolean;
  error: string;
  active: Merchant | null;
}>({
  list: [],
  activeId: null,
  loading: false,
  error: '',
  get active() {
    return this.list.find((m: Merchant) => m.id === this.activeId) ?? null;
  },
});

export async function loadMerchants() {
  merchants.loading = true;
  merchants.error = '';
  try {
    const r = await admin.listMerchants();
    merchants.list = r.data.merchants;
    // Pertahankan active kalau masih ada di list, else pilih pertama.
    if (!merchants.activeId || !merchants.list.some((m) => m.id === merchants.activeId)) {
      merchants.activeId = merchants.list[0]?.id ?? null;
    }
  } catch (e: any) {
    merchants.error = e.message;
  } finally {
    merchants.loading = false;
  }
}

export function setActiveMerchant(id: string) {
  merchants.activeId = id;
}
