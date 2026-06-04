/**
 * Featured Character — hero treatment for the NPC who got the spotlight.
 *
 * Larger card than the grid items, "On Air" pulse pip, full appearance &
 * secret rendered out instead of clipped. Renders only when the recap
 * config names a featured reservationId AND that character is in the
 * curated set.
 *
 * Works with both NpcProfile (fieldValues) and legacy NPC (flat fields) shapes
 * since recapApi normalises displayName and fieldValues for both.
 */

import PaperAvatar from './PaperAvatar';
import type { PublicNPC } from './recapApi';

interface FeaturedCharacterProps {
  npc: PublicNPC;
}

function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FeaturedCharacter({ npc }: FeaturedCharacterProps) {
  const cardName = npc.displayName ?? npc.name ?? '';
  const seed = npc.avatarSeed ?? cardName;

  const adjective = npc.fieldValues?.adjective ?? '';
  const jobTitle  = npc.fieldValues?.job_title  ?? npc.occupation ?? '';
  const tagline   = npc.fieldValues?.tagline    ?? npc.secret     ?? '';
  const roleLine  = toTitleCase([adjective, jobTitle].filter(Boolean).join(' '));

  return (
    <section className="recap-featured" aria-labelledby="recap-featured-heading">
      <p className="recap-featured-eyebrow">
        <span className="recap-onair-pip" aria-hidden />
        On Air
      </p>
      <div className="recap-featured-card">
        <div className="recap-featured-portrait">
          <PaperAvatar name={seed} size={160} />
        </div>
        <div className="recap-featured-body">
          <h2 id="recap-featured-heading" className="recap-featured-name">
            {cardName}
          </h2>
          {roleLine && (
            <p className="recap-featured-role">{roleLine}</p>
          )}
          {npc.appearance && (
            <p className="recap-featured-line recap-card-appearance">
              <span className="recap-card-label">Appearance</span>
              {npc.appearance}
            </p>
          )}
          {tagline && (
            <p className="recap-featured-line recap-card-secret">
              <span className="recap-card-label">Reportedly</span>
              {tagline}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
