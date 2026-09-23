/**
 * "Coming Next" — the upcoming-show pitch at the bottom of every recap.
 *
 * Derived from the show registry via `getUpcomingShow()`, NOT from the recap
 * entry. That's the whole point: recap URLs live forever in YouTube
 * descriptions and on QR codes, so a four-month-old page still has to tell a
 * first-time visitor when the next show is. Rolling `nextDate` forward on the
 * upcoming show entry updates every recap page at once.
 *
 * Pairs with `WhatHappenedNextStickyNote`, which chains to the episode that
 * historically followed this one.
 */

import { Link } from 'react-router-dom';
import type { Show } from '@mtp/lib';
import { formatShowDate } from './formatShowDate';

interface UpcomingShowStickyNoteProps {
  show: Show;
}

export default function UpcomingShowStickyNote({ show }: UpcomingShowStickyNoteProps) {
  return (
    <aside className="recap-sticky recap-sticky-upcoming" aria-labelledby="recap-upcoming-title">
      <div className="recap-sticky-clip" aria-hidden />
      <p className="recap-sticky-eyebrow">Coming Next</p>
      <h2 id="recap-upcoming-title" className="recap-sticky-heading">
        {formatShowDate(show.nextDate, false)}
      </h2>
      {show.venue && <p className="recap-sticky-meta">{show.venue}</p>}
      <p className="recap-sticky-meta">
        <span className="recap-tape-label">Show</span>{' '}
        <span className="recap-tape-value">{show.seriesName ?? show.name}</span>
      </p>
      {show.description && <p className="recap-sticky-body">{show.description}</p>}
      <Link to={`/shows/${show.id}`} className="recap-sticky-cta">
        See what's coming →
      </Link>
    </aside>
  );
}
