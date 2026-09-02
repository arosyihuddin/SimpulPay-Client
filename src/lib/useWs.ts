import { onMount } from 'svelte';
import { API_BASE } from './api';
import { auth } from './auth.svelte';

// WebSocket singleton — SATU koneksi untuk semua komponen, berapa pun useWs()
// dipanggil. Sebelumnya tiap useWs() buka socket sendiri → satu event backend
// diterima N socket → toast/load jalan N kali.
// Di sini useWs(cb) cuma daftar listener; socket dibuka sekali, auto-reconnect 3s,
// dan tunggu auth.ready utk scope admin (role bener).

const listeners = new Set<(msg: { type: string; data?: any }) => void>();
let socket: WebSocket | null = null;
let retry: ReturnType<typeof setTimeout> | null = null;
let waitAuth: ReturnType<typeof setInterval> | null = null;

function connectNow() {
  if (socket || retry) return; // udah up atau bakal reconnect — jangan dobel.
  const wsBase = API_BASE
    ? API_BASE.replace(/^https?:\/\//, (m) => (m === 'https://' ? 'wss://' : 'ws://'))
    : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  const scope = auth.role === "admin" ? "?scope=admin" : "";
  socket = new WebSocket(`${wsBase}/ws${scope}`);
  socket.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      listeners.forEach((cb) => cb(msg));
    } catch { /* bad frame, skip */ }
  };
  socket.onclose = () => {
    socket = null;
    retry = setTimeout(() => { retry = null; connectNow(); }, 3000);
  };
}

// Amankan connect: cuma SATU watcher auth, dan connectNow dipanggil sekali.
function ensureSocket() {
  if (socket || retry || waitAuth) return;
  if (!auth.ready) {
    waitAuth = setInterval(() => {
      if (auth.ready) {
        clearInterval(waitAuth!);
        waitAuth = null;
        connectNow();
      }
    }, 100);
    return;
  }
  connectNow();
}

export function useWs(onEvent: (msg: { type: string; data?: any }) => void) {
  listeners.add(onEvent);
  onMount(() => {
    ensureSocket();
    return () => { listeners.delete(onEvent); };
  });
}
