/**
 * "Coming Next" — paper-clipped tape card at the bottom of the recap.
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

function formatDate(iso?: string): string {
  if (!iso) return 'Date TBA';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const local = new Date(y, m - 1, d);
  return local.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function ComingNextStickyNote({ next }: ComingNextStickyNoteProps) {
  const systemLabel = next.systemName ?? 'system reveal coming';
  const cta = next.rsvpHref ?? '/reserve';

  return (
    <aside className="recap-sticky recap-sticky-next" aria-labelledby="recap-next-title">
      <div className="recap-sticky-clip recap-sticky-clip-right" aria-hidden />
      <p className="recap-sticky-eyebrow">Coming Next</p>
      <h2 id="recap-next-title" className="recap-sticky-heading">
        {formatDate(next.date)}
      </h2>
      {next.venue && <p className="recap-sticky-meta">{next.venue}</p>}
      <p className="recap-sticky-meta">
        <span className="recap-tape-label">System</span>{' '}
        <span className="recap-tape-value">{systemLabel}</span>
      </p>
      {next.blurb && <p className="recap-sticky-body">{next.blurb}</p>}
      {cta.startsWith('/') ? (
        <Link to={cta} className="recap-sticky-cta">
          Reserve a seat →
        </Link>
      ) : (
        <a href={cta} className="recap-sticky-cta">
          Reserve a seat →
        </a>
      )}
    </aside>
  );
}
