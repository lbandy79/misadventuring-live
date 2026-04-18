import { motion } from 'framer-motion';
import NpcAvatar from '../npc/NpcAvatar';
import './NpcSpotlight.css';

interface NpcSpotlightProps {
  name: string;
  occupation: string;
  appearance: string;
}

export default function NpcSpotlight({ name, occupation, appearance }: NpcSpotlightProps) {
  return (
    <motion.div
      className="npc-spotlight"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 18, stiffness: 120 }}
    >
      {/* VHS glitch overlay */}
      <div className="spotlight-scanlines" aria-hidden="true" />

      <motion.div
        className="spotlight-avatar"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', damping: 14 }}
      >
        <NpcAvatar name={name} size={200} />
      </motion.div>

      <motion.h1
        className="spotlight-name"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {name}
      </motion.h1>

      <motion.p
        className="spotlight-occupation"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
      >
        {occupation}
      </motion.p>

      <motion.p
        className="spotlight-appearance"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {appearance}
      </motion.p>
    </motion.div>
  );
}
