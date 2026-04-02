/**
 * StatSelector — System-Driven Stat Dropdown
 * 
 * Renders a <select> whose options come from the system JSON stats[].
 * Shows stat description and likelyVerbs as helper text when selected.
 */

import { motion, AnimatePresence } from 'framer-motion';
import type { Stat } from '../../types/system.types';

interface StatSelectorProps {
  stats: Stat[];
  value: string;
  onChange: (statId: string) => void;
  label: string;
  helpText?: string;
  disabledStatId?: string;
  error?: string;
}

export default function StatSelector({
  stats,
  value,
  onChange,
  label,
  helpText,
  disabledStatId,
  error,
}: StatSelectorProps) {
  const selectedStat = stats.find(s => s.id === value);

  return (
    <div className="npc-field">
      <label className="npc-label">{label}</label>
      {helpText && <p className="npc-help">{helpText}</p>}

      <select
        className={`npc-select ${error ? 'npc-input-error' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Choose a stat...</option>
        {stats.map((stat) => (
          <option
            key={stat.id}
            value={stat.id}
            disabled={stat.id === disabledStatId}
          >
            {stat.name}
          </option>
        ))}
      </select>

      {error && <p className="npc-error">{error}</p>}

      <AnimatePresence mode="wait">
        {selectedStat && (
          <motion.div
            key={selectedStat.id}
            className="stat-detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="stat-description">{selectedStat.description}</p>
            <p className="stat-verbs">
              <span className="stat-verbs-label">Used for:</span>{' '}
              {selectedStat.likelyVerbs.join(', ')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
