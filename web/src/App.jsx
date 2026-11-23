import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { conn, useConn } from './conn.js';
import { Ic, Toast, tap, spring } from './ui.jsx';
import RemoteScreen from './screens/Remote.jsx';
import { SettingsSheet } from './screens/Settings.jsx';

function StatusChip({ onClick }) {
  const { tvName, tvOnline, status, latency } = useConn();
  const live = status === 'online' && tvOnline;
  const text = status === 'online' ? (tvOnline ? `${latency ?? '–'} ms` : 'TV desligada') : status === 'connecting' ? 'conectando' : 'sem conexão';
  return (
    <motion.button whileTap={tap} className="chip" onClick={onClick} aria-label={`TV ${tvName}: ${text}. Configurar TV`}>
      <motion.span className={'dot ' + (live ? '' : status === 'connecting' ? 'dot-warn' : 'dot-off')}
        animate={status === 'connecting' ? { opacity: [1, 0.3, 1] } : { opacity: 1 }} transition={{ repeat: status === 'connecting' ? Infinity : 0, duration: 1.2 }} />
      {tvName}
      <span className="mono" style={{ color: 'var(--dim)', fontSize: 12 }}>{text}</span>
    </motion.button>
  );
}

function PowerButton({ notify }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', alignSelf: 'flex-start' }}>
      <motion.button whileTap={tap} className="power" onClick={() => setOpen(!open)} aria-label="Desligar a TV" aria-expanded={open}><Ic.power size={19} /></motion.button>
      <AnimatePresence>
        {open && (
          <motion.div key="pop" className="popover" initial={{ opacity: 0, scale: 0.85, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Desligar a TV?</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Para ligar de novo, use o controle físico.</div>
            <div className="popover-actions">
              <motion.button whileTap={tap} onClick={() => setOpen(false)}>Cancelar</motion.button>
              <motion.button whileTap={tap} className="danger" onClick={() => { setOpen(false); conn.cmd('power'); notify('Desligando a TV'); }}>Desligar</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [toast, setToast] = useState(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => { conn.start(); }, []);

  const notify = useCallback((text, kind) => {
    const id = Math.random();
    setToast({ id, text, kind });
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 2000);
  }, []);

  return (
    <div className="app">
      <div className="halo" />
      <Toast toast={toast} />

      <header className="top">
        <div>
          <StatusChip onClick={() => setSheet(true)} />
          <h1 className="screen-title">Controle</h1>
        </div>
        <PowerButton notify={notify} />
      </header>

      <main className="stage">
        <section className="screen"><RemoteScreen notify={notify} /></section>
      </main>

      <SettingsSheet key={sheet} open={sheet} onClose={() => setSheet(false)} />
    </div>
  );
}
