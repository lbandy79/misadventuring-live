/**
 * Featured Character — hero treatment for the NPC who got the spotlight.
 *
 * Larger card than the grid items, "On Air" pulse pip, full appearance &
 * secret rendered out instead of clipped. Renders only when the recap
 * config names a featured reservationId AND that character is in the
 * curated set.
 */

import PaperAvatar from './PaperAvatar';
import type { PublicNPC } from './recapApi';

interface FeaturedCharacterProps {
  npc: PublicNPC;
}

export default function FeaturedCharacter({ npc }: FeaturedCharacterProps) {
  return (
    <section className="recap-featured" aria-labelledby="recap-featured-heading">
      <p className="recap-featured-eyebrow">
        <span className="recap-onair-pip" aria-hidden />
        On Air
      </p>
      <div className="recap-featured-card">
        <div className="recap-featured-portrait">
          <PaperAvatar name={npc.name} size={160} />
        </div>
        <div className="recap-featured-body">
          <h2 id="recap-featured-heading" className="recap-featured-name">
            {npc.name}
          </h2>
          {npc.occupation && (
            <p className="recap-featured-role">{npc.occupation}</p>
          )}
          {npc.appearance && (
            <p className="recap-featured-line">
              <span className="recap-card-label">Appearance</span>
              {npc.appearance}
            </p>
          )}
          {npc.secret && (
            <p className="recap-featured-line recap-card-secret">
              <span className="recap-card-label">Secret</span>
              {npc.secret}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
