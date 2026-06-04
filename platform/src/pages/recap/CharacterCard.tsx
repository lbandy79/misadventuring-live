/**
 * Index-card style character card for the recap grid.
 *
 * Handles two NPC shapes:
 *   NpcProfile (fieldValues) — mirrors NpcDisplayRow: displayName headline,
 *     adjective+job_title role line, tagline as "Reportedly".
 *   Legacy NPC (flat fields) — name, occupation, appearance, secret.
 */

import PaperAvatar from './PaperAvatar';
import type { PublicNPC } from './recapApi';

interface CharacterCardProps {
  npc: PublicNPC;
  /** Subtle paper rotation so the grid feels collaged, not mechanical. */
  tilt?: number;
}

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CharacterCard({ npc, tilt = 0 }: CharacterCardProps) {
  const tiltStyle = tilt ? { transform: `rotate(${tilt}deg)` } : undefined;
  const hasFieldValues = Boolean(npc.fieldValues && Object.keys(npc.fieldValues).length > 0);
  const cardName = npc.displayName ?? npc.name ?? '';
  const seed = npc.avatarSeed ?? cardName;

  if (hasFieldValues) {
    const fv = npc.fieldValues!;
    const adjective = fv.adjective ?? '';
    const jobTitle  = fv.job_title  ?? '';
    const tagline   = fv.tagline    ?? '';
    const roleLine  = toTitleCase([adjective, jobTitle].filter(Boolean).join(' '));

    return (
      <article className="recap-card" style={tiltStyle}>
        <header className="recap-card-head">
          <PaperAvatar name={seed} size={72} />
          <div className="recap-card-id">
            <h3 className="recap-card-name">{cardName}</h3>
            {roleLine && <p className="recap-card-role">{roleLine}</p>}
          </div>
        </header>
        {tagline && (
          <p className="recap-card-line recap-card-appearance">
            <span className="recap-card-label">Reportedly</span>
            {tagline}
          </p>
        )}
      </article>
    );
  }

  // Legacy NPC shape (Betawave era)
  return (
    <article className="recap-card" style={tiltStyle}>
      <header className="recap-card-head">
        <PaperAvatar name={seed} size={72} />
        <div className="recap-card-id">
          <h3 className="recap-card-name">{cardName}</h3>
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
