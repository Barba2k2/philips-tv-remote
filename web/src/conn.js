// Direct JointSpace (Philips) client. No backend: the page talks to the TV over plain HTTP on the LAN.
// The TV answers OPTIONS with 405, so every fetch must be a CORS "simple request":
// POST/GET, string body, Content-Type text/plain, no custom headers.
import { useSyncExternalStore } from 'react';

const IP_KEY = 'controle.tvIp';
const DEFAULT_IP = '192.168.0.155';
const POLL_MS = 4000;
const TIMEOUT_MS = 2500;

// Remote command name -> JointSpace key.
const KEYS = {
  up: 'CursorUp', down: 'CursorDown', left: 'CursorLeft', right: 'CursorRight',
  ok: 'Confirm', back: 'Back', home: 'Home', play: 'PlayPause', pause: 'Pause', stop: 'Stop',
  rew: 'Rewind', ffwd: 'FastForward', mute: 'Mute', power: 'Standby',
  volUp: 'VolumeUp', volDown: 'VolumeDown', chUp: 'ChannelStepUp', chDown: 'ChannelStepDown',
  source: 'Source', options: 'Options', info: 'Info', adjust: 'Adjust', watchTv: 'Watch tv',
};

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };

let state = {
  status: 'connecting', // connecting | online | offline
  tvName: 'TV Philips',
  tvIp: read(IP_KEY) || DEFAULT_IP,
  tvOnline: false,
  latency: null,
  tv: { volume: 30, muted: false },
};
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };

let range = { min: 0, max: 60 };
let timer = null;
const base = () => `http://${state.tvIp}:1925/6`;

async function request(path, method, body) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(base() + path, { method, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally { clearTimeout(t); }
}

async function poll() {
  const started = performance.now();
  try {
    const v = await (await request('/audio/volume', 'GET')).json();
    range = { min: v.min, max: v.max };
    set({
      status: 'online', tvOnline: true, latency: Math.round(performance.now() - started),
      tv: { volume: Math.round(((v.current - v.min) / (v.max - v.min)) * 100), muted: v.muted },
    });
  } catch {
    set({ status: 'offline', tvOnline: false, latency: null });
  }
}

function schedule() {
  clearInterval(timer);
  timer = setInterval(() => { if (document.visibilityState === 'visible') poll(); }, POLL_MS);
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') poll(); });
window.addEventListener('online', poll);

const sendKey = async (key) => {
  try { await request('/input/key', 'POST', { key }); } catch { set({ status: 'offline', tvOnline: false }); return false; }
  return true;
};

export const conn = {
  start() { poll(); schedule(); },
  async cmd(c) {
    const ok = await sendKey(KEYS[c] || c);
    if (ok && (c === 'volUp' || c === 'volDown' || c === 'mute')) poll();
    return ok;
  },
  // percent 0-100 of the TV's own volume range
  async volume(pct) {
    const current = Math.round(range.min + (pct / 100) * (range.max - range.min));
    try { await request('/audio/volume', 'POST', { muted: false, current }); } catch { set({ status: 'offline', tvOnline: false }); }
  },
  setIp(ip) {
    const next = ip.trim() || DEFAULT_IP;
    write(IP_KEY, next);
    set({ tvIp: next, status: 'connecting', tvOnline: false, latency: null });
    poll();
  },
};

export function useConn() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}
