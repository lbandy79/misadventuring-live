/**
 * "Coming Next" — paper-clipped tape card at the bottom of the recap.
 *
 * Two modes, decided by the calendar:
 *   - Upcoming: the pointed-at show hasn't happened yet → promo card.
 *   - Happened: the show date has passed → the card flips into a
 *     "What happened next" archive link chaining to that show's recap
 *     (via `next.recapId`), so old recaps never advertise expired shows.
 *
 * Tolerates partial data: a missing system shows "system reveal coming",
 * a missing date shows "TBA". The whole component returns null only if
 * the recap config has no `next` block at all.
 */

import { Link } from 'react-router-dom';
import type { ComingNext } from './recapConfig';

interface ComingNextStickyNoteProps {
  next: ComingNext;
}

function formatDate(iso: string | undefined, withYear: boolean): string {
  if (!iso) return 'Date TBA';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const local = new Date(y, m - 1, d);
  return local.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

/** True once the show day itself is over (local time). */
function hasHappened(iso?: string): boolean {
  if (!iso) return false;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return false;
  return Date.now() >= new Date(y, m - 1, d + 1).getTime();
}

export default function ComingNextStickyNote({ next }: ComingNextStickyNoteProps) {
  const happened = hasHappened(next.date);
  const systemLabel = next.systemName ?? 'system reveal coming';

  const eyebrow = happened ? 'What Happened Next' : 'Coming Next';
  const cta = happened
    ? next.recapId
      ? `/shows/${next.recapId}/recap`
      : '/shows'
    : next.rsvpHref ?? '/shows';
  const ctaLabel = happened
    ? next.recapId
      ? 'Watch the recap →'
      : 'Browse the shows →'
    : next.ctaLabel ?? 'See what\'s coming →';

  return (
    <aside className="recap-sticky recap-sticky-next" aria-labelledby="recap-next-title">
      <div className="recap-sticky-clip recap-sticky-clip-right" aria-hidden />
      <p className="recap-sticky-eyebrow">{eyebrow}</p>
      <h2 id="recap-next-title" className="recap-sticky-heading">
        {formatDate(next.date, happened)}
      </h2>
      {next.venue && <p className="recap-sticky-meta">{next.venue}</p>}
      <p className="recap-sticky-meta">
        <span className="recap-tape-label">System</span>{' '}
        <span className="recap-tape-value">{systemLabel}</span>
      </p>
      {next.blurb && <p className="recap-sticky-body">{next.blurb}</p>}
      {cta.startsWith('/') ? (
        <Link to={cta} className="recap-sticky-cta">
          {ctaLabel}
        </Link>
      ) : (
        <a href={cta} className="recap-sticky-cta">
          {ctaLabel}
        </a>
      )}
    </aside>
  );
}
