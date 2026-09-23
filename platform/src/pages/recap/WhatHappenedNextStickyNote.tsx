/**
 * "What Happened Next" — paper-clipped tape card at the bottom of the recap.
 *
 * This card is pure history: it chains one episode to the one that actually
 * followed it, so a visitor can walk the campaign forward from any old recap.
 * That relationship is a fact about the past and can't be derived, so it stays
 * hand-recorded in `recapConfigs[...].next`.
 *
 * It deliberately does NOT pitch the upcoming show — `UpcomingShowStickyNote`
 * does that, derived from the show registry so it's correct on every page.
 * Before those were split, the newest recap was the only page that ever
 * mentioned the next show; everything older dead-ended into the chain.
 *
 * Renders nothing until the pointed-at show has actually aired. A `next` block
 * whose date is still in the future is describing the upcoming show, which the
 * other sticky already covers — rendering both would duplicate the card.
 */

import { Link } from 'react-router-dom';
import type { ComingNext } from './recapConfig';
import { formatShowDate, hasHappened } from './formatShowDate';

interface WhatHappenedNextStickyNoteProps {
  next: ComingNext;
}

export default function WhatHappenedNextStickyNote({ next }: WhatHappenedNextStickyNoteProps) {
  if (!hasHappened(next.date)) return null;

  const systemLabel = next.systemName ?? 'system reveal coming';
  const href = next.recapId ? `/shows/${next.recapId}/recap` : '/shows';
  const ctaLabel = next.recapId ? 'Watch the recap →' : 'Browse the shows →';

  return (
    <aside className="recap-sticky recap-sticky-next" aria-labelledby="recap-next-title">
      <div className="recap-sticky-clip recap-sticky-clip-right" aria-hidden />
      <p className="recap-sticky-eyebrow">What Happened Next</p>
      <h2 id="recap-next-title" className="recap-sticky-heading">
        {formatShowDate(next.date, true)}
      </h2>
      {next.venue && <p className="recap-sticky-meta">{next.venue}</p>}
      <p className="recap-sticky-meta">
        <span className="recap-tape-label">System</span>{' '}
        <span className="recap-tape-value">{systemLabel}</span>
      </p>
      {next.blurb && <p className="recap-sticky-body">{next.blurb}</p>}
      <Link to={href} className="recap-sticky-cta">
        {ctaLabel}
      </Link>
    </aside>
  );
}
