/**
 * CharacterCard — VHS-Styled Character Render
 * 
 * Displayed after NPC submission. Designed to be screenshot-friendly
 * for organic social sharing. Reads stat display names from system JSON.
 * Secret is NOT shown — that's between the player and the GM.
 */

import { motion } from 'framer-motion';
import { useSystemConfig, getStatById } from '../../hooks/useSystemConfig';
import type { NPC } from '../../types/npc.types';
import NpcAvatar from '../npc/NpcAvatar';
import './CharacterCard.css';

interface CharacterCardProps {
  npc: NPC;
}

export default function CharacterCard({ npc }: CharacterCardProps) {
  const { config } = useSystemConfig();

  if (!config) return null;

  const bestStat = getStatById(config, npc.bestStat);
  const worstStat = getStatById(config, npc.worstStat);
  const showConfig = config.showConfig;
  const diceDescriptions = config.dice.descriptions;
  const bestDie = config.npcCreator.statAssignment.best;
  const worstDie = config.npcCreator.statAssignment.worst;

  return (
    <motion.div
      className="character-card"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* VHS scan line overlay */}
      <div className="vhs-scanlines" aria-hidden="true" />
      <div className="vhs-noise" aria-hidden="true" />

      {/* Header — series branding */}
      <div className="card-header">
        <span className="card-series">{showConfig.seriesName}</span>
      </div>

      {/* Character identity */}
      <div className="card-identity">
        <NpcAvatar name={npc.name} size={72} className="card-avatar" />
        <h2 className="card-name">{npc.name}</h2>
        <p className="card-occupation">{npc.occupation}</p>
      </div>

      {/* Appearance */}
      <div className="card-section">
        <p className="card-appearance">{npc.appearance}</p>
      </div>

      {/* Stats */}
      <div className="card-stats">
        <div className="card-stat best">
          <span className="stat-die">{bestDie}</span>
          <span className="stat-label">{bestStat?.name ?? npc.bestStat}</span>
          <span className="stat-desc">{diceDescriptions[bestDie]}</span>
        </div>
        <div className="card-stat worst">
          <span className="stat-die">{worstDie}</span>
          <span className="stat-label">{worstStat?.name ?? npc.worstStat}</span>
          <span className="stat-desc">{diceDescriptions[worstDie]}</span>
        </div>
      </div>

      {/* Footer — show info */}
      <div className="card-footer">
        <span className="card-tape">
          TAPE #{showConfig.tapeNumber}: {showConfig.showName.replace(`${showConfig.seriesName}: `, '')}
        </span>
        <span className="card-date">{showConfig.setting.era} • {showConfig.setting.location}</span>
      </div>
    </motion.div>
  );
}
