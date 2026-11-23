import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { conn, useConn } from '../conn.js';
import { APPS, macros, useMacros } from '../macros.js';
import { tap } from '../ui.jsx';

export function SettingsSheet({ open, onClose }) {
  const { tvIp } = useConn();
  const [ip, setIp] = useState(tvIp);
  const { macros: saved } = useMacros();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="scrim" className="scrim plain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div key="sheet" role="dialog" aria-label="Configurar TV" className="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => { if (i.offset.y > 120 || i.velocity.y > 500) onClose(); }}>
            <div className="grabber" />
            <div className="sheet-title">Endereço da TV</div>
            <label className="field" style={{ marginTop: 22, padding: 16 }}>
              <input value={ip} inputMode="decimal" autoComplete="off" aria-label="IP da TV" onChange={(e) => setIp(e.target.value)} />
            </label>
            <div className="sheet-title" style={{ marginTop: 22 }}>Atalhos de apps</div>
            {APPS.map((a) => (
              <div key={a.id} className="macro-row">
                <span>{a.label}</span>
                <span className="macro-count">{saved[a.id] ? saved[a.id].length + ' passos' : 'sem atalho'}</span>
                <motion.button whileTap={tap} onClick={() => { macros.record(a.id); onClose(); }}>Regravar</motion.button>
              </div>
            ))}
            <motion.button whileTap={tap} className="btn" style={{ width: '100%', marginTop: 14 }} onClick={() => { conn.setIp(ip); onClose(); }}>Salvar</motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
