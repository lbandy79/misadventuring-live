/**
 * Monster Reveal Card — shown on the recap when monsterStatus === 'available'.
 *
 * Reads the non-secret slot results from the live monster session and renders
 * them as a paper stat block. The weakness slot (secret: true) is intentionally
 * omitted — hunters had to discover that in play.
 */

import type { MonsterSession } from './recapApi';
import type { MonsterBuilderConfig } from '@mtp/data/liveMonster/types';

interface MonsterRevealCardProps {
  session: MonsterSession;
  config: MonsterBuilderConfig;
}

export default function MonsterRevealCard({ session, config }: MonsterRevealCardProps) {
  const publicSlots = config.slots.filter((s) => !s.secret);
  const hasAnyResult = publicSlots.some((s) => session.slotResults[s.id] != null);

  if (!hasAnyResult) return null;

  return (
    <aside className="recap-sticky recap-sticky-monster" aria-labelledby="recap-monster-title">
      <div className="recap-sticky-clip" aria-hidden />
      <h2 id="recap-monster-title" className="recap-sticky-heading">The Monster We Made</h2>
      <dl className="recap-monster-traits">
        {publicSlots.map((slot) => {
          const result = session.slotResults[slot.id];
          if (!result) return null;
          return (
            <div key={slot.id} className="recap-monster-trait">
              <dt className="recap-monster-trait-prefix">{slot.revealPrefix}</dt>
              <dd className="recap-monster-trait-value">{result}</dd>
            </div>
          );
        })}
      </dl>
      <p className="recap-monster-secret-note">
        its weakness? that's still classified.
      </p>
    </aside>
  );
}
