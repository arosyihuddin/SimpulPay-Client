import { onMount } from 'svelte';
import { API_BASE } from './api';
import { auth } from './auth.svelte';

// WebSocket realtime — admin subscribe scope=admin, selain itu per-user (tanpa scope).
// Auto-reconnect 3s. API_BASE dari VITE_API_BASE. WS derived: http→ws, https→wss.
export function useWs(onEvent: (msg: { type: string; data?: any }) => void) {
  onMount(() => {
    const wsBase = API_BASE
      ? API_BASE.replace(/^https?:\/\//, (m) => (m === 'https://' ? 'wss://' : 'ws://'))
      : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout>;

    const connect = () => {
      const scope = auth.role === "admin" ? "?scope=admin" : "";
      ws = new WebSocket(`${wsBase}/ws${scope}`);
      ws.onmessage = (e) => {
        try {
          onEvent(JSON.parse(e.data));
        } catch { /* bad frame, skip */ }
      };
      ws.onclose = () => { retry = setTimeout(connect, 3000); };
    };
    connect();
    return () => { ws?.close(); clearTimeout(retry); };
  });
}