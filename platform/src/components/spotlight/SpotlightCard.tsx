import type { WriteInItem } from '@mtp/lib/liveMonster/writeInQueue';

interface Props {
  item: WriteInItem | null;
  pendingCount: number;
  /** Reveal is allowed right now (reveal phase, slot not locked). */
  canReveal: boolean;
  revealArmed: boolean;
  onReveal: () => void;
}

/** Bigger text for shorter write-ins; never below 32px (see the CSS tiers). */
function sizeTier(text: string): 'short' | 'medium' | 'long' {
  if (text.length <= 40) return 'short';
  if (text.length <= 80) return 'medium';
  return 'long';
}

export default function SpotlightCard({ item, pendingCount, canReveal, revealArmed, onReveal }: Props) {
  return (
    <section className="wis-card" aria-label="Current write-in">
      {item ? (
        <>
          {/* Only the reading content is announced — not the reveal button below. */}
          <div aria-live="polite" aria-atomic="true">
            <p className="wis-card-prompt">{item.prompt}</p>
            <p className="wis-card-lead">{item.revealPrefix}…</p>
            <p className={`wis-card-text wis-card-text--${sizeTier(item.text)}`}>{item.text}</p>
          </div>
          <div className="wis-card-tags">
            {item.revealed && <span className="wis-tag wis-tag--revealed">On the projector</span>}
            {item.status === 'used' && <span className="wis-tag wis-tag--used">Used</span>}
            {item.pinned && <span className="wis-tag wis-tag--pinned">★ Pinned</span>}
            {item.edited && <span className="wis-tag wis-tag--edited">Edited by voter</span>}
          </div>
          {canReveal && (
            <button
              type="button"
              className={`wis-btn wis-btn--reveal ${revealArmed ? 'wis-btn--reveal-armed' : ''}`}
              onClick={onReveal}
            >
              {revealArmed ? 'Tap again: show on projector' : 'Reveal this'} <kbd>R</kbd>
            </button>
          )}
        </>
      ) : (
        <p className="wis-card-empty" aria-live="polite">
          {pendingCount === 0
            ? 'No write-ins waiting. New ones appear here as the audience sends them.'
            : 'Tap a write-in in the queue, or press Next.'}
        </p>
      )}
    </section>
  );
}
