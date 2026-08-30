// Toast store — module singleton. Push notifikasi, auto-dismiss 3 detik.
export interface ToastMsg {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const toasts = $state<ToastMsg[]>([]);

export function addToast(type: ToastMsg['type'], message: string) {
  const id = crypto.randomUUID();
  toasts.push({ id, type, message });
  setTimeout(() => {
    const idx = toasts.findIndex((t) => t.id === id);
    if (idx !== -1) toasts.splice(idx, 1);
  }, 3000);
}

export function removeToast(id: string) {
  const idx = toasts.findIndex((t) => t.id === id);
  if (idx !== -1) toasts.splice(idx, 1);
}