import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { conn } from '../conn.js';
import { APPS, macros, useMacros } from '../macros.js';
import { Ic, Segmented, spring, soft, tap } from '../ui.jsx';

const LABEL = { up: 'Cima', down: 'Baixo', left: 'Esquerda', right: 'Direita', ok: 'OK', back: 'Voltar', home: 'Início', play: 'Play / Pausa', mute: 'Mudo' };
const STEP = 60; // px of finger travel per D-pad step
const ARROW_POS = {
  up: { top: 18, left: '50%', x: '-50%', rotate: -90 }, down: { bottom: 18, left: '50%', x: '-50%', rotate: 90 },
  left: { left: 18, top: '50%', y: '-50%', rotate: 180 }, right: { right: 18, top: '50%', y: '-50%', rotate: 0 },
};

function Touchpad({ send }) {
  const ref = useRef(null);
  const x = useMotionValue(0), y = useMotionValue(0);
  const [touching, setTouching] = useState(false);
  const [ripples, setRipples] = useState([]);
  const [arrow, setArrow] = useState(null);
  const st = useRef({});

  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const fire = (dir) => { send(dir); setArrow({ dir, id: Math.random() }); };

  return (
    <div
      ref={ref} className="touchpad" role="application" aria-label="Touchpad: deslize para navegar, toque para OK"
      onPointerDown={(e) => {
        if (st.current.id != null) return; // ignore a second finger
        ref.current.setPointerCapture(e.pointerId);
        const [px, py] = pos(e);
        st.current = { id: e.pointerId, sx: px, sy: py, ax: px, ay: py, moved: 0, t: Date.now(), steps: 0, axis: null, last: 0 };
        x.set(px); y.set(py); setTouching(true);
      }}
      onPointerMove={(e) => {
        const s = st.current;
        if (e.pointerId !== s.id) return;
        const [px, py] = pos(e); x.set(px); y.set(py);
        s.moved = Math.max(s.moved, Math.hypot(px - s.sx, py - s.sy));
        // lock the gesture to the first clear axis so diagonal jitter doesn't fire extra steps
        if (!s.axis && s.moved > 14) s.axis = Math.abs(px - s.sx) >= Math.abs(py - s.sy) ? 'x' : 'y';
        if (!s.axis) return;
        const d = s.axis === 'x' ? px - s.ax : py - s.ay;
        const now = Date.now();
        if (Math.abs(d) > STEP && now - s.last > 110) {
          fire(s.axis === 'x' ? (d > 0 ? 'right' : 'left') : (d > 0 ? 'down' : 'up'));
          s.steps++; s.last = now; s.ax = px; s.ay = py;
        }
      }}
      onPointerUp={(e) => {
        const s = st.current;
        if (e.pointerId !== s.id) return;
        s.id = null;
        setTouching(false);
        if (s.steps === 0 && s.moved < 10 && Date.now() - s.t < 350) {
          const [px, py] = pos(e); const id = Math.random();
          setRipples((r) => [...r, { id, px, py }]);
          setTimeout(() => setRipples((r) => r.filter((q) => q.id !== id)), 700);
          send('ok');
        }
      }}
      onPointerCancel={() => { st.current.id = null; setTouching(false); }}
    >
      <div className="touchpad-dots" />
      <AnimatePresence>
        {!touching && (
          <motion.div key="hint" className="touchpad-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div>Deslize para navegar</div>
            <div className="label">Toque para confirmar</div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div className="tp-glow" style={{ x, y }} animate={{ opacity: touching ? 1 : 0, scale: touching ? 1 : 0.6 }} transition={soft} />
      <motion.div className="tp-dot" style={{ x, y }} animate={{ opacity: touching ? 1 : 0, scale: touching ? 1 : 0 }} transition={spring} />
      {ripples.map((r) => (
        <motion.div key={r.id} className="tp-ripple" style={{ left: r.px - 40, top: r.py - 40 }}
          initial={{ scale: 0, opacity: 0.6 }} animate={{ scale: 3.2, opacity: 0 }} transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }} />
      ))}
      <AnimatePresence>
        {arrow && (
          <motion.div key={arrow.id} className="tp-arrow" style={ARROW_POS[arrow.dir]}
            initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: [0, 1, 0], scale: [0.6, 1.15, 1] }} transition={{ duration: 0.45 }}
            onAnimationComplete={() => setArrow(null)}>
            <Ic.chev size={30} w={2.4} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Dpad({ send }) {
  const arcs = [['up', -90, { top: '6%', left: '50%', marginLeft: -43 }], ['down', 90, { bottom: '6%', left: '50%', marginLeft: -43 }],
    ['left', 180, { left: '6%', top: '50%', marginTop: -43 }], ['right', 0, { right: '6%', top: '50%', marginTop: -43 }]];
  return (
    <div className="dpad">
      {arcs.map(([dir, rot, style]) => (
        <motion.button key={dir} className="dpad-arc" style={style} aria-label={LABEL[dir]} onClick={() => send(dir)}
          whileTap={{ scale: 0.9, backgroundColor: 'rgba(61,139,255,.18)' }} transition={spring}>
          <span style={{ transform: `rotate(${rot}deg)`, display: 'grid' }}><Ic.chev size={26} w={2.2} /></span>
        </motion.button>
      ))}
      <motion.button className="dpad-ok" whileTap={{ scale: 0.92 }} transition={spring} onClick={() => send('ok')}>OK</motion.button>
    </div>
  );
}

function Rocker({ label, up, down, upLabel, downLabel }) {
  return (
    <div className="rocker">
      <motion.button className="rocker-btn" whileTap={tap} transition={spring} aria-label={upLabel} onClick={() => conn.cmd(up)}>+</motion.button>
      <span className="rocker-label">{label}</span>
      <motion.button className="rocker-btn" whileTap={tap} transition={spring} aria-label={downLabel} onClick={() => conn.cmd(down)}>−</motion.button>
    </div>
  );
}

const MORE_KEYS = [
  ['source', 'Fonte', Ic.tv], ['options', 'Opções', Ic.grid], ['info', 'Info', Ic.search], ['adjust', 'Ajustes', Ic.keys],
  ['rew', 'Voltar faixa', Ic.rew], ['ffwd', 'Avançar', Ic.ffwd],
];

export default function RemoteScreen({ notify }) {
  const { recording, playing } = useMacros();
  const [mode, setMode] = useState(() => { try { return Number(localStorage.getItem('controle.mode')) || 0; } catch { return 0; } });
  const [last, setLast] = useState(null);
  const send = useCallback((c) => {
    conn.cmd(c); setLast({ c, id: Math.random() });
    const done = macros.feed(c);
    if (done) notify('Atalho do ' + APPS.find((a) => a.id === done).label + ' salvo');
  }, [notify]);
  useEffect(() => { try { localStorage.setItem('controle.mode', String(mode)); } catch {} }, [mode]);

  const keys = [['back', 'Voltar', Ic.back], ['home', 'Início', Ic.home], ['play', 'Play / Pausa', Ic.play], ['mute', 'Mudo', Ic.mute]];

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div><Segmented id="mode" value={mode} options={['Touchpad', 'Direcional']} onChange={setMode} /></div>
        <div className="last-cmd" aria-live="polite">
          <AnimatePresence mode="popLayout">
            {last && (
              <motion.div key={last.id} className="mono"
                initial={{ y: 18, opacity: 0, filter: 'blur(4px)' }} animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }} exit={{ y: -18, opacity: 0, filter: 'blur(4px)' }} transition={spring}>
                {LABEL[last.c]}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={mode} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18 }}>
          {mode === 0 ? <Touchpad send={send} /> : <Dpad send={send} />}
        </motion.div>
      </AnimatePresence>

      <div className="keys">
        {keys.map(([c, label, Icon]) => (
          <motion.button key={c} className="key" whileTap={tap} transition={spring} aria-label={label} onClick={() => send(c)}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={label} initial={{ scale: 0.5, opacity: 0, rotate: -20 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.5, opacity: 0 }} transition={spring} style={{ display: 'grid' }}>
                <Icon />
              </motion.div>
            </AnimatePresence>
            <span>{label}</span>
          </motion.button>
        ))}
      </div>

      <div className="apps-row">
        <Rocker label="VOL" up="volUp" down="volDown" upLabel="Aumentar volume" downLabel="Diminuir volume" />
        <div className="apps-col">
        {APPS.map((a) => (
          <motion.button key={a.id} className="app-key" style={{ background: a.bg, color: a.fg }} whileTap={tap} transition={spring}
            disabled={!!playing || !!recording} aria-label={a.label} onClick={() => macros.launch(a.id)}>
            {playing === a.id ? 'Abrindo…' : a.label}
          </motion.button>
        ))}
        </div>
        <Rocker label="CH" up="chUp" down="chDown" upLabel="Canal +" downLabel="Canal −" />
      </div>

      <AnimatePresence>
        {recording && (
          <motion.div key="rec" className="rec-banner" role="status" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={spring}>
            <span>Gravando atalho do {APPS.find((a) => a.id === recording.app).label}: navegue com as setas até o app e toque OK ({recording.steps.length})</span>
            <motion.button whileTap={tap} onClick={() => macros.cancel()}>Cancelar</motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="keys keys-more">
        {MORE_KEYS.map(([c, label, Icon]) => (
          <motion.button key={c} className="key" whileTap={tap} transition={spring} aria-label={label} onClick={() => { conn.cmd(c); notify(label); }}>
            <Icon /><span>{label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
