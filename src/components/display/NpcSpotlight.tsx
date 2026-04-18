import { motion, AnimatePresence } from 'framer-motion';
import NpcAvatar from '../npc/NpcAvatar';
import './NpcSpotlight.css';

export interface SpotlightNpc {
  id: string;
  name: string;
  occupation: string;
  appearance: string;
}

interface NpcSpotlightProps {
  npcs: SpotlightNpc[];
}

export default function NpcSpotlight({ npcs }: NpcSpotlightProps) {
  const count = npcs.length;
  // Layout classes: 1 = solo (big center), 2-3 = row, 4+ = grid
  const layoutClass = count === 1 ? 'solo' : count <= 3 ? 'row' : 'grid';

  return (
    <motion.div
      className={`npc-spotlight npc-spotlight--${layoutClass}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* VHS glitch overlay */}
      <div className="spotlight-scanlines" aria-hidden="true" />

      <AnimatePresence mode="popLayout">
        {npcs.map((npc, i) => (
          <motion.div
            key={npc.id}
            className="spotlight-card"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', damping: 18, stiffness: 120, delay: i * 0.1 }}
          >
            <div className="spotlight-avatar">
              <NpcAvatar name={npc.name} size={count === 1 ? 200 : count <= 3 ? 140 : 100} />
            </div>
            <h2 className="spotlight-name">{npc.name}</h2>
            <p className="spotlight-occupation">{npc.occupation}</p>
            {count <= 3 && (
              <p className="spotlight-appearance">{npc.appearance}</p>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
