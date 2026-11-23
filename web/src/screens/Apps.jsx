import { motion } from 'framer-motion';
import { conn } from '../conn.js';
import { Ic, spring, tap } from '../ui.jsx';

const KEYS = [
  ['source', 'Fonte', Ic.tv], ['options', 'Opções', Ic.grid], ['info', 'Info', Ic.search], ['adjust', 'Ajustes', Ic.keys],
  ['chUp', 'Canal +', Ic.chev], ['chDown', 'Canal −', Ic.chev], ['rew', 'Voltar faixa', Ic.rew], ['ffwd', 'Avançar', Ic.ffwd],
];

export default function MoreScreen({ notify }) {
  return (
    <div className="keys" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
      {KEYS.map(([c, label, Icon]) => (
        <motion.button key={c} className="key" whileTap={tap} transition={spring} aria-label={label} onClick={() => { conn.cmd(c); notify(label); }}>
          <Icon /><span>{label}</span>
        </motion.button>
      ))}
    </div>
  );
}
