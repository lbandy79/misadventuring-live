/**
 * Index-card style character card for the recap grid.
 *
 * Compact form-factor — portrait, name, role line, appearance blurb,
 * secret/trait line. Used by CharacterGrid; FeaturedCharacter renders a
 * different (larger) layout.
 */

import PaperAvatar from './PaperAvatar';
import type { PublicNPC } from './recapApi';

interface CharacterCardProps {
  npc: PublicNPC;
  /** Subtle paper rotation so the grid feels collaged, not mechanical. */
  tilt?: number;
}

export default function CharacterCard({ npc, tilt = 0 }: CharacterCardProps) {
  return (
    <article
      className="recap-card"
      style={{ transform: tilt ? `rotate(${tilt}deg)` : undefined }}
    >
      <header className="recap-card-head">
        <PaperAvatar name={npc.name} size={72} />
        <div className="recap-card-id">
          <h3 className="recap-card-name">{npc.name}</h3>
          {npc.occupation && (
            <p className="recap-card-role">{npc.occupation}</p>
          )}
        </div>
      </header>

      {npc.appearance && (
        <p className="recap-card-line recap-card-appearance">
          <span className="recap-card-label">Appearance</span>
          {npc.appearance}
        </p>
      )}

      {npc.secret && (
        <p className="recap-card-line recap-card-secret">
          <span className="recap-card-label">Secret</span>
          {npc.secret}
        </p>
      )}
    </article>
  );
}
