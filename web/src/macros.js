// App shortcuts: the TV ignores app keys over the API, so we replay a recorded navigation from Home.
import { useSyncExternalStore } from 'react';
import { conn } from './conn.js';

const KEY = 'tvRemote.macros';
const HOME_MS = 1500; // wait for the home screen to load
const STEP_MS = 250;

export const APPS = [
  { id: 'youtube', label: 'YouTube', bg: '#E62117', fg: '#fff' },
  { id: 'netflix', label: 'Netflix', bg: '#000', fg: '#E50914' },
  { id: 'prime', label: 'Prime Video', bg: '#1A98FF', fg: '#fff' },
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (m) => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* storage unavailable */ } };

let state = { macros: load(), recording: null, playing: null }; // recording: { app, steps } | null
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };

export const macros = {
  record(app) {
    conn.cmd('home');
    set({ recording: { app, steps: [] } });
  },
  cancel() { set({ recording: null }); },
  // Called for every command sent from the touchpad/D-pad. Returns the app id when a recording was just saved.
  feed(c) {
    const rec = state.recording;
    if (!rec) return null;
    if (c === 'ok') {
      const next = { ...state.macros, [rec.app]: rec.steps };
      save(next);
      set({ macros: next, recording: null });
      return rec.app;
    }
    if (c === 'up' || c === 'down' || c === 'left' || c === 'right') set({ recording: { ...rec, steps: [...rec.steps, c] } });
    return null;
  },
  // Replays the saved macro, or starts recording when there is none. Returns 'recording' | 'playing' | null.
  async launch(app) {
    if (state.playing || state.recording) return null;
    const steps = state.macros[app];
    if (!steps) { macros.record(app); return 'recording'; }
    set({ playing: app });
    await conn.cmd('home');
    await wait(HOME_MS);
    for (const s of steps) { await conn.cmd(s); await wait(STEP_MS); }
    await conn.cmd('ok');
    set({ playing: null });
    return 'playing';
  },
};

export function useMacros() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}
