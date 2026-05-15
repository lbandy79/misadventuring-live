/**
 * NpcDisplayRow — projector card row for visible NPCs.
 *
 * Each card shows a DiceBear pixel-art avatar seeded from the NPC's
 * displayName, plus three text lines pulled from fieldValues:
 *   name   — adjective + job_title, title-cased   (large, marker font)
 *   role   — job_title uppercased                  (small caps, typewriter)
 *   tagline — tagline field value                  (italic, hand font)
 *
 * Avatar pattern mirrors PaperAvatar (platform/src/pages/recap/) and
 * NpcAvatar (src/components/npc/): CDN URL, no JS library, same fallback.
 * Inlined here to avoid crossing the src/ ↔ platform/src/ package boundary.
 *
 * Layout adapts to NPC count: solo (1) · row (2-3) · grid (4+).
 * Framer Motion AnimatePresence handles individual card enter/exit so
 * the GM can show/hide NPCs mid-scene without a page transition.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NpcProfile } from '../../../../src/lib/npcs/npcApi';
import './NpcDisplayRow.css';

const DICEBEAR_BASE = 'https://api.dicebear.com/9.x';

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function NpcCardAvatar({ seed, size }: { seed: string; size: number }) {
  const [failed, setFailed] = useState(false);
  const trimmed = seed.trim();
  const url = `${DICEBEAR_BASE}/pixel-art/svg?seed=${encodeURIComponent(trimmed)}`;

  if (failed || !trimmed) {
    const initial = trimmed.charAt(0).toUpperCase() || '?';
    let hash = 0;
    for (let i = 0; i < trimmed.length; i++) hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return (
      <div
        className="npc-display-avatar npc-display-avatar--fallback"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.45,
          backgroundColor: `hsl(${hue}, 60%, 25%)`,
          color: `hsl(${hue}, 80%, 75%)`,
        }}
        aria-hidden="true"
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      className="npc-display-avatar"
      src={url}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

interface NpcDisplayRowProps {
  npcs: NpcProfile[];
}

export default function NpcDisplayRow({ npcs }: NpcDisplayRowProps) {
  const count = npcs.length;
  const layoutClass = count === 1 ? 'solo' : count <= 3 ? 'row' : 'grid';
  const avatarSize = count === 1 ? 180 : count <= 3 ? 140 : 100;

  return (
    // TODO: drag-to-reorder is a post-launch enhancement; NPCs currently sorted by createdAt from Firestore
    <div className={`npc-display-row npc-display-row--${layoutClass}`}>
      <AnimatePresence mode="popLayout">
        {npcs.map((npc, i) => {
          const adjective = npc.fieldValues?.adjective ?? '';
          const jobTitle  = npc.fieldValues?.job_title  ?? '';
          const tagline   = npc.fieldValues?.tagline    ?? '';
          const seed      = npc.avatarSeed ?? npc.displayName;
          const nameLine  = toTitleCase([adjective, jobTitle].filter(Boolean).join(' '));

          return (
            <motion.div
              key={npc.id}
              className="npc-display-card"
              initial={{ opacity: 0, scale: 0.85, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -12 }}
              transition={{ type: 'spring', damping: 18, stiffness: 120, delay: i * 0.1 }}
            >
              <div className="npc-display-card__avatar-wrap">
                <NpcCardAvatar seed={seed} size={avatarSize} />
                <span className="npc-display-card__badge">NPC</span>
              </div>
              {nameLine  && <p className="npc-display-card__name">{nameLine}</p>}
              {jobTitle  && <p className="npc-display-card__role">{jobTitle.toUpperCase()}</p>}
              {tagline   && <p className="npc-display-card__tagline">{tagline}</p>}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
