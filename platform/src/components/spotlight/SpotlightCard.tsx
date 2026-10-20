import type { WriteInItem } from '@mtp/lib/liveMonster/writeInQueue';

interface Props {
  item: WriteInItem | null;
  pendingCount: number;
}

/** Bigger text for shorter write-ins; never below 32px (see the CSS tiers). */
function sizeTier(text: string): 'short' | 'medium' | 'long' {
  if (text.length <= 40) return 'short';
  if (text.length <= 80) return 'medium';
  return 'long';
}

export default function SpotlightCard({ item, pendingCount }: Props) {
  return (
    <section className="wis-card" aria-live="polite" aria-atomic="true" aria-label="Current write-in">
      {item ? (
        <>
          <p className="wis-card-prompt">{item.prompt}</p>
          <p className="wis-card-lead">{item.revealPrefix}…</p>
          <p className={`wis-card-text wis-card-text--${sizeTier(item.text)}`}>{item.text}</p>
          <div className="wis-card-tags">
            {item.status === 'used' && <span className="wis-tag wis-tag--used">Used</span>}
            {item.pinned && <span className="wis-tag wis-tag--pinned">★ Pinned</span>}
            {item.edited && <span className="wis-tag wis-tag--edited">Edited by voter</span>}
          </div>
        </>
      ) : (
        <p className="wis-card-empty">
          {pendingCount === 0
            ? 'No write-ins waiting. New ones appear here as the audience sends them.'
            : 'Tap a write-in in the queue, or press Next.'}
        </p>
      )}
    </section>
  );
}
